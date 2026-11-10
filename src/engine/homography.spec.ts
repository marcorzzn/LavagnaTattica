import { describe, expect, it } from 'vitest';
import {
  computePlanarHomographyDLT,
  invertHomography3x3,
  projectImageToPitch,
  projectPitchToImage,
  solveLinearSystemGaussian,
} from './homography';
import type { CalibrationKeypoint } from '../core/types';

/**
 * Calibrazione del fermo immagine: omografia tra immagine (u, v in [0, 1]) e campo.
 *
 * Il riferimento è un'omografia scelta a mano (H_VERA), applicata qui sotto con una formula
 * indipendente dal codice sotto test. Così il controllo non è circolare: il risolutore deve
 * ritrovare una trasformazione che non conosce, e proiettare bene punti che non ha mai visto.
 */

const H_VERA = [
  [100, 10, 5],
  [5, 60, 4],
  [0.1, 0.3, 1],
];

function proietta(H: number[][], u: number, v: number): { x: number; y: number } {
  const w = H[2][0] * u + H[2][1] * v + H[2][2];
  return {
    x: (H[0][0] * u + H[0][1] * v + H[0][2]) / w,
    y: (H[1][0] * u + H[1][1] * v + H[1][2]) / w,
  };
}

function puntoDiCalibrazione(id: string, u: number, v: number): CalibrationKeypoint {
  const campo = proietta(H_VERA, u, v);
  return { id, label: id, imageU: u, imageV: v, pitchX: campo.x, pitchY: campo.y };
}

const QUATTRO_PUNTI: CalibrationKeypoint[] = [
  puntoDiCalibrazione('A', 0.1, 0.2),
  puntoDiCalibrazione('B', 0.9, 0.15),
  puntoDiCalibrazione('C', 0.8, 0.9),
  puntoDiCalibrazione('D', 0.2, 0.85),
];

/** Punti mai usati per calibrare: dentro e fuori dal quadrilatero dei quattro punti. */
const PUNTI_MAI_VISTI: Array<[number, number]> = [
  [0.3, 0.3],
  [0.5, 0.5],
  [0.7, 0.7],
  [0.3, 0.7],
  [0.7, 0.3],
  [0.05, 0.5],
  [0.95, 0.5],
  [0.5, 0.05],
  [0.5, 0.95],
  [0, 0],
  [1, 1],
];

function erroreMassimoSuiPuntiMaiVisti(H: number[][]): number {
  let massimo = 0;
  for (const [u, v] of PUNTI_MAI_VISTI) {
    const atteso = proietta(H_VERA, u, v);
    const ottenuto = projectImageToPitch(u, v, H);
    massimo = Math.max(massimo, Math.hypot(ottenuto.x - atteso.x, ottenuto.y - atteso.y));
  }
  return massimo;
}

describe('solveLinearSystemGaussian', () => {
  it('risolve un sistema 3×3 di cui si conosce la soluzione', () => {
    const A = [
      [2, 1, -1],
      [-3, -1, 2],
      [-2, 1, 2],
    ];
    const soluzione = solveLinearSystemGaussian(A, [8, -11, -3]);
    expect(soluzione[0]).toBeCloseTo(2, 9);
    expect(soluzione[1]).toBeCloseTo(3, 9);
    expect(soluzione[2]).toBeCloseTo(-1, 9);
  });

  it('scambia le righe quando il perno è nullo', () => {
    const soluzione = solveLinearSystemGaussian(
      [
        [0, 1],
        [1, 0],
      ],
      [3, 5]
    );
    expect(soluzione[0]).toBeCloseTo(5, 12);
    expect(soluzione[1]).toBeCloseTo(3, 12);
  });

  it('non modifica la matrice ricevuta', () => {
    const A = [
      [4, 1],
      [2, 3],
    ];
    solveLinearSystemGaussian(A, [1, 2]);
    expect(A).toEqual([
      [4, 1],
      [2, 3],
    ]);
  });
});

describe('computePlanarHomographyDLT con 4 punti esatti', () => {
  const { H, reprojectionErrorPx } = computePlanarHomographyDLT(QUATTRO_PUNTI);

  it('ritrova la matrice di un\'omografia nota', () => {
    for (let riga = 0; riga < 3; riga++) {
      for (let colonna = 0; colonna < 3; colonna++) {
        expect(H[riga][colonna]).toBeCloseTo(H_VERA[riga][colonna], 4);
      }
    }
  });

  it('proietta entro 2 centimetri punti che non ha mai visto', () => {
    expect(erroreMassimoSuiPuntiMaiVisti(H)).toBeLessThan(0.02);
  });

  it('dichiara un errore nullo sui punti di calibrazione', () => {
    expect(reprojectionErrorPx).toBeLessThanOrEqual(0.01);
  });
});

describe('limite noto: con 4 punti l\'errore dichiarato non misura la qualità', () => {
  it('resta nullo anche se un punto è sbagliato di 2 metri, mentre i punti mai visti si spostano', () => {
    const conUnErrore = QUATTRO_PUNTI.map((p) => (p.id === 'A' ? { ...p, pitchX: p.pitchX + 2 } : p));
    const { H, reprojectionErrorPx } = computePlanarHomographyDLT(conUnErrore);

    // Quattro punti determinano l'omografia senza residuo: l'errore sui punti stessi è zero per costruzione.
    expect(reprojectionErrorPx).toBeLessThanOrEqual(0.01);

    // L'errore vero si vede solo dove non si è calibrato: vicino al punto sbagliato supera il mezzo metro.
    const atteso = proietta(H_VERA, 0.15, 0.25);
    const ottenuto = projectImageToPitch(0.15, 0.25, H);
    expect(Math.hypot(ottenuto.x - atteso.x, ottenuto.y - atteso.y)).toBeGreaterThan(0.5);
  });
});

describe('inversa dell\'omografia', () => {
  it('il prodotto tra la matrice e la sua inversa è l\'identità', () => {
    const inversa = invertHomography3x3(H_VERA);
    for (let riga = 0; riga < 3; riga++) {
      for (let colonna = 0; colonna < 3; colonna++) {
        let somma = 0;
        for (let k = 0; k < 3; k++) somma += H_VERA[riga][k] * inversa[k][colonna];
        expect(somma).toBeCloseTo(riga === colonna ? 1 : 0, 9);
      }
    }
  });

  it('riporta sul fermo immagine i punti del campo', () => {
    const inversa = invertHomography3x3(H_VERA);
    for (const [u, v] of [
      [0.3, 0.3],
      [0.5, 0.5],
      [0.7, 0.2],
      [0.15, 0.9],
    ]) {
      const campo = proietta(H_VERA, u, v);
      const immagine = projectPitchToImage(campo.x, campo.y, inversa);
      expect(immagine.u).toBeCloseTo(u, 3);
      expect(immagine.v).toBeCloseTo(v, 3);
    }
  });
});

describe('casi degeneri: comportamento da definire nel manuale', () => {
  it.todo(
    'con meno di 4 punti la calibrazione non è possibile: oggi la funzione restituisce una matrice predefinita e un errore fisso di 0,42'
  );
  it.todo(
    'con 4 punti allineati la calibrazione non è possibile: oggi la funzione restituisce una matrice degenere e dichiara errore zero'
  );
  it.todo('con più di 4 punti oggi la funzione usa solo i primi 4 e ignora gli altri');
});
