import { Keyframe, TacticalAction } from '../core/types';

export interface TacticalAnimationExport {
  openCoreVersion: string;
  exportedAt: string;
  totalDurationMs: number;
  keyframes: Keyframe[];
  actions: TacticalAction[];
}

/**
 * Exports the keyframes and tactical actions as a portable JSON file.
 */
export function exportAnimationJSON(
  keyframes: Keyframe[],
  actions: TacticalAction[],
  filename = 'azione_tattica_cardine.json'
): void {
  const payload: TacticalAnimationExport = {
    openCoreVersion: '2.0.0-CARDINE-ANIMATION',
    exportedAt: new Date().toISOString(),
    totalDurationMs: keyframes.length === 0 ? 0 : Math.max(...keyframes.map((k) => k.timestamp ?? 0)),
    keyframes,
    actions,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports a canvas animation as a WebM video stream.
 */
export async function exportAnimationWebM(
  canvas: HTMLCanvasElement,
  durationMs: number,
  onProgress?: (pct: number) => void
): Promise<Blob | null> {
  if (!canvas || typeof (canvas as any).captureStream !== 'function') {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const stream = (canvas as any).captureStream(60);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };

      recorder.start();

      const startTime = performance.now();
      const interval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        onProgress?.(progress);

        if (elapsed >= durationMs) {
          clearInterval(interval);
          recorder.stop();
        }
      }, 100);
    } catch (err) {
      console.error('Errore durante export WebM:', err);
      resolve(null);
    }
  });
}
