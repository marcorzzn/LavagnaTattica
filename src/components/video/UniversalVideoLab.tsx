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
} from 'lucide-react';
import {
  CalibrationKeypoint,
  PlayerNode,
  TacticalState,
  TacticalTag,
} from '../../core/types';
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
import { useStudioStore } from '../../stores/studioStore';
import { useTranslation } from 'react-i18next';

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
  | 'calibrate_homography';

type RightPanelTab = 'analisi' | 'giocatori' | 'calibrazione' | 'pattern_maestri';

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
  const [showPose17, setShowPose17] = useState<boolean>(false);
  const [showHomographyGrid, setShowHomographyGrid] = useState<boolean>(false);
  const [showAllLabels, setShowAllLabels] = useState<boolean>(false);

  // Entità in Drag & Drop sul Canvas
  const [draggingEntity, setDraggingEntity] = useState<
    | { type: 'player'; id: string }
    | { type: 'ball' }
    | { type: 'kp'; id: string }
    | { type: 'arrow_from' }
    | { type: 'arrow_to' }
    | null
  >(null);

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
    }),
    [actionProps, storeBall.x, storeBall.y, analyzingTeam, attackDirection]
  );

  // Calcolo Valutazione Azione (Fisica del Tiro, Fuorigioco, Portiere, Cover Shadow, Pressing)
  const actionEvaluation = useMemo(
    () => evaluateHumanDrawnAction(liveState, liveActionProps),
    [liveState, liveActionProps]
  );

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
    }
  };

  const handleSvgMouseUp = () => {
    if (draggingEntity) {
      setDraggingEntity(null);
      onSyncTrackedPositionsToLab(storePlayers, homeDetected.formation, awayDetected.formation);
    }
  };

  const selectedPlayer = useMemo(
    () => storePlayers.find((p) => p.id === selectedPlayerId) || storePlayers[0],
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
    <div className="space-y-4">
      {/* HEADER DELLA MODALITA' (Analisi Video vs Certificazione Benchmark) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('analysis')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              viewMode === 'analysis'
                ? 'bg-[#00E5FF] text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t('video.mode_analysis', 'Analisi Video & Match Lab')}</span>
          </button>

          <button
            onClick={() => setViewMode('certification')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              viewMode === 'certification'
                ? 'bg-amber-400 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('video.mode_benchmark', 'Certificazione Benchmark (12 Dimensioni & IC 95%)')}</span>
          </button>
        </div>

        {/* Pulsanti Export / Import Progetto */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportProjectClick}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5 transition-colors"
            title="Scarica il file completo di progetto (.json) per riprenderlo quando vuoi"
          >
            <Download className="w-3.5 h-3.5 text-[#00E5FF]" />
            Esporta Progetto
          </button>

          <label className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            Importa Progetto
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

      {viewMode === 'certification' ? (
        <Benchmark12Dimensions state={liveState} metrics={liveMetrics} />
      ) : (
        <>
          {/* DOSSIER PARTITA: CARTELLA DEI FRAME / SCENE MULTIPLE */}
          <div className="px-4 py-2.5 rounded-xl bg-[#111116] border border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 mr-1 shrink-0">
                <Layers className="w-3.5 h-3.5 text-[#00E5FF]" />
                Dossier Frame:
              </span>
              {scenes.map((sc, idx) => (
                <div key={sc.id} className="flex items-center shrink-0">
                  <button
                    onClick={() => switchScene(sc.id)}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1.5 ${
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
                      className="ml-1 p-1 text-zinc-600 hover:text-red-400 transition-colors"
                      title="Elimina questo frame dal progetto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addScene()}
                className="px-2.5 py-1 text-xs rounded-lg border border-dashed border-zinc-700 hover:border-[#00E5FF] text-zinc-400 hover:text-[#00E5FF] flex items-center gap-1 shrink-0 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Nuovo Frame
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="px-3 py-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                Carica Frame / Video
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
                className="px-3 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {syncedBadge ? 'Sincronizzato OK' : 'Salva Posizioni'}
              </button>
            </div>
          </div>

          {/* BARRA CONTESTO: SQUADRA DI RIFERIMENTO + MODULI RILEVATI + DIREZIONE ATTACCO */}
          <div className="px-4 py-2.5 rounded-xl bg-[#0F0F14] border border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Selettore Prospettiva di Analisi */}
              <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                <span className="text-[11px] text-zinc-400 px-1.5">Analizza per:</span>
                <button
                  onClick={() => setAnalyzingTeam('home')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                    analyzingTeam === 'home'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-300" />
                  Squadra A ({homePlayersList.length} pedine)
                </button>
                <button
                  onClick={() => setAnalyzingTeam('away')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                    analyzingTeam === 'away'
                      ? 'bg-red-600 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-300" />
                  Squadra B ({awayPlayersList.length} pedine)
                </button>
              </div>

              {/* Riconoscimento Modulo Intelligente */}
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="font-mono text-blue-400 font-semibold">
                  A: {homeDetected.formation} (rilevato)
                </span>
                <span className="text-zinc-600">vs</span>
                <span className="font-mono text-red-400 font-semibold">
                  B: {awayDetected.formation} (rilevato)
                </span>
              </div>

              {/* Toggle Direzione di Attacco */}
              <button
                onClick={() => setAttackDirection(attackDirection === 'right' ? 'left' : 'right')}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-md border border-zinc-800 flex items-center gap-1"
                title="Inverti la direzione delle porte attaccate"
              >
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                {attackDirection === 'right' ? 'A attacca →' : '← A attacca'}
              </button>
            </div>

            {/* Possesso Palla Deterministico */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Possesso:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded font-mono ${
                  effectivePossessionTeam === 'home'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {effectivePossessionTeam === 'home' ? 'Squadra A (Blu)' : 'Squadra B (Rossa)'}
                {ballCarrier ? ` · #${ballCarrier.number} ${ballCarrier.archetypeName}` : ' (Palla contesa)'}
              </span>
            </div>
          </div>

          {/* LAYOUT PRINCIPALE: BARRA CHESS.COM BICOLORE (70%) / PANNELLO SCHEDE (30%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* COLONNA SINISTRA / CENTRALE (~70% -> 8 su 12): BARRA + CANVAS + TIMELINE */}
            <div className="lg:col-span-8 space-y-3">
              {/* Barra Strumenti del Canvas */}
              <div className="px-3.5 py-2 rounded-xl bg-[#111116] border border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setToolMode('drag_players')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                      toolMode === 'drag_players'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Move className="w-3.5 h-3.5" />
                    Sposta Pedine
                  </button>

                  <button
                    onClick={() => setToolMode('place_ball')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                      toolMode === 'place_ball'
                        ? 'bg-amber-400 text-zinc-950 font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <CircleDot className="w-3.5 h-3.5" />
                    Posiziona Palla
                  </button>

                  <button
                    onClick={() => setToolMode('draw_action')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                      toolMode === 'draw_action'
                        ? 'bg-amber-400 text-zinc-950 font-semibold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Traccia Freccia
                  </button>

                  {/* Aggiunta Rapida Pedine */}
                  <button
                    onClick={() => {
                      const p = addPlayer('home');
                      setSelectedPlayerId(p.id);
                    }}
                    disabled={homePlayersList.length >= 11}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-800/60 flex items-center gap-1 disabled:opacity-40"
                    title="Aggiungi una pedina alla Squadra A (max 11)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Blu ({homePlayersList.length}/11)
                  </button>

                  <button
                    onClick={() => {
                      const p = addPlayer('away');
                      setSelectedPlayerId(p.id);
                    }}
                    disabled={awayPlayersList.length >= 11}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 flex items-center gap-1 disabled:opacity-40"
                    title="Aggiungi una pedina alla Squadra B (max 11)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Rosso ({awayPlayersList.length}/11)
                  </button>

                  <button
                    onClick={() => {
                      setToolMode('calibrate_homography');
                      setRightTab('calibrazione');
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                      toolMode === 'calibrate_homography'
                        ? 'bg-zinc-200 text-zinc-950 font-semibold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    Calibra
                  </button>
                </div>

                {/* Toggles Visivi Tattici */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowTacticalCorridors(!showTacticalCorridors)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      showTacticalCorridors
                        ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                    title="Mostra i 5 corridoi verticali e la Zona 14"
                  >
                    5 Corridoi
                  </button>

                  <button
                    onClick={() => setShowOffsideLine(!showOffsideLine)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      showOffsideLine
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                    title="Visualizza la linea del penultimo difendente avversario"
                  >
                    Fuorigioco
                  </button>

                  <button
                    onClick={() => setShowPerspectiveHeatmap(!showPerspectiveHeatmap)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      showPerspectiveHeatmap
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    Heatmap
                  </button>

                  <button
                    onClick={() => setShowAllLabels(!showAllLabels)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors flex items-center gap-1 ${
                      showAllLabels
                        ? 'bg-zinc-800 text-zinc-200 border-zinc-600'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    Nomi
                  </button>
                </div>
              </div>

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
                    </defs>

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

                    {/* 2. Linea Fuorigioco Dinamica */}
                    {(showOffsideLine || actionEvaluation.isOffside) &&
                      (() => {
                        const targetX = actionEvaluation.actorTeam === 'home' ? 120 : 0;
                        const opps = storePlayers.filter((p) => p.team !== actionEvaluation.actorTeam);
                        const sortedOpps = opps
                          .slice()
                          .sort((a, b) => Math.abs(a.x - targetX) - Math.abs(b.x - targetX));
                        const secondLastDef = sortedOpps[1] || sortedOpps[0];
                        if (!secondLastDef) return null;

                        const off0 = projectPitchToImage(secondLastDef.x, 0, HInv);
                        const off1 = projectPitchToImage(secondLastDef.x, 80, HInv);
                        const strokeColor = actionEvaluation.isOffside ? '#EF4444' : '#F59E0B';

                        return (
                          <g className="pointer-events-none">
                            <line
                              x1={off0.u * 1000}
                              y1={off0.v * 562.5}
                              x2={off1.u * 1000}
                              y2={off1.v * 562.5}
                              stroke={strokeColor}
                              strokeWidth="2.5"
                              strokeDasharray="6 4"
                            />
                            <text
                              x={off0.u * 1000 + 6}
                              y={off0.v * 562.5 + 16}
                              fontSize="10"
                              fill={strokeColor}
                              className="font-mono font-bold"
                            >
                              {actionEvaluation.isOffside
                                ? 'LINEA FUORIGIOCO (OFFSIDE!)'
                                : 'LINEA FUORIGIOCO'}
                            </text>
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

                    {/* 5. Pedine Giocatori (Blu = Squadra A, Rosso = Squadra B) */}
                    {storePlayers.map((player) => {
                      const uv = projectPitchToImage(player.x, player.y, HInv);
                      const px = uv.u * 1000;
                      const py = uv.v * 562.5;
                      const isHome = player.team === 'home';
                      const isSelected = player.id === selectedPlayerId;
                      const isHovered = player.id === hoveredPlayerId;
                      const isCarrier = ballCarrier?.id === player.id;
                      const isBlocker = actionEvaluation.criticalBlocker?.defenderId === player.id;

                      const strokeColor = isHome ? '#60A5FA' : '#F87171';
                      const fillColor = isHome ? '#1D4ED8' : '#B91C1C';
                      const showBadge = showAllLabels || isSelected || isHovered;

                      return (
                        <g
                          key={player.id}
                          transform={`translate(${px}, ${py})`}
                          className="cursor-grab active:cursor-grabbing"
                          onMouseEnter={() => setHoveredPlayerId(player.id)}
                          onMouseLeave={() => setHoveredPlayerId(null)}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedPlayerId(player.id);
                            setDraggingEntity({ type: 'player', id: player.id });
                          }}
                        >
                          {/* Anello evidenziatore */}
                          {(isSelected || isBlocker || isCarrier) && (
                            <circle
                              cx={0}
                              cy={0}
                              r={16}
                              fill="none"
                              stroke={isCarrier ? '#FACC15' : isBlocker ? '#F59E0B' : '#00E5FF'}
                              strokeWidth="2.2"
                              strokeDasharray={isBlocker ? '3 2' : 'none'}
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
                            strokeWidth={isSelected ? 2.4 : 1.5}
                          />
                          <text
                            x={0}
                            y={3.5}
                            textAnchor="middle"
                            fontSize="9.5"
                            fill="#FFFFFF"
                            className="font-mono font-bold pointer-events-none"
                          >
                            {player.number}
                          </text>

                          {/* Nome Esteso su Hover / Selezione */}
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
                                fill="#F8FAFC"
                                className="font-sans font-medium"
                              >
                                {player.archetypeName} ({player.x.toFixed(0)}m, {player.y.toFixed(0)}m)
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* 6. Il Pallone Ufficiale (Marker Dedicato e Trascinabile) */}
                    {(() => {
                      const ballUv = projectPitchToImage(storeBall.x, storeBall.y, HInv);
                      const bx = ballUv.u * 1000;
                      const by = ballUv.v * 562.5;

                      return (
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
                      );
                    })()}

                    {/* 7. Traiettoria Freccia Disegnata in GIALLO */}
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

                      return (
                        <g>
                          {liftPx > 6 && (
                            <line
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke="#FACC15"
                              strokeOpacity="0.25"
                              strokeWidth="1.5"
                              strokeDasharray="4 4"
                            />
                          )}

                          <path
                            d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                            fill="none"
                            stroke={actionEvaluation.isOffside ? '#EF4444' : '#FACC15'}
                            strokeWidth="3.2"
                            markerEnd="url(#arrow-yellow-selected)"
                          />

                          {/* Punta della freccia trascinabile */}
                          <circle
                            cx={x2}
                            cy={y2}
                            r={8.5}
                            fill="#FACC15"
                            fillOpacity="0.4"
                            stroke="#FACC15"
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

              {/* TIMELINE / CONTROLLI SCRUBBER */}
              <div className="px-4 py-2.5 rounded-xl bg-[#111116] border border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => {
                      const next = !isPlayingVideo;
                      setIsPlayingVideo(next);
                      if (videoRef.current) {
                        if (next) videoRef.current.play();
                        else videoRef.current.pause();
                      }
                    }}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium rounded-lg flex items-center gap-1.5 shrink-0"
                  >
                    {isPlayingVideo ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-400" />
                        Pausa
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-blue-400" />
                        Play
                      </>
                    )}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={videoRef.current?.duration || 90}
                    step={0.1}
                    value={currentTimeSec}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCurrentTimeSec(val);
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="flex-1 accent-blue-500"
                  />

                  <span className="text-xs font-mono text-zinc-400 shrink-0">
                    {currentTimeSec.toFixed(1)}s
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-400 border-l border-zinc-800 pl-4">
                  <div>
                    Controllo Squadra A:{' '}
                    <span className="font-mono font-semibold text-blue-400">
                      {pitchControlData.homeAvg}%
                    </span>
                  </div>
                  <div>
                    Zona 14:{' '}
                    <span className="font-mono font-semibold text-zinc-200">
                      {pitchControlData.zone14Avg}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* COLONNA DESTRA (~30% -> 4 su 12): PANNELLO A SCHEDE */}
            <div className="lg:col-span-4 rounded-xl bg-[#111116] border border-zinc-800/80 overflow-hidden">
              {/* Intestazione Schede */}
              <div className="grid grid-cols-4 border-b border-zinc-800 bg-[#0C0C10]">
                {(
                  [
                    { id: 'analisi', label: 'Analisi' },
                    { id: 'giocatori', label: 'Pedine' },
                    { id: 'calibrazione', label: 'Calibra' },
                    { id: 'pattern_maestri', label: 'Maestri' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setRightTab(tab.id)}
                    className={`py-3 text-[11px] sm:text-xs font-semibold transition-colors border-b-2 truncate px-1 ${
                      rightTab === tab.id
                        ? 'border-[#00E5FF] text-[#00E5FF] bg-[#111116]'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4 space-y-4">
                {/* ================================================================
                    SCHEDA 1: ANALISI & MOSSE STILE CHESS.COM
                   ================================================================ */}
                {rightTab === 'analisi' && (
                  <div className="space-y-4">
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
                            actionEvaluation.classification === 'Best Move (!!)'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : actionEvaluation.classification === 'Good Alternative (!)'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                : actionEvaluation.classification === 'Inaccuracy (?)'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
                          }`}
                        >
                          {actionEvaluation.classification}
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
                    SCHEDA 2: GESTIONE PEDINE (AGGIUNGI, ELIMINA, RUOLO, NUMERO)
                   ================================================================ */}
                {rightTab === 'giocatori' && (
                  <div className="space-y-4">
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
                                onClick={() => removePlayer(p.id)}
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
                                onClick={() => removePlayer(p.id)}
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
                    SCHEDA 3: CALIBRAZIONE CAMERA & OMOGRAFIA H
                   ================================================================ */}
                {rightTab === 'calibrazione' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">Setup Camera & Omografia Planare H</h4>
                      <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
                        Trascina i 4 riferimenti sul frame per adattare il campo reale 120×80m alla prospettiva della telecamera.
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs">
                      <span className="text-zinc-400">Errore medio riproiezione:</span>
                      <span className="font-mono font-semibold text-emerald-400">
                        {reprojectionErrorPx} m
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {currentKeypoints.map((kp) => (
                        <div
                          key={kp.id}
                          className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs font-mono"
                        >
                          <div className="text-zinc-200 font-semibold">
                            {kp.id.toUpperCase()} → ({kp.pitchX}m, {kp.pitchY}m)
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            u={kp.imageU}, v={kp.imageV}
                          </div>
                        </div>
                      ))}
                    </div>

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
                    SCHEDA 4: PATTERN RECOGNITION & MAESTRI (EX BOTONIERA INTEGRATA)
                   ================================================================ */}
                {rightTab === 'pattern_maestri' && (
                  <div className="space-y-3">
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
        </>
      )}
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
