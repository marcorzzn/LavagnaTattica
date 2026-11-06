/**
 * NucleoTattico — Motore Matematico "Human-in-the-Loop" (Annotazione Umana su Frame Reale)
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
  | 'Cambio Gioco'
  | 'Conduzione / Dribbling';

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
  targetType?: 'pass' | 'shot' | 'dribble' | 'cross' | 'clearance';
  analyzingTeam?: 'home' | 'away';
  attackDirection?: 'right' | 'left'; // default 'right' for home, 'left' for away
  manualOffsideX?: number | null; // coordinata X manuale per linea di fuorigioco
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
  executionDelaySec: number;
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
  // Nuove proprietà tattiche avanzate
  isShot: boolean;
  isOffside: boolean;
  offsideMarginMeters: number;
  actorTeam: 'home' | 'away';
  targetGoalDistMeters: number;
  oppGkInPosition: boolean;
  packingRate: number; // quanti avversari eliminati
  pressureIntensityPct: number; // intensità del pressing sul portatore
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

  // 1. Individua il giocatore più vicino all'origine della freccia (portatore reale sul frame)
  const defaultActor: PlayerNode = {
    id: 'carrier-temp',
    number: 10,
    archetypeId: 10,
    archetypeName: 'Regista',
    codeLabel: 'REGISTA-10',
    team: action.analyzingTeam || 'home',
    role: 'Regista',
    positionGroup: 'MID',
    x: action.fromX,
    y: action.fromY,
    vx: 0,
    vy: 0,
    heightCm: 180,
    foot: 'Right',
    attributes: {
      passing: 85,
      pressResistance: 80,
      aerial: 70,
      progressiveCarries: 80,
      defensiveIndex: 50,
      speed: 75,
      composure: 80,
    },
  };

  let actor = state.players[0] || defaultActor;
  let minActorDist = Infinity;
  for (const p of state.players) {
    const d = Math.hypot(p.x - action.fromX, p.y - action.fromY);
    if (d < minActorDist) {
      minActorDist = d;
      actor = p;
    }
  }

  const actorTeam = actor?.team || 'home';
  const isActorHome = actorTeam === 'home';
  const teammates = state.players.filter((p) => p.team === actorTeam && p.id !== actor?.id);
  const opponents = state.players.filter((p) => p.team !== actorTeam);

  // 2. Orientamento del campo e porte bersaglio/difese
  const homeAttacksRight = (action.attackDirection || 'right') === 'right';
  const actorAttacksRight = isActorHome ? homeAttacksRight : !homeAttacksRight;
  const targetGoalX = actorAttacksRight ? 120 : 0;
  const targetGoalY = 40;
  const defendedGoalX = actorAttacksRight ? 0 : 120;
  const defendedGoalY = 40;

  const targetGoalDistMeters = Number(
    Math.hypot(targetGoalX - action.fromX, targetGoalY - action.fromY).toFixed(1)
  );
  const distArrowEndToGoal = Math.hypot(targetGoalX - action.toX, targetGoalY - action.toY);

  // Distanza e cinematica balistica della giocata
  const distanceMeters = Number(
    Math.max(1.0, Math.hypot(action.toX - action.fromX, action.toY - action.fromY)).toFixed(2)
  );
  const ballSpeedMs = Number(Math.max(2.5, action.ballSpeedKmh / 3.6).toFixed(2));

  // Individua il portiere avversario (o difensore più vicino alla porta avversaria)
  const oppGk =
    opponents.find((p) => p.positionGroup === 'GK') ||
    opponents.slice().sort(
      (a, b) =>
        Math.hypot(targetGoalX - a.x, targetGoalY - a.y) -
        Math.hypot(targetGoalX - b.x, targetGoalY - b.y)
    )[0] || null;

  const oppGkDistToGoal = oppGk
    ? Math.hypot(targetGoalX - oppGk.x, targetGoalY - oppGk.y)
    : 0;
  const oppGkInPosition = oppGkDistToGoal <= 11;

  // È un tiro verso la porta avversaria?
  const isShot =
    action.actionCategory === 'Tiro a Giro' ||
    action.targetType === 'shot' ||
    (distArrowEndToGoal < 13 && Math.abs(action.toY - 40) < 14);

  // 3. Pressione sul portatore al momento del tocco
  let minOppPressDist = Infinity;
  for (const opp of opponents) {
    const d = Math.hypot(opp.x - action.fromX, opp.y - action.fromY);
    if (d < minOppPressDist) minOppPressDist = d;
  }
  const pressureIntensityPct = Number(
    Math.max(0, Math.min(100, (1 - (minOppPressDist - 1.2) / 8.0) * 100)).toFixed(0)
  );

  // 4. Ricevente designato (SOLO tra i compagni di squadra!)
  const defaultReceiver: PlayerNode = {
    ...defaultActor,
    id: 'receiver-temp',
    number: 9,
    archetypeId: 9,
    archetypeName: 'Punta Mobile',
    codeLabel: 'PUNTA-9',
    role: 'Punta Mobile',
    positionGroup: 'FWD',
    x: action.toX,
    y: action.toY,
  };

  let receiver = teammates[0] || actor || defaultReceiver;
  let minRecDist = Infinity;
  for (const p of teammates) {
    const d = Math.hypot(p.x - action.toX, p.y - action.toY);
    if (d < minRecDist) {
      minRecDist = d;
      receiver = p;
    }
  }
  if (!receiver) receiver = defaultReceiver;

  // 5. Linea di Fuorigioco Dinamica o Manuale
  let isOffside = false;
  let offsideMarginMeters = 0;
  if (!isShot) {
    const sortedOpponents = opponents.slice().sort((a, b) => {
      const da = Math.abs(a.x - targetGoalX);
      const db = Math.abs(b.x - targetGoalX);
      return da - db;
    });
    const secondLastDefender = sortedOpponents[1] || sortedOpponents[0];

    // Se l'analista ha posizionato manualmente la linea di fuorigioco, usiamo quella coordinata X!
    const effectiveOffsideLineX =
      action.manualOffsideX !== undefined && action.manualOffsideX !== null
        ? action.manualOffsideX
        : secondLastDefender
          ? secondLastDefender.x
          : null;

    if (effectiveOffsideLineX !== null) {
      const halfPitchLineX = 60;
      const receiverInAttackingHalf = actorAttacksRight
        ? receiver.x > halfPitchLineX
        : receiver.x < halfPitchLineX;
      const receiverBeyondBall = actorAttacksRight
        ? receiver.x > action.fromX + 0.15
        : receiver.x < action.fromX - 0.15;
      const receiverBeyondDef = actorAttacksRight
        ? receiver.x > effectiveOffsideLineX + 0.2
        : receiver.x < effectiveOffsideLineX - 0.2;

      if (receiverInAttackingHalf && receiverBeyondBall && receiverBeyondDef) {
        isOffside = true;
        offsideMarginMeters = Number(Math.abs(receiver.x - effectiveOffsideLineX).toFixed(2));
      }
    }
  }

  // 6. Packing Rate (avversari saltati longitudinalmente)
  let packingRate = 0;
  for (const opp of opponents) {
    const beforeAhead = actorAttacksRight ? opp.x > action.fromX : opp.x < action.fromX;
    const afterBehind = actorAttacksRight ? opp.x < action.toX : opp.x > action.toX;
    if (beforeAhead && afterBehind) {
      packingRate++;
    }
  }

  // 7. Ritardo d'esecuzione & tempo di volo con attrito/parabola
  const executionDelaySec =
    action.executionStyle === 'Di Prima'
      ? 0.06
      : action.executionStyle === 'Controllo + Giocata'
        ? 0.38
        : 0.18;

  // Se tiro da distanza > 65m, la palla rotola o rimbalza (limite balistico umano)
  const isExtremeDistance = distanceMeters > 68;
  const arcFactor = action.ballHeightCm > 120 ? 1.12 : 1.04;
  const flightTimeSec = Number(
    (isExtremeDistance
      ? (distanceMeters / (ballSpeedMs * 0.65))
      : (distanceMeters * arcFactor) / ballSpeedMs
    ).toFixed(2)
  );

  const lateralCurlMeters = action.executionStyle === 'Interno a Giro' ? 2.4 : 0.0;

  // 8. Controllo Intercettazione Difensiva & Cover Shadow lungo la traiettoria
  const allDefenderChecks: DefenderInterceptDetail[] = [];
  let survivalProb = 1.0;

  for (const def of opponents) {
    const dx = action.toX - action.fromX;
    const dy = action.toY - action.fromY;
    const lenSq = dx * dx + dy * dy || 1;
    let s = ((def.x - action.fromX) * dx + (def.y - action.fromY) * dy) / lenSq;
    s = Math.max(0.08, Math.min(0.98, s));

    const perpX = -dy / distanceMeters;
    const perpY = dx / distanceMeters;
    const curlOffset = 4 * s * (1 - s) * lateralCurlMeters * (action.bodyPart === 'Destro' ? -1 : 1);

    const ptX = action.fromX + s * dx + perpX * curlOffset;
    const ptY = action.fromY + s * dy + perpY * curlOffset;

    const distToCorridor = Math.hypot(def.x - ptX, def.y - ptY);
    const ballArrivalTime = executionDelaySec + s * flightTimeSec;

    const ballAltitudeCm =
      s > 0.88 && action.ballHeightCm > 140
        ? action.ballHeightCm * 0.72
        : 4 * s * (1 - s) * action.ballHeightCm;

    const maxReachCm = def.positionGroup === 'GK' ? def.heightCm + 85 : def.heightCm + 42;
    const bypassedByAltitude = s < 0.85 && ballAltitudeCm > maxReachCm;

    const defTti = computeTTI(def, ptX, ptY);
    const timeMargin = Number((defTti - ballArrivalTime).toFixed(2));

    let interceptProb = 0;
    if (!bypassedByAltitude) {
      const rawLogit = 1 / (1 + Math.exp(timeMargin / 0.26));
      const speedDifficulty = Math.exp(-Math.max(0, action.ballSpeedKmh - 75) / 95);

      // Cover Shadow: se il difensore è vicino al portatore (< 6m) e vicino al corridoio (< 1.6m) a palla bassa
      const inCoverShadow = distToCorridor < 1.6 && s < 0.45 && action.ballHeightCm < 50;
      const shadowBonus = inCoverShadow ? 0.35 : 0.0;

      interceptProb = Math.min(0.98, rawLogit * speedDifficulty + shadowBonus);
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

  // Duello Aereo su Cross o Palla Alta
  let aerialDuelWinProbPct: number | null = null;
  if (!isShot && (action.ballHeightCm >= 150 || action.actionCategory === 'Cross') && teammates.length > 0) {
    const closestOpponentMarker =
      opponents
        .filter((d) => d.positionGroup !== 'GK')
        .sort(
          (a, b) =>
            Math.hypot(a.x - action.toX, a.y - action.toY) -
            Math.hypot(b.x - action.toX, b.y - action.toY)
        )[0] || opponents[0];

    if (closestOpponentMarker) {
      const heightDiffCm = receiver.heightCm - closestOpponentMarker.heightCm;
      const aerialSkillDiff = receiver.attributes.aerial - closestOpponentMarker.attributes.aerial;
      const logitAerial = heightDiffCm * 0.065 + aerialSkillDiff * 0.042;
      const winProb = 1 / (1 + Math.exp(-logitAerial));
      aerialDuelWinProbPct = Number((winProb * 100).toFixed(1));
      survivalProb *= 0.35 + 0.65 * winProb;
    }
  }

  // Bonus/Penalità tecniche e pressing
  const footMatchBonus =
    (action.bodyPart === 'Destro' && actor.foot !== 'Left') ||
    (action.bodyPart === 'Sinistro' && actor.foot !== 'Right')
      ? 1.0
      : 0.86;
  const speedControlPenalty =
    action.ballSpeedKmh > 92 ? Math.exp(-(action.ballSpeedKmh - 92) / 65) : 1.0;
  const pressurePenalty = 1 - (pressureIntensityPct / 100) * 0.22;

  let calculatedSuccessPct = survivalProb * footMatchBonus * speedControlPenalty * pressurePenalty * 100;

  // 9. Modello Avanzato di Tiro a Porta & Fisica Balistica
  let xgIfShot = 0;
  if (isShot) {
    const dxGoal = Math.max(1.0, Math.abs(targetGoalX - action.fromX));
    const dyGoal = Math.abs(targetGoalY - action.fromY);
    const goalAngle = Math.max(
      0.015,
      Math.atan2(7.32 * dxGoal, dxGoal * dxGoal + dyGoal * dyGoal - 13.3956)
    );

    // Dispersione della precisione (decade esponenzialmente con la distanza)
    const accuracyDecay = Math.exp(-Math.pow(targetGoalDistMeters / 27.5, 2));

    // Tempo di reazione e recupero del portiere
    // Se il portiere è in porta (distanza <= 11m)
    let gkSaveProbability = 0.55;
    if (oppGkInPosition) {
      // Tempo che il portiere ha a disposizione vs tempo di arrivo palla
      // Da > 55m il tempo di arrivo supera i 2.5s -> portiere blocca con certezza
      if (targetGoalDistMeters > 60) {
        gkSaveProbability = 0.9995;
      } else if (targetGoalDistMeters > 45) {
        gkSaveProbability = 0.985;
      } else if (targetGoalDistMeters > 30) {
        gkSaveProbability = 0.88;
      } else {
        gkSaveProbability = 0.65;
      }
    } else {
      // Portiere FUORI DAI PALI (es. 20-30m fuori)
      // Tempo che il portiere impiega per arretrare di corsa a 5.5 m/s
      const gkBacktrackTime = 0.35 + (oppGkDistToGoal - 4) / 5.2;
      if (flightTimeSec < gkBacktrackTime && action.ballHeightCm > 180) {
        // Il tiro a scavalcare supera il portiere!
        gkSaveProbability = 0.18;
      } else {
        gkSaveProbability = 0.60;
      }
    }

    const baseShotXg = 1 / (1 + Math.exp(-(-2.25 + 2.05 * goalAngle - 0.058 * targetGoalDistMeters)));
    const curlBonus = action.executionStyle === 'Interno a Giro' ? 1.14 : 1.0;
    
    // xG finale tiene conto di precisione specchio e parata del portiere
    xgIfShot = Number(
      Math.max(
        0.0001,
        Math.min(
          0.82,
          baseShotXg * curlBonus * accuracyDecay * (1 - gkSaveProbability)
        )
      ).toFixed(4)
    );

    // Per un tiro, la probabilità di successo dell'azione è la probabilità di segnare (xG)
    calculatedSuccessPct = xgIfShot * 100;
  }

  // Se è fuorigioco, probabilità di successo = 0%
  if (isOffside) {
    calculatedSuccessPct = 0.0;
  }

  const successProbabilityPct = Number(
    Math.max(isOffside ? 0 : 0.01, Math.min(98.0, calculatedSuccessPct)).toFixed(1)
  );
  const interceptionRiskPct = Number((100 - successProbabilityPct).toFixed(1));

  // 10. Valore Atteso xT, Pitch Control e Punteggio Chess.com J(a | s)
  const xtStart = sampleXtAtCoord(action.fromX, action.fromY, xtGrid);
  const xtEnd = sampleXtAtCoord(action.toX, action.toY, xtGrid);
  // Se l'attore attacca verso sinistra, l'xT cresce andando verso X=0
  const effectiveXtStart = actorAttacksRight ? xtStart : (0.12 - xtStart);
  const effectiveXtEnd = actorAttacksRight ? xtEnd : (0.12 - xtEnd);
  const deltaXt = Number((effectiveXtEnd - effectiveXtStart).toFixed(4));

  const pcTarget = computeSpearmanPitchControlAtPoint(
    state.players,
    action.toX,
    action.toY,
    action.fromX,
    action.fromY
  );
  const actorPitchControlProb = isActorHome ? pcTarget.homeProb : (1 - pcTarget.homeProb);
  const pitchControlAtTargetPct = Number((actorPitchControlProb * 100).toFixed(1));

  const spectralBefore = computeSpectralGraphMetrics(state.players, state.passEdges);
  const movedPlayers = state.players.map((p) =>
    p.id === receiver?.id ? { ...p, x: action.toX, y: action.toY } : p
  );
  const spectralAfter = computeSpectralGraphMetrics(movedPlayers, state.passEdges);
  const deltaFiedler = Number((spectralAfter.fiedlerValue - spectralBefore.fiedlerValue).toFixed(3));

  const pSucc = successProbabilityPct / 100;
  const rTrans = (1 - pSucc) * (action.fromX < 50 ? 0.42 : 0.22);
  const epvAction = Number(
    (isShot
      ? xgIfShot - rTrans * 0.22
      : effectiveXtEnd * pSucc + (actorPitchControlProb - 0.5) * 0.14 - rTrans * 0.25
    ).toFixed(3)
  );

  let rawScore = 0;
  if (isOffside) {
    // Fuorigioco è sempre un Grave Errore (Blunder)
    rawScore = -0.88;
  } else if (isShot) {
    if (targetGoalDistMeters > 55 && oppGkInPosition) {
      // Tiro dalla propria metà campo o trequarti difensiva con portiere in porta = Blunder scellerato
      rawScore = -0.92;
    } else if (targetGoalDistMeters > 38 && oppGkInPosition) {
      // Tiro dalla lunghissima distanza forzato
      rawScore = -0.45;
    } else {
      // Tiro normale o pallonetto su portiere fuori dai pali
      rawScore = (xgIfShot - 0.08) * 4.5 + (pSucc - 0.15) * 0.5 - rTrans * 0.4;
    }
  } else {
    // Passaggio / Conduzione verso compagno
    rawScore =
      deltaXt * pSucc * 12.0 +
      (actorPitchControlProb - 0.48) * 0.95 +
      packingRate * 0.08 +
      deltaFiedler * 1.2 +
      (pSucc - 0.55) * 0.65 -
      rTrans * 0.85;
  }

  const compositeScore = Number(Math.max(-0.99, Math.min(0.99, rawScore)).toFixed(2));

  // 11. Top-3 Alternative Valutate sul Frame (STRETTAMENTE tra i compagni di squadra!)
  const stateAtOrigin: TacticalState = {
    ...state,
    ballX: action.fromX,
    ballY: action.fromY,
  };

  const top3FrameAlternatives: ChessStyleAlternative[] = teammates
    .map((mate) => {
      const mDist = Math.hypot(mate.x - action.fromX, mate.y - action.fromY);
      const mTBall = mDist / ballSpeedMs;
      let mMinMargin = Infinity;
      for (const opp of opponents) {
        const dLine = pointToSegmentDistLocal(opp.x, opp.y, action.fromX, action.fromY, mate.x, mate.y);
        const tti = computeTTI(opp, (action.fromX + mate.x) / 2, (action.fromY + mate.y) / 2);
        const margin = tti - mTBall * 0.65 - (dLine - 3.5) * 0.18;
        if (margin < mMinMargin) mMinMargin = margin;
      }
      const mPSucc = Math.max(0.18, Math.min(0.96, 1 / (1 + Math.exp(-2.8 * mMinMargin))));
      const mXtTo = sampleXtAtCoord(mate.x, mate.y, xtGrid);
      const effXtTo = actorAttacksRight ? mXtTo : (0.12 - mXtTo);
      const mDeltaXt = effXtTo - effectiveXtStart;
      const mPc = computeSpearmanPitchControlAtPoint(stateAtOrigin.players, mate.x, mate.y, action.fromX, action.fromY);
      const mPcProb = isActorHome ? mPc.homeProb : (1 - mPc.homeProb);
      const mScore = Number(
        Math.max(
          -0.95,
          Math.min(
            0.98,
            mDeltaXt * mPSucc * 11.5 +
              (mPcProb - 0.48) * 0.95 +
              (mPSucc - 0.55) * 0.55 -
              (1 - mPSucc) * 0.25
          )
        ).toFixed(2)
      );

      return {
        rank: 1 as 1 | 2 | 3,
        classification: 'Best Move (!!)' as const,
        actionType:
          Math.abs(mate.x - action.fromX) > 15
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
        deltaPitchControlPct: Number(((mPcProb - 0.5) * 100).toFixed(1)),
        deltaFiedler: 0.024,
        successProbabilityPct: Number((mPSucc * 100).toFixed(1)),
        confidencePct: 98.2,
        tacticalWhy: `Opzione verso ${mate.archetypeName} (#${mate.number}) a (${mate.x.toFixed(0)}m, ${mate.y.toFixed(0)}m): P_succ ${(mPSucc * 100).toFixed(0)}%, Controllo ${(mPcProb * 100).toFixed(0)}%.`,
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

  // 12. Classificazione Finale e Commento Narrativo Umano
  const bestOptionScore = top3FrameAlternatives[0]?.compositeScore ?? 0.3;
  let classification: DrawnActionEvaluation['classification'] = 'Inaccuracy (?)';
  if (isOffside) {
    classification = 'Blunder (??)';
  } else if (isShot && targetGoalDistMeters > 55 && oppGkInPosition) {
    classification = 'Blunder (??)';
  } else if (compositeScore >= bestOptionScore - 0.06 && compositeScore > 0.15) {
    classification = 'Best Move (!!)';
  } else if (compositeScore >= 0.04) {
    classification = 'Good Alternative (!)';
  } else if (compositeScore >= -0.18) {
    classification = 'Inaccuracy (?)';
  } else {
    classification = 'Blunder (??)';
  }

  const bestAlt = top3FrameAlternatives[0];
  let chessVerdictText = '';

  if (isOffside) {
    chessVerdictText = `Blunder (??): FUORIGIOCO EVIDENTE! ${receiver.archetypeName} (#${receiver.number}) si trova oltre la linea del penultimo difendente di ${offsideMarginMeters}m al momento del lancio. Azione nulla e punizione contro.`;
  } else if (isShot) {
    if (targetGoalDistMeters > 55 && oppGkInPosition) {
      chessVerdictText = `Blunder (??): Tentativo scriteriato di segnare da ${targetGoalDistMeters}m! Il portiere avversario è regolarmente tra i pali (tempo di volo palla ${flightTimeSec}s, tempo reazione GK 0.3s): xG microscopico (${xgIfShot.toFixed(4)}) e cessione certa del possesso.`;
    } else if (!oppGkInPosition && targetGoalDistMeters < 50 && action.ballHeightCm > 180) {
      chessVerdictText = `Best Move (!!): Intuizione brillante! Il portiere avversario è fuori dai pali di ${oppGkDistToGoal.toFixed(1)}m. Il pallonetto a ${action.ballSpeedKmh} km/h lo scavalca con xG ${xgIfShot.toFixed(2)}.`;
    } else {
      chessVerdictText = `${classification}: Conclusione a rete da ${targetGoalDistMeters}m (xG ${xgIfShot.toFixed(2)}, probabilità nello specchio ${successProbabilityPct}%). ${
        classification === 'Blunder (??)' ? 'Tiro forzato da posizione poco favorevole.' : 'Buona iniziativa offensiva.'
      }`;
    }
  } else {
    const blockerMsg = criticalBlocker
      ? `Difensore in pressione: ${criticalBlocker.defenderLabel} a ${criticalBlocker.distanceToCorridorM}m dal corridoio (intercetto ${criticalBlocker.interceptProbabilityPct}%).`
      : 'Corridoio di passaggio pulito.';

    chessVerdictText = `${classification}: ${action.actionCategory} verso ${receiver.archetypeName} (#${receiver.number}) con probabilità di riuscita ${successProbabilityPct}% e ${packingRate} avversari saltati. ${blockerMsg} ${
      classification !== 'Best Move (!!)' && bestAlt
        ? `Mossa migliore: servire ${bestAlt.targetArchetype} (J=${bestAlt.compositeScore >= 0 ? '+' : ''}${bestAlt.compositeScore}).`
        : 'Scelta tattica d’eccellenza.'
    }`;
  }

  return {
    classification,
    compositeScore,
    distanceMeters,
    ballSpeedMs,
    flightTimeSec,
    executionDelaySec,
    xtStart: effectiveXtStart,
    xtEnd: effectiveXtEnd,
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
    isShot,
    isOffside,
    offsideMarginMeters,
    actorTeam,
    targetGoalDistMeters,
    oppGkInPosition,
    packingRate,
    pressureIntensityPct,
  };
}

/**
 * Riconosce automaticamente il modulo tattico da un insieme di pedine visibili (da 7 a 11 giocatori)
 */
export function detectTacticalFormation(
  players: PlayerNode[],
  team: 'home' | 'away'
): { formation: string; lines: number[]; confidencePct: number } {
  const teamPlayers = players.filter((p) => p.team === team);
  if (teamPlayers.length < 5) {
    return { formation: team === 'home' ? '4-3-3' : '3-5-2', lines: [4, 3, 3], confidencePct: 50 };
  }

  // Escludi portiere se presente
  const outfield = teamPlayers.filter((p) => p.positionGroup !== 'GK');
  if (outfield.length < 4) {
    return { formation: 'Libero', lines: [outfield.length], confidencePct: 40 };
  }

  // Ordina per X
  const isHome = team === 'home';
  // per home, X cresce verso l'attacco; per away, decresce
  const sorted = outfield.slice().sort((a, b) => (isHome ? a.x - b.x : b.x - a.x));

  // Clusterizza in 3 fasce (Difesa, Centrocampo, Attacco)
  const minX = sorted[0].x;
  const maxX = sorted[sorted.length - 1].x;
  const span = Math.max(12, Math.abs(maxX - minX));

  let defCount = 0;
  let midCount = 0;
  let attCount = 0;

  for (const p of sorted) {
    const relProgress = isHome ? (p.x - minX) / span : (minX - p.x) / span;
    if (relProgress < 0.36) {
      defCount++;
    } else if (relProgress < 0.74) {
      midCount++;
    } else {
      attCount++;
    }
  }

  // Standardizza se mancano giocatori (normalizza a canone)
  let formation = `${defCount}-${midCount}-${attCount}`;
  if (defCount === 4 && midCount === 3 && attCount === 3) formation = '4-3-3';
  else if (defCount === 3 && midCount === 5 && attCount === 2) formation = '3-5-2';
  else if (defCount === 4 && midCount === 2 && attCount === 3) formation = '4-2-3-1';
  else if (defCount === 3 && midCount === 4 && attCount === 2) formation = '3-4-1-2';
  else if (defCount === 4 && midCount === 4 && attCount === 2) formation = '4-4-2';
  else if (defCount === 5 && midCount === 3 && attCount === 2) formation = '5-3-2';
  else if (defCount === 3 && midCount === 4 && attCount === 3) formation = '3-4-3';

  return {
    formation,
    lines: [defCount, midCount, attCount],
    confidencePct: Math.min(95, 60 + outfield.length * 3),
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
