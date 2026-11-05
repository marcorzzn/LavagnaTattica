/**
 * LavagnaTattica — Drawer Laterale Consultazione Archetipi
 * Riferimento rapido per consultare le caratteristiche delle 30 tipologie astratte
 * direttamente sulla Lavagna Tattica senza interrompere il flusso di lavoro.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Users, Gauge, Zap, Clock, ShieldAlert } from 'lucide-react';
import { PLAYER_ARCHETYPES_30 } from '../../core/presets';
import { PlayerNode } from '../../core/types';

interface ArchetypeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayer: PlayerNode | null;
  onSelectArchetype?: (archetypeId: number) => void;
}

export const ArchetypeDrawer: React.FC<ArchetypeDrawerProps> = ({
  isOpen,
  onClose,
  selectedPlayer,
  onSelectArchetype,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const currentArchetype = PLAYER_ARCHETYPES_30.find(
    (a) => a.id === selectedPlayer?.archetypeId
  ) || PLAYER_ARCHETYPES_30[0];

  const vMax = ((currentArchetype.defaultStats.speed || 75) * 0.1).toFixed(1);
  const aMax = (((currentArchetype.defaultStats.speed || 75) * 0.05) + 1.5).toFixed(1);
  const reactionTime = (((100 - (currentArchetype.defaultStats.composure || 80)) * 0.005) + 0.25).toFixed(2);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-zinc-900/95 backdrop-blur-md border-l border-zinc-800 shadow-2xl flex flex-col text-zinc-100 transition-all animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#00E5FF]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            {t('common.archetype')}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dettaglio Archetipo Selezionato */}
      <div className="p-4 border-b border-zinc-800 bg-black/40 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
              {currentArchetype.positionGroup}
            </span>
            <h4 className="text-base font-bold text-white mt-1">
              {currentArchetype.name}
            </h4>
            <div className="text-[11px] text-zinc-400 font-mono">
              {currentArchetype.code} (ID: #{currentArchetype.id})
            </div>
          </div>
          {selectedPlayer && (
            <span className="text-xs font-mono px-2 py-1 rounded bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30">
              #{selectedPlayer.number} ({selectedPlayer.team})
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          {currentArchetype.expectedBehavior}
        </p>

        {/* Parametri Cine-Dinamici */}
        <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col items-center text-center">
            <Gauge className="w-3.5 h-3.5 text-[#00E5FF] mb-1" />
            <span className="text-[9px] text-zinc-500 uppercase">v_max</span>
            <span className="font-bold text-zinc-200">{vMax} m/s</span>
          </div>

          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col items-center text-center">
            <Zap className="w-3.5 h-3.5 text-[#B4FF39] mb-1" />
            <span className="text-[9px] text-zinc-500 uppercase">a_max</span>
            <span className="font-bold text-zinc-200">{aMax} m/s²</span>
          </div>

          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col items-center text-center">
            <Clock className="w-3.5 h-3.5 text-amber-400 mb-1" />
            <span className="text-[9px] text-zinc-500 uppercase">τ_reaz</span>
            <span className="font-bold text-zinc-200">{reactionTime}s</span>
          </div>
        </div>
      </div>

      {/* Lista di Tutti i 30 Archetipi per Assegnazione Rapida */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
          Assegna Altro Archetipo ({PLAYER_ARCHETYPES_30.length})
        </span>

        {PLAYER_ARCHETYPES_30.map((arch) => {
          const isSelected = arch.id === currentArchetype.id;
          return (
            <div
              key={arch.id}
              onClick={() => onSelectArchetype?.(arch.id)}
              className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                isSelected
                  ? 'bg-zinc-800 border-[#00E5FF] text-white'
                  : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{arch.name}</span>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-black/40 text-zinc-400">
                  {arch.positionGroup}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                {arch.expectedBehavior}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
