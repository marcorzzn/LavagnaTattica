/**
 * Tipi condivisi dall'app: pedine, calibrazione del fermo immagine e lavagna.
 * Le coordinate del campo sono nel sistema 120 × 80 (non sono metri).
 */

/**
 * Una pedina sul campo.
 * Il ruolo è un'etichetta (vedi core/roles.ts): non porta statistiche né parametri fisici.
 */
export interface PlayerNode {
  id: string;
  number: number;
  archetypeId: number; // id del ruolo in core/roles.ts
  archetypeName: string; // nome del ruolo, mai un nome proprio
  codeLabel: string;
  team: 'home' | 'away';
  role: string;
  positionGroup: 'GK' | 'DEF' | 'MID' | 'FWD';
  x: number; // 0..120
  y: number; // 0..80
}

/**
 * Punto di calibrazione: posizione sul fermo immagine (u, v in [0, 1]) e sul campo (120 × 80).
 */
export interface CalibrationKeypoint {
  id: string;
  label: string;
  imageU: number; // 0..1, orizzontale sul fermo immagine
  imageV: number; // 0..1, verticale sul fermo immagine
  pitchX: number; // 0..120
  pitchY: number; // 0..80
}

// ============================================================================
// LAVAGNA: DISEGNO, PASSI E AZIONI DELL'ANIMAZIONE
// ============================================================================

export type ArrowType = 'pass' | 'run' | 'cross' | 'pressing' | 'transition';
export type ArrowStyle = 'straight' | 'curved' | 'dashed';
export type ZoneShape = 'rect' | 'circle' | 'polygon';
export type TacticalTheme =
  | 'grass_cream'
  | 'neon'
  | 'chalk'
  | 'blueprint'
  | 'minimal'
  | 'light';
export type GameFormat = '11v11' | '7v7' | '5v5';

export type FormationPreset =
  | '4-3-3'
  | '4-2-3-1'
  | '3-5-2'
  | '4-4-2'
  | '3-4-3'
  | '5-3-2'
  | '4-1-4-1'
  | '2-3-1'
  | '3-2-1'
  | '1-2-1'
  | '2-2';

export interface BoardArrow {
  id: string;
  type: ArrowType;
  style: ArrowStyle;
  fromX: number; // StatsBomb 0..120 o Opta 0..100
  fromY: number; // StatsBomb 0..80 o Opta 0..100
  toX: number;
  toY: number;
  controlX?: number;
  controlY?: number;
  color: string;
  strokeWidth: number;
  label?: string;
}

export interface BoardZone {
  id: string;
  shape: ZoneShape;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Array<{ x: number; y: number }>;
  color: string;
  opacity: number;
  label?: string;
}

export interface BoardPenStroke {
  id: string;
  tool: 'pen' | 'highlighter';
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
}

export interface BoardNote {
  id: string;
  x: number;
  y: number;
  text: string;
  tag?: string;
  color?: string;
}

export interface KeyframePlayer {
  id: string;
  x: number;
  y: number;
  visible?: boolean;
}

export interface KeyframeBall {
  x: number;
  y: number;
  z?: number;
  carrierId?: string | null;
}

export interface Keyframe {
  id: string;
  timestamp?: number;          // ms dall'inizio animazione
  timestampMs?: number;        // alias per compatibilità
  label?: string;
  players: KeyframePlayer[] | Record<string, { x: number; y: number; visible?: boolean }>;
  ball: KeyframeBall;
}

export type KeyframeState = Keyframe;

export type TacticalActionType =
  | 'pass_ground'
  | 'pass_lofted'
  | 'pass_through'
  | 'shot_ground'
  | 'shot_lofted'
  | 'shot_curl'
  | 'cross'
  | 'run'
  | 'press';

export type ContactSurface = 'flat' | 'collar' | 'trivela' | 'head' | 'inside';

export interface TacticalActionParams {
  speedKmh: number;         // 15-140 (riusa i preset di HITL)
  heightCm: number;         // 0-500
  curve: number;            // -1 (sinistra) .. +1 (destra)
  contact: ContactSurface;
  duration: number;         // ms
}

export interface TacticalAction {
  id: string;
  keyframeFrom: string;       // id keyframe di partenza
  keyframeTo: string;         // id keyframe di arrivo
  type: TacticalActionType;
  playerId: string;           // chi esegue
  targetPlayerId?: string;    // per passaggi
  targetCoords?: { x: number; y: number };  // per tiri
  waypoints?: { x: number; y: number }[];   // per run
  params: TacticalActionParams;
}

export interface AnimationPlaybackState {
  playing: boolean;
  currentTime: number;        // ms
  totalDuration: number;
  speed: 0.5 | 1 | 1.5 | 2;
  loop: boolean;
}
