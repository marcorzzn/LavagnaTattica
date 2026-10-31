/**
 * OpenCore — Modelli Dati Canonici, Astrazione Giocatori (Zero Nomi Propri),
 * Governance ADR-Math (Fondatore Marco Razzano) e Video Computer Vision Pipeline.
 */

export type TacticalPhase = 'build_up' | 'progression' | 'final_third' | 'high_press' | 'low_block' | 'transition';

export type OverlayType =
  | 'pitch_control'
  | 'xt_grid'
  | 'pass_network'
  | 'tda_gaps'
  | 'ghost_trajectory';

/**
 * Sezione 4.1 — Le 30 Tipologie Astratte di Giocatore (Nessun Nome Proprio)
 */
export interface PlayerArchetype {
  id: number;
  code: string;
  name: string;
  positionGroup: 'GK' | 'DEF' | 'MID' | 'FWD';
  keyAttributes: string[];
  expectedBehavior: string;
  defaultHeightCm: number;
  defaultFoot: 'Right' | 'Left' | 'Both';
  defaultStats: {
    passing: number;
    pressResistance: number;
    aerial: number;
    progressiveCarries: number;
    defensiveIndex: number;
    speed: number;
    composure: number;
  };
}

export interface PlayerNode {
  id: string;
  number: number;
  archetypeId: number;
  archetypeName: string; // Es. "Libero Moderno", "Centravanti Boa", "Portiere Sweeper" (MAI nomi propri)
  codeLabel: string; // Es. "HOME-06 (Libero Moderno)"
  team: 'home' | 'away';
  role: string;
  positionGroup: 'GK' | 'DEF' | 'MID' | 'FWD';
  x: number; // 0..120 (StatsBomb canonical)
  y: number; // 0..80 (StatsBomb canonical)
  vx: number; // m/s velocity X
  vy: number; // m/s velocity Y
  heightCm: number;
  foot: 'Right' | 'Left' | 'Both';
  confidence?: number; // CV tracking / data fusion confidence [0..1]
  sources?: Array<'video_cv' | 'manual_entry' | 'sensor_imu'>;
  attributes: {
    passing: number;
    pressResistance: number;
    aerial: number;
    progressiveCarries: number;
    defensiveIndex: number;
    speed?: number;
    composure?: number;
  };
  poseKeypoints?: Array<{ joint: string; x: number; y: number; conf: number }>;
}

export interface PassEdge {
  fromId: string;
  toId: string;
  weight: number;
  xtAdded: number;
  isAssist?: boolean;
}

export interface MatchEvent {
  id: string;
  minute: number;
  second: number;
  team: 'home' | 'away';
  playerId: string;
  playerName: string; // Sempre Tipologia Astratta, es. "Playmaker Basso #6"
  recipientId?: string;
  recipientName?: string;
  type: 'pass' | 'shot' | 'goal' | 'press' | 'recovery' | 'set_piece';
  subtype?: 'cross' | 'through_ball' | 'cutback' | 'layoff' | 'vertical' | 'corner' | 'free_kick' | 'penalty' | 'open_play';
  bodyPart?: 'Right Foot' | 'Left Foot' | 'Head' | 'Other';
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  xg?: number;
  xt?: number;
  epvDelta?: number;
  outcome: 'complete' | 'incomplete' | 'goal' | 'saved' | 'off_target' | 'blocked';
  phase: TacticalPhase;
  formationDeclared: string;
  formationInferred: string;
  sourceFile: string;
  sourceRow: number;
  inScope: boolean;
}

export interface TacticalState {
  matchId: string;
  title: string;
  competition: string; // Astratto: es. "Divisione Élite A — Corpus Tattico"
  season: string;
  date: string;
  homeTeam: string; // Astratto: es. "Squadra Casa (Sistema Posizionale)"
  awayTeam: string; // Astratto: es. "Squadra Ospite (Blocco Verticale)"
  homeFormation: string;
  awayFormation: string;
  formationSource: 'declared' | 'inferred';
  phase: TacticalPhase;
  minute: number;
  ballX: number;
  ballY: number;
  ballZ: number;
  players: PlayerNode[];
  passEdges: PassEdge[];
  events: MatchEvent[];
}

export interface TDABarcode {
  dimension: 0 | 1;
  id: string;
  birth: number;
  death: number;
  persistence: number;
  centerX?: number;
  centerY?: number;
  radius?: number;
  label: string;
}

export interface GhostTrajectory {
  playerId: string;
  playerName: string;
  currentX: number;
  currentY: number;
  optimalX: number;
  optimalY: number;
  path: Array<{ x: number; y: number }>;
  xtGain: number;
  pitchControlGain: number;
  rationale: string;
}

/**
 * Sezione 3.8 — Evaluation Engine Stile Chess.com (Top-3 Alternative Scartate + Best Move)
 */
export interface ChessStyleAlternative {
  rank: 1 | 2 | 3;
  classification: 'Best Move (!!)' | 'Good Alternative (!)' | 'Suboptimal (?)';
  actionType: 'Passaggio Filtrante' | 'Conduzione Progressiva' | 'Cambio Gioco Armonico' | 'Smarcamento Controfattuale';
  actorId: string;
  actorArchetype: string;
  targetId?: string;
  targetArchetype?: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  compositeScore: number; // Scala [-1.00 .. +1.00]
  deltaEpv: number;
  deltaXt: number;
  deltaPitchControlPct: number;
  deltaFiedler: number;
  successProbabilityPct: number;
  confidencePct: number;
  tacticalWhy: string;
}

export interface SixPillarsMetrics {
  // Pilastro I — Geometria proiettiva & Visione Computazionale
  homographyErrorPx: number;
  calibratedFovDeg: number;
  homographyMatrix: number[][]; // 3x3 H in PGL(3, R)
  kalmanPosUncertaintyM: number;
  // Pilastro II — Cinematica differenziale & Pitch Control
  homePitchControlPct: number;
  constructionZoneControlPct: number;
  zone14ControlPct: number;
  minTtiBallSec: number;
  teamWidthM: number;
  teamDepthM: number;
  metabolicPowerMeanWKg: number;
  pitchControlGrid: number[][];
  // Pilastro III — Processi stocastici (xT, EPV, VAEP, Hawkes)
  teamXtTotal: number;
  currentBallXt: number;
  epvValue: number;
  vaepOffensive: number;
  vaepDefensive: number;
  hawkesPressingIntensity: number;
  xtGrid: number[][];
  // Pilastro IV — Teoria spettrale dei grafi
  fiedlerValue: number;
  spectralRadius: number;
  effectiveResistanceMean: number;
  hodgeGradientPct: number;
  hodgeCurlPct: number;
  hodgeHarmonicPct: number;
  topCentralPlayer: { name: string; score: number };
  // Pilastro V — Topologia computazionale (TDA)
  betti0: number;
  betti1: number;
  maxH1Persistence: number;
  wassersteinDistanceToIdeal: number;
  tdaBarcodes: TDABarcode[];
  // Pilastro VI — Teoria dei giochi & Trasporto Ottimo
  nashPenaltyEquilibrium: {
    kickerLeftPct: number;
    kickerRightPct: number;
    keeperLeftPct: number;
    keeperRightPct: number;
    expectedGoalProb: number;
  };
  wassersteinBlockCostMeters: number;
  ghostTrajectory: GhostTrajectory;
  // Modulo aggiuntivo — Valutazione difensiva & Chess.com Evaluation Engine
  defensiveEffectivenessIndex: number;
  ballRecoveryProb5s: number;
  aerialVulnerabilityZone: number;
  chessAlternatives: ChessStyleAlternative[];
}

/**
 * Sezione 3.1, 3.2, 3.3 — Analisi Universale di Qualsiasi Video di Calcio
 */
export interface CalibrationKeypoint {
  id: string;
  label: string;
  imageU: number; // 0..1 normalized image X
  imageV: number; // 0..1 normalized image Y
  pitchX: number; // 0..120m canonical X
  pitchY: number; // 0..80m canonical Y
}

export interface VideoDetectionBox {
  trackId: string;
  team: 'home' | 'away' | 'referee' | 'ball';
  archetypeLabel: string;
  bbox: [number, number, number, number]; // [x, y, w, h] normalized 0..1
  pitchX: number;
  pitchY: number;
  speedMs: number;
  confidence: number;
  skeleton17?: Array<[number, number]>; // 17 keypoints normalized
}

export interface VideoFrameAnalysisResult {
  timestampSec: number;
  perspectiveType: 'Broadcast' | 'Tactical High / Drone' | 'Goal-Line / Set-Piece' | 'Smartphone / Amateur';
  homographyConfidencePct: number;
  reprojectionErrorPx: number;
  inferredHomeFormation: string;
  inferredAwayFormation: string;
  detectedPhase: TacticalPhase;
  detections: VideoDetectionBox[];
  tacticalSummary: string;
  bestCounterfactualMove: string;
}

/**
 * Sezione 0 — Governance & ADR-Math (Marco Razzano Autorità Matematica Suprema)
 */
export interface ADRMathRecord {
  id: string; // es. "ADR-Math-001"
  title: string;
  status: 'Approvato da Razzano' | 'In revisione MRB' | 'Proposto' | 'Rifiutato';
  date: string;
  proposer: string;
  mrbReviewers: string[];
  razzanoSignatureHash: string;
  context: string;
  decision: string;
  formulas: string;
  variables: Array<{ symbol: string; definition: string; unit: string; domain: string }>;
  assumptions: string[];
  limitations: string[];
  alternativesConsidered: Array<{ name: string; pros: string; cons: string }>;
  impactOnMetrics: string;
  validationPlan: string;
  rollbackPlan: string;
  references: string[];
}

export interface ToolCallTrace {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  resultSummary: string;
  rawResult: Record<string, unknown>;
  durationMs: number;
  pillar: string;
}

export interface CitedSource {
  id: string;
  title: string;
  authors: string;
  publication: string;
  year: number;
  category: 'Tactical' | 'Academic' | 'Data';
  excerpt: string;
  metricLinked: string;
}

export interface SuggestedModification {
  label: string;
  description: string;
  moves: Array<{ playerId: string; x: number; y: number; role?: string }>;
  expectedPitchControlDelta: string;
  expectedFiedlerDelta: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'orchestrator';
  timestamp: string;
  text: string;
  toolCalls?: ToolCallTrace[];
  citations?: CitedSource[];
  suggestion?: SuggestedModification;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  subtitle: string;
  category: 'Tattica' | 'Pilastri Matematici' | 'Machine Learning' | 'Dataset & Rigore';
  pillarTag: string;
  authors: string;
  year: string;
  readTime: string;
  summary: string;
  formula: string;
  tacticalExplanation: string;
  mathematicalFormalism: string;
  linkedPresetId: string;
  references: string[];
}

// ============================================================================
// MODULO STUDIO & LAVAGNA TATTICA (ANIMAZIONE, DISEGNO E KEYFRAME)
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
