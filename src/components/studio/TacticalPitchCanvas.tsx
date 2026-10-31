import React, { useRef, useState } from 'react';
import { useStudioStore } from '../../stores/studioStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useViewportStore } from '../../stores/viewportStore';
import {
  getTacticalZoneName,
  optaToStatsbomb,
  optaToSvg,
  snapOptaCoordinate,
  statsbombToOpta,
  statsbombToSvg,
  svgToOpta,
} from '../../engine/coordinateAdapter';
import { sampleXtAtCoord, solveMarkovXtWithStats } from '../../engine/mathEngine';
import { PlayerNode } from '../../core/types';
import { getPitchTheme } from '../../core/pitchThemes';

interface TacticalPitchCanvasProps {
  svgRef?: React.RefObject<SVGSVGElement | null>;
  showXtOverlay?: boolean;
  showPitchControlOverlay?: boolean;
  selectedPlayerId?: string | null;
  onSelectPlayer?: (id: string | null) => void;
}

export const TacticalPitchCanvas: React.FC<TacticalPitchCanvasProps> = ({
  svgRef: externalSvgRef,
  showXtOverlay = false,
  showPitchControlOverlay = false,
  selectedPlayerId,
  onSelectPlayer,
}) => {
  const internalSvgRef = useRef<SVGSVGElement | null>(null);
  const svgRef = externalSvgRef || internalSvgRef;

  const players = useStudioStore((s) => s.players);
  const ball = useStudioStore((s) => s.ball);
  const arrows = useStudioStore((s) => s.arrows);
  const zones = useStudioStore((s) => s.zones);
  const strokes = useStudioStore((s) => s.strokes);
  const notes = useStudioStore((s) => s.notes);
  const keyframes = useStudioStore((s) => s.keyframes);
  const activeKeyframeIndex = useStudioStore((s) => s.activeKeyframeIndex);

  const movePlayer = useStudioStore((s) => s.movePlayer);
  const moveBall = useStudioStore((s) => s.moveBall);
  const addArrow = useStudioStore((s) => s.addArrow);
  const addZone = useStudioStore((s) => s.addZone);
  const addStroke = useStudioStore((s) => s.addStroke);
  const addNote = useStudioStore((s) => s.addNote);
  const deleteElementById = useStudioStore((s) => s.deleteElementById);
  const ballCarrierId = useStudioStore((s) => s.ballCarrierId);
  const setBallCarrierId = useStudioStore((s) => s.setBallCarrierId);

  const activeTool = useSelectionStore((s) => s.activeTool);
  const activeArrowType = useSelectionStore((s) => s.activeArrowType);
  const activeArrowStyle = useSelectionStore((s) => s.activeArrowStyle);
  const activeZoneShape = useSelectionStore((s) => s.activeZoneShape);
  const activeColor = useSelectionStore((s) => s.activeColor);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const selectSingle = useSelectionStore((s) => s.selectSingle);

  const gridVisible = useViewportStore((s) => s.gridVisible);
  const halfSpacesVisible = useViewportStore((s) => s.halfSpacesVisible);
  const snapEnabled = useViewportStore((s) => s.snapEnabled);
  const blindMode = useViewportStore((s) => s.blindMode);
  const showHomeTeam = useViewportStore((s) => s.showHomeTeam);
  const showAwayTeam = useViewportStore((s) => s.showAwayTeam);
  const onionSkinEnabled = useViewportStore((s) => s.onionSkinEnabled);
  const ghostTrailsEnabled = useViewportStore((s) => s.ghostTrailsEnabled);
  const zoom = useViewportStore((s) => s.zoom);
  const tokenScale = useViewportStore((s) => s.tokenScale);
  const colorblindSafe = useViewportStore((s) => s.colorblindSafe);
  const hiddenPlayerIds = useViewportStore((s) => s.hiddenPlayerIds);
  const togglePlayerVisibility = useViewportStore((s) => s.togglePlayerVisibility);
  const theme = useViewportStore((s) => s.theme);
  const currentTheme = getPitchTheme(theme);

  const [draggingEntity, setDraggingEntity] = useState<{
    type: 'player' | 'ball';
    id: string;
    recordedHistory: boolean;
  } | null>(null);

  const [draftVector, setDraftVector] = useState<{
    startX: number;
    startY: number;
    currX: number;
    currY: number;
  } | null>(null);

  const [draftStroke, setDraftStroke] = useState<Array<{ x: number; y: number }>>([]);
  const [telemetry, setTelemetry] = useState<{
    optaX: number;
    optaY: number;
    sbX: number;
    sbY: number;
    zoneName: string;
    xtValue: number;
  }>({
    optaX: 50,
    optaY: 50,
    sbX: 60,
    sbY: 40,
    zoneName: 'Corridoio Centrale · Terzo Centrale (Costruzione)',
    xtValue: 0.024,
  });

  const [noteDraftPos, setNoteDraftPos] = useState<{ x: number; y: number } | null>(null);
  const [noteDraftText, setNoteDraftText] = useState('');

  // Valori xT calcolati dal Bellman solver reale di OpenPitch
  const xtGrid = React.useMemo(() => solveMarkovXtWithStats().grid, []);

  const getCanvasCoordinates = (e: React.PointerEvent<SVGSVGElement>): { optaX: number; optaY: number; sbX: number; sbY: number } => {
    const svg = svgRef.current;
    if (!svg) return { optaX: 50, optaY: 50, sbX: 60, sbY: 40 };
    const rect = svg.getBoundingClientRect();
    const rawSvgX = ((e.clientX - rect.left) / rect.width) * 1050;
    const rawSvgY = ((e.clientY - rect.top) / rect.height) * 680;
    const opta = svgToOpta(rawSvgX, rawSvgY);
    const sb = optaToStatsbomb(opta.x, opta.y);
    return {
      optaX: opta.x,
      optaY: opta.y,
      sbX: sb.x,
      sbY: sb.y,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const { optaX, optaY, sbX, sbY } = getCanvasCoordinates(e);

    if (activeTool === 'arrow' || activeTool === 'zone') {
      const snapped = snapOptaCoordinate(optaX, optaY, snapEnabled);
      const snappedSb = optaToStatsbomb(snapped.x, snapped.y);
      setDraftVector({
        startX: snappedSb.x,
        startY: snappedSb.y,
        currX: snappedSb.x,
        currY: snappedSb.y,
      });
    } else if (activeTool === 'pen' || activeTool === 'highlighter') {
      setDraftStroke([{ x: sbX, y: sbY }]);
    } else if (activeTool === 'note') {
      setNoteDraftPos({ x: sbX, y: sbY });
      setNoteDraftText('');
    } else if (activeTool === 'select') {
      if ((e.target as Element).tagName === 'svg' || (e.target as Element).getAttribute('data-pitch-bg') === 'true') {
        selectSingle(null);
        onSelectPlayer?.(null);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const { optaX, optaY, sbX, sbY } = getCanvasCoordinates(e);
    const zoneName = getTacticalZoneName(optaX, optaY);
    const xtValue = sampleXtAtCoord(sbX, sbY, xtGrid);

    setTelemetry({ optaX, optaY, sbX, sbY, zoneName, xtValue });

    if (draggingEntity) {
      const snapped = snapOptaCoordinate(optaX, optaY, snapEnabled);
      const snappedSb = optaToStatsbomb(snapped.x, snapped.y);
      if (draggingEntity.type === 'player') {
        movePlayer(draggingEntity.id, snappedSb.x, snappedSb.y, !draggingEntity.recordedHistory);
      } else {
        moveBall(snappedSb.x, snappedSb.y, !draggingEntity.recordedHistory);
      }
      if (!draggingEntity.recordedHistory) {
        setDraggingEntity({ ...draggingEntity, recordedHistory: true });
      }
      return;
    }

    if (draftVector) {
      const snapped = snapOptaCoordinate(optaX, optaY, snapEnabled);
      const snappedSb = optaToStatsbomb(snapped.x, snapped.y);
      setDraftVector({
        ...draftVector,
        currX: snappedSb.x,
        currY: snappedSb.y,
      });
      return;
    }

    if (draftStroke.length > 0) {
      setDraftStroke((prev) => [...prev, { x: sbX, y: sbY }]);
    }
  };

  const handlePointerUp = () => {
    if (draggingEntity) {
      setDraggingEntity(null);
    }

    if (draftVector) {
      const dx = draftVector.currX - draftVector.startX;
      const dy = draftVector.currY - draftVector.startY;
      const dist = Math.hypot(dx, dy);

      if (dist > 3.0) {
        if (activeTool === 'arrow') {
          const midX = (draftVector.startX + draftVector.currX) / 2;
          const midY = (draftVector.startY + draftVector.currY) / 2 - 6;
          addArrow({
            type: activeArrowType,
            style: activeArrowStyle,
            fromX: draftVector.startX,
            fromY: draftVector.startY,
            toX: draftVector.currX,
            toY: draftVector.currY,
            controlX: activeArrowStyle === 'curved' ? midX : undefined,
            controlY: activeArrowStyle === 'curved' ? midY : undefined,
            color: activeColor,
            strokeWidth: 2.6,
            label: `${activeArrowType.toUpperCase()} (ΔxT: +${(sampleXtAtCoord(draftVector.currX, draftVector.currY, xtGrid) - sampleXtAtCoord(draftVector.startX, draftVector.startY, xtGrid)).toFixed(3)})`,
          });
        } else if (activeTool === 'zone') {
          const x = Math.min(draftVector.startX, draftVector.currX);
          const y = Math.min(draftVector.startY, draftVector.currY);
          const width = Math.abs(dx);
          const height = Math.abs(dy);
          addZone({
            shape: activeZoneShape,
            x,
            y,
            width,
            height,
            color: activeColor,
            opacity: 0.16,
            label: getTacticalZoneName(statsbombToOpta(x + width / 2, y + height / 2).x, statsbombToOpta(x + width / 2, y + height / 2).y).split(' · ')[0],
          });
        }
      }
      setDraftVector(null);
    }

    if (draftStroke.length > 1) {
      addStroke({
        tool: activeTool === 'highlighter' ? 'highlighter' : 'pen',
        points: draftStroke,
        color: activeColor,
        strokeWidth: activeTool === 'highlighter' ? 14 : 3,
      });
      setDraftStroke([]);
    } else if (draftStroke.length > 0) {
      setDraftStroke([]);
    }
  };

  const handleCreateNote = () => {
    if (noteDraftPos && noteDraftText.trim()) {
      addNote({
        x: noteDraftPos.x,
        y: noteDraftPos.y,
        text: noteDraftText.trim(),
        color: activeColor,
      });
      setNoteDraftPos(null);
      setNoteDraftText('');
    }
  };

  const homeColor = colorblindSafe ? '#38BDF8' : '#00E5FF';
  const awayColor = colorblindSafe ? '#FB923C' : '#FF4D6D';
  const prevKeyframe = activeKeyframeIndex > 0 ? keyframes[activeKeyframeIndex - 1] : null;

  const visiblePlayers = players.filter((p) => {
    if (p.team === 'home' && !showHomeTeam) return false;
    if (p.team === 'away' && !showAwayTeam) return false;
    if (hiddenPlayerIds.includes(p.id)) return false;
    return true;
  });

  return (
    <div className="relative w-full select-none overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950 shadow-2xl">
      {/* Telemetria Spaziale Superiore (Integrazione OpenPitch Math + Opta + FIFA) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 bg-slate-900/95 px-4 py-2 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <span className="font-mono font-semibold text-cyan-400 tabular-nums">
            OPTA: {telemetry.optaX.toFixed(1)}, {telemetry.optaY.toFixed(1)}
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono font-semibold text-lime-400 tabular-nums">
            StatsBomb: {telemetry.sbX.toFixed(1)}m × {telemetry.sbY.toFixed(1)}m
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-medium text-slate-200">{telemetry.zoneName}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
          <span className="text-cyan-300">
            xT Cella: <strong>{telemetry.xtValue.toFixed(4)}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>FIFA 105×68m</span>
          <span className="text-slate-600">|</span>
          <span className={snapEnabled ? 'text-lime-400' : 'text-slate-500'}>
            Snap: {snapEnabled ? 'ON' : 'OFF'}
          </span>
          {blindMode && (
            <span className="font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
              LAVAGNA CIECA
            </span>
          )}
        </div>
      </div>

      {/* Canvas SVG Campo FIFA 105x68 */}
      <div className="relative flex items-center justify-center p-3 sm:p-5 bg-slate-950">
        <svg
          ref={svgRef}
          viewBox="0 0 1050 680"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className={`w-full max-w-[1180px] aspect-[105/68] rounded-xl shadow-2xl transition-transform duration-100 ${
            activeTool === 'select'
              ? 'cursor-default'
              : activeTool === 'eraser'
              ? 'cursor-pointer'
              : 'cursor-crosshair'
          }`}
        >
          <defs>
            <marker id="op-arrow-cyan" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#00E5FF" />
            </marker>
            <marker id="op-arrow-lime" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#A8FF60" />
            </marker>
            <marker id="op-arrow-warn" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#FFB020" />
            </marker>
            <marker id="op-arrow-danger" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#FF4D6D" />
            </marker>
            <marker id="op-arrow-purple" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#C084FC" />
            </marker>
            <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Manto Erboso con strisce di falciatura verticali realistiche */}
          <rect x="0" y="0" width="1050" height="680" fill={currentTheme.turfBase} data-pitch-bg="true" />
          {Array.from({ length: 10 }).map((_, idx) => (
            <rect
              key={`turf_stripe_${idx}`}
              x={idx * 105}
              y="0"
              width="52.5"
              height="680"
              fill={currentTheme.turfStripe}
              opacity={currentTheme.stripeOpacity}
              data-pitch-bg="true"
            />
          ))}

          {/* 2. Overlay Expected Threat (xT) su griglia Markoviana reale 16x24 */}
          {showXtOverlay && (
            <g pointerEvents="none" opacity="0.65">
              {xtGrid.map((row, r) =>
                row.map((val, c) => {
                  const cellW = 1050 / 24;
                  const cellH = 680 / 16;
                  const intensity = Math.min(0.65, val * 3.5);
                  return (
                    <rect
                      key={`xt_${r}_${c}`}
                      x={c * cellW}
                      y={r * cellH}
                      width={cellW}
                      height={cellH}
                      fill="#00E5FF"
                      opacity={intensity}
                      stroke="rgba(0,229,255,0.12)"
                    />
                  );
                })
              )}
            </g>
          )}

          {/* 3. Half-Spaces & Corridoi Verticali */}
          {halfSpacesVisible && (
            <g pointerEvents="none">
              {/* Half-Space Sinistro (Y: 18% a 36%) */}
              <rect
                x="0"
                y={optaToSvg(0, 18).y}
                width="1050"
                height={optaToSvg(0, 18).y}
                fill={currentTheme.halfSpaceFill}
                stroke={currentTheme.halfSpaceStroke}
                strokeDasharray="5 5"
              />
              <text x="525" y={optaToSvg(0, 27).y + 4} textAnchor="middle" fill={currentTheme.halfSpaceText} fontSize="10" fontFamily="monospace" opacity="0.6">
                HALF-SPACE SINISTRO
              </text>

              {/* Half-Space Destro (Y: 64% a 82%) */}
              <rect
                x="0"
                y={optaToSvg(0, 64).y}
                width="1050"
                height={optaToSvg(0, 18).y}
                fill={currentTheme.halfSpaceFill}
                stroke={currentTheme.halfSpaceStroke}
                strokeDasharray="5 5"
              />
              <text x="525" y={optaToSvg(0, 73).y + 4} textAnchor="middle" fill={currentTheme.halfSpaceText} fontSize="10" fontFamily="monospace" opacity="0.6">
                HALF-SPACE DESTRO
              </text>
            </g>
          )}

          {/* 4. Griglia 18 Zone Tattiche */}
          {gridVisible && (
            <g stroke={currentTheme.gridLineColor} strokeWidth="1" strokeDasharray="4 4" pointerEvents="none">
              <line x1={optaToSvg(33.3, 0).x} y1="0" x2={optaToSvg(33.3, 0).x} y2="680" />
              <line x1={optaToSvg(66.7, 0).x} y1="0" x2={optaToSvg(66.7, 0).x} y2="680" />
              <line x1="0" y1={optaToSvg(0, 18).y} x2="1050" y2={optaToSvg(0, 18).y} />
              <line x1="0" y1={optaToSvg(0, 36).y} x2="1050" y2={optaToSvg(0, 36).y} />
              <line x1="0" y1={optaToSvg(0, 64).y} x2="1050" y2={optaToSvg(0, 64).y} />
              <line x1="0" y1={optaToSvg(0, 82).y} x2="1050" y2={optaToSvg(0, 82).y} />
            </g>
          )}

          {/* 5. Tracciature Regolamentari FIFA 105x68m (Bianco Crema / Colore Tema) */}
          <g
            stroke={currentTheme.lineColor}
            strokeWidth={currentTheme.lineWidth}
            strokeOpacity={currentTheme.lineOpacity}
            fill="none"
            pointerEvents="none"
          >
            {/* Perimetro */}
            <rect x="20" y="20" width="1010" height="640" rx="1" />
            {/* Centrocampo & Cerchio */}
            <line x1="525" y1="20" x2="525" y2="660" />
            <circle cx="525" cy="340" r="91.5" />
            <circle cx="525" cy="340" r="3.5" fill={currentTheme.centerDotColor} />

            {/* Area Rigore Sinistra (Casa) */}
            <rect x="20" y="138.5" width="165" height="403" />
            <rect x="20" y="248.5" width="55" height="183" />
            <circle cx="130" cy="340" r="3.5" fill={currentTheme.centerDotColor} />
            <path d="M 185 267 A 91.5 91.5 0 0 1 185 413" />
            <rect x="8" y="303.4" width="12" height="73.2" strokeOpacity={currentTheme.lineOpacity} />

            {/* Area Rigore Destra (Ospite) */}
            <rect x="865" y="138.5" width="165" height="403" />
            <rect x="975" y="248.5" width="55" height="183" />
            <circle cx="920" cy="340" r="3.5" fill={currentTheme.centerDotColor} />
            <path d="M 865 267 A 91.5 91.5 0 0 0 865 413" />
            <rect x="1030" y="303.4" width="12" height="73.2" strokeOpacity={currentTheme.lineOpacity} />
          </g>

          {/* 6. Zone Tattiche Disegnate */}
          {zones.map((zone) => {
            const isSelected = selectedIds.includes(zone.id);
            const p = statsbombToSvg(zone.x, zone.y);
            const dim = {
              w: (zone.width / 120) * 1050,
              h: (zone.height / 80) * 680,
            };
            return (
              <g
                key={zone.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTool === 'eraser') deleteElementById(zone.id);
                  else selectSingle(zone.id);
                }}
                className="cursor-pointer"
              >
                {zone.shape === 'circle' ? (
                  <ellipse
                    cx={p.x + dim.w / 2}
                    cy={p.y + dim.h / 2}
                    rx={Math.max(16, dim.w / 2)}
                    ry={Math.max(16, dim.h / 2)}
                    fill={zone.color}
                    fillOpacity={zone.opacity}
                    stroke={zone.color}
                    strokeWidth={isSelected ? 3 : 1.5}
                    strokeDasharray="6 4"
                  />
                ) : (
                  <rect
                    x={p.x}
                    y={p.y}
                    width={dim.w}
                    height={dim.h}
                    rx="8"
                    fill={zone.color}
                    fillOpacity={zone.opacity}
                    stroke={zone.color}
                    strokeWidth={isSelected ? 3 : 1.5}
                    strokeDasharray="6 4"
                  />
                )}
                {zone.label && (
                  <text
                    x={p.x + dim.w / 2}
                    y={p.y + dim.h / 2 + 4}
                    textAnchor="middle"
                    fill="#EAF2FF"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="sans-serif"
                  >
                    {zone.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Anteprima Disegno Zona */}
          {draftVector && activeTool === 'zone' && (
            <rect
              x={statsbombToSvg(Math.min(draftVector.startX, draftVector.currX), 0).x}
              y={statsbombToSvg(0, Math.min(draftVector.startY, draftVector.currY)).y}
              width={(Math.abs(draftVector.currX - draftVector.startX) / 120) * 1050}
              height={(Math.abs(draftVector.currY - draftVector.startY) / 80) * 680}
              fill={activeColor}
              fillOpacity="0.18"
              stroke={activeColor}
              strokeWidth="2"
              strokeDasharray="5 5"
              pointerEvents="none"
            />
          )}

          {/* 7. Tratti a Mano Libera ed Evidenziatore */}
          {strokes.map((st) => {
            if (st.points.length < 2) return null;
            const d = st.points
              .map((pt, idx) => {
                const s = statsbombToSvg(pt.x, pt.y);
                return `${idx === 0 ? 'M' : 'L'} ${s.x} ${s.y}`;
              })
              .join(' ');
            return (
              <path
                key={st.id}
                d={d}
                fill="none"
                stroke={st.color}
                strokeWidth={st.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={st.tool === 'highlighter' ? 0.35 : 0.9}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTool === 'eraser') deleteElementById(st.id);
                }}
                className="cursor-pointer"
              />
            );
          })}
          {draftStroke.length > 1 && (
            <path
              d={draftStroke
                .map((pt, idx) => {
                  const s = statsbombToSvg(pt.x, pt.y);
                  return `${idx === 0 ? 'M' : 'L'} ${s.x} ${s.y}`;
                })
                .join(' ')}
              fill="none"
              stroke={activeColor}
              strokeWidth={activeTool === 'highlighter' ? 14 : 3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={activeTool === 'highlighter' ? 0.35 : 0.9}
              pointerEvents="none"
            />
          )}

          {/* 8. Frecce Tattiche con Bézier e Glow */}
          {arrows.map((arr) => {
            const isSelected = selectedIds.includes(arr.id);
            const p1 = statsbombToSvg(arr.fromX, arr.fromY);
            const p2 = statsbombToSvg(arr.toX, arr.toY);
            const c = arr.controlX !== undefined && arr.controlY !== undefined
              ? statsbombToSvg(arr.controlX, arr.controlY)
              : { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 - 20 };

            const pathD =
              arr.style === 'curved'
                ? `M ${p1.x} ${p1.y} Q ${c.x} ${c.y} ${p2.x} ${p2.y}`
                : `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

            const markerUrl =
              arr.color === '#A8FF60'
                ? 'url(#op-arrow-lime)'
                : arr.color === '#FFB020'
                ? 'url(#op-arrow-warn)'
                : arr.color === '#FF4D6D'
                ? 'url(#op-arrow-danger)'
                : arr.color === '#C084FC'
                ? 'url(#op-arrow-purple)'
                : 'url(#op-arrow-cyan)';

            return (
              <g
                key={arr.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTool === 'eraser') deleteElementById(arr.id);
                  else selectSingle(arr.id);
                }}
                className="cursor-pointer"
              >
                <path
                  d={pathD}
                  fill="none"
                  stroke={arr.color}
                  strokeWidth={isSelected ? arr.strokeWidth + 2 : arr.strokeWidth}
                  strokeDasharray={arr.style === 'dashed' || isSelected ? '8 5' : undefined}
                  markerEnd={markerUrl}
                  filter="url(#neon-glow-cyan)"
                />
                {arr.label && (
                  <text
                    x={(p1.x + p2.x) / 2}
                    y={(p1.y + p2.y) / 2 - 8}
                    textAnchor="middle"
                    fill={arr.color}
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {arr.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Anteprima Freccia in Bozza */}
          {draftVector && activeTool === 'arrow' && (
            <line
              x1={statsbombToSvg(draftVector.startX, draftVector.startY).x}
              y1={statsbombToSvg(draftVector.startX, draftVector.startY).y}
              x2={statsbombToSvg(draftVector.currX, draftVector.currY).x}
              y2={statsbombToSvg(draftVector.currX, draftVector.currY).y}
              stroke={activeColor}
              strokeWidth="2.8"
              strokeDasharray="6 4"
              markerEnd="url(#op-arrow-cyan)"
              pointerEvents="none"
            />
          )}

          {/* 9. Onion Skin & Ghost Trails (Silhouette Keyframe Precedente) */}
          {prevKeyframe &&
            visiblePlayers.map((p) => {
              const prevPos = prevKeyframe.players[p.id];
              if (!prevPos) return null;
              const dist = Math.hypot(prevPos.x - p.x, prevPos.y - p.y);
              if (dist < 1.0) return null;

              const currSvg = statsbombToSvg(p.x, p.y);
              const prevSvg = statsbombToSvg(prevPos.x, prevPos.y);
              const col = p.team === 'home' ? homeColor : awayColor;

              return (
                <g key={`onion_${p.id}`} pointerEvents="none">
                  {ghostTrailsEnabled && (
                    <line
                      x1={prevSvg.x}
                      y1={prevSvg.y}
                      x2={currSvg.x}
                      y2={currSvg.y}
                      stroke={col}
                      strokeWidth="1.5"
                      strokeDasharray="3 4"
                      strokeOpacity="0.4"
                    />
                  )}
                  {onionSkinEnabled && (
                    <circle
                      cx={prevSvg.x}
                      cy={prevSvg.y}
                      r={15 * tokenScale}
                      fill="none"
                      stroke={col}
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      strokeOpacity="0.35"
                    />
                  )}
                </g>
              );
            })}

          {/* 10. Pedine Giocatori (Tipologie Astratte con Dischi Glass) */}
          {visiblePlayers.map((player) => {
            const pos = statsbombToSvg(player.x, player.y);
            const isSelected = selectedPlayerId === player.id || selectedIds.includes(player.id);
            const isHome = player.team === 'home';
            const baseColor = isHome ? homeColor : awayColor;

            return (
              <g
                key={player.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (activeTool === 'select') {
                    selectSingle(player.id);
                    onSelectPlayer?.(player.id);
                    setDraggingEntity({ type: 'player', id: player.id, recordedHistory: false });
                  } else if (activeTool === 'eraser') {
                    // Non eliminiamo i giocatori titolari
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  togglePlayerVisibility(player.id);
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                {/* Indicatore Possesso Palla Agganciato (Magnet) */}
                {ballCarrierId === player.id && (
                  <g pointerEvents="none">
                    <circle
                      r={24 * tokenScale}
                      fill="none"
                      stroke="#FACC15"
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      className="animate-pulse"
                    />
                    <circle
                      cx={13 * tokenScale}
                      cy={-13 * tokenScale}
                      r={4.5}
                      fill="#FACC15"
                      stroke="#000000"
                      strokeWidth="1"
                    />
                  </g>
                )}

                {/* Alone di selezione */}
                {isSelected && (
                  <circle
                    r={22 * tokenScale}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                    className="animate-spin-slow"
                  />
                )}

                {/* Glow squadra */}
                <circle
                  r={16 * tokenScale}
                  fill={baseColor}
                  fillOpacity="0.25"
                  stroke={baseColor}
                  strokeWidth="2"
                />

                {/* Disco Giocatore Glass */}
                <circle
                  r={13 * tokenScale}
                  fill="#0B132B"
                  stroke={baseColor}
                  strokeWidth="1.5"
                />

                {/* Numero Maglia o Punto Cieco */}
                {!blindMode ? (
                  <text
                    y="4.5"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={11 * tokenScale}
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {player.number}
                  </text>
                ) : (
                  <circle r="3" fill="#FFFFFF" opacity="0.6" />
                )}

                {/* Etichetta Ruolo Astratto sotto la pedina */}
                {!blindMode && (
                  <text
                    y={22 * tokenScale}
                    textAnchor="middle"
                    fill={isHome ? '#A5F3FC' : '#FECDD3'}
                    fontSize="9.5"
                    fontWeight="600"
                    fontFamily="sans-serif"
                    opacity="0.9"
                    className="select-none pointer-events-none"
                  >
                    {player.archetypeName}
                  </text>
                )}
              </g>
            );
          })}

          {/* 11. Token Pallone (Draggable con Snap Magnetico al Portatore) */}
          {(() => {
            const ballSvg = statsbombToSvg(ball.x, ball.y);
            return (
              <g
                transform={`translate(${ballSvg.x}, ${ballSvg.y})`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (activeTool === 'select') {
                    setDraggingEntity({ type: 'ball', id: 'ball', recordedHistory: false });
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setBallCarrierId(null);
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <title>{ballCarrierId ? "Doppio clic per liberare il possesso" : "Trascina su un giocatore per agganciare la palla"}</title>
                <circle r={ballCarrierId ? "15" : "12"} fill="#FACC15" fillOpacity={ballCarrierId ? "0.4" : "0.25"} className={ballCarrierId ? "animate-pulse" : ""} />
                <circle r="7.5" fill="#FFFFFF" stroke="#000000" strokeWidth="1.5" />
                <circle r="2.5" fill="#000000" />
              </g>
            );
          })()}

          {/* 12. Note Tattiche sul Campo */}
          {notes.map((note) => {
            const pos = statsbombToSvg(note.x, note.y);
            return (
              <g
                key={note.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTool === 'eraser') deleteElementById(note.id);
                }}
                className="cursor-pointer"
              >
                <rect
                  x="-8"
                  y="-8"
                  width="130"
                  height="36"
                  rx="6"
                  fill="#1E293B"
                  stroke={note.color || '#00E5FF'}
                  strokeWidth="1.5"
                  fillOpacity="0.92"
                />
                <text x="6" y="14" fill="#F8FAFC" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">
                  {note.text}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Modal / Dialog per inserimento nuova nota */}
      {noteDraftPos && (
        <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 w-full max-w-sm shadow-2xl">
            <h4 className="text-xs font-bold text-cyan-400 mb-2">Inserisci Nota Tattica</h4>
            <input
              type="text"
              autoFocus
              value={noteDraftText}
              onChange={(e) => setNoteDraftText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateNote();
                if (e.key === 'Escape') setNoteDraftPos(null);
              }}
              placeholder="Es. Sfruttare superiorità 2v1..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoteDraftPos(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleCreateNote}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              >
                Salva Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

