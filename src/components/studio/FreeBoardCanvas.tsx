import React, { useRef, useState } from 'react';
import {
  Pencil,
  Square,
  ArrowUpRight,
  Move,
  Eraser,
  RotateCcw,
  Trash2,
  Plus,
  Palette,
} from 'lucide-react';

interface FreeHandStroke {
  id: string;
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

interface TacticalRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface TacticalArrow {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

interface FreePawn {
  id: string;
  team: 'blue' | 'red';
  number: number;
  x: number;
  y: number;
}

type DrawMode = 'pen' | 'rect' | 'arrow' | 'move';

export const FreeBoardCanvas: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [mode, setMode] = useState<DrawMode>('move');
  const [activeColor, setActiveColor] = useState<string>('#FACC15'); // Giallo default
  const strokeWidth = 3;

  // Stato Disegni
  const [strokes, setStrokes] = useState<FreeHandStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[] | null>(null);

  const [rects, setRects] = useState<TacticalRect[]>([]);
  const [currentRectStart, setCurrentRectStart] = useState<{ x: number; y: number }[] | null>(null);
  const [tempRect, setTempRect] = useState<TacticalRect | null>(null);

  const [arrows, setArrows] = useState<TacticalArrow[]>([]);
  const [tempArrow, setTempArrow] = useState<TacticalArrow | null>(null);

  // Pedine
  const [pawns, setPawns] = useState<FreePawn[]>([
    // Blu (4-3-3 base)
    { id: 'b1', team: 'blue', number: 1, x: 10, y: 40 },
    { id: 'b2', team: 'blue', number: 2, x: 26, y: 15 },
    { id: 'b3', team: 'blue', number: 3, x: 26, y: 65 },
    { id: 'b4', team: 'blue', number: 4, x: 22, y: 30 },
    { id: 'b5', team: 'blue', number: 5, x: 22, y: 50 },
    { id: 'b6', team: 'blue', number: 6, x: 42, y: 40 },
    { id: 'b7', team: 'blue', number: 7, x: 75, y: 15 },
    { id: 'b8', team: 'blue', number: 8, x: 52, y: 26 },
    { id: 'b9', team: 'blue', number: 9, x: 85, y: 40 },
    { id: 'b10', team: 'blue', number: 10, x: 52, y: 54 },
    { id: 'b11', team: 'blue', number: 11, x: 75, y: 65 },
    // Rossi (4-4-2 base)
    { id: 'r1', team: 'red', number: 1, x: 110, y: 40 },
    { id: 'r2', team: 'red', number: 2, x: 95, y: 15 },
    { id: 'r3', team: 'red', number: 3, x: 95, y: 65 },
    { id: 'r4', team: 'red', number: 4, x: 98, y: 30 },
    { id: 'r5', team: 'red', number: 5, x: 98, y: 50 },
    { id: 'r6', team: 'red', number: 6, x: 78, y: 32 },
    { id: 'r7', team: 'red', number: 7, x: 68, y: 15 },
    { id: 'r8', team: 'red', number: 8, x: 78, y: 48 },
    { id: 'r9', team: 'red', number: 9, x: 58, y: 36 },
    { id: 'r10', team: 'red', number: 10, x: 58, y: 44 },
    { id: 'r11', team: 'red', number: 11, x: 68, y: 65 },
  ]);

  const [ball, setBall] = useState<{ x: number; y: number }>({ x: 60, y: 40 });
  const [draggingPawnId, setDraggingPawnId] = useState<string | null>(null);
  const [draggingBall, setDraggingBall] = useState<boolean>(false);

  // Converti coordinate mouse in coordinate campo (0..120, 0..80)
  const getPitchCoords = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const px = Math.max(0, Math.min(rect.width, e.clientX - rect.width * 0 - rect.left));
    const py = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const x = (px / rect.width) * 120;
    const y = (py / rect.height) * 80;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getPitchCoords(e);

    if (mode === 'pen') {
      setCurrentStroke([coords]);
    } else if (mode === 'rect') {
      setCurrentRectStart([coords]);
      setTempRect({
        id: `rect-${Date.now()}`,
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        color: activeColor,
      });
    } else if (mode === 'arrow') {
      setTempArrow({
        id: `arrow-${Date.now()}`,
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y,
        color: activeColor,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getPitchCoords(e);

    if (mode === 'pen' && currentStroke) {
      setCurrentStroke((prev) => (prev ? [...prev, coords] : [coords]));
    } else if (mode === 'rect' && tempRect && currentRectStart && currentRectStart[0]) {
      const start = currentRectStart[0];
      const minX = Math.min(start.x, coords.x);
      const minY = Math.min(start.y, coords.y);
      const width = Math.abs(coords.x - start.x);
      const height = Math.abs(coords.y - start.y);
      setTempRect({
        ...tempRect,
        x: minX,
        y: minY,
        width,
        height,
      });
    } else if (mode === 'arrow' && tempArrow) {
      setTempArrow({
        ...tempArrow,
        x2: coords.x,
        y2: coords.y,
      });
    } else if (mode === 'move') {
      if (draggingPawnId) {
        setPawns((prev) =>
          prev.map((p) =>
            p.id === draggingPawnId ? { ...p, x: coords.x, y: coords.y } : p
          )
        );
      } else if (draggingBall) {
        setBall({ x: coords.x, y: coords.y });
      }
    }
  };

  const handleMouseUp = () => {
    if (mode === 'pen' && currentStroke && currentStroke.length > 1) {
      setStrokes((prev) => [
        ...prev,
        {
          id: `stroke-${Date.now()}`,
          color: activeColor,
          width: strokeWidth,
          points: currentStroke,
        },
      ]);
      setCurrentStroke(null);
    } else if (mode === 'rect' && tempRect && tempRect.width > 1 && tempRect.height > 1) {
      setRects((prev) => [...prev, tempRect]);
      setTempRect(null);
      setCurrentRectStart(null);
    } else if (mode === 'arrow' && tempArrow) {
      const dist = Math.hypot(tempArrow.x2 - tempArrow.x1, tempArrow.y2 - tempArrow.y1);
      if (dist > 2) {
        setArrows((prev) => [...prev, tempArrow]);
      }
      setTempArrow(null);
    }

    setDraggingPawnId(null);
    setDraggingBall(false);
  };

  const handlePawnMouseDown = (e: React.MouseEvent, pawnId: string) => {
    if (mode === 'move') {
      e.stopPropagation();
      setDraggingPawnId(pawnId);
    }
  };

  const handleBallMouseDown = (e: React.MouseEvent) => {
    if (mode === 'move') {
      e.stopPropagation();
      setDraggingBall(true);
    }
  };

  const handleRemovePawn = (e: React.MouseEvent, pawnId: string) => {
    e.stopPropagation();
    setPawns((prev) => prev.filter((p) => p.id !== pawnId));
  };

  const addPawn = (team: 'blue' | 'red') => {
    const teamPawns = pawns.filter((p) => p.team === team);
    if (teamPawns.length >= 11) return;
    const nextNumber = teamPawns.length + 1;
    const defaultX = team === 'blue' ? 30 + teamPawns.length * 3 : 90 - teamPawns.length * 3;
    const defaultY = 40 + (teamPawns.length % 2 === 0 ? 10 : -10);
    setPawns((prev) => [
      ...prev,
      {
        id: `${team[0]}${Date.now()}`,
        team,
        number: nextNumber,
        x: defaultX,
        y: defaultY,
      },
    ]);
  };

  const handleUndo = () => {
    if (arrows.length > 0) {
      setArrows((prev) => prev.slice(0, -1));
    } else if (rects.length > 0) {
      setRects((prev) => prev.slice(0, -1));
    } else if (strokes.length > 0) {
      setStrokes((prev) => prev.slice(0, -1));
    }
  };

  const handleClearDrawings = () => {
    setStrokes([]);
    setRects([]);
    setArrows([]);
  };

  const handleResetAll = () => {
    handleClearDrawings();
    setBall({ x: 60, y: 40 });
  };

  // Funzione helper per convertire punti penna in SVG path
  const pointsToPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x} ${pts[i].y}`;
    }
    return d;
  };

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-80px)] w-full max-w-[1700px] mx-auto text-zinc-100 select-none">
      {/* Barra Superiore Strumenti della Lavagna Libera */}
      <div className="px-4 py-2.5 rounded-xl bg-[#0F0F14] border border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-1.5 mr-2">
            Lavagna Libera
          </span>

          {/* Strumenti di Interazione */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800 gap-1">
            <button
              onClick={() => setMode('move')}
              className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                mode === 'move'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Sposta liberamente pedine e pallone"
            >
              <Move className="w-3.5 h-3.5" />
              Sposta Pedine
            </button>

            <button
              onClick={() => setMode('pen')}
              className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                mode === 'pen'
                  ? 'bg-amber-400 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Disegna e scarabocchia a mano libera"
            >
              <Pencil className="w-3.5 h-3.5" />
              Penna
            </button>

            <button
              onClick={() => setMode('rect')}
              className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                mode === 'rect'
                  ? 'bg-emerald-500 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Disegna rettangoli o zone tattiche"
            >
              <Square className="w-3.5 h-3.5" />
              Rettangolo
            </button>

            <button
              onClick={() => setMode('arrow')}
              className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                mode === 'arrow'
                  ? 'bg-cyan-400 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Traccia freccia tattica"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Freccia
            </button>
          </div>

          {/* Selettore Colore */}
          <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800">
            <Palette className="w-3.5 h-3.5 text-zinc-400 mr-1" />
            {[
              { color: '#FACC15', label: 'Giallo' },
              { color: '#00E5FF', label: 'Ciano' },
              { color: '#EF4444', label: 'Rosso' },
              { color: '#FFFFFF', label: 'Bianco' },
            ].map((c) => (
              <button
                key={c.color}
                onClick={() => setActiveColor(c.color)}
                style={{ backgroundColor: c.color }}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  activeColor === c.color ? 'scale-125 border-white ring-2 ring-white/40' : 'border-zinc-700'
                }`}
                title={c.label}
              />
            ))}
          </div>

          {/* Aggiunta Pedine */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => addPawn('blue')}
              disabled={pawns.filter((p) => p.team === 'blue').length >= 11}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-950/70 hover:bg-blue-900 text-blue-300 border border-blue-800/80 flex items-center gap-1 disabled:opacity-40"
            >
              <Plus className="w-3 h-3" />
              Blu ({pawns.filter((p) => p.team === 'blue').length}/11)
            </button>

            <button
              onClick={() => addPawn('red')}
              disabled={pawns.filter((p) => p.team === 'red').length >= 11}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800/80 flex items-center gap-1 disabled:opacity-40"
            >
              <Plus className="w-3 h-3" />
              Rosso ({pawns.filter((p) => p.team === 'red').length}/11)
            </button>
          </div>
        </div>

        {/* Strumenti di Gestione e Pulizia */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0 && rects.length === 0 && arrows.length === 0}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 flex items-center gap-1 disabled:opacity-40"
            title="Annulla ultimo tratto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Annulla
          </button>

          <button
            onClick={handleClearDrawings}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 flex items-center gap-1"
            title="Cancella tutti i tratti e rettangoli lasciando le pedine"
          >
            <Eraser className="w-3.5 h-3.5 text-amber-400" />
            Pulisci Disegni
          </button>

          <button
            onClick={handleResetAll}
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-red-950/50 text-red-300 border border-zinc-700/80 hover:border-red-800 flex items-center gap-1"
            title="Ripristina palla al centro"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Area del Campo Canvas SVG */}
      <div className="flex-1 w-full bg-[#070B12] rounded-2xl border border-zinc-800 overflow-hidden relative shadow-2xl flex items-center justify-center p-2">
        <svg
          ref={svgRef}
          viewBox="0 0 120 80"
          className="w-full h-full max-h-full aspect-[120/80] cursor-crosshair select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            {/* Indicatori freccia per i vari colori */}
            {['#FACC15', '#00E5FF', '#EF4444', '#FFFFFF'].map((col) => (
              <marker
                key={col}
                id={`arrowhead-${col.replace('#', '')}`}
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 6 3, 0 6" fill={col} />
              </marker>
            ))}
          </defs>

          {/* Sfondo Campo Verde Scuro Lavagna */}
          <rect x="0" y="0" width="120" height="80" fill="#0C131F" />

          {/* Linee di Gioco Canoniche */}
          <rect x="0" y="0" width="120" height="80" fill="none" stroke="#2D3A4F" strokeWidth="0.8" />
          <line x1="60" y1="0" x2="60" y2="80" stroke="#2D3A4F" strokeWidth="0.8" />
          <circle cx="60" cy="40" r="9.15" fill="none" stroke="#2D3A4F" strokeWidth="0.8" />
          <circle cx="60" cy="40" r="0.6" fill="#2D3A4F" />

          {/* Area Rigore Sinistra */}
          <rect x="0" y="19.85" width="16.5" height="40.3" fill="none" stroke="#2D3A4F" strokeWidth="0.8" />
          <rect x="0" y="30.85" width="5.5" height="18.3" fill="none" stroke="#2D3A4F" strokeWidth="0.8" />
          <circle cx="11" cy="40" r="0.6" fill="#2D3A4F" />

          {/* Area Rigore Destra */}
          <rect x="103.5" y="19.85" width="16.5" height="40.3" fill="none" stroke="#2D3A4F" strokeWidth="0.8" />
          <rect x="114.5" y="30.85" width="5.5" height="18.3" fill="none" stroke="#2D3A4F" strokeWidth="0.8" />
          <circle cx="109" cy="40" r="0.6" fill="#2D3A4F" />

          {/* Rettangoli Tattici Disegnati */}
          {rects.map((r) => (
            <rect
              key={r.id}
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              fill={r.color}
              fillOpacity="0.18"
              stroke={r.color}
              strokeWidth="0.9"
              strokeDasharray="2,2"
              rx="1.5"
            />
          ))}
          {tempRect && (
            <rect
              x={tempRect.x}
              y={tempRect.y}
              width={tempRect.width}
              height={tempRect.height}
              fill={tempRect.color}
              fillOpacity="0.22"
              stroke={tempRect.color}
              strokeWidth="1.2"
              strokeDasharray="2,2"
              rx="1.5"
            />
          )}

          {/* Tratti a Mano Libera (Scarabocchi) */}
          {strokes.map((s) => (
            <path
              key={s.id}
              d={pointsToPath(s.points)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width * 0.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          ))}
          {currentStroke && (
            <path
              d={pointsToPath(currentStroke)}
              fill="none"
              stroke={activeColor}
              strokeWidth={strokeWidth * 0.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          )}

          {/* Frecce Tattiche */}
          {arrows.map((a) => (
            <line
              key={a.id}
              x1={a.x1}
              y1={a.y1}
              x2={a.x2}
              y2={a.y2}
              stroke={a.color}
              strokeWidth="1.2"
              markerEnd={`url(#arrowhead-${a.color.replace('#', '')})`}
            />
          ))}
          {tempArrow && (
            <line
              x1={tempArrow.x1}
              y1={tempArrow.y1}
              x2={tempArrow.x2}
              y2={tempArrow.y2}
              stroke={tempArrow.color}
              strokeWidth="1.4"
              strokeDasharray="2,2"
              markerEnd={`url(#arrowhead-${tempArrow.color.replace('#', '')})`}
            />
          )}

          {/* Pedine Giocatori */}
          {pawns.map((p) => {
            const isBlue = p.team === 'blue';
            const fillCol = isBlue ? '#2563EB' : '#DC2626';
            const strokeCol = isBlue ? '#93C5FD' : '#FCA5A5';

            return (
              <g
                key={p.id}
                transform={`translate(${p.x}, ${p.y})`}
                className="cursor-grab active:cursor-grabbing group"
                onMouseDown={(e) => handlePawnMouseDown(e, p.id)}
              >
                <circle
                  r="2.5"
                  fill={fillCol}
                  stroke={strokeCol}
                  strokeWidth="0.6"
                  className="filter drop-shadow"
                />
                <text
                  textAnchor="middle"
                  y="0.9"
                  fontSize="2.1"
                  fontWeight="bold"
                  fill="#FFFFFF"
                  fontFamily="sans-serif"
                  className="pointer-events-none select-none"
                >
                  {p.number}
                </text>

                {/* Pulsante 'X' di cancellazione rapida su hover */}
                <g
                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  transform="translate(2.2, -2.2)"
                  onClick={(e) => handleRemovePawn(e, p.id)}
                >
                  <circle r="1.1" fill="#EF4444" stroke="#FFFFFF" strokeWidth="0.25" />
                  <line x1="-0.5" y1="-0.5" x2="0.5" y2="0.5" stroke="#FFFFFF" strokeWidth="0.3" strokeLinecap="round" />
                  <line x1="0.5" y1="-0.5" x2="-0.5" y2="0.5" stroke="#FFFFFF" strokeWidth="0.3" strokeLinecap="round" />
                </g>
              </g>
            );
          })}

          {/* Token Pallone */}
          <g
            transform={`translate(${ball.x}, ${ball.y})`}
            className="cursor-grab active:cursor-grabbing"
            onMouseDown={handleBallMouseDown}
          >
            <circle r="1.8" fill="#F8FAFC" stroke="#0F172A" strokeWidth="0.5" className="filter drop-shadow" />
            <circle r="0.6" fill="#0F172A" />
          </g>
        </svg>
      </div>
    </div>
  );
};
