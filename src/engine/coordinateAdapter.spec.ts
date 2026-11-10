import { describe, expect, it } from 'vitest';
import {
  optaToMeters,
  optaToStatsbomb,
  optaToSvg,
  statsbombToOpta,
  statsbombToSvg,
  svgToOpta,
} from './coordinateAdapter';

/**
 * Conversioni tra i sistemi di coordinate usati dalla lavagna:
 * Opta (0–100 × 0–100), StatsBomb (0–120 × 0–80), metri (0–105 × 0–68), SVG (0–1050 × 0–680).
 */

describe('conversioni tra sistemi di coordinate', () => {
  it('l\'origine resta l\'origine in tutti i sistemi', () => {
    expect(optaToStatsbomb(0, 0)).toEqual({ x: 0, y: 0 });
    expect(optaToMeters(0, 0)).toEqual({ x: 0, y: 0 });
    expect(optaToSvg(0, 0)).toEqual({ x: 0, y: 0 });
    expect(statsbombToOpta(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('l\'angolo opposto del campo corrisponde in tutti i sistemi', () => {
    expect(optaToStatsbomb(100, 100)).toEqual({ x: 120, y: 80 });
    expect(optaToMeters(100, 100)).toEqual({ x: 105, y: 68 });
    expect(optaToSvg(100, 100)).toEqual({ x: 1050, y: 680 });
    expect(statsbombToOpta(120, 80)).toEqual({ x: 100, y: 100 });
    expect(statsbombToSvg(120, 80)).toEqual({ x: 1050, y: 680 });
  });

  it('il centro del campo corrisponde in tutti i sistemi', () => {
    expect(optaToStatsbomb(50, 50)).toEqual({ x: 60, y: 40 });
    expect(optaToMeters(50, 50)).toEqual({ x: 52.5, y: 34 });
    expect(optaToSvg(50, 50)).toEqual({ x: 525, y: 340 });
    expect(statsbombToSvg(60, 40)).toEqual({ x: 525, y: 340 });
  });

  it('le conversioni arrotondano: andata e ritorno tra Opta e StatsBomb torna entro 0,06 unità', () => {
    for (const [x, y] of [
      [33.333, 66.667],
      [12.345, 87.654],
      [0.049, 99.951],
      [71.28, 4.44],
    ]) {
      const statsbomb = optaToStatsbomb(x, y);
      const ritorno = statsbombToOpta(statsbomb.x, statsbomb.y);
      expect(Math.abs(ritorno.x - x)).toBeLessThanOrEqual(0.06);
      expect(Math.abs(ritorno.y - y)).toBeLessThanOrEqual(0.06);
    }
  });

  it('svgToOpta riporta dentro il campo i punti che cadono fuori', () => {
    expect(svgToOpta(-50, 9999)).toEqual({ x: 0, y: 100 });
    expect(svgToOpta(525, 340)).toEqual({ x: 50, y: 50 });
  });
});
