import React, { useState } from 'react';
import {
  Film,
  Layers,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  Video,
  Zap,
  Repeat,
  Download,
  FileCode,
} from 'lucide-react';
import { useStudioStore } from '../../stores/studioStore';
import { useViewportStore } from '../../stores/viewportStore';
import { useAnimationPlayback } from '../../hooks/useAnimationPlayback';
import { ActionEditor } from './ActionEditor';
import { exportAnimationJSON } from '../../lib/export';

interface TimelineBarProps {
  onNotify?: (msg: string) => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const minsStr = String(mins).padStart(2, '0');
  const secsStr = secs.toFixed(1).padStart(4, '0');
  return `${minsStr}:${secsStr}`;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({ onNotify }) => {
  // Avvia il loop requestAnimationFrame continuo quando animation.playing === true
  useAnimationPlayback();

  const keyframes = useStudioStore((s) => s.keyframes);
  const actions = useStudioStore((s) => s.actions);
  const activeKeyframeIndex = useStudioStore((s) => s.activeKeyframeIndex);
  const animation = useStudioStore((s) => s.animation);

  const captureKeyframe = useStudioStore((s) => s.captureKeyframe);
  const applyKeyframeAtIndex = useStudioStore((s) => s.applyKeyframeAtIndex);
  const deleteKeyframe = useStudioStore((s) => s.deleteKeyframe);
  const setAnimation = useStudioStore((s) => s.setAnimation);
  const seekAnimation = useStudioStore((s) => s.seekAnimation);
  const togglePlayAnimation = useStudioStore((s) => s.togglePlayAnimation);

  const onionSkinEnabled = useViewportStore((s) => s.onionSkinEnabled);
  const ghostTrailsEnabled = useViewportStore((s) => s.ghostTrailsEnabled);
  const toggleOnionSkin = useViewportStore((s) => s.toggleOnionSkin);
  const toggleGhostTrails = useViewportStore((s) => s.toggleGhostTrails);

  const [showActionEditor, setShowActionEditor] = useState(false);
  const speeds: Array<0.5 | 1 | 1.5 | 2> = [0.5, 1, 1.5, 2];

  const handleStepBackward = () => {
    const prevIdx = Math.max(0, activeKeyframeIndex - 1);
    applyKeyframeAtIndex(prevIdx);
  };

  const handleStepForward = () => {
    const nextIdx = Math.min(keyframes.length - 1, activeKeyframeIndex + 1);
    applyKeyframeAtIndex(nextIdx);
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-slate-800/90 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
      {/* RIGA 1: Playback Controls, Timer, Speed & Loop */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleStepBackward}
            title="Step precedente"
            className="rounded-md border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={togglePlayAnimation}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold transition-all shadow-sm ${
              animation.playing
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
            }`}
          >
            {animation.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{animation.playing ? 'Pausa' : 'Play Azione'}</span>
          </button>

          <button
            type="button"
            onClick={handleStepForward}
            title="Step successivo"
            className="rounded-md border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Time Display */}
          <div className="font-mono text-xs font-semibold px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 tracking-wider">
            {formatTime(animation.currentTime)} / {formatTime(animation.totalDuration)}
          </div>

          {/* Loop Toggle */}
          <button
            type="button"
            onClick={() => setAnimation({ loop: !animation.loop })}
            title={animation.loop ? 'Ripetizione continua attiva' : 'Ripetizione disattivata'}
            className={`rounded-md p-2 transition-colors border ${
              animation.loop
                ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Repeat className="h-4 w-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-0.5 rounded-lg bg-slate-950 p-0.5 border border-slate-800">
            {speeds.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => setAnimation({ speed: sp })}
                className={`rounded px-1.5 py-1 font-mono text-[11px] tabular-nums transition-colors ${
                  animation.speed === sp
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>
        </div>

        {/* Tasti Rapidi: Editor Azioni, Viewport Toggles, Esporta */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowActionEditor((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors border ${
              showActionEditor
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <span>Azioni Tattiche ({actions.length})</span>
          </button>

          <button
            type="button"
            onClick={toggleOnionSkin}
            title="Mostra la silhouette del frame precedente"
            className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors border ${
              onionSkinEnabled
                ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Onion</span>
          </button>

          <button
            type="button"
            onClick={toggleGhostTrails}
            title="Traccia le scie cinematiche"
            className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors border ${
              ghostTrailsEnabled
                ? 'bg-lime-500/15 text-lime-400 border-lime-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Trails</span>
          </button>

          <button
            type="button"
            onClick={() => {
              exportAnimationJSON(keyframes, actions);
              onNotify?.('Sequenza tattica esportata in JSON.');
            }}
            title="Esporta animazione e azioni in JSON portabile"
            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            <FileCode className="h-3.5 w-3.5 text-amber-400" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={() => {
              captureKeyframe();
              onNotify?.(`Nuovo Step ${keyframes.length + 1} catturato dalla lavagna.`);
            }}
            className="flex items-center gap-1.5 rounded-md border border-cyan-500/50 bg-cyan-500/15 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 transition-colors shadow-sm ml-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Cattura Step</span>
          </button>
        </div>
      </div>

      {/* RIGA 2: Playhead Scrubbing Bar Continua */}
      <div className="space-y-1">
        <input
          type="range"
          min="0"
          max={Math.max(1000, animation.totalDuration)}
          step="20"
          value={animation.currentTime}
          onChange={(e) => seekAnimation(Number(e.target.value))}
          className="w-full accent-cyan-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
        />
      </div>

      {/* RIGA 3: Step Chips (Keyframes di ancoraggio) */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mr-1">
          <Film className="h-3.5 w-3.5 text-cyan-400" />
          <span>Step ({keyframes.length}):</span>
        </div>

        {keyframes.map((kf, idx) => {
          const isCurrent = activeKeyframeIndex === idx;
          const kfTime = kf.timestamp ?? kf.timestampMs ?? 0;

          return (
            <div
              key={kf.id}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                isCurrent
                  ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200 font-semibold shadow-sm'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => applyKeyframeAtIndex(idx)}
                className="text-left flex items-center gap-1.5"
              >
                <span>{kf.label || `Step ${idx + 1}`}</span>
                <span className="font-mono text-[10px] text-slate-500">
                  {formatTime(kfTime)}
                </span>
              </button>

              {keyframes.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteKeyframe(kf.id);
                    onNotify?.(`Rimosso ${kf.label || `Step ${idx + 1}`}`);
                  }}
                  title={`Elimina ${kf.label || `Step ${idx + 1}`}`}
                  className="ml-1 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* RIGA 4: Pannello Espandibile Azioni Tattiche */}
      {showActionEditor && (
        <div className="pt-2 border-t border-slate-800">
          <ActionEditor
            onClose={() => setShowActionEditor(false)}
            onNotify={onNotify}
          />
        </div>
      )}
    </div>
  );
};
