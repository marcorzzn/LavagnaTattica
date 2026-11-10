import React from 'react';
import { TacticalPitchCanvas } from './TacticalPitchCanvas';
import { TimelineBar } from './TimelineBar';

/**
 * Lavagna animata: pedine, passi e riproduzione della sequenza.
 * È un'illustrazione disegnata a mano, non una simulazione: i movimenti non seguono un modello fisico.
 */
export const AnimatedBoardView: React.FC = () => {
  return (
    <div className="flex flex-col gap-3 w-full max-w-6xl mx-auto">
      <p className="text-xs text-zinc-400 px-1">
        Sposta le pedine, cattura i passi e riproduci la sequenza. È un&apos;illustrazione disegnata a mano: i
        movimenti non seguono un modello fisico.
      </p>

      <TacticalPitchCanvas />

      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
        <TimelineBar />
      </div>
    </div>
  );
};
