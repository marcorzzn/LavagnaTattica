/**
 * LavagnaTattica — Botoniera Tag Tattici Istantanei
 * Il collante trasversale tra Video Lab, Lavagna e Teoria.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Play, CheckCircle2, BookmarkPlus, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { useStudioStore } from '../../stores/studioStore';
import { TacticalTag, TagCategory } from '../../core/types';

interface TaggingPadProps {
  currentTimestampSec: number;
  onOpenScenarioOnBoard: (tag: TacticalTag) => void;
  onOpenGlossaryEntry: (glossaryId: string) => void;
}

export const TaggingPad: React.FC<TaggingPadProps> = ({
  currentTimestampSec,
  onOpenScenarioOnBoard,
  onOpenGlossaryEntry,
}) => {
  const { t } = useTranslation();
  const tags = useStudioStore((s) => s.tags);
  const addTacticalTag = useStudioStore((s) => s.addTacticalTag);
  const activeTagId = useStudioStore((s) => s.activeTagId);
  const setActiveTag = useStudioStore((s) => s.setActiveTag);

  const [tagTitle, setTagTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TagCategory>('pass');

  const presetButtons: Array<{
    category: TagCategory;
    eventType: string;
    label: string;
    badge: 'best_move' | 'good_move';
    glossaryId: string;
    shortcut: string;
  }> = [
    { category: 'pass', eventType: 'through_ball', label: t('video.botoniera.tag_pass'), badge: 'best_move', glossaryId: 'zone-14', shortcut: 'P' },
    { category: 'shot', eventType: 'shot_creation', label: t('video.botoniera.tag_shot'), badge: 'good_move', glossaryId: 'expected-threat', shortcut: 'T' },
    { category: 'pressing', eventType: 'gegenpressing_trap', label: t('video.botoniera.tag_press'), badge: 'best_move', glossaryId: 'gegenpressing', shortcut: 'G' },
    { category: 'pass', eventType: 'cutback', label: t('video.botoniera.tag_cutback'), badge: 'best_move', glossaryId: 'cutback', shortcut: 'C' },
    { category: 'off_ball', eventType: 'third_man_run', label: t('video.botoniera.tag_thirdman'), badge: 'best_move', glossaryId: 'third-man-run', shortcut: '3' },
    { category: 'recovery', eventType: 'ball_recovery', label: t('video.botoniera.tag_recovery'), badge: 'good_move', glossaryId: 'pitch-control', shortcut: 'R' },
  ];

  const handleQuickTag = (preset: typeof presetButtons[0]) => {
    const newTag: TacticalTag = {
      id: `tag-${Date.now()}`,
      matchId: 'live-clip-session',
      timestampSec: Number(currentTimestampSec.toFixed(1)),
      category: preset.category,
      eventType: preset.eventType,
      title: `${preset.label} @ ${currentTimestampSec.toFixed(1)}s`,
      pitchCoordinates: { x: 75.0, y: 34.0 },
      playersInvolved: [
        { playerId: 'home-10', archetypeId: 'trequartista_associativo', role: 'actor' },
      ],
      metricsSnapshot: {
        xtDelta: 0.035,
        pitchControlAdvantage: 0.22,
        evalScore: 0.38,
        qualitativeBadge: preset.badge,
      },
      glossaryReferenceId: preset.glossaryId,
      certification: {
        wilsonCi95: [0.35, 0.50],
        verifiedByBenchmark: true,
      },
      createdAt: new Date().toISOString(),
    };

    addTacticalTag(newTag);
  };

  const handleManualCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagTitle.trim()) return;

    const newTag: TacticalTag = {
      id: `tag-${Date.now()}`,
      matchId: 'live-clip-session',
      timestampSec: Number(currentTimestampSec.toFixed(1)),
      category: selectedCategory,
      eventType: 'custom_tag',
      title: tagTitle.trim(),
      pitchCoordinates: { x: 60.0, y: 40.0 },
      playersInvolved: [],
      metricsSnapshot: {
        evalScore: 0.25,
      },
      createdAt: new Date().toISOString(),
    };

    addTacticalTag(newTag);
    setTagTitle('');
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#00E5FF]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            {t('video.botoniera.title')}
          </h3>
        </div>
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-[#B4FF39]">
          ⏱️ {currentTimestampSec.toFixed(1)}s
        </span>
      </div>

      {/* Botoni Rapidi Istantanei */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {presetButtons.map((btn) => (
          <button
            key={btn.eventType}
            onClick={() => handleQuickTag(btn)}
            className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/90 border border-zinc-700/60 hover:border-[#00E5FF]/60 text-left transition-all group"
          >
            <div>
              <div className="text-xs font-semibold text-zinc-200 group-hover:text-white">
                {btn.label}
              </div>
              <div className="text-[10px] text-zinc-400 capitalize">
                {btn.category}
              </div>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-mono text-zinc-400 group-hover:text-[#B4FF39]">
              {btn.shortcut}
            </kbd>
          </button>
        ))}
      </div>

      {/* Creazione Manuale Rapida */}
      <form onSubmit={handleManualCreate} className="flex gap-2 pt-1">
        <input
          type="text"
          value={tagTitle}
          onChange={(e) => setTagTitle(e.target.value)}
          placeholder={t('video.botoniera.create_tag')}
          className="flex-1 px-3 py-1.5 rounded-lg bg-black/60 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#00E5FF]"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as TagCategory)}
          className="px-2 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="pass">Pass</option>
          <option value="shot">Shot</option>
          <option value="pressing">Press</option>
          <option value="recovery">Recovery</option>
          <option value="transition">Transition</option>
        </select>
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-[#2ea043] hover:bg-[#2c974b] text-white text-xs font-semibold transition-colors"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Lista dei Tag Registrati per questa sessione */}
      <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-semibold text-zinc-300">
            {t('common.tags')} ({tags.length})
          </span>
          <span className="text-[11px] text-zinc-500">
            1 Oggetto Dati → 3 Viste
          </span>
        </div>

        {tags.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3 text-center">
            {t('video.botoniera.no_tags')}
          </p>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {tags.map((tag) => {
              const isActive = tag.id === activeTagId;
              return (
                <div
                  key={tag.id}
                  onClick={() => setActiveTag(tag.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-zinc-800/90 border-[#00E5FF] shadow-lg shadow-[#00E5FF]/5'
                      : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/40 text-[#B4FF39]">
                        {tag.timestampSec}s
                      </span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {tag.title}
                      </span>
                    </div>

                    {tag.metricsSnapshot.qualitativeBadge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2ea043]/20 text-[#2ea043] border border-[#2ea043]/30">
                        {tag.metricsSnapshot.qualitativeBadge === 'best_move' ? 'Best Move (!!)' : 'Good Move (!)'}
                      </span>
                    )}
                  </div>

                  {tag.description && (
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                      {tag.description}
                    </p>
                  )}

                  {/* Azioni Trasversali: Apri su Lavagna / Leggi nel Glossario */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-zinc-800/60">
                    {tag.glossaryReferenceId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenGlossaryEntry(tag.glossaryReferenceId!);
                        }}
                        className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                        title="Vedi definizione nella sezione Teoria"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Teoria: {tag.glossaryReferenceId}</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenScenarioOnBoard(tag);
                      }}
                      className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 text-[11px] font-medium text-[#00E5FF] transition-colors"
                    >
                      <Layers className="w-3 h-3" />
                      <span>{t('video.botoniera.open_in_lavagna')}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
