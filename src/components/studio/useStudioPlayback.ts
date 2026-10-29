import { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '../../stores/studioStore';

export type PlaybackSpeed = 0.5 | 1 | 1.5 | 2;

export function useStudioPlayback() {
  const keyframes = useStudioStore((s) => s.keyframes);
  const activeKeyframeIndex = useStudioStore((s) => s.activeKeyframeIndex);
  const applyKeyframeAtIndex = useStudioStore((s) => s.applyKeyframeAtIndex);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying || keyframes.length < 2) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const segmentDurationMs = 1800 / speed;
    const totalSegments = keyframes.length - 1;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const totalDuration = segmentDurationMs * totalSegments;
      const normalizedTotal = Math.min(1, elapsed / totalDuration);

      const exactSegment = normalizedTotal * totalSegments;
      const segIdx = Math.min(totalSegments - 1, Math.floor(exactSegment));
      const t = exactSegment - segIdx;
      // Smooth cubic ease-in-out
      const easedT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const kfStart = keyframes[segIdx];
      const kfEnd = keyframes[segIdx + 1];

      if (kfStart && kfEnd) {
        useStudioStore.setState((state) => ({
          activeKeyframeIndex: segIdx,
          ball: {
            x: Number((kfStart.ball.x + (kfEnd.ball.x - kfStart.ball.x) * easedT).toFixed(2)),
            y: Number((kfStart.ball.y + (kfEnd.ball.y - kfStart.ball.y) * easedT).toFixed(2)),
          },
          players: state.players.map((p) => {
            const p0 = kfStart.players[p.id];
            const p1 = kfEnd.players[p.id];
            if (!p0 || !p1) return p;
            return {
              ...p,
              x: Number((p0.x + (p1.x - p0.x) * easedT).toFixed(2)),
              y: Number((p0.y + (p1.y - p0.y) * easedT).toFixed(2)),
            };
          }),
        }));
      }

      setProgress(normalizedTotal);

      if (normalizedTotal < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        startTimeRef.current = null;
        applyKeyframeAtIndex(keyframes.length - 1);
      }
    };

    startTimeRef.current = null;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed, keyframes, applyKeyframeAtIndex]);

  const togglePlay = () => {
    if (keyframes.length < 2) return;
    if (!isPlaying && activeKeyframeIndex === keyframes.length - 1) {
      applyKeyframeAtIndex(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const stepForward = () => {
    setIsPlaying(false);
    const next = Math.min(keyframes.length - 1, activeKeyframeIndex + 1);
    applyKeyframeAtIndex(next);
  };

  const stepBackward = () => {
    setIsPlaying(false);
    const prev = Math.max(0, activeKeyframeIndex - 1);
    applyKeyframeAtIndex(prev);
  };

  return {
    isPlaying,
    speed,
    progress,
    setSpeed,
    togglePlay,
    stepForward,
    stepBackward,
  };
}

