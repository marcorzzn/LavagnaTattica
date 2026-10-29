import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Layers,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  User,
  Zap,
  BookOpen,
  Users,
  Search,
  CheckCircle2,
  Wand2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useStudioStore } from '../../stores/studioStore';
import { useViewportStore } from '../../stores/viewportStore';
import { evaluateTacticalState } from '../../engine/mathEngine';
import { EditorToolbar } from './EditorToolbar';
import { TacticalPitchCanvas } from './TacticalPitchCanvas';
import { TimelineBar } from './TimelineBar';
import { OrchestratorPanel } from '../chat/OrchestratorPanel';
import { PLAYER_ARCHETYPES_30 } from '../../core/presets';
import { SuggestedModification } from '../../core/types';
import { COACHING_STRATEGIES_CATALOG, CoachingStrategy } from '../../core/tacticalStrategiesCatalog';

interface TacticalStudioWorkspaceProps {
  onSwitchToVideoCV?: () => void;
}

export const TacticalStudioWorkspace: React.FC<TacticalStudioWorkspaceProps> = ({
  onSwitchToVideoCV,
}) => {
  const players = useStudioStore((s) => s.players);
  const ball = useStudioStore((s) => s.ball);
  const homeFormation = useStudioStore((s) => s.homeFormation);
  const awayFormation = useStudioStore((s) => s.awayFormation);
  const movePlayer = useStudioStore((s) => s.movePlayer);
  const getTacticalState = useStudioStore((s) => s.getTacticalState);
  const activeStrategyId = useStudioStore((s) => s.activeStrategyId);
  const applyCoachingStrategy = useStudioStore((s) => s.applyCoachingStrategy);

  const [leftTab, setLeftTab] = useState<'strategies' | 'roster'>('strategies');
  const [strategySearch, setStrategySearch] = useState('');
  const [strategySchool, setStrategySchool] = useState<string>('all');

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>('home-06');
  const [rightTab, setRightTab] = useState<'chess_eval' | 'chat' | 'pillars' | 'player'>('chess_eval');
  const [notification, setNotification] = useState<string | null>(null);

  const [showXtOverlay, setShowXtOverlay] = useState(false);

  // Calcolo istantaneo dei 6 Pilastri e delle alternative Chess.com ad ogni variazione dello studio
  const tacticalState = useMemo(() => getTacticalState(), [players, ball, homeFormation, awayFormation]);
  const { metrics } = useMemo(() => evaluateTacticalState(tacticalState), [tacticalState]);

  const selectedPlayer = useMemo(() => {
    return players.find((p) => p.id === selectedPlayerId) || players[0];
  }, [players, selectedPlayerId]);

  const selectedArchetype = useMemo(() => {
    return (
      PLAYER_ARCHETYPES_30.find((a) => a.id === selectedPlayer?.archetypeId) ||
      PLAYER_ARCHETYPES_30[0]
    );
  }, [selectedPlayer]);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleApplyModification = (mod: SuggestedModification) => {
    for (const m of mod.moves) {
      movePlayer(m.playerId, m.x, m.y);
    }
    triggerNotification(`Applicata modifica: ${mod.label}`);
  };

  const filteredStrategies = useMemo(() => {
    return COACHING_STRATEGIES_CATALOG.filter((s) => {
      const matchSchool = strategySchool === 'all' || s.school === strategySchool;
      const q = strategySearch.trim().toLowerCase();
      const matchText =
        !q ||
        s.coach.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.tagline.toLowerCase().includes(q) ||
        s.formation.toLowerCase().includes(q) ||
        s.keyTacticalPrinciples.some((p) => p.toLowerCase().includes(q));
      return matchSchool && matchText;
    });
  }, [strategySearch, strategySchool]);

  return (
    <div className="flex flex-col gap-3 min-h-[calc(100vh-80px)]">
      {/* Notifica flottante */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-500/50 bg-slate-900/95 px-4 py-2.5 text-xs font-semibold text-cyan-300 shadow-2xl backdrop-blur">
          {notification}
        </div>
      )}

      {/* 1. Toolbar Editor Superiore con strumenti di disegno, moduli e palette */}
      <EditorToolbar onNotify={triggerNotification} />

      {/* 2. Griglia Principale: Strategie/Roster (Sinistra) + Canvas & Timeline (Centro) + Chess.com Eval (Destra) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start flex-1">
        {/* COLONNA SINISTRA (3 colonne): Libreria Strategie & Allenatori oppure Roster Tipologie */}
        <aside className="lg:col-span-3 flex flex-col gap-2.5 rounded-xl border border-slate-800/90 bg-slate-900/90 p-3 shadow-xl max-h-[780px] overflow-hidden">
          {/* Tabs Sinistra */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setLeftTab('strategies')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                leftTab === 'strategies'
                  ? 'bg-cyan-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Maestri & Strategie</span>
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('roster')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                leftTab === 'roster'
                  ? 'bg-cyan-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>22 Pedine</span>
            </button>
          </div>

          {/* VISTA 1: LIBRERIA STRATEGIE & ALLENATORI */}
          {leftTab === 'strategies' && (
            <div className="flex flex-col gap-2.5 flex-1 overflow-hidden">
              {/* Cerca & Filtra */}
              <div className="space-y-1.5 shrink-0">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={strategySearch}
                    onChange={(e) => setStrategySearch(e.target.value)}
                    placeholder="Cerca Klopp, Sarri, 3-5-2, Gegenpress..."
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <select
                  value={strategySchool}
                  onChange={(e) => setStrategySchool(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-300 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="all">Tutte le Scuole Tattiche</option>
                  <option value="Positional Play">Positional Play / Juego de Posición</option>
                  <option value="Gegenpressing / Red Bull">Gegenpressing / Recupero Alto</option>
                  <option value="Scuola Italiana / Zona">Scuola Italiana / Difesa a Zona</option>
                  <option value="Transizione & Blocco Basso">Transizione & Blocco Basso</option>
                  <option value="Calcio Totale">Calcio Totale (Cruyff / Michels)</option>
                  <option value="Bielsisme">Bielsisme / Marcature Rotanti</option>
                  <option value="Calcio Fluido / Relazionale">Calcio Fluido / Relazionale</option>
                </select>
              </div>

              {/* Elenco Schede Strategie */}
              <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                {filteredStrategies.map((strat) => {
                  const isActive = activeStrategyId === strat.id;
                  return (
                    <div
                      key={strat.id}
                      className={`flex flex-col gap-1.5 rounded-lg border p-2.5 transition-all text-xs ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-950/20 shadow-md'
                          : 'border-slate-800/90 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-white truncate">{strat.coach}</span>
                        <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                          {strat.formation}
                        </span>
                      </div>

                      <div className="text-[11px] font-semibold text-lime-400 leading-tight">
                        {strat.name}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                        {strat.tagline}
                      </p>

                      <div className="text-[10px] text-slate-300 bg-slate-900/80 rounded p-1.5 border border-slate-800/60">
                        <span className="text-cyan-300 font-medium">Principio:</span>{' '}
                        {strat.keyTacticalPrinciples[0]}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                          {strat.school}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            applyCoachingStrategy(strat.id);
                            triggerNotification(`Caricata sulla lavagna: ${strat.name} (${strat.coach})`);
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              <span>In Onda</span>
                            </>
                          ) : (
                            <>
                              <Wand2 className="h-3 w-3" />
                              <span>Carica Lavagna</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VISTA 2: ROSTER 22 PEDINE (30 ARCHETIPI ASTRATTI) */}
          {leftTab === 'roster' && (
            <div className="flex flex-col gap-2 flex-1 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 shrink-0">
                <span className="text-xs font-bold text-slate-200">22 Tipologie in Campo</span>
                <span className="font-mono text-[11px] text-cyan-400 font-semibold">{homeFormation}</span>
              </div>

              <div className="space-y-1 overflow-y-auto flex-1 pr-1">
                {players.map((p) => {
                  const isSel = p.id === selectedPlayerId;
                  const isHome = p.team === 'home';
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPlayerId(p.id);
                        setRightTab('player');
                      }}
                      className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between text-xs transition-colors ${
                        isSel
                          ? 'bg-cyan-500/15 border border-cyan-400 text-white font-semibold'
                          : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`font-mono font-bold text-[11px] ${
                            isHome ? 'text-cyan-400' : 'text-rose-400'
                          }`}
                        >
                          #{p.number}
                        </span>
                        <span className="truncate">{p.archetypeName}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 shrink-0">
                        ({Math.round(p.x)},{Math.round(p.y)})
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-800 pt-2 flex flex-col gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowXtOverlay((prev) => !prev)}
                  className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    showXtOverlay
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Overlay xT Markov (16×24)</span>
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* COLONNA CENTRALE (6 colonne): Canvas Tattico 2D + Timeline Animazioni */}
        <section className="lg:col-span-6 flex flex-col gap-3">
          <TacticalPitchCanvas
            showXtOverlay={showXtOverlay}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={(id) => {
              setSelectedPlayerId(id);
              if (id) setRightTab('player');
            }}
          />

          {/* Timeline e Registrazione Sequenza (da LavagnaTattica) */}
          <TimelineBar onNotify={triggerNotification} />
        </section>

        {/* COLONNA DESTRA (3 colonne): Motore di Valutazione Chess.com & 6 Pilastri */}
        <aside className="lg:col-span-3 flex flex-col gap-3">
          {/* Tabs della Colonna Destra */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {(
              [
                { id: 'chess_eval', label: 'Chess.com' },
                { id: 'chat', label: 'Orchestrator' },
                { id: 'pillars', label: '6 Pilastri' },
                { id: 'player', label: 'Scheda' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setRightTab(t.id)}
                className={`flex-1 py-1 px-1.5 text-xs font-semibold rounded-lg transition-colors truncate ${
                  rightTab === t.id
                    ? 'bg-cyan-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: MOTORE DI VALUTAZIONE DINAMICO STILE CHESS.COM */}
          {rightTab === 'chess_eval' && (
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/95 p-3.5 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <span className="text-[11px] font-mono text-cyan-400 font-bold">
                    EVALUATION ENGINE
                  </span>
                  <h3 className="text-sm font-bold text-slate-100">
                    Valutazione Azione (J)
                  </h3>
                </div>
                <div className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {metrics.chessAlternatives[0]?.compositeScore > 0 ? '+' : ''}
                  {metrics.chessAlternatives[0]?.compositeScore.toFixed(2)}
                </div>
              </div>

              {/* Barra di Valutazione Stile Chess.com */}
              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Vantaggio Casa</span>
                  <span>{metrics.homePitchControlPct}% Pitch Ctrl</span>
                </div>
                <div className="h-3 w-full bg-rose-950/80 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(10, Math.min(90, metrics.homePitchControlPct))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Alternative Tattiche Combinatorie Ricalcolate */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Top Alternative per #{tacticalState.players.find((p) => p.id === 'home-06')?.number || 6}:
                </div>

                {metrics.chessAlternatives.slice(0, 3).map((alt, idx) => {
                  const isBest = alt.classification.includes('Best');
                  return (
                    <div
                      key={alt.rank}
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        isBest
                          ? 'bg-cyan-950/40 border-cyan-500/40 text-slate-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                              isBest
                                ? 'bg-cyan-400 text-slate-950'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {alt.classification}
                          </span>
                          <span>{alt.actionType}</span>
                        </span>
                        <span className="font-mono font-bold text-cyan-300">
                          J={alt.compositeScore.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-1.5">
                        {alt.tacticalWhy}
                      </p>
                      <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500">
                        <span>ΔxT: +{alt.deltaXt}</span>
                        <span>P_succ: {alt.successProbabilityPct}%</span>
                        <span>Δλ₂: {alt.deltaFiedler > 0 ? '+' : ''}{alt.deltaFiedler}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: LLM ORCHESTRATOR PANEL CON CITAZIONI E TOOL CALL */}
          {rightTab === 'chat' && (
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/95 overflow-hidden shadow-xl min-h-[500px]">
              <OrchestratorPanel
                state={tacticalState}
                onApplyModification={handleApplyModification}
                onEnableOverlay={() => {}}
              />
            </div>
          )}

          {/* TAB 3: TELEMETRIA 6 PILASTRI MATEMATICI */}
          {rightTab === 'pillars' && (
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/95 p-3.5 shadow-xl space-y-3">
              <div className="border-b border-slate-800 pb-2">
                <span className="text-[11px] font-mono text-cyan-400 font-bold">
                  RIGORE MATEMATICO
                </span>
                <h3 className="text-sm font-bold text-slate-100">6 Pilastri Reali</h3>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">PILASTRO II · PITCH CTRL (SPEARMAN)</div>
                  <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">
                    {metrics.constructionZoneControlPct}%
                  </div>
                  <div className="text-[10px] text-slate-500">Integrazione ODE differenziale continua dPPCF/dt</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">PILASTRO III · EXPECTED THREAT (BELLMAN)</div>
                  <div className="text-base font-bold font-mono text-lime-400 mt-0.5">
                    {metrics.teamXtTotal.toFixed(3)} xT
                  </div>
                  <div className="text-[10px] text-slate-500">Catena di Markov assorbente 16×24 (residuo &lt; 1e-6)</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">PILASTRO IV · FIEDLER λ₂ (JACOBI)</div>
                  <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">
                    {metrics.fiedlerValue.toFixed(3)}
                  </div>
                  <div className="text-[10px] text-slate-500">Resistenza Efficace: {metrics.effectiveResistanceMean}Ω</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">PILASTRO V · TOPOLOGIA TDA H₁</div>
                  <div className="text-base font-bold font-mono text-lime-400 mt-0.5">
                    {metrics.maxH1Persistence}m
                  </div>
                  <div className="text-[10px] text-slate-500">Varchi attivi difesa: Betti β₁={metrics.betti1}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">PILASTRO VI · WASSERSTEIN-1 & NASH</div>
                  <div className="text-base font-bold font-mono text-slate-100 mt-0.5">
                    {metrics.wassersteinBlockCostMeters}m
                  </div>
                  <div className="text-[10px] text-slate-500">Ghost Trajectory: +{metrics.ghostTrajectory.xtGain} xT</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SCHEDA TIPOLOGIA ASTRATTA SELEZIONATA */}
          {rightTab === 'player' && selectedPlayer && (
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/95 p-3.5 shadow-xl space-y-3">
              <div className="border-b border-slate-800 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-cyan-400 font-bold">
                    ARCHETIPO #{selectedPlayer.number}
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {selectedPlayer.positionGroup}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-0.5">
                  {selectedPlayer.archetypeName}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedArchetype.expectedBehavior}
                </p>
              </div>

              {/* Attributi Cine-Dinamici */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Parametri Fisici & Decisionali:
                </div>

                {[
                  { label: 'Passaggio & Visione', val: selectedPlayer.attributes.passing },
                  { label: 'Resistenza al Pressing', val: selectedPlayer.attributes.pressResistance },
                  { label: 'Indice Difensivo', val: selectedPlayer.attributes.defensiveIndex },
                  { label: 'Velocità & Scatto', val: selectedPlayer.attributes.speed ?? 80 },
                  { label: 'Lucidità (Composure)', val: selectedPlayer.attributes.composure ?? 85 },
                  { label: 'Duelli Aerei', val: selectedPlayer.attributes.aerial },
                ].map((attr) => (
                  <div key={attr.label}>
                    <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
                      <span>{attr.label}</span>
                      <span className="font-bold text-cyan-400">{attr.val}/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{ width: `${attr.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px] font-mono text-slate-400">
                <span>Altezza: {selectedPlayer.heightCm} cm</span>
                <span>Piede: {selectedPlayer.foot}</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
