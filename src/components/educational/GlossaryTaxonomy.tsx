/**
 * LavagnaTattica — Glossario Metriche & Tassonomia Tattica
 *
 * Visualizzatore navigabile e filtrabile di tutte le metriche e concetti spaziali
 * con formule LaTeX KaTeX, interpretazione tattica sul campo e citazioni ufficiali.
 */

import React, { useState } from 'react';
import { BookMarked, ExternalLink, Search } from 'lucide-react';
import { TACTICAL_GLOSSARY, GlossaryMetricEntry } from '../../core/tacticalGlossary';

export const GlossaryTaxonomy: React.FC = () => {
  const [search, setSearch] = useState('');
  const [generationFilter, setGenerationFilter] = useState<string>('all');

  const filtered = TACTICAL_GLOSSARY.filter((entry) => {
    const matchesGen = generationFilter === 'all' || entry.generation === generationFilter;
    const q = search.trim().toLowerCase();
    const matchesText =
      !q ||
      entry.name.toLowerCase().includes(q) ||
      entry.shortLabel.toLowerCase().includes(q) ||
      entry.definition.toLowerCase().includes(q) ||
      entry.tacticalUsage.toLowerCase().includes(q);
    return matchesGen && matchesText;
  });

  const generations = [
    { id: 'all', label: 'Tutte le Metriche' },
    { id: '2G', label: '2ª Gen (xG / xGOT / xA)' },
    { id: '3G', label: '3ª Gen (xT / PPDA / Packing / Pitch Control / Fiedler)' },
    { id: 'Tactical', label: 'Concetti Spaziali & Tattici' },
  ];

  return (
    <div className="flex flex-col gap-6 text-slate-200">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2">
          <BookMarked className="h-7 w-7 text-cyan-400" />
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Glossario Metrico & Tassonomia Spaziale
          </h1>
        </div>
        <p className="max-w-3xl text-sm text-slate-400 leading-relaxed">
          Ogni metrica e concetto tattico integrato in LavagnaTattica (motore NucleoTattico) è accompagnato dalla formulazione matematica esatta,
          dalla generazione evolutiva di appartenenza, dall’applicazione pratica per l’analista e dal riferimento accademico o federale verificabile.
        </p>
      </div>

      {/* Barra di ricerca e filtri generazionali */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome o concetto (es. xG, xGOT, xT, PPDA, Half-Space, Packing, Fiedler)..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 p-1">
          {generations.map((gen) => (
            <button
              key={gen.id}
              type="button"
              onClick={() => setGenerationFilter(gen.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                generationFilter === gen.id
                  ? 'bg-cyan-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {gen.label}
            </button>
          ))}
        </div>
      </div>

      {/* Griglia Schede Metriche */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-2">
                <span className="font-mono font-bold text-cyan-400">
                  {item.shortLabel} · Generazione {item.generation}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                  Categoria: {item.category}
                </span>
              </div>

              <h2 className="text-lg font-bold text-white mb-2">{item.name}</h2>

              <p className="text-xs text-slate-300 leading-relaxed mb-3">{item.definition}</p>

              <div className="rounded-lg bg-slate-950 p-3 text-xs text-slate-300 mb-3 border border-slate-800/80">
                <strong className="text-lime-400">Interpretazione Tattica:</strong> {item.tacticalUsage}
              </div>

              {item.formula && (
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-3 py-2 font-mono text-xs text-cyan-300 mb-3 overflow-x-auto">
                  {item.formula}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
              <span className="truncate max-w-[260px]">
                Fonte: <strong className="text-slate-200">{item.source}</strong>
              </span>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:underline shrink-0"
              >
                <span>Riferimento</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

