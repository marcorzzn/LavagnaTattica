/**
 * LavagnaTattica — Schermata Unificata Teoria, Didattica & Riferimenti Tecnici
 * Due anime distinte e complementari:
 *  1. IMPARA: Laboratorio Didattico, Quiz Situazionali, Puzzle Terzo Uomo
 *  2. CONSULTA: Glossario Bilingue con KaTeX, Registro ADR-Math di Marco Razzano, 30 Archetipi Astratti
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GraduationCap,
  BookMarked,
  ShieldCheck,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { TacticalLearningLab } from './TacticalLearningLab';
import { BILINGUAL_TACTICAL_GLOSSARY, searchBilingualGlossary } from '../../core/bilingualGlossary';
import { ADR_MATH_REGISTRY, PLAYER_ARCHETYPES_30 } from '../../core/presets';

interface UnifiedTheoryViewProps {
  initialSubTab?: 'impara' | 'consulta';
  initialGlossaryId?: string | null;
  onLoadScenarioOnBoard?: (presetId: string) => void;
}

export const UnifiedTheoryView: React.FC<UnifiedTheoryViewProps> = ({
  initialSubTab = 'impara',
  initialGlossaryId = null,
  onLoadScenarioOnBoard,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language?.startsWith('en') ? 'en' : 'it') as 'it' | 'en';

  const [activeTab, setActiveTab] = useState<'impara' | 'consulta'>(
    initialGlossaryId ? 'consulta' : initialSubTab
  );
  const [consultSection, setConsultSection] = useState<'glossary' | 'adr' | 'archetypes'>('glossary');

  // Filtri glossario
  const [glossaryQuery, setGlossaryQuery] = useState(initialGlossaryId || '');
  const [glossaryCategory, setGlossaryCategory] = useState<string>('all');

  const filteredGlossary = searchBilingualGlossary(glossaryQuery, currentLang).filter(
    (e) => glossaryCategory === 'all' || e.category === glossaryCategory
  );

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto text-zinc-100">
      {/* Testata della Schermata Teoria */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#00E5FF] tracking-wider uppercase">
            <BookMarked className="w-4 h-4" />
            <span>{t('teoria.title')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            {t('teoria.title')}
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            {t('teoria.subtitle')}
          </p>
        </div>

        {/* Switch dei Due Livelli: IMPARA vs CONSULTA */}
        <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0">
          <button
            onClick={() => setActiveTab('impara')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'impara'
                ? 'bg-[#2ea043] text-white shadow-lg shadow-[#2ea043]/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>{t('teoria.tab_impara')}</span>
          </button>

          <button
            onClick={() => setActiveTab('consulta')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'consulta'
                ? 'bg-[#00E5FF] text-zinc-950 shadow-lg shadow-[#00E5FF]/20 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>{t('teoria.tab_consulta')}</span>
          </button>
        </div>
      </div>

      {/* CONTENUTO LIVELLO 1: IMPARA (Didattica, Quiz, Puzzle) */}
      {activeTab === 'impara' && (
        <div className="w-full">
          <TacticalLearningLab />
        </div>
      )}

      {/* CONTENUTO LIVELLO 2: CONSULTA (Glossario, ADR-Math, Archetipi) */}
      {activeTab === 'consulta' && (
        <div className="flex flex-col gap-6">
          {/* Sotto-selettore Consulta */}
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <button
              onClick={() => setConsultSection('glossary')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                consultSection === 'glossary'
                  ? 'bg-zinc-800 text-[#00E5FF] border border-[#00E5FF]/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>Glossario Bilingue (50+ Voci)</span>
            </button>

            <button
              onClick={() => setConsultSection('adr')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                consultSection === 'adr'
                  ? 'bg-zinc-800 text-[#B4FF39] border border-[#B4FF39]/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Governance ADR-Math</span>
            </button>

            <button
              onClick={() => setConsultSection('archetypes')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                consultSection === 'archetypes'
                  ? 'bg-zinc-800 text-amber-400 border border-amber-400/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>30 Archetipi Astratti</span>
            </button>
          </div>

          {/* SOTTO-SEZIONE 1: GLOSSARIO TECNICO BILINGUE */}
          {consultSection === 'glossary' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={glossaryQuery}
                    onChange={(e) => setGlossaryQuery(e.target.value)}
                    placeholder={t('teoria.glossary.search_placeholder')}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {['all', 'metric', 'spatial', 'tactical'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setGlossaryCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg border capitalize transition-colors ${
                        glossaryCategory === cat
                          ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/40 font-semibold'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {cat === 'all' ? t('teoria.glossary.all') : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Griglia delle Voci del Glossario */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredGlossary.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-[#00E5FF] font-bold">
                            {entry.shortLabel}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-wider">
                            {entry.category}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-zinc-100 mt-1">
                          {currentLang === 'it' ? entry.termIT : entry.termEN}
                        </h3>
                        <div className="text-[11px] font-mono text-zinc-500">
                          {currentLang === 'it' ? entry.termEN : entry.termIT}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {currentLang === 'it' ? entry.definitionIT : entry.definitionEN}
                    </p>

                    <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800/80 text-[11px] text-zinc-300">
                      <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px] block mb-1">
                        Applicazione Tattica:
                      </span>
                      {currentLang === 'it' ? entry.tacticalUsageIT : entry.tacticalUsageEN}
                    </div>

                    {entry.mathFormula && (
                      <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-[#B4FF39] overflow-x-auto">
                        <span className="text-[10px] text-zinc-500 block mb-0.5 font-sans">Formula:</span>
                        {entry.mathFormula}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                      <span>Fonte: {entry.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SOTTO-SEZIONE 2: GOVERNANCE ADR-MATH (MARCO RAZZANO) */}
          {consultSection === 'adr' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-mono text-[#B4FF39]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>REGISTRO DECISIONI MATEMATICHE (ADR-MATH)</span>
                </div>
                <h3 className="text-base font-bold text-zinc-100 mt-1">
                  Autorità Matematica Suprema: Marco Razzano
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                  Hash di Certificazione Immutabile: 0xLAVAGNATATTICA_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {ADR_MATH_REGISTRY.map((adr) => (
                  <div
                    key={adr.id}
                    className="p-5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/40 text-[#B4FF39]">
                          {adr.id}
                        </span>
                        <h4 className="text-sm font-bold text-zinc-100">
                          {adr.title}
                        </h4>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#2ea043]/20 text-[#2ea043] border border-[#2ea043]/30 font-semibold">
                        {adr.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500 font-semibold block mb-1">Contesto:</span>
                        <p className="text-zinc-300 leading-relaxed">{adr.context}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-semibold block mb-1">Decisione:</span>
                        <p className="text-zinc-300 leading-relaxed">{adr.decision}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-black/50 border border-zinc-800 font-mono text-xs text-[#00E5FF] overflow-x-auto">
                      <span className="text-[10px] text-zinc-500 block mb-1 font-sans">Formulazione Firmata:</span>
                      {adr.formulas}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
                      <span>Proponente: {adr.proposer}</span>
                      <span className="text-[#B4FF39]">{adr.razzanoSignatureHash}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SOTTO-SEZIONE 3: I 30 ARCHETIPI ASTRATTI */}
          {consultSection === 'archetypes' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                  <Users className="w-4 h-4" />
                  <span>REGOLA NON NEGOZIABILE: ZERO NOMI PROPRI</span>
                </div>
                <h3 className="text-base font-bold text-zinc-100 mt-1">
                  Catalogo Canonico delle 30 Tipologie Astratte di Giocatore
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Ogni entità sul campo è codificata con parametri cine-dinamici oggettivi (velocità, accelerazione, tempo di reazione, propensione al pressing).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PLAYER_ARCHETYPES_30.map((arch) => {
                  const vMax = ((arch.defaultStats.speed || 75) * 0.1).toFixed(1);
                  const aMax = (((arch.defaultStats.speed || 75) * 0.05) + 1.5).toFixed(1);
                  const reactionTime = (((100 - (arch.defaultStats.composure || 80)) * 0.005) + 0.25).toFixed(2);
                  return (
                    <div
                      key={arch.id}
                      className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-100">
                          {arch.name}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
                          {arch.positionGroup}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {arch.expectedBehavior}
                      </p>
                      <div className="grid grid-cols-3 gap-1 pt-1 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-400">
                        <div>v_max: <span className="text-zinc-200">{vMax} m/s</span></div>
                        <div>a_max: <span className="text-zinc-200">{aMax} m/s²</span></div>
                        <div>τ_reaz: <span className="text-zinc-200">{reactionTime}s</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
