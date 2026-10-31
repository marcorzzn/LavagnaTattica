import { useEffect, useRef } from 'react';
import { useStudioStore } from '../stores/studioStore';

/**
 * Hook that manages the smooth 60 FPS requestAnimationFrame playback loop
 * for the 3-level tactical animation engine.
 */
export function useAnimationPlayback() {
  const animation = useStudioStore((s) => s.animation);
  const setAnimation = useStudioStore((s) => s.setAnimation);
  const seekAnimation = useStudioStore((s) => s.seekAnimation);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animation.playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const dt = (now - lastTimeRef.current) * animation.speed;
      lastTimeRef.current = now;

      let next = animation.currentTime + dt;
      if (next >= animation.totalDuration) {
        if (animation.loop) {
          next = 0;
        } else {
          setAnimation({ playing: false, currentTime: animation.totalDuration });
          seekAnimation(animation.totalDuration);
          lastTimeRef.current = null;
          return;
        }
      }

      seekAnimation(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animation.playing, animation.speed, animation.loop, animation.totalDuration, seekAnimation, setAnimation]);
}

