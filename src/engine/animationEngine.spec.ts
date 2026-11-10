import { describe, expect, it } from 'vitest';
import {
  ballPositionForAction,
  easeInOutCubic,
  interpolateAt,
  lerp,
  playerRunPosition,
  quadBezier,
} from './animationEngine';
import type { Keyframe, TacticalAction } from '../core/types';

/**
 * Motore di animazione della Lavagna e della Teoria.
 * È un'illustrazione disegnata a mano (keyframe ed easing), non una simulazione fisica:
 * questi test verificano l'interpolazione, non la plausibilità dei movimenti.
 */

function azione(parziale: Partial<TacticalAction> & Pick<TacticalAction, 'type'>): TacticalAction {
  return {
    id: 'azione-di-prova',
    keyframeFrom: 'kf-1',
    keyframeTo: 'kf-2',
    playerId: 'p1',
    params: { speedKmh: 60, heightCm: 0, curve: 0, contact: 'flat', duration: 1000 },
    ...parziale,
  };
}

const DUE_KEYFRAME: Keyframe[] = [
  {
    id: 'kf-1',
    timestamp: 0,
    players: [{ id: 'p1', x: 20, y: 30, visible: true }],
    ball: { x: 20, y: 30, z: 0, carrierId: 'p1' },
  },
  {
    id: 'kf-2',
    timestamp: 2000,
    players: [{ id: 'p1', x: 40, y: 50, visible: true }],
    ball: { x: 60, y: 40, z: 0, carrierId: 'p2' },
  },
];

describe('easeInOutCubic', () => {
  it('vale 0 all\'inizio, 0,5 a metà e 1 alla fine', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 12);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('non torna mai indietro', () => {
    let precedente = easeInOutCubic(0);
    for (let i = 1; i <= 200; i++) {
      const valore = easeInOutCubic(i / 200);
      expect(valore).toBeGreaterThanOrEqual(precedente);
      precedente = valore;
    }
  });

  it('è simmetrica rispetto al punto centrale', () => {
    for (const t of [0.05, 0.2, 0.35, 0.49]) {
      expect(easeInOutCubic(t) + easeInOutCubic(1 - t)).toBeCloseTo(1, 12);
    }
  });

  it('limita i valori fuori dall\'intervallo [0, 1]', () => {
    expect(easeInOutCubic(-3)).toBe(0);
    expect(easeInOutCubic(7)).toBe(1);
  });
});

describe('lerp e quadBezier', () => {
  it('lerp restituisce gli estremi e i punti intermedi', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(10, 20, 0.25)).toBeCloseTo(12.5, 12);
  });

  it('quadBezier passa per gli estremi', () => {
    expect(quadBezier(10, 99, 30, 0)).toBe(10);
    expect(quadBezier(10, 99, 30, 1)).toBe(30);
  });

  it('quadBezier a metà vale la media pesata 1/4, 1/2, 1/4', () => {
    expect(quadBezier(10, 20, 30, 0.5)).toBeCloseTo(20, 12);
    expect(quadBezier(0, 10, 0, 0.5)).toBeCloseTo(5, 12);
  });
});

describe('ballPositionForAction', () => {
  const da = { x: 20, y: 40 };
  const a = { x: 50, y: 40 };

  it('un passaggio rasoterra resta a quota zero per tutto il percorso', () => {
    const rasoterra = azione({ type: 'pass_ground' });
    for (let ms = 0; ms <= 1000; ms += 100) {
      expect(ballPositionForAction(rasoterra, da, a, ms).z).toBe(0);
    }
  });

  it('una palla alta parte da terra, tocca il picco a metà e torna a terra', () => {
    const cross = azione({
      type: 'cross',
      params: { speedKmh: 75, heightCm: 250, curve: 0, contact: 'collar', duration: 1200 },
    });
    expect(ballPositionForAction(cross, da, a, 0).z).toBe(0);
    expect(ballPositionForAction(cross, da, a, 600).z).toBeCloseTo(2.5, 9);
    expect(ballPositionForAction(cross, da, a, 1200).z).toBeCloseTo(0, 12);
  });

  it('la quota conta solo per i tipi di palla alta', () => {
    const rasoterraConQuota = azione({
      type: 'pass_ground',
      params: { speedKmh: 60, heightCm: 250, curve: 0, contact: 'flat', duration: 1000 },
    });
    expect(ballPositionForAction(rasoterraConQuota, da, a, 500).z).toBe(0);
  });

  it('parte dal punto di partenza e arriva al punto di arrivo, anche con effetto', () => {
    const aGiro = azione({
      type: 'shot_curl',
      params: { speedKmh: 90, heightCm: 120, curve: 0.8, contact: 'inside', duration: 1000 },
    });
    const inizio = ballPositionForAction(aGiro, da, a, 0);
    const fine = ballPositionForAction(aGiro, da, a, 1000);
    expect(inizio.x).toBeCloseTo(da.x, 12);
    expect(inizio.y).toBeCloseTo(da.y, 12);
    expect(fine.x).toBeCloseTo(a.x, 12);
    expect(fine.y).toBeCloseTo(a.y, 12);
  });

  it('con effetto massimo la traiettoria si scosta di 3 metri a metà percorso', () => {
    const aGiro = azione({
      type: 'pass_ground',
      params: { speedKmh: 60, heightCm: 0, curve: 1, contact: 'inside', duration: 1000 },
    });
    const meta = ballPositionForAction(aGiro, da, a, 500);
    expect(meta.x).toBeCloseTo(35, 9);
    expect(Math.abs(meta.y - 40)).toBeCloseTo(3, 9);
  });

  it('oltre la durata la palla resta sul punto di arrivo', () => {
    const rasoterra = azione({ type: 'pass_ground' });
    const dopo = ballPositionForAction(rasoterra, da, a, 5000);
    expect(dopo.x).toBeCloseTo(a.x, 12);
    expect(dopo.y).toBeCloseTo(a.y, 12);
  });
});

describe('playerRunPosition', () => {
  it('senza punti di passaggio non restituisce nulla', () => {
    expect(playerRunPosition(azione({ type: 'run' }), 500)).toBeNull();
  });

  it('percorre i punti di passaggio dal primo all\'ultimo', () => {
    const corsa = azione({
      type: 'run',
      waypoints: [
        { x: 20, y: 30 },
        { x: 20, y: 60 },
        { x: 40, y: 50 },
      ],
    });
    expect(playerRunPosition(corsa, 0)).toEqual({ x: 20, y: 30 });
    expect(playerRunPosition(corsa, 500)).toEqual({ x: 20, y: 60 });
    expect(playerRunPosition(corsa, 1000)).toEqual({ x: 40, y: 50 });
  });
});

describe('interpolateAt', () => {
  it('senza keyframe restituisce uno stato vuoto', () => {
    const vuoto = interpolateAt([], 500);
    expect(vuoto.players.size).toBe(0);
    expect(vuoto.activeKeyframeA).toBeNull();
    expect(vuoto.activeKeyframeB).toBeNull();
  });

  it('prima del primo keyframe e dopo l\'ultimo restituisce le istantanee esatte', () => {
    const inizio = interpolateAt(DUE_KEYFRAME, -100);
    expect(inizio.players.get('p1')).toEqual({ x: 20, y: 30, visible: true });
    expect(inizio.ball).toEqual({ x: 20, y: 30, z: 0, carrierId: 'p1' });

    const fine = interpolateAt(DUE_KEYFRAME, 2000);
    expect(fine.players.get('p1')).toEqual({ x: 40, y: 50, visible: true });
    expect(fine.ball).toEqual({ x: 60, y: 40, z: 0, carrierId: 'p2' });
  });

  it('a metà tra due keyframe il giocatore è a metà strada', () => {
    const meta = interpolateAt(DUE_KEYFRAME, 1000);
    const p1 = meta.players.get('p1');
    expect(p1?.x).toBeCloseTo(30, 9);
    expect(p1?.y).toBeCloseTo(40, 9);
    expect(meta.segmentProgress).toBeCloseTo(0.5, 12);
  });

  it('ordina i keyframe per tempo anche se arrivano in disordine', () => {
    const disordinati = [DUE_KEYFRAME[1], DUE_KEYFRAME[0]];
    const meta = interpolateAt(disordinati, 1000);
    expect(meta.activeKeyframeA?.id).toBe('kf-1');
    expect(meta.activeKeyframeB?.id).toBe('kf-2');
    expect(meta.players.get('p1')?.x).toBeCloseTo(30, 9);
  });

  it('accetta i giocatori anche come mappa per identificativo', () => {
    const conMappa: Keyframe[] = [
      { id: 'a', timestamp: 0, players: { p9: { x: 1, y: 2 } }, ball: { x: 0, y: 0 } },
      { id: 'b', timestamp: 1000, players: { p9: { x: 3, y: 6 } }, ball: { x: 0, y: 0 } },
    ];
    const meta = interpolateAt(conMappa, 500);
    expect(meta.players.get('p9')?.x).toBeCloseTo(2, 9);
    expect(meta.players.get('p9')?.y).toBeCloseTo(4, 9);
    expect(meta.players.get('p9')?.visible).toBe(true);
  });

  it('una corsa con punti di passaggio prevale sull\'interpolazione diretta', () => {
    const corsa = azione({
      type: 'run',
      keyframeFrom: 'kf-1',
      waypoints: [
        { x: 20, y: 30 },
        { x: 20, y: 60 },
        { x: 40, y: 50 },
      ],
      params: { speedKmh: 24, heightCm: 0, curve: 0, contact: 'flat', duration: 2000 },
    });
    const meta = interpolateAt(DUE_KEYFRAME, 1000, [corsa]);
    expect(meta.players.get('p1')).toEqual({ x: 20, y: 60, visible: true });
  });

  it('la palla segue la traiettoria dell\'azione attiva nel tratto', () => {
    const lancio = azione({
      type: 'pass_lofted',
      keyframeFrom: 'kf-1',
      targetCoords: { x: 60, y: 40 },
      params: { speedKmh: 70, heightCm: 200, curve: 0, contact: 'collar', duration: 2000 },
    });
    const meta = interpolateAt(DUE_KEYFRAME, 1000, [lancio]);
    expect(meta.ball.x).toBeCloseTo(40, 9);
    expect(meta.ball.y).toBeCloseTo(35, 9);
    expect(meta.ball.z).toBeCloseTo(2, 9);
  });

  it('il possesso passa al nuovo portatore solo verso la fine del tratto', () => {
    expect(interpolateAt(DUE_KEYFRAME, 1000).ball.carrierId).toBe('p1');
    expect(interpolateAt(DUE_KEYFRAME, 1900).ball.carrierId).toBe('p2');
  });
});
