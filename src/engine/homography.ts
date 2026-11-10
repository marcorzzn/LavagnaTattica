import { CalibrationKeypoint } from '../core/types';

/**
 * Omografia tra il fermo immagine e il campo.
 *
 * Coordinate dell'immagine: u, v in [0, 1]. Coordinate del campo: sistema 120 × 80 (non sono metri).
 * Le funzioni sono state spostate qui senza modifiche dal vecchio motore; i test sono in homography.spec.ts.
 *
 * Limiti noti, descritti nei test:
 *  - con meno di 4 punti viene restituita una matrice predefinita e un errore fisso di 0,42;
 *  - con 4 punti allineati viene restituita una matrice degenere senza segnalarlo;
 *  - con più di 4 punti vengono usati solo i primi 4;
 *  - con 4 punti l'errore di riproiezione è zero per costruzione: non misura la qualità della calibrazione.
 */

export function computePlanarHomographyDLT(keypoints: CalibrationKeypoint[]): {
  H: number[][];
  reprojectionErrorPx: number;
} {
  if (keypoints.length < 4) {
    return {
      H: [
        [120, 0, 0],
        [0, 80, 0],
        [0, 0, 1],
      ],
      reprojectionErrorPx: 0.42,
    };
  }

  const pts = keypoints.slice(0, 4);
  const A: number[][] = [];
  const b: number[] = [];

  for (const p of pts) {
    const u = p.imageU;
    const v = p.imageV;
    const X = p.pitchX;
    const Y = p.pitchY;
    A.push([u, v, 1, 0, 0, 0, -u * X, -v * X]);
    b.push(X);
    A.push([0, 0, 0, u, v, 1, -u * Y, -v * Y]);
    b.push(Y);
  }

  const h = solveLinearSystemGaussian(A, b);
  const H = [
    [Number(h[0].toFixed(6)), Number(h[1].toFixed(6)), Number(h[2].toFixed(6))],
    [Number(h[3].toFixed(6)), Number(h[4].toFixed(6)), Number(h[5].toFixed(6))],
    [Number(h[6].toFixed(6)), Number(h[7].toFixed(6)), 1.0],
  ];

  let errSum = 0;
  for (const p of keypoints) {
    const proj = projectImageToPitch(p.imageU, p.imageV, H);
    errSum += Math.hypot(proj.x - p.pitchX, proj.y - p.pitchY);
  }
  const reprojectionErrorPx = Number((errSum / keypoints.length).toFixed(3));

  return { H, reprojectionErrorPx };
}

export function projectImageToPitch(u: number, v: number, H: number[][]): { x: number; y: number } {
  const denom = H[2][0] * u + H[2][1] * v + H[2][2];
  if (Math.abs(denom) < 1e-8) return { x: u * 120, y: v * 80 };
  const x = (H[0][0] * u + H[0][1] * v + H[0][2]) / denom;
  const y = (H[1][0] * u + H[1][1] * v + H[1][2]) / denom;
  return {
    x: Number(Math.max(0, Math.min(120, x)).toFixed(2)),
    y: Number(Math.max(0, Math.min(80, y)).toFixed(2)),
  };
}

export function solveLinearSystemGaussian(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    }
    [M[i], M[maxRow]] = [M[maxRow], M[i]];

    const pivot = M[i][i];
    if (Math.abs(pivot) < 1e-11) continue;

    for (let j = i; j <= n; j++) M[i][j] /= pivot;
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j];
      }
    }
  }

  return M.map((row) => (Number.isFinite(row[n]) ? row[n] : 0));
}

/**
 * Inversa 3×3 dell'omografia: porta le coordinate del campo sul fermo immagine.
 */
export function invertHomography3x3(H: number[][]): number[][] {
  const I = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const cols: number[][] = [];
  for (let c = 0; c < 3; c++) {
    const b = [I[0][c], I[1][c], I[2][c]];
    const col = solveLinearSystemGaussian(H, b);
    cols.push(col);
  }
  return [
    [cols[0][0], cols[1][0], cols[2][0]],
    [cols[0][1], cols[1][1], cols[2][1]],
    [cols[0][2], cols[1][2], cols[2][2]],
  ];
}

export function projectPitchToImage(
  pitchX: number,
  pitchY: number,
  HInv: number[][]
): { u: number; v: number } {
  const denom = HInv[2][0] * pitchX + HInv[2][1] * pitchY + HInv[2][2];
  if (Math.abs(denom) < 1e-8) {
    return { u: pitchX / 120, v: pitchY / 80 };
  }
  const u = (HInv[0][0] * pitchX + HInv[0][1] * pitchY + HInv[0][2]) / denom;
  const v = (HInv[1][0] * pitchX + HInv[1][1] * pitchY + HInv[1][2]) / denom;
  return {
    u: Number(Math.max(0.01, Math.min(0.99, u)).toFixed(4)),
    v: Number(Math.max(0.01, Math.min(0.99, v)).toFixed(4)),
  };
}
