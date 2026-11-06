import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Languages,
  LayoutGrid,
  Video,
  BookOpen,
} from 'lucide-react';
import {
  PlayerNode,
  TacticalState,
  TacticalTag,
} from './core/types';
import { INITIAL_TACTICAL_STATE } from './core/presets';
import { evaluateTacticalState } from './engine/mathEngine';
import { UniversalVideoLab } from './components/video/UniversalVideoLab';
import { FreeBoardCanvas } from './components/studio/FreeBoardCanvas';
import { UnifiedTheoryView } from './components/educational/UnifiedTheoryView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useStudioStore } from './stores/studioStore';

type MainWorkspaceView = 'lavagna' | 'video' | 'teoria';

export default function App() {
  const { t, i18n } = useTranslation();
  const [activeNav, setActiveNav] = useState<MainWorkspaceView>('video');
  const [selectedGlossaryId, setSelectedGlossaryId] = useState<string | null>(null);

  const [state, setState] = useState<TacticalState>(INITIAL_TACTICAL_STATE);
  const [history, setHistory] = useState<TacticalState[]>([]);

  const loadTagScenario = useStudioStore((s) => s.loadTagScenario);

  // Calcolo 6 Pilastri Matematici + Motore Chess.com
  const { metrics } = useMemo(() => evaluateTacticalState(state), [state]);

  const currentLang = (i18n.language?.startsWith('en') ? 'en' : 'it') as 'it' | 'en';

  const toggleLanguage = () => {
    const nextLang = currentLang === 'it' ? 'en' : 'it';
    i18n.changeLanguage(nextLang);
  };

  const handleSyncVideoTracksToLab = (
    updatedPlayers: PlayerNode[],
    inferredHomeForm: string,
    inferredAwayForm: string
  ) => {
    setHistory((h) => [...h.slice(-8), state]);
    setState((prev) => ({
      ...prev,
      homeFormation: inferredHomeForm,
      awayFormation: inferredAwayForm,
      formationSource: 'inferred',
      players: updatedPlayers,
    }));
  };

  const applyTacticalPreset = (presetId: string) => {
    setHistory((h) => [...h.slice(-8), state]);
    if (presetId === 'libero_moderno_build_up') {
      setState(INITIAL_TACTICAL_STATE);
    } else if (presetId === 'tda_gap_attack') {
      setState((prev) => ({
        ...prev,
        phase: 'progression',
        ballX: 68,
        ballY: 31,
        players: prev.players.map((p) => {
          if (p.id === 'home-13') return { ...p, x: 78, y: 31 };
          if (p.id === 'home-10') return { ...p, x: 82, y: 47 };
          return p;
        }),
      }));
    } else if (presetId === 'anti_cross_shield') {
      setState((prev) => ({
        ...prev,
        phase: 'low_block',
        ballX: 76,
        ballY: 67,
        players: prev.players.map((p) => {
          if (p.id === 'home-06') return { ...p, x: 42, y: 40, role: 'Mediano Schermo Preventivo (#6)' };
          if (p.id === 'home-04') return { ...p, x: 25, y: 38, role: 'Marcatura Aerea su Boa (#4)' };
          if (p.id === 'home-02') return { ...p, x: 27, y: 50, role: 'Braccetto Stretto (#2)' };
          return p;
        }),
      }));
    }
    setActiveNav('lavagna');
  };

  const exportTacticalStateJson = () => {
    const jsonStr = useStudioStore.getState().exportProjectJson();
    const blob = new Blob([jsonStr], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lavagnatattica_progetto_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100">
        {/* Strict 3-Zone Top Bar: Brand, 3 Canonical Views, Actions & Language */}
        <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-zinc-800/90 bg-[#0B0B10] sticky top-0 z-40 backdrop-blur">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('video');
            }}
            className="text-lg font-bold tracking-tight text-zinc-100 font-display whitespace-nowrap shrink-0 hover:text-[#00E5FF] transition-colors"
          >
            LavagnaTattica
          </a>

          {/* Zone 2: Navigation Views (Analisi, Teoria, Lavagna Libera) */}
          <nav className="flex items-center gap-1 sm:gap-2 text-sm font-medium text-zinc-400 overflow-x-auto">
            <button
              onClick={() => setActiveNav('video')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeNav === 'video'
                  ? 'text-zinc-950 bg-[#00E5FF] font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Analisi</span>
            </button>
            <button
              onClick={() => setActiveNav('teoria')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeNav === 'teoria'
                  ? 'text-zinc-950 bg-[#00E5FF] font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Teoria</span>
            </button>
            <button
              onClick={() => setActiveNav('lavagna')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeNav === 'lavagna'
                  ? 'text-zinc-950 bg-[#00E5FF] font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Lavagna Libera</span>
            </button>
          </nav>

          {/* Zone 3: Language Switcher (IT/EN) & Primary Action */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={toggleLanguage}
              title={currentLang === 'it' ? 'Passa alla lingua inglese (EN)' : 'Switch to Italian (IT)'}
              className="px-2.5 py-1.5 text-xs font-mono font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Languages className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>{currentLang.toUpperCase()}</span>
            </button>

            <button
              onClick={exportTacticalStateJson}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-[#00E5FF] rounded-lg hover:bg-[#00E5FF]/90 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('common.exportJson')}</span>
              <span className="sm:hidden">JSON</span>
            </button>
          </div>
        </header>

        {/* Main Content Container - Fitted to viewport without vertical outer scroll */}
        <main className="flex-1 w-full mx-auto px-2 sm:px-4 py-2 flex flex-col min-h-0">
          {/* VIEW 1: LAVAGNA LIBERA (PURAMENTE DISEGNO E POSIZIONAMENTO) */}
          {activeNav === 'lavagna' && <FreeBoardCanvas />}

          {/* VIEW 2: ANALISI VIDEO & BOTONIERA TAG / CERTIFICAZIONE (VERIFICHI) */}
          {activeNav === 'video' && (
            <UniversalVideoLab
              tacticalState={state}
              onSyncTrackedPositionsToLab={handleSyncVideoTracksToLab}
              onOpenScenarioOnBoard={(tag: TacticalTag) => {
                loadTagScenario(tag.id);
                setActiveNav('lavagna');
              }}
              onOpenGlossaryEntry={(glossaryId: string) => {
                setSelectedGlossaryId(glossaryId);
                setActiveNav('teoria');
              }}
            />
          )}

          {/* VIEW 3: TEORIA, DIDATTICA & CONSULTA RIFERIMENTI (CAPISCI) */}
          {activeNav === 'teoria' && (
            <UnifiedTheoryView
              initialGlossaryId={selectedGlossaryId}
              onLoadScenarioOnBoard={(presetId: string) => {
                applyTacticalPreset(presetId);
                setActiveNav('lavagna');
              }}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}