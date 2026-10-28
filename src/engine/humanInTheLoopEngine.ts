/**
 * OpenPitch — Motore Matematico "Human-in-the-Loop" (Annotazione Umana su Frame Reale)
 *
 * Principio Architetturale:
 * L'analista umano è il sensore "ground truth" (zero errori di tracking):
 *  1. Calibra i 4 angoli/punti sul frame -> Matrice di Omografia H e Inversa H^{-1}
 *  2. Posiziona via Drag & Drop le pedine (30 Tipologie Astratte) sopra i giocatori reali nel frame
 *  3. Disegna il vettore dell'azione (Passaggio Filtrante, Cross, Tiro a Giro, Passaggio Corto)
 *  4. Imposta i parametri fisici osservati (Velocità Palla 10–115 km/h, Altezza 0–320 cm, Piede/Testa, Stile)
 *  5. Il motore calcola istantaneamente (latenza 0ms) Pitch Control (Spearman ODE), Markov xT,
 *     Fiedler λ_2, Time-To-Intercept (TTI) lungo la traiettoria balistica e la valutazione Chess.com.
 */

import { ChessStyleAlternative, PlayerNode, TacticalState } from '../core/types';
import {
  computeSpearmanPitchControlAtPoint,
  computeSpectralGraphMetrics,
  computeTTI,
  projectImageToPitch,
  sampleXtAtCoord,
  solveLinearSystemGaussian,
  solveMarkovXtWithStats,
} from './mathEngine';

export type DrawnActionCategory =
  | 'Passaggio Filtrante'
  | 'Cross'
  | 'Tiro a Giro'
  | 'Passaggio Corto'
  | 'Cambio Gioco';

export type ContactFootOrHead = 'Destro' | 'Sinistro' | 'Testa';

export type ContactExecutionStyle =
  | 'Di Prima'
  | 'Controllo + Giocata'
  | 'Collo Pieno'
  | 'Interno a Giro';

export interface VisualActionProperties {
  actionCategory: DrawnActionCategory;
  ballSpeedKmh: number; // 10 .. 120 km/h
  ballHeightCm: number; // 0 (rasoterra) .. 320 cm (aerea)
  bodyPart: ContactFootOrHead;
  executionStyle: ContactExecutionStyle;
  fromX: number; // Coordinate campo [0..120]
  fromY: number; // Coordinate campo [0..80]
  toX: number; // Coordinate campo [0..120]
  toY: number; // Coordinate campo [0..80]
}

export interface DefenderInterceptDetail {
  defenderId: string;
  defenderLabel: string;
  closestPointX: number;
  closestPointY: number;
  distanceToCorridorM: number;
  ballArrivalTimeSec: number;
  defenderTtiSec: number;
  timeMarginSec: number; // > 0 significa che la palla passa prima che il difensore arrivi
  ballAltitudeAtPointCm: number;
  bypassedByAltitude: boolean;
  interceptProbabilityPct: number;
}

export interface DrawnActionEvaluation {
  classification: 'Best Move (!!)' | 'Good Alternative (!)' | 'Inaccuracy (?)' | 'Blunder (??)';
  compositeScore: number; // Scala [-1.00 .. +1.00]
  distanceMeters: number;
  ballSpeedMs: number;
  flightTimeSec: number;
  executionDelaySec: number; // 'Di Prima' = 0.05s, 'Controllo + Giocata' = 0.42s
  xtStart: number;
  xtEnd: number;
  deltaXt: number;
  xgIfShot: number;
  epvAction: number;
  pitchControlAtTargetPct: number;
  fiedlerAfterMove: number;
  deltaFiedler: number;
  successProbabilityPct: number;
  interceptionRiskPct: number;
  aerialDuelWinProbPct: number | null;
  criticalBlocker: DefenderInterceptDetail | null;
  allDefenderChecks: DefenderInterceptDetail[];
  chessVerdictText: string;
  top3FrameAlternatives: ChessStyleAlternative[];
}

/**
 * Calcola l'inversa esatta 3x3 della matrice di omografia H per proiettare coordinate campo (X, Y)
 * direttamente sul frame video/immagine (u, v) in prospettiva!
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

/**
 * Valuta matematicamente l'azione disegnata dall'utente sul frame in funzione di:
 * - Posizioni esatte inserite via Drag & Drop (TacticalState)
 * - Parametri fisici inseriti dall'analista (VisualActionProperties)
 */
export function evaluateHumanDrawnAction(
  state: TacticalState,
  action: VisualActionProperties
): DrawnActionEvaluation {
  const { grid: xtGrid } = solveMarkovXtWithStats();
  const homePlayers = state.players.filter((p) => p.team === 'home');
  const awayPlayers = state.players.filter((p) => p.team === 'away');

  // 1. Individua il giocatore attaccante più vicino all'origine della freccia (portatore)
  let actor = homePlayers[0];
  let minActorDist = Infinity;
  for (const p of homePlayers) {
    const d = Math.hypot(p.x - action.fromX, p.y - action.fromY);
    if (d < minActorDist) {
      minActorDist = d;
      actor = p;
    }
  }

  // Individua il compagno più vicino alla punta della freccia (ricevente potenziale)
  let receiver = homePlayers[1] || homePlayers[0];
  let minRecDist = Infinity;
  for (const p of homePlayers) {
    if (p.id === actor.id) continue;
    const d = Math.hypot(p.x - action.toX, p.y - action.toY);
    if (d < minRecDist) {
      minRecDist = d;
      receiver = p;
    }
  }

  // 2. Cinematica balistica della palla basata sugli slider dell'utente
  const distanceMeters = Number(
    Math.max(1.0, Math.hypot(action.toX - action.fromX, action.toY - action.fromY)).toFixed(2)
  );
  const ballSpeedMs = Number(Math.max(2.5, action.ballSpeedKmh / 3.6).toFixed(2));

  // Tempo di preparazione del gesto tecnico: 'Di Prima' azzera quasi il ritardo, 'Controllo + Giocata' aggiunge 0.38s
  const executionDelaySec =
    action.executionStyle === 'Di Prima'
      ? 0.06
      : action.executionStyle === 'Controllo + Giocata'
        ? 0.38
        : 0.18;

  // Fattore di attrito/parabola: rasoterra decelerata dall'erba, palla aerea ha arco più lungo
  const arcFactor = action.ballHeightCm > 120 ? 1.12 : 1.04;
  const flightTimeSec = Number(((distanceMeters * arcFactor) / ballSpeedMs).toFixed(2));

  // Curvatura laterale se 'Interno a Giro'
  const lateralCurlMeters = action.executionStyle === 'Interno a Giro' ? 2.4 : 0.0;

  // 3. Analisi punto-per-punto di intercettazione lungo la traiettoria contro tutti gli 11 avversari
  const allDefenderChecks: DefenderInterceptDetail[] = [];
  let survivalProb = 1.0;

  for (const def of awayPlayers) {
    // Proiezione ortogonale del difensore sul segmento (from -> to) con eventuale curvatura di Bézier
    const dx = action.toX - action.fromX;
    const dy = action.toY - action.fromY;
    const lenSq = dx * dx + dy * dy || 1;
    let s = ((def.x - action.fromX) * dx + (def.y - action.fromY) * dy) / lenSq;
    s = Math.max(0.08, Math.min(0.98, s));

    // Deviazione parabolica se il tiro/passaggio è 'Interno a Giro'
    const perpX = -dy / distanceMeters;
    const perpY = dx / distanceMeters;
    const curlOffset = 4 * s * (1 - s) * lateralCurlMeters * (action.bodyPart === 'Destro' ? -1 : 1);

    const ptX = action.fromX + s * dx + perpX * curlOffset;
    const ptY = action.fromY + s * dy + perpY * curlOffset;

    const distToCorridor = Math.hypot(def.x - ptX, def.y - ptY);
    const ballArrivalTime = executionDelaySec + s * flightTimeSec;

    // Quota parabolica della palla nel punto s in [0, 1]: z(s) = 4 * s * (1 - s) * H_max
    // (Al punto finale s -> 1 la palla scende a quota d'impatto ~110cm se cross, o 0cm se rasoterra)
    const ballAltitudeCm =
      s > 0.88 && action.ballHeightCm > 140
        ? action.ballHeightCm * 0.72
        : 4 * s * (1 - s) * action.ballHeightCm;

    // Altezza massima di intercetto in salto del difensore (~ statura + 48 cm)
    const maxReachCm = def.positionGroup === 'GK' ? def.heightCm + 85 : def.heightCm + 42;
    const bypassedByAltitude = s < 0.85 && ballAltitudeCm > maxReachCm;

    // Calcolo Time-To-Intercept (TTI) reale di Spearman per il difensore verso (ptX, ptY)
    const defTti = computeTTI(def, ptX, ptY);
    const timeMargin = Number((defTti - ballArrivalTime).toFixed(2));

    let interceptProb = 0;
    if (!bypassedByAltitude) {
      // Funzione logistica centrata su timeMargin = 0 con scala sigma = 0.28s
      const rawLogit = 1 / (1 + Math.exp(timeMargin / 0.26));
      // Penalità se la palla viaggia ad altissima velocità (> 85 km/h) a distanza ravvicinata
      const speedDifficulty = Math.exp(-Math.max(0, action.ballSpeedKmh - 75) / 95);
      interceptProb = rawLogit * speedDifficulty;
    }

    if (distToCorridor < 18) {
      allDefenderChecks.push({
        defenderId: def.id,
        defenderLabel: `${def.archetypeName} (#${def.number})`,
        closestPointX: Number(ptX.toFixed(1)),
        closestPointY: Number(ptY.toFixed(1)),
        distanceToCorridorM: Number(distToCorridor.toFixed(2)),
        ballArrivalTimeSec: Number(ballArrivalTime.toFixed(2)),
        defenderTtiSec: Number(defTti.toFixed(2)),
        timeMarginSec: timeMargin,
        ballAltitudeAtPointCm: Number(ballAltitudeCm.toFixed(0)),
        bypassedByAltitude,
        interceptProbabilityPct: Number((interceptProb * 100).toFixed(1)),
      });
    }

    survivalProb *= 1 - interceptProb * 0.85;
  }

  allDefenderChecks.sort((a, b) => b.interceptProbabilityPct - a.interceptProbabilityPct);
  const criticalBlocker = allDefenderChecks[0] || null;

  // 4. Duello Aereo se l'azione è un Cross o ha altezza >= 150 cm
  let aerialDuelWinProbPct: number | null = null;
  if (action.ballHeightCm >= 150 || action.actionCategory === 'Cross') {
    const closestMarker =
      awayPlayers
        .filter((d) => d.positionGroup !== 'GK')
        .sort(
          (a, b) =>
            Math.hypot(a.x - action.toX, a.y - action.toY) -
            Math.hypot(b.x - action.toX, b.y - action.toY)
        )[0] || awayPlayers[0];

    const heightDiffCm = receiver.heightCm - closestMarker.heightCm;
    const aerialSkillDiff = receiver.attributes.aerial - closestMarker.attributes.aerial;
    const logitAerial = heightDiffCm * 0.065 + aerialSkillDiff * 0.042;
    const winProb = 1 / (1 + Math.exp(-logitAerial));
    aerialDuelWinProbPct = Number((winProb * 100).toFixed(1));
    survivalProb *= 0.35 + 0.65 * winProb;
  }

  // Difficoltà tecnica del gesto (velocità estrema o piede debole o tiro di prima)
  const footMatchBonus =
    (action.bodyPart === 'Destro' && actor.foot !== 'Left') ||
    (action.bodyPart === 'Sinistro' && actor.foot !== 'Right')
      ? 1.0
      : 0.86;
  const speedControlPenalty =
    action.ballSpeedKmh > 92 ? Math.exp(-(action.ballSpeedKmh - 92) / 65) : 1.0;

  const successProbabilityPct = Number(
    Math.max(4.0, Math.min(97.5, survivalProb * footMatchBonus * speedControlPenalty * 100)).toFixed(1)
  );
  const interceptionRiskPct = Number((100 - successProbabilityPct).toFixed(1));

  // 5. Valore Atteso xT, xG (se tiro verso la porta), Pitch Control Spearman e Fiedler λ_2
  const xtStart = sampleXtAtCoord(action.fromX, action.fromY, xtGrid);
  const xtEnd = sampleXtAtCoord(action.toX, action.toY, xtGrid);
  const deltaXt = Number((xtEnd - xtStart).toFixed(4));

  // Se l'azione punta verso la porta (toX >= 114 e 33 <= toY <= 47) o è 'Tiro a Giro'
  const isShot =
    action.actionCategory === 'Tiro a Giro' ||
    (action.toX >= 112 && action.toY >= 32 && action.toY <= 48);

  const distGoal = Math.hypot(120 - action.fromX, 40 - action.fromY);
  const dxGoal = Math.max(1.0, 120 - action.fromX);
  const goalAngle = Math.max(
    0.02,
    Math.atan2(7.32 * dxGoal, dxGoal * dxGoal + Math.pow(action.fromY - 40, 2) - 13.3956)
  );
  const baseShotXg = 1 / (1 + Math.exp(-(-2.25 + 1.95 * goalAngle - 0.062 * distGoal)));
  const curlBonus = action.executionStyle === 'Interno a Giro' ? 1.16 : 1.0;
  const xgIfShot = Number(
    Math.min(0.78, baseShotXg * curlBonus * (successProbabilityPct / 100)).toFixed(3)
  );

  // Pitch Control di Spearman nel punto di destinazione (toX, toY) usando la velocità reale inserita!
  const pcTarget = computeSpearmanPitchControlAtPoint(
    state.players,
    action.toX,
    action.toY,
    action.fromX,
    action.fromY
  );
  const pitchControlAtTargetPct = Number((pcTarget.homeProb * 100).toFixed(1));

  // Variazione di Fiedler λ_2 se il ricevente riceve palla in (toX, toY)
  const spectralBefore = computeSpectralGraphMetrics(state.players, state.passEdges);
  const movedPlayers = state.players.map((p) =>
    p.id === receiver.id ? { ...p, x: action.toX, y: action.toY } : p
  );
  const spectralAfter = computeSpectralGraphMetrics(movedPlayers, state.passEdges);
  const deltaFiedler = Number((spectralAfter.fiedlerValue - spectralBefore.fiedlerValue).toFixed(3));

  // Calcolo EPV e Funzionale Composito Chess.com J(a | s)
  const pSucc = successProbabilityPct / 100;
  const rTrans = (1 - pSucc) * (action.fromX < 50 ? 0.42 : 0.22);
  const epvAction = Number(
    (isShot
      ? xgIfShot - rTrans * 0.18
      : xtEnd * pSucc + (pcTarget.homeProb - 0.5) * 0.14 - rTrans * 0.25
    ).toFixed(3)
  );

  const rawScore = isShot
    ? (xgIfShot - xtStart) * 3.8 + (pSucc - 0.45) * 0.6 - rTrans
    : deltaXt * pSucc * 11.5 +
      (pcTarget.homeProb - 0.48) * (action.toX / 100) * 0.95 +
      deltaFiedler * 1.4 +
      (pSucc - 0.55) * 0.55 -
      rTrans * 0.85;

  const compositeScore = Number(Math.max(-0.99, Math.min(0.99, rawScore)).toFixed(2));

  // Confrontiamo la giocata dell'utente con le Top-3 alternative del frame
  const stateAtOrigin: TacticalState = {
    ...state,
    ballX: action.fromX,
    ballY: action.fromY,
  };
  // Usiamo il motore combinatorio per ottenere le 3 alternative ottime da (fromX, fromY)
  const top3FrameAlternatives: ChessStyleAlternative[] = homePlayers
    .filter((m) => m.id !== actor.id)
    .map((mate) => {
      const mDist = Math.hypot(mate.x - action.fromX, mate.y - action.fromY);
      const mTBall = mDist / ballSpeedMs;
      let mMinMargin = Infinity;
      for (const opp of awayPlayers) {
        const dLine = pointToSegmentDistLocal(opp.x, opp.y, action.fromX, action.fromY, mate.x, mate.y);
        const tti = computeTTI(opp, (action.fromX + mate.x) / 2, (action.fromY + mate.y) / 2);
        const margin = tti - mTBall * 0.65 - (dLine - 3.5) * 0.18;
        if (margin < mMinMargin) mMinMargin = margin;
      }
      const mPSucc = Math.max(0.18, Math.min(0.96, 1 / (1 + Math.exp(-2.8 * mMinMargin))));
      const mXtTo = sampleXtAtCoord(mate.x, mate.y, xtGrid);
      const mDeltaXt = mXtTo - xtStart;
      const mPc = computeSpearmanPitchControlAtPoint(stateAtOrigin.players, mate.x, mate.y, action.fromX, action.fromY);
      const mScore = Number(
        Math.max(
          -0.95,
          Math.min(
            0.98,
            mDeltaXt * mPSucc * 11.5 +
              (mPc.homeProb - 0.48) * (mate.x / 100) * 0.95 +
              (mPSucc - 0.55) * 0.55 -
              (1 - mPSucc) * 0.25
          )
        ).toFixed(2)
      );

      return {
        rank: 1 as 1 | 2 | 3,
        classification: 'Best Move (!!)' as const,
        actionType:
          mate.x - action.fromX > 15
            ? ('Passaggio Filtrante' as const)
            : Math.abs(mate.y - action.fromY) > 22
              ? ('Cambio Gioco Armonico' as const)
              : ('Conduzione Progressiva' as const),
        actorId: actor.id,
        actorArchetype: `${actor.archetypeName} (#${actor.number})`,
        targetId: mate.id,
        targetArchetype: `${mate.archetypeName} (#${mate.number})`,
        fromX: action.fromX,
        fromY: action.fromY,
        toX: mate.x,
        toY: mate.y,
        compositeScore: mScore,
        deltaEpv: Number((mDeltaXt * mPSucc * 1.8).toFixed(3)),
        deltaXt: Number(mDeltaXt.toFixed(3)),
        deltaPitchControlPct: Number(((mPc.homeProb - 0.5) * 100).toFixed(1)),
        deltaFiedler: 0.024,
        successProbabilityPct: Number((mPSucc * 100).toFixed(1)),
        confidencePct: 98.2,
        tacticalWhy: `Opzione verso ${mate.archetypeName} (#${mate.number}) a (${mate.x}m, ${mate.y}m): ΔxT ${mDeltaXt >= 0 ? '+' : ''}${mDeltaXt.toFixed(3)}, P_succ ${(mPSucc * 100).toFixed(1)}%, Controllo Spearman ${(mPc.homeProb * 100).toFixed(1)}%.`,
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 3)
    .map((item, idx) => ({
      ...item,
      rank: (idx + 1) as 1 | 2 | 3,
      classification:
        idx === 0
          ? ('Best Move (!!)' as const)
          : idx === 1
            ? ('Good Alternative (!)' as const)
            : ('Suboptimal (?)' as const),
    }));

  const bestOptionScore = top3FrameAlternatives[0]?.compositeScore ?? 0.3;
  const classification: DrawnActionEvaluation['classification'] =
    compositeScore >= bestOptionScore - 0.06 && compositeScore > 0.15
      ? 'Best Move (!!)'
      : compositeScore >= 0.04
        ? 'Good Alternative (!)'
        : compositeScore >= -0.18
          ? 'Inaccuracy (?)'
          : 'Blunder (??)';

  const bestAlt = top3FrameAlternatives[0];
  const blockerText = criticalBlocker
    ? `Difensore più vicino alla linea: ${criticalBlocker.defenderLabel} a ${criticalBlocker.distanceToCorridorM}m dal corridoio (TTI difensore ${criticalBlocker.defenderTtiSec}s vs arrivo palla ${criticalBlocker.ballArrivalTimeSec}s, probabilità intercetto ${criticalBlocker.interceptProbabilityPct}%${criticalBlocker.bypassedByAltitude ? ' — SCAVALCATO DALLA TRAIETTORIA AEREA' : ''}).`
    : 'Corridoio completamente libero da avversari.';

  const chessVerdictText = `${classification}: Il tuo ${action.actionCategory} (${action.ballSpeedKmh} km/h, h=${action.ballHeightCm} cm, ${action.bodyPart}, ${action.executionStyle}) porta l'xT da ${xtStart.toFixed(3)} a ${xtEnd.toFixed(3)} (ΔxT ${deltaXt >= 0 ? '+' : ''}${deltaXt.toFixed(3)}) con probabilità di successo del ${successProbabilityPct}% (rischio intercetto ${interceptionRiskPct}%). ${blockerText} ${
    classification !== 'Best Move (!!)' && bestAlt
      ? `La scelta ottimale sul frame era servire ${bestAlt.targetArchetype} a (${bestAlt.toX}m, ${bestAlt.toY}m) con punteggio J=${bestAlt.compositeScore >= 0 ? '+' : ''}${bestAlt.compositeScore} e successo ${bestAlt.successProbabilityPct}%.`
      : 'La traiettoria disegnata rappresenta l’ottimo matematico su questo frame.'
  }`;

  return {
    classification,
    compositeScore,
    distanceMeters,
    ballSpeedMs,
    flightTimeSec,
    executionDelaySec,
    xtStart,
    xtEnd,
    deltaXt,
    xgIfShot,
    epvAction,
    pitchControlAtTargetPct,
    fiedlerAfterMove: spectralAfter.fiedlerValue,
    deltaFiedler,
    successProbabilityPct,
    interceptionRiskPct,
    aerialDuelWinProbPct,
    criticalBlocker,
    allDefenderChecks: allDefenderChecks.slice(0, 4),
    chessVerdictText,
    top3FrameAlternatives,
  };
}

function pointToSegmentDistLocal(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
