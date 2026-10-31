import { Keyframe, KeyframePlayer, TacticalAction } from '../core/types';

/**
 * Linearly interpolates between two scalar values.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smooth cubic ease-in-out interpolation curve.
 * Symmetrical around t = 0.5 where easeInOutCubic(0.5) === 0.5.
 */
export function easeInOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

/**
 * Evaluates a quadratic Bézier curve at parameter t in [0, 1].
 */
export function quadBezier(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/**
 * Extracts a normalized timestamp in milliseconds from a Keyframe.
 */
export function getKeyframeTimestamp(kf: Keyframe): number {
  return typeof kf.timestamp === 'number'
    ? kf.timestamp
    : typeof kf.timestampMs === 'number'
    ? kf.timestampMs
    : 0;
}

/**
 * Converts Keyframe player entries (either array or object map) into a typed Map.
 */
export function normalizeKeyframePlayers(
  kfPlayers: KeyframePlayer[] | Record<string, { x: number; y: number; visible?: boolean }>
): Map<string, { x: number; y: number; visible: boolean }> {
  const map = new Map<string, { x: number; y: number; visible: boolean }>();
  if (Array.isArray(kfPlayers)) {
    for (const p of kfPlayers) {
      map.set(p.id, { x: p.x, y: p.y, visible: p.visible ?? true });
    }
  } else if (kfPlayers && typeof kfPlayers === 'object') {
    for (const [id, p] of Object.entries(kfPlayers)) {
      map.set(id, { x: p.x, y: p.y, visible: p.visible ?? true });
    }
  }
  return map;
}

/**
 * Calculates ball position in 3D (x, y in meters, z in meters elevation)
 * along a tactical action trajectory (pass, shot, cross).
 */
export function ballPositionForAction(
  action: TacticalAction,
  from: { x: number; y: number },
  to: { x: number; y: number },
  elapsedMs: number
): { x: number; y: number; z: number } {
  const duration = Math.max(1, action.params?.duration || 1000);
  const t = Math.max(0, Math.min(1, elapsedMs / duration));
  const heightCm = action.params?.heightCm ?? 0;
  const curve = action.params?.curve ?? 0;

  // Direzione e vettore perpendicolare nel piano (x, y)
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  const perpX = -dy / (len || 1);
  const perpY = dx / (len || 1);

  // Punto di controllo Bézier: scostamento laterale per effetto a giro / curva
  // curve in [-1, 1], con 6 metri di freccia massima a fondo scala
  const ctrlX = (from.x + to.x) / 2 + perpX * curve * 6;
  const ctrlY = (from.y + to.y) / 2 + perpY * curve * 6;

  const x = quadBezier(from.x, ctrlX, to.x, t);
  const y = quadBezier(from.y, ctrlY, to.y, t);

  // Quota z (elevazione in metri): parabola verticale balistica 4 * peak * t * (1 - t)
  let z = 0;
  if (['pass_lofted', 'cross', 'shot_lofted', 'shot_curl'].includes(action.type)) {
    const peakMeters = Math.max(0, heightCm) / 100;
    z = 4 * peakMeters * t * (1 - t);
  }

  return { x, y, z };
}

/**
 * Calculates player position along a multi-waypoint run trajectory.
 */
export function playerRunPosition(
  action: TacticalAction,
  elapsedMs: number
): { x: number; y: number } | null {
  const duration = Math.max(1, action.params?.duration || 1000);
  const t = Math.max(0, Math.min(1, elapsedMs / duration));
  const eased = easeInOutCubic(t);
  const path = action.waypoints;
  if (!path || path.length < 2) return null;

  // Trova segmento corrente tra i waypoints
  const segments = path.length - 1;
  const seg = Math.min(Math.floor(eased * segments), segments - 1);
  const localT = eased * segments - seg;

  return {
    x: lerp(path[seg].x, path[seg + 1].x, localT),
    y: lerp(path[seg].y, path[seg + 1].y, localT),
  };
}

export interface InterpolationResult {
  players: Map<string, { x: number; y: number; visible: boolean }>;
  ball: { x: number; y: number; z: number; carrierId: string | null };
  activeKeyframeA: Keyframe | null;
  activeKeyframeB: Keyframe | null;
  segmentProgress: number; // 0..1
}

/**
 * Pure interpolation function: computes the exact tactical state at currentTime.
 */
export function interpolateAt(
  keyframes: Keyframe[],
  currentTime: number,
  actions: TacticalAction[] = []
): InterpolationResult {
  if (!keyframes || keyframes.length === 0) {
    return {
      players: new Map(),
      ball: { x: 60, y: 40, z: 0, carrierId: null },
      activeKeyframeA: null,
      activeKeyframeB: null,
      segmentProgress: 0,
    };
  }

  // Ordina keyframes per timestamp
  const sorted = [...keyframes].sort((a, b) => getKeyframeTimestamp(a) - getKeyframeTimestamp(b));

  const first = sorted[0];
  const firstTime = getKeyframeTimestamp(first);
  const last = sorted[sorted.length - 1];
  const lastTime = getKeyframeTimestamp(last);

  const snapshotOf = (kf: Keyframe): InterpolationResult => {
    return {
      players: normalizeKeyframePlayers(kf.players),
      ball: {
        x: kf.ball.x,
        y: kf.ball.y,
        z: kf.ball.z ?? 0,
        carrierId: kf.ball.carrierId ?? null,
      },
      activeKeyframeA: kf,
      activeKeyframeB: kf,
      segmentProgress: 0,
    };
  };

  if (currentTime <= firstTime) {
    return snapshotOf(first);
  }

  if (currentTime >= lastTime) {
    return snapshotOf(last);
  }

  // Trova segmento [a, b]
  const idx = sorted.findIndex((k) => getKeyframeTimestamp(k) >= currentTime);
  const kfA = sorted[Math.max(0, idx - 1)];
  const kfB = sorted[idx];

  const tA = getKeyframeTimestamp(kfA);
  const tB = getKeyframeTimestamp(kfB);
  const segmentDuration = Math.max(1, tB - tA);
  const rawT = Math.max(0, Math.min(1, (currentTime - tA) / segmentDuration));
  const t = easeInOutCubic(rawT);
  const elapsedSegmentMs = currentTime - tA;

  const mapA = normalizeKeyframePlayers(kfA.players);
  const mapB = normalizeKeyframePlayers(kfB.players);

  // 1. Interpola i giocatori
  const players = new Map<string, { x: number; y: number; visible: boolean }>();

  // Azioni run attive in questo segmento
  const activeRuns = actions.filter(
    (a) => a.keyframeFrom === kfA.id && (a.type === 'run' || a.type === 'press')
  );

  for (const [id, pa] of mapA.entries()) {
    const pb = mapB.get(id) ?? pa;

    // Controlla se c'è una corsa con waypoint espliciti per questo giocatore
    const runAction = activeRuns.find((act) => act.playerId === id);
    if (runAction && runAction.waypoints && runAction.waypoints.length >= 2) {
      const runPos = playerRunPosition(runAction, elapsedSegmentMs);
      if (runPos) {
        players.set(id, {
          x: runPos.x,
          y: runPos.y,
          visible: pb.visible,
        });
        continue;
      }
    }

    players.set(id, {
      x: lerp(pa.x, pb.x, t),
      y: lerp(pa.y, pb.y, t),
      visible: pb.visible,
    });
  }

  // 2. Interpola la palla (con traiettoria balistica se c'è un'azione attiva)
  let ballX = lerp(kfA.ball.x, kfB.ball.x, t);
  let ballY = lerp(kfA.ball.y, kfB.ball.y, t);
  let ballZ = lerp(kfA.ball.z ?? 0, kfB.ball.z ?? 0, t);

  // Cerca un'azione con palla attiva nel segmento
  const ballAction = actions.find(
    (a) =>
      a.keyframeFrom === kfA.id &&
      [
        'pass_ground',
        'pass_lofted',
        'pass_through',
        'shot_ground',
        'shot_lofted',
        'shot_curl',
        'cross',
      ].includes(a.type)
  );

  if (ballAction) {
    const fromCoords = { x: kfA.ball.x, y: kfA.ball.y };
    let toCoords = { x: kfB.ball.x, y: kfB.ball.y };

    if (ballAction.targetCoords) {
      toCoords = ballAction.targetCoords;
    } else if (ballAction.targetPlayerId) {
      const targetInB = mapB.get(ballAction.targetPlayerId);
      if (targetInB) {
        toCoords = { x: targetInB.x, y: targetInB.y };
      }
    }

    const calculatedBall = ballPositionForAction(
      ballAction,
      fromCoords,
      toCoords,
      elapsedSegmentMs
    );
    ballX = calculatedBall.x;
    ballY = calculatedBall.y;
    ballZ = calculatedBall.z;
  }

  const carrierId = t >= 0.85 ? kfB.ball.carrierId ?? null : kfA.ball.carrierId ?? null;

  return {
    players,
    ball: {
      x: ballX,
      y: ballY,
      z: ballZ,
      carrierId,
    },
    activeKeyframeA: kfA,
    activeKeyframeB: kfB,
    segmentProgress: t,
  };
}

