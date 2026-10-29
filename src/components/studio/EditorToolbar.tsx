import React from 'react';
import {
  MousePointer,
  ArrowRight,
  Square,
  Circle,
  PenTool,
  Highlighter,
  StickyNote,
  Eraser,
  Undo2,
  Redo2,
  Grid,
  Magnet,
  EyeOff,
  RotateCcw,
  Trash2,
  Layers,
  BookOpen,
  Palette,
} from 'lucide-react';
import { useSelectionStore, EditorTool } from '../../stores/selectionStore';
import { useViewportStore } from '../../stores/viewportStore';
import { useStudioStore } from '../../stores/studioStore';
import { useHistoryStore } from '../../stores/historyStore';
import { ArrowType, FormationPreset, TacticalTheme } from '../../core/types';
import { COACHING_STRATEGIES_CATALOG } from '../../core/tacticalStrategiesCatalog';

interface EditorToolbarProps {
  onNotify?: (msg: string) => void;
}

const FORMATIONS: FormationPreset[] = [
  '4-3-3',
  '4-2-3-1',
  '3-5-2',
  '4-4-2',
  '3-4-3',
  '5-3-2',
  '4-1-4-1',
];

const COLORS = [
  { hex: '#00E5FF', label: 'Cyan' },
  { hex: '#A8FF60', label: 'Lime' },
  { hex: '#FFB020', label: 'Ambra' },
  { hex: '#FF4D6D', label: 'Rosso' },
  { hex: '#C084FC', label: 'Viola' },
];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onNotify }) => {
  const activeTool = useSelectionStore((s) => s.activeTool);
  const activeArrowType = useSelectionStore((s) => s.activeArrowType);
  const activeArrowStyle = useSelectionStore((s) => s.activeArrowStyle);
  const activeZoneShape = useSelectionStore((s) => s.activeZoneShape);
  const activeColor = useSelectionStore((s) => s.activeColor);

  const setActiveTool = useSelectionStore((s) => s.setActiveTool);
  const setActiveArrowType = useSelectionStore((s) => s.setActiveArrowType);
  const setActiveArrowStyle = useSelectionStore((s) => s.setActiveArrowStyle);
  const setActiveZoneShape = useSelectionStore((s) => s.setActiveZoneShape);
  const setActiveColor = useSelectionStore((s) => s.setActiveColor);

  const gridVisible = useViewportStore((s) => s.gridVisible);
  const halfSpacesVisible = useViewportStore((s) => s.halfSpacesVisible);
  const snapEnabled = useViewportStore((s) => s.snapEnabled);
  const blindMode = useViewportStore((s) => s.blindMode);
  const toggleGrid = useViewportStore((s) => s.toggleGrid);
  const toggleHalfSpaces = useViewportStore((s) => s.toggleHalfSpaces);
  const toggleSnap = useViewportStore((s) => s.toggleSnap);
  const toggleBlindMode = useViewportStore((s) => s.toggleBlindMode);
  const theme = useViewportStore((s) => s.theme);
  const setTheme = useViewportStore((s) => s.setTheme);

  const homeFormation = useStudioStore((s) => s.homeFormation);
  const awayFormation = useStudioStore((s) => s.awayFormation);
  const activeStrategyId = useStudioStore((s) => s.activeStrategyId);
  const setHomeFormation = useStudioStore((s) => s.setHomeFormation);
  const setAwayFormation = useStudioStore((s) => s.setAwayFormation);
  const clearCanvasDrawings = useStudioStore((s) => s.clearCanvasDrawings);
  const resetToInitialPreset = useStudioStore((s) => s.resetToInitialPreset);
  const applyCoachingStrategy = useStudioStore((s) => s.applyCoachingStrategy);

  const past = useHistoryStore((s) => s.past);
  const future = useHistoryStore((s) => s.future);

  const handleUndo = () => {
    const current = useStudioStore.getState();
    const prev = useHistoryStore.getState().popPast(current);
    if (prev) {
      useStudioStore.setState(prev);
      onNotify?.('Annullata ultima modifica.');
    }
  };

  const handleRedo = () => {
    const current = useStudioStore.getState();
    const next = useHistoryStore.getState().popFuture(current);
    if (next) {
      useStudioStore.setState(next);
      onNotify?.('Ripristinata modifica.');
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
      {/* Gruppo 1: Strumenti di disegno primari */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTool('select')}
          title="Seleziona e Trascina Pedine"
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            activeTool === 'select'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'border border-slate-700/60 bg-slate-800 text-slate-300 hover:border-slate-500'
          }`}
        >
          <MousePointer className="h-3.5 w-3.5" />
          <span>Sposta</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('arrow')}
          title="Disegna Freccia Tattica"
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            activeTool === 'arrow'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'border border-slate-700/60 bg-slate-800 text-slate-300 hover:border-slate-500'
          }`}
        >
          <ArrowRight className="h-3.5 w-3.5" />
          <span>Freccia</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('zone')}
          title="Disegna Zona Tattica"
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            activeTool === 'zone'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'border border-slate-700/60 bg-slate-800 text-slate-300 hover:border-slate-500'
          }`}
        >
          <Square className="h-3.5 w-3.5" />
          <span>Zona</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('pen')}
          title="Tratto a Mano Libera"
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            activeTool === 'pen'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'border border-slate-700/60 bg-slate-800 text-slate-300 hover:border-slate-500'
          }`}
        >
          <PenTool className="h-3.5 w-3.5" />
          <span>Penna</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('highlighter')}
          title="Evidenziatore Spaziale"
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            activeTool === 'highlighter'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'border border-slate-700/60 bg-slate-800 text-slate-300 hover:border-slate-500'
          }`}
        >
          <Highlighter className="h-3.5 w-3.5" />
          <span>Evidenzia</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('note')}
          title="Inserisci Nota Tattica"
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            activeTool === 'note'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'border border-slate-700/60 bg-slate-800 text-slate-300 hover:border-slate-500'
          }`}
        >
          <StickyNote className="h-3.5 w-3.5" />
          <span>Nota</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('eraser')}
          title="Gomma: clicca su un elemento per rimuoverlo"
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            activeTool === 'eraser'
              ? 'bg-rose-500 text-slate-950 shadow-sm'
              : 'border border-slate-700/60 bg-slate-800 text-slate-300 hover:border-slate-500'
          }`}
        >
          <Eraser className="h-3.5 w-3.5" />
          <span>Gomma</span>
        </button>
      </div>

      {/* Gruppo 2: Tipologie freccia / forma zona contestuali */}
      {activeTool === 'arrow' && (
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2 py-1 border border-slate-700/60">
          {(['pass', 'run', 'cross', 'pressing'] as ArrowType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveArrowType(type)}
              className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                activeArrowType === type
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {type === 'pass' && 'Passaggio'}
              {type === 'run' && 'Corsa'}
              {type === 'cross' && 'Cross'}
              {type === 'pressing' && 'Pressing'}
            </button>
          ))}
          <div className="h-4 w-px bg-slate-700 mx-1" />
          <button
            type="button"
            onClick={() => setActiveArrowStyle(activeArrowStyle === 'curved' ? 'straight' : 'curved')}
            className={`rounded px-2 py-1 text-[11px] font-medium border ${
              activeArrowStyle === 'curved'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-slate-700 text-slate-400'
            }`}
          >
            Curva (Bézier)
          </button>
        </div>
      )}

      {activeTool === 'zone' && (
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2 py-1 border border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveZoneShape('rect')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium ${
              activeZoneShape === 'rect' ? 'bg-cyan-400 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            <Square className="h-3 w-3" /> Rettangolo
          </button>
          <button
            type="button"
            onClick={() => setActiveZoneShape('circle')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium ${
              activeZoneShape === 'circle' ? 'bg-cyan-400 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            <Circle className="h-3 w-3" /> Ellisse
          </button>
        </div>
      )}

      {/* Gruppo 3: Palette Colori */}
      <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2 py-1 border border-slate-700/60">
        {COLORS.map((col) => (
          <button
            key={col.hex}
            type="button"
            onClick={() => setActiveColor(col.hex)}
            title={col.label}
            className={`h-4 w-4 rounded-full transition-transform ${
              activeColor === col.hex ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: col.hex }}
          />
        ))}
      </div>

      {/* Gruppo 4: DOTTRINA & STRATEGIE ALLENATORI (Klopp, Sarri, Guardiola, De Zerbi, Sacchi, etc.) */}
      <div className="flex items-center gap-1.5 rounded-lg bg-cyan-950/40 px-2.5 py-1 border border-cyan-500/40">
        <BookOpen className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
        <label className="text-[11px] font-bold text-cyan-300 shrink-0">Strategia Coach:</label>
        <select
          value={activeStrategyId || ''}
          onChange={(e) => {
            if (e.target.value) {
              applyCoachingStrategy(e.target.value);
              const strat = COACHING_STRATEGIES_CATALOG.find((s) => s.id === e.target.value);
              onNotify?.(`Applicata dottrina: ${strat?.name} (${strat?.coach})`);
            }
          }}
          className="rounded-md border border-cyan-500/50 bg-slate-900 px-2 py-1 text-xs font-semibold text-cyan-200 focus:outline-none focus:border-cyan-300 max-w-[210px] truncate"
        >
          {COACHING_STRATEGIES_CATALOG.map((s) => (
            <option key={s.id} value={s.id}>
              {s.coach} — {s.name} ({s.formation})
            </option>
          ))}
        </select>
      </div>

      {/* Gruppo 5: Moduli Fissi */}
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] font-semibold text-slate-400">Modulo:</label>
        <select
          value={homeFormation}
          onChange={(e) => {
            setHomeFormation(e.target.value as FormationPreset);
            onNotify?.(`Modulo Casa impostato su ${e.target.value}`);
          }}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-mono font-medium text-cyan-300 focus:outline-none focus:border-cyan-400"
        >
          {FORMATIONS.map((f) => (
            <option key={`h_${f}`} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {/* Gruppo 6: Viewport Toggles (Grid, Snap, Half-Spaces, Blind Mode) */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleGrid}
          title="Mostra / Nascondi Griglia 18 Zone"
          className={`rounded-md p-1.5 text-xs transition-colors ${
            gridVisible ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700/60'
          }`}
        >
          <Grid className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={toggleHalfSpaces}
          title="Evidenzia Corridoi Verticali & Half-Spaces"
          className={`rounded-md p-1.5 text-xs transition-colors ${
            halfSpacesVisible ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700/60'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={toggleSnap}
          title="Snap Magnetico su Linee Tattiche"
          className={`rounded-md p-1.5 text-xs transition-colors ${
            snapEnabled ? 'bg-lime-500/20 text-lime-300 border border-lime-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700/60'
          }`}
        >
          <Magnet className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={toggleBlindMode}
          title="Modalità Lavagna Cieca: nasconde numeri e ruoli per studio tattico puro"
          className={`rounded-md p-1.5 text-xs transition-colors ${
            blindMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700/60'
          }`}
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Selettore Tema Visivo del Campo (Verde Prato & Bianco Crema / Cyber Notte / Gesso / Blueprint) */}
      <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2">
        <Palette className="h-3.5 w-3.5 text-lime-400 shrink-0" />
        <select
          value={theme}
          onChange={(e) => {
            const nextTheme = e.target.value as TacticalTheme;
            setTheme(nextTheme);
            onNotify?.(`Tema impostato: ${nextTheme === 'grass_cream' ? 'Verde Prato & Bianco Crema' : nextTheme}`);
          }}
          aria-label="Tema Visivo del Campo"
          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-lime-300 hover:border-lime-500 focus:border-lime-400 focus:outline-none transition-colors"
        >
          <option value="grass_cream">🌿 Verde Prato & Crema</option>
          <option value="neon">🌌 Notte Tattica Cyber</option>
          <option value="chalk">📋 Lavagna Gesso & Crema</option>
          <option value="blueprint">📐 Blueprint Tattico</option>
        </select>
      </div>

      {/* Gruppo 7: Undo/Redo & Reset */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleUndo}
          disabled={past.length === 0}
          title="Annulla (Ctrl+Z)"
          className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={handleRedo}
          disabled={future.length === 0}
          title="Ripristina (Ctrl+Y)"
          className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={clearCanvasDrawings}
          title="Cancella tutti i disegni dal campo"
          className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-rose-400 transition-colors ml-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={resetToInitialPreset}
          title="Reimposta schieramento iniziale"
          className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
