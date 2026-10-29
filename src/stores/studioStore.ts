import { create } from 'zustand';
import {
  BoardArrow,
  BoardNote,
  BoardPenStroke,
  BoardZone,
  FormationPreset,
  KeyframeState,
  PlayerNode,
  TacticalState,
} from '../core/types';
import { INITIAL_ABSTRACT_PLAYERS } from '../core/presets';
import { buildFormationPlayers } from '../core/formationPresets';
import { COACHING_STRATEGIES_CATALOG, CoachingStrategy } from '../core/tacticalStrategiesCatalog';
import { useHistoryStore } from './historyStore';
import { saveProjectToIdb } from '../lib/idb';

interface StudioState {
  id: string;
  title: string;
  description: string;
  homeFormation: FormationPreset;
  awayFormation: FormationPreset;
  players: PlayerNode[];
  ball: { x: number; y: number };
  arrows: BoardArrow[];
  zones: BoardZone[];
  strokes: BoardPenStroke[];
  notes: BoardNote[];
  keyframes: KeyframeState[];
  activeKeyframeIndex: number;
  activeStrategyId: string | null;

  // Actions
  setHomeFormation: (fmt: FormationPreset) => void;
  setAwayFormation: (fmt: FormationPreset) => void;
  movePlayer: (id: string, x: number, y: number, pushHistory?: boolean) => void;
  moveBall: (x: number, y: number, pushHistory?: boolean) => void;
  addArrow: (arrow: Omit<BoardArrow, 'id'>) => void;
  addZone: (zone: Omit<BoardZone, 'id'>) => void;
  addStroke: (stroke: Omit<BoardPenStroke, 'id'>) => void;
  addNote: (note: Omit<BoardNote, 'id'>) => void;
  deleteElementById: (id: string) => void;
  clearCanvasDrawings: () => void;
  resetToInitialPreset: () => void;
  applyCoachingStrategy: (strategyId: string) => void;

  // Keyframe Actions
  captureKeyframe: (label?: string) => void;
  applyKeyframeAtIndex: (index: number) => void;
  deleteKeyframe: (id: string) => void;

  // Export current TacticalState for OpenPitch Math Engine
  getTacticalState: () => TacticalState;
}

let saveTimer: any = null;
function scheduleAutosave(state: any) {
  if (typeof window === 'undefined') return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveProjectToIdb({
      id: state.id,
      title: state.title,
      description: state.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        players: state.players,
        ball: state.ball,
        arrows: state.arrows,
        zones: state.zones,
        notes: state.notes,
        keyframes: state.keyframes,
      },
    });
  }, 1500);
}

function createInitialKeyframes(players: PlayerNode[], ball: { x: number; y: number }): KeyframeState[] {
  const pMap1: Record<string, { x: number; y: number }> = {};
  const pMap2: Record<string, { x: number; y: number }> = {};
  const pMap3: Record<string, { x: number; y: number }> = {};

  for (const p of players) {
    pMap1[p.id] = { x: p.x, y: p.y };

    // Keyframe 2: Avanzamento di catena
    let dx = 0;
    let dy = 0;
    if (p.team === 'home') {
      if (p.positionGroup === 'FWD') { dx = 8; dy = p.y < 40 ? 3 : -3; }
      else if (p.positionGroup === 'MID') { dx = 6; dy = 0; }
      else if (p.positionGroup === 'DEF') { dx = 4; }
    } else {
      if (p.positionGroup === 'DEF') { dx = 3; }
      else { dx = 2; }
    }
    pMap2[p.id] = {
      x: Number(Math.max(4, Math.min(116, p.x + dx)).toFixed(1)),
      y: Number(Math.max(4, Math.min(76, p.y + dy)).toFixed(1)),
    };

    // Keyframe 3: Attacco area di rigore e rifinitura
    pMap3[p.id] = {
      x: Number(Math.max(4, Math.min(116, pMap2[p.id].x + (p.team === 'home' ? 5 : 2))).toFixed(1)),
      y: pMap2[p.id].y,
    };
  }

  return [
    {
      id: 'kf-1',
      timestampMs: 0,
      label: 'Fase 1 · Costruzione Bassa',
      players: pMap1,
      ball: { x: ball.x, y: ball.y },
    },
    {
      id: 'kf-2',
      timestampMs: 1500,
      label: 'Fase 2 · Progressione Half-Space',
      players: pMap2,
      ball: { x: ball.x + 18, y: ball.y - 10 },
    },
    {
      id: 'kf-3',
      timestampMs: 3000,
      label: 'Fase 3 · Rifinitura & Zona Goal',
      players: pMap3,
      ball: { x: ball.x + 38, y: 40 },
    },
  ];
}

const defaultStrategy = COACHING_STRATEGIES_CATALOG[0]; // Sarri catena sinistra

export const useStudioStore = create<StudioState>((set, get) => ({
  id: `openpitch-${defaultStrategy.id}`,
  title: `${defaultStrategy.name} · ${defaultStrategy.coach}`,
  description: defaultStrategy.description,
  homeFormation: defaultStrategy.formation,
  awayFormation: defaultStrategy.opponentFormation,
  players: defaultStrategy.players,
  ball: defaultStrategy.ball,
  arrows: defaultStrategy.arrows,
  zones: defaultStrategy.zones,
  strokes: [],
  notes: [
    {
      id: 'note-init',
      x: 52,
      y: 72,
      text: `Dottrina: ${defaultStrategy.coach} (${defaultStrategy.school})`,
      color: '#00E5FF',
    },
  ],
  keyframes: defaultStrategy.keyframes.map((kf) => {
    const pMap: Record<string, { x: number; y: number }> = {};
    for (const p of defaultStrategy.players) {
      pMap[p.id] = { x: p.x, y: p.y };
    }
    return {
      ...kf,
      players: Object.keys(kf.players).length > 0 ? kf.players : pMap,
    };
  }),
  activeKeyframeIndex: 0,
  activeStrategyId: defaultStrategy.id,

  setHomeFormation: (fmt) => {
    const newHome = buildFormationPlayers(fmt, 'home');
    set((state) => {
      const remainingAway = state.players.filter((p) => p.team === 'away');
      const updated = [...newHome, ...remainingAway];
      return { homeFormation: fmt, players: updated };
    });
  },

  setAwayFormation: (fmt) => {
    const newAway = buildFormationPlayers(fmt, 'away');
    set((state) => {
      const remainingHome = state.players.filter((p) => p.team === 'home');
      const updated = [...remainingHome, ...newAway];
      return { awayFormation: fmt, players: updated };
    });
  },

  movePlayer: (id, x, y, pushHistory = true) => {
    if (pushHistory) {
      useHistoryStore.getState().pushSnapshot(get());
    }
    set((state) => {
      const updatedPlayers = state.players.map((p) =>
        p.id === id ? { ...p, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) } : p
      );
      const nextState = { ...state, players: updatedPlayers };
      scheduleAutosave(nextState);
      return { players: updatedPlayers };
    });
  },

  moveBall: (x, y, pushHistory = true) => {
    if (pushHistory) {
      useHistoryStore.getState().pushSnapshot(get());
    }
    set((state) => {
      const nextBall = { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
      const nextState = { ...state, ball: nextBall };
      scheduleAutosave(nextState);
      return { ball: nextBall };
    });
  },

  addArrow: (arrow) => {
    useHistoryStore.getState().pushSnapshot(get());
    set((state) => ({
      arrows: [...state.arrows, { ...arrow, id: `arr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }],
    }));
  },

  addZone: (zone) => {
    useHistoryStore.getState().pushSnapshot(get());
    set((state) => ({
      zones: [...state.zones, { ...zone, id: `zone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }],
    }));
  },

  addStroke: (stroke) => {
    useHistoryStore.getState().pushSnapshot(get());
    set((state) => ({
      strokes: [...state.strokes, { ...stroke, id: `strk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }],
    }));
  },

  addNote: (note) => {
    useHistoryStore.getState().pushSnapshot(get());
    set((state) => ({
      notes: [...state.notes, { ...note, id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }],
    }));
  },

  deleteElementById: (id) => {
    useHistoryStore.getState().pushSnapshot(get());
    set((state) => ({
      arrows: state.arrows.filter((a) => a.id !== id),
      zones: state.zones.filter((z) => z.id !== id),
      strokes: state.strokes.filter((s) => s.id !== id),
      notes: state.notes.filter((n) => n.id !== id),
    }));
  },

  clearCanvasDrawings: () => {
    useHistoryStore.getState().pushSnapshot(get());
    set({ arrows: [], zones: [], strokes: [], notes: [] });
  },

  resetToInitialPreset: () => {
    useHistoryStore.getState().pushSnapshot(get());
    set({
      players: INITIAL_ABSTRACT_PLAYERS,
      ball: { x: 27, y: 40 },
      keyframes: createInitialKeyframes(INITIAL_ABSTRACT_PLAYERS, { x: 27, y: 40 }),
      activeKeyframeIndex: 0,
      activeStrategyId: null,
    });
  },

  applyCoachingStrategy: (strategyId) => {
    const strat = COACHING_STRATEGIES_CATALOG.find((s) => s.id === strategyId);
    if (!strat) return;
    useHistoryStore.getState().pushSnapshot(get());

    const pMapBase: Record<string, { x: number; y: number }> = {};
    for (const p of strat.players) {
      pMapBase[p.id] = { x: p.x, y: p.y };
    }

    const populatedKeyframes = strat.keyframes.map((kf, idx) => {
      // In base alla fase del keyframe, calcola lo spostamento dinamico dei giocatori della catena
      const kfMap: Record<string, { x: number; y: number }> = {};
      for (const p of strat.players) {
        let dx = 0;
        let dy = 0;
        if (idx === 1) {
          if (p.team === 'home' && (p.role.includes('Fluidificante') || p.role.includes('Invertita') || p.role.includes('Inserimento'))) {
            dx = 12;
            dy = p.y < 40 ? -4 : 4;
          }
        } else if (idx === 2) {
          if (p.team === 'home' && (p.role.includes('Boa') || p.role.includes('Inserimento') || p.role.includes('Invertita'))) {
            dx = 18;
          }
        }
        kfMap[p.id] = {
          x: Number(Math.max(4, Math.min(116, p.x + dx)).toFixed(1)),
          y: Number(Math.max(4, Math.min(76, p.y + dy)).toFixed(1)),
        };
      }
      return {
        ...kf,
        players: kfMap,
      };
    });

    set({
      id: `session-${strat.id}`,
      title: `${strat.name} · ${strat.coach}`,
      description: strat.description,
      homeFormation: strat.formation,
      awayFormation: strat.opponentFormation,
      players: strat.players,
      ball: strat.ball,
      arrows: strat.arrows,
      zones: strat.zones,
      strokes: [],
      notes: [
        {
          id: `note-${strat.id}`,
          x: 48,
          y: 72,
          text: `Filosofia: ${strat.coach} (${strat.school})`,
          color: '#00E5FF',
        },
      ],
      keyframes: populatedKeyframes,
      activeKeyframeIndex: 0,
      activeStrategyId: strat.id,
    });
    scheduleAutosave(get());
  },

  captureKeyframe: (label) => {
    set((state) => {
      const pMap: Record<string, { x: number; y: number }> = {};
      for (const p of state.players) {
        pMap[p.id] = { x: p.x, y: p.y };
      }
      const newIndex = state.keyframes.length + 1;
      const kf: KeyframeState = {
        id: `kf-${Date.now()}`,
        timestampMs: state.keyframes.length * 1500,
        label: label || `Fase ${newIndex}`,
        players: pMap,
        ball: { x: state.ball.x, y: state.ball.y },
      };
      return {
        keyframes: [...state.keyframes, kf],
        activeKeyframeIndex: state.keyframes.length,
      };
    });
  },

  applyKeyframeAtIndex: (index) => {
    const { keyframes, players } = get();
    if (index < 0 || index >= keyframes.length) return;
    const target = keyframes[index];
    set({
      activeKeyframeIndex: index,
      ball: { ...target.ball },
      players: players.map((p) => {
        const pos = target.players[p.id];
        return pos ? { ...p, x: pos.x, y: pos.y } : p;
      }),
    });
  },

  deleteKeyframe: (id) => {
    set((state) => {
      if (state.keyframes.length <= 1) return state;
      const filtered = state.keyframes.filter((k) => k.id !== id);
      return {
        keyframes: filtered,
        activeKeyframeIndex: Math.min(state.activeKeyframeIndex, filtered.length - 1),
      };
    });
  },

  getTacticalState: (): TacticalState => {
    const s = get();
    return {
      matchId: s.id,
      title: s.title,
      competition: 'Corpus Dottrinale Strategie Allenatori & Filosofie Tattiche',
      season: '2026/2027',
      date: '2026-10-29',
      homeTeam: `Squadra (${s.title.split(' · ')[1] || 'Tattica'})`,
      awayTeam: 'Squadra Avversaria (Blocco Tattico)',
      homeFormation: s.homeFormation,
      awayFormation: s.awayFormation,
      formationSource: 'declared',
      phase: 'progression',
      minute: 27,
      ballX: s.ball.x,
      ballY: s.ball.y,
      ballZ: 0,
      players: s.players,
      passEdges: [],
      events: [],
    };
  },
}));
