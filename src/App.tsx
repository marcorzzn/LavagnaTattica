import React, { useMemo, useState } from 'react';
import {
  RotateCcw,
  Undo2,
  Download,
  Clock,
  CheckCircle2,
  Video,
  Award,
  Sparkles,
  FileSignature,
} from 'lucide-react';
import {
  ChessStyleAlternative,
  MatchEvent,
  OverlayType,
  PlayerNode,
  SuggestedModification,
  TacticalPhase,
  TacticalState,
} from './core/types';
import { INITIAL_TACTICAL_STATE, PLAYER_ARCHETYPES_30 } from './core/presets';
import { evaluateTacticalState } from './engine/mathEngine';
import { PitchCanvas2D } from './components/canvas/PitchCanvas2D';
import { PitchCanvas3D } from './components/canvas/PitchCanvas3D';
import { OrchestratorPanel } from './components/chat/OrchestratorPanel';
import { Benchmark12Dimensions } from './components/benchmark/Benchmark12Dimensions';
import { EducationalAndKnowledge } from './components/educational/EducationalAndKnowledge';
import { UniversalVideoLab } from './components/video/UniversalVideoLab';
import { GovernanceAndArchetypes } from './components/governance/GovernanceAndArchetypes';
import { TacticalStudioWorkspace } from './components/studio/TacticalStudioWorkspace';

type MainWorkspaceView =
  | 'tactical_lab'
  | 'video_cv_lab'
  | 'benchmark_12'
  | 'governance_adr'
  | 'knowledge_educational';

export default function App() {
  const [activeNav, setActiveNav] = useState<MainWorkspaceView>('tactical_lab');
  const [state, setState] = useState<TacticalState>(INITIAL_TACTICAL_STATE);
  const [history, setHistory] = useState<TacticalState[]>([]);

  const [canvasMode, setCanvasMode] = useState<'2d' | '3d'>('2d');
  const [activeOverlays, setActiveOverlays] = useState<OverlayType[]>([
    'pitch_control',
    'pass_network',
    'tda_gaps',
  ]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>('home-06');
  const [rightTab, setRightTab] = useState<'chess_eval' | 'chat' | 'pillars' | 'player'>('chess_eval');

  // Recompute the 6 Mathematical Pillars + Chess.com Evaluation Engine in real time
  const { metrics, updatedEdges } = useMemo(() => evaluateTacticalState(state), [state]);

  const handleMovePlayer = (id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === id ? { ...p, x, y } : p)),
    }));
  };

  const handleMoveBall = (x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      ballX: x,
      ballY: y,
    }));
  };

  const toggleOverlay = (ov: OverlayType) => {
    setActiveOverlays((prev) =>
      prev.includes(ov) ? prev.filter((x) => x !== ov) : [...prev, ov]
    );
  };

  const enableSingleOverlay = (ov: OverlayType) => {
    setActiveOverlays((prev) => (prev.includes(ov) ? prev : [...prev, ov]));
  };

  const handleApplyModification = (mod: SuggestedModification) => {
    setHistory((h) => [...h.slice(-8), state]);
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        const move = mod.moves.find((m) => m.playerId === p.id);
        if (!move) return p;
        return {
          ...p,
          x: move.x,
          y: move.y,
          role: move.role || p.role,
        };
      }),
    }));
  };

  const handleExecuteChessAlternative = (alt: ChessStyleAlternative) => {
    setHistory((h) => [...h.slice(-8), state]);
    setState((prev) => ({
      ...prev,
      ballX: alt.toX,
      ballY: alt.toY,
      players: prev.players.map((p) => {
        if (alt.targetId && p.id === alt.targetId) {
          return { ...p, x: alt.toX, y: alt.toY };
        }
        return p;
      }),
    }));
  };

  const handleAssignArchetypeToSelected = (archetypeId: number) => {
    const arch = PLAYER_ARCHETYPES_30.find((a) => a.id === archetypeId);
    if (!arch || !selectedPlayerId) return;
    setHistory((h) => [...h.slice(-8), state]);
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === selectedPlayerId
          ? {
              ...p,
              archetypeId: arch.id,
              archetypeName: arch.name,
              role: `${arch.name} (#${p.number})`,
              positionGroup: arch.positionGroup,
              heightCm: arch.defaultHeightCm,
              foot: arch.defaultFoot,
              attributes: { ...arch.defaultStats },
            }
          : p
      ),
    }));
    setActiveNav('tactical_lab');
    setRightTab('player');
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

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setState(previous);
  };

  const handleReset = () => {
    setHistory((h) => [...h.slice(-8), state]);
    setState(INITIAL_TACTICAL_STATE);
  };

  const applyTacticalPreset = (presetId: string) => {
    setHistory((h) => [...h.slice(-8), state]);
    if (presetId === 'libero_moderno_build_up') {
      setState(INITIAL_TACTICAL_STATE);
      setActiveOverlays(['pitch_control', 'pass_network']);
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
      setActiveOverlays(['tda_gaps', 'ghost_trajectory', 'xt_grid']);
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
      setActiveOverlays(['pitch_control', 'tda_gaps']);
    }
    setActiveNav('tactical_lab');
  };

  const handleSelectTimelineEvent = (ev: MatchEvent) => {
    setHistory((h) => [...h.slice(-8), state]);
    setState((prev) => ({
      ...prev,
      minute: ev.minute,
      phase: ev.phase,
      ballX: ev.x,
      ballY: ev.y,
      players: prev.players.map((p) => {
        if (p.id === ev.playerId) return { ...p, x: ev.x, y: ev.y };
        if (ev.recipientId && p.id === ev.recipientId && ev.endX && ev.endY) {
          return { ...p, x: ev.endX, y: ev.endY };
        }
        return p;
      }),
    }));
  };

  const exportTacticalStateJson = () => {
    const payload = {
      openCoreVersion: '2.0.0-SUPREME',
      founderAuthority: 'Marco Razzano — 0xLAVAGNATATTICA_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY',
      exportedAt: new Date().toISOString(),
      tacticalState: state,
      sixPillarsEvaluation: metrics,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lavagnatattica_supreme_${state.matchId}_min${state.minute}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedPlayer: PlayerNode =
    state.players.find((p) => p.id === selectedPlayerId) || state.players[2];

  const epvBarPct = Math.round(((metrics.epvValue + 1) / 2) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-zinc-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-zinc-800/90 bg-[#0B0B10]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveNav('tactical_lab');
          }}
          className="text-lg font-bold tracking-tight text-zinc-100 font-display whitespace-nowrap shrink-0"
        >
          LavagnaTattica
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-zinc-400 overflow-x-auto">
          <button
            onClick={() => setActiveNav('tactical_lab')}
            className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeNav === 'tactical_lab' ? 'text-[#00F2FF] border-b border-[#00F2FF]' : ''
            }`}
          >
            Laboratorio Tattico
          </button>
          <button
            onClick={() => setActiveNav('video_cv_lab')}
            className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeNav === 'video_cv_lab' ? 'text-[#00F2FF] border-b border-[#00F2FF]' : ''
            }`}
          >
            Simulatore su Frame (Human-in-the-Loop)
          </button>
          <button
            onClick={() => setActiveNav('benchmark_12')}
            className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeNav === 'benchmark_12' ? 'text-[#00F2FF] border-b border-[#00F2FF]' : ''
            }`}
          >
            12 Dimensioni
          </button>
          <button
            onClick={() => setActiveNav('governance_adr')}
            className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeNav === 'governance_adr' ? 'text-[#00F2FF] border-b border-[#00F2FF]' : ''
            }`}
          >
            Governance & 30 Tipologie
          </button>
          <button
            onClick={() => setActiveNav('knowledge_educational')}
            className={`hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeNav === 'knowledge_educational' ? 'text-[#00F2FF] border-b border-[#00F2FF]' : ''
            }`}
          >
            Educational & KB
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={exportTacticalStateJson}
            className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-[#00F2FF] rounded-lg hover:bg-[#00F2FF]/90 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Esporta Stato JSON
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">
        {activeNav === 'tactical_lab' && (
          <TacticalStudioWorkspace onSwitchToVideoCV={() => setActiveNav('video_cv_lab')} />
        )}

        {/* VIEW 2: UNIVERSAL VIDEO INGESTION & COMPUTER VISION LAB */}
        {activeNav === 'video_cv_lab' && (
          <UniversalVideoLab
            tacticalState={state}
            onSyncTrackedPositionsToLab={(updatedPlayers, homeForm, awayForm) => {
              handleSyncVideoTracksToLab(updatedPlayers, homeForm, awayForm);
            }}
          />
        )}

        {/* VIEW 3: 12 DIMENSIONS & BENCHMARK FIXTURE */}
        {activeNav === 'benchmark_12' && (
          <Benchmark12Dimensions state={state} metrics={metrics} />
        )}

        {/* VIEW 4: GOVERNANCE ADR-MATH (MARCO RAZZANO) & 30 PLAYER ARCHETYPES */}
        {activeNav === 'governance_adr' && (
          <GovernanceAndArchetypes
            onAssignArchetypeToSelectedPlayer={handleAssignArchetypeToSelected}
            selectedPlayerLabel={`${selectedPlayer.archetypeName} (#${selectedPlayer.number})`}
          />
        )}

        {/* VIEW 5: KNOWLEDGE BASE & EDUCATIONAL MODE */}
        {activeNav === 'knowledge_educational' && (
          <EducationalAndKnowledge
            onLoadPresetScenario={applyTacticalPreset}
            onNavigateToStudio={() => setActiveNav('tactical_lab')}
          />
        )}
      </main>
    </div>
  );
}
