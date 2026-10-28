import React, { useRef, useState } from 'react';
import {
  OverlayType,
  PassEdge,
  PlayerNode,
  SixPillarsMetrics,
} from '../../core/types';

interface PitchCanvas2DProps {
  players: PlayerNode[];
  passEdges: PassEdge[];
  ballX: number;
  ballY: number;
  activeOverlays: OverlayType[];
  metrics: SixPillarsMetrics;
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string) => void;
  onMovePlayer: (id: string, x: number, y: number) => void;
  onMoveBall: (x: number, y: number) => void;
}

const PITCH_W = 120;
const PITCH_H = 80;

export const PitchCanvas2D: React.FC<PitchCanvas2DProps> = ({
  players,
  passEdges,
  ballX,
  ballY,
  activeOverlays,
  metrics,
  selectedPlayerId,
  onSelectPlayer,
  onMovePlayer,
  onMoveBall,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingBall, setDraggingBall] = useState<boolean>(false);

  const clientToPitchCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    if (!svgRef.current) return { x: 60, y: 40 };
    const rect = svgRef.current.getBoundingClientRect();
    const viewX = ((clientX - rect.left) / rect.width) * 128 - 4;
    const viewY = ((clientY - rect.top) / rect.height) * 88 - 4;
    return {
      x: Number(Math.max(1, Math.min(119, viewX)).toFixed(1)),
      y: Number(Math.max(1, Math.min(79, viewY)).toFixed(1)),
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingId && !draggingBall) return;
    const coords = clientToPitchCoords(e.clientX, e.clientY);
    if (draggingBall) {
      onMoveBall(coords.x, coords.y);
    } else if (draggingId) {
      onMovePlayer(draggingId, coords.x, coords.y);
    }
  };

  const handlePointerUp = () => {
    setDraggingId(null);
    setDraggingBall(false);
  };

  const showPitchControl = activeOverlays.includes('pitch_control');
  const showXtGrid = activeOverlays.includes('xt_grid');
  const showPassNetwork = activeOverlays.includes('pass_network');
  const showTdaGaps = activeOverlays.includes('tda_gaps');
  const showGhost = activeOverlays.includes('ghost_trajectory');

  const gridRows = metrics.pitchControlGrid.length;
  const gridCols = metrics.pitchControlGrid[0]?.length || 24;
  const cellW = PITCH_W / gridCols;
  const cellH = PITCH_H / gridRows;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#09090B] select-none overflow-hidden rounded-xl border border-zinc-800/80">
      <svg
        ref={svgRef}
        viewBox="-4 -4 128 88"
        className="w-full h-full max-h-[640px] cursor-crosshair touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <marker
            id="arrowCyan"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="3.5"
            markerHeight="3.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#00F2FF" fillOpacity="0.85" />
          </marker>
          <marker
            id="arrowLime"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#B4FF39" />
          </marker>
        </defs>

        {/* Pitch Turf Base */}
        <rect x="-2" y="-2" width="124" height="84" rx="2" fill="#0B131E" />
        <rect x="0" y="0" width="120" height="80" fill="#0D1926" />

        {[0, 20, 40, 60, 80, 100].map((stripeX) => (
          <rect
            key={stripeX}
            x={stripeX}
            y={0}
            width={10}
            height={80}
            fill="#112233"
            fillOpacity={0.35}
          />
        ))}

        {/* OVERLAY 1: Pitch Control Heatmap (ADR-Math-001) */}
        {showPitchControl &&
          metrics.pitchControlGrid.map((row, rIdx) =>
            row.map((probHome, cIdx) => {
              const delta = probHome - 0.5;
              const fill = delta >= 0 ? '#00F2FF' : '#FF6B35';
              const opacity = Math.min(0.45, Math.abs(delta) * 0.78);
              return (
                <rect
                  key={`pc-${rIdx}-${cIdx}`}
                  x={cIdx * cellW}
                  y={rIdx * cellH}
                  width={cellW + 0.08}
                  height={cellH + 0.08}
                  fill={fill}
                  fillOpacity={opacity}
                />
              );
            })
          )}

        {/* OVERLAY 2: Expected Threat (xT) Grid */}
        {showXtGrid &&
          metrics.xtGrid.map((row, rIdx) =>
            row.map((xtVal, cIdx) => {
              const norm = Math.min(1, xtVal / 0.28);
              return (
                <g key={`xt-${rIdx}-${cIdx}`}>
                  <rect
                    x={cIdx * cellW}
                    y={rIdx * cellH}
                    width={cellW}
                    height={cellH}
                    fill="#B4FF39"
                    fillOpacity={norm * 0.38}
                    stroke="#B4FF39"
                    strokeOpacity={0.12}
                    strokeWidth={0.1}
                  />
                  {xtVal >= 0.04 && (
                    <text
                      x={cIdx * cellW + cellW / 2}
                      y={rIdx * cellH + cellH / 2 + 0.6}
                      textAnchor="middle"
                      fontSize="1.5"
                      fill="#E4E4E7"
                      fillOpacity={0.75}
                      className="font-mono"
                    >
                      {xtVal.toFixed(2)}
                    </text>
                  )}
                </g>
              );
            })
          )}

        {/* Tactical Half-Space & Zone 14 Dotted Guides */}
        <line x1="0" y1="18" x2="120" y2="18" stroke="#334155" strokeWidth="0.2" strokeDasharray="1.2 1.2" />
        <line x1="0" y1="30" x2="120" y2="30" stroke="#334155" strokeWidth="0.2" strokeDasharray="1.2 1.2" />
        <line x1="0" y1="50" x2="120" y2="50" stroke="#334155" strokeWidth="0.2" strokeDasharray="1.2 1.2" />
        <line x1="0" y1="62" x2="120" y2="62" stroke="#334155" strokeWidth="0.2" strokeDasharray="1.2 1.2" />
        <line x1="40" y1="0" x2="40" y2="80" stroke="#334155" strokeWidth="0.25" strokeDasharray="1.5 1.5" />
        <line x1="80" y1="0" x2="80" y2="80" stroke="#334155" strokeWidth="0.25" strokeDasharray="1.5 1.5" />

        <rect
          x="78"
          y="26"
          width="24"
          height="28"
          fill="none"
          stroke="#00F2FF"
          strokeOpacity="0.22"
          strokeWidth="0.3"
          strokeDasharray="1 1"
        />
        <text x="90" y="28.2" textAnchor="middle" fontSize="1.6" fill="#00F2FF" fillOpacity="0.45" className="font-mono">
          ZONA 14 ({metrics.zone14ControlPct}% PC)
        </text>

        {/* Official StatsBomb 120x80 Pitch Lines */}
        <g stroke="#64748B" strokeWidth="0.35" fill="none">
          <rect x="0" y="0" width="120" height="80" />
          <line x1="60" y1="0" x2="60" y2="80" />
          <circle cx="60" cy="40" r="9.15" />
          <circle cx="60" cy="40" r="0.4" fill="#64748B" />

          <rect x="0" y="18" width="18" height="44" />
          <rect x="0" y="30" width="6" height="20" />
          <circle cx="12" cy="40" r="0.4" fill="#64748B" />
          <path d="M 18 32.5 A 9.15 9.15 0 0 1 18 47.5" />
          <rect x="-2" y="36" width="2" height="8" stroke="#94A3B8" />

          <rect x="102" y="18" width="18" height="44" />
          <rect x="114" y="30" width="6" height="20" />
          <circle cx="108" cy="40" r="0.4" fill="#64748B" />
          <path d="M 102 32.5 A 9.15 9.15 0 0 0 102 47.5" />
          <rect x="120" y="36" width="2" height="8" stroke="#94A3B8" />
        </g>

        {/* OVERLAY 4: TDA Topological Gaps H1 */}
        {showTdaGaps &&
          metrics.tdaBarcodes
            .filter((b) => b.dimension === 1 && b.centerX && b.centerY)
            .map((gap) => (
              <g key={gap.id}>
                <circle
                  cx={gap.centerX}
                  cy={gap.centerY}
                  r={gap.radius || 7}
                  fill="#B4FF39"
                  fillOpacity={0.12}
                  stroke="#B4FF39"
                  strokeWidth={0.4}
                  strokeDasharray="1.4 0.9"
                />
                <circle cx={gap.centerX} cy={gap.centerY} r="0.7" fill="#B4FF39" />
                <text
                  x={gap.centerX}
                  y={(gap.centerY || 40) - (gap.radius || 7) - 1.2}
                  textAnchor="middle"
                  fontSize="1.8"
                  fill="#B4FF39"
                  className="font-mono font-semibold"
                >
                  H₁ Pers: {gap.persistence}m
                </text>
              </g>
            ))}

        {/* OVERLAY 3: Spectral Passing Network Edges */}
        {showPassNetwork &&
          passEdges.map((edge) => {
            const p1 = players.find((p) => p.id === edge.fromId);
            const p2 = players.find((p) => p.id === edge.toId);
            if (!p1 || !p2) return null;
            const strokeW = Math.max(0.28, Math.min(1.4, edge.weight / 13));
            return (
              <g key={`${edge.fromId}-${edge.toId}`}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={edge.isAssist ? '#B4FF39' : '#00F2FF'}
                  strokeOpacity={edge.isAssist ? 0.85 : 0.55}
                  strokeWidth={strokeW}
                  markerEnd="url(#arrowCyan)"
                />
              </g>
            );
          })}

        {/* OVERLAY 5: Counterfactual Ghost Trajectory & Chess.com Best Move Arrow */}
        {showGhost && metrics.ghostTrajectory && (
          <g>
            <polyline
              points={metrics.ghostTrajectory.path.map((pt) => `${pt.x},${pt.y}`).join(' ')}
              fill="none"
              stroke="#B4FF39"
              strokeWidth="0.6"
              strokeDasharray="1.5 1"
              markerEnd="url(#arrowLime)"
            />
            <circle
              cx={metrics.ghostTrajectory.optimalX}
              cy={metrics.ghostTrajectory.optimalY}
              r="2.1"
              fill="#B4FF39"
              fillOpacity="0.22"
              stroke="#B4FF39"
              strokeWidth="0.4"
              strokeDasharray="0.8 0.8"
            />
            <text
              x={metrics.ghostTrajectory.optimalX}
              y={metrics.ghostTrajectory.optimalY + 3.8}
              textAnchor="middle"
              fontSize="1.65"
              fill="#B4FF39"
              className="font-mono"
            >
              Ghost {metrics.ghostTrajectory.playerName} (+{metrics.ghostTrajectory.xtGain} xT)
            </text>
          </g>
        )}

        {/* Player Velocity Vectors & Abstract Archetype Tokens (Zero Proper Names) */}
        {players.map((player) => {
          const isHome = player.team === 'home';
          const isSelected = player.id === selectedPlayerId;
          const primaryColor = isHome ? '#00F2FF' : '#FF6B35';
          const bgColor = isHome ? '#082F49' : '#431407';

          return (
            <g
              key={player.id}
              transform={`translate(${player.x}, ${player.y})`}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelectPlayer(player.id);
                setDraggingId(player.id);
              }}
            >
              {Math.hypot(player.vx, player.vy) > 0.3 && (
                <line
                  x1={0}
                  y1={0}
                  x2={player.vx * 2.2}
                  y2={player.vy * 2.2}
                  stroke={primaryColor}
                  strokeOpacity={0.7}
                  strokeWidth={0.35}
                />
              )}

              {isSelected && (
                <circle
                  cx={0}
                  cy={0}
                  r={3.2}
                  fill="none"
                  stroke="#B4FF39"
                  strokeWidth={0.45}
                />
              )}

              <circle
                cx={0}
                cy={0}
                r={2.25}
                fill={bgColor}
                stroke={primaryColor}
                strokeWidth={isSelected ? 0.65 : 0.45}
                filter={isSelected ? 'url(#cyanGlow)' : undefined}
              />

              <text
                x={0}
                y={0.75}
                textAnchor="middle"
                fontSize="2.1"
                fontWeight="700"
                fill="#F8FAFC"
                className="font-mono pointer-events-none"
              >
                {player.number}
              </text>

              {/* Abstract Archetype Label (Zero Proper Names) */}
              <text
                x={0}
                y={4.1}
                textAnchor="middle"
                fontSize="1.6"
                fontWeight="600"
                fill={isSelected ? '#B4FF39' : '#E2E8F0'}
                className="pointer-events-none"
              >
                {player.archetypeName}
              </text>
            </g>
          );
        })}

        {/* Interactive Ball Token */}
        <g
          transform={`translate(${ballX}, ${ballY})`}
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            e.stopPropagation();
            setDraggingBall(true);
          }}
        >
          <circle cx={0} cy={0} r={1.6} fill="#B4FF39" fillOpacity={0.25} />
          <circle cx={0} cy={0} r={1.05} fill="#FFFFFF" stroke="#09090B" strokeWidth={0.3} />
          <circle cx={0} cy={0} r={0.4} fill="#09090B" />
        </g>

        <text x="1" y="82.8" fontSize="1.55" fill="#64748B" className="font-mono">
          CANONICAL COORDS: STATSBOMB 120×80m | ZERO NOMI PROPRI (30 ARCHETIPI ASTRATTI) | DRAG PER RICALCOLO 6 PILASTRI
        </text>
        <text x="119" y="82.8" textAnchor="end" fontSize="1.55" fill="#94A3B8" className="font-mono">
          SQUADRA CASA (#00F2FF) → | ← SQUADRA OSPITE (#FF6B35)
        </text>
      </svg>
    </div>
  );
};
