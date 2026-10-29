import { create } from 'zustand';

interface HistoryState<T = unknown> {
  past: T[];
  future: T[];
  pushSnapshot: (snapshot: T) => void;
  popPast: (current: T) => T | null;
  popFuture: (current: T) => T | null;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  pushSnapshot: (snapshot) => {
    const cloned = JSON.parse(JSON.stringify(snapshot));
    set((state) => ({
      past: [...state.past.slice(-99), cloned],
      future: [],
    }));
  },
  popPast: (current) => {
    const { past, future } = get();
    if (past.length === 0) return null;
    const previous = past[past.length - 1];
    const clonedCurrent = JSON.parse(JSON.stringify(current));
    set({
      past: past.slice(0, -1),
      future: [clonedCurrent, ...future],
    });
    return previous as any;
  },
  popFuture: (current) => {
    const { past, future } = get();
    if (future.length === 0) return null;
    const next = future[0];
    const clonedCurrent = JSON.parse(JSON.stringify(current));
    set({
      past: [...past, clonedCurrent],
      future: future.slice(1),
    });
    return next as any;
  },
  clearHistory: () => set({ past: [], future: [] }),
}));

