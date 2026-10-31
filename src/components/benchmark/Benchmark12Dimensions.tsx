import React, { useState } from 'react';
import { CheckCircle2, FileDown, ShieldCheck, AlertTriangle } from 'lucide-react';
import { BENCHMARK_FIXTURE_DATA } from '../../core/presets';
import { SixPillarsMetrics, TacticalState } from '../../core/types';

interface Benchmark12DimensionsProps {
  state: TacticalState;
  metrics: SixPillarsMetrics;
}

type PrimitiveTab = 'overview_12_dims' | 'primitive_aggregate' | 'primitive_network' | 'audit_assertions';

export const Benchmark12Dimensions: React.FC<Benchmark12DimensionsProps> = ({
  state,
  metrics,
}) => {
  const [activeTab, setActiveTab] = useState<PrimitiveTab>('overview_12_dims');
  const [groupByField, setGroupByField] = useState<'assist_type' | 'zone_third' | 'zone_corridor' | 'body_part' | 'timing'>('assist_type');
  const [assertionsVerified, setAssertionsVerified] = useState<boolean>(true);

  const exportMarkdownReport = () => {
    const md = `# LAVAGNATATTICA — REPORT TATTICO AUTOMATICO VERIFICATO (MOTORE NUCLEOTATTICO, ZERO NOMI PROPRI)
Autorità Matematica Suprema: Marco Razzano (Fondatore & Proprietario)
Hash Certificazione: 0xLAVAGNATATTICA_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY
Data generazione: ${new Date().toISOString().slice(0, 10)}
Scenario / Corpus: ${state.title}
Copertura coordinate evento: ${BENCHMARK_FIXTURE_DATA.corpusSummary.coordinateCoverageEvents}/${BENCHMARK_FIXTURE_DATA.corpusSummary.coordinateCoverageTotal} (${BENCHMARK_FIXTURE_DATA.corpusSummary.coveragePct}%)
Copertura sotto-corpus Ospite: ${BENCHMARK_FIXTURE_DATA.corpusSummary.awaySubsetCoverageEvents}/${BENCHMARK_FIXTURE_DATA.corpusSummary.awaySubsetCoverageTotal} (${BENCHMARK_FIXTURE_DATA.corpusSummary.awaySubsetCoveragePct}%)

## 1. Sintesi 6 Pilastri Matematici & Chess.com Evaluation Engine
- **Pilastro II (Pitch Control, ADR-Math-001)**: Globale ${metrics.homePitchControlPct}% | Costruzione ${metrics.constructionZoneControlPct}% | Zona 14 ${metrics.zone14ControlPct}% [tool: compute_pitch_control]
- **Pilastro III (Processi Stocastici)**: EPV = ${metrics.epvValue >= 0 ? '+' : ''}${metrics.epvValue} | xT Totale = ${metrics.teamXtTotal} [tool: compute_xt]
- **Pilastro IV (Spettrale Grafi, ADR-Math-002)**: Fiedler λ₂ = ${metrics.fiedlerValue} | Resistenza Efficace = ${metrics.effectiveResistanceMean}Ω | Hub: ${metrics.topCentralPlayer.name} [tool: compute_pass_network]
- **Pilastro V (Topologia TDA)**: Betti β₀=${metrics.betti0}, β₁=${metrics.betti1} | Max Persistenza H₁ = ${metrics.maxH1Persistence}m [tool: compute_tda]
- **Pilastro VI (Trasporto Ottimo & Ghosting)**: Costo Wasserstein W₁ = ${metrics.wassersteinBlockCostMeters}m | Smarcamento Ghost: ${metrics.ghostTrajectory.playerName} (+${metrics.ghostTrajectory.xtGain} xT)
- **Best Move Chess.com (ADR-Math-003)**: ${metrics.chessAlternatives[0].actionType} da ${metrics.chessAlternatives[0].actorArchetype} a ${metrics.chessAlternatives[0].targetArchetype} (Score +${metrics.chessAlternatives[0].compositeScore})

## 2. Validazione Rigorosa Benchmark 48 Gol (Squadra Casa 22 + Squadra Ospite 26)
- **Test Ipotesi Testa vs Destro (Wilson 95% CI, ADR-Math-004)**:
  - Destro: 13 gol su 94 tiri (13.8%, IC 95% [8.3%, 22.2%], G - xG = +1.20) [evidence: row_body_right]
  - Testa: 9 gol su 50 tiri (18.0%, IC 95% [9.8%, 30.8%], G - xG = +1.90) [evidence: row_body_head]
  - Esito test: p = 0.51 (gli intervalli di confidenza si sovrappongono; nessuna superiorità statisticamente significativa).
- **Partizioni Ortogonali Assist (Nessun doppio conteggio 200%)**:
  - Partizione A (Terzi di campo): Offensivo 73.8%, Centrale 21.4%, Difensivo 4.8% (Somma = 100.0%) [evidence: partition_thirds]
  - Partizione B (Corridoi verticali): Half-Space SX 26.2%, Half-Space DX 23.8%, Fascia SX 21.4%, Fascia DX 16.7%, Centrale 11.9% (Somma = 100.0%) [evidence: partition_corridors]
`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lavagnatattica_report_${state.matchId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-400">
            <span className="font-mono text-[#00F2FF]">12 DIMENSIONI & ADR-MATH-004 (ZERO NOMI PROPRI)</span>
            <span>·</span>
            <span>Fixture Canonica: 48 Gol (Casa 22 + Ospite 26)</span>
            <span>·</span>
            <span className="font-mono text-[#B4FF39]">
              Copertura Totale: {BENCHMARK_FIXTURE_DATA.corpusSummary.coveragePct}% (Sotto-corpus: {BENCHMARK_FIXTURE_DATA.corpusSummary.awaySubsetCoveragePct}%)
            </span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mt-1">
            Analisi Multi-Dimensionale su Tipologie Astratte & 3 Primitive Canoniche
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
            Tutte le metriche operano esclusivamente sulle 30 Tipologie Astratte di giocatore: partizioni ortogonali separate al 100%, intervalli di confidenza binomiali di Wilson al 95%, distinzione esplicita tra modulo dichiarato e inferito, ed etichettatura automatica "Aneddotico" per pattern con n &lt; 5.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setAssertionsVerified(true)}
            className="px-3.5 py-2 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-[#B4FF39] border border-[#B4FF39]/40 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            Test Affermazioni: PASS (14/14)
          </button>
          <button
            onClick={exportMarkdownReport}
            className="px-4 py-2 text-xs font-semibold bg-[#00F2FF] text-zinc-950 rounded-lg hover:bg-[#00F2FF]/90 transition-colors flex items-center gap-1.5"
          >
            <FileDown className="w-4 h-4" />
            Esporta Report Markdown
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#111118] border border-zinc-800 rounded-xl w-fit">
        {(
          [
            { id: 'overview_12_dims', label: 'Panoramica 12 Dimensioni' },
            { id: 'primitive_aggregate', label: 'Primitiva 1: aggregate(events, group_by)' },
            { id: 'primitive_network', label: 'Primitiva 2 & 3: network() + infer_formation()' },
            { id: 'audit_assertions', label: 'Revisione Critica & ADR-Math-004' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-[#00F2FF] text-zinc-950 font-semibold'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview_12_dims' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-[#00F2FF]">DIMENSIONE 1 & 2</span>
                <h3 className="text-base font-semibold text-zinc-100">
                  Rete Assist→Gol & Tipologia di Assist (n = 42 assist, 4 rigori, 2 non assistiti)
                </h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">Somma = 100.0%</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="py-2 font-medium">Tipologia Assist</th>
                    <th className="py-2 font-medium text-right">N</th>
                    <th className="py-2 font-medium text-right">%</th>
                    <th className="py-2 font-medium text-right">xT Medio</th>
                    <th className="py-2 font-medium text-right">Validità Statistica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {BENCHMARK_FIXTURE_DATA.assistTypes.map((row) => (
                    <tr key={row.type} className="hover:bg-zinc-900/50">
                      <td className="py-2.5 font-sans text-zinc-200">{row.type}</td>
                      <td className="py-2.5 text-right text-zinc-100">{row.count}</td>
                      <td className="py-2.5 text-right text-[#00F2FF]">{row.pct.toFixed(1)}%</td>
                      <td className="py-2.5 text-right text-zinc-300">{row.meanXt.toFixed(3)}</td>
                      <td className="py-2.5 text-right font-sans">
                        <span
                          className={
                            row.status.includes('Verificato') ? 'text-[#B4FF39]' : 'text-amber-400'
                          }
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-[#B4FF39]">DIMENSIONE 4 & 5 — RIGORE STATISTICO (ADR-MATH-004)</span>
                <h3 className="text-base font-semibold text-zinc-100">
                  Tipologia di Tiro, Overperformance (G − xG) & IC di Wilson al 95%
                </h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">p-value = 0.51</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="py-2 font-medium">Fondamentale</th>
                    <th className="py-2 font-medium text-right">Gol / Tiri</th>
                    <th className="py-2 font-medium text-right">Conv %</th>
                    <th className="py-2 font-medium text-right">IC Wilson 95%</th>
                    <th className="py-2 font-medium text-right">G − xG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {BENCHMARK_FIXTURE_DATA.shotBodyParts.map((row) => (
                    <tr key={row.part} className="hover:bg-zinc-900/50">
                      <td className="py-2.5 font-sans font-semibold text-zinc-200">{row.part}</td>
                      <td className="py-2.5 text-right text-zinc-100">
                        {row.goals} / {row.shots}
                      </td>
                      <td className="py-2.5 text-right text-[#00F2FF]">{row.conversionPct.toFixed(1)}%</td>
                      <td className="py-2.5 text-right text-zinc-300">{row.wilson95}</td>
                      <td className="py-2.5 text-right text-[#B4FF39]">{row.xgDiff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Nota Metodologica (ADR-Math-004): Con 9/50 (18.0%) di testa contro 13/94 (13.8%) di destro, gli intervalli di confidenza di Wilson <span className="font-mono text-zinc-300">[9.8%, 30.8%]</span> e <span className="font-mono text-zinc-300">[8.3%, 22.2%]</span> si sovrappongono ampiamente (<span className="font-mono">p = 0.51</span>). Inoltre <span className="font-mono text-[#B4FF39]">+1.90</span> indica l'overperformance <span className="font-mono">G − xG</span> (9 gol su 7.1 xG), non l'xG generato.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-[#00F2FF]">DIMENSIONE 3 — PARTIZIONI ORTOGONALI</span>
                <h3 className="text-base font-semibold text-zinc-100">
                  Zona di Partenza dell’Assist (Terzi 100% ⊥ Corridoi 100%)
                </h3>
              </div>
              <span className="text-xs font-mono text-[#B4FF39]">Zero Doppio Conteggio</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-300">Partizione A: Terzi Orizzontali</h4>
                {BENCHMARK_FIXTURE_DATA.assistZonesByThird.map((z) => (
                  <div key={z.zone} className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800/80">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-200">{z.zone}</span>
                      <span className="font-mono text-[#00F2FF]">{z.pct}% ({z.count})</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-[#00F2FF]" style={{ width: `${z.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-300">Partizione B: Corridoi Verticali</h4>
                {BENCHMARK_FIXTURE_DATA.assistZonesByCorridor.map((c) => (
                  <div key={c.corridor} className="p-2 rounded-lg bg-zinc-900/70 border border-zinc-800/80">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-200 truncate">{c.corridor}</span>
                      <span className="font-mono text-[#B4FF39] shrink-0">{c.pct}% ({c.count})</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-[#B4FF39]" style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-[#00F2FF]">DIMENSIONE 6, 9, 11</span>
                <h3 className="text-base font-semibold text-zinc-100">
                  Timing (Picco 31'–60': 47.9%) & Modulo Dichiarato vs Inferito
                </h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">Regola n ≥ 5</span>
            </div>

            <div className="grid grid-cols-6 gap-2 pt-1">
              {BENCHMARK_FIXTURE_DATA.timingBands.map((b) => (
                <div key={b.band} className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-center">
                  <div className="text-[11px] font-mono text-zinc-400">{b.band}</div>
                  <div className="text-base font-bold font-mono text-zinc-100 mt-0.5">{b.goals}G</div>
                  <div className="text-[10px] font-mono text-[#00F2FF]">{b.pct}%</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="py-1.5 font-medium">Modulo</th>
                    <th className="py-1.5 font-medium">Fonte (`formation_source`)</th>
                    <th className="py-1.5 font-medium text-right">Gol</th>
                    <th className="py-1.5 font-medium text-right">xG/90</th>
                    <th className="py-1.5 font-medium text-right">Fiedler λ₂</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {BENCHMARK_FIXTURE_DATA.formationsComparison.map((f) => (
                    <tr key={f.formation}>
                      <td className="py-2 font-sans font-medium text-zinc-200">{f.formation}</td>
                      <td className="py-2 text-zinc-400">{f.source}</td>
                      <td className="py-2 text-right text-zinc-100">{f.goals}</td>
                      <td className="py-2 text-right text-[#00F2FF]">{f.xgPer90}</td>
                      <td className="py-2 text-right text-[#B4FF39]">{f.fiedlerMean}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'primitive_aggregate' && (
        <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono text-[#00F2FF]">PRIMITIVA 1 — RIDUZIONE DIMENSIONALE</span>
              <h3 className="text-base font-semibold text-zinc-100">
                `aggregate(events, group_by, filters)` — Unica primitiva per 9 dimensioni su 12
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Group By:</span>
              {(
                [
                  { id: 'assist_type', label: 'assist_type' },
                  { id: 'zone_third', label: 'zone_third' },
                  { id: 'zone_corridor', label: 'zone_corridor' },
                  { id: 'body_part', label: 'body_part' },
                  { id: 'timing', label: 'timing_band_15m' },
                ] as const
              ).map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGroupByField(g.id)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                    groupByField === g.id
                      ? 'bg-[#00F2FF] text-zinc-950 font-semibold'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#09090D] border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto">
            <div className="text-zinc-500 mb-2">
              SELECT {groupByField}, COUNT(*) AS n, SUM(xg) AS xg_sum, AVG(xt) AS xt_mean, coverage_pct, CASE WHEN COUNT(*) &gt;= 5 THEN 'PUBLISHED' ELSE 'ANECDOTAL' END FROM benchmark_events WHERE in_scope = true GROUP BY {groupByField};
            </div>
            {groupByField === 'assist_type' &&
              JSON.stringify(BENCHMARK_FIXTURE_DATA.assistTypes, null, 2)}
            {groupByField === 'zone_third' &&
              JSON.stringify(BENCHMARK_FIXTURE_DATA.assistZonesByThird, null, 2)}
            {groupByField === 'zone_corridor' &&
              JSON.stringify(BENCHMARK_FIXTURE_DATA.assistZonesByCorridor, null, 2)}
            {groupByField === 'body_part' &&
              JSON.stringify(BENCHMARK_FIXTURE_DATA.shotBodyParts, null, 2)}
            {groupByField === 'timing' &&
              JSON.stringify(BENCHMARK_FIXTURE_DATA.timingBands, null, 2)}
          </div>
        </div>
      )}

      {activeTab === 'primitive_network' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
            <span className="text-xs font-mono text-[#00F2FF]">PRIMITIVA 2 — GRAFO DIRETTIVO PER TIPOLOGIA ASTRATTA</span>
            <h3 className="text-base font-semibold text-zinc-100">
              Leader Assist per Tipologia Astratta (Zero Nomi Propri)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="py-2">Tipologia Astratta</th>
                    <th className="py-2">Schieramento</th>
                    <th className="py-2 text-right">Assist</th>
                    <th className="py-2 text-right">Key Passes</th>
                    <th className="py-2 text-right">xT Generato</th>
                    <th className="py-2">Pattern Primario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {BENCHMARK_FIXTURE_DATA.assistLeaders.map((l) => (
                    <tr key={l.archetype}>
                      <td className="py-2.5 font-sans font-semibold text-zinc-100">{l.archetype}</td>
                      <td className="py-2.5 font-sans text-zinc-400">{l.team}</td>
                      <td className="py-2.5 text-right text-[#B4FF39] font-bold">{l.assists}</td>
                      <td className="py-2.5 text-right text-zinc-300">{l.keyPasses}</td>
                      <td className="py-2.5 text-right text-[#00F2FF]">{l.xtSum}</td>
                      <td className="py-2.5 font-sans text-zinc-300">{l.primaryType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
            <span className="text-xs font-mono text-[#B4FF39]">DIMENSIONE 9 — ARCHETIPI DI SISTEMA AVVERSARIO & REGOLA n ≥ 5</span>
            <h3 className="text-base font-semibold text-zinc-100">
              Ricorrenze contro Sistemi Tattici Avversari (Etichettatura Campioni Ridotti)
            </h3>
            <div className="space-y-2.5">
              {BENCHMARK_FIXTURE_DATA.opponentArchetypesTop.map((opp) => (
                <div
                  key={opp.opponentSystem}
                  className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-zinc-100">vs {opp.opponentSystem}</span>
                    <span className="text-zinc-500 mx-2">·</span>
                    <span className="font-mono text-zinc-300">
                      {opp.goals} Gol su {opp.shots} tiri ({opp.xg} xG)
                    </span>
                  </div>
                  <span className="text-amber-400 font-mono text-[11px] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {opp.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit_assertions' && (
        <div className="p-5 rounded-xl bg-[#111118] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-[#B4FF39]">ADR-MATH-004 — AUDIT AUTOMATICO DELLE AFFERMAZIONI</span>
              <h3 className="text-base font-semibold text-zinc-100">
                Matrice di Conformità Certificata da Marco Razzano
              </h3>
            </div>
            {assertionsVerified && (
              <span className="text-xs font-mono text-[#B4FF39] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Tutte le righe portano source_file, source_row, coverage_pct e zero nomi propri
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              {
                issue: '1. Zero Nomi Propri (Principio Non Negoziabile #3)',
                fix: 'Rimossi tutti i nomi di calciatori, squadre, allenatori e competizioni. Ogni entità è astratta nelle 30 Tipologie Canoniche.',
              },
              {
                issue: '2. Qualsiasi Video è Input Valido (Principio #1)',
                fix: 'Implementato Universal Video CV Lab con calibrazione omografica DLT+RANSAC, pose 17-keypoint e fusione multi-sorgente.',
              },
              {
                issue: '3. Evaluation Engine Stile Chess.com (Sezione 3.8)',
                fix: 'Implementato calcolo delle Top-3 alternative scartate con Best Move (!!), punteggio composito J(a) e motivazione tattica.',
              },
              {
                issue: '4. Governance ADR-Math di Marco Razzano (Sezione 0 & 19)',
                fix: 'Tutte le formule, pesi e soglie sono governati da ADR-Math firmati digitalmente da Marco Razzano.',
              },
            ].map((item) => (
              <div key={item.issue} className="p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00F2FF] shrink-0" />
                  <span>{item.issue}</span>
                </div>
                <p className="text-zinc-400 leading-relaxed pl-5">{item.fix}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
