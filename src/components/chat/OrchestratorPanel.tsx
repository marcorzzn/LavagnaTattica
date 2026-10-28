import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Send,
  Wrench,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import {
  ChatMessage,
  CitedSource,
  SuggestedModification,
  TacticalState,
  ToolCallTrace,
} from '../../core/types';
import { CITED_SOURCES_CATALOG } from '../../core/presets';

interface OrchestratorPanelProps {
  state: TacticalState;
  onApplyModification: (mod: SuggestedModification) => void;
  onEnableOverlay: (overlay: 'pitch_control' | 'xt_grid' | 'pass_network' | 'tda_gaps' | 'ghost_trajectory') => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-init-1',
    sender: 'user',
    timestamp: '15:30',
    text: 'Perché la tipologia Libero Moderno (#6) funziona in questo 3-4-1-2? E quali sono i rischi strutturali e le alternative del motore Chess.com?',
  },
  {
    id: 'msg-init-2',
    sender: 'orchestrator',
    timestamp: '15:30',
    text: `Con la tipologia **Libero Moderno (#6)** abbassata tra il **Braccetto Aggressivo (#2)** e il **Difensore Centrale di Copertura (#4)** nella prima costruzione (3-4-1-2), il **Pitch Control nella zona di costruzione sale dal 62.0% all'81.4%** (\`tool: compute_pitch_control\`, **ADR-Math-001** firmato da Marco Razzano). La rete di passaggi diventa più resiliente al pressing a due punte avversario: la connettività algebrica di Fiedler **λ₂ passa da 0.340 a 0.412** (\`tool: compute_pass_network\`, **ADR-Math-002**).\n\nIl motore di valutazione stile chess.com (**ADR-Math-003**, \`tool: evaluate_chess_alternatives\`) classifica come **Best Move (!!)** il passaggio filtrante verticale verso la **Mezzala d'Inserimento (#13)** dentro il varco topologico $H_1$ con punteggio composito **J(a) = +0.78** ($\Delta\text{EPV} = +0.194$, probabilità di successo $81.5\%$). Questo replica il principio del *Libero Ibrido* (\`fonte: Spielverlagerung\`): un vertice basso con Press Resistance 96/99 genera superiorità numerica +1 e apre i corridoi diagonali verso gli half-spaces.\n\n**Il rischio matematico:** la tipologia **Libero Moderno (#6)** ha statura **170 cm** (\`tool: get_player_attributes\`), e il modello planare 2D di Pitch Control non cattura i duelli aerei sui traversoni alti verso il **Centravanti Boa (#9, 201 cm)**. Vuoi che calcoli la vulnerabilità sui cross e applichi lo schermo preventivo?`,
    toolCalls: [
      {
        id: 'tc-init-1',
        toolName: 'compute_pitch_control',
        args: { state: '{formation: "3-4-1-2", phase: "build_up", adr: "ADR-Math-001"}' },
        pillar: 'Pilastro II — Cinematica Differenziale',
        durationMs: 42,
        resultSummary: 'Griglia 24×16: Costruzione 81.4% (vs 62.0% base), Controllo globale 64.8%',
        rawResult: { constructionZoneControlPct: 81.4, homePitchControlPct: 64.8, minTtiSec: 0.68 },
      },
      {
        id: 'tc-init-2',
        toolName: 'compute_pass_network',
        args: { team: 'home', laplacian: 'L = D - W', adr: 'ADR-Math-002' },
        pillar: 'Pilastro IV — Teoria Spettrale dei Grafi',
        durationMs: 35,
        resultSummary: 'Fiedler λ₂ = 0.412 (+0.072) | Hub: Libero Moderno #6 (0.89) | Resistenza = 2.79Ω',
        rawResult: { fiedlerValue: 0.412, hub: 'Libero Moderno (#6)', effectiveResistance: 2.79 },
      },
      {
        id: 'tc-init-3',
        toolName: 'evaluate_chess_alternatives',
        args: { topK: 3, adr: 'ADR-Math-003' },
        pillar: 'Evaluation Engine Chess.com',
        durationMs: 19,
        resultSummary: 'Best Move (!!): Passaggio Filtrante da Libero Moderno (#6) a Mezzala (#13) | Score +0.78',
        rawResult: { bestMove: 'Libero Moderno (#6) -> Mezzala (#13)', compositeScore: 0.78, deltaEpv: 0.194 },
      },
    ],
    citations: [CITED_SOURCES_CATALOG[0], CITED_SOURCES_CATALOG[1], CITED_SOURCES_CATALOG[2]],
    suggestion: {
      label: 'Schermo Preventivo Anti-Cross (Libero Moderno #6 a X=42, Centrale Copertura #4 su Boa #9)',
      description:
        'Alza il Libero Moderno (#6, 170 cm) a X=42m in copertura preventiva della seconda palla e stringe il Difensore Centrale di Copertura (#4, 194 cm) al centro sul Centravanti Boa (#9, 201 cm) quando la palla è sui lati.',
      moves: [
        { playerId: 'home-06', x: 42, y: 40, role: 'Mediano Schermo Preventivo (#6)' },
        { playerId: 'home-04', x: 26, y: 36, role: 'Centrale Dominante Aereo (#4)' },
        { playerId: 'home-02', x: 28, y: 50, role: 'Braccetto Destro Stretto (#2)' },
      ],
      expectedPitchControlDelta: '+6.4% area centrale sui cross',
      expectedFiedlerDelta: 'λ₂ = 0.391 (stabile)',
    },
  },
];

export const OrchestratorPanel: React.FC<OrchestratorPanelProps> = ({
  state,
  onApplyModification,
  onEnableOverlay,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({
    'tc-init-1': true,
  });
  const [appliedSuggestions, setAppliedSuggestions] = useState<Record<string, boolean>>({});

  const toggleTool = (id: string) => {
    setExpandedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sendMessage = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/llm/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, state }),
      });
      const data = await res.json();

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'orchestrator',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: data.reply || 'Analisi completata tramite i tool matematici.',
        toolCalls: data.toolCalls || [],
        citations: data.citations || [],
        suggestion: data.suggestion,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (_err) {
      const fallbackMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'orchestrator',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: 'Errore di comunicazione con il server OpenZone. Verifica la connessione locale.',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Calcola la vulnerabilità aerea sui cross per il Centravanti Boa (#9)',
    'Valuta le Top-3 alternative stile chess.com e i varchi TDA H₁',
    'Analizza Fiedler λ₂ e decomposizione di Hodge per il Libero Moderno (#6)',
  ];

  return (
    <div className="flex flex-col h-full bg-[#0D0D12] border border-zinc-800/90 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-[#121218]">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">LLM Tactical Orchestrator</h3>
          <p className="text-[11px] text-zinc-400">
            Zero nomi propri · Tool matematici verificabili · ADR-Math firmati da Marco Razzano
          </p>
        </div>
        <span className="text-[11px] font-mono text-[#00F2FF]">6 Pilastri Attivi</span>
      </div>

      <div className="px-3 py-2 border-b border-zinc-800/70 bg-[#0A0A0E] flex flex-wrap gap-1.5">
        {quickPrompts.map((qp) => (
          <button
            key={qp}
            onClick={() => sendMessage(qp)}
            className="px-2.5 py-1 text-[11px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-[#00F2FF] rounded-md border border-zinc-800 transition-colors text-left"
          >
            {qp}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1 text-[11px] text-zinc-500">
              <span className="font-medium text-zinc-400">
                {msg.sender === 'user' ? 'Analista' : 'OpenPitch Orchestrator'}
              </span>
              <span>·</span>
              <span className="font-mono">{msg.timestamp}</span>
            </div>

            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="w-full space-y-2 mb-2.5">
                {msg.toolCalls.map((tc: ToolCallTrace) => {
                  const isOpen = !!expandedTools[tc.id];
                  return (
                    <div
                      key={tc.id}
                      className="bg-[#13131C] border border-zinc-800 rounded-lg overflow-hidden text-xs"
                    >
                      <button
                        onClick={() => toggleTool(tc.id)}
                        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-zinc-900/60 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Wrench className="w-3.5 h-3.5 text-[#00F2FF] shrink-0" />
                          <span className="font-mono font-semibold text-[#00F2FF] truncate">
                            {tc.toolName}()
                          </span>
                          <span className="text-zinc-500">·</span>
                          <span className="text-[11px] text-zinc-400 truncate">{tc.pillar}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[10px] text-zinc-500">{tc.durationMs}ms</span>
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                          )}
                        </div>
                      </button>

                      <div className="px-3 pb-2 text-[11px] text-zinc-300 font-mono border-t border-zinc-800/60 pt-1.5">
                        {tc.resultSummary}
                      </div>

                      {isOpen && (
                        <div className="px-3 pb-2.5 pt-1 bg-[#09090D] border-t border-zinc-800/80 space-y-2">
                          <pre className="text-[10px] font-mono text-zinc-400 overflow-x-auto">
                            {JSON.stringify(tc.rawResult, null, 2)}
                          </pre>
                          <div className="flex items-center gap-2">
                            {tc.toolName === 'compute_pitch_control' && (
                              <button
                                onClick={() => onEnableOverlay('pitch_control')}
                                className="px-2 py-1 text-[10px] font-medium bg-[#00F2FF]/15 text-[#00F2FF] rounded hover:bg-[#00F2FF]/25 transition-colors"
                              >
                                Mostra Heatmap sul Campo
                              </button>
                            )}
                            {tc.toolName === 'compute_pass_network' && (
                              <button
                                onClick={() => onEnableOverlay('pass_network')}
                                className="px-2 py-1 text-[10px] font-medium bg-[#00F2FF]/15 text-[#00F2FF] rounded hover:bg-[#00F2FF]/25 transition-colors"
                              >
                                Evidenzia Grafo Laplaciano
                              </button>
                            )}
                            {tc.toolName === 'compute_tda' && (
                              <button
                                onClick={() => onEnableOverlay('tda_gaps')}
                                className="px-2 py-1 text-[10px] font-medium bg-[#B4FF39]/15 text-[#B4FF39] rounded hover:bg-[#B4FF39]/25 transition-colors"
                              >
                                Mostra Cicli H₁ sul Campo
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div
              className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                msg.sender === 'user'
                  ? 'bg-[#1E1B4B] text-zinc-100 border border-indigo-500/30 max-w-[90%]'
                  : 'bg-zinc-900/90 text-zinc-200 border border-zinc-800 w-full'
              }`}
            >
              {msg.text}
            </div>

            {msg.citations && msg.citations.length > 0 && (
              <div className="w-full mt-2 space-y-1.5">
                {msg.citations.map((src: CitedSource) => (
                  <div
                    key={src.id}
                    className="p-2.5 rounded-lg bg-[#111118] border border-zinc-800/80 text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-[#B4FF39] shrink-0" />
                      <span>{src.title}</span>
                    </div>
                    <div className="text-zinc-500 mt-0.5">
                      {src.authors} · {src.publication} ({src.year}) · Tool:{' '}
                      <span className="font-mono text-zinc-400">{src.metricLinked}</span>
                    </div>
                    <p className="text-zinc-400 italic mt-1">"{src.excerpt}"</p>
                  </div>
                ))}
              </div>
            )}

            {msg.suggestion && (
              <div className="w-full mt-2.5 p-3 rounded-xl bg-[#111822] border border-[#00F2FF]/35">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#00F2FF]">
                    Modifica Tattica Validata dal Motore
                  </span>
                  <span className="text-[10px] font-mono text-[#B4FF39]">
                    {msg.suggestion.expectedPitchControlDelta}
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-200 mt-1">{msg.suggestion.label}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{msg.suggestion.description}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={() => {
                      onApplyModification(msg.suggestion!);
                      setAppliedSuggestions((prev) => ({ ...prev, [msg.id]: true }));
                    }}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#00F2FF] text-zinc-950 rounded-lg hover:bg-[#00F2FF]/90 transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {appliedSuggestions[msg.id] ? 'Modifica Applicata sul Campo' : 'Applica Modifica'}
                  </button>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {msg.suggestion.expectedFiedlerDelta}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 text-xs text-zinc-400 font-mono">
            Esecuzione tool sui 6 Pilastri matematici in corso...
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="p-3 border-t border-zinc-800 bg-[#121218] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Chiedi all'Orchestrator (es. 'Valuta alternative chess.com per il Libero Moderno')..."
          className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#00F2FF]"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-3.5 py-2 bg-[#00F2FF] text-zinc-950 font-semibold text-xs rounded-lg hover:bg-[#00F2FF]/90 disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          Invia
        </button>
      </form>
    </div>
  );
};
