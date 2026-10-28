import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Play,
  Pause,
  Crosshair,
  CheckCircle2,
  Move,
  Navigation,
  Sliders,
  Sparkles,
  Image as ImageIcon,
  ShieldAlert,
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
  { id: 'kp-1', label: 'Angolo Sup SX Area/Campo (18m, 14m)', imageU: 0.16, imageV: 0.22, pitchX: 18, pitchY: 14 },
  { id: 'kp-2', label: 'Angolo Inf SX Area/Campo (18m, 66m)', imageU: 0.06, imageV: 0.88, pitchX: 18, pitchY: 66 },
  { id: 'kp-3', label: 'Angolo Sup DX Trequarti (96m, 14m)', imageU: 0.84, imageV: 0.22, pitchX: 96, pitchY: 14 },
  { id: 'kp-4', label: 'Angolo Inf DX Trequarti (96m, 66m)', imageU: 0.94, imageV: 0.88, pitchX: 96, pitchY: 66 },
];

type InteractionToolMode = 'drag_players' | 'draw_action' | 'calibrate_homography';

export const UniversalVideoLab: React.FC<UniversalVideoLabProps> = ({
  tacticalState,
  onSyncTrackedPositionsToLab,
}) => {
  // Fase 1: Sorgente Frame (Screenshot Immagine, Video in Pausa o Frame Tattico Riferimento)
  const [mediaSourceType, setMediaSourceType] = useState<'synthetic_frame' | 'uploaded_image' | 'uploaded_video'>('synthetic_frame');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedMediaName, setUploadedMediaName] = useState<string>('');
  const [perspectiveType, setPerspectiveType] = useState<
    'Broadcast' | 'Tactical High / Drone' | 'Goal-Line / Set-Piece' | 'Smartphone / Amateur'
  >('Broadcast');

  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(74.5);
  const [matchContextNote, setMatchContextNote] = useState<string>(
    'Transizione offensiva, minuto 75, punteggio 1-0'
  );
  const [homeFormSelect, setHomeFormSelect] = useState<string>(tacticalState.homeFormation || '3-4-1-2');
  const [awayFormSelect, setAwayFormSelect] = useState<string>(tacticalState.awayFormation || '3-5-2');

  // Fase 2: Modalità di Interazione Umano-in-the-Loop sul Frame
  const [toolMode, setToolMode] = useState<InteractionToolMode>('drag_players');
  const [keypoints, setKeypoints] = useState<CalibrationKeypoint[]>(DEFAULT_KEYPOINTS);
  const [localPlayers, setLocalPlayers] = useState<PlayerNode[]>(tacticalState.players);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('home-10');
  const [draggingEntity, setDraggingEntity] = useState<
    | { type: 'player'; id: string }
    | { type: 'kp'; id: string }
    | { type: 'arrow_from' }
    | { type: 'arrow_to' }
    | null
  >(null);

  // Overlay Toggles
  const [showPerspectiveHeatmap, setShowPerspectiveHeatmap] = useState<boolean>(true);
  const [showHomographyGrid, setShowHomographyGrid] = useState<boolean>(true);
  const [showTop3GhostArrows, setShowTop3GhostArrows] = useState<boolean>(true);

  // Fase 3 & 4: Proprietà dell'Azione Disegnata e Parametri Visivi dell'Utente
  const [actionProps, setActionProps] = useState<VisualActionProperties>({
    actionCategory: 'Passaggio Filtrante',
    ballSpeedKmh: 64,
    ballHeightCm: 15,
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

  // Sincronizza localPlayers se cambia il preset globale
  useEffect(() => {
    setLocalPlayers(tacticalState.players);
  }, [tacticalState.matchId]);

  // Calcolo Omografia H (da [u,v] -> [X,Y]) e Inversa H^{-1} (da [X,Y] -> [u,v])
  const { H, reprojectionErrorPx } = useMemo(
    () => computePlanarHomographyDLT(keypoints),
    [keypoints]
  );
  const HInv = useMemo(() => invertHomography3x3(H), [H]);

  // Stato tattico locale aggiornato istantaneamente al Drag & Drop
  const liveState: TacticalState = useMemo(
    () => ({
      ...tacticalState,
      homeFormation: homeFormSelect,
      awayFormation: awayFormSelect,
      ballX: actionProps.fromX,
      ballY: actionProps.fromY,
      players: localPlayers,
    }),
    [tacticalState, homeFormSelect, awayFormSelect, actionProps.fromX, actionProps.fromY, localPlayers]
  );

  // Fase 5: Calcolo in Tempo Reale (latenza 0ms) del Pitch Control di Spearman e della Valutazione Chess.com
  const pitchControlData = useMemo(
    () => computePitchControlGrid(localPlayers, actionProps.fromX, actionProps.fromY),
    [localPlayers, actionProps.fromX, actionProps.fromY]
  );

  const actionEvaluation = useMemo(
    () => evaluateHumanDrawnAction(liveState, actionProps),
    [liveState, actionProps]
  );

  // Disegno dello sfondo del frame tattico se non c'è un file esterno caricato
  useEffect(() => {
    const canvas = synthCanvasRef.current;
    if (!canvas || mediaSourceType !== 'synthetic_frame') return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawBroadcastReferenceFrame(ctx, canvas.width, canvas.height, perspectiveType, keypoints);
    }
  }, [mediaSourceType, perspectiveType, keypoints]);

  // Upload Immagine (Screenshot di qualsiasi partita) o Video
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedMediaName(`${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);

    if (file.type.startsWith('image/')) {
      setUploadedImageUrl(url);
      setMediaSourceType('uploaded_image');
    } else {
      setUploadedVideoUrl(url);
      setMediaSourceType('uploaded_video');
      setIsPlayingVideo(false);
    }
  };

  // Conversione coordinate mouse su SVG -> (u, v) in [0, 1] -> (pitchX, pitchY) tramite H
  const getNormalizedUvFromEvent = (e: React.MouseEvent<SVGSVGElement>): { u: number; v: number } => {
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
        prev.map((kp) => (kp.id === draggingEntity.id ? { ...kp, imageU: u, imageV: v } : kp))
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
      setActionProps((prev) => ({ ...prev, fromX: pitchPt.x, fromY: pitchPt.y }));
    } else if (draggingEntity.type === 'arrow_to') {
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

  const arrowStartUv = projectPitchToImage(actionProps.fromX, actionProps.fromY, HInv);
  const arrowEndUv = projectPitchToImage(actionProps.toX, actionProps.toY, HInv);

  return (
    <div className="space-y-5">
      {/* HEADER BANNER: HUMAN-IN-THE-LOOP TACTICAL FRAME SIMULATOR */}
      <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="font-mono text-[#00F2FF] font-semibold">
              ARCHITETTURA HUMAN-IN-THE-LOOP (GROUND TRUTH DALL’ANALISTA)
            </span>
            <span>·</span>
            <span>Zero Errori di Tracking · Latenza 0ms</span>
            <span>·</span>
            <span className="font-mono text-[#B4FF39]">
              Omografia Planare H + Spearman ODE + Markov xT + Valutazione Chess.com
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1">
            Lavagna Tattica Interattiva su Frame Reale (Drag & Drop + Parametri Visivi)
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-4xl">
            Carica uno screenshot o metti in pausa un video, trascina le 22 pedine (con le 30 Tipologie Astratte) sopra i giocatori nel frame, disegna la freccia del passaggio o del tiro e regola velocità (km/h), altezza (cm) e stile del tocco: il motore ricalcola istantaneamente il Pitch Control, il TTI d’intercetto e il verdetto stile Chess.com.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <label className="px-3.5 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-[#00F2FF]" />
            Carica Frame (PNG/JPG) o Video (MP4)
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              onSyncTrackedPositionsToLab(localPlayers, homeFormSelect, awayFormSelect);
              setSyncedBadge(true);
            }}
            className="px-4 py-2 text-xs font-semibold bg-[#B4FF39] text-zinc-950 rounded-lg hover:bg-[#B4FF39]/90 transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {syncedBadge ? 'Sincronizzato con Lavagna 2D/3D!' : 'Sincronizza con Campo 2D/3D'}
          </button>
        </div>
      </div>

      {/* FASE 1: BARRA DI CONTESTO PARTITA & MODULI */}
      <div className="p-3.5 rounded-xl bg-[#111118] border border-zinc-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-5 flex items-center gap-2">
          <span className="text-xs font-mono text-[#00F2FF] shrink-0">FASE 1 (CONTESTO):</span>
          <input
            type="text"
            value={matchContextNote}
            onChange={(e) => setMatchContextNote(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-[#00F2FF]"
            placeholder="Es. Transizione offensiva, minuto 75, punteggio 1-0"
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2">
          <span className="text-xs text-zinc-400">Moduli:</span>
          <select
            value={homeFormSelect}
            onChange={(e) => setHomeFormSelect(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-mono bg-zinc-900 border border-zinc-700 rounded-lg text-[#00F2FF]"
          >
            {['3-4-1-2', '4-3-3', '3-5-2', '4-2-3-1', '4-4-2'].map((f) => (
              <option key={f} value={f}>
                Casa: {f}
              </option>
            ))}
          </select>
          <span className="text-xs text-zinc-500">vs</span>
          <select
            value={awayFormSelect}
            onChange={(e) => setAwayFormSelect(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-mono bg-zinc-900 border border-zinc-700 rounded-lg text-[#FF6B35]"
          >
            {['3-5-2', '4-4-2', '4-3-3', '5-3-2', '4-2-3-1'].map((f) => (
              <option key={f} value={f}>
                Ospite: {f}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3 flex items-center justify-end gap-1.5">
          <span className="text-[11px] text-zinc-400">Angolo Frame:</span>
          {(['Broadcast', 'Tactical High / Drone', 'Goal-Line / Set-Piece'] as const).map((persp) => (
            <button
              key={persp}
              onClick={() => {
                setPerspectiveType(persp);
                setMediaSourceType('synthetic_frame');
              }}
              className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                perspectiveType === persp && mediaSourceType === 'synthetic_frame'
                  ? 'bg-[#1E1B4B] text-[#00F2FF] border border-[#00F2FF]/40'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {persp.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN WORKSPACE: LEFT/CENTER INTERACTIVE FRAME (8 COLS) + RIGHT VISUAL PARAMETERS & CHESS VERDICT (4 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT 8 COLS: INTERACTIVE FRAME CANVAS + DRAG & DROP OVERLAY */}
        <div className="lg:col-span-8 space-y-3">
          {/* Toolbar Modalità Interazione (Fase 2 & 3) */}
          <div className="p-3 rounded-xl bg-[#111118] border border-zinc-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setToolMode('drag_players')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  toolMode === 'drag_players'
                    ? 'bg-[#00F2FF] text-zinc-950'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                1. Posiziona Pedine (Drag & Drop)
              </button>

              <button
                onClick={() => setToolMode('draw_action')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  toolMode === 'draw_action'
                    ? 'bg-[#B4FF39] text-zinc-950'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                2. Disegna Vettore Azione
              </button>

              <button
                onClick={() => setToolMode('calibrate_homography')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  toolMode === 'calibrate_homography'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                3. Calibra 4 Angoli (Omografia H)
              </button>
            </div>

            {/* Visual Layer Toggles */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPerspectiveHeatmap(!showPerspectiveHeatmap)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors ${
                  showPerspectiveHeatmap
                    ? 'bg-[#00F2FF]/15 text-[#00F2FF] border-[#00F2FF]/40'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}
              >
                Heatmap Spearman su Frame
              </button>
              <button
                onClick={() => setShowTop3GhostArrows(!showTop3GhostArrows)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors ${
                  showTop3GhostArrows
                    ? 'bg-[#B4FF39]/15 text-[#B4FF39] border-[#B4FF39]/40'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}
              >
                Top-3 Opzioni Chess.com
              </button>
              <button
                onClick={() => setShowHomographyGrid(!showHomographyGrid)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors ${
                  showHomographyGrid
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}
              >
                Griglia Prospettica H
              </button>
            </div>
          </div>

          {/* Interactive Video / Screenshot Viewport with Perspective Homography SVG */}
          <div className="relative w-full aspect-video bg-[#070B12] rounded-xl border border-zinc-800 overflow-hidden select-none">
            {mediaSourceType === 'uploaded_image' && uploadedImageUrl ? (
              <img
                src={uploadedImageUrl}
                alt="Frame Tattico Caricato"
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
                onTimeUpdate={(e) => setCurrentTimeSec(Number(e.currentTarget.currentTime.toFixed(2)))}
              />
            ) : (
              <canvas
                ref={synthCanvasRef}
                width={960}
                height={540}
                className="w-full h-full object-cover"
              />
            )}

            {/* INTERACTIVE SVG OVERLAY: PERSPECTIVE HEATMAP + DRAGGABLE TOKENS + DRAWN ACTION VECTOR */}
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
                <marker
                  id="arrow-drawn-action"
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#B4FF39" />
                </marker>
                <marker
                  id="arrow-best-alt"
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#00F2FF" />
                </marker>
              </defs>

              {/* 1. Perspective Spearman Pitch Control Heatmap Projected via H^{-1} */}
              {showPerspectiveHeatmap &&
                pitchControlData.grid.map((row, rIdx) =>
                  row.map((probHome, cIdx) => {
                    // Proiettiamo i 4 vertici della cella (cIdx, rIdx) sul frame tramite HInv
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
                    const intensity = Math.abs(probHome - 0.5) * 2; // 0..1
                    if (intensity < 0.14) return null;

                    const fill = isHomeDom ? '#00F2FF' : '#FF6B35';
                    const opacity = Number((intensity * 0.24).toFixed(3));

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

              {/* 2. Perspective Homography Calibration Grid */}
              {showHomographyGrid && (
                <g
                  stroke="#00F2FF"
                  strokeOpacity="0.32"
                  strokeWidth="1.2"
                  strokeDasharray="5 4"
                  fill="none"
                  className="pointer-events-none"
                >
                  <polygon
                    points={keypoints
                      .map((kp) => `${kp.imageU * 1000},${kp.imageV * 562.5}`)
                      .join(' ')}
                  />
                </g>
              )}

              {/* 3. Chess.com Top-3 Alternative Ghost Vectors on the Frame */}
              {showTop3GhostArrows &&
                actionEvaluation.top3FrameAlternatives.slice(0, 2).map((alt, idx) => {
                  const pFrom = projectPitchToImage(alt.fromX, alt.fromY, HInv);
                  const pTo = projectPitchToImage(alt.toX, alt.toY, HInv);
                  return (
                    <g key={`alt-${alt.rank}`} className="pointer-events-none">
                      <line
                        x1={pFrom.u * 1000}
                        y1={pFrom.v * 562.5}
                        x2={pTo.u * 1000}
                        y2={pTo.v * 562.5}
                        stroke="#00F2FF"
                        strokeWidth={idx === 0 ? 2.2 : 1.5}
                        strokeDasharray="6 4"
                        strokeOpacity={idx === 0 ? 0.75 : 0.45}
                        markerEnd="url(#arrow-best-alt)"
                      />
                      <text
                        x={(pFrom.u * 1000 + pTo.u * 1000) / 2}
                        y={(pFrom.v * 562.5 + pTo.v * 562.5) / 2 - 6}
                        fill="#00F2FF"
                        fontSize="10"
                        textAnchor="middle"
                        className="font-mono font-bold"
                      >
                        #{alt.rank} {alt.classification} (J={alt.compositeScore >= 0 ? '+' : ''}
                        {alt.compositeScore})
                      </text>
                    </g>
                  );
                })}

              {/* 4. User-Drawn Action Vector (with Ballistic / Curl Arc & Drag Handles) */}
              {(() => {
                const x1 = arrowStartUv.u * 1000;
                const y1 = arrowStartUv.v * 562.5;
                const x2 = arrowEndUv.u * 1000;
                const y2 = arrowEndUv.v * 562.5;

                // Se l'azione è aerea o 'Interno a Giro', disegniamo una parabola visiva
                const liftPx =
                  actionProps.ballHeightCm * 0.22 +
                  (actionProps.executionStyle === 'Interno a Giro' ? 28 : 0);
                const cx = (x1 + x2) / 2;
                const cy = (y1 + y2) / 2 - liftPx;

                return (
                  <g>
                    {/* Ombra a terra della traiettoria */}
                    {liftPx > 6 && (
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#FFFFFF"
                        strokeOpacity="0.28"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                    )}

                    {/* Curva principale dell'azione disegnata */}
                    <path
                      d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                      fill="none"
                      stroke="#B4FF39"
                      strokeWidth="3.2"
                      markerEnd="url(#arrow-drawn-action)"
                    />

                    {/* Etichetta sulla freccia disegnata */}
                    <rect
                      x={cx - 88}
                      y={cy - 22}
                      width={176}
                      height={18}
                      rx={4}
                      fill="#09090B"
                      fillOpacity="0.9"
                      stroke="#B4FF39"
                      strokeWidth="1"
                    />
                    <text
                      x={cx}
                      y={cy - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#B4FF39"
                      className="font-mono font-bold"
                    >
                      {actionProps.actionCategory} · {actionProps.ballSpeedKmh}km/h · P_succ{' '}
                      {actionEvaluation.successProbabilityPct}%
                    </text>

                    {/* Maniglia Origine (Palla) Trascinabile */}
                    <circle
                      cx={x1}
                      cy={y1}
                      r={8}
                      fill="#FFFFFF"
                      stroke="#B4FF39"
                      strokeWidth="2.5"
                      className="cursor-grab active:cursor-grabbing"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingEntity({ type: 'arrow_from' });
                      }}
                    />

                    {/* Maniglia Destinazione (Punta Freccia) Trascinabile */}
                    <circle
                      cx={x2}
                      cy={y2}
                      r={9}
                      fill="#B4FF39"
                      fillOpacity="0.35"
                      stroke="#B4FF39"
                      strokeWidth="2.5"
                      className="cursor-grab active:cursor-grabbing"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingEntity({ type: 'arrow_to' });
                      }}
                    />
                  </g>
                );
              })()}

              {/* 5. 22 Draggable Player Tokens Projected on the Frame via H^{-1} */}
              {localPlayers.map((player) => {
                const uv = projectPitchToImage(player.x, player.y, HInv);
                const px = uv.u * 1000;
                const py = uv.v * 562.5;
                const isHome = player.team === 'home';
                const isSelected = player.id === selectedPlayerId;
                const isCriticalBlocker =
                  actionEvaluation.criticalBlocker?.defenderId === player.id;
                const color = isHome ? '#00F2FF' : '#FF6B35';

                return (
                  <g
                    key={player.id}
                    transform={`translate(${px}, ${py})`}
                    className="cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedPlayerId(player.id);
                      setDraggingEntity({ type: 'player', id: player.id });
                    }}
                  >
                    {/* Anello di evidenziazione se selezionato o se è il difensore intercettore critico */}
                    {(isSelected || isCriticalBlocker) && (
                      <circle
                        cx={0}
                        cy={0}
                        r={19}
                        fill="none"
                        stroke={isCriticalBlocker ? '#EF4444' : '#B4FF39'}
                        strokeWidth="2.2"
                        strokeDasharray={isCriticalBlocker ? '3 2' : 'none'}
                      />
                    )}

                    {/* Ombra prospettica sul terreno */}
                    <ellipse
                      cx={0}
                      cy={10}
                      rx={13}
                      ry={5.5}
                      fill={color}
                      fillOpacity="0.28"
                      stroke={color}
                      strokeWidth="1.2"
                    />

                    {/* Pedina Giocatore */}
                    <circle
                      cx={0}
                      cy={0}
                      r={12}
                      fill={isHome ? '#082F49' : '#431407'}
                      stroke={color}
                      strokeWidth={isSelected ? 2.8 : 2}
                    />
                    <text
                      x={0}
                      y={3.5}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#F8FAFC"
                      className="font-mono font-bold pointer-events-none"
                    >
                      {player.number}
                    </text>

                    {/* Targhetta Tipologia Astratta + Coordinate Reali */}
                    <rect
                      x={-54}
                      y={-29}
                      width={108}
                      height={14}
                      rx={3}
                      fill="#09090B"
                      fillOpacity="0.88"
                      stroke={color}
                      strokeWidth="0.7"
                      className="pointer-events-none"
                    />
                    <text
                      x={0}
                      y={-19.5}
                      textAnchor="middle"
                      fontSize="8.5"
                      fill="#F8FAFC"
                      className="font-mono pointer-events-none"
                    >
                      {player.archetypeName.slice(0, 15)} ({player.x.toFixed(0)},{player.y.toFixed(0)})
                    </text>
                  </g>
                );
              })}

              {/* 6. 4 Draggable Homography Calibration Pins (KP-1 .. KP-4) */}
              {(toolMode === 'calibrate_homography' || showHomographyGrid) &&
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
                        fill="#6366F1"
                        fillOpacity="0.35"
                        stroke="#818CF8"
                        strokeWidth="2"
                      />
                      <circle cx={0} cy={0} r={2.5} fill="#FFFFFF" />
                      <text
                        x={10}
                        y={4}
                        fontSize="9.5"
                        fill="#A5B4FC"
                        className="font-mono font-bold pointer-events-none"
                      >
                        {kp.id.toUpperCase()} ({kp.pitchX}m,{kp.pitchY}m)
                      </text>
                    </g>
                  );
                })}
            </svg>

            {/* Top-Left Live HUD */}
            <div className="absolute top-3 left-3 pointer-events-none px-3 py-1.5 rounded-lg bg-[#09090B]/90 border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center gap-2.5">
              <span className="text-[#00F2FF] font-semibold">GROUND TRUTH UMANO</span>
              <span>·</span>
              <span>Controllo Spearman Casa: {pitchControlData.homeAvg}%</span>
              <span>·</span>
              <span className="text-[#B4FF39]">Zona 14: {pitchControlData.zone14Avg}%</span>
            </div>
          </div>

          {/* Selected Player Inspector & 2-Meter Micro-Shift Controls (What-If Difensore +2m!) */}
          {selectedPlayer && (
            <div className="p-3.5 rounded-xl bg-[#111118] border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                    selectedPlayer.team === 'home'
                      ? 'bg-[#00F2FF]/20 text-[#00F2FF]'
                      : 'bg-[#FF6B35]/20 text-[#FF6B35]'
                  }`}
                >
                  {selectedPlayer.team === 'home' ? 'CASA' : 'OSPITE'} #{selectedPlayer.number}
                </span>
                <div className="text-xs font-mono text-zinc-300">
                  Coord Campo: <strong className="text-white">X={selectedPlayer.x}m, Y={selectedPlayer.y}m</strong> · Statura: {selectedPlayer.heightCm}cm
                </div>

                {/* Selettore delle 30 Tipologie Astratte per la pedina selezionata */}
                <select
                  value={selectedPlayer.archetypeId}
                  onChange={(e) => handleChangeSelectedArchetype(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs font-mono bg-zinc-900 border border-zinc-700 rounded-lg text-[#B4FF39]"
                >
                  {PLAYER_ARCHETYPES_30.map((arch) => (
                    <option key={arch.id} value={arch.id}>
                      Tipologia #{arch.id}: {arch.name} ({arch.positionGroup})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pulsanti rapidi "Sposta di 2 metri" per testare istantaneamente il What-If d'intercetto */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-zinc-400 mr-1">Test What-If (±2m):</span>
                <button
                  onClick={() => handleNudgeSelectedPlayer(0, -2)}
                  className="px-2 py-1 text-[11px] font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded"
                >
                  2m SX (Y-2)
                </button>
                <button
                  onClick={() => handleNudgeSelectedPlayer(0, 2)}
                  className="px-2 py-1 text-[11px] font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded"
                >
                  2m DX (Y+2)
                </button>
                <button
                  onClick={() => handleNudgeSelectedPlayer(-2, 0)}
                  className="px-2 py-1 text-[11px] font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded"
                >
                  2m Indietro
                </button>
                <button
                  onClick={() => handleNudgeSelectedPlayer(2, 0)}
                  className="px-2 py-1 text-[11px] font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded"
                >
                  2m Avanti
                </button>
              </div>
            </div>
          )}

          {/* Se è caricato un video, mostra i controlli per metterlo in pausa sul frame esatto */}
          {mediaSourceType === 'uploaded_video' && (
            <div className="p-3 rounded-xl bg-[#111118] border border-zinc-800 flex items-center justify-between gap-4">
              <button
                onClick={() => {
                  const next = !isPlayingVideo;
                  setIsPlayingVideo(next);
                  if (videoRef.current) {
                    if (next) videoRef.current.play();
                    else videoRef.current.pause();
                  }
                }}
                className="px-3.5 py-1.5 bg-[#00F2FF] text-zinc-950 font-semibold text-xs rounded-lg flex items-center gap-1.5"
              >
                {isPlayingVideo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlayingVideo ? 'Metti in Pausa sul Frame' : 'Scorri Video'}
              </button>
              <input
                type="range"
                min={0}
                max={videoRef.current?.duration || 90}
                step={0.04}
                value={currentTimeSec}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentTimeSec(val);
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
                className="flex-1 accent-[#00F2FF]"
              />
              <span className="text-xs font-mono text-zinc-300">Frame t = {currentTimeSec.toFixed(2)}s</span>
            </div>
          )}
        </div>

        {/* RIGHT 4 COLS: FASE 4 (INPUT PARAMETRI VISIVI) & FASE 5 (VERDETTO CHESS.COM) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Fase 3 & 4 — Input Parametrico Visivo dell'Azione */}
          <div className="p-4 rounded-xl bg-[#111118] border border-zinc-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#00F2FF] flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" />
                FASE 3 & 4 — PARAMETRI VISIVI DELL’AZIONE
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                d = {actionEvaluation.distanceMeters}m · t_volo = {actionEvaluation.flightTimeSec}s
              </span>
            </div>

            {/* Tipo di Azione */}
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400">Tipo di Azione Disegnata:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    'Passaggio Filtrante',
                    'Cross',
                    'Tiro a Giro',
                    'Passaggio Corto',
                    'Cambio Gioco',
                  ] as DrawnActionCategory[]
                ).map((cat) => (
                  <button
                    key={cat}
                    onClick={() =>
                      setActionProps((prev) => ({
                        ...prev,
                        actionCategory: cat,
                        ballHeightCm:
                          cat === 'Cross' ? 210 : cat === 'Cambio Gioco' ? 160 : prev.ballHeightCm,
                      }))
                    }
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border text-left transition-colors ${
                      actionProps.actionCategory === cat
                        ? 'bg-[#00F2FF]/20 border-[#00F2FF] text-[#00F2FF] font-semibold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider 1: Velocità Palla (10 - 115 km/h) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300">Velocità Palla:</span>
                <span className="font-mono font-bold text-[#00F2FF]">
                  {actionProps.ballSpeedKmh} km/h ({actionEvaluation.ballSpeedMs} m/s)
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={115}
                step={1}
                value={actionProps.ballSpeedKmh}
                onChange={(e) =>
                  setActionProps((prev) => ({ ...prev, ballSpeedKmh: Number(e.target.value) }))
                }
                className="w-full accent-[#00F2FF]"
              />
              <div className="flex justify-between gap-1 pt-0.5">
                {[
                  { label: 'Lenta (34 km/h)', val: 34 },
                  { label: 'Media (58 km/h)', val: 58 },
                  { label: 'Veloce (88 km/h)', val: 88 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setActionProps((prev) => ({ ...prev, ballSpeedKmh: preset.val }))}
                    className="flex-1 py-1 text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded border border-zinc-800"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider 2: Altezza Traiettoria (0 - 320 cm) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300">Altezza Parabola:</span>
                <span className="font-mono font-bold text-[#B4FF39]">
                  {actionProps.ballHeightCm} cm{' '}
                  {actionProps.ballHeightCm < 35
                    ? '(Rasoterra)'
                    : actionProps.ballHeightCm < 140
                      ? '(Mezza Altezza)'
                      : '(Aerea / Scavalca)'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={320}
                step={5}
                value={actionProps.ballHeightCm}
                onChange={(e) =>
                  setActionProps((prev) => ({ ...prev, ballHeightCm: Number(e.target.value) }))
                }
                className="w-full accent-[#B4FF39]"
              />
              <div className="flex justify-between gap-1 pt-0.5">
                {[
                  { label: 'Rasoterra (0cm)', val: 0 },
                  { label: 'Mezza (90cm)', val: 90 },
                  { label: 'Aerea (220cm)', val: 220 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setActionProps((prev) => ({ ...prev, ballHeightCm: preset.val }))}
                    className="flex-1 py-1 text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded border border-zinc-800"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parte del Corpo & Stile Esecuzione */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Contatto:</label>
                <div className="flex gap-1">
                  {(['Destro', 'Sinistro', 'Testa'] as ContactFootOrHead[]).map((bp) => (
                    <button
                      key={bp}
                      onClick={() => setActionProps((prev) => ({ ...prev, bodyPart: bp }))}
                      className={`flex-1 py-1 text-[11px] font-mono rounded border ${
                        actionProps.bodyPart === bp
                          ? 'bg-[#00F2FF] text-zinc-950 font-bold border-[#00F2FF]'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {bp}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Stile Tocco:</label>
                <select
                  value={actionProps.executionStyle}
                  onChange={(e) =>
                    setActionProps((prev) => ({
                      ...prev,
                      executionStyle: e.target.value as ContactExecutionStyle,
                    }))
                  }
                  className="w-full px-2 py-1 text-[11px] font-mono bg-zinc-900 border border-zinc-700 rounded text-zinc-100"
                >
                  <option value="Di Prima">Di Prima (0.06s)</option>
                  <option value="Controllo + Giocata">Controllo + Giocata (0.38s)</option>
                  <option value="Collo Pieno">Collo Pieno</option>
                  <option value="Interno a Giro">Interno a Giro (Curl)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Fase 5 — Verdetto Matematico Stile Chess.com sull'Azione Disegnata */}
          <div className="p-4 rounded-xl bg-[#111118] border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#B4FF39] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                FASE 5 — VALUTAZIONE STILE CHESS.COM
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  actionEvaluation.classification === 'Best Move (!!)'
                    ? 'bg-[#B4FF39] text-zinc-950'
                    : actionEvaluation.classification === 'Good Alternative (!)'
                      ? 'bg-[#00F2FF] text-zinc-950'
                      : 'bg-[#FF6B35] text-zinc-950'
                }`}
              >
                {actionEvaluation.classification} · J ={' '}
                {actionEvaluation.compositeScore >= 0 ? '+' : ''}
                {actionEvaluation.compositeScore}
              </span>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Successo / Intercetto</div>
                <div className="text-sm font-mono font-bold text-[#B4FF39] mt-0.5">
                  {actionEvaluation.successProbabilityPct}% / {actionEvaluation.interceptionRiskPct}%
                </div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Valore xT (ΔxT)</div>
                <div className="text-sm font-mono font-bold text-[#00F2FF] mt-0.5">
                  {actionEvaluation.xtEnd.toFixed(3)} ({actionEvaluation.deltaXt >= 0 ? '+' : ''}
                  {actionEvaluation.deltaXt.toFixed(3)})
                </div>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-[10px] text-zinc-400">Controllo Dest.</div>
                <div className="text-sm font-mono font-bold text-zinc-100 mt-0.5">
                  {actionEvaluation.pitchControlAtTargetPct}%
                </div>
              </div>
            </div>

            {/* Analisi TTI dei Difensori sulla Linea di Passaggio */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[#FF6B35]" />
                TTI Difensori Avversari lungo la Traiettoria:
              </div>
              {actionEvaluation.allDefenderChecks.slice(0, 2).map((def) => (
                <div
                  key={def.defenderId}
                  onClick={() => setSelectedPlayerId(def.defenderId)}
                  className="p-2 rounded bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono flex items-center justify-between cursor-pointer hover:border-[#FF6B35]"
                >
                  <div>
                    <span className="text-[#FF6B35] font-semibold">{def.defenderLabel}</span>
                    <div className="text-[10px] text-zinc-400">
                      Dist linea: {def.distanceToCorridorM}m · Palla: {def.ballArrivalTimeSec}s vs TTI:{' '}
                      {def.defenderTtiSec}s
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={
                        def.bypassedByAltitude
                          ? 'text-[#00F2FF]'
                          : def.interceptProbabilityPct > 45
                            ? 'text-[#FF6B35] font-bold'
                            : 'text-[#B4FF39]'
                      }
                    >
                      {def.bypassedByAltitude
                        ? 'Scavalcato (h)'
                        : `Intercetto ${def.interceptProbabilityPct}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Verdetto Testuale Esplicativo */}
            <div className="p-3 rounded-lg bg-[#09090D] border border-zinc-800 text-xs text-zinc-200 leading-relaxed">
              {actionEvaluation.chessVerdictText}
            </div>

            {/* Confronto con le 3 Opzioni del Frame (Click per provare l'opzione) */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-mono text-[#00F2FF]">
                CONFRONTO CON LE 3 OPZIONI GEOMETRICHE DEL FRAME (CLICCA PER SIMULARE):
              </div>
              {actionEvaluation.top3FrameAlternatives.map((alt) => (
                <button
                  key={alt.rank}
                  onClick={() =>
                    setActionProps((prev) => ({
                      ...prev,
                      fromX: alt.fromX,
                      fromY: alt.fromY,
                      toX: alt.toX,
                      toY: alt.toY,
                    }))
                  }
                  className="w-full p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left text-[11px] font-mono flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="text-[#B4FF39] font-bold">#{alt.rank} {alt.classification}</span>{' '}
                    <span className="text-zinc-200">→ {alt.targetArchetype}</span>
                  </div>
                  <div className="text-[#00F2FF]">
                    J={alt.compositeScore >= 0 ? '+' : ''}
                    {alt.compositeScore} · P_succ {alt.successProbabilityPct}%
                  </div>
                </button>
              ))}
            </div>
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
  perspective: 'Broadcast' | 'Tactical High / Drone' | 'Goal-Line / Set-Piece' | 'Smartphone / Amateur',
  keypoints: CalibrationKeypoint[]
) {
  ctx.fillStyle = '#07111a';
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
  grad.addColorStop(0, perspective === 'Tactical High / Drone' ? '#0b1e2d' : '#0d2232');
  grad.addColorStop(1, '#102b3f');
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
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(226, 232, 240, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo((topLeftX + topRightX) / 2, topY);
  ctx.lineTo((botLeftX + botRightX) / 2, botY);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(w / 2, (topY + botY) / 2, w * 0.1, (botY - topY) * 0.16, 0, 0, Math.PI * 2);
  ctx.stroke();
}
