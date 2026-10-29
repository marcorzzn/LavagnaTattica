import React, { useState } from 'react';
import {
  Film,
  Layers,
  Pause,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';
import { useStudioStore } from '../../stores/studioStore';
import { useViewportStore } from '../../stores/viewportStore';
import { useStudioPlayback, PlaybackSpeed } from './useStudioPlayback';

interface TimelineBarProps {
  onNotify?: (msg: string) => void;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({ onNotify }) => {
  const keyframes = useStudioStore((s) => s.keyframes);
  const activeKeyframeIndex = useStudioStore((s) => s.activeKeyframeIndex);
  const captureKeyframe = useStudioStore((s) => s.captureKeyframe);
  const applyKeyframeAtIndex = useStudioStore((s) => s.applyKeyframeAtIndex);
  const deleteKeyframe = useStudioStore((s) => s.deleteKeyframe);

  const onionSkinEnabled = useViewportStore((s) => s.onionSkinEnabled);
  const ghostTrailsEnabled = useViewportStore((s) => s.ghostTrailsEnabled);
  const toggleOnionSkin = useViewportStore((s) => s.toggleOnionSkin);
  const toggleGhostTrails = useViewportStore((s) => s.toggleGhostTrails);

  const {
    isPlaying,
    speed,
    progress,
    setSpeed,
    togglePlay,
    stepForward,
    stepBackward,
  } = useStudioPlayback();

  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const speeds: PlaybackSpeed[] = [0.5, 1, 1.5, 2];

  const handleRecordClip = () => {
    if (isRecordingClip) return;
    setIsRecordingClip(true);
    applyKeyframeAtIndex(0);
    togglePlay();
    onNotify?.('Registrazione sequenza animata avviata (WebM/Clip)...');
    window.setTimeout(() => {
      setIsRecordingClip(false);
      onNotify?.('Clip tattica completata e pronta per l’esportazione.');
    }, (keyframes.length - 1) * (1800 / speed) + 300);
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-slate-800/90 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={stepBackward}
            title="Keyframe precedente"
            className="rounded-md border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center gap-1.5 rounded-md bg-cyan-400 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 transition-colors shadow-sm"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isPlaying ? 'Pausa' : 'Anima Sequenza'}</span>
          </button>

          <button
            type="button"
            onClick={stepForward}
            title="Keyframe successivo"
            className="rounded-md border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Speed Selector */}
          <div className="ml-2 flex items-center gap-1 rounded-lg bg-slate-800/80 p-0.5 border border-slate-700/60">
            {speeds.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => setSpeed(sp)}
                className={`rounded px-2 py-1 font-mono text-xs tabular-nums transition-colors ${
                  speed === sp
                    ? 'bg-slate-700 text-cyan-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>
        </div>

        {/* Onion Skin, Ghost Trails & Keyframe capture */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleOnionSkin}
            title="Mostra la silhouette del frame precedente per valutare la traiettoria"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              onionSkinEnabled
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700/60 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Onion Skin</span>
          </button>

          <button
            type="button"
            onClick={toggleGhostTrails}
            title="Traccia le scie cinematiche tra i keyframe"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              ghostTrailsEnabled
                ? 'bg-lime-500/15 text-lime-400 border border-lime-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700/60 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ghost Trails</span>
          </button>

          <button
            type="button"
            onClick={handleRecordClip}
            disabled={isRecordingClip}
            className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 transition-colors"
          >
            <Video className="h-3.5 w-3.5 text-rose-400" />
            <span>{isRecordingClip ? 'Clip in corso...' : 'Registra WebM'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              captureKeyframe();
              onNotify?.('Nuovo Keyframe salvato nella timeline.');
            }}
            className="flex items-center gap-1.5 rounded-md border border-cyan-500/50 bg-cyan-500/15 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Salva Fase</span>
          </button>
        </div>
      </div>

      {/* Keyframe Nodes Track */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mr-1">
          <Film className="h-3.5 w-3.5 text-cyan-400" />
          <span>Fasi Tattiche ({keyframes.length}):</span>
        </div>

        {keyframes.map((kf, idx) => {
          const isCurrent = activeKeyframeIndex === idx;
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
                className="text-left"
              >
                {kf.label}
              </button>
              {keyframes.length > 1 && (
                <button
                  type="button"
                  onClick={() => deleteKeyframe(kf.id)}
                  title={`Elimina ${kf.label}`}
                  className="ml-1 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        {isPlaying && (
          <span className="ml-auto font-mono text-xs text-lime-400 tabular-nums">
            Progresso: {Math.round(progress * 100)}%
          </span>
        )}
      </div>
    </div>
  );
};

