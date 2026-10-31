import React, { useMemo, useState } from 'react';
import { BookOpen, Play, RotateCcw, Sparkles, Award } from 'lucide-react';
import { KNOWLEDGE_ARTICLES } from '../../core/presets';
import { TacticalLearningLab } from './TacticalLearningLab';
import { GlossaryTaxonomy } from './GlossaryTaxonomy';

interface EducationalAndKnowledgeProps {
  onLoadPresetScenario: (presetId: string) => void;
  onNavigateToStudio?: () => void;
}

interface GateNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

const INITIAL_GATES: GateNode[] = [
  { id: 'G1', label: 'Porta 1 (Costruzione Bassa)', x: 24, y: 40 },
  { id: 'G2', label: 'Porta 2 (Half-Space SX)', x: 52, y: 20 },
  { id: 'G3', label: 'Porta 3 (Half-Space DX)', x: 54, y: 60 },
  { id: 'G4', label: 'Porta 4 (Zona 14 Rifinitura)', x: 84, y: 40 },
  { id: 'G5', label: 'Porta 5 (Ampiezza Offensiva)', x: 78, y: 15 },
];

export const EducationalAndKnowledge: React.FC<EducationalAndKnowledgeProps> = ({
  onLoadPresetScenario,
  onNavigateToStudio,
}) => {
  const [subView, setSubView] = useState<
    'learning_lab' | 'glossary_taxonomy' | 'educational_tsp' | 'knowledge_base' | 'ml_notebooks'
  >('learning_lab');
  const [selectedArticleId, setSelectedArticleId] = useState<string>(KNOWLEDGE_ARTICLES[0].id);
  const [categoryFilter, setCategoryFilter] = useState<string>('Tutte');

  // Educational Traveling Salesman State (Section 9.2 — David Sumpter Uppsala 2018)
  const [gates, setGates] = useState<GateNode[]>(INITIAL_GATES);
  const [visitSequence, setVisitSequence] = useState<string[]>(['G1', 'G2', 'G4', 'G5', 'G3', 'G1']);
  const [activePlayerTouch, setActivePlayerTouch] = useState<number>(1);
  const [penaltyDirection, setPenaltyDirection] = useState<'Left' | 'Center' | 'Right'>('Left');

  // Compute user path length vs optimal TSP tour length
  const tspStats = useMemo(() => {
    const getGate = (id: string) => gates.find((g) => g.id === id) || gates[0];
    let userDist = 0;
    for (let i = 0; i < visitSequence.length - 1; i++) {
      const a = getGate(visitSequence[i]);
      const b = getGate(visitSequence[i + 1]);
      userDist += Math.hypot(b.x - a.x, b.y - a.y);
    }

    // Brute-force exact TSP optimal cycle across the 5 gates starting at G1
    const otherIds = ['G2', 'G3', 'G4', 'G5'];
    const permute = (arr: string[]): string[][] => {
      if (arr.length <= 1) return [arr];
      const res: string[][] = [];
      for (let i = 0; i < arr.length; i++) {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        for (const p of permute(rest)) res.push([arr[i], ...p]);
      }
      return res;
    };

    let bestDist = Infinity;
    let bestTour: string[] = [];
    for (const perm of permute(otherIds)) {
      const tour = ['G1', ...perm, 'G1'];
      let d = 0;
      for (let i = 0; i < tour.length - 1; i++) {
        const a = getGate(tour[i]);
        const b = getGate(tour[i + 1]);
        d += Math.hypot(b.x - a.x, b.y - a.y);
      }
      if (d < bestDist) {
        bestDist = d;
        bestTour = tour;
      }
    }

    const efficiencyPct = Number(Math.min(100, (bestDist / Math.max(1, userDist)) * 100).toFixed(1));
    return {
      userDist: Number(userDist.toFixed(1)),
      bestDist: Number(bestDist.toFixed(1)),
      bestTour,
      efficiencyPct,
    };
  }, [gates, visitSequence]);

  const handleGateClick = (gateId: string) => {
    setVisitSequence((prev) => {
      // Regola David Sumpter: lo stesso nodo non può toccare la palla due volte di fila
      if (prev[prev.length - 1] === gateId) return prev;
      if (prev.length >= 7) return [gateId];
      return [...prev, gateId];
    });
    setActivePlayerTouch((p) => (p % 5) + 1);
  };

  const selectedArticle =
    KNOWLEDGE_ARTICLES.find((a) => a.id === selectedArticleId) || KNOWLEDGE_ARTICLES[0];

  const filteredArticles =
    categoryFilter === 'Tutte'
      ? KNOWLEDGE_ARTICLES
      : KNOWLEDGE_ARTICLES.filter((a) => a.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#111118] border border-zinc-800">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'learning_lab', label: 'Laboratorio Tattico (Lezioni, Quiz & Puzzle 3-Pass)' },
              { id: 'glossary_taxonomy', label: 'Glossario Metriche & Formule Ufficiali' },
              { id: 'educational_tsp', label: 'Commesso Viaggiatore (TSP) & Teoria dei Giochi Nash' },
              { id: 'knowledge_base', label: 'Knowledge Base (Spielverlagerung, MIT SSAC)' },
              { id: 'ml_notebooks', label: 'Moduli ML & SoccerAnalyticsML Repository' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubView(tab.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                subView === tab.id
                  ? 'bg-[#00F2FF] text-zinc-950 font-semibold'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs font-mono text-zinc-400">
          Sezione 6 & 9: Pedagogia, Trasparenza & Riproducibilità
        </span>
      </div>

      {subView === 'learning_lab' && (
        <TacticalLearningLab onLoadScenarioIntoStudio={onNavigateToStudio} />
      )}

      {subView === 'glossary_taxonomy' && <GlossaryTaxonomy />}

      {subView === 'educational_tsp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Interactive TSP Pitch Stage (7 cols) */}
          <div className="lg:col-span-7 p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-[#B4FF39]">
                  SCENARIO EDUCATIONAL 1 — DAVID SUMPTER (SCIFEST UPPSALA 2018)
                </span>
                <h3 className="text-lg font-bold text-zinc-100">
                  Il Problema del Commesso Viaggiatore (TSP) & Reti di Passaggio
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVisitSequence(tspStats.bestTour)}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#B4FF39] text-zinc-950 rounded-lg hover:bg-[#B4FF39]/90 transition-colors"
                >
                  Mostra Ciclo Ottimale TSP
                </button>
                <button
                  onClick={() => setVisitSequence(['G1'])}
                  className="px-2.5 py-1.5 text-xs bg-zinc-900 text-zinc-300 rounded-lg border border-zinc-800 hover:bg-zinc-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Clicca in sequenza sulle 5 coppie di coni (Porte G1–G5) per costruire la catena di passaggi e tornare a G1. Regola: lo stesso giocatore non può toccare la palla due volte di fila; 5 giocatori in supporto triangolare.
            </p>

            {/* Interactive SVG TSP Sandbox */}
            <div className="rounded-xl overflow-hidden border border-zinc-800 bg-[#0B1520]">
              <svg viewBox="0 0 120 80" className="w-full h-[360px]">
                <rect x="0" y="0" width="120" height="80" fill="#0D1926" />
                <line x1="60" y1="0" x2="60" y2="80" stroke="#334155" strokeWidth="0.4" />
                <circle cx="60" cy="40" r="9.15" fill="none" stroke="#334155" strokeWidth="0.4" />

                {/* Optimal Tour Ghost Path */}
                <polyline
                  points={tspStats.bestTour
                    .map((id) => {
                      const g = gates.find((x) => x.id === id)!;
                      return `${g.x},${g.y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#B4FF39"
                  strokeOpacity="0.28"
                  strokeWidth="0.6"
                  strokeDasharray="1.5 1.2"
                />

                {/* User Sequence Edges */}
                <polyline
                  points={visitSequence
                    .map((id) => {
                      const g = gates.find((x) => x.id === id)!;
                      return `${g.x},${g.y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#00F2FF"
                  strokeWidth="0.9"
                />

                {/* Gates (Cones) */}
                {gates.map((gate, idx) => {
                  const visitIndex = visitSequence.indexOf(gate.id);
                  const isVisited = visitIndex !== -1;
                  return (
                    <g
                      key={gate.id}
                      transform={`translate(${gate.x}, ${gate.y})`}
                      className="cursor-pointer"
                      onClick={() => handleGateClick(gate.id)}
                    >
                      {/* Cone Pair representation */}
                      <circle
                        cx={0}
                        cy={0}
                        r={3.2}
                        fill={isVisited ? '#00F2FF' : '#1E293B'}
                        fillOpacity={isVisited ? 0.25 : 0.8}
                        stroke={isVisited ? '#00F2FF' : '#94A3B8'}
                        strokeWidth={0.55}
                      />
                      <circle cx={-1.8} cy={-1.8} r={0.65} fill="#FF6B35" />
                      <circle cx={1.8} cy={1.8} r={0.65} fill="#FF6B35" />
                      <text
                        x={0}
                        y={0.8}
                        textAnchor="middle"
                        fontSize="2.2"
                        fontWeight="700"
                        fill="#F8FAFC"
                        className="font-mono"
                      >
                        {gate.id}
                      </text>
                      <text
                        x={0}
                        y={5.4}
                        textAnchor="middle"
                        fontSize="1.65"
                        fill="#CBD5E1"
                      >
                        {gate.label} (Gioc. #{idx + 1})
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Right Deck: TSP Telemetry + Nash Penalty Game Theory Simulator (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
              <span className="text-xs font-mono text-[#00F2FF]">METRICHE DI RETE IN TEMPO REALE</span>
              <h4 className="text-base font-semibold text-zinc-100">
                Confronto Lunghezza Percorso vs Soluzione Ottimale TSP
              </h4>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-[11px] text-zinc-400">Tuo Percorso</div>
                  <div className="text-lg font-bold font-mono text-[#00F2FF] mt-0.5">
                    {tspStats.userDist}m
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-[11px] text-zinc-400">Ottimo TSP</div>
                  <div className="text-lg font-bold font-mono text-[#B4FF39] mt-0.5">
                    {tspStats.bestDist}m
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-[11px] text-zinc-400">Efficienza Rete</div>
                  <div className="text-lg font-bold font-mono text-zinc-100 mt-0.5">
                    {tspStats.efficiencyPct}%
                  </div>
                </div>
              </div>

              <div className="text-xs text-zinc-300 font-mono bg-zinc-900/70 p-3 rounded-lg border border-zinc-800">
                Sequenza Attuale: {visitSequence.join(' → ')}
                <br />
                Sequenza Ottimale: {tspStats.bestTour.join(' → ')}
              </div>
            </div>

            {/* Scenario Educational 2: Rigori ed Equilibrio di Nash (Pilastro VI — Palacios-Huerta 2003) */}
            <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-3">
              <span className="text-xs font-mono text-[#FF6B35]">
                SCENARIO EDUCATIONAL 2 — PILASTRO VI (CHIAPPORI & PALACIOS-HUERTA)
              </span>
              <h4 className="text-base font-semibold text-zinc-100">
                Calci di Rigore: Equilibrio di Nash in Strategie Miste
              </h4>
              <p className="text-xs text-zinc-400">
                Simula la scelta dell’angolo di tiro per confrontare il payoff puntuale con l’equilibrio minimax verificato su dataset reale (4 rigori nel benchmark).
              </p>

              <div className="flex items-center gap-2">
                {(['Left', 'Center', 'Right'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => setPenaltyDirection(dir)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                      penaltyDirection === dir
                        ? 'bg-[#00F2FF]/20 border-[#00F2FF] text-[#00F2FF]'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Tira {dir === 'Left' ? 'Sinistra (Lato Naturale)' : dir === 'Center' ? 'Centrale' : 'Destra (Lato Opposto)'}
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Strategia Mista Nash Tiratore:</span>
                  <span className="text-[#00F2FF]">54.2% Sinistra · 8.4% Centro · 37.4% Destra</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Conversione Attesa in Equilibrio:</span>
                  <span className="text-[#B4FF39]">
                    {penaltyDirection === 'Left' ? '79.4%' : penaltyDirection === 'Center' ? '81.2%' : '78.8%'} (Minimax uniforme)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {subView === 'knowledge_base' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Article List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex flex-wrap gap-1.5 p-2 bg-[#111118] border border-zinc-800 rounded-xl">
              {['Tutte', 'Tattica', 'Pilastri Matematici', 'Dataset & Rigore'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    categoryFilter === cat
                      ? 'bg-[#00F2FF] text-zinc-950 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredArticles.map((art) => (
              <button
                key={art.id}
                onClick={() => setSelectedArticleId(art.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  selectedArticle.id === art.id
                    ? 'bg-[#161622] border-[#00F2FF]'
                    : 'bg-[#111118] border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="text-[11px] font-mono text-[#00F2FF]">
                  {art.category} · {art.readTime}
                </div>
                <h4 className="text-sm font-semibold text-zinc-100 mt-1">{art.title}</h4>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{art.summary}</p>
              </button>
            ))}
          </div>

          {/* Right Markdown Reader & Scenario Linker (8 cols) */}
          <div className="lg:col-span-8 p-6 rounded-xl bg-[#111118] border border-zinc-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <div className="text-xs font-mono text-[#B4FF39]">{selectedArticle.pillarTag}</div>
                <h3 className="text-xl font-bold text-zinc-100 mt-1">{selectedArticle.title}</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {selectedArticle.authors} · {selectedArticle.year}
                </p>
              </div>
              <button
                onClick={() => onLoadPresetScenario(selectedArticle.linkedPresetId)}
                className="px-4 py-2 text-xs font-semibold bg-[#00F2FF] text-zinc-950 rounded-lg hover:bg-[#00F2FF]/90 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                Carica Scenario sul Campo
              </button>
            </div>

            <div className="p-4 rounded-lg bg-[#09090D] border border-zinc-800 font-mono text-xs text-[#00F2FF]">
              Formalismo Matematico: {selectedArticle.formula}
            </div>

            <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                1. Spiegazione Tattica Divulgativa (Principio 2 & 3)
              </h4>
              <p className="text-xs leading-relaxed text-zinc-200">{selectedArticle.tacticalExplanation}</p>

              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 pt-2">
                2. Modello nei 6 Pilastri di NucleoTattico
              </h4>
              <p className="text-xs leading-relaxed text-zinc-300">{selectedArticle.mathematicalFormalism}</p>
            </div>

            <div className="pt-3 border-t border-zinc-800">
              <h4 className="text-xs font-semibold text-zinc-300 mb-2">Bibliografia Accademica & Fonti Verificate</h4>
              <ul className="space-y-1 text-xs text-zinc-400 font-mono">
                {selectedArticle.references.map((ref) => (
                  <li key={ref}>• {ref}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {subView === 'ml_notebooks' && (
        <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
          <div>
            <span className="text-xs font-mono text-[#00F2FF]">
              SEZIONE 6 — INTEGRAZIONE REPOSITORY GITHUB `SoccerAnalyticsML/Soccer-Analytics-with-Machine-Learning`
            </span>
            <h3 className="text-lg font-bold text-zinc-100 mt-1">
              Pipeline a 9 Stazioni (Stazione 0 → H) & Moduli di Machine Learning
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                notebook: 'chapter-2-python-fundamentals.ipynb',
                station: 'Stazione 0 & A — Ingest & Schema',
                desc: 'Acquisizione StatsBomb Open Data, FBref, Understat, serie storica Dataset Open (PDDL v1.0) e standardizzazione kloppy su DuckDB.',
                func: 'standardize_event_data(raw, provider)',
              },
              {
                notebook: 'chapter-3-data-wrangling.ipynb',
                station: 'Stazione B, C, D — Normalizzazione, Nodi, Archi',
                desc: 'Conversione sistema canonico 120×80, player_map.csv identity resolution, filtro pre-1° sostituzione e costruzione grafo passaggi.',
                func: 'normalize_coordinates(coords, "opta", "statsbomb")',
              },
              {
                notebook: 'chapter-4/5/6 — ML & XGBoost Classifiers',
                station: 'Stazione E — Metriche & Classificatori',
                desc: 'Addestramento xG (XGBoost), xT (Markov Chain), classificatori assist/tiro e indice di efficacia difensiva (Toda et al. 2022).',
                func: 'train_xg_model(shots) / compute_vaep(event)',
              },
              {
                notebook: 'chapter-7-tensorflow-companion.ipynb',
                station: 'Stazione E & G — Deep Ghosting & Tracking',
                desc: 'Imitation learning profondo per generazione di traiettorie controfattuali (ghosting) e smarcamento nei cicli H₁ TDA.',
                func: 'generate_ghost_trajectory(state, model)',
              },
            ].map((item) => (
              <div key={item.notebook} className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-[#B4FF39]">{item.station}</div>
                  <div className="text-xs font-mono font-semibold text-zinc-100">{item.notebook}</div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
                <div className="p-2 rounded bg-[#09090D] border border-zinc-800 text-[10px] font-mono text-[#00F2FF]">
                  {item.func}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
