import { create } from 'zustand';
import { TacticalTheme } from '../core/types';

interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  gridVisible: boolean;
  halfSpacesVisible: boolean;
  snapEnabled: boolean;
  blindMode: boolean; // Nasconde nomi/ruoli per esercizi tattici (Lavagna Cieca)
  showHomeTeam: boolean;
  showAwayTeam: boolean;
  onionSkinEnabled: boolean;
  ghostTrailsEnabled: boolean;
  theme: TacticalTheme;
  tokenScale: number;
  colorblindSafe: boolean;
  setZoom: (zoom: number) => void;
  resetViewport: () => void;
  toggleGrid: () => void;
  toggleHalfSpaces: () => void;
  toggleSnap: () => void;
  toggleBlindMode: () => void;
  toggleHomeTeam: () => void;
  toggleAwayTeam: () => void;
  toggleOnionSkin: () => void;
  toggleGhostTrails: () => void;
  setTheme: (theme: TacticalTheme) => void;
  setTokenScale: (scale: number) => void;
  toggleColorblindSafe: () => void;
}

export const useViewportStore = create<ViewportState>((set) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  gridVisible: true,
  halfSpacesVisible: true,
  snapEnabled: true,
  blindMode: false,
  showHomeTeam: true,
  showAwayTeam: true,
  onionSkinEnabled: true,
  ghostTrailsEnabled: true,
  theme: 'grass_cream',
  tokenScale: 1.0,
  colorblindSafe: false,
  setZoom: (zoom) => set({ zoom: Math.max(0.75, Math.min(2.0, Number(zoom.toFixed(2)))) }),
  resetViewport: () => set({ zoom: 1, panX: 0, panY: 0 }),
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
  toggleHalfSpaces: () => set((s) => ({ halfSpacesVisible: !s.halfSpacesVisible })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  toggleBlindMode: () => set((s) => ({ blindMode: !s.blindMode })),
  toggleHomeTeam: () => set((s) => ({ showHomeTeam: !s.showHomeTeam })),
  toggleAwayTeam: () => set((s) => ({ showAwayTeam: !s.showAwayTeam })),
  toggleOnionSkin: () => set((s) => ({ onionSkinEnabled: !s.onionSkinEnabled })),
  toggleGhostTrails: () => set((s) => ({ ghostTrailsEnabled: !s.ghostTrailsEnabled })),
  setTheme: (theme) => set({ theme }),
  setTokenScale: (tokenScale) => set({ tokenScale }),
  toggleColorblindSafe: () => set((s) => ({ colorblindSafe: !s.colorblindSafe })),
}));

