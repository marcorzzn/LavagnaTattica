/**
 * LavagnaTattica — Motore di Analisi Tattica di Squadra & Movimenti Senza Palla
 * 
 * Modella matematicamente:
 *  1. Valutazione rigorosa del portatore palla:
 *     - Passaggio a un avversario = Blunder (??) / Palla Persa Immediata
 *     - Palla calciata fuori campo senza pressione = Blunder (??) / Possesso Regalato
 *     - Spazzata di emergenza = Mossa di Sicurezza (!) se difensore pressato in zona critica
 *  2. Analisi dei movimenti senza palla dei compagni di squadra:
 *     - Sovrapposizioni (Overlapping esterno o interno)
 *     - Attacco alla profondità (Tagli alle spalle della linea difensiva)
 *     - Linee di passaggio aperte / Appoggio di scarico
 *     - Rilevamento fuorigioco passivo nel movimento
 *  3. Analisi della squadra difendente (Marcature, coperture, raddoppi, scaglionamento)
 *  4. Generazione automatica dei movimenti ottimali per ciascun compagno
 */

import { PlayerNode, TacticalState } from '../core/types';

export interface PlayerMovementVector {
  playerId: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speedKmh: number;
  actionType: 'depth_run' | 'overlap' | 'support_drop' | 'press_carrier' | 'cover_space';
  label: string;
  isAutomatic?: boolean;
}

export interface OffBallMovementEvaluation {
  playerId: string;
  playerNumber: number;
  archetypeName: string;
  team: 'home' | 'away';
  movement: PlayerMovementVector;
  rating: 'brilliant' | 'great' | 'good' | 'inaccuracy' | 'blunder';
  badge: '!!' | '!' | 'ok' | '?' | '??';
  title: string;
  description: string;
  score: number; // da -1.0 a +1.0
  isOffsideRisk: boolean;
  isOpenPassingLane: boolean;
}

export interface CarrierDecisionEvaluation {
  actionType: 'pass' | 'shot' | 'clearance' | 'out_of_bounds';
  rating: 'brilliant' | 'great' | 'good' | 'inaccuracy' | 'blunder';
  badge: '!!' | '!' | 'ok' | '?' | '??';
  title: string;
  description: string;
  compositeScore: number;
  interceptRiskPct: number;
  targetTeammate?: PlayerNode;
  interceptingOpponent?: PlayerNode;
  isEmergencyClearance: boolean;
  isOutOfBounds: boolean;
  isPassedToOpponent: boolean;
}

export interface TeamTacticalAnalysisResult {
  carrierEval: CarrierDecisionEvaluation;
  offBallEvaluations: OffBallMovementEvaluation[];
  suggestedMovements: PlayerMovementVector[];
  defensiveShapeEval: {
    compactnessScore: number; // 0-100
    pressureIntensity: 'Alta' | 'Media' | 'Bassa';
    markingQuality: 'Efficace' | 'Vulnerabile' | 'Scaglionata';
    recommendation: string;
  };
  detectedPattern: {
    name: string;
    description: string;
    confidence: number;
    isAutoDetected: boolean;
  };
}

/**
 * Valuta la scelta del portatore di palla
 */
export function evaluateCarrierDecision(
  ball: { x: number; y: number },
  target: { x: number; y: number },
  carrier: PlayerNode | undefined,
  allPlayers: PlayerNode[],
  analyzingTeam: 'home' | 'away',
  attackDirection: 'right' | 'left',
  offsideLineX: number
): CarrierDecisionEvaluation {
  const isTargetOutOfBounds = target.x < 0 || target.x > 120 || target.y < 0 || target.y > 80;
  
  // Porta avversaria
  const opponentGoalX = attackDirection === 'right' ? 120 : 0;
  const isShootingAtGoal =
    Math.hypot(target.x - opponentGoalX, target.y - 40) <= 6 &&
    ((attackDirection === 'right' && target.x >= 115) || (attackDirection === 'left' && target.x <= 5));

  // Squadre
  const teammates = allPlayers.filter((p) => p.team === (carrier ? carrier.team : analyzingTeam));
  const opponents = allPlayers.filter((p) => p.team !== (carrier ? carrier.team : analyzingTeam));

  // Distanza del portatore dal marcatore avversario più vicino
  let nearestOpponentDist = 999;
  let nearestOpponent: PlayerNode | undefined;
  if (carrier) {
    for (const opp of opponents) {
      const d = Math.hypot(opp.x - carrier.x, opp.y - carrier.y);
      if (d < nearestOpponentDist) {
        nearestOpponentDist = d;
        nearestOpponent = opp;
      }
    }
  }

  // 1. Caso: Pallone calciato fuori dal campo
  if (isTargetOutOfBounds && !isShootingAtGoal) {
    const isDefenderInOwnThird =
      carrier &&
      ((attackDirection === 'right' && carrier.x <= 36) || (attackDirection === 'left' && carrier.x >= 84));
    
    // Spazzata di emergenza: difensore sotto forte pressione (distanza avversario <= 3.8m)
    if (isDefenderInOwnThird && nearestOpponentDist <= 3.8) {
      return {
        actionType: 'clearance',
        rating: 'good',
        badge: 'ok',
        title: 'Spazzata di Sicurezza Necessaria',
        description: `Difensore sotto pressione immediata (${nearestOpponentDist.toFixed(1)}m da avversario). Mettere il pallone fuori in fallo laterale evita un rischioso retropassaggio corto o una palla persa in zona 1. Scelta razionale.`,
        compositeScore: 0.42,
        interceptRiskPct: 0,
        isEmergencyClearance: true,
        isOutOfBounds: true,
        isPassedToOpponent: false,
      };
    }

    return {
      actionType: 'out_of_bounds',
      rating: 'blunder',
      badge: '??',
      title: 'Errore Inutile (Palla Fuori Campo)',
      description: 'Pallone indirizzato direttamente fuori dal rettangolo di gioco senza sufficiente pressione avversaria da giustificare una spazzata. Possesso regalato agli avversari.',
      compositeScore: -0.78,
      interceptRiskPct: 0,
      isEmergencyClearance: false,
      isOutOfBounds: true,
      isPassedToOpponent: false,
    };
  }

  // 2. Controllo se il passaggio è indirizzato direttamente su un avversario
  let closestOpponentToTargetDist = 999;
  let opponentAtTarget: PlayerNode | undefined;
  for (const opp of opponents) {
    const d = Math.hypot(opp.x - target.x, opp.y - target.y);
    if (d < closestOpponentToTargetDist) {
      closestOpponentToTargetDist = d;
      opponentAtTarget = opp;
    }
  }

  // Se l'avversario è entro 2.6 metri dal punto di arrivo e nessun compagno è più vicino
  let closestTeammateToTargetDist = 999;
  let targetTeammate: PlayerNode | undefined;
  for (const tm of teammates) {
    if (carrier && tm.id === carrier.id) continue;
    const d = Math.hypot(tm.x - target.x, tm.y - target.y);
    if (d < closestTeammateToTargetDist) {
      closestTeammateToTargetDist = d;
      targetTeammate = tm;
    }
  }

  if (closestOpponentToTargetDist <= 2.8 && closestOpponentToTargetDist < closestTeammateToTargetDist) {
    return {
      actionType: 'pass',
      rating: 'blunder',
      badge: '??',
      title: "Passaggio Consegnato all'Avversario (Errore Grave)",
      description: `Il passaggio è indirizzato esattamente sulla pedina avversaria (#${opponentAtTarget?.number ?? 'X'} ${opponentAtTarget?.archetypeName ?? 'Avversario'}). Intercetto certo e transizione negativa immediata.`,
      compositeScore: -0.92,
      interceptRiskPct: 98,
      interceptingOpponent: opponentAtTarget,
      targetTeammate,
      isEmergencyClearance: false,
      isOutOfBounds: false,
      isPassedToOpponent: true,
    };
  }

  // 3. Controllo intercetto lungo la traiettoria
  let maxInterceptRisk = 0;
  let interceptor: PlayerNode | undefined;
  const passLength = Math.hypot(target.x - ball.x, target.y - ball.y);
  const ballSpeedMs = 18; // ~65 km/h
  const timeToTarget = passLength / Math.max(8, ballSpeedMs);

  for (const opp of opponents) {
    // Proiezione del difensore sulla linea ball -> target
    const dx = target.x - ball.x;
    const dy = target.y - ball.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    const tProj = Math.max(0, Math.min(1, ((opp.x - ball.x) * dx + (opp.y - ball.y) * dy) / lenSq));
    const projX = ball.x + tProj * dx;
    const projY = ball.y + tProj * dy;
    const distToLine = Math.hypot(opp.x - projX, opp.y - projY);

    const ballTimeToProj = (passLength * tProj) / ballSpeedMs;
    const oppTimeToProj = 0.45 + distToLine / 6.0; // tempo di reazione 0.45s + corsa a 6m/s

    if (oppTimeToProj <= ballTimeToProj + 0.35 && distToLine <= 5.5) {
      const risk = Math.min(99, Math.round((1 - (oppTimeToProj - ballTimeToProj)) * 100));
      if (risk > maxInterceptRisk) {
        maxInterceptRisk = risk;
        interceptor = opp;
      }
    }
  }

  if (maxInterceptRisk >= 75) {
    return {
      actionType: 'pass',
      rating: 'blunder',
      badge: '??',
      title: 'Passaggio Rischioso (Intercetto Probabile)',
      description: `Traiettoria intersecata da #${interceptor?.number ?? 'X'} (${interceptor?.archetypeName ?? 'Difensore'}), che può intervenire prima dell'arrivo del pallone.`,
      compositeScore: -0.58,
      interceptRiskPct: maxInterceptRisk,
      interceptingOpponent: interceptor,
      targetTeammate,
      isEmergencyClearance: false,
      isOutOfBounds: false,
      isPassedToOpponent: false,
    };
  }

  // 4. Fuorigioco sul ricevente
  const isOffside =
    attackDirection === 'right'
      ? target.x > offsideLineX + 0.2
      : target.x < offsideLineX - 0.2;

  if (isOffside) {
    return {
      actionType: 'pass',
      rating: 'inaccuracy',
      badge: '?',
      title: 'Passaggio in Posizione di Fuorigioco',
      description: `Il ricevente si trova oltre la linea dell'ultimo difensore (${offsideLineX.toFixed(1)}m). L'azione verrà interrotta dal direttore di gara.`,
      compositeScore: -0.35,
      interceptRiskPct: 15,
      targetTeammate,
      isEmergencyClearance: false,
      isOutOfBounds: false,
      isPassedToOpponent: false,
    };
  }

  // 5. Passaggio riuscito e progressione
  const xAdvancement = attackDirection === 'right' ? target.x - ball.x : ball.x - target.x;
  if (xAdvancement > 15) {
    return {
      actionType: 'pass',
      rating: 'brilliant',
      badge: '!!',
      title: 'Passaggio Filtrante d’Eccellenza',
      description: `Verticalizzazione pulita verso #${targetTeammate?.number ?? 'X'} che salta la linea avversaria con avanzamento di +${xAdvancement.toFixed(1)}m.`,
      compositeScore: 0.94,
      interceptRiskPct: maxInterceptRisk,
      targetTeammate,
      isEmergencyClearance: false,
      isOutOfBounds: false,
      isPassedToOpponent: false,
    };
  }

  return {
    actionType: 'pass',
    rating: 'good',
    badge: '!',
    title: 'Passaggio di Consolidamento Posizionale',
    description: `Distribuzione ordinata che mantiene il possesso palla e permette il consolidamento della struttura di squadra.`,
    compositeScore: 0.68,
    interceptRiskPct: maxInterceptRisk,
    targetTeammate,
    isEmergencyClearance: false,
    isOutOfBounds: false,
    isPassedToOpponent: false,
  };
}

/**
 * Genera e valuta i movimenti senza palla ideali per ogni compagno di squadra
 */
export function analyzeOffBallTeamMovements(
  allPlayers: PlayerNode[],
  ball: { x: number; y: number },
  carrier: PlayerNode | undefined,
  analyzingTeam: 'home' | 'away',
  attackDirection: 'right' | 'left',
  offsideLineX: number,
  customMovements: Record<string, PlayerMovementVector> = {}
): {
  evaluations: OffBallMovementEvaluation[];
  suggestedMovements: PlayerMovementVector[];
} {
  const teammates = allPlayers.filter((p) => p.team === (carrier ? carrier.team : analyzingTeam));
  const opponents = allPlayers.filter((p) => p.team !== (carrier ? carrier.team : analyzingTeam));

  const suggestedMovements: PlayerMovementVector[] = [];
  const evaluations: OffBallMovementEvaluation[] = [];

  const forwardDir = attackDirection === 'right' ? 1 : -1;

  for (const tm of teammates) {
    if (carrier && tm.id === carrier.id) continue;

    // Distanza dalla palla
    const distToBall = Math.hypot(tm.x - ball.x, tm.y - ball.y);

    // Determina il movimento ottimale per la tipologia
    let actionType: PlayerMovementVector['actionType'] = 'support_drop';
    let targetX = tm.x;
    let targetY = tm.y;
    let label = 'Sostegno';

    const isAttacker = tm.y < 30 || tm.y > 50 || (forwardDir === 1 ? tm.x > 75 : tm.x < 45);
    const isDefender = forwardDir === 1 ? tm.x < 45 : tm.x > 75;

    if (isAttacker) {
      // Attaccante: taglio verso la profondità o mezzo-spazio
      const maxAllowedX = forwardDir === 1 ? Math.min(108, offsideLineX - 0.6) : Math.max(12, offsideLineX + 0.6);
      targetX = tm.x + forwardDir * 12;
      if (forwardDir === 1 && targetX > maxAllowedX) targetX = maxAllowedX;
      if (forwardDir === -1 && targetX < maxAllowedX) targetX = maxAllowedX;

      // Se esterno, taglio verso l'interno; se centrale, attacco al primo palo
      targetY = tm.y < 40 ? tm.y + 6 : tm.y - 6;
      actionType = 'depth_run';
      label = 'Taglio in Profondità';
    } else if (!isDefender) {
      // Centrocampista: sovrapposizione o vertice di scarico
      if (distToBall > 25) {
        // Avvicinamento a vertice di supporto
        targetX = tm.x + forwardDir * 8;
        targetY = ball.y + (tm.y > ball.y ? 8 : -8);
        actionType = 'support_drop';
        label = 'Sostegno al Portatore';
      } else {
        // Inserimento / Sovrapposizione
        targetX = tm.x + forwardDir * 14;
        targetY = tm.y < 40 ? Math.max(8, tm.y - 8) : Math.min(72, tm.y + 8);
        actionType = 'overlap';
        label = 'Sovrapposizione Esterna';
      }
    } else {
      // Difensore: scaglionamento e copertura preventiva
      targetX = tm.x + forwardDir * 4;
      targetY = tm.y;
      actionType = 'cover_space';
      label = 'Copertura Preventiva';
    }

    const suggested: PlayerMovementVector = {
      playerId: tm.id,
      startX: tm.x,
      startY: tm.y,
      targetX: Math.round(targetX * 10) / 10,
      targetY: Math.round(targetY * 10) / 10,
      speedKmh: 24,
      actionType,
      label,
      isAutomatic: true,
    };
    suggestedMovements.push(suggested);

    // Valutazione del movimento (personalizzato dall'utente oppure suggerito)
    const activeMovement = customMovements[tm.id] || suggested;

    // Controllo se il movimento porta in fuorigioco passivo
    const isOffsideRisk =
      forwardDir === 1
        ? activeMovement.targetX > offsideLineX
        : activeMovement.targetX < offsideLineX;

    // Controllo linea di passaggio tra palla e destinazione del compagno
    let laneOpen = true;
    for (const opp of opponents) {
      const dBallToTarget = Math.hypot(activeMovement.targetX - ball.x, activeMovement.targetY - ball.y);
      if (dBallToTarget > 0) {
        const dx = activeMovement.targetX - ball.x;
        const dy = activeMovement.targetY - ball.y;
        const tP = Math.max(0, Math.min(1, ((opp.x - ball.x) * dx + (opp.y - ball.y) * dy) / (dBallToTarget * dBallToTarget)));
        const pX = ball.x + tP * dx;
        const pY = ball.y + tP * dy;
        if (Math.hypot(opp.x - pX, opp.y - pY) < 2.2) {
          laneOpen = false;
          break;
        }
      }
    }

    let rating: OffBallMovementEvaluation['rating'] = 'good';
    let badge: OffBallMovementEvaluation['badge'] = '!';
    let title = 'Movimento Efficace';
    let description = `${activeMovement.label}: crea spazio e distrae la marcatura avversaria.`;
    let score = 0.72;

    if (isOffsideRisk) {
      rating = 'blunder';
      badge = '??';
      title = 'Fuorigioco di Posizione';
      description = `La corsa si estende oltre la linea difensiva avversaria (${offsideLineX.toFixed(1)}m). Il compagno non è giocabile.`;
      score = -0.55;
    } else if (laneOpen && activeMovement.actionType === 'depth_run') {
      rating = 'brilliant';
      badge = '!!';
      title = 'Taglio Perfetto nello Spazio';
      description = `Movimento sul filo del fuorigioco con linea di passaggio aperta verso la porta avversaria.`;
      score = 0.95;
    } else if (activeMovement.actionType === 'overlap') {
      rating = 'great';
      badge = '!';
      title = 'Sovrapposizione Puntuale';
      description = `Attacco allo spazio laterale che crea superiorità numerica sul corridoio esterno.`;
      score = 0.86;
    }

    evaluations.push({
      playerId: tm.id,
      playerNumber: tm.number,
      archetypeName: tm.archetypeName,
      team: tm.team,
      movement: activeMovement,
      rating,
      badge,
      title,
      description,
      score,
      isOffsideRisk,
      isOpenPassingLane: laneOpen,
    });
  }

  return { evaluations, suggestedMovements };
}

/**
 * Valuta l'assetto difensivo della squadra non in possesso
 */
export function evaluateDefensiveShape(
  defendingPlayers: PlayerNode[],
  ball: { x: number; y: number },
  attackDirection: 'right' | 'left'
) {
  if (defendingPlayers.length === 0) {
    return {
      compactnessScore: 0,
      pressureIntensity: 'Bassa' as const,
      markingQuality: 'Vulnerabile' as const,
      recommendation: 'Nessun difensore schierato in campo.',
    };
  }

  // Calcolo baricentro difensivo e dispersione spaziale (compattezza)
  let sumX = 0;
  let sumY = 0;
  for (const p of defendingPlayers) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / defendingPlayers.length;
  const meanY = sumY / defendingPlayers.length;

  let variance = 0;
  let minDToBall = 999;
  for (const p of defendingPlayers) {
    variance += (p.x - meanX) ** 2 + (p.y - meanY) ** 2;
    const d = Math.hypot(p.x - ball.x, p.y - ball.y);
    if (d < minDToBall) minDToBall = d;
  }
  const stdDev = Math.sqrt(variance / defendingPlayers.length);

  // Compattezza: deviazione standard ottimale tra 14m e 22m
  const compactnessScore = Math.max(10, Math.min(99, Math.round(100 - Math.abs(stdDev - 18) * 3.5)));

  let pressureIntensity: 'Alta' | 'Media' | 'Bassa' = 'Media';
  if (minDToBall <= 4.0) pressureIntensity = 'Alta';
  else if (minDToBall > 12.0) pressureIntensity = 'Bassa';

  const markingQuality = compactnessScore > 75 ? 'Efficace' : compactnessScore > 50 ? 'Scaglionata' : 'Vulnerabile';

  let recommendation = 'Mantenere le distanze tra i reparti entro i 25-30m.';
  if (pressureIntensity === 'Bassa') {
    recommendation = 'Accorciare in avanti sul portatore per togliere tempo di rifinitura.';
  } else if (compactnessScore < 50) {
    recommendation = 'Linee sfilacciate: serrare il blocco centrale per non concedere imbucate.';
  }

  return {
    compactnessScore,
    pressureIntensity,
    markingQuality: markingQuality as 'Efficace' | 'Vulnerabile' | 'Scaglionata',
    recommendation,
  };
}

/**
 * Riconosce dinamicamente il pattern tattico attivo dalla geometria dei giocatori
 */
export function detectTacticalPattern(
  players: PlayerNode[],
  ball: { x: number; y: number },
  attackingTeam: 'home' | 'away',
  attackDirection: 'right' | 'left'
) {
  const attackers = players.filter((p) => p.team === attackingTeam);
  const defenders = players.filter((p) => p.team !== attackingTeam);

  const forwardDir = attackDirection === 'right' ? 1 : -1;

  // Analisi scaglionamento offensivo
  const deepAttackers = attackers.filter((p) => (forwardDir === 1 ? p.x > 75 : p.x < 45));
  const buildUpPlayers = attackers.filter((p) => (forwardDir === 1 ? p.x <= 45 : p.x >= 75));
  const widePlayers = attackers.filter((p) => p.y < 18 || p.y > 62);

  if (buildUpPlayers.length >= 5 && (forwardDir === 1 ? ball.x < 45 : ball.x > 75)) {
    return {
      name: 'Costruzione 3+2 dal Basso',
      description: 'Sovraccarico nella prima metà campo per attirare la prima pressione e creare superiorità numerica pulita in uscita.',
      confidence: 88,
      isAutoDetected: true,
    };
  }

  if (widePlayers.length >= 3 && deepAttackers.length >= 3) {
    return {
      name: 'Ampiezza Massima & Isolamento Laterale',
      description: 'Fissaggio dei terzini avversari sulle corsie esterne per aprire il corridoio centrale e attaccare la Zona 14.',
      confidence: 84,
      isAutoDetected: true,
    };
  }

  const lowDefenders = defenders.filter((p) => (forwardDir === 1 ? p.x > 80 : p.x < 40));
  if (lowDefenders.length >= 6) {
    return {
      name: 'Attacco a Blocco Basso Posizionato',
      description: 'L’avversario è schierato a protezione della propria area di rigore: necessaria circolazione veloce e tiri da fuori.',
      confidence: 91,
      isAutoDetected: true,
    };
  }

  return {
    name: 'Sviluppo Fluido & Ricerca Varchi',
    description: 'Rotazione continua dei centrocampisti e ricerca dell’uomo libero tra le linee di pressione avversarie.',
    confidence: 76,
    isAutoDetected: true,
  };
}
