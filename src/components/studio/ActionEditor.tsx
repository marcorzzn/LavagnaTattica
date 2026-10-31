import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  ArrowRight,
  Zap,
  Target,
  Gauge,
  X,
  Check,
  ChevronDown,
} from 'lucide-react';
import { useStudioStore } from '../../stores/studioStore';
import {
  ContactSurface,
  TacticalAction,
  TacticalActionType,
} from '../../core/types';

interface ActionEditorProps {
  onClose?: () => void;
  onNotify?: (msg: string) => void;
}

const ACTION_TYPE_LABELS: Record<TacticalActionType, { label: string; icon: string; category: 'pass' | 'shot' | 'movement' }> = {
  pass_ground: { label: 'Passaggio rasoterra', icon: '⚽', category: 'pass' },
  pass_through: { label: 'Passaggio filtrante', icon: '⚡', category: 'pass' },
  pass_lofted: { label: 'Passaggio aereo', icon: '↗️', category: 'pass' },
  cross: { label: 'Cross', icon: '↪️', category: 'pass' },
  shot_ground: { label: 'Tiro rasoterra', icon: '🎯', category: 'shot' },
  shot_curl: { label: 'Tiro a giro', icon: '🌀', category: 'shot' },
  shot_lofted: { label: 'Tiro al volo / Pallonetto', icon: '🚀', category: 'shot' },
  run: { label: 'Scatto senza palla', icon: '🏃', category: 'movement' },
  press: { label: 'Pressing coordinato', icon: '🛡️', category: 'movement' },
};

const CONTACT_LABELS: Record<ContactSurface, string> = {
  flat: 'Piatto (Precisione)',
  collar: 'Collo Pieno (Potenza)',
  trivela: 'Trivela (Esterno)',
  head: 'Colpo di Testa',
  inside: 'Interno a Giro',
};

export const ActionEditor: React.FC<ActionEditorProps> = ({ onClose, onNotify }) => {
  const keyframes = useStudioStore((s) => s.keyframes);
  const actions = useStudioStore((s) => s.actions);
  const activeKeyframeIndex = useStudioStore((s) => s.activeKeyframeIndex);
  const players = useStudioStore((s) => s.players);
  const addAction = useStudioStore((s) => s.addAction);
  const updateAction = useStudioStore((s) => s.updateAction);
  const deleteAction = useStudioStore((s) => s.deleteAction);

  const kfFrom = keyframes[activeKeyframeIndex];
  const kfTo = keyframes[activeKeyframeIndex + 1];

  // Azioni attive tra il keyframe corrente e il successivo
  const currentActions = actions.filter(
    (a) => kfFrom && kfTo && a.keyframeFrom === kfFrom.id && a.keyframeTo === kfTo.id
  );

  const [isAdding, setIsAdding] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<TacticalActionType>('pass_ground');
  const [playerId, setPlayerId] = useState<string>(players[0]?.id || 'home-06');
  const [targetPlayerId, setTargetPlayerId] = useState<string>(players[1]?.id || 'home-10');
  const [speedKmh, setSpeedKmh] = useState<number>(58);
  const [heightCm, setHeightCm] = useState<number>(0);
  const [curve, setCurve] = useState<number>(0);
  const [contact, setContact] = useState<ContactSurface>('flat');
  const [duration, setDuration] = useState<number>(1500);

  const handleStartAdd = (selectedType: TacticalActionType) => {
    setType(selectedType);
    if (selectedType === 'cross' || selectedType === 'pass_lofted') {
      setHeightCm(240);
      setCurve(selectedType === 'cross' ? 0.3 : 0);
    } else if (selectedType === 'shot_curl') {
      setHeightCm(90);
      setCurve(0.6);
      setContact('inside');
    } else if (selectedType === 'run') {
      setSpeedKmh(28);
      setHeightCm(0);
      setCurve(0);
    } else {
      setHeightCm(0);
      setCurve(0);
      setContact('flat');
    }
    setIsAdding(true);
    setEditingActionId(null);
  };

  const handleSaveAction = () => {
    if (!kfFrom || !kfTo) return;

    const actionData: TacticalAction = {
      id: editingActionId || `act-${Date.now()}`,
      keyframeFrom: kfFrom.id,
      keyframeTo: kfTo.id,
      type,
      playerId,
      targetPlayerId: type !== 'run' ? targetPlayerId : undefined,
      params: {
        speedKmh,
        heightCm,
        curve,
        contact,
        duration,
      },
    };

    if (editingActionId) {
      updateAction(editingActionId, actionData);
      onNotify?.('Azione tattica modificata.');
    } else {
      addAction(actionData);
      onNotify?.(`Aggiunta azione: ${ACTION_TYPE_LABELS[type].label}`);
    }

    setIsAdding(false);
    setEditingActionId(null);
  };

  const handleEditClick = (act: TacticalAction) => {
    setEditingActionId(act.id);
    setType(act.type);
    setPlayerId(act.playerId);
    setTargetPlayerId(act.targetPlayerId || players[0]?.id || '');
    setSpeedKmh(act.params.speedKmh);
    setHeightCm(act.params.heightCm);
    setCurve(act.params.curve);
    setContact(act.params.contact);
    setDuration(act.params.duration);
    setIsAdding(true);
  };

  if (!kfFrom || !kfTo) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-3 text-xs text-slate-400">
        Seleziona uno step (tranne l'ultimo) per definire le azioni verso lo step successivo.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800/95 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wide">
            Azioni tra {kfFrom.label || `Step ${activeKeyframeIndex + 1}`} e {kfTo.label || `Step ${activeKeyframeIndex + 2}`}
          </h4>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Elenco Azioni Attive */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {currentActions.length === 0 && !isAdding && (
          <p className="text-xs text-slate-500 py-2 text-center italic">
            Nessuna azione esplicita dichiarata per questo intervallo (interpolazione standard attiva).
          </p>
        )}

        {currentActions.map((act) => {
          const executor = players.find((p) => p.id === act.playerId);
          const target = players.find((p) => p.id === act.targetPlayerId);
          const meta = ACTION_TYPE_LABELS[act.type] || { label: act.type, icon: '⚽' };

          return (
            <div
              key={act.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs transition-colors hover:border-slate-700"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{meta.icon}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                    <span>{meta.label}</span>
                    <span className="font-mono text-[10px] text-cyan-400">
                      #{executor?.number || '6'} {target ? `→ #${target.number}` : ''}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    <span>{act.params.speedKmh} km/h</span>
                    {act.params.heightCm > 0 && <span>{act.params.heightCm} cm</span>}
                    {act.params.curve !== 0 && (
                      <span>Curva: {act.params.curve > 0 ? `+${act.params.curve}` : act.params.curve}</span>
                    )}
                    <span>{act.params.duration} ms</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleEditClick(act)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
                  title="Modifica parametri azione"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteAction(act.id);
                    onNotify?.('Azione rimossa.');
                  }}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
                  title="Elimina azione"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor Form (Aggiungi / Modifica Azione) */}
      {isAdding ? (
        <div className="rounded-lg border border-cyan-500/40 bg-slate-950/90 p-3 space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-cyan-300">
              {editingActionId ? 'Modifica Azione' : `Nuova Azione: ${ACTION_TYPE_LABELS[type].label}`}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingActionId(null);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Esecutore:</label>
              <select
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
              >
                {players.map((p) => (
                  <option key={`p_${p.id}`} value={p.id}>
                    #{p.number} {p.archetypeName} ({p.team === 'home' ? 'Casa' : 'Ospite'})
                  </option>
                ))}
              </select>
            </div>

            {type !== 'run' && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Destinatario / Ricevente:</label>
                <select
                  value={targetPlayerId}
                  onChange={(e) => setTargetPlayerId(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                >
                  {players.map((p) => (
                    <option key={`tp_${p.id}`} value={p.id}>
                      #{p.number} {p.archetypeName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Parametri Azione */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Velocità:</span>
                <span className="font-mono text-cyan-400 font-bold">{speedKmh} km/h</span>
              </div>
              <input
                type="range"
                min="15"
                max="140"
                value={speedKmh}
                onChange={(e) => setSpeedKmh(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Elevazione / Quota Z:</span>
                <span className="font-mono text-cyan-400 font-bold">{heightCm} cm</span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Curva (Bézier):</span>
                <span className="font-mono text-cyan-400 font-bold">{curve.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={curve}
                onChange={(e) => setCurve(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>Durata:</span>
                <span className="font-mono text-cyan-400 font-bold">{duration} ms</span>
              </div>
              <input
                type="range"
                min="300"
                max="4000"
                step="100"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Superficie d'Impatto / Contatto:</label>
            <select
              value={contact}
              onChange={(e) => setContact(e.target.value as ContactSurface)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
            >
              {(Object.keys(CONTACT_LABELS) as ContactSurface[]).map((c) => (
                <option key={c} value={c}>
                  {CONTACT_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingActionId(null);
              }}
              className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSaveAction}
              className="px-3 py-1 rounded bg-cyan-400 font-bold text-slate-950 hover:bg-cyan-300 flex items-center gap-1 shadow-sm"
            >
              <Check className="h-3 w-3" />
              <span>Salva Azione</span>
            </button>
          </div>
        </div>
      ) : (
        /* Selettore Aggiungi Azione */
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-400">
            + Dichiara Nuova Azione:
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleStartAdd('pass_ground')}
              className="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-[11px] font-medium text-slate-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1 truncate"
            >
              <span>⚽ Rasoterra</span>
            </button>
            <button
              type="button"
              onClick={() => handleStartAdd('pass_through')}
              className="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-[11px] font-medium text-slate-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1 truncate"
            >
              <span>⚡ Filtrante</span>
            </button>
            <button
              type="button"
              onClick={() => handleStartAdd('pass_lofted')}
              className="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-[11px] font-medium text-slate-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1 truncate"
            >
              <span>↗️ Aereo</span>
            </button>
            <button
              type="button"
              onClick={() => handleStartAdd('cross')}
              className="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-[11px] font-medium text-slate-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1 truncate"
            >
              <span>↪️ Cross</span>
            </button>
            <button
              type="button"
              onClick={() => handleStartAdd('shot_curl')}
              className="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-[11px] font-medium text-slate-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1 truncate"
            >
              <span>🌀 A Giro</span>
            </button>
            <button
              type="button"
              onClick={() => handleStartAdd('run')}
              className="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-[11px] font-medium text-slate-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1 truncate"
            >
              <span>🏃 Scatto</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
