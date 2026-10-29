/**
 * OpenPitch — Adapter Matematico di Coordinate Tattiche
 *
 * Mappa biunivocamente e senza perdita di precisione tra:
 *  1. Coordinate Opta Normalizzate [0, 100] x [0, 100]
 *  2. Coordinate Canoniche StatsBomb [0, 120] x [0, 80] (usate dal mathEngine)
 *  3. Dimensioni Metriche Regolamentari FIFA [0, 105m] x [0, 68m]
 *  4. Canvas SVG Grafico [0, 1050px] x [0, 680px]
 */

export interface PitchPoint {
  x: number;
  y: number;
}

export const PITCH_SB_WIDTH = 120;
export const PITCH_SB_HEIGHT = 80;
export const PITCH_FIFA_WIDTH = 105;
export const PITCH_FIFA_HEIGHT = 68;
export const SVG_VIEWBOX_WIDTH = 1050;
export const SVG_VIEWBOX_HEIGHT = 680;

/** Da Opta [0..100] a StatsBomb [0..120, 0..80] */
export function optaToStatsbomb(xOpta: number, yOpta: number): PitchPoint {
  return {
    x: Number(((xOpta / 100) * PITCH_SB_WIDTH).toFixed(2)),
    y: Number(((yOpta / 100) * PITCH_SB_HEIGHT).toFixed(2)),
  };
}

/** Da StatsBomb [0..120, 0..80] a Opta [0..100] */
export function statsbombToOpta(xSb: number, ySb: number): PitchPoint {
  return {
    x: Number(((xSb / PITCH_SB_WIDTH) * 100).toFixed(1)),
    y: Number(((ySb / PITCH_SB_HEIGHT) * 100).toFixed(1)),
  };
}

/** Da Opta [0..100] a Metri FIFA [0..105, 0..68] */
export function optaToMeters(xOpta: number, yOpta: number): PitchPoint {
  return {
    x: Number(((xOpta / 100) * PITCH_FIFA_WIDTH).toFixed(2)),
    y: Number(((yOpta / 100) * PITCH_FIFA_HEIGHT).toFixed(2)),
  };
}

/** Da Opta [0..100] a Canvas SVG [0..1050, 0..680] */
export function optaToSvg(xOpta: number, yOpta: number): PitchPoint {
  return {
    x: Number((xOpta * 10.5).toFixed(1)),
    y: Number((yOpta * 6.8).toFixed(1)),
  };
}

/** Da StatsBomb [0..120, 0..80] a Canvas SVG */
export function statsbombToSvg(xSb: number, ySb: number): PitchPoint {
  const opta = statsbombToOpta(xSb, ySb);
  return optaToSvg(opta.x, opta.y);
}

/** Da pixel Canvas SVG a Opta [0..100] */
export function svgToOpta(svgX: number, svgY: number): PitchPoint {
  return {
    x: Math.max(0, Math.min(100, Number((svgX / 10.5).toFixed(1)))),
    y: Math.max(0, Math.min(100, Number((svgY / 6.8).toFixed(1)))),
  };
}

/**
 * Individua la zona tattica secondo la suddivisione standard a 18 zone:
 * 3 terzi longitudinali (Difesa, Centrocampo, Rifinitura/Attacco) x
 * 5 corridoi verticali (Fascia SX, Half-Space SX, Centro, Half-Space DX, Fascia DX).
 */
export function getTacticalZoneName(xOpta: number, yOpta: number): string {
  // Corridoi verticali Y (0 in alto, 100 in basso per la fascia destra o sinistra a seconda dell'orientamento)
  let channel = 'Corridoio Centrale';
  if (yOpta < 18) channel = 'Corsia Esterna SX';
  else if (yOpta < 36) channel = 'Mezzo-Spazio SX (Half-Space)';
  else if (yOpta > 82) channel = 'Corsia Esterna DX';
  else if (yOpta > 64) channel = 'Mezzo-Spazio DX (Half-Space)';

  // Terzi longitudinali X (0 propria porta, 100 porta avversaria)
  let third = 'Terzo Centrale (Costruzione)';
  if (xOpta < 33.3) third = 'Primo Terzo (Difesa)';
  else if (xOpta > 66.6) {
    if (xOpta >= 83 && yOpta >= 36 && yOpta <= 64) {
      third = 'Area di Rigore (Zona Goal)';
    } else if (xOpta >= 68 && xOpta <= 83 && yOpta >= 36 && yOpta <= 64) {
      third = 'Zona 14 (Rifinitura)';
    } else {
      third = 'Ultimo Terzo (Attacco)';
    }
  }

  return `${channel} · ${third}`;
}

/** Snap magnetico ai corridoi e alle linee guida tattiche */
export function snapOptaCoordinate(x: number, y: number, enabled: boolean): PitchPoint {
  if (!enabled) return { x, y };

  const SNAP_TOLERANCE = 1.8;
  const snapGuidesX = [8, 16.5, 33.3, 50, 66.7, 83.5, 92];
  const snapGuidesY = [18, 36, 50, 64, 82];

  let snappedX = x;
  let snappedY = y;

  for (const gx of snapGuidesX) {
    if (Math.abs(x - gx) < SNAP_TOLERANCE) {
      snappedX = gx;
      break;
    }
  }

  for (const gy of snapGuidesY) {
    if (Math.abs(y - gy) < SNAP_TOLERANCE) {
      snappedY = gy;
      break;
    }
  }

  return {
    x: Number(snappedX.toFixed(1)),
    y: Number(snappedY.toFixed(1)),
  };
}

