import React, { useState } from 'react';
import { ShieldCheck, FileSignature, Users, Cpu, CheckCircle2, Lock } from 'lucide-react';
import { ADR_MATH_REGISTRY, PLAYER_ARCHETYPES_30 } from '../../core/presets';
import { ADRMathRecord } from '../../core/types';

interface GovernanceAndArchetypesProps {
  onAssignArchetypeToSelectedPlayer?: (archetypeId: number) => void;
  selectedPlayerLabel?: string;
}

export const GovernanceAndArchetypes: React.FC<GovernanceAndArchetypesProps> = ({
  onAssignArchetypeToSelectedPlayer,
  selectedPlayerLabel,
}) => {
  const [subTab, setSubTab] = useState<'adr_math' | 'archetypes_30' | 'microservices_50'>('adr_math');
  const [selectedAdrId, setSelectedAdrId] = useState<string>(ADR_MATH_REGISTRY[0].id);
  const [groupFilter, setGroupFilter] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL');

  const activeAdr: ADRMathRecord =
    ADR_MATH_REGISTRY.find((a) => a.id === selectedAdrId) || ADR_MATH_REGISTRY[0];

  const filteredArchetypes =
    groupFilter === 'ALL'
      ? PLAYER_ARCHETYPES_30
      : PLAYER_ARCHETYPES_30.filter((a) => a.positionGroup === groupFilter);

  return (
    <div className="space-y-6">
      {/* Founder Authority Header Banner (Preambolo & Sezione 0 & Sezione 19) */}
      <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="font-mono text-[#00F2FF]">
              SEZIONE 0 & 19 — AUTORITÀ MATEMATICA SUPREMA
            </span>
            <span>·</span>
            <span>Fondatore & Proprietario: Marco Razzano</span>
            <span>·</span>
            <span className="font-mono text-[#B4FF39]">
              0xOPENPITCH_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1">
            Governance Matematica (ADR-Math), 30 Tipologie Astratte & Architettura Enterprise
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-4xl">
            Il team propone, Marco Razzano decide. Il team implementa, Marco Razzano valida. Nessuna formula, peso, soglia, architettura di modello o metrica è efficace senza un ADR-Math firmato digitalmente dal Fondatore. Tutte le entità in campo sono astratte in 30 tipologie (zero nomi propri).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 rounded-lg bg-[#09090D] border border-[#B4FF39]/40 text-xs font-mono text-[#B4FF39] flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>4/4 ADR-Math Firmati da Marco Razzano</span>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#111118] border border-zinc-800 rounded-xl w-fit">
        {(
          [
            { id: 'adr_math', label: 'Registro Ufficiale ADR-Math (Sezione 0.2)' },
            { id: 'archetypes_30', label: 'Catalogo 30 Tipologie Astratte di Giocatore (Sezione 4.1)' },
            { id: 'microservices_50', label: 'Architettura 50 Microservizi & Moduli Specialistici (Sezione 2 & 3)' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
              subTab === t.id
                ? 'bg-[#00F2FF] text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'adr_math' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ADR List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            {ADR_MATH_REGISTRY.map((adr) => (
              <button
                key={adr.id}
                onClick={() => setSelectedAdrId(adr.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  activeAdr.id === adr.id
                    ? 'bg-[#161622] border-[#00F2FF]'
                    : 'bg-[#111118] border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#00F2FF] font-bold">{adr.id}</span>
                  <span className="text-[#B4FF39]">{adr.status}</span>
                </div>
                <h4 className="text-sm font-semibold text-zinc-100 mt-1">{adr.title}</h4>
                <div className="text-[11px] text-zinc-500 mt-1.5 font-mono truncate">
                  Firma: {adr.razzanoSignatureHash}
                </div>
              </button>
            ))}
          </div>

          {/* ADR Full Inspector (8 cols) */}
          <div className="lg:col-span-8 p-6 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#00F2FF]">
                  <span>{activeAdr.id}</span>
                  <span>·</span>
                  <span>Data: {activeAdr.date}</span>
                  <span>·</span>
                  <span className="text-[#B4FF39]">{activeAdr.status}</span>
                </div>
                <h3 className="text-lg font-bold text-zinc-100 mt-1">{activeAdr.title}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Proponente: {activeAdr.proposer} · Revisori MRB: {activeAdr.mrbReviewers.join(', ')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
                <div className="font-mono text-zinc-400 mb-1">Contesto:</div>
                <p className="text-zinc-200 leading-relaxed">{activeAdr.context}</p>
              </div>
              <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
                <div className="font-mono text-[#00F2FF] mb-1">Decisione Approvata da Marco Razzano:</div>
                <p className="text-zinc-200 leading-relaxed">{activeAdr.decision}</p>
              </div>
            </div>

            {/* Formulas */}
            <div className="p-3.5 rounded-lg bg-[#09090D] border border-zinc-800 font-mono text-xs text-[#B4FF39] overflow-x-auto">
              Formule Canoniche: {activeAdr.formulas}
            </div>

            {/* Variables Table */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-300 mb-2">
                Variabili, Unità di Misura e Dominio
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-1.5">Simbolo</th>
                      <th className="py-1.5">Definizione</th>
                      <th className="py-1.5">Unità</th>
                      <th className="py-1.5">Dominio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {activeAdr.variables.map((v) => (
                      <tr key={v.symbol}>
                        <td className="py-2 text-[#00F2FF]">{v.symbol}</td>
                        <td className="py-2 font-sans text-zinc-200">{v.definition}</td>
                        <td className="py-2 text-zinc-400">{v.unit}</td>
                        <td className="py-2 text-[#B4FF39]">{v.domain}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Alternatives Considered (At least 3 per Section 0.2) */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-300 mb-2">
                Alternative Considerate dal Mathematical Review Board (Minimo 3)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                {activeAdr.alternativesConsidered.map((alt) => (
                  <div key={alt.name} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
                    <div className="font-semibold text-zinc-100">{alt.name}</div>
                    <div className="text-[#B4FF39] text-[11px]">Pro: {alt.pros}</div>
                    <div className="text-zinc-400 text-[11px]">Contro: {alt.cons}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Digital Signature Footer */}
            <div className="p-3 rounded-lg bg-[#111822] border border-[#00F2FF]/40 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-[#00F2FF]">
                <FileSignature className="w-4 h-4" />
                <span>FIRMA DIGITALE MARCO RAZZANO: {activeAdr.razzanoSignatureHash}</span>
              </div>
              <span className="text-zinc-400">Rollback: {activeAdr.rollbackPlan}</span>
            </div>
          </div>
        </div>
      )}

      {subTab === 'archetypes_30' && (
        <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-[#00F2FF]">
                SEZIONE 4.1 & 4.2 — ASTRAZIONE GIOCATORI (30 TIPOLOGIE, ZERO NOMI PROPRI)
              </span>
              <h3 className="text-base font-semibold text-zinc-100 mt-0.5">
                Catalogo delle 30 Tipologie Tattiche configurabili sul Campo
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((grp) => (
                <button
                  key={grp}
                  onClick={() => setGroupFilter(grp)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${
                    groupFilter === grp
                      ? 'bg-[#00F2FF] text-zinc-950 font-semibold'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {grp === 'ALL' ? 'Tutte (30)' : grp}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredArchetypes.map((arch) => (
              <div
                key={arch.id}
                className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#00F2FF]">
                      #{arch.id.toString().padStart(2, '0')} · {arch.code}
                    </span>
                    <span className="text-zinc-400">
                      {arch.positionGroup} · {arch.defaultHeightCm}cm · {arch.defaultFoot}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-100 mt-1">{arch.name}</h4>
                  <p className="text-xs text-zinc-400 mt-1">{arch.expectedBehavior}</p>
                  <div className="text-[11px] text-[#B4FF39] mt-2 font-mono">
                    Attributi chiave: {arch.keyAttributes.join(' · ')}
                  </div>
                </div>

                {onAssignArchetypeToSelectedPlayer && (
                  <button
                    onClick={() => onAssignArchetypeToSelectedPlayer(arch.id)}
                    className="w-full py-1.5 px-3 text-xs font-medium bg-[#161622] hover:bg-[#00F2FF] hover:text-zinc-950 text-[#00F2FF] border border-[#00F2FF]/40 rounded-lg transition-colors"
                  >
                    Assegna a Pedina Selezionata ({selectedPlayerLabel || 'Attiva'})
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'microservices_50' && (
        <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
          <div>
            <span className="text-xs font-mono text-[#00F2FF]">
              SEZIONE 2.1 & SEZIONE 3 — ECOSISTEMA A 50 MICROSERVIZI & MODULI SPECIALISTICI
            </span>
            <h3 className="text-base font-semibold text-zinc-100 mt-0.5">
              Topologia dei Servizi Core, Visione, Matematica, Valutazione e Moduli Specialistici
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {[
              {
                cluster: 'Cluster 1: Core, Ingest & CV (01–06)',
                services: ['openpitch-core', 'openpitch-ingest', 'openpitch-cv', 'openpitch-fusion', 'openpitch-warehouse', 'openpitch-math'],
                desc: 'Ingestione universale video (240p–8K, broadcast/drone), calibrazione DLT+RANSAC, tracking Kalman e fusione multi-sorgente.',
              },
              {
                cluster: 'Cluster 2: Evaluation & Intelligence (07–14)',
                services: ['openpitch-eval', 'openpitch-tactics', 'openpitch-physical', 'openpitch-psych', 'openpitch-setpieces', 'openpitch-gk', 'openpitch-ref'],
                desc: 'Motore di valutazione stile chess.com (Top-3 alternative), potenza metabolica, calci piazzati MILP, portiere e arbitro.',
              },
              {
                cluster: 'Cluster 3: Simulazione & AI Avanzata (20–32)',
                services: ['openpitch-clipping', 'openpitch-sim', 'openpitch-gen', 'openpitch-adversarial', 'openpitch-marl', 'openpitch-gnn', 'openpitch-ssl'],
                desc: 'Monte Carlo, Multi-Agent RL (MAPPO/QMIX), Graph Neural Networks (GAT), Self-Supervised Learning e sintesi tattica generativa.',
              },
              {
                cluster: 'Cluster 4: Governance, LLM & Platform (33–50)',
                services: ['openpitch-llm', 'openpitch-knowledge', 'openpitch-education', 'openpitch-report', 'openpitch-audit', 'openpitch-observability', 'openpitch-security'],
                desc: 'LLM Orchestrator con tool call verificabili, audit log immutabile ADR-Math, WCAG 2.2 AAA, GDPR & AI Act compliance.',
              },
            ].map((c) => (
              <div key={c.cluster} className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2.5">
                <div className="font-semibold text-zinc-100">{c.cluster}</div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">{c.desc}</p>
                <div className="space-y-1 pt-1 font-mono text-[11px] text-[#00F2FF]">
                  {c.services.map((s) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-[#B4FF39]" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
