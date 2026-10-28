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
    if (presetId === 'libero_moderno_build_up' || presetId === 'lobotka_libero') {
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
      founderAuthority: 'Marco Razzano — 0xOPENPITCH_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY',
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
    a.download = `openpitch_supreme_${state.matchId}_min${state.minute}.json`;
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
          OpenPitch
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
            Analisi Video CV
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
          <>
            {/* Top Workspace Toolbar & Chess.com-style Evaluation Bar */}
            <div className="p-3.5 rounded-xl bg-[#111118] border border-zinc-800/90 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                <span className="font-semibold text-zinc-100">
                  {state.homeTeam} ({state.homeFormation}) vs {state.awayTeam} ({state.awayFormation})
                </span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="font-mono text-[#00F2FF]">
                  formation_source: {state.formationSource}
                </span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="font-mono text-[#B4FF39]">Zero Nomi Propri (30 Tipologie)</span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span className="font-mono text-zinc-400">Min {state.minute}' ({state.phase})</span>
              </div>

              {/* Chess.com Evaluation Bar (-1.0 to +1.0) */}
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <span className="text-[11px] font-mono text-zinc-400 shrink-0">Chess Eval:</span>
                <div className="flex-1 h-3 bg-[#431407] rounded-md overflow-hidden border border-zinc-700 flex">
                  <div
                    className="h-full bg-gradient-to-r from-[#0284C7] to-[#00F2FF] transition-all duration-200"
                    style={{ width: `${epvBarPct}%` }}
                  />
                </div>
                <span
                  className={`text-xs font-mono font-bold shrink-0 ${
                    metrics.epvValue >= 0 ? 'text-[#00F2FF]' : 'text-[#FF6B35]'
                  }`}
                >
                  {metrics.epvValue >= 0 ? `+${metrics.epvValue}` : metrics.epvValue}
                </span>
              </div>

              {/* Overlay Toggles & 2D/3D Switch */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'pitch_control', label: 'Pitch Control' },
                    { id: 'xt_grid', label: 'Griglia xT' },
                    { id: 'pass_network', label: 'Rete & Fiedler λ₂' },
                    { id: 'tda_gaps', label: 'Varchi TDA H₁' },
                    { id: 'ghost_trajectory', label: 'Ghosting' },
                  ] as const
                ).map((ov) => {
                  const active = activeOverlays.includes(ov.id);
                  return (
                    <button
                      key={ov.id}
                      onClick={() => toggleOverlay(ov.id)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#1E1B4B] text-[#00F2FF] border border-[#00F2FF]/50'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      {ov.label}
                    </button>
                  );
                })}

                <div className="h-4 w-px bg-zinc-800 mx-1" />

                <div className="flex items-center p-0.5 bg-zinc-900 border border-zinc-800 rounded-lg">
                  <button
                    onClick={() => setCanvasMode('2d')}
                    className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                      canvasMode === '2d'
                        ? 'bg-[#00F2FF] text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    2D Top-Down
                  </button>
                  <button
                    onClick={() => setCanvasMode('3d')}
                    className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                      canvasMode === '3d'
                        ? 'bg-[#00F2FF] text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    3D WebGL
                  </button>
                </div>

                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  title="Annulla spostamento"
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleReset}
                  title="Ripristina configurazione iniziale"
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3-Column Core Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[580px]">
              {/* LEFT SIDEBAR: Tactical Scenarios, Video CV Quick Jump & Abstract Archetypes Roster (2 cols) */}
              <aside className="lg:col-span-2 flex flex-col gap-3 bg-[#0D0D12] border border-zinc-800/90 rounded-xl p-3.5">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-200">Scenari Verificati</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Configurazioni astratte certificate ADR-Math
                  </p>
                  <div className="mt-2 space-y-1.5">
                    <button
                      onClick={() => applyTacticalPreset('libero_moderno_build_up')}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 text-xs transition-colors"
                    >
                      <div className="font-medium text-[#00F2FF]">1. Libero Moderno (#6)</div>
                      <div className="text-[10px] text-zinc-400 font-mono">PC Costr: 81.4% · λ₂: 0.412</div>
                    </button>
                    <button
                      onClick={() => applyTacticalPreset('tda_gap_attack')}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 text-xs transition-colors"
                    >
                      <div className="font-medium text-[#B4FF39]">2. Attacco Varco TDA H₁</div>
                      <div className="text-[10px] text-zinc-400 font-mono">Mezzala (#13) Ghost +0.084 xT</div>
                    </button>
                    <button
                      onClick={() => applyTacticalPreset('anti_cross_shield')}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 text-xs transition-colors"
                    >
                      <div className="font-medium text-[#FF6B35]">3. Schermo Anti-Cross Boa (#9)</div>
                      <div className="text-[10px] text-zinc-400 font-mono">Centrale Copertura (194cm)</div>
                    </button>
                  </div>
                </div>

                {/* Direct CTA to Universal Video Ingestion */}
                <button
                  onClick={() => setActiveNav('video_cv_lab')}
                  className="w-full px-3 py-2 rounded-lg bg-[#161622] hover:bg-[#1E1B4B] border border-[#00F2FF]/40 text-xs font-semibold text-[#00F2FF] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Video className="w-3.5 h-3.5" />
                  Inserisci Qualsiasi Video
                </button>

                {/* Abstract Archetypes Roster List */}
                <div className="border-t border-zinc-800/80 pt-3 flex-1 overflow-y-auto max-h-[320px]">
                  <h3 className="text-xs font-semibold text-zinc-200 mb-1.5">
                    22 Tipologie in Campo
                  </h3>
                  <div className="space-y-1">
                    {state.players.map((p) => {
                      const isSel = p.id === selectedPlayerId;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedPlayerId(p.id);
                            setRightTab('player');
                          }}
                          className={`w-full px-2 py-1.5 rounded-md text-left flex items-center justify-between text-xs transition-colors ${
                            isSel
                              ? 'bg-[#1E1B4B] text-white border border-[#00F2FF]/50'
                              : 'hover:bg-zinc-900 text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`font-mono font-bold text-[11px] ${
                                p.team === 'home' ? 'text-[#00F2FF]' : 'text-[#FF6B35]'
                              }`}
                            >
                              #{p.number}
                            </span>
                            <span className="truncate">{p.archetypeName}</span>
                          </div>
                          <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                            ({Math.round(p.x)},{Math.round(p.y)})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              {/* CENTER: Interactive Pitch Canvas 2D / 3D (6 cols) */}
              <section className="lg:col-span-6 flex flex-col gap-3">
                <div className="flex-1 min-h-[460px]">
                  {canvasMode === '2d' ? (
                    <PitchCanvas2D
                      players={state.players}
                      passEdges={updatedEdges}
                      ballX={state.ballX}
                      ballY={state.ballY}
                      activeOverlays={activeOverlays}
                      metrics={metrics}
                      selectedPlayerId={selectedPlayerId}
                      onSelectPlayer={(id) => setSelectedPlayerId(id)}
                      onMovePlayer={handleMovePlayer}
                      onMoveBall={handleMoveBall}
                    />
                  ) : (
                    <PitchCanvas3D
                      players={state.players}
                      passEdges={updatedEdges}
                      ballX={state.ballX}
                      ballY={state.ballY}
                      activeOverlays={activeOverlays}
                      metrics={metrics}
                      selectedPlayerId={selectedPlayerId}
                      onSelectPlayer={(id) => setSelectedPlayerId(id)}
                    />
                  )}
                </div>

                {/* Live 6 Pillars KPI Strip Directly Under the Pitch */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#111118] border border-zinc-800/90">
                    <div className="text-[10px] font-mono text-zinc-400">PILASTRO II · PITCH CTRL</div>
                    <div className="text-base font-bold font-mono text-[#00F2FF] mt-0.5">
                      {metrics.constructionZoneControlPct}%
                    </div>
                    <div className="text-[10px] text-zinc-500">Costruzione (Glob: {metrics.homePitchControlPct}%)</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#111118] border border-zinc-800/90">
                    <div className="text-[10px] font-mono text-zinc-400">PILASTRO III · xT / VAEP</div>
                    <div className="text-base font-bold font-mono text-[#B4FF39] mt-0.5">
                      {metrics.teamXtTotal.toFixed(3)} xT
                    </div>
                    <div className="text-[10px] text-zinc-500">Hawkes: {metrics.hawkesPressingIntensity}</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#111118] border border-zinc-800/90">
                    <div className="text-[10px] font-mono text-zinc-400">PILASTRO IV · FIEDLER λ₂</div>
                    <div className="text-base font-bold font-mono text-[#00F2FF] mt-0.5">
                      {metrics.fiedlerValue.toFixed(3)}
                    </div>
                    <div className="text-[10px] text-zinc-500">Res. Efficace: {metrics.effectiveResistanceMean}Ω</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#111118] border border-zinc-800/90">
                    <div className="text-[10px] font-mono text-zinc-400">PILASTRO V · TDA H₁</div>
                    <div className="text-base font-bold font-mono text-[#B4FF39] mt-0.5">
                      {metrics.maxH1Persistence}m
                    </div>
                    <div className="text-[10px] text-zinc-500">Betti β₁={metrics.betti1} varchi attivi</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#111118] border border-zinc-800/90">
                    <div className="text-[10px] font-mono text-zinc-400">PILASTRO VI · WASSERSTEIN</div>
                    <div className="text-base font-bold font-mono text-zinc-100 mt-0.5">
                      {metrics.wassersteinBlockCostMeters}m
                    </div>
                    <div className="text-[10px] text-zinc-500">Ghost: +{metrics.ghostTrajectory.xtGain} xT</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#111118] border border-zinc-800/90">
                    <div className="text-[10px] font-mono text-zinc-400">FISICA & AEREA</div>
                    <div className="text-base font-bold font-mono text-[#FF6B35] mt-0.5">
                      {metrics.aerialVulnerabilityZone}%
                    </div>
                    <div className="text-[10px] text-zinc-500">Potenza: {metrics.metabolicPowerMeanWKg} W/kg</div>
                  </div>
                </div>
              </section>

              {/* RIGHT PANEL: Chess.com Evaluation Engine / LLM Orchestrator / 6 Pillars / Archetype Card (4 cols) */}
              <aside className="lg:col-span-4 flex flex-col gap-3">
                <div className="flex items-center gap-1 p-1 bg-[#111118] border border-zinc-800 rounded-xl">
                  {(
                    [
                      { id: 'chess_eval', label: 'Chess.com Eval' },
                      { id: 'chat', label: 'LLM Orchestrator' },
                      { id: 'pillars', label: '6 Pilastri & TDA' },
                      { id: 'player', label: `#${selectedPlayer.number} Tipologia` },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setRightTab(t.id)}
                      className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-colors truncate ${
                        rightTab === t.id
                          ? 'bg-[#00F2FF] text-zinc-950 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 min-h-[520px]">
                  {/* TAB 1: CHESS.COM EVALUATION ENGINE (Section 3.8 & ADR-Math-003) */}
                  {rightTab === 'chess_eval' && (
                    <div className="h-full p-4 rounded-xl bg-[#0D0D12] border border-zinc-800/90 space-y-4 overflow-y-auto">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <div>
                          <span className="text-[11px] font-mono text-[#00F2FF]">
                            SEZIONE 3.8 & ADR-MATH-003 (MARCO RAZZANO)
                          </span>
                          <h3 className="text-sm font-bold text-zinc-100 mt-0.5">
                            Motore di Valutazione Stile Chess.com — Top-3 Alternative
                          </h3>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#B4FF39]">
                          EPV: {metrics.epvValue >= 0 ? `+${metrics.epvValue}` : metrics.epvValue}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Ogni giocata possibile è valutata con il funzionale composito $J(a \mid s)$ approvato in <span className="font-mono text-zinc-200">ADR-Math-003</span>. Clicca su qualsiasi alternativa per eseguirla in modalità *What-If* sul campo.
                      </p>

                      <div className="space-y-3">
                        {metrics.chessAlternatives.map((alt) => {
                          const isBest = alt.rank === 1;
                          const isSub = alt.rank === 3;
                          return (
                            <div
                              key={alt.rank}
                              className={`p-3.5 rounded-xl border space-y-2 transition-colors ${
                                isBest
                                  ? 'bg-[#111924] border-[#B4FF39]/60'
                                  : isSub
                                  ? 'bg-zinc-900/70 border-zinc-800'
                                  : 'bg-[#12131E] border-[#00F2FF]/40'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-xs font-mono font-bold ${
                                    isBest
                                      ? 'text-[#B4FF39]'
                                      : isSub
                                      ? 'text-[#FF6B35]'
                                      : 'text-[#00F2FF]'
                                  }`}
                                >
                                  #{alt.rank} · {alt.classification}
                                </span>
                                <span className="text-xs font-mono font-bold text-zinc-100">
                                  J(a) = {alt.compositeScore >= 0 ? `+${alt.compositeScore}` : alt.compositeScore}
                                </span>
                              </div>

                              <div className="text-xs font-semibold text-zinc-100">
                                {alt.actionType}: {alt.actorArchetype} → {alt.targetArchetype}
                              </div>

                              <p className="text-[11px] text-zinc-300 leading-relaxed">{alt.tacticalWhy}</p>

                              <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono text-[10px]">
                                <div className="p-1.5 rounded bg-zinc-950/80 text-center">
                                  <div className="text-zinc-500">ΔEPV</div>
                                  <div className="text-[#00F2FF]">
                                    {alt.deltaEpv >= 0 ? `+${alt.deltaEpv}` : alt.deltaEpv}
                                  </div>
                                </div>
                                <div className="p-1.5 rounded bg-zinc-950/80 text-center">
                                  <div className="text-zinc-500">ΔxT</div>
                                  <div className="text-[#B4FF39]">
                                    {alt.deltaXt >= 0 ? `+${alt.deltaXt}` : alt.deltaXt}
                                  </div>
                                </div>
                                <div className="p-1.5 rounded bg-zinc-950/80 text-center">
                                  <div className="text-zinc-500">ΔPC Z14</div>
                                  <div className="text-zinc-200">
                                    {alt.deltaPitchControlPct >= 0
                                      ? `+${alt.deltaPitchControlPct}%`
                                      : `${alt.deltaPitchControlPct}%`}
                                  </div>
                                </div>
                                <div className="p-1.5 rounded bg-zinc-950/80 text-center">
                                  <div className="text-zinc-500">P_succ</div>
                                  <div className="text-zinc-200">{alt.successProbabilityPct}%</div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleExecuteChessAlternative(alt)}
                                className="w-full py-1.5 px-3 text-xs font-semibold bg-[#00F2FF]/15 hover:bg-[#00F2FF] text-[#00F2FF] hover:text-zinc-950 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Simula What-If sul Campo ({alt.fromX}m,{alt.fromY}m → {alt.toX}m,{alt.toY}m)
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {rightTab === 'chat' && (
                    <OrchestratorPanel
                      state={state}
                      onApplyModification={handleApplyModification}
                      onEnableOverlay={enableSingleOverlay}
                    />
                  )}

                  {rightTab === 'pillars' && (
                    <div className="h-full p-4 rounded-xl bg-[#0D0D12] border border-zinc-800/90 space-y-4 overflow-y-auto">
                      <div>
                        <span className="text-[11px] font-mono text-[#B4FF39]">
                          PILASTRO V — PERSISTENCE BARCODE (VIETORIS-RIPS H₀ & H₁)
                        </span>
                        <h4 className="text-sm font-semibold text-zinc-100 mt-0.5">
                          Diagramma di Persistenza Topologica Varchi Difensivi
                        </h4>
                        <div className="mt-2.5 space-y-2">
                          {metrics.tdaBarcodes.map((bar) => (
                            <div key={bar.id} className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-zinc-300">{bar.label}</span>
                                <span className="font-mono text-zinc-400">
                                  [{bar.birth}m → {bar.death}m] (Pers: {bar.persistence}m)
                                </span>
                              </div>
                              <div className="w-full h-2 bg-zinc-900 rounded-full relative overflow-hidden border border-zinc-800">
                                <div
                                  className={`h-full rounded-full ${
                                    bar.dimension === 1 ? 'bg-[#B4FF39]' : 'bg-[#00F2FF]'
                                  }`}
                                  style={{
                                    marginLeft: `${Math.min(75, (bar.birth / 28) * 100)}%`,
                                    width: `${Math.max(8, ((bar.death - bar.birth) / 28) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-zinc-800 pt-3.5">
                        <span className="text-[11px] font-mono text-[#00F2FF]">
                          PILASTRO IV — DECOMPOSIZIONE DI HELMHOLTZ-HODGE (ADR-MATH-002)
                        </span>
                        <h4 className="text-sm font-semibold text-zinc-100 mt-0.5">
                          Scomposizione Spettrale del Flusso di Passaggi
                        </h4>
                        <div className="grid grid-cols-3 gap-2 mt-2.5 text-center font-mono">
                          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                            <div className="text-[10px] text-zinc-400">Gradiente (Vert)</div>
                            <div className="text-sm font-bold text-[#00F2FF] mt-0.5">
                              {metrics.hodgeGradientPct}%
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                            <div className="text-[10px] text-zinc-400">Curl (Triangoli)</div>
                            <div className="text-sm font-bold text-[#B4FF39] mt-0.5">
                              {metrics.hodgeCurlPct}%
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                            <div className="text-[10px] text-zinc-400">Armonico (Cicli)</div>
                            <div className="text-sm font-bold text-zinc-200 mt-0.5">
                              {metrics.hodgeHarmonicPct}%
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-zinc-800 pt-3.5">
                        <span className="text-[11px] font-mono text-[#B4FF39]">
                          PILASTRO VI — GHOSTING CONTROFATTUALE (IMITATION LEARNING)
                        </span>
                        <h4 className="text-sm font-semibold text-zinc-100 mt-0.5">
                          Traiettoria Ottimale Calcolata: {metrics.ghostTrajectory.playerName}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {metrics.ghostTrajectory.rationale}
                        </p>
                      </div>
                    </div>
                  )}

                  {rightTab === 'player' && (
                    <div className="h-full p-4 rounded-xl bg-[#0D0D12] border border-zinc-800/90 space-y-4 overflow-y-auto">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <div>
                          <div className="text-xs font-mono text-[#00F2FF]">
                            {selectedPlayer.team === 'home' ? state.homeTeam : state.awayTeam} · #{selectedPlayer.number}
                          </div>
                          <h4 className="text-lg font-bold text-zinc-100">
                            {selectedPlayer.archetypeName}
                          </h4>
                          <div className="text-xs text-zinc-400">{selectedPlayer.role}</div>
                        </div>
                        <div className="text-right font-mono text-xs text-zinc-300">
                          <div>Statura: {selectedPlayer.heightCm} cm</div>
                          <div>Piede: {selectedPlayer.foot}</div>
                          <div className="text-[#B4FF39]">
                            Pos: ({selectedPlayer.x}m, {selectedPlayer.y}m)
                          </div>
                        </div>
                      </div>

                      {/* Change Abstract Archetype Selector (30 Archetypes) */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono text-zinc-400">
                          Cambia Tipologia Astratta (Catalogo 30 Archetipi Sezione 4.1):
                        </label>
                        <select
                          value={selectedPlayer.archetypeId}
                          onChange={(e) => handleAssignArchetypeToSelected(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-[#00F2FF]"
                        >
                          {PLAYER_ARCHETYPES_30.map((arch) => (
                            <option key={arch.id} value={arch.id}>
                              #{arch.id.toString().padStart(2, '0')} — {arch.name} ({arch.positionGroup}, {arch.defaultHeightCm}cm)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        {(
                          [
                            { label: 'Passaggio & Visione Spettrale', val: selectedPlayer.attributes.passing },
                            { label: 'Press Resistance (Retention)', val: selectedPlayer.attributes.pressResistance },
                            { label: 'Dominio Aereo (Elevation Z)', val: selectedPlayer.attributes.aerial },
                            { label: 'Conduzione Progressiva (xT Carry)', val: selectedPlayer.attributes.progressiveCarries },
                            { label: 'Indice Difensivo (Toda et al.)', val: selectedPlayer.attributes.defensiveIndex },
                          ] as const
                        ).map((attr) => (
                          <div key={attr.label} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-300">{attr.label}</span>
                              <span className="font-mono text-[#00F2FF]">{attr.val}/99</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#00F2FF]"
                                style={{ width: `${attr.val}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400">
                        Provenienza Data Fusion: {(selectedPlayer.sources || ['video_cv']).join(' + ')} · Confidenza: {((selectedPlayer.confidence || 0.98) * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </div>

            {/* BOTTOM TIMELINE SCRUBBER (Zero Proper Names) */}
            <div className="p-3.5 rounded-xl bg-[#111118] border border-zinc-800/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <Clock className="w-4 h-4 text-[#00F2FF]" />
                <span className="text-xs font-semibold text-zinc-200">
                  Timeline Eventi Certificati (Tipologie Astratte):
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                {state.events.map((ev) => {
                  const isCurrent = state.minute === ev.minute;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => handleSelectTimelineEvent(ev)}
                      className={`px-3 py-1.5 rounded-lg border text-xs transition-colors flex items-center gap-2 shrink-0 ${
                        isCurrent
                          ? 'bg-[#1E1B4B] border-[#00F2FF] text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span className="font-mono font-bold text-[#00F2FF]">{ev.minute}'</span>
                      <span>
                        {ev.playerName} → {ev.recipientName}
                      </span>
                      <span className="font-mono text-[10px] text-[#B4FF39]">
                        {ev.type === 'goal' ? `GOL (${ev.xg} xG)` : `+${ev.xt} xT`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
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
          <EducationalAndKnowledge onLoadPresetScenario={applyTacticalPreset} />
        )}
      </main>
    </div>
  );
}
