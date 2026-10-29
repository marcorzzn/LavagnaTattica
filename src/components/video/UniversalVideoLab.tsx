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
} from 'lucide-react';
import {
  CalibrationKeypoint,
  PlayerNode,
  TacticalState,
} from '../../core/types';
import {
  computePitchControlGrid,
  computePlanarHomographyDLT,
  projectImageToPitch,
} from '../../engine/mathEngine';
import {
  ContactExecutionStyle,
  ContactFootOrHead,
  DrawnActionCategory,
  evaluateHumanDrawnAction,
  invertHomography3x3,
  projectPitchToImage,
  VisualActionProperties,
} from '../../engine/humanInTheLoopEngine';
import {
  runFullMultiStageCVPipeline,
  estimateBiomechanicalPose17,
} from '../../engine/cvRolePipeline';
import { PLAYER_ARCHETYPES_30 } from '../../core/presets';

interface UniversalVideoLabProps {
  tacticalState: TacticalState;
  onSyncTrackedPositionsToLab: (
    updatedPlayers: PlayerNode[],
    inferredHomeForm: string,
    inferredAwayForm: string
  ) => void;
}

const DEFAULT_KEYPOINTS: CalibrationKeypoint[] = [
  { id: 'kp-1', label: 'Angolo Sup SX (18m, 14m)', imageU: 0.16, imageV: 0.22, pitchX: 18, pitchY: 14 },
  { id: 'kp-2', label: 'Angolo Inf SX (18m, 66m)', imageU: 0.06, imageV: 0.88, pitchX: 18, pitchY: 66 },
  { id: 'kp-3', label: 'Angolo Sup DX (96m, 14m)', imageU: 0.84, imageV: 0.22, pitchX: 96, pitchY: 14 },
  { id: 'kp-4', label: 'Angolo Inf DX (96m, 66m)', imageU: 0.94, imageV: 0.88, pitchX: 96, pitchY: 66 },
];

type InteractionToolMode = 'drag_players' | 'draw_action' | 'calibrate_homography';
type RightPanelTab = 'analisi' | 'calibrazione' | 'tipologie';

export const UniversalVideoLab: React.FC<UniversalVideoLabProps> = ({
  tacticalState,
  onSyncTrackedPositionsToLab,
}) => {
  // Sorgente Frame (Screenshot Immagine, Video in Pausa o Frame Tattico Riferimento)
  const [mediaSourceType, setMediaSourceType] = useState<
    'synthetic_frame' | 'uploaded_image' | 'uploaded_video'
  >('synthetic_frame');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedMediaName, setUploadedMediaName] = useState<string>('');
  const [perspectiveType, setPerspectiveType] = useState<
    'Broadcast' | 'Tactical High / Drone' | 'Goal-Line / Set-Piece'
  >('Broadcast');

  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(74.5);
  const [matchContextNote, setMatchContextNote] = useState<string>(
    'Transizione offensiva · Minuto 75 · Punteggio 1-0'
  );
  const [homeFormSelect, setHomeFormSelect] = useState<string>(
    tacticalState.homeFormation || '3-4-1-2'
  );
  const [awayFormSelect, setAwayFormSelect] = useState<string>(
    tacticalState.awayFormation || '3-5-2'
  );

  // Regola 1: Pannello Destro (30%) a Schede (Analisi | Setup Camera | Tipologie)
  const [rightTab, setRightTab] = useState<RightPanelTab>('analisi');

  // Regola 2: Sfoltimento del Canvas (Pose disattivata di default, etichette solo su hover/selezione)
  const [toolMode, setToolMode] = useState<InteractionToolMode>('drag_players');
  const [keypoints, setKeypoints] = useState<CalibrationKeypoint[]>(DEFAULT_KEYPOINTS);
  const [localPlayers, setLocalPlayers] = useState<PlayerNode[]>(tacticalState.players);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('home-10');
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
  const [selectedMoveRank, setSelectedMoveRank] = useState<number | 'custom'>('custom');

  const [draggingEntity, setDraggingEntity] = useState<
    | { type: 'player'; id: string }
    | { type: 'kp'; id: string }
    | { type: 'arrow_from' }
    | { type: 'arrow_to' }
    | null
  >(null);

  // Layer visivi puliti: Heatmap Blu/Rossa trasparente attiva, Pose 17-keypoint e Griglia H spente di default
  const [showPerspectiveHeatmap, setShowPerspectiveHeatmap] = useState<boolean>(true);
  const [showPose17, setShowPose17] = useState<boolean>(false);
  const [showHomographyGrid, setShowHomographyGrid] = useState<boolean>(false);
  const [showAllLabels, setShowAllLabels] = useState<boolean>(false);

  // Proprietà dell'Azione Disegnata e Parametri Visivi dell'Utente
  const [actionProps, setActionProps] = useState<VisualActionProperties>({
    actionCategory: 'Passaggio Filtrante',
    ballSpeedKmh: 62,
    ballHeightCm: 10,
    bodyPart: 'Destro',
    executionStyle: 'Di Prima',
    fromX: 60,
    fromY: 46,
    toX: 84,
    toY: 36,
  });

  const [syncedBadge, setSyncedBadge] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const synthCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlaySvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setLocalPlayers(tacticalState.players);
  }, [tacticalState.matchId]);

  // Calcolo Omografia H e Inversa H^{-1}
  const { H, reprojectionErrorPx } = useMemo(
    () => computePlanarHomographyDLT(keypoints),
    [keypoints]
  );
  const HInv = useMemo(() => invertHomography3x3(H), [H]);

  const liveState: TacticalState = useMemo(
    () => ({
      ...tacticalState,
      homeFormation: homeFormSelect,
      awayFormation: awayFormSelect,
      ballX: actionProps.fromX,
      ballY: actionProps.fromY,
      players: localPlayers,
    }),
    [
      tacticalState,
      homeFormSelect,
      awayFormSelect,
      actionProps.fromX,
      actionProps.fromY,
      localPlayers,
    ]
  );

  // Calcolo in Tempo Reale (latenza 0ms) del Pitch Control di Spearman e della Valutazione Chess.com
  const pitchControlData = useMemo(
    () => computePitchControlGrid(localPlayers, actionProps.fromX, actionProps.fromY),
    [localPlayers, actionProps.fromX, actionProps.fromY]
  );

  const actionEvaluation = useMemo(
    () => evaluateHumanDrawnAction(liveState, actionProps),
    [liveState, actionProps]
  );

  const pipelineDiag = useMemo(
    () =>
      runFullMultiStageCVPipeline(
        localPlayers,
        keypoints,
        actionProps.fromX,
        actionProps.fromY,
        currentTimeSec
      ),
    [localPlayers, keypoints, actionProps.fromX, actionProps.fromY, Math.floor(currentTimeSec)]
  );

  // Disegno dello sfondo del frame tattico se non c'è un file esterno caricato
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
        keypoints
      );
    }
  }, [mediaSourceType, perspectiveType, keypoints]);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedMediaName(file.name);

    if (file.type.startsWith('image/')) {
      setUploadedImageUrl(url);
      setMediaSourceType('uploaded_image');
    } else {
      setUploadedVideoUrl(url);
      setMediaSourceType('uploaded_video');
      setIsPlayingVideo(false);
    }
  };

  const getNormalizedUvFromEvent = (
    e: React.MouseEvent<SVGSVGElement>
  ): { u: number; v: number } => {
    if (!overlaySvgRef.current) return { u: 0.5, v: 0.5 };
    const rect = overlaySvgRef.current.getBoundingClientRect();
    const u = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0.02, Math.min(0.98, (e.clientY - rect.top) / rect.height));
    return { u: Number(u.toFixed(4)), v: Number(v.toFixed(4)) };
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (toolMode === 'draw_action' && !draggingEntity) {
      const { u, v } = getNormalizedUvFromEvent(e);
      const pt = projectImageToPitch(u, v, H);
      setSelectedMoveRank('custom');
      setActionProps((prev) => ({
        ...prev,
        fromX: pt.x,
        fromY: pt.y,
        toX: Math.min(118, pt.x + 14),
        toY: pt.y,
      }));
      setDraggingEntity({ type: 'arrow_to' });
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingEntity) return;
    const { u, v } = getNormalizedUvFromEvent(e);

    if (draggingEntity.type === 'kp') {
      setKeypoints((prev) =>
        prev.map((kp) =>
          kp.id === draggingEntity.id ? { ...kp, imageU: u, imageV: v } : kp
        )
      );
      return;
    }

    const pitchPt = projectImageToPitch(u, v, H);

    if (draggingEntity.type === 'player') {
      setLocalPlayers((prev) =>
        prev.map((p) =>
          p.id === draggingEntity.id
            ? {
                ...p,
                x: pitchPt.x,
                y: pitchPt.y,
                confidence: 1.0,
                sources: ['manual_entry'],
              }
            : p
        )
      );
      setSyncedBadge(false);
    } else if (draggingEntity.type === 'arrow_from') {
      setSelectedMoveRank('custom');
      setActionProps((prev) => ({ ...prev, fromX: pitchPt.x, fromY: pitchPt.y }));
    } else if (draggingEntity.type === 'arrow_to') {
      setSelectedMoveRank('custom');
      setActionProps((prev) => ({ ...prev, toX: pitchPt.x, toY: pitchPt.y }));
    }
  };

  const handleSvgMouseUp = () => {
    if (draggingEntity) {
      setDraggingEntity(null);
      onSyncTrackedPositionsToLab(localPlayers, homeFormSelect, awayFormSelect);
    }
  };

  const selectedPlayer = useMemo(
    () => localPlayers.find((p) => p.id === selectedPlayerId) || localPlayers[0],
    [localPlayers, selectedPlayerId]
  );

  const handleChangeSelectedArchetype = (newArchId: number) => {
    const arch = PLAYER_ARCHETYPES_30.find((a) => a.id === newArchId);
    if (!arch || !selectedPlayer) return;
    const updated = localPlayers.map((p) =>
      p.id === selectedPlayer.id
        ? {
            ...p,
            archetypeId: arch.id,
            archetypeName: arch.name,
            role: arch.name,
            positionGroup: arch.positionGroup,
            heightCm: arch.defaultHeightCm,
            foot: arch.defaultFoot,
            attributes: { ...arch.defaultStats },
          }
        : p
    );
    setLocalPlayers(updated);
    onSyncTrackedPositionsToLab(updated, homeFormSelect, awayFormSelect);
  };

  const handleNudgeSelectedPlayer = (dxMeters: number, dyMeters: number) => {
    if (!selectedPlayer) return;
    const updated = localPlayers.map((p) =>
      p.id === selectedPlayer.id
        ? {
            ...p,
            x: Number(Math.max(1, Math.min(119, p.x + dxMeters)).toFixed(1)),
            y: Number(Math.max(1, Math.min(79, p.y + dyMeters)).toFixed(1)),
          }
        : p
    );
    setLocalPlayers(updated);
    onSyncTrackedPositionsToLab(updated, homeFormSelect, awayFormSelect);
  };

  // Applica/Simula la mossa selezionata spostando palla e ricevente sul punto di destinazione
  const handleApplyAndSimulateMove = () => {
    const targetReceiver = localPlayers
      .filter((p) => p.team === 'home')
      .sort(
        (a, b) =>
          Math.hypot(a.x - actionProps.toX, a.y - actionProps.toY) -
          Math.hypot(b.x - actionProps.toX, b.y - actionProps.toY)
      )[0];

    const updated = localPlayers.map((p) =>
      targetReceiver && p.id === targetReceiver.id
        ? { ...p, x: actionProps.toX, y: actionProps.toY }
        : p
    );
    setLocalPlayers(updated);
    setActionProps((prev) => ({
      ...prev,
      fromX: prev.toX,
      fromY: prev.toY,
      toX: Math.min(118, prev.toX + 14),
    }));
    onSyncTrackedPositionsToLab(updated, homeFormSelect, awayFormSelect);
    setSyncedBadge(true);
  };

  const arrowStartUv = projectPitchToImage(actionProps.fromX, actionProps.fromY, HInv);
  const arrowEndUv = projectPitchToImage(actionProps.toX, actionProps.toY, HInv);

  // Calcolo percentuale per la Barra di Valutazione verticale stile Stockfish (-1.0 .. +1.0)
  const evalScore = actionEvaluation.compositeScore;
  const stockfishFillPct = Math.max(5, Math.min(95, Math.round(((evalScore + 1) / 2) * 100)));

  // Ricerca del ricevente più vicino alla punta della freccia per il titolo della Mossa Selezionata
  const targetReceiverNode = useMemo(() => {
    const home = localPlayers.filter((p) => p.team === 'home');
    return (
      home.sort(
        (a, b) =>
          Math.hypot(a.x - actionProps.toX, a.y - actionProps.toY) -
          Math.hypot(b.x - actionProps.toX, b.y - actionProps.toY)
      )[0] || home[0]
    );
  }, [localPlayers, actionProps.toX, actionProps.toY]);

  return (
    <div className="space-y-4">
      {/* TOP BAR PULITA DEL SIMULATORE: CONTESTO + AZIONI RAPIDE */}
      <div className="px-4 py-3 rounded-xl bg-[#111116] border border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="font-medium text-zinc-200">Squadra A ({homeFormSelect})</span>
            <span className="text-zinc-600">vs</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="font-medium text-zinc-200">Squadra B ({awayFormSelect})</span>
          </div>
          <span className="text-zinc-700">|</span>
          <input
            type="text"
            value={matchContextNote}
            onChange={(e) => setMatchContextNote(e.target.value)}
            className="px-2.5 py-1 text-xs bg-zinc-900/90 border border-zinc-800 rounded-md text-zinc-300 w-72 focus:outline-none focus:border-blue-500"
            placeholder="Contesto partita..."
          />
          {uploadedMediaName && (
            <span className="text-xs font-mono text-zinc-400">
              File: {uploadedMediaName.slice(0, 24)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="px-3 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5">
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
              setLocalPlayers(tacticalState.players);
              setKeypoints(DEFAULT_KEYPOINTS);
            }}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            onClick={() => {
              onSyncTrackedPositionsToLab(localPlayers, homeFormSelect, awayFormSelect);
              setSyncedBadge(true);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {syncedBadge ? 'Salva OK' : 'Salva su Lavagna 2D/3D'}
          </button>
        </div>
      </div>

      {/* REGOLA 1: LAYOUT 70% (BARRA STOCKFISH + CANVAS VIDEO + TIMELINE) / 30% (PANNELLO A SCHEDE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLONNA SINISTRA / CENTRALE (~70% -> 8 su 12 colonne): BARRA VALUTAZIONE + CANVAS PULITO + TIMELINE */}
        <div className="lg:col-span-8 space-y-3">
          {/* Barra Strumenti del Canvas (Minimalista e Ordinata) */}
          <div className="px-3.5 py-2.5 rounded-xl bg-[#111116] border border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
            {/* Strumenti di Interazione */}
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
                onClick={() => setToolMode('draw_action')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                  toolMode === 'draw_action'
                    ? 'bg-amber-400 text-zinc-950 font-semibold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                Traccia Traiettoria
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
                Calibra Angoli
              </button>
            </div>

            {/* Regola 2: Toggles Visivi (Pose disattivata di default, Etichette solo su Hover di default) */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPerspectiveHeatmap(!showPerspectiveHeatmap)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  showPerspectiveHeatmap
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}
              >
                Heatmap Controllo
              </button>

              <button
                onClick={() => setShowPose17(!showPose17)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors flex items-center gap-1 ${
                  showPose17
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}
              >
                <Activity className="w-3 h-3" />
                Mostra Pose
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
                Nomi Ruoli
              </button>
            </div>
          </div>

          {/* CONTENITORE PRINCIPALE: [BARRA DI VALUTAZIONE VERTICALE] + [CANVAS VIDEO PULITO] */}
          <div className="flex gap-2.5 items-stretch">
            {/* Regola 5 & 6: Barra di Valutazione Verticale (Stile Stockfish da -1.0 a +1.0) */}
            <div
              className="w-11 rounded-xl bg-[#111116] border border-zinc-800/80 p-1.5 flex flex-col items-center justify-between select-none shrink-0"
              title="Barra di Valutazione Tattica (Stile Stockfish: da -1.0 a +1.0)"
            >
              <span className="text-[10px] font-mono font-semibold text-blue-400">+1.0</span>

              <div className="relative w-3.5 flex-1 my-1.5 rounded-full bg-red-950/70 border border-zinc-800 overflow-hidden flex flex-col justify-end">
                {/* Tacca dello 0.0 a metà */}
                <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-400/70 z-10" />
                {/* Riempimento dinamico blu/verde dal basso */}
                <div
                  className={`w-full transition-all duration-200 ${
                    evalScore >= 0.15
                      ? 'bg-emerald-500'
                      : evalScore >= 0
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                  }`}
                  style={{ height: `${stockfishFillPct}%` }}
                />
              </div>

              <div className="text-center">
                <div
                  className={`text-[10px] font-mono font-bold ${
                    evalScore >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {evalScore >= 0 ? `+${evalScore.toFixed(2)}` : evalScore.toFixed(2)}
                </div>
                <span className="text-[9px] font-mono text-red-400 block mt-0.5">-1.0</span>
              </div>
            </div>

            {/* Canvas Video / Frame con Pedine Semitrasparenti e Traiettoria Gialla in Evidenza */}
            <div className="relative flex-1 aspect-video bg-[#070B12] rounded-xl border border-zinc-800/90 overflow-hidden select-none">
              {mediaSourceType === 'uploaded_image' && uploadedImageUrl ? (
                <img
                  src={uploadedImageUrl}
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
                  toolMode === 'draw_action' ? 'cursor-crosshair' : 'cursor-default'
                }`}
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
              >
                <defs>
                  {/* Freccia Gialla per la Palla e la Traiettoria Selezionata (Regola 3) */}
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

                {/* 1. Heatmap Pitch Control: Scala Termica Blu Trasparente (Squadra A) -> Rosso Trasparente (Squadra B) */}
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

                      // Regola 3: Blu trasparente per Squadra A, Rosso trasparente per Squadra B
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

                {/* 2. Griglia Prospettica H (Visibile solo quando si calibra o si attiva il toggle) */}
                {(toolMode === 'calibrate_homography' || showHomographyGrid) && (
                  <polygon
                    points={keypoints
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

                {/* 3. Pedine Giocatori Semitrasparenti (Blu = Squadra A, Rosso = Squadra B, Etichette solo su Hover/Click) */}
                {localPlayers.map((player) => {
                  const uv = projectPitchToImage(player.x, player.y, HInv);
                  const px = uv.u * 1000;
                  const py = uv.v * 562.5;
                  const isHome = player.team === 'home';
                  const isSelected = player.id === selectedPlayerId;
                  const isHovered = player.id === hoveredPlayerId;
                  const isBlocker =
                    actionEvaluation.criticalBlocker?.defenderId === player.id;

                  // Regola 3: Blu per Squadra A, Rosso per Squadra B
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
                      {/* Anello discreto solo per pedina selezionata o difensore più vicino alla traiettoria */}
                      {(isSelected || isBlocker) && (
                        <circle
                          cx={0}
                          cy={0}
                          r={16}
                          fill="none"
                          stroke={isBlocker ? '#F59E0B' : '#FACC15'}
                          strokeWidth="2"
                          strokeDasharray={isBlocker ? '3 2' : 'none'}
                        />
                      )}

                      {/* Cerchio Pedina Semitrasparente con Numero */}
                      <circle
                        cx={0}
                        cy={0}
                        r={11}
                        fill={fillColor}
                        fillOpacity={isSelected || isHovered ? 0.92 : 0.72}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 2.2 : 1.5}
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

                      {/* Scheletro 17-Keypoint: Visibile SOLO se l'utente attiva "Mostra Pose" */}
                      {showPose17 &&
                        (() => {
                          const pose = estimateBiomechanicalPose17(
                            [-14, -36, 28, 48],
                            player.vx,
                            player.vy,
                            actionProps.fromX - player.x,
                            actionProps.fromY - player.y,
                            currentTimeSec
                          );
                          const kp = (name: string) =>
                            pose.keypoints17.find((j) => j.joint === name) || {
                              u: 0,
                              v: 0,
                            };
                          const lSh = kp('left_shoulder');
                          const rSh = kp('right_shoulder');
                          const lHip = kp('left_hip');
                          const rHip = kp('right_hip');
                          const lKn = kp('left_knee');
                          const rKn = kp('right_knee');
                          return (
                            <g
                              stroke="#10B981"
                              strokeWidth="1.2"
                              strokeOpacity="0.85"
                              className="pointer-events-none"
                            >
                              <line x1={lSh.u} y1={lSh.v} x2={rSh.u} y2={rSh.v} />
                              <line x1={lHip.u} y1={lHip.v} x2={rHip.u} y2={rHip.v} />
                              <line x1={lHip.u} y1={lHip.v} x2={lKn.u} y2={lKn.v} />
                              <line x1={rHip.u} y1={rHip.v} x2={rKn.u} y2={rKn.v} />
                            </g>
                          );
                        })()}

                      {/* Regola 2: Nome esteso della tipologia SOLO su Hover o Click */}
                      {showBadge && (
                        <g className="pointer-events-none">
                          <rect
                            x={-68}
                            y={-31}
                            width={136}
                            height={16}
                            rx={4}
                            fill="#09090B"
                            fillOpacity="0.92"
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

                {/* 4. Palla e Traiettoria Selezionata in GIALLO ben visibile (Regola 3 & 6) */}
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
                      {/* Ombra sul terreno se la palla è alta */}
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

                      {/* Traiettoria Gialla Principale */}
                      <path
                        d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                        fill="none"
                        stroke="#FACC15"
                        strokeWidth="3"
                        markerEnd="url(#arrow-yellow-selected)"
                      />

                      {/* Pallone Giallo (Origine trascinabile) */}
                      <circle
                        cx={x1}
                        cy={y1}
                        r={7.5}
                        fill="#FACC15"
                        stroke="#09090B"
                        strokeWidth="2"
                        className="cursor-grab active:cursor-grabbing"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingEntity({ type: 'arrow_from' });
                        }}
                      />

                      {/* Destinazione Gialla (Punta freccia trascinabile) */}
                      <circle
                        cx={x2}
                        cy={y2}
                        r={8}
                        fill="#FACC15"
                        fillOpacity="0.35"
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

                {/* 5. Punti di Calibrazione Omografia (Visibili solo durante calibrazione camera) */}
                {toolMode === 'calibrate_homography' &&
                  keypoints.map((kp) => {
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

          {/* TIMELINE / SCRUBBER DEL VIDEO SOTTO IL CANVAS (Come da Diagramma Sezione 6) */}
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

        {/* COLONNA DESTRA (~30% -> 4 su 12 colonne): PANNELLO A SCHEDE [ ANALISI ] [ CALIBRAZIONE ] [ TIPOLOGIE ] */}
        <div className="lg:col-span-4 rounded-xl bg-[#111116] border border-zinc-800/80 overflow-hidden">
          {/* Intestazione Schede (Tabs) */}
          <div className="grid grid-cols-3 border-b border-zinc-800 bg-[#0C0C10]">
            {(
              [
                { id: 'analisi', label: 'Analisi' },
                { id: 'calibrazione', label: 'Calibrazione' },
                { id: 'tipologie', label: 'Tipologie' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className={`py-3 text-xs font-semibold transition-colors border-b-2 ${
                  rightTab === tab.id
                    ? 'border-blue-500 text-zinc-100 bg-[#111116]'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-5">
            {/* ================================================================
                SCHEDA 1: ANALISI (CHESS.COM MOVE LIST + DETTAGLIO + SLIDER)
               ================================================================ */}
            {rightTab === 'analisi' && (
              <div className="space-y-5">
                {/* Lista Verticale delle 3 Mosse Stile Chess.com (Regola 5) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">
                      Alternative Valutate sul Frame
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      Clicca per visualizzare
                    </span>
                  </div>

                  <div className="space-y-2">
                    {actionEvaluation.top3FrameAlternatives.map((alt) => {
                      const isRowActive = selectedMoveRank === alt.rank;
                      const isSuccess = alt.rank === 1;
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
                          className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between gap-2 ${
                            isRowActive
                              ? 'bg-zinc-900 border-amber-400/70'
                              : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded shrink-0 ${
                                isSuccess
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : alt.rank === 2
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {alt.rank === 1 ? '!!' : alt.rank === 2 ? '!' : '?'}
                            </span>
                            <div className="truncate">
                              <div className="text-xs font-medium text-zinc-100 truncate">
                                {alt.actionType} → {alt.targetArchetype}
                              </div>
                            </div>
                          </div>

                          <div className="text-right font-mono text-xs shrink-0">
                            <span
                              className={
                                alt.compositeScore >= 0.15
                                  ? 'text-emerald-400 font-semibold'
                                  : 'text-amber-400 font-semibold'
                              }
                            >
                              {alt.compositeScore >= 0 ? '+' : ''}
                              {alt.compositeScore.toFixed(2)}
                            </span>
                            <span className="text-zinc-600 mx-1.5">|</span>
                            <span className="text-zinc-300">
                              {alt.successProbabilityPct.toFixed(0)}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Card Riepilogo Mossa Selezionata (Come da Diagramma Sezione 6) */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-3">
                    <div>
                      <div className="text-[11px] text-zinc-400">Mossa Selezionata</div>
                      <h4 className="text-sm font-semibold text-zinc-100 mt-0.5">
                        {actionProps.actionCategory} verso {targetReceiverNode?.archetypeName} (#{targetReceiverNode?.number})
                      </h4>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold shrink-0 ${
                        actionEvaluation.classification === 'Best Move (!!)'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : actionEvaluation.classification === 'Good Alternative (!)'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {actionEvaluation.classification}
                    </span>
                  </div>

                  {/* Metriche Tecniche Raggruppate in Card con Font Monospaziato (Regola 4 & 6) */}
                  <div className="space-y-2 text-xs leading-relaxed">
                    <div className="flex justify-between items-center py-1 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Score Composito J(a|s):</span>
                      <span
                        className={`font-mono font-bold ${
                          actionEvaluation.compositeScore >= 0.15
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {actionEvaluation.compositeScore >= 0 ? '+' : ''}
                        {actionEvaluation.compositeScore.toFixed(2)} ({actionEvaluation.classification})
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Probabilità di Successo:</span>
                      <span className="font-mono font-semibold text-zinc-100">
                        {actionEvaluation.successProbabilityPct}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-zinc-800/50">
                      <span className="text-zinc-400">xT Generato (Markov):</span>
                      <span className="font-mono font-semibold text-blue-400">
                        {actionEvaluation.deltaXt >= 0 ? '+' : ''}
                        {actionEvaluation.deltaXt.toFixed(3)} (finale {actionEvaluation.xtEnd.toFixed(3)})
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-zinc-400">Difensore più vicino:</span>
                      <span className="font-mono font-semibold text-amber-400">
                        {actionEvaluation.criticalBlocker
                          ? `${actionEvaluation.criticalBlocker.distanceToCorridorM}m (Intercetto: ${actionEvaluation.criticalBlocker.interceptProbabilityPct}%)`
                          : 'Libero (Intercetto < 5%)'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                    {actionEvaluation.chessVerdictText}
                  </p>
                </div>

                {/* Parametri Fisici dell'Azione (Compatti e Puliti) */}
                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-400" />
                      Parametri Fisici Traiettoria
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {actionEvaluation.distanceMeters}m · {actionEvaluation.flightTimeSec}s
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Azione</label>
                      <select
                        value={actionProps.actionCategory}
                        onChange={(e) =>
                          setActionProps((prev) => ({
                            ...prev,
                            actionCategory: e.target.value as DrawnActionCategory,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                      >
                        <option value="Passaggio Filtrante">Passaggio Filtrante</option>
                        <option value="Cross">Cross</option>
                        <option value="Tiro a Giro">Tiro a Giro</option>
                        <option value="Passaggio Corto">Passaggio Corto</option>
                        <option value="Cambio Gioco">Cambio Gioco</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Piede / Stile</label>
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
                        className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                      >
                        <option value="Destro|Di Prima">Destro · Di Prima</option>
                        <option value="Destro|Controllo + Giocata">Destro · Controllo</option>
                        <option value="Destro|Interno a Giro">Destro · A Giro</option>
                        <option value="Sinistro|Di Prima">Sinistro · Di Prima</option>
                        <option value="Sinistro|Interno a Giro">Sinistro · A Giro</option>
                        <option value="Testa|Di Prima">Colpo di Testa</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Velocità Palla</span>
                      <span className="font-mono text-zinc-200">
                        {actionProps.ballSpeedKmh} km/h ({actionEvaluation.ballSpeedMs} m/s)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={115}
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
                      <span className="text-zinc-400">Altezza Parabola</span>
                      <span className="font-mono text-zinc-200">
                        {actionProps.ballHeightCm} cm{' '}
                        {actionProps.ballHeightCm >= 150 ? '(Scavalca)' : '(Rasoterra)'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={300}
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

                {/* Pulsante Primario: Applica Mossa / Simula */}
                <button
                  onClick={handleApplyAndSimulateMove}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Applica Mossa / Simula sul Campo
                </button>
              </div>
            )}

            {/* ================================================================
                SCHEDA 2: CALIBRAZIONE (SETUP CAMERA & MATRICE OMOGRAFICA H)
               ================================================================ */}
            {rightTab === 'calibrazione' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100">
                    Setup Camera & Omografia Planare H
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                    Attiva la modalità &ldquo;Calibra Angoli&rdquo; per trascinare i 4 riferimenti sul frame. Il solver DLT 8×8 ricalcola la proiezione prospettica verso il campo 120×80m.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs">
                  <span className="text-zinc-400">Errore medio riproiezione:</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {reprojectionErrorPx} m
                  </span>
                </div>

                {/* 4 Keypoint di Calibrazione */}
                <div className="grid grid-cols-2 gap-2">
                  {keypoints.map((kp) => (
                    <div
                      key={kp.id}
                      className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs font-mono"
                    >
                      <div className="text-zinc-200 font-semibold">
                        {kp.id.toUpperCase()} → ({kp.pitchX}m, {kp.pitchY}m)
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Frame: u={kp.imageU}, v={kp.imageV}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Matrice H 3x3 isolata nella scheda Setup Camera (Regola 1) */}
                <div className="p-3.5 rounded-xl bg-[#09090D] border border-zinc-800 font-mono text-xs space-y-1">
                  <div className="text-[11px] text-zinc-500 mb-1.5">
                    Matrice H ∈ PGL(3, ℝ) (Direct Linear Transform):
                  </div>
                  {H.map((row, rIdx) => (
                    <div key={rIdx} className="flex justify-between px-2 py-0.5 text-zinc-200">
                      <span className="text-zinc-600">[</span>
                      {row.map((val, cIdx) => (
                        <span key={cIdx}>{val.toFixed(4)}</span>
                      ))}
                      <span className="text-zinc-600">]</span>
                    </div>
                  ))}
                </div>

                {/* Diagnostica Inferenza Modulo (Distanza di Chamfer) */}
                <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
                  <div className="text-xs font-medium text-zinc-300">
                    Matching Modulo (Distanza di Chamfer Simmetrica)
                  </div>
                  {pipelineDiag.homeFormationRanking.slice(0, 3).map((f, idx) => (
                    <div
                      key={f.formationName}
                      className="flex justify-between text-xs font-mono py-1 border-b border-zinc-800/60 last:border-0"
                    >
                      <span className={idx === 0 ? 'text-blue-400 font-semibold' : 'text-zinc-400'}>
                        #{idx + 1} Sistema {f.formationName}
                      </span>
                      <span className="text-zinc-300">
                        {f.chamferDistanceMeters}m ({f.matchConfidencePct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================================================================
                SCHEDA 3: TIPOLOGIE (ISPEZIONE PEDINA, 30 TIPOLOGIE & WHAT-IF ±2m)
               ================================================================ */}
            {rightTab === 'tipologie' && selectedPlayer && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        selectedPlayer.team === 'home' ? 'text-blue-400' : 'text-red-400'
                      }`}
                    >
                      {selectedPlayer.team === 'home' ? 'SQUADRA A (CASA)' : 'SQUADRA B (OSPITE)'} · PEDINA #{selectedPlayer.number}
                    </span>
                    <h4 className="text-sm font-semibold text-zinc-100 mt-0.5">
                      {selectedPlayer.archetypeName}
                    </h4>
                  </div>
                  <div className="text-right font-mono text-xs text-zinc-300">
                    X={selectedPlayer.x}m, Y={selectedPlayer.y}m
                  </div>
                </div>

                {/* Selettore delle 30 Tipologie Astratte */}
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                    Cambia Tipologia Astratta (Catalogo 30 Ruoli):
                  </label>
                  <select
                    value={selectedPlayer.archetypeId}
                    onChange={(e) => handleChangeSelectedArchetype(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100"
                  >
                    {PLAYER_ARCHETYPES_30.map((arch) => (
                      <option key={arch.id} value={arch.id}>
                        #{arch.id} — {arch.name} ({arch.positionGroup})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Simulazione Rapida What-If: Sposta Pedina di ±2 metri */}
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2.5">
                  <div className="text-xs font-medium text-zinc-300">
                    Micro-Spostamento Tattico What-If (±2 metri)
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Sposta la pedina selezionata di 2 metri per verificare istantaneamente come variano il Pitch Control e la probabilità di intercetto.
                  </p>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <button
                      onClick={() => handleNudgeSelectedPlayer(0, -2)}
                      className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg"
                    >
                      ← 2m Sinistra (Y-2)
                    </button>
                    <button
                      onClick={() => handleNudgeSelectedPlayer(0, 2)}
                      className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg"
                    >
                      → 2m Destra (Y+2)
                    </button>
                    <button
                      onClick={() => handleNudgeSelectedPlayer(-2, 0)}
                      className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg"
                    >
                      ↓ 2m Indietro (X-2)
                    </button>
                    <button
                      onClick={() => handleNudgeSelectedPlayer(2, 0)}
                      className="py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg"
                    >
                      ↑ 2m Avanti (X+2)
                    </button>
                  </div>
                </div>

                {/* Attributi Tecnici della Tipologia Selezionata */}
                <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2 text-xs">
                  <div className="text-zinc-400 font-medium mb-1">
                    Parametri Cine-Dinamici della Tipologia
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/50">
                    <span className="text-zinc-400">Statura / Piede:</span>
                    <span className="font-mono text-zinc-200">
                      {selectedPlayer.heightCm} cm · {selectedPlayer.foot}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/50">
                    <span className="text-zinc-400">Qualità Passaggio / Press Resist:</span>
                    <span className="font-mono text-zinc-200">
                      {selectedPlayer.attributes.passing} / {selectedPlayer.attributes.pressResistance}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-400">Dominio Aereo / Difesa:</span>
                    <span className="font-mono text-zinc-200">
                      {selectedPlayer.attributes.aerial} / {selectedPlayer.attributes.defensiveIndex}
                    </span>
                  </div>
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
