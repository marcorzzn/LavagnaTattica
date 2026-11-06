import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Crosshair,
  CheckCircle2,
  Move,
  Navigation,
  Sliders,
  Image as ImageIcon,
  UserCheck,
  Activity,
  Eye,
  RotateCcw,
  ArrowUpRight,
  ShieldCheck,
  Tag as TagIcon,
  Plus,
  Trash2,
  Download,
  Upload,
  CircleDot,
  Compass,
  AlertTriangle,
  Layers,
  Sparkles,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowLeftRight,
  RefreshCw,
  Maximize2,
  Flag,
  Users,
} from 'lucide-react';
import {
  CalibrationKeypoint,
  PlayerNode,
  TacticalState,
  TacticalTag,
} from '../../core/types';
import {
  evaluateCarrierDecision,
  analyzeOffBallTeamMovements,
  evaluateDefensiveShape,
  detectTacticalPattern,
  PlayerMovementVector,
} from '../../engine/teamAnalysisEngine';
import {
  computePitchControlGrid,
  computePlanarHomographyDLT,
  projectImageToPitch,
  evaluateTacticalState,
} from '../../engine/mathEngine';
import {
  ContactExecutionStyle,
  ContactFootOrHead,
  DrawnActionCategory,
  evaluateHumanDrawnAction,
  detectTacticalFormation,
  invertHomography3x3,
  projectPitchToImage,
  VisualActionProperties,
} from '../../engine/humanInTheLoopEngine';
import {
  runFullMultiStageCVPipeline,
  estimateBiomechanicalPose17,
} from '../../engine/cvRolePipeline';
import { PLAYER_ARCHETYPES_30 } from '../../core/presets';
import { COACHING_STRATEGIES_CATALOG } from '../../core/tacticalStrategiesCatalog';
import { Benchmark12Dimensions } from '../benchmark/Benchmark12Dimensions';
import { TaggingPad } from './TaggingPad';
import { useStudioStore, DEFAULT_CALIBRATION_KEYPOINTS } from '../../stores/studioStore';
import { useTranslation } from 'react-i18next';

export type TacticalPhaseName =
  | 'Costruzione dal Basso'
  | 'Sviluppo Centrocampo'
  | 'Rifinitura / Trequarti'
  | 'Finalizzazione / Tiro'
  | 'Transizione Offensiva'
  | 'Ripiegamento Difensivo'
  | 'Pressing Alto'
  | 'Blocco Basso Difensivo';

export interface CalibrationZonePreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  keypoints: CalibrationKeypoint[];
}

export const CALIBRATION_ZONE_PRESETS: CalibrationZonePreset[] = [
  {
    id: 'full_pitch',
    name: 'Campo Intero / Broadcast',
    badge: '0–120m',
    description: 'Inquadratura panoramica grandangolare dell’intero campo 120×80m.',
    keypoints: [
      { id: 'kp-1', label: 'Angolo Sup SX (18m, 14m)', imageU: 0.16, imageV: 0.22, pitchX: 18, pitchY: 14 },
      { id: 'kp-2', label: 'Angolo Inf SX (18m, 66m)', imageU: 0.06, imageV: 0.88, pitchX: 18, pitchY: 66 },
      { id: 'kp-3', label: 'Angolo Sup DX (96m, 14m)', imageU: 0.84, imageV: 0.22, pitchX: 96, pitchY: 14 },
      { id: 'kp-4', label: 'Angolo Inf DX (96m, 66m)', imageU: 0.94, imageV: 0.88, pitchX: 96, pitchY: 66 },
    ],
  },
  {
    id: 'penalty_box_left',
    name: 'Area Rigore SX & Costruzione',
    badge: '0–40m',
    description: 'Inquadratura sull’area di rigore sinistra, uscita portiere e prima costruzione.',
    keypoints: [
      { id: 'kp-1', label: 'Linea Fondo SX Alto (2m, 16m)', imageU: 0.12, imageV: 0.20, pitchX: 2, pitchY: 16 },
      { id: 'kp-2', label: 'Linea Fondo SX Basso (2m, 64m)', imageU: 0.06, imageV: 0.88, pitchX: 2, pitchY: 64 },
      { id: 'kp-3', label: 'Trequarti Difesa SX Alto (38m, 16m)', imageU: 0.86, imageV: 0.20, pitchX: 38, pitchY: 16 },
      { id: 'kp-4', label: 'Trequarti Difesa SX Basso (38m, 64m)', imageU: 0.92, imageV: 0.88, pitchX: 38, pitchY: 64 },
    ],
  },
  {
    id: 'half_pitch_left',
    name: 'Metà Campo Sinistra',
    badge: '0–60m',
    description: 'Metà campo difensiva sinistra fino alla linea mediana di centrocampo a 60m.',
    keypoints: [
      { id: 'kp-1', label: 'Metà SX Fondo Alto (6m, 14m)', imageU: 0.14, imageV: 0.22, pitchX: 6, pitchY: 14 },
      { id: 'kp-2', label: 'Metà SX Fondo Basso (6m, 66m)', imageU: 0.06, imageV: 0.88, pitchX: 6, pitchY: 66 },
      { id: 'kp-3', label: 'Metà Campo Mediana Alto (58m, 14m)', imageU: 0.84, imageV: 0.22, pitchX: 58, pitchY: 14 },
      { id: 'kp-4', label: 'Metà Campo Mediana Basso (58m, 66m)', imageU: 0.94, imageV: 0.88, pitchX: 58, pitchY: 66 },
    ],
  },
  {
    id: 'midfield_center',
    name: 'Centrocampo Centrale',
    badge: '35–85m',
    description: 'Zona nevralgica centrale attorno al cerchio di centrocampo a 60m.',
    keypoints: [
      { id: 'kp-1', label: 'Centro SX Alto (36m, 14m)', imageU: 0.14, imageV: 0.22, pitchX: 36, pitchY: 14 },
      { id: 'kp-2', label: 'Centro SX Basso (36m, 66m)', imageU: 0.06, imageV: 0.88, pitchX: 36, pitchY: 66 },
      { id: 'kp-3', label: 'Centro DX Alto (84m, 14m)', imageU: 0.84, imageV: 0.22, pitchX: 84, pitchY: 14 },
      { id: 'kp-4', label: 'Centro DX Basso (84m, 66m)', imageU: 0.94, imageV: 0.88, pitchX: 84, pitchY: 66 },
    ],
  },
  {
    id: 'half_pitch_right',
    name: 'Metà Campo Destra',
    badge: '60–120m',
    description: 'Metà campo offensiva destra dalla linea mediana alla porta avversaria a 120m.',
    keypoints: [
      { id: 'kp-1', label: 'Metà Campo DX Alto (62m, 14m)', imageU: 0.14, imageV: 0.22, pitchX: 62, pitchY: 14 },
      { id: 'kp-2', label: 'Metà Campo DX Basso (62m, 66m)', imageU: 0.06, imageV: 0.88, pitchX: 62, pitchY: 66 },
      { id: 'kp-3', label: 'Fondo DX Alto (114m, 14m)', imageU: 0.84, imageV: 0.22, pitchX: 114, pitchY: 14 },
      { id: 'kp-4', label: 'Fondo DX Basso (114m, 66m)', imageU: 0.94, imageV: 0.88, pitchX: 114, pitchY: 66 },
    ],
  },
  {
    id: 'penalty_box_right',
    name: 'Area Rigore DX & Attacco',
    badge: '80–120m',
    description: 'Area di rigore destra d’attacco, tiri in porta, cross e finalizzazione.',
    keypoints: [
      { id: 'kp-1', label: 'Limite Area DX Alto (82m, 16m)', imageU: 0.12, imageV: 0.20, pitchX: 82, pitchY: 16 },
      { id: 'kp-2', label: 'Limite Area DX Basso (82m, 64m)', imageU: 0.06, imageV: 0.88, pitchX: 82, pitchY: 64 },
      { id: 'kp-3', label: 'Linea Fondo DX Alto (118m, 16m)', imageU: 0.86, imageV: 0.20, pitchX: 118, pitchY: 16 },
      { id: 'kp-4', label: 'Linea Fondo DX Basso (118m, 64m)', imageU: 0.92, imageV: 0.88, pitchX: 118, pitchY: 64 },
    ],
  },
];

interface UniversalVideoLabProps {
  tacticalState: TacticalState;
  onSyncTrackedPositionsToLab: (
    updatedPlayers: PlayerNode[],
    inferredHomeForm: string,
    inferredAwayForm: string
  ) => void;
  onOpenScenarioOnBoard?: (tag: TacticalTag) => void;
  onOpenGlossaryEntry?: (glossaryId: string) => void;
}

type InteractionToolMode =
  | 'drag_players'
  | 'place_ball'
  | 'draw_action'
  | 'draw_movement'
  | 'calibrate_homography';

type RightPanelTab = 'analisi' | 'squadra' | 'giocatori' | 'calibrazione' | 'pattern_maestri';

export const UniversalVideoLab: React.FC<UniversalVideoLabProps> = ({
  tacticalState,
  onSyncTrackedPositionsToLab,
  onOpenScenarioOnBoard,
  onOpenGlossaryEntry,
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'analysis' | 'certification'>('analysis');

  // STORE GLOBALE: Nessuna perdita di dati al cambio schermata
  const storePlayers = useStudioStore((s) => s.players);
  const storeBall = useStudioStore((s) => s.ball);
  const scenes = useStudioStore((s) => s.scenes);
  const activeSceneId = useStudioStore((s) => s.activeSceneId);
  const analyzingTeam = useStudioStore((s) => s.analyzingTeam);
  const attackDirection = useStudioStore((s) => s.attackDirection);
  const currentUploadedFrameUrl = useStudioStore((s) => s.currentUploadedFrameUrl);
  const currentUploadedMediaName = useStudioStore((s) => s.currentUploadedMediaName);
  const currentKeypoints = useStudioStore((s) => s.currentKeypoints);
  const matchContextNote = useStudioStore((s) => s.matchContextNote);

  const addPlayer = useStudioStore((s) => s.addPlayer);
  const removePlayer = useStudioStore((s) => s.removePlayer);
  const updatePlayer = useStudioStore((s) => s.updatePlayer);
  const movePlayer = useStudioStore((s) => s.movePlayer);
  const moveBall = useStudioStore((s) => s.moveBall);
  const setAnalyzingTeam = useStudioStore((s) => s.setAnalyzingTeam);
  const setAttackDirection = useStudioStore((s) => s.setAttackDirection);
  const setUploadedFrame = useStudioStore((s) => s.setUploadedFrame);
  const setKeypoints = useStudioStore((s) => s.setKeypoints);
  const setMatchContextNote = useStudioStore((s) => s.setMatchContextNote);
  const addScene = useStudioStore((s) => s.addScene);
  const switchScene = useStudioStore((s) => s.switchScene);
  const deleteScene = useStudioStore((s) => s.deleteScene);
  const exportProjectJson = useStudioStore((s) => s.exportProjectJson);
  const importProjectJson = useStudioStore((s) => s.importProjectJson);

  // Formazioni Rilevate Automaticamente dalle Posizioni Reali
  const homeDetected = useMemo(() => detectTacticalFormation(storePlayers, 'home'), [storePlayers]);
  const awayDetected = useMemo(() => detectTacticalFormation(storePlayers, 'away'), [storePlayers]);

  // Stato Media / Video
  const [mediaSourceType, setMediaSourceType] = useState<
    'synthetic_frame' | 'uploaded_image' | 'uploaded_video'
  >(currentUploadedFrameUrl ? 'uploaded_image' : 'synthetic_frame');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [perspectiveType, setPerspectiveType] = useState<
    'Broadcast' | 'Tactical High / Drone' | 'Goal-Line / Set-Piece'
  >('Broadcast');

  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(74.5);

  // Navigazione e Strumenti
  const [rightTab, setRightTab] = useState<RightPanelTab>('analisi');
  const [toolMode, setToolMode] = useState<InteractionToolMode>('drag_players');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('home-10');
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
  const [selectedMoveRank, setSelectedMoveRank] = useState<number | 'custom'>('custom');

  // Layer Visivi Opzionali
  const [showPerspectiveHeatmap, setShowPerspectiveHeatmap] = useState<boolean>(true);
  const [showTacticalCorridors, setShowTacticalCorridors] = useState<boolean>(false);
  const [showOffsideLine, setShowOffsideLine] = useState<boolean>(true);
  const [showProjectedFieldLines, setShowProjectedFieldLines] = useState<boolean>(true);
  const [showPose17, setShowPose17] = useState<boolean>(false);
  const [showHomographyGrid, setShowHomographyGrid] = useState<boolean>(false);
  const [showAllLabels, setShowAllLabels] = useState<boolean>(false);

  // Fuorigioco Dinamico / Manuale
  const [offsideMode, setOffsideMode] = useState<'auto' | 'manual'>('auto');
  const [manualOffsideX, setManualOffsideX] = useState<number | null>(null);

  // Fase Tattica Attiva
  const [tacticalPhase, setTacticalPhase] = useState<TacticalPhaseName>('Sviluppo Centrocampo');

  // Rimozione Pedina con Long-Press o Hover '✕'
  const [heldPlayerId, setHeldPlayerId] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Entità in Drag & Drop sul Canvas
  const [draggingEntity, setDraggingEntity] = useState<
    | { type: 'player'; id: string }
    | { type: 'ball' }
    | { type: 'kp'; id: string }
    | { type: 'arrow_from' }
    | { type: 'arrow_to' }
    | { type: 'movement_target'; id: string }
    | { type: 'offside_line' }
    | null
  >(null);

  // Movimenti Senza Palla dei Compagni & Frecce Tattiche
  const [customMovements, setCustomMovements] = useState<Record<string, PlayerMovementVector>>({});
  const [showTeamArrows, setShowTeamArrows] = useState<boolean>(true);

  // Simulazione Dinamica Interattiva a 60 FPS
  const [simProgress, setSimProgress] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Selezione Manuale vs Rilevamento Automatico (Formazioni & Pattern)
  const [manualFormationHome, setManualFormationHome] = useState<string | null>(null);
  const [manualFormationAway, setManualFormationAway] = useState<string | null>(null);
  const [manualPattern, setManualPattern] = useState<string | null>(null);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState<boolean>(false);

  // Parametri della Traiettoria Tracciata
  const [actionProps, setActionProps] = useState<VisualActionProperties>({
    actionCategory: 'Passaggio Filtrante',
    ballSpeedKmh: 64,
    ballHeightCm: 10,
    bodyPart: 'Destro',
    executionStyle: 'Di Prima',
    fromX: storeBall.x || 60,
    fromY: storeBall.y || 46,
    toX: 84,
    toY: 36,
  });

  const [syncedBadge, setSyncedBadge] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const synthCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlaySvgRef = useRef<SVGSVGElement | null>(null);
  const fileImportInputRef = useRef<HTMLInputElement | null>(null);

  // Calcolo Omografia H e Inversa H^{-1}
  const { H, reprojectionErrorPx } = useMemo(
    () => computePlanarHomographyDLT(currentKeypoints),
    [currentKeypoints]
  );
  const HInv = useMemo(() => invertHomography3x3(H), [H]);

  // Portatore di Palla Deterministico (Giocatore più vicino alla palla)
  const ballCarrier = useMemo(() => {
    let closest: PlayerNode | null = null;
    let minDist = Infinity;
    for (const p of storePlayers) {
      const d = Math.hypot(p.x - storeBall.x, p.y - storeBall.y);
      if (d < minDist) {
        minDist = d;
        closest = p;
      }
    }
    return minDist <= 3.8 ? closest : null;
  }, [storePlayers, storeBall.x, storeBall.y]);

  const effectivePossessionTeam = ballCarrier ? ballCarrier.team : analyzingTeam;

  // Stato Tattico per il Motore Matematico
  const liveState: TacticalState = useMemo(
    () => ({
      ...tacticalState,
      homeFormation: homeDetected.formation,
      awayFormation: awayDetected.formation,
      ballX: storeBall.x,
      ballY: storeBall.y,
      players: storePlayers,
    }),
    [
      tacticalState,
      homeDetected.formation,
      awayDetected.formation,
      storeBall.x,
      storeBall.y,
      storePlayers,
    ]
  );

  // Proprietà di Azione Complete per la Valutazione
  const liveActionProps: VisualActionProperties = useMemo(
    () => ({
      ...actionProps,
      fromX: storeBall.x,
      fromY: storeBall.y,
      analyzingTeam,
      attackDirection,
      manualOffsideX: offsideMode === 'manual' ? manualOffsideX : null,
    }),
    [actionProps, storeBall.x, storeBall.y, analyzingTeam, attackDirection, offsideMode, manualOffsideX]
  );

  // Calcolo Coordinata X Effettiva della Linea di Fuorigioco (Auto o Manuale)
  const effectiveOffsideX = useMemo(() => {
    const isActorHome = analyzingTeam === 'home';
    const homeAttacksRight = (attackDirection || 'right') === 'right';
    const actorAttacksRight = isActorHome ? homeAttacksRight : !homeAttacksRight;
    const targetX = actorAttacksRight ? 120 : 0;

    const opps = storePlayers.filter((p) => p.team !== analyzingTeam);
    const sortedOpps = opps
      .slice()
      .sort((a, b) => Math.abs(a.x - targetX) - Math.abs(b.x - targetX));
    const secondLastDef = sortedOpps[1] || sortedOpps[0];
    const autoX = secondLastDef ? secondLastDef.x : (actorAttacksRight ? 90 : 30);

    return offsideMode === 'manual' && manualOffsideX !== null ? manualOffsideX : autoX;
  }, [analyzingTeam, attackDirection, storePlayers, offsideMode, manualOffsideX]);

  // Calcolo Valutazione Azione (Fisica del Tiro, Fuorigioco, Portiere, Cover Shadow, Pressing)
  const actionEvaluation = useMemo(
    () => evaluateHumanDrawnAction(liveState, liveActionProps),
    [liveState, liveActionProps]
  );

  // 1. Valutazione Scelta del Portatore (Errore grave su passaggio a rosso, spazzata se pressato, ecc.)
  const carrierDecision = useMemo(() => {
    return evaluateCarrierDecision(
      storeBall,
      { x: actionProps.toX, y: actionProps.toY },
      ballCarrier || undefined,
      storePlayers,
      analyzingTeam,
      attackDirection,
      effectiveOffsideX
    );
  }, [storeBall, actionProps.toX, actionProps.toY, ballCarrier, storePlayers, analyzingTeam, attackDirection, effectiveOffsideX]);

  // 2. Analisi Movimenti Senza Palla dei Compagni di Squadra
  const teamMovementsResult = useMemo(() => {
    return analyzeOffBallTeamMovements(
      storePlayers,
      storeBall,
      ballCarrier || undefined,
      analyzingTeam,
      attackDirection,
      effectiveOffsideX,
      customMovements
    );
  }, [storePlayers, storeBall, ballCarrier, analyzingTeam, attackDirection, effectiveOffsideX, customMovements]);

  // 3. Assetto della Squadra Difendente
  const defensiveShape = useMemo(() => {
    const defTeam = analyzingTeam === 'home' ? 'away' : 'home';
    const defPlayers = storePlayers.filter((p) => p.team === defTeam);
    return evaluateDefensiveShape(defPlayers, storeBall, attackDirection);
  }, [storePlayers, analyzingTeam, storeBall, attackDirection]);

  // 4. Pattern Riconosciuto Dinamicamente
  const detectedPattern = useMemo(() => {
    return detectTacticalPattern(storePlayers, storeBall, analyzingTeam, attackDirection);
  }, [storePlayers, storeBall, analyzingTeam, attackDirection]);

  // 5. Loop di Simulazione a 60 FPS
  useEffect(() => {
    if (!isSimulating) return;
    let animId: number;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setSimProgress((prev) => {
        const next = prev + dt / 2.5; // durata 2.5s
        if (next >= 1) {
          setIsSimulating(false);
          return 1;
        }
        return next;
      });
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating]);

  // Posizioni Efficaci in Simulazione
  const effectiveBallPosition = useMemo(() => {
    if (simProgress <= 0) return { x: storeBall.x, y: storeBall.y, z: 0 };
    const t = simProgress;
    const bx = actionProps.fromX + (actionProps.toX - actionProps.fromX) * t;
    const by = actionProps.fromY + (actionProps.toY - actionProps.fromY) * t;
    const maxHeightM = (actionProps.ballHeightCm || 0) / 100;
    const bz = Math.max(0, 4 * maxHeightM * t * (1 - t));
    return { x: bx, y: by, z: bz };
  }, [simProgress, storeBall.x, storeBall.y, actionProps]);

  const effectivePlayerPositions = useMemo(() => {
    if (simProgress <= 0) return storePlayers;
    const t = simProgress;
    const smMap: Record<string, PlayerMovementVector> = {};
    for (const sm of teamMovementsResult.suggestedMovements) {
      smMap[sm.playerId] = sm;
    }
    return storePlayers.map((p) => {
      const mv = customMovements[p.id] || smMap[p.id];
      if (!mv) return p;
      return {
        ...p,
        x: mv.startX + (mv.targetX - mv.startX) * t,
        y: mv.startY + (mv.targetY - mv.startY) * t,
      };
    });
  }, [simProgress, storePlayers, customMovements, teamMovementsResult.suggestedMovements]);

  // Calcolo Pitch Control Spearman in tempo reale
  const pitchControlData = useMemo(
    () => computePitchControlGrid(storePlayers, storeBall.x, storeBall.y),
    [storePlayers, storeBall.x, storeBall.y]
  );

  const { metrics: liveMetrics } = useMemo(
    () => evaluateTacticalState(liveState),
    [liveState]
  );

  const pipelineDiag = useMemo(
    () =>
      runFullMultiStageCVPipeline(
        storePlayers,
        currentKeypoints,
        storeBall.x,
        storeBall.y,
        currentTimeSec
      ),
    [storePlayers, currentKeypoints, storeBall.x, storeBall.y, Math.floor(currentTimeSec)]
  );

  // Disegno Frame di Riferimento Sintetico
  useEffect(() => {
    const canvas = synthCanvasRef.current;
    if (!canvas || mediaSourceType !== 'synthetic_frame') return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawBroadcastReferenceFrame(
        ctx,
        canvas.width,
        canvas.height,
        perspectiveType,
        currentKeypoints
      );
    }
  }, [mediaSourceType, perspectiveType, currentKeypoints]);

  // Caricamento Frame / Video da Utente
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);

    if (file.type.startsWith('image/')) {
      setUploadedFrame(url, file.name);
      setMediaSourceType('uploaded_image');
    } else {
      setUploadedVideoUrl(url);
      setUploadedFrame(url, file.name);
      setMediaSourceType('uploaded_video');
      setIsPlayingVideo(false);
    }
  };

  const getNormalizedUvFromEvent = (
    e: React.MouseEvent<SVGSVGElement>
  ): { u: number; v: number } => {
    if (!overlaySvgRef.current) return { u: 0.5, v: 0.5 };
    const rect = overlaySvgRef.current.getBoundingClientRect();
    const u = Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0.01, Math.min(0.99, (e.clientY - rect.top) / rect.height));
    return { u: Number(u.toFixed(4)), v: Number(v.toFixed(4)) };
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const { u, v } = getNormalizedUvFromEvent(e);
    const pt = projectImageToPitch(u, v, H);

    if (toolMode === 'place_ball') {
      moveBall(Number(pt.x.toFixed(1)), Number(pt.y.toFixed(1)));
      setActionProps((prev) => ({ ...prev, fromX: pt.x, fromY: pt.y }));
      return;
    }

    if (toolMode === 'draw_action' && !draggingEntity) {
      setSelectedMoveRank('custom');
      setActionProps((prev) => ({
        ...prev,
        fromX: storeBall.x,
        fromY: storeBall.y,
        toX: pt.x,
        toY: pt.y,
      }));
      setDraggingEntity({ type: 'arrow_to' });
    }

    if (toolMode === 'draw_movement' && !draggingEntity) {
      let closestP: PlayerNode | null = null;
      let minD = Infinity;
      for (const p of storePlayers) {
        const d = Math.hypot(p.x - pt.x, p.y - pt.y);
        if (d < minD) {
          minD = d;
          closestP = p;
        }
      }
      if (closestP && minD <= 8.0) {
        setDraggingEntity({ type: 'movement_target', id: closestP.id });
        setCustomMovements((prev) => ({
          ...prev,
          [closestP!.id]: {
            playerId: closestP!.id,
            startX: closestP!.x,
            startY: closestP!.y,
            targetX: pt.x,
            targetY: pt.y,
            speedKmh: 24,
            actionType: 'depth_run',
            label: 'Corsa Senza Palla',
          },
        }));
      }
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingEntity) return;
    const { u, v } = getNormalizedUvFromEvent(e);

    if (draggingEntity.type === 'kp') {
      setKeypoints(
        currentKeypoints.map((kp) =>
          kp.id === draggingEntity.id ? { ...kp, imageU: u, imageV: v } : kp
        )
      );
      return;
    }

    const pitchPt = projectImageToPitch(u, v, H);
    const clampedX = Number(Math.max(1, Math.min(119, pitchPt.x)).toFixed(1));
    const clampedY = Number(Math.max(1, Math.min(79, pitchPt.y)).toFixed(1));

    if (draggingEntity.type === 'player') {
      movePlayer(draggingEntity.id, clampedX, clampedY);
      setSyncedBadge(false);
    } else if (draggingEntity.type === 'ball') {
      moveBall(clampedX, clampedY);
      setActionProps((prev) => ({ ...prev, fromX: clampedX, fromY: clampedY }));
    } else if (draggingEntity.type === 'arrow_from') {
      moveBall(clampedX, clampedY);
      setActionProps((prev) => ({ ...prev, fromX: clampedX, fromY: clampedY }));
    } else if (draggingEntity.type === 'arrow_to') {
      setSelectedMoveRank('custom');
      setActionProps((prev) => ({ ...prev, toX: clampedX, toY: clampedY }));
    } else if (draggingEntity.type === 'offside_line') {
      const clampedOffX = Number(Math.max(5, Math.min(115, pitchPt.x)).toFixed(1));
      setManualOffsideX(clampedOffX);
      setOffsideMode('manual');
    } else if (draggingEntity.type === 'movement_target') {
      const p = storePlayers.find((pl) => pl.id === draggingEntity.id);
      if (p) {
        setCustomMovements((prev) => ({
          ...prev,
          [p.id]: {
            playerId: p.id,
            startX: p.x,
            startY: p.y,
            targetX: clampedX,
            targetY: clampedY,
            speedKmh: 24,
            actionType: 'depth_run',
            label: 'Corsa Senza Palla',
          },
        }));
      }
    }
  };

  const handleSvgMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (draggingEntity) {
      setDraggingEntity(null);
      onSyncTrackedPositionsToLab(storePlayers, homeDetected.formation, awayDetected.formation);
    }
  };

  const selectedPlayer = useMemo(
    () => storePlayers.find((p) => p.id === selectedPlayerId) || storePlayers[0] || null,
    [storePlayers, selectedPlayerId]
  );

  const handleChangeSelectedArchetype = (newArchId: number) => {
    const arch = PLAYER_ARCHETYPES_30.find((a) => a.id === newArchId);
    if (!arch || !selectedPlayer) return;
    updatePlayer(selectedPlayer.id, {
      archetypeId: arch.id,
      archetypeName: arch.name,
      role: arch.name,
      positionGroup: arch.positionGroup,
      heightCm: arch.defaultHeightCm,
      foot: arch.defaultFoot,
      attributes: { ...arch.defaultStats },
    });
  };

  // Gestione Calibrazione & Spostamento/Zoom del Campo sul Frame
  const handlePanField = (dx: number, dy: number) => {
    const updated = currentKeypoints.map((kp) => ({
      ...kp,
      pitchX: Number(Math.max(0, Math.min(120, kp.pitchX + dx)).toFixed(1)),
      pitchY: Number(Math.max(0, Math.min(80, kp.pitchY + dy)).toFixed(1)),
    }));
    setKeypoints(updated);
  };

  const handleZoomField = (factor: number) => {
    const meanX = currentKeypoints.reduce((acc, k) => acc + k.pitchX, 0) / currentKeypoints.length;
    const meanY = currentKeypoints.reduce((acc, k) => acc + k.pitchY, 0) / currentKeypoints.length;

    const updated = currentKeypoints.map((kp) => ({
      ...kp,
      pitchX: Number(Math.max(0, Math.min(120, meanX + (kp.pitchX - meanX) * factor)).toFixed(1)),
      pitchY: Number(Math.max(0, Math.min(80, meanY + (kp.pitchY - meanY) * factor)).toFixed(1)),
    }));
    setKeypoints(updated);
  };

  const handleResetKeypoints = () => {
    setKeypoints(DEFAULT_CALIBRATION_KEYPOINTS);
  };

  const handleApplyZonePreset = (preset: CalibrationZonePreset) => {
    setKeypoints(preset.keypoints);
  };

  const handleUpdateKeypointCoord = (
    id: string,
    field: 'pitchX' | 'pitchY',
    delta: number
  ) => {
    const maxVal = field === 'pitchX' ? 120 : 80;
    const updated = currentKeypoints.map((kp) =>
      kp.id === id
        ? {
            ...kp,
            [field]: Number(Math.max(0, Math.min(maxVal, kp[field] + delta)).toFixed(1)),
          }
        : kp
    );
    setKeypoints(updated);
  };

  // Calcolo Percentuale Barra Chess.com Bicolore (Blu vs Rosso)
  const evalScore = actionEvaluation.compositeScore;
  const homeAdvantage = analyzingTeam === 'home' ? evalScore : -evalScore;
  // Mappa da -1.0 a +1.0 in percentuale (da 10% a 90%)
  const bluePercent = Math.max(8, Math.min(92, Math.round(((homeAdvantage + 1) / 2) * 100)));
  const awayAdvantage = -homeAdvantage;

  // Coordinate UV per la Traiettoria
  const arrowStartUv = useMemo(
    () => projectPitchToImage(storeBall.x, storeBall.y, HInv),
    [storeBall.x, storeBall.y, HInv]
  );
  const arrowEndUv = useMemo(
    () => projectPitchToImage(actionProps.toX, actionProps.toY, HInv),
    [actionProps.toX, actionProps.toY, HInv]
  );

  // Ricevente della freccia
  const targetReceiverNode = useMemo(
    () =>
      storePlayers
        .filter((p) => p.team === actionEvaluation.actorTeam)
        .sort(
          (a, b) =>
            Math.hypot(a.x - actionProps.toX, a.y - actionProps.toY) -
            Math.hypot(b.x - actionProps.toX, b.y - actionProps.toY)
        )[0],
    [storePlayers, actionProps.toX, actionProps.toY, actionEvaluation.actorTeam]
  );

  // Gestione Export / Import Progetto
  const handleExportProjectClick = () => {
    const jsonStr = exportProjectJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progetto_lavagnatattica_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importProjectJson(content);
        if (ok) {
          alert('Progetto importato con successo! Tutti i frame e le pedine sono stati ripristinati.');
        } else {
          alert('Errore: formato del file di progetto non valido.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const homePlayersList = useMemo(() => storePlayers.filter((p) => p.team === 'home'), [storePlayers]);
  const awayPlayersList = useMemo(() => storePlayers.filter((p) => p.team === 'away'), [storePlayers]);

  return (
    <div className="space-y-2 flex flex-col h-full min-h-0 select-none">
      {/* MODAL CERTIFICAZIONE BENCHMARK 12D */}
      {showBenchmarkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F0F14] border border-zinc-700 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-[#111118]">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Certificazione Benchmark (12 Dimensioni &amp; IC di Wilson al 95%)
              </span>
              <button
                onClick={() => setShowBenchmarkModal(false)}
                className="px-2.5 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
              >
                Chiudi
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <Benchmark12Dimensions state={liveState} metrics={liveMetrics} />
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER COMPATTO: DOSSIER FRAME (SINISTRA) + AZIONI DI PROGETTO & BENCHMARK (DESTRA) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#0F0F14] border border-zinc-800/80 text-xs shrink-0">
        {/* Dossier Scene */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="font-semibold text-zinc-400 flex items-center gap-1 shrink-0 text-[11px]">
            <Layers className="w-3.5 h-3.5 text-[#00E5FF]" />
            Dossier:
          </span>
          {scenes.map((sc, idx) => (
            <div key={sc.id} className="flex items-center shrink-0">
              <button
                onClick={() => switchScene(sc.id)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 ${
                  activeSceneId === sc.id
                    ? 'bg-[#00E5FF] text-zinc-950 font-bold shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                <span>{sc.name || `Frame ${idx + 1}`}</span>
              </button>
              {scenes.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteScene(sc.id);
                  }}
                  className="ml-0.5 p-0.5 text-zinc-600 hover:text-red-400 transition-colors"
                  title="Elimina questo frame dal progetto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addScene()}
            className="px-2 py-0.5 text-xs rounded-lg border border-dashed border-zinc-700 hover:border-[#00E5FF] text-zinc-400 hover:text-[#00E5FF] flex items-center gap-1 shrink-0 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Nuovo
          </button>
        </div>

        {/* Azioni Progetto, Caricamento Frame e Benchmark */}
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="px-2.5 py-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-lg cursor-pointer transition-colors flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
            Carica Frame
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              onSyncTrackedPositionsToLab(storePlayers, homeDetected.formation, awayDetected.formation);
              setSyncedBadge(true);
              setTimeout(() => setSyncedBadge(false), 2000);
            }}
            className="px-2.5 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg transition-colors flex items-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {syncedBadge ? 'Sincronizzato' : 'Salva'}
          </button>

          <button
            onClick={() => setShowBenchmarkModal(true)}
            className="px-2.5 py-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/40 rounded-lg transition-colors flex items-center gap-1"
            title="Visualizza certificazione rigorosa sui 26 gol e intervalli di Wilson al 95%"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            Benchmark (12D)
          </button>

          <button
            onClick={handleExportProjectClick}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center gap-1 transition-colors"
            title="Esporta progetto JSON"
          >
            <Download className="w-3.5 h-3.5 text-[#00E5FF]" />
            Esporta
          </button>

          <label className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center gap-1 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            Importa
            <input
              ref={fileImportInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 2. BARRA CONTESTUALE UNIFICATA: TATTICA, POSSESSO, STRUMENTI CANVAS E OVERLAY */}
      <div className="px-3 py-1.5 rounded-xl bg-[#0F0F14] border border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        {/* Blocco Sinistro: Ruoli Tattici, Direzione, Fase, Possesso, Fuorigioco */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Squadra che Attacca */}
          <div className="flex items-center gap-0.5 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => setAnalyzingTeam('home')}
              className={`px-2 py-0.5 rounded font-semibold text-[11px] transition-all flex items-center gap-1 ${
                analyzingTeam === 'home'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Squadra Blu in attacco"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
              Blu ATTACCA ({homePlayersList.length})
            </button>
            <button
              onClick={() => setAnalyzingTeam(analyzingTeam === 'home' ? 'away' : 'home')}
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
              title="Inverti ruoli attacco / difesa"
            >
              <ArrowLeftRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setAnalyzingTeam('away')}
              className={`px-2 py-0.5 rounded font-semibold text-[11px] transition-all flex items-center gap-1 ${
                analyzingTeam === 'away'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Squadra Rossa in attacco"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-300" />
              Rossi ATTACCA ({awayPlayersList.length})
            </button>
          </div>

          {/* Direzione */}
          <button
            onClick={() => setAttackDirection(attackDirection === 'right' ? 'left' : 'right')}
            className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 flex items-center gap-1 font-mono text-[11px]"
            title="Inverti direzione porta attaccata"
          >
            <Compass className="w-3 h-3 text-amber-400" />
            <span>
              {attackDirection === 'right'
                ? `${analyzingTeam === 'home' ? 'Blu' : 'Rossi'} -> (120m)`
                : `<- ${analyzingTeam === 'home' ? 'Blu' : 'Rossi'} (0m)`}
            </span>
          </button>

          {/* Fase Tattica */}
          <div className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800 text-[11px]">
            <span className="text-zinc-400">Fase:</span>
            <select
              value={tacticalPhase}
              onChange={(e) => setTacticalPhase(e.target.value as TacticalPhaseName)}
              className="bg-transparent text-[11px] font-semibold text-emerald-400 focus:outline-none cursor-pointer"
            >
              <option value="Costruzione dal Basso" className="bg-zinc-900 text-zinc-200">Costruzione dal Basso</option>
              <option value="Sviluppo Centrocampo" className="bg-zinc-900 text-zinc-200">Sviluppo Centrocampo</option>
              <option value="Rifinitura / Trequarti" className="bg-zinc-900 text-zinc-200">Rifinitura / Trequarti</option>
              <option value="Finalizzazione / Tiro" className="bg-zinc-900 text-zinc-200">Finalizzazione / Tiro</option>
              <option value="Transizione Offensiva" className="bg-zinc-900 text-zinc-200">Transizione Offensiva</option>
              <option value="Ripiegamento Difensivo" className="bg-zinc-900 text-zinc-200">Ripiegamento Difensivo</option>
              <option value="Pressing Alto" className="bg-zinc-900 text-zinc-200">Pressing Alto</option>
              <option value="Blocco Basso Difensivo" className="bg-zinc-900 text-zinc-200">Blocco Basso Difensivo</option>
            </select>
          </div>

          {/* Possesso Palla */}
          <span
            className={`font-semibold px-2 py-0.5 rounded-lg font-mono text-[11px] flex items-center gap-1 ${
              ballCarrier
                ? ballCarrier.team === 'home'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-zinc-800/60 text-zinc-300 border border-zinc-700/60'
            }`}
            title={ballCarrier ? `Portatore: #${ballCarrier.number} (${ballCarrier.archetypeName})` : 'Palla libera'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${ballCarrier ? (ballCarrier.team === 'home' ? 'bg-blue-400' : 'bg-red-400') : 'bg-amber-400'}`} />
            {ballCarrier ? `${ballCarrier.team === 'home' ? 'Blu' : 'Rossi'} #${ballCarrier.number}` : 'Palla libera'}
          </span>

          {/* Fuorigioco */}
          <div className="flex items-center gap-1">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border flex items-center gap-1 ${
                carrierDecision.actionType === 'pass' && carrierDecision.title.includes('Fuorigioco')
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              <Flag className="w-3 h-3" />
              {carrierDecision.actionType === 'pass' && carrierDecision.title.includes('Fuorigioco') ? 'OFFSIDE' : 'REGOLARE'} ({effectiveOffsideX.toFixed(0)}m) [{offsideMode === 'manual' ? 'MANUALE' : 'AUTO'}]
            </span>
            {offsideMode === 'manual' && (
              <button
                onClick={() => {
                  setOffsideMode('auto');
                  setManualOffsideX(null);
                }}
                className="p-0.5 text-zinc-400 hover:text-amber-400 rounded"
                title="Ripristina fuorigioco automatico"
              >
                <RefreshCw className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Blocco Destro: Strumenti di Interazione e Overlays */}
        <div className="flex flex-wrap items-center gap-1">
          <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 gap-0.5">
            <button
              onClick={() => setToolMode('drag_players')}
              className={`px-2 py-0.5 text-[11px] font-medium rounded flex items-center gap-1 ${
                toolMode === 'drag_players' ? 'bg-blue-600 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Sposta le pedine sul campo"
            >
              <Move className="w-3 h-3" />
              Sposta
            </button>
            <button
              onClick={() => setToolMode('place_ball')}
              className={`px-2 py-0.5 text-[11px] font-medium rounded flex items-center gap-1 ${
                toolMode === 'place_ball' ? 'bg-amber-400 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Posiziona la palla"
            >
              <CircleDot className="w-3 h-3" />
              Palla
            </button>
            <button
              onClick={() => setToolMode('draw_action')}
              className={`px-2 py-0.5 text-[11px] font-medium rounded flex items-center gap-1 ${
                toolMode === 'draw_action' ? 'bg-amber-400 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Traccia la traiettoria di passaggio o tiro"
            >
              <Navigation className="w-3 h-3" />
              Freccia Palla
            </button>
            <button
              onClick={() => setToolMode('draw_movement')}
              className={`px-2 py-0.5 text-[11px] font-medium rounded flex items-center gap-1 ${
                toolMode === 'draw_movement' ? 'bg-cyan-400 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Traccia lo scatto / corsa senza palla di un compagno o marcatore"
            >
              <ArrowUpRight className="w-3 h-3" />
              Scatto Compagno
            </button>
          </div>

          {/* Aggiunta Pedine */}
          <button
            onClick={() => {
              const p = addPlayer('home');
              setSelectedPlayerId(p.id);
            }}
            disabled={homePlayersList.length >= 11}
            className="px-2 py-0.5 text-[11px] font-semibold rounded bg-blue-950/70 hover:bg-blue-900 text-blue-300 border border-blue-800/80 flex items-center gap-0.5 disabled:opacity-40"
          >
            <Plus className="w-2.5 h-2.5" />
            Blu ({homePlayersList.length}/11)
          </button>
          <button
            onClick={() => {
              const p = addPlayer('away');
              setSelectedPlayerId(p.id);
            }}
            disabled={awayPlayersList.length >= 11}
            className="px-2 py-0.5 text-[11px] font-semibold rounded bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800/80 flex items-center gap-0.5 disabled:opacity-40"
          >
            <Plus className="w-2.5 h-2.5" />
            Rosso ({awayPlayersList.length}/11)
          </button>

          {/* Overlays */}
          <button
            onClick={() => setShowProjectedFieldLines(!showProjectedFieldLines)}
            className={`px-1.5 py-0.5 text-[10px] rounded border ${
              showProjectedFieldLines ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
            title="Linee campo canoniche proiettate"
          >
            Linee
          </button>
          <button
            onClick={() => setShowTacticalCorridors(!showTacticalCorridors)}
            className={`px-1.5 py-0.5 text-[10px] rounded border ${
              showTacticalCorridors ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
            title="5 Corridoi verticali"
          >
            5 Corridoi
          </button>
          <button
            onClick={() => setShowOffsideLine(!showOffsideLine)}
            className={`px-1.5 py-0.5 text-[10px] rounded border ${
              showOffsideLine ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
            title="Linea di fuorigioco"
          >
            Fuorigioco
          </button>
          <button
            onClick={() => setShowPerspectiveHeatmap(!showPerspectiveHeatmap)}
            className={`px-1.5 py-0.5 text-[10px] rounded border ${
              showPerspectiveHeatmap ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
            title="Heatmap Pitch Control continuo (Spearman 2018)"
          >
            Heatmap
          </button>
          <button
            onClick={() => setShowTeamArrows(!showTeamArrows)}
            className={`px-1.5 py-0.5 text-[10px] rounded border ${
              showTeamArrows ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
            title="Visualizza le frecce dei movimenti senza palla della squadra"
          >
            Frecce Squadra
          </button>
        </div>
      </div>

      {/* 3. LAYOUT PRINCIPALE ALLINEATO: CANVAS (70%) + PANNELLO DESTRO (30%) AD ALTEZZA COORDINATA SENZA SCROLL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch flex-1 min-h-[560px] h-[calc(100vh-140px)]">
        {/* COLONNA SINISTRA / CENTRALE (~70% -> 8 su 12): BARRA + CANVAS + TIMELINE SIMULAZIONE */}
        <div className="lg:col-span-8 flex flex-col justify-between h-full space-y-1.5 min-h-0">

              {/* CONTENITORE: [BARRA VALUTAZIONE BICOLORE BLU/ROSSA] + [CANVAS VIDEO] */}
              <div className="flex gap-2.5 items-stretch">
                {/* BARRA CHESS.COM BICOLORE (Blu Squadra A vs Rosso Squadra B) */}
                <div
                  className="w-12 rounded-xl bg-[#111116] border border-zinc-800/80 p-1.5 flex flex-col items-center justify-between select-none shrink-0"
                  title="Valutazione Tattica Relativa: Blu (Squadra A) vs Rosso (Squadra B)"
                >
                  <div className="text-center">
                    <span className="text-[9px] font-bold text-blue-400 block tracking-tight">SQ. A</span>
                    <span className="text-[10px] font-mono font-bold text-blue-400">
                      {homeAdvantage >= 0 ? `+${homeAdvantage.toFixed(2)}` : homeAdvantage.toFixed(2)}
                    </span>
                  </div>

                  {/* Colonna bicolore split */}
                  <div className="relative w-4 flex-1 my-2 rounded-full border border-zinc-700/80 overflow-hidden flex flex-col bg-red-600">
                    <div
                      className="w-full bg-blue-600 transition-all duration-300"
                      style={{ height: `${bluePercent}%` }}
                    />
                    {/* Linea spartiacque bianca */}
                    <div className="w-full h-0.5 bg-white shadow-sm shrink-0" />
                  </div>

                  <div className="text-center">
                    <span className="text-[10px] font-mono font-bold text-red-400">
                      {awayAdvantage >= 0 ? `+${awayAdvantage.toFixed(2)}` : awayAdvantage.toFixed(2)}
                    </span>
                    <span className="text-[9px] font-bold text-red-400 block mt-0.5 tracking-tight">SQ. B</span>
                  </div>
                </div>

                {/* CANVAS VIDEO CON SOVRAPPOSIZIONE GRAFICA */}
                <div className="relative flex-1 aspect-video bg-[#070B12] rounded-xl border border-zinc-800/90 overflow-hidden select-none">
                  {mediaSourceType === 'uploaded_image' && currentUploadedFrameUrl ? (
                    <img
                      src={currentUploadedFrameUrl}
                      alt="Frame Tattico"
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : mediaSourceType === 'uploaded_video' && uploadedVideoUrl ? (
                    <video
                      ref={videoRef}
                      src={uploadedVideoUrl}
                      className="w-full h-full object-contain bg-black"
                      controls={false}
                      muted
                      playsInline
                      onTimeUpdate={(e) =>
                        setCurrentTimeSec(Number(e.currentTarget.currentTime.toFixed(2)))
                      }
                    />
                  ) : (
                    <canvas
                      ref={synthCanvasRef}
                      width={960}
                      height={540}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* OVERLAY SVG SFOLTITO E SEMANTICO */}
                  <svg
                    ref={overlaySvgRef}
                    viewBox="0 0 1000 562.5"
                    className={`absolute inset-0 w-full h-full pointer-events-auto ${
                      toolMode === 'draw_action'
                        ? 'cursor-crosshair'
                        : toolMode === 'place_ball'
                          ? 'cursor-pointer'
                          : 'cursor-default'
                    }`}
                    onMouseDown={handleSvgMouseDown}
                    onMouseMove={handleSvgMouseMove}
                    onMouseUp={handleSvgMouseUp}
                    onMouseLeave={handleSvgMouseUp}
                  >
                    <defs>
                      <marker
                        id="arrow-yellow-selected"
                        viewBox="0 0 10 10"
                        refX="7"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="#FACC15" />
                      </marker>
                      <marker
                        id="arrow-cyan-teammate"
                        viewBox="0 0 10 10"
                        refX="7"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="#00E5FF" />
                      </marker>
                      <marker
                        id="arrow-red-opp"
                        viewBox="0 0 10 10"
                        refX="7"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="#EF4444" />
                      </marker>
                    </defs>

                    {/* 0. Linee Campo Canoniche Proiettate sul Frame (120x80m) */}
                    {showProjectedFieldLines && (
                      <g className="pointer-events-none opacity-45" stroke="#F8FAFC" strokeWidth="1.2">
                        {/* Perimetro */}
                        {[
                          [[0, 0], [120, 0]],
                          [[120, 0], [120, 80]],
                          [[120, 80], [0, 80]],
                          [[0, 80], [0, 0]],
                          // Metà campo
                          [[60, 0], [60, 80]],
                          // Area rigore SX
                          [[0, 19.85], [16.5, 19.85]],
                          [[16.5, 19.85], [16.5, 60.15]],
                          [[16.5, 60.15], [0, 60.15]],
                          // Area piccola SX
                          [[0, 30.85], [5.5, 30.85]],
                          [[5.5, 30.85], [5.5, 49.15]],
                          [[5.5, 49.15], [0, 49.15]],
                          // Area rigore DX
                          [[120, 19.85], [103.5, 19.85]],
                          [[103.5, 19.85], [103.5, 60.15]],
                          [[103.5, 60.15], [120, 60.15]],
                          // Area piccola DX
                          [[120, 30.85], [114.5, 30.85]],
                          [[114.5, 30.85], [114.5, 49.15]],
                          [[114.5, 49.15], [120, 49.15]],
                        ].map(([pA, pB], idx) => {
                          const uA = projectPitchToImage(pA[0], pA[1], HInv);
                          const uB = projectPitchToImage(pB[0], pB[1], HInv);
                          return (
                            <line
                              key={`pitch-line-${idx}`}
                              x1={uA.u * 1000}
                              y1={uA.v * 562.5}
                              x2={uB.u * 1000}
                              y2={uB.v * 562.5}
                              strokeDasharray={idx === 4 ? 'none' : '4 3'}
                            />
                          );
                        })}

                        {/* Cerchio di Centrocampo R=9.15m centrato a (60, 40) */}
                        <polyline
                          points={Array.from({ length: 25 }, (_, i) => {
                            const angle = (i / 24) * 2 * Math.PI;
                            const x = 60 + 9.15 * Math.cos(angle);
                            const y = 40 + 9.15 * Math.sin(angle);
                            const uv = projectPitchToImage(x, y, HInv);
                            return `${uv.u * 1000},${uv.v * 562.5}`;
                          }).join(' ')}
                          fill="none"
                          strokeDasharray="3 3"
                        />

                        {/* Dischetti Rigore (11m, 40m), (109m, 40m) e Centro (60m, 40m) */}
                        {[[11, 40], [60, 40], [109, 40]].map(([sx, sy], sIdx) => {
                          const uv = projectPitchToImage(sx, sy, HInv);
                          return (
                            <circle
                              key={`pitch-spot-${sIdx}`}
                              cx={uv.u * 1000}
                              cy={uv.v * 562.5}
                              r={2.5}
                              fill="#F8FAFC"
                            />
                          );
                        })}
                      </g>
                    )}

                    {/* 1. Corridoi Tattici Verticali e Zona 14 */}
                    {showTacticalCorridors && (
                      <g className="pointer-events-none opacity-45">
                        {[16, 32, 48, 64].map((laneY) => {
                          const p0 = projectPitchToImage(0, laneY, HInv);
                          const p1 = projectPitchToImage(120, laneY, HInv);
                          return (
                            <line
                              key={`lane-${laneY}`}
                              x1={p0.u * 1000}
                              y1={p0.v * 562.5}
                              x2={p1.u * 1000}
                              y2={p1.v * 562.5}
                              stroke="#00E5FF"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                          );
                        })}
                        {(() => {
                          const z00 = projectPitchToImage(80, 28, HInv);
                          const z10 = projectPitchToImage(102, 28, HInv);
                          const z11 = projectPitchToImage(102, 52, HInv);
                          const z01 = projectPitchToImage(80, 52, HInv);
                          return (
                            <polygon
                              points={`${z00.u * 1000},${z00.v * 562.5} ${z10.u * 1000},${z10.v * 562.5} ${z11.u * 1000},${z11.v * 562.5} ${z01.u * 1000},${z01.v * 562.5}`}
                              fill="#F59E0B"
                              fillOpacity="0.14"
                              stroke="#F59E0B"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                          );
                        })()}
                      </g>
                    )}

                    {/* 2. Linea Fuorigioco Dinamica o Manuale (Trascina Libero) */}
                    {(showOffsideLine || actionEvaluation.isOffside) &&
                      (() => {
                        const off0 = projectPitchToImage(effectiveOffsideX, 0, HInv);
                        const off1 = projectPitchToImage(effectiveOffsideX, 80, HInv);
                        const midOff = projectPitchToImage(effectiveOffsideX, 40, HInv);
                        const strokeColor = actionEvaluation.isOffside
                          ? '#EF4444'
                          : offsideMode === 'manual'
                            ? '#00E5FF'
                            : '#F59E0B';

                        const midPx = midOff.u * 1000;
                        const midPy = midOff.v * 562.5;

                        return (
                          <g>
                            {/* Traccia Linea tratteggiata */}
                            <line
                              x1={off0.u * 1000}
                              y1={off0.v * 562.5}
                              x2={off1.u * 1000}
                              y2={off1.v * 562.5}
                              stroke={strokeColor}
                              strokeWidth={actionEvaluation.isOffside ? '3.2' : '2.5'}
                              strokeDasharray="6 4"
                            />

                            {/* Linea invisibile spessa per drag facilitato */}
                            <line
                              x1={off0.u * 1000}
                              y1={off0.v * 562.5}
                              x2={off1.u * 1000}
                              y2={off1.v * 562.5}
                              stroke="transparent"
                              strokeWidth="20"
                              className="cursor-ew-resize pointer-events-auto"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setOffsideMode('manual');
                                setDraggingEntity({ type: 'offside_line' });
                              }}
                            />

                            {/* Badge / Maniglia Interattiva per Trascina Manuale */}
                            <g
                              transform={`translate(${midPx}, ${midPy})`}
                              className="cursor-ew-resize pointer-events-auto select-none"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setOffsideMode('manual');
                                setDraggingEntity({ type: 'offside_line' });
                              }}
                            >
                              <rect
                                x={-76}
                                y={-13}
                                width={152}
                                height={26}
                                rx={6}
                                fill="#09090B"
                                fillOpacity="0.94"
                                stroke={strokeColor}
                                strokeWidth="1.5"
                              />
                              <text
                                x={0}
                                y={4}
                                textAnchor="middle"
                                fontSize="9"
                                fill={strokeColor}
                                className="font-mono font-bold"
                              >
                                {actionEvaluation.isOffside ? 'OFFSIDE' : 'REGOLARE'}{' '}
                                ({effectiveOffsideX.toFixed(1)}m) [{offsideMode === 'manual' ? 'MANUALE' : 'AUTO'}]
                              </text>
                            </g>
                          </g>
                        );
                      })()}

                    {/* 3. Heatmap Pitch Control */}
                    {showPerspectiveHeatmap &&
                      pitchControlData.grid.map((row, rIdx) =>
                        row.map((probHome, cIdx) => {
                          const x0 = (cIdx / 24) * 120;
                          const x1 = ((cIdx + 1) / 24) * 120;
                          const y0 = (rIdx / 16) * 80;
                          const y1 = ((rIdx + 1) / 16) * 80;
                          if (x0 < 12 || x1 > 108 || y0 < 6 || y1 > 74) return null;

                          const p00 = projectPitchToImage(x0, y0, HInv);
                          const p10 = projectPitchToImage(x1, y0, HInv);
                          const p11 = projectPitchToImage(x1, y1, HInv);
                          const p01 = projectPitchToImage(x0, y1, HInv);

                          const isHomeDom = probHome >= 0.5;
                          const intensity = Math.abs(probHome - 0.5) * 2;
                          if (intensity < 0.16) return null;

                          const fill = isHomeDom ? '#3B82F6' : '#EF4444';
                          const opacity = Number((intensity * 0.22).toFixed(3));

                          return (
                            <polygon
                              key={`hm-${rIdx}-${cIdx}`}
                              points={`${p00.u * 1000},${p00.v * 562.5} ${p10.u * 1000},${p10.v * 562.5} ${p11.u * 1000},${p11.v * 562.5} ${p01.u * 1000},${p01.v * 562.5}`}
                              fill={fill}
                              fillOpacity={opacity}
                              stroke="none"
                              className="pointer-events-none"
                            />
                          );
                        })
                      )}

                    {/* 4. Griglia Calibrazione H */}
                    {(toolMode === 'calibrate_homography' || showHomographyGrid) && (
                      <polygon
                        points={currentKeypoints
                          .map((kp) => `${kp.imageU * 1000},${kp.imageV * 562.5}`)
                          .join(' ')}
                        fill="none"
                        stroke="#94A3B8"
                        strokeOpacity="0.45"
                        strokeWidth="1.2"
                        strokeDasharray="6 4"
                        className="pointer-events-none"
                      />
                    )}

                    {/* 4.5. Movimenti Senza Palla & Frecce Tattiche della Squadra */}
                    {(showTeamArrows || toolMode === 'draw_movement') && (
                      <g className="pointer-events-auto">
                        {/* Corse suggerite dall'engine tattico per i compagni */}
                        {teamMovementsResult.suggestedMovements.map((sm) => {
                          if (customMovements[sm.playerId]) return null;
                          const uvStart = projectPitchToImage(sm.startX, sm.startY, HInv);
                          const uvTarget = projectPitchToImage(sm.targetX, sm.targetY, HInv);
                          const x1 = uvStart.u * 1000;
                          const y1 = uvStart.v * 562.5;
                          const x2 = uvTarget.u * 1000;
                          const y2 = uvTarget.v * 562.5;
                          const midX = (x1 + x2) / 2;
                          const midY = (y1 + y2) / 2;

                          return (
                            <g key={`sm-${sm.playerId}`}>
                              <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="#00E5FF"
                                strokeWidth="2.2"
                                strokeDasharray="5 3"
                                markerEnd="url(#arrow-cyan-teammate)"
                                opacity="0.85"
                              />
                              <circle
                                cx={x2}
                                cy={y2}
                                r={4.5}
                                fill="#00E5FF"
                                fillOpacity="0.4"
                                stroke="#00E5FF"
                                strokeWidth="1.5"
                              />
                              <g transform={`translate(${midX}, ${midY - 7})`}>
                                <rect
                                  x={-34}
                                  y={-7}
                                  width={68}
                                  height={14}
                                  rx={3}
                                  fill="#09090B"
                                  fillOpacity="0.88"
                                  stroke="#00E5FF"
                                  strokeWidth="0.8"
                                />
                                <text
                                  x={0}
                                  y={3}
                                  textAnchor="middle"
                                  fontSize="7.5"
                                  fill="#00E5FF"
                                  className="font-mono font-bold"
                                >
                                  {sm.label}
                                </text>
                              </g>
                            </g>
                          );
                        })}

                        {/* Corse disegnate manualmente dall'utente */}
                        {Object.values(customMovements).map((mv) => {
                          const uvStart = projectPitchToImage(mv.startX, mv.startY, HInv);
                          const uvTarget = projectPitchToImage(mv.targetX, mv.targetY, HInv);
                          const x1 = uvStart.u * 1000;
                          const y1 = uvStart.v * 562.5;
                          const x2 = uvTarget.u * 1000;
                          const y2 = uvTarget.v * 562.5;

                          return (
                            <g key={`custom-mv-${mv.playerId}`}>
                              <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="#FACC15"
                                strokeWidth="2.6"
                                strokeDasharray="6 3"
                                markerEnd="url(#arrow-yellow-selected)"
                              />
                              <circle
                                cx={x2}
                                cy={y2}
                                r={6.5}
                                fill="#FACC15"
                                fillOpacity="0.5"
                                stroke="#FACC15"
                                strokeWidth="2"
                                className="cursor-grab active:cursor-grabbing pointer-events-auto"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setDraggingEntity({ type: 'movement_target', id: mv.playerId });
                                }}
                              />
                            </g>
                          );
                        })}
                      </g>
                    )}

                    {/* 5. Pedine Giocatori (Blu = Squadra A, Rosso = Squadra B) con Posizioni Dinamiche */}
                    {effectivePlayerPositions.map((player) => {
                      const uv = projectPitchToImage(player.x, player.y, HInv);
                      const px = uv.u * 1000;
                      const py = uv.v * 562.5;
                      const isHome = player.team === 'home';
                      const isSelected = player.id === selectedPlayerId;
                      const isHovered = player.id === hoveredPlayerId;
                      const isCarrier = ballCarrier?.id === player.id;
                      const isBlocker = actionEvaluation.criticalBlocker?.defenderId === player.id;
                      const isInterceptor =
                        carrierDecision.isPassedToOpponent &&
                        carrierDecision.interceptingOpponent?.id === player.id;

                      const strokeColor = isInterceptor
                        ? '#EF4444'
                        : isHome
                          ? '#60A5FA'
                          : '#F87171';
                      const fillColor = isHome ? '#1D4ED8' : '#B91C1C';
                      const showBadge = showAllLabels || isSelected || isHovered || isInterceptor;

                      return (
                        <g
                          key={player.id}
                          transform={`translate(${px}, ${py})`}
                          className="cursor-grab active:cursor-grabbing select-none"
                          onMouseEnter={() => setHoveredPlayerId(player.id)}
                          onMouseLeave={() => {
                            setHoveredPlayerId(null);
                            if (longPressTimerRef.current) {
                              clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = null;
                            }
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedPlayerId(player.id);
                            setDraggingEntity({ type: 'player', id: player.id });
                            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = setTimeout(() => {
                              setHeldPlayerId(player.id);
                            }, 380);
                          }}
                          onMouseUp={() => {
                            if (longPressTimerRef.current) {
                              clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = null;
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removePlayer(player.id);
                            if (selectedPlayerId === player.id) setSelectedPlayerId('');
                            if (heldPlayerId === player.id) setHeldPlayerId(null);
                          }}
                        >
                          {/* Anello evidenziatore */}
                          {(isSelected || isBlocker || isCarrier || isInterceptor) && (
                            <circle
                              cx={0}
                              cy={0}
                              r={16}
                              fill="none"
                              stroke={
                                isInterceptor
                                  ? '#EF4444'
                                  : isCarrier
                                    ? '#FACC15'
                                    : isBlocker
                                      ? '#F59E0B'
                                      : '#00E5FF'
                              }
                              strokeWidth={isInterceptor ? '2.8' : '2.2'}
                              strokeDasharray={isInterceptor ? '4 2' : isBlocker ? '3 2' : 'none'}
                            />
                          )}

                          {/* Cerchio Pedina */}
                          <circle
                            cx={0}
                            cy={0}
                            r={11}
                            fill={fillColor}
                            fillOpacity={isSelected || isHovered ? 0.95 : 0.75}
                            stroke={strokeColor}
                            strokeWidth={isSelected || isInterceptor ? 2.4 : 1.5}
                          />
                          <text
                            x={0}
                            y={3.5}
                            textAnchor="middle"
                            fontSize="9.5"
                            fill="#FFFFFF"
                            className="font-mono font-bold pointer-events-none select-none"
                          >
                            {player.number}
                          </text>

                          {/* Bottone '✕' Rosso per Rimozione Immediata con 1 Click */}
                          {(isSelected || isHovered || heldPlayerId === player.id) && (
                            <g
                              transform="translate(11, -11)"
                              className="cursor-pointer pointer-events-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                removePlayer(player.id);
                                if (selectedPlayerId === player.id) setSelectedPlayerId('');
                                if (heldPlayerId === player.id) setHeldPlayerId(null);
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                removePlayer(player.id);
                                if (selectedPlayerId === player.id) setSelectedPlayerId('');
                                if (heldPlayerId === player.id) setHeldPlayerId(null);
                              }}
                            >
                              <title>Rimuovi pedina dal frame (Click rapido o Tasto destro)</title>
                              <circle
                                cx={0}
                                cy={0}
                                r={7.5}
                                fill="#EF4444"
                                stroke="#FFFFFF"
                                strokeWidth="1.3"
                                className="filter drop-shadow"
                              />
                              <line
                                x1={-2.6}
                                y1={-2.6}
                                x2={2.6}
                                y2={2.6}
                                stroke="#FFFFFF"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                              <line
                                x1={2.6}
                                y1={-2.6}
                                x2={-2.6}
                                y2={2.6}
                                stroke="#FFFFFF"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                            </g>
                          )}

                          {/* Nome Esteso o Badge Intercettore */}
                          {showBadge && (
                            <g className="pointer-events-none">
                              <rect
                                x={-68}
                                y={-31}
                                width={136}
                                height={16}
                                rx={4}
                                fill="#09090B"
                                fillOpacity="0.94"
                                stroke={strokeColor}
                                strokeWidth="0.9"
                              />
                              <text
                                x={0}
                                y={-20.5}
                                textAnchor="middle"
                                fontSize="9"
                                fill={isInterceptor ? '#FCA5A5' : '#F8FAFC'}
                                className="font-sans font-medium"
                              >
                                {isInterceptor
                                  ? `Intercetto Avversario (#${player.number})`
                                  : `${player.archetypeName} (${player.x.toFixed(0)}m, ${player.y.toFixed(0)}m)`}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* 6. Il Pallone Ufficiale (Marker Dedicato e Parabola 3D) */}
                    {(() => {
                      const ballUv = projectPitchToImage(effectiveBallPosition.x, effectiveBallPosition.y, HInv);
                      const bx = ballUv.u * 1000;
                      const groundBy = ballUv.v * 562.5;
                      const by = groundBy - (effectiveBallPosition.z * 18);

                      return (
                        <g>
                          {/* Ombra del pallone a terra durante parabola */}
                          {effectiveBallPosition.z > 0.05 && (
                            <ellipse
                              cx={bx}
                              cy={groundBy}
                              rx={Math.max(3.5, 7 - effectiveBallPosition.z * 1.2)}
                              ry={Math.max(1.8, 3.5 - effectiveBallPosition.z * 0.6)}
                              fill="#000000"
                              fillOpacity={Math.max(0.18, 0.45 - effectiveBallPosition.z * 0.08)}
                              className="pointer-events-none"
                            />
                          )}

                          {/* Punto di Intercetto Avversario se rilevato sulla traiettoria */}
                          {carrierDecision.isPassedToOpponent && carrierDecision.interceptingOpponent && (() => {
                            const opp = carrierDecision.interceptingOpponent;
                            const icpUv = projectPitchToImage(
                              opp.x,
                              opp.y,
                              HInv
                            );
                            const ix = icpUv.u * 1000;
                            const iy = icpUv.v * 562.5;
                            return (
                              <g transform={`translate(${ix}, ${iy})`} className="pointer-events-none">
                                <circle cx={0} cy={0} r={9} fill="none" stroke="#EF4444" strokeWidth="2" strokeDasharray="3 2" />
                                <circle cx={0} cy={0} r={3.5} fill="#EF4444" />
                                <g transform="translate(0, -13)">
                                  <rect x={-52} y={-8} width={104} height={15} rx={3} fill="#450A0A" stroke="#EF4444" strokeWidth="1" />
                                  <text x={0} y={3} textAnchor="middle" fontSize="7.5" fill="#FCA5A5" className="font-mono font-bold">
                                    INTERCETTO GARANTITO
                                  </text>
                                </g>
                              </g>
                            );
                          })()}

                          <g
                            transform={`translate(${bx}, ${by})`}
                            className="cursor-grab active:cursor-grabbing"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDraggingEntity({ type: 'ball' });
                            }}
                          >
                            <circle cx={0} cy={0} r={14} fill="#FACC15" fillOpacity="0.22" />
                            <circle cx={0} cy={0} r={7.5} fill="#FFFFFF" stroke="#09090B" strokeWidth="2" />
                            <circle cx={0} cy={0} r={2.5} fill="#09090B" />
                            <text
                              x={0}
                              y={-11}
                              textAnchor="middle"
                              fontSize="8.5"
                              fill="#FACC15"
                              className="font-mono font-bold pointer-events-none"
                            >
                              PALLA
                            </text>
                          </g>
                        </g>
                      );
                    })()}

                    {/* 7. Traiettoria Freccia Disegnata (Gialla se valida, Rossa se Errore/Intercetto) */}
                    {(() => {
                      const x1 = arrowStartUv.u * 1000;
                      const y1 = arrowStartUv.v * 562.5;
                      const x2 = arrowEndUv.u * 1000;
                      const y2 = arrowEndUv.v * 562.5;

                      const liftPx =
                        actionProps.ballHeightCm * 0.22 +
                        (actionProps.executionStyle === 'Interno a Giro' ? 28 : 0);
                      const cx = (x1 + x2) / 2;
                      const cy = (y1 + y2) / 2 - liftPx;

                      const isCriticalError =
                        actionEvaluation.isOffside ||
                        carrierDecision.isPassedToOpponent ||
                        (carrierDecision.isOutOfBounds && !carrierDecision.isEmergencyClearance);

                      const arrowColor = isCriticalError ? '#EF4444' : '#FACC15';
                      const markerId = isCriticalError ? 'url(#arrow-red-opp)' : 'url(#arrow-yellow-selected)';

                      return (
                        <g>
                          {liftPx > 6 && (
                            <line
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke={arrowColor}
                              strokeOpacity="0.25"
                              strokeWidth="1.5"
                              strokeDasharray="4 4"
                            />
                          )}

                          <path
                            d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                            fill="none"
                            stroke={arrowColor}
                            strokeWidth="3.2"
                            markerEnd={markerId}
                          />

                          {/* Punta della freccia trascinabile */}
                          <circle
                            cx={x2}
                            cy={y2}
                            r={8.5}
                            fill={arrowColor}
                            fillOpacity="0.4"
                            stroke={arrowColor}
                            strokeWidth="2.2"
                            className="cursor-grab active:cursor-grabbing"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDraggingEntity({ type: 'arrow_to' });
                            }}
                          />
                        </g>
                      );
                    })()}

                    {/* 8. Punti di Calibrazione Omografia */}
                    {toolMode === 'calibrate_homography' &&
                      currentKeypoints.map((kp) => {
                        const cx = kp.imageU * 1000;
                        const cy = kp.imageV * 562.5;
                        return (
                          <g
                            key={kp.id}
                            transform={`translate(${cx}, ${cy})`}
                            className="cursor-move"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDraggingEntity({ type: 'kp', id: kp.id });
                            }}
                          >
                            <circle
                              cx={0}
                              cy={0}
                              r={8}
                              fill="#FACC15"
                              fillOpacity="0.3"
                              stroke="#FACC15"
                              strokeWidth="2"
                            />
                            <circle cx={0} cy={0} r={2.5} fill="#FFFFFF" />
                            <text
                              x={10}
                              y={4}
                              fontSize="9.5"
                              fill="#FACC15"
                              className="font-mono font-bold pointer-events-none"
                            >
                              {kp.id.toUpperCase()} ({kp.pitchX}m,{kp.pitchY}m)
                            </text>
                          </g>
                        );
                      })}
                  </svg>
                </div>
              </div>

              {/* TIMELINE / CONTROLLI SIMULAZIONE DINAMICA A 60 FPS */}
              <div className="px-4 py-2 rounded-xl bg-[#111116] border border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
                  {/* Tasto Play / Pausa Simulazione */}
                  <button
                    onClick={() => {
                      if (simProgress >= 1) {
                        setSimProgress(0);
                        setIsSimulating(true);
                      } else {
                        setIsSimulating(!isSimulating);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                      isSimulating
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                    }`}
                    title={isSimulating ? 'Sospendi simulazione' : 'Avvia simulazione dinamica a 60 FPS'}
                  >
                    {isSimulating ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-400" />
                        Pausa
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white text-white" />
                        Simula Giocata (60 FPS)
                      </>
                    )}
                  </button>

                  {/* Tasto Riavvolgi */}
                  <button
                    onClick={() => {
                      setIsSimulating(false);
                      setSimProgress(0);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 text-xs font-semibold flex items-center gap-1 shrink-0"
                    title="Riavvolgi la simulazione all'istante iniziale t = 0s"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                    Reset
                  </button>

                  {/* Scrubber Range Slider per avanzamento simulazione */}
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={simProgress}
                      onChange={(e) => {
                        setIsSimulating(false);
                        setSimProgress(Number(e.target.value));
                      }}
                      className="flex-1 accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-mono text-cyan-400 font-bold shrink-0 min-w-[55px] text-right">
                      {(simProgress * (actionEvaluation.flightTimeSec || 2.5)).toFixed(2)}s
                    </span>
                  </div>
                </div>

                {/* Statistiche Live e Reset Corse */}
                <div className="flex items-center gap-3 text-xs text-zinc-400 border-l border-zinc-800/80 pl-3">
                  {Object.keys(customMovements).length > 0 && (
                    <button
                      onClick={() => setCustomMovements({})}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-mono underline shrink-0"
                      title="Cancella tutte le corse manuali tracciate per i compagni"
                    >
                      Azzera Corse ({Object.keys(customMovements).length})
                    </button>
                  )}
                  <div className="hidden sm:block">
                    Controllo Sq. A:{' '}
                    <span className="font-mono font-semibold text-blue-400">
                      {pitchControlData.homeAvg}%
                    </span>
                  </div>
                  <div>
                    Compattezza Difensiva:{' '}
                    <span className="font-mono font-semibold text-emerald-400">
                      {defensiveShape.compactnessScore}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* COLONNA DESTRA (~30% -> 4 su 12): PANNELLO A SCHEDE (ALTEZZA COORDINATA AL 100% SENZA SCROLL ESTERNO) */}
            <div className="lg:col-span-4 rounded-xl bg-[#111116] border border-zinc-800/80 overflow-hidden flex flex-col h-full min-h-0">
              {/* Intestazione 5 Schede Coordinate */}
              <div className="grid grid-cols-5 border-b border-zinc-800 bg-[#0C0C10] shrink-0">
                {(
                  [
                    { id: 'analisi', label: 'Portatore' },
                    { id: 'squadra', label: 'Squadra' },
                    { id: 'giocatori', label: 'Pedine' },
                    { id: 'calibrazione', label: 'Calibra' },
                    { id: 'pattern_maestri', label: 'Maestri' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setRightTab(tab.id)}
                    className={`py-2.5 text-[10px] sm:text-[11px] font-semibold transition-colors border-b-2 truncate px-1 text-center ${
                      rightTab === tab.id
                        ? 'border-[#00E5FF] text-[#00E5FF] bg-[#111116]'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-3.5 space-y-3.5 overflow-y-auto flex-1 min-h-0">
                {/* ================================================================
                    SCHEDA 1: ANALISI & MOSSE STILE CHESS.COM
                   ================================================================ */}
                {rightTab === 'analisi' && (
                  <div className="space-y-4">
                    {/* Alert Passaggio Diretto ad Avversario */}
                    {carrierDecision.isPassedToOpponent && (
                      <div className="p-3 rounded-xl bg-red-950/70 border border-red-700/80 flex items-start gap-2.5 text-xs text-red-200">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-red-300 block">Palla Persa: Passaggio Diretto ad Avversario (??)</strong>
                          <span className="text-[11px] text-red-200/90 leading-tight">
                            {carrierDecision.description}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Alert Spazzata di Sicurezza Sotto Pressione */}
                    {carrierDecision.isEmergencyClearance && (
                      <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/80 flex items-start gap-2.5 text-xs text-emerald-200">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-emerald-300 block">Spazzata di Sicurezza: Decisione Corretta (!)</strong>
                          <span className="text-[11px] text-emerald-200/90 leading-tight">
                            {carrierDecision.description}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Alert Tiro o Passaggio Fuori Campo Senza Pressione */}
                    {carrierDecision.isOutOfBounds && !carrierDecision.isEmergencyClearance && (
                      <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-600/80 flex items-start gap-2.5 text-xs text-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-amber-300 block">Palla Fuori Campo: Errore Inutile (?)</strong>
                          <span className="text-[11px] text-amber-200/90 leading-tight">
                            {carrierDecision.description}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Alert Fuorigioco se rilevato */}
                    {actionEvaluation.isOffside && (
                      <div className="p-3 rounded-xl bg-red-950/60 border border-red-700/80 flex items-center gap-2.5 text-red-200 text-xs">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <div>
                          <strong className="font-bold">Fuorigioco Rilevato!</strong> Ricevente oltre il penultimo difensore di {actionEvaluation.offsideMarginMeters}m.
                        </div>
                      </div>
                    )}

                    {/* Card Riepilogo Mossa Selezionata */}
                    <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                      <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                        <div>
                          <div className="text-[10px] text-zinc-400 font-mono uppercase">Mossa Valutata</div>
                          <h4 className="text-xs font-bold text-zinc-100 mt-0.5">
                            {actionEvaluation.isShot
                              ? `Tiro a Rete (${actionEvaluation.targetGoalDistMeters}m)`
                              : `${actionProps.actionCategory} → ${targetReceiverNode?.archetypeName} (#${targetReceiverNode?.number})`}
                          </h4>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold shrink-0 ${
                            carrierDecision.isPassedToOpponent
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : carrierDecision.isEmergencyClearance
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : carrierDecision.isOutOfBounds && !carrierDecision.isEmergencyClearance
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                  : actionEvaluation.classification === 'Best Move (!!)'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                    : actionEvaluation.classification === 'Good Alternative (!)'
                                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                      : actionEvaluation.classification === 'Inaccuracy (?)'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                        : 'bg-red-500/20 text-red-400 border border-red-500/40'
                          }`}
                        >
                          {carrierDecision.isPassedToOpponent
                            ? 'Blunder (??)'
                            : carrierDecision.isEmergencyClearance
                              ? 'Good Move (!)'
                              : carrierDecision.isOutOfBounds && !carrierDecision.isEmergencyClearance
                                ? 'Inaccuracy (?)'
                                : actionEvaluation.classification}
                        </span>
                      </div>

                      {/* Metriche Dettagliate */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-zinc-800/40">
                          <span className="text-zinc-400">Punteggio J(a|s):</span>
                          <span
                            className={`font-mono font-bold ${
                              actionEvaluation.compositeScore >= 0.15
                                ? 'text-emerald-400'
                                : actionEvaluation.compositeScore < -0.2
                                  ? 'text-red-400'
                                  : 'text-amber-400'
                            }`}
                          >
                            {actionEvaluation.compositeScore >= 0 ? '+' : ''}
                            {actionEvaluation.compositeScore.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-zinc-800/40">
                          <span className="text-zinc-400">
                            {actionEvaluation.isShot ? 'Expected Goals (xG):' : 'Probabilità di Successo:'}
                          </span>
                          <span className="font-mono font-semibold text-zinc-100">
                            {actionEvaluation.isShot
                              ? `${(actionEvaluation.xgIfShot * 100).toFixed(1)}% (xG ${actionEvaluation.xgIfShot})`
                              : `${actionEvaluation.successProbabilityPct}%`}
                          </span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-zinc-800/40">
                          <span className="text-zinc-400">Avversari Saltati (Packing):</span>
                          <span className="font-mono font-semibold text-blue-400">
                            {actionEvaluation.packingRate} difendenti
                          </span>
                        </div>

                        <div className="flex justify-between py-1 border-b border-zinc-800/40">
                          <span className="text-zinc-400">Pressione sul Portatore:</span>
                          <span className="font-mono font-semibold text-zinc-300">
                            {actionEvaluation.pressureIntensityPct}%
                          </span>
                        </div>

                        <div className="flex justify-between py-1">
                          <span className="text-zinc-400">Portiere Avversario:</span>
                          <span className="font-mono font-semibold text-zinc-200">
                            {actionEvaluation.oppGkInPosition ? 'In Porta (Coperto)' : 'Fuori dai Pali!'}
                          </span>
                        </div>
                      </div>

                      {/* Verdetto Narrativo Umano */}
                      <p className="text-xs text-zinc-400 leading-relaxed pt-1.5 border-t border-zinc-800/60">
                        {actionEvaluation.chessVerdictText}
                      </p>
                    </div>

                    {/* Lista delle Top 3 Alternative Stile Chess.com (SOLO COMPAGNI!) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                        <span>Migliori Alternative per {analyzingTeam === 'home' ? 'Squadra A' : 'Squadra B'}</span>
                        <span className="text-[10px] font-mono text-zinc-500">Solo compagni</span>
                      </div>

                      <div className="space-y-1.5">
                        {actionEvaluation.top3FrameAlternatives.map((alt) => {
                          const isRowActive = selectedMoveRank === alt.rank;
                          return (
                            <button
                              key={alt.rank}
                              onClick={() => {
                                setSelectedMoveRank(alt.rank);
                                setActionProps((prev) => ({
                                  ...prev,
                                  actionCategory:
                                    alt.actionType === 'Cambio Gioco Armonico'
                                      ? 'Cambio Gioco'
                                      : 'Passaggio Filtrante',
                                  fromX: alt.fromX,
                                  fromY: alt.fromY,
                                  toX: alt.toX,
                                  toY: alt.toY,
                                }));
                              }}
                              className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between gap-2 ${
                                isRowActive
                                  ? 'bg-zinc-900 border-[#00E5FF]'
                                  : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded shrink-0 ${
                                    alt.rank === 1
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : alt.rank === 2
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  }`}
                                >
                                  {alt.rank === 1 ? '!!' : alt.rank === 2 ? '!' : '?'}
                                </span>
                                <div className="text-xs font-medium text-zinc-200 truncate">
                                  {alt.actionType} → {alt.targetArchetype}
                                </div>
                              </div>

                              <div className="text-right font-mono text-xs shrink-0">
                                <span
                                  className={
                                    alt.compositeScore >= 0.15
                                      ? 'text-emerald-400 font-semibold'
                                      : 'text-amber-400'
                                  }
                                >
                                  {alt.compositeScore >= 0 ? '+' : ''}
                                  {alt.compositeScore.toFixed(2)}
                                </span>
                                <span className="text-zinc-600 mx-1">|</span>
                                <span className="text-zinc-300">{alt.successProbabilityPct.toFixed(0)}%</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Parametri Fisici Sliders */}
                    <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                        <span className="flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-blue-400" />
                          Parametri Balistici Tiro/Passaggio
                        </span>
                        <span className="font-mono text-zinc-400">
                          {actionEvaluation.distanceMeters}m · {actionEvaluation.flightTimeSec}s
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-zinc-400 block mb-1">Azione</label>
                          <select
                            value={actionProps.actionCategory}
                            onChange={(e) =>
                              setActionProps((prev) => ({
                                ...prev,
                                actionCategory: e.target.value as DrawnActionCategory,
                              }))
                            }
                            className="w-full px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                          >
                            <option value="Passaggio Filtrante">Passaggio Filtrante</option>
                            <option value="Cross">Cross</option>
                            <option value="Tiro a Giro">Tiro a Giro</option>
                            <option value="Passaggio Corto">Passaggio Corto</option>
                            <option value="Cambio Gioco">Cambio Gioco</option>
                            <option value="Conduzione / Dribbling">Conduzione 1v1</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-zinc-400 block mb-1">Piede / Stile</label>
                          <select
                            value={`${actionProps.bodyPart}|${actionProps.executionStyle}`}
                            onChange={(e) => {
                              const [bp, st] = e.target.value.split('|');
                              setActionProps((prev) => ({
                                ...prev,
                                bodyPart: bp as ContactFootOrHead,
                                executionStyle: st as ContactExecutionStyle,
                              }));
                            }}
                            className="w-full px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                          >
                            <option value="Destro|Di Prima">Destro · Di Prima</option>
                            <option value="Destro|Controllo + Giocata">Destro · Controllo</option>
                            <option value="Destro|Interno a Giro">Destro · A Giro</option>
                            <option value="Sinistro|Di Prima">Sinistro · Di Prima</option>
                            <option value="Sinistro|Interno a Giro">Sinistro · A Giro</option>
                            <option value="Testa|Di Prima">Testa · Di Prima</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">Potenza / Velocità</span>
                          <span className="font-mono text-zinc-200">
                            {actionProps.ballSpeedKmh} km/h ({actionEvaluation.ballSpeedMs} m/s)
                          </span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={120}
                          value={actionProps.ballSpeedKmh}
                          onChange={(e) =>
                            setActionProps((prev) => ({
                              ...prev,
                              ballSpeedKmh: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">Altezza Parabola (Loft)</span>
                          <span className="font-mono text-zinc-200">
                            {actionProps.ballHeightCm} cm{' '}
                            {actionProps.ballHeightCm >= 160 ? '(Scavalca difensori)' : '(Rasoterra)'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={320}
                          step={10}
                          value={actionProps.ballHeightCm}
                          onChange={(e) =>
                            setActionProps((prev) => ({
                              ...prev,
                              ballHeightCm: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ================================================================
                    SCHEDA 2: ANALISI DI SQUADRA & MOVIMENTI SENZA PALLA
                   ================================================================ */}
                {rightTab === 'squadra' && (
                  <div className="space-y-3.5">
                    {/* Header Box Analisi di Squadra */}
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-[#00E5FF]" />
                          <h4 className="font-bold text-zinc-100">Movimenti Senza Palla</h4>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                          {analyzingTeam === 'home' ? 'Squadra Blu' : 'Squadra Rossa'}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Valutazione tattica complementare delle corse di smarcamento e dei movimenti senza palla dei compagni di squadra rispetto al portatore ({ballCarrier ? `#${ballCarrier.number} ${ballCarrier.archetypeName}` : 'Nessuno'}).
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            const newCustom: Record<string, PlayerMovementVector> = {};
                            for (const sm of teamMovementsResult.suggestedMovements) {
                              newCustom[sm.playerId] = { ...sm };
                            }
                            setCustomMovements(newCustom);
                            setShowTeamArrows(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Carica le corse ottimali calcolate dall'engine per tutti i compagni"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          Applica Corse Ottimali
                        </button>

                        <button
                          onClick={() => setToolMode(toolMode === 'draw_movement' ? 'drag_players' : 'draw_movement')}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                            toolMode === 'draw_movement'
                              ? 'bg-cyan-400 text-zinc-950 border-cyan-300 font-bold'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                          }`}
                          title="Traccia manualmente una freccia di movimento per qualsiasi compagno"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          {toolMode === 'draw_movement' ? 'Tracciamento Attivo' : 'Traccia Corsa'}
                        </button>
                      </div>
                    </div>

                    {/* Lista Valutazioni Corse dei Compagni */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                        <span>Valutazione Corse dei Compagni</span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {teamMovementsResult.evaluations.length} compagni
                        </span>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {teamMovementsResult.evaluations.map((ev) => {
                          const isCustom = Boolean(customMovements[ev.playerId]);
                          return (
                            <div
                              key={ev.playerId}
                              className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                                isCustom
                                  ? 'bg-zinc-900/80 border-amber-500/50'
                                  : 'bg-zinc-900/50 border-zinc-800/80'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {ev.playerNumber}
                                  </span>
                                  <div className="truncate">
                                    <span className="font-semibold text-zinc-200">{ev.archetypeName}</span>
                                    <span className="text-[10px] text-zinc-500 ml-1.5 font-mono">
                                      {ev.movement.label}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                      ev.badge === '!!'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : ev.badge === '!'
                                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                          : ev.badge === '?'
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            : ev.badge === '??'
                                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                              : 'bg-zinc-800 text-zinc-300'
                                    }`}
                                  >
                                    {ev.badge}
                                  </span>

                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                    {isCustom ? 'MANUALE' : 'AUTO'}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[11px] text-zinc-400 leading-tight">
                                {ev.description}
                              </p>

                              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-800/60">
                                <span>
                                  Target: ({ev.movement.targetX.toFixed(1)}m, {ev.movement.targetY.toFixed(1)}m)
                                </span>
                                <span className={ev.score >= 0.1 ? 'text-emerald-400 font-bold' : ev.score < -0.1 ? 'text-red-400 font-bold' : 'text-zinc-400'}>
                                  Score: {ev.score >= 0 ? '+' : ''}{ev.score.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Assetto Squadra Difendente */}
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>Assetto Squadra Difendente</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          Pressione: {defensiveShape.pressureIntensity}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-zinc-400">Compattezza Linee:</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {defensiveShape.compactnessScore}%
                            </span>
                          </div>
                          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full transition-all"
                              style={{ width: `${defensiveShape.compactnessScore}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex justify-between text-[11px] py-1 border-t border-zinc-800/40">
                          <span className="text-zinc-400">Intensità Pressione:</span>
                          <span className="font-mono font-bold text-blue-400">
                            {defensiveShape.pressureIntensity}
                          </span>
                        </div>

                        <div className="flex justify-between text-[11px] py-1 border-t border-zinc-800/40">
                          <span className="text-zinc-400">Marcatura & Chiusura Linee:</span>
                          <span className="font-mono font-bold text-zinc-300">
                            {defensiveShape.markingQuality}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-400 leading-relaxed pt-1.5 border-t border-zinc-800/60">
                        {defensiveShape.recommendation}
                      </p>
                    </div>
                  </div>
                )}

                {/* ================================================================
                    SCHEDA 3: GESTIONE PEDINE (AGGIUNGI, ELIMINA, RUOLO, NUMERO, MODULO)
                   ================================================================ */}
                {rightTab === 'giocatori' && (
                  <div className="space-y-3.5">
                    {/* Selettore Moduli con Badge AUTO vs MANUALE */}
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                      <div className="text-xs font-bold text-zinc-200">Riconoscimento Moduli Tattici</div>
                      
                      {/* Modulo Squadra A (Blu) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-blue-400 font-semibold">Modulo Squadra Blu:</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            manualFormationHome
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {manualFormationHome ? `MANUALE: ${manualFormationHome}` : `AUTO: ${homeDetected.formation}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={manualFormationHome || ''}
                            onChange={(e) => setManualFormationHome(e.target.value || null)}
                            className="flex-1 px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                          >
                            <option value="">Rilevamento Automatico ({homeDetected.formation})</option>
                            <option value="4-3-3">4-3-3</option>
                            <option value="4-2-3-1">4-2-3-1</option>
                            <option value="3-5-2">3-5-2</option>
                            <option value="3-4-2-1">3-4-2-1</option>
                            <option value="4-4-2">4-4-2</option>
                            <option value="5-3-2">5-3-2</option>
                          </select>
                          {manualFormationHome && (
                            <button
                              onClick={() => setManualFormationHome(null)}
                              className="text-[10px] text-zinc-400 hover:text-zinc-200 underline shrink-0"
                            >
                              Auto
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Modulo Squadra B (Rossa) */}
                      <div className="space-y-1 pt-1.5 border-t border-zinc-800/60">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-red-400 font-semibold">Modulo Squadra Rossa:</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            manualFormationAway
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {manualFormationAway ? `MANUALE: ${manualFormationAway}` : `AUTO: ${awayDetected.formation}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={manualFormationAway || ''}
                            onChange={(e) => setManualFormationAway(e.target.value || null)}
                            className="flex-1 px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                          >
                            <option value="">Rilevamento Automatico ({awayDetected.formation})</option>
                            <option value="4-3-3">4-3-3</option>
                            <option value="4-2-3-1">4-2-3-1</option>
                            <option value="3-5-2">3-5-2</option>
                            <option value="3-4-2-1">3-4-2-1</option>
                            <option value="4-4-2">4-4-2</option>
                            <option value="5-3-2">5-3-2</option>
                          </select>
                          {manualFormationAway && (
                            <button
                              onClick={() => setManualFormationAway(null)}
                              className="text-[10px] text-zinc-400 hover:text-zinc-200 underline shrink-0"
                            >
                              Auto
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <h4 className="font-bold text-zinc-100">Pedine Presenti nel Frame</h4>
                      <span className="font-mono text-zinc-400">
                        Totale: {storePlayers.length} (A: {homePlayersList.length}, B: {awayPlayersList.length})
                      </span>
                    </div>

                    {/* Lista Squadra A */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-blue-400 border-b border-blue-900/50 pb-1">
                        <span>SQUADRA A (BLU) — {homePlayersList.length}/11</span>
                        <button
                          onClick={() => addPlayer('home')}
                          disabled={homePlayersList.length >= 11}
                          className="text-[10px] px-2 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 text-blue-200 disabled:opacity-40"
                        >
                          + Aggiungi Pedina
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {homePlayersList.map((p) => (
                          <div
                            key={p.id}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                              selectedPlayerId === p.id
                                ? 'bg-blue-950/40 border-blue-500'
                                : 'bg-zinc-900/50 border-zinc-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                                {p.number}
                              </span>
                              <div className="truncate">
                                <div className="font-medium text-zinc-200 truncate">{p.archetypeName}</div>
                                <div className="text-[10px] text-zinc-500 font-mono">
                                  ({p.x.toFixed(0)}m, {p.y.toFixed(0)}m) · {p.foot}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <select
                                value={p.archetypeId}
                                onChange={(e) => {
                                  const arch = PLAYER_ARCHETYPES_30.find((a) => a.id === Number(e.target.value));
                                  if (arch) {
                                    updatePlayer(p.id, {
                                      archetypeId: arch.id,
                                      archetypeName: arch.name,
                                      role: arch.name,
                                      positionGroup: arch.positionGroup,
                                    });
                                  }
                                }}
                                className="text-[10px] bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200"
                              >
                                {PLAYER_ARCHETYPES_30.map((arch) => (
                                  <option key={arch.id} value={arch.id}>
                                    {arch.name}
                                  </option>
                                ))}
                              </select>

                              <button
                                onClick={() => {
                                  removePlayer(p.id);
                                  if (selectedPlayerId === p.id) setSelectedPlayerId('');
                                }}
                                className="p-1 text-zinc-500 hover:text-red-400"
                                title="Rimuovi pedina dal frame"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Lista Squadra B */}
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <div className="flex items-center justify-between text-[11px] font-bold text-red-400 border-b border-red-900/50 pb-1">
                        <span>SQUADRA B (ROSSA) — {awayPlayersList.length}/11</span>
                        <button
                          onClick={() => addPlayer('away')}
                          disabled={awayPlayersList.length >= 11}
                          className="text-[10px] px-2 py-0.5 rounded bg-red-900/60 hover:bg-red-800 text-red-200 disabled:opacity-40"
                        >
                          + Aggiungi Pedina
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {awayPlayersList.map((p) => (
                          <div
                            key={p.id}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                              selectedPlayerId === p.id
                                ? 'bg-red-950/40 border-red-500'
                                : 'bg-zinc-900/50 border-zinc-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-red-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                                {p.number}
                              </span>
                              <div className="truncate">
                                <div className="font-medium text-zinc-200 truncate">{p.archetypeName}</div>
                                <div className="text-[10px] text-zinc-500 font-mono">
                                  ({p.x.toFixed(0)}m, {p.y.toFixed(0)}m) · {p.foot}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <select
                                value={p.archetypeId}
                                onChange={(e) => {
                                  const arch = PLAYER_ARCHETYPES_30.find((a) => a.id === Number(e.target.value));
                                  if (arch) {
                                    updatePlayer(p.id, {
                                      archetypeId: arch.id,
                                      archetypeName: arch.name,
                                      role: arch.name,
                                      positionGroup: arch.positionGroup,
                                    });
                                  }
                                }}
                                className="text-[10px] bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200"
                              >
                                {PLAYER_ARCHETYPES_30.map((arch) => (
                                  <option key={arch.id} value={arch.id}>
                                    {arch.name}
                                  </option>
                                ))}
                              </select>

                              <button
                                onClick={() => {
                                  removePlayer(p.id);
                                  if (selectedPlayerId === p.id) setSelectedPlayerId('');
                                }}
                                className="p-1 text-zinc-500 hover:text-red-400"
                                title="Rimuovi pedina dal frame"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ================================================================
                    SCHEDA 3: CALIBRAZIONE CAMERA, INQUADRATURA & OMOGRAFIA H
                   ================================================================ */}
                {rightTab === 'calibrazione' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100 flex items-center justify-between">
                        <span>Posizionamento Campo & Omografia H</span>
                        <span className="font-mono text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Errore: {reprojectionErrorPx}m
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
                        Scegli la zona inquadrata nel frame, sposta il campo con i tasti direzionali o trascina i 4 punti di ancoraggio sul video.
                      </p>
                    </div>

                    {/* 1. PRESET RAPIDI DI INQUADRATURA (CAMPO INTERO, AREE RIGORE, CENTROCAMPO) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                        <span>1. Zona Inquadrata nel Frame (Preset)</span>
                        <span className="text-[10px] text-zinc-500 font-mono">6 Zone</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {CALIBRATION_ZONE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => handleApplyZonePreset(preset)}
                            className="p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-blue-500/50 text-left transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-200 group-hover:text-blue-300">
                                {preset.name}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400 font-semibold bg-zinc-800 px-1.5 py-0.5 rounded">
                                {preset.badge}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1 line-clamp-1 leading-tight">
                              {preset.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. PULSANTIERA SPOSTAMENTO & ZOOM DEL CAMPO (PAN & SCALE) */}
                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                        <span>2. Regolazione Fine (Sposta & Zoom)</span>
                        <button
                          onClick={handleResetKeypoints}
                          className="text-[10px] text-zinc-400 hover:text-amber-400 flex items-center gap-1 font-mono transition-colors"
                          title="Ripristina i 4 riferimenti standard"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Reset
                        </button>
                      </div>

                      {/* Direction Pad & Zoom Buttons */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <div />
                        <button
                          onClick={() => handlePanField(0, -4)}
                          className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1"
                          title="Sposta il campo verso l'alto (-4m Y)"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                          Alto
                        </button>
                        <button
                          onClick={() => handleZoomField(0.9)}
                          className="px-2 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-800/60 text-xs font-semibold flex items-center justify-center gap-1"
                          title="Zoom In: restringe il campo inquadrato (+10%)"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          Zoom +
                        </button>

                        <button
                          onClick={() => handlePanField(-5, 0)}
                          className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1"
                          title="Sposta il campo verso sinistra (-5m X)"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          SX (-5m)
                        </button>
                        <button
                          onClick={() => handlePanField(0, 4)}
                          className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1"
                          title="Sposta il campo verso il basso (+4m Y)"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                          Basso
                        </button>
                        <button
                          onClick={() => handlePanField(5, 0)}
                          className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1"
                          title="Sposta il campo verso destra (+5m X)"
                        >
                          DX (+5m)
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <div />
                        <div />
                        <button
                          onClick={() => handleZoomField(1.1)}
                          className="px-2 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-800/60 text-xs font-semibold flex items-center justify-center gap-1"
                          title="Zoom Out: allarga il campo inquadrato (-10%)"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                          Zoom -
                        </button>
                      </div>

                      {/* Toggle Linee Campo Canoniche */}
                      <div className="pt-1 flex items-center justify-between border-t border-zinc-800 text-xs">
                        <span className="text-zinc-400">Linee Proiettate sul Video:</span>
                        <button
                          onClick={() => setShowProjectedFieldLines(!showProjectedFieldLines)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                            showProjectedFieldLines
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {showProjectedFieldLines ? '✓ Visibili' : 'Nascoste'}
                        </button>
                      </div>
                    </div>

                    {/* 3. COORDINATE DEI 4 PUNTI CHIAVE (PITCH X / PITCH Y) */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-zinc-200">
                        3. Coordinate Metriche dei Punti Ancoraggio (X, Y)
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {currentKeypoints.map((kp) => (
                          <div
                            key={kp.id}
                            className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5 text-xs font-mono"
                          >
                            <div className="text-zinc-200 font-semibold flex items-center justify-between">
                              <span>{kp.id.toUpperCase()}</span>
                              <span className="text-[10px] text-zinc-400 font-normal truncate max-w-[100px]">
                                {kp.label}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              Frame: u={kp.imageU.toFixed(2)}, v={kp.imageV.toFixed(2)}
                            </div>
                            <div className="flex items-center justify-between gap-1 text-[11px] pt-1 border-t border-zinc-800/60">
                              <span className="text-zinc-400">X: {kp.pitchX}m</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleUpdateKeypointCoord(kp.id, 'pitchX', -2)}
                                  className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px]"
                                  title="Diminuisci X (-2m)"
                                >
                                  -2
                                </button>
                                <button
                                  onClick={() => handleUpdateKeypointCoord(kp.id, 'pitchX', 2)}
                                  className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px]"
                                  title="Aumenta X (+2m)"
                                >
                                  +2
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-1 text-[11px]">
                              <span className="text-zinc-400">Y: {kp.pitchY}m</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleUpdateKeypointCoord(kp.id, 'pitchY', -2)}
                                  className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px]"
                                  title="Diminuisci Y (-2m)"
                                >
                                  -2
                                </button>
                                <button
                                  onClick={() => handleUpdateKeypointCoord(kp.id, 'pitchY', 2)}
                                  className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px]"
                                  title="Aumenta Y (+2m)"
                                >
                                  +2
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Matrice H Risolta */}
                    <div className="p-3 rounded-xl bg-[#09090D] border border-zinc-800 font-mono text-[11px] space-y-1">
                      <div className="text-zinc-500 mb-1">Matrice H ∈ PGL(3, ℝ) (DLT 8x8 Solver):</div>
                      {H.map((row, rIdx) => (
                        <div key={rIdx} className="flex justify-between px-1 text-zinc-300">
                          {row.map((val, cIdx) => (
                            <span key={cIdx}>{val.toFixed(3)}</span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ================================================================
                    SCHEDA 5: PATTERN RECOGNITION & MAESTRI
                   ================================================================ */}
                {rightTab === 'pattern_maestri' && (
                  <div className="space-y-3">
                    {/* Box Pattern Riconosciuto Dinamicamente (AUTO vs MANUALE) */}
                    <div className="p-3 rounded-xl bg-zinc-900/70 border border-[#00E5FF]/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold">Pattern Riconosciuto</div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          manualPattern
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {manualPattern ? 'MANUALE' : `AUTO (${detectedPattern.confidence}%)`}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-100">
                        {manualPattern || detectedPattern.name}
                      </h4>
                      <p className="text-[11px] text-zinc-400 leading-tight">
                        {detectedPattern.description}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <select
                          value={manualPattern || ''}
                          onChange={(e) => setManualPattern(e.target.value || null)}
                          className="flex-1 px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                        >
                          <option value="">Riconoscimento Automatico ({detectedPattern.name})</option>
                          {COACHING_STRATEGIES_CATALOG.map((strat) => (
                            <option key={strat.id} value={strat.name}>
                              {strat.name} ({strat.coach})
                            </option>
                          ))}
                        </select>
                        {manualPattern && (
                          <button
                            onClick={() => setManualPattern(null)}
                            className="text-[10px] text-zinc-400 hover:text-zinc-200 underline shrink-0"
                          >
                            Auto
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
                        Database Pattern Recognition
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">6 Maestri</span>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Confronto in tempo reale tra la disposizione sul frame e i principi tattici codificati dei grandi allenatori:
                    </p>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {COACHING_STRATEGIES_CATALOG.map((strat) => {
                        // Calcola affinità euristica (numero di difensori/centrocampisti conformi)
                        const isMatchForm =
                          strat.formation === homeDetected.formation ||
                          strat.formation === awayDetected.formation;

                        return (
                          <div
                            key={strat.id}
                            className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="text-xs font-bold text-zinc-100">{strat.name}</h5>
                                <div className="text-[10px] text-[#00E5FF] font-medium">
                                  {strat.coach} · {strat.school} ({strat.formation})
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                  isMatchForm
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {isMatchForm ? 'Modulo Compatibile' : 'Pattern Studio'}
                              </span>
                            </div>

                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                              {strat.description}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                              <span className="text-[10px] font-mono text-zinc-500">
                                {strat.keyTacticalPrinciples.slice(0, 2).join(' · ')}
                              </span>
                              {onOpenScenarioOnBoard && (
                                <button
                                  onClick={() => {
                                    // Aggiunge un tag tattico istantaneo
                                    if (onOpenGlossaryEntry) {
                                      onOpenGlossaryEntry(strat.id);
                                    }
                                  }}
                                  className="text-[11px] font-semibold text-[#00E5FF] hover:underline"
                                >
                                  Approfondisci Teoria →
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
    </div>
  );
};

function drawBroadcastReferenceFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  perspective: 'Broadcast' | 'Tactical High / Drone' | 'Goal-Line / Set-Piece',
  keypoints: CalibrationKeypoint[]
) {
  ctx.fillStyle = '#070B12';
  ctx.fillRect(0, 0, w, h);

  const kp1 = keypoints[0] || { imageU: 0.16, imageV: 0.22 };
  const kp2 = keypoints[1] || { imageU: 0.06, imageV: 0.88 };
  const kp3 = keypoints[2] || { imageU: 0.84, imageV: 0.22 };
  const kp4 = keypoints[3] || { imageU: 0.94, imageV: 0.88 };

  const topLeftX = kp1.imageU * w;
  const topY = ((kp1.imageV + kp3.imageV) / 2) * h;
  const topRightX = kp3.imageU * w;
  const botLeftX = kp2.imageU * w;
  const botRightX = kp4.imageU * w;
  const botY = ((kp2.imageV + kp4.imageV) / 2) * h;

  ctx.beginPath();
  ctx.moveTo(topLeftX, topY);
  ctx.lineTo(topRightX, topY);
  ctx.lineTo(botRightX, botY);
  ctx.lineTo(botLeftX, botY);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, topY, 0, botY);
  grad.addColorStop(0, perspective === 'Tactical High / Drone' ? '#0B1926' : '#0D1E2E');
  grad.addColorStop(1, '#0F2437');
  ctx.fillStyle = grad;
  ctx.fill();

  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) continue;
    const f1 = i / 10;
    const f2 = (i + 1) / 10;
    ctx.beginPath();
    ctx.moveTo(topLeftX + (topRightX - topLeftX) * f1, topY);
    ctx.lineTo(topLeftX + (topRightX - topLeftX) * f2, topY);
    ctx.lineTo(botLeftX + (botRightX - botLeftX) * f2, botY);
    ctx.lineTo(botLeftX + (botRightX - botLeftX) * f1, botY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(226, 232, 240, 0.38)';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo((topLeftX + topRightX) / 2, topY);
  ctx.lineTo((botLeftX + botRightX) / 2, botY);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(w / 2, (topY + botY) / 2, w * 0.095, (botY - topY) * 0.15, 0, 0, Math.PI * 2);
  ctx.stroke();
}
