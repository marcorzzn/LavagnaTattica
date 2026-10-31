import { create } from 'zustand';
import {
  AnimationPlaybackState,
  BoardArrow,
  BoardNote,
  BoardPenStroke,
  BoardZone,
  FormationPreset,
  GameFormat,
  Keyframe,
  KeyframePlayer,
  KeyframeState,
  PlayerNode,
  TacticalAction,
  TacticalState,
} from '../core/types';
import { INITIAL_ABSTRACT_PLAYERS } from '../core/presets';
import { buildFormationPlayers } from '../core/formationPresets';
import { COACHING_STRATEGIES_CATALOG, CoachingStrategy } from '../core/tacticalStrategiesCatalog';
import { useHistoryStore } from './historyStore';
import { saveProjectToIdb } from '../lib/idb';
import {
  getKeyframeTimestamp,
  normalizeKeyframePlayers,
  interpolateAt,
} from '../engine/animationEngine';

export interface TeamBlockSliders {
  depth: number;  // 0..100 (50 neutral)
  width: number;  // 0..100 (50 neutral)
  shiftX: number; // 0..100 (50 neutral, Forward/Back)
  shiftY: number; // 0..100 (50 neutral, Left/Right)
}

interface StudioState {
  id: string;
  title: string;
  description: string;
  gameFormat: GameFormat;
  homeFormation: FormationPreset;
  awayFormation: FormationPreset;
  players: PlayerNode[];
  basePlayers: PlayerNode[];
  ball: { x: number; y: number };
  ballCarrierId: string | null;
  teamSliders: {
    home: TeamBlockSliders;
    away: TeamBlockSliders;
  };
  arrows: BoardArrow[];
  zones: BoardZone[];
  strokes: BoardPenStroke[];
  notes: BoardNote[];
  keyframes: Keyframe[];
  actions: TacticalAction[];
  activeKeyframeIndex: number;
  activeStrategyId: string | null;
  animation: AnimationPlaybackState;

  // Actions
  setGameFormat: (fmt: GameFormat) => void;
  setHomeFormation: (fmt: FormationPreset) => void;
  setAwayFormation: (fmt: FormationPreset) => void;
  movePlayer: (id: string, x: number, y: number, pushHistory?: boolean) => void;
  moveBall: (x: number, y: number, pushHistory?: boolean) => void;
  setBallCarrierId: (carrierId: string | null) => void;
  updateTeamSlider: (team: 'home' | 'away', param: keyof TeamBlockSliders, value: number) => void;
  resetTeamSliders: (team?: 'home' | 'away') => void;
  resetKickoff: () => void;
  resetPositions: () => void;
  addArrow: (arrow: Omit<BoardArrow, 'id'>) => void;
  addZone: (zone: Omit<BoardZone, 'id'>) => void;
  addStroke: (stroke: Omit<BoardPenStroke, 'id'>) => void;
  addNote: (note: Omit<BoardNote, 'id'>) => void;
  deleteElementById: (id: string) => void;
  clearCanvasDrawings: () => void;
  resetToInitialPreset: () => void;
  applyCoachingStrategy: (strategyId: string) => void;

  // Keyframe & Animation Actions (3-Level Engine)
  captureKeyframe: (label?: string) => void;
  applyKeyframeAtIndex: (index: number) => void;
  updateKeyframe: (id: string, patch: Partial<Keyframe>) => void;
  deleteKeyframe: (id: string) => void;
  addAction: (action: TacticalAction) => void;
  updateAction: (id: string, patch: Partial<TacticalAction>) => void;
  deleteAction: (id: string) => void;
  setAnimation: (patch: Partial<AnimationPlaybackState>) => void;
  seekAnimation: (currentTimeMs: number) => void;
  togglePlayAnimation: () => void;

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

function createInitialKeyframes(players: PlayerNode[], ball: { x: number; y: number }): Keyframe[] {
  const pList1: KeyframePlayer[] = players.map((p) => ({ id: p.id, x: p.x, y: p.y, visible: true }));
  const pList2: KeyframePlayer[] = players.map((p) => {
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
    return {
      id: p.id,
      x: Number(Math.max(4, Math.min(116, p.x + dx)).toFixed(1)),
      y: Number(Math.max(4, Math.min(76, p.y + dy)).toFixed(1)),
      visible: true,
    };
  });
  const pList3: KeyframePlayer[] = pList2.map((p) => ({
    id: p.id,
    x: Number(Math.max(4, Math.min(116, p.x + 5)).toFixed(1)),
    y: p.y,
    visible: true,
  }));

  return [
    {
      id: 'kf-1',
      timestamp: 0,
      timestampMs: 0,
      label: 'Step 1 · Costruzione Bassa',
      players: pList1,
      ball: { x: ball.x, y: ball.y, z: 0, carrierId: 'home-06' },
    },
    {
      id: 'kf-2',
      timestamp: 2000,
      timestampMs: 2000,
      label: 'Step 2 · Sviluppo Catena',
      players: pList2,
      ball: { x: 58, y: 22, z: 0, carrierId: 'home-10' },
    },
    {
      id: 'kf-3',
      timestamp: 4500,
      timestampMs: 4500,
      label: 'Step 3 · Rifinitura & Taglio',
      players: pList3,
      ball: { x: 92, y: 38, z: 0, carrierId: 'home-09' },
    },
  ];
}

function createInitialActions(): TacticalAction[] {
  return [
    {
      id: 'act-init-1',
      keyframeFrom: 'kf-1',
      keyframeTo: 'kf-2',
      type: 'pass_ground',
      playerId: 'home-06',
      targetPlayerId: 'home-10',
      params: {
        speedKmh: 58,
        heightCm: 0,
        curve: 0,
        contact: 'flat',
        duration: 2000,
      },
    },
    {
      id: 'act-init-2',
      keyframeFrom: 'kf-2',
      keyframeTo: 'kf-3',
      type: 'cross',
      playerId: 'home-10',
      targetPlayerId: 'home-09',
      params: {
        speedKmh: 72,
        heightCm: 240,
        curve: 0.4,
        contact: 'collar',
        duration: 2500,
      },
    },
  ];
}

const defaultStrategy = COACHING_STRATEGIES_CATALOG[0]; // Sarri catena sinistra

export const useStudioStore = create<StudioState>((set, get) => ({
  id: `openpitch-${defaultStrategy.id}`,
  title: `${defaultStrategy.name} · ${defaultStrategy.coach}`,
  description: defaultStrategy.description,
  gameFormat: '11v11',
  homeFormation: defaultStrategy.formation,
  awayFormation: defaultStrategy.opponentFormation,
  players: defaultStrategy.players,
  basePlayers: defaultStrategy.players,
  ball: defaultStrategy.ball,
  ballCarrierId: 'home-06',
  teamSliders: {
    home: { depth: 50, width: 50, shiftX: 50, shiftY: 50 },
    away: { depth: 50, width: 50, shiftX: 50, shiftY: 50 },
  },
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
  keyframes: createInitialKeyframes(defaultStrategy.players, defaultStrategy.ball),
  actions: createInitialActions(),
  activeKeyframeIndex: 0,
  activeStrategyId: defaultStrategy.id,
  animation: {
    playing: false,
    currentTime: 0,
    totalDuration: 4500,
    speed: 1,
    loop: true,
  },

  setGameFormat: (fmt) => {
    useHistoryStore.getState().pushSnapshot(get());
    set((state) => {
      let homeFmt: FormationPreset = '4-3-3';
      let awayFmt: FormationPreset = '4-4-2';
      if (fmt === '7v7') {
        homeFmt = '2-3-1';
        awayFmt = '2-3-1';
      } else if (fmt === '5v5') {
        homeFmt = '1-2-1';
        awayFmt = '1-2-1';
      }
      const homePl = buildFormationPlayers(homeFmt, 'home');
      const awayPl = buildFormationPlayers(awayFmt, 'away');
      const allPl = [...homePl, ...awayPl];
      const neutralSliders = {
        home: { depth: 50, width: 50, shiftX: 50, shiftY: 50 },
        away: { depth: 50, width: 50, shiftX: 50, shiftY: 50 },
      };
      const centerBall = { x: 60, y: 40 };
      const nextState = {
        ...state,
        gameFormat: fmt,
        homeFormation: homeFmt,
        awayFormation: awayFmt,
        players: allPl,
        basePlayers: allPl,
        ball: centerBall,
        ballCarrierId: null,
        teamSliders: neutralSliders,
        activeStrategyId: null,
      };
      scheduleAutosave(nextState);
      return nextState;
    });
  },

  setHomeFormation: (fmt) => {
    const newHome = buildFormationPlayers(fmt, 'home');
    set((state) => {
      const remainingAway = state.players.filter((p) => p.team === 'away');
      const updated = [...newHome, ...remainingAway];
      const updatedBase = [...newHome, ...state.basePlayers.filter((p) => p.team === 'away')];
      return { homeFormation: fmt, players: updated, basePlayers: updatedBase };
    });
  },

  setAwayFormation: (fmt) => {
    const newAway = buildFormationPlayers(fmt, 'away');
    set((state) => {
      const remainingHome = state.players.filter((p) => p.team === 'home');
      const updated = [...remainingHome, ...newAway];
      const updatedBase = [...state.basePlayers.filter((p) => p.team === 'home'), ...newAway];
      return { awayFormation: fmt, players: updated, basePlayers: updatedBase };
    });
  },

  setBallCarrierId: (carrierId) => {
    set((state) => {
      let nextBall = state.ball;
      if (carrierId) {
        const carrier = state.players.find((p) => p.id === carrierId);
        if (carrier) {
          const sign = carrier.team === 'away' ? -1.8 : 1.8;
          nextBall = {
            x: Number(Math.max(2, Math.min(118, carrier.x + sign)).toFixed(1)),
            y: carrier.y,
          };
        }
      }
      return { ballCarrierId: carrierId, ball: nextBall };
    });
  },

  updateTeamSlider: (team, param, value) => {
    set((state) => {
      const nextSliders = {
        ...state.teamSliders,
        [team]: {
          ...state.teamSliders[team],
          [param]: value,
        },
      };

      const teamSliders = nextSliders[team];
      const depthScale = 0.4 + (teamSliders.depth / 50) * 0.6; // 50 -> 1.0 (0.4 .. 1.6)
      const widthScale = 0.4 + (teamSliders.width / 50) * 0.6; // 50 -> 1.0 (0.4 .. 1.6)
      const forwardSign = team === 'home' ? 1 : -1;
      const deltaX = (teamSliders.shiftX - 50) * 0.55 * forwardSign;
      const deltaY = (teamSliders.shiftY - 50) * 0.45;

      const teamBasePlayers = state.basePlayers.filter((p) => p.team === team);
      const fieldBase = teamBasePlayers.filter((p) => p.positionGroup !== 'GK');
      const centroidX = fieldBase.length > 0 ? fieldBase.reduce((acc, p) => acc + p.x, 0) / fieldBase.length : 60;
      const centroidY = fieldBase.length > 0 ? fieldBase.reduce((acc, p) => acc + p.y, 0) / fieldBase.length : 40;

      const updatedPlayers = state.players.map((p) => {
        if (p.team !== team) return p;
        const base = state.basePlayers.find((bp) => bp.id === p.id) || p;
        if (p.positionGroup === 'GK') {
          return {
            ...p,
            x: Number(Math.max(3, Math.min(117, base.x + deltaX * 0.3)).toFixed(1)),
            y: Number(Math.max(20, Math.min(60, base.y + deltaY * 0.3)).toFixed(1)),
          };
        }
        const relX = base.x - centroidX;
        const relY = base.y - centroidY;
        const newX = Number(Math.max(4, Math.min(116, centroidX + relX * depthScale + deltaX)).toFixed(1));
        const newY = Number(Math.max(4, Math.min(76, centroidY + relY * widthScale + deltaY)).toFixed(1));
        return { ...p, x: newX, y: newY };
      });

      let nextBall = state.ball;
      if (state.ballCarrierId) {
        const carrier = updatedPlayers.find((p) => p.id === state.ballCarrierId);
        if (carrier && carrier.team === team) {
          nextBall = {
            x: Number((carrier.x + (carrier.team === 'home' ? 1.8 : -1.8)).toFixed(1)),
            y: carrier.y,
          };
        }
      }

      return {
        teamSliders: nextSliders,
        players: updatedPlayers,
        ball: nextBall,
      };
    });
  },

  resetTeamSliders: (team) => {
    set((state) => {
      const neutral = { depth: 50, width: 50, shiftX: 50, shiftY: 50 };
      const nextSliders = {
        home: !team || team === 'home' ? neutral : state.teamSliders.home,
        away: !team || team === 'away' ? neutral : state.teamSliders.away,
      };
      const restoredPlayers = state.players.map((p) => {
        if (team && p.team !== team) return p;
        const base = state.basePlayers.find((bp) => bp.id === p.id);
        return base ? { ...p, x: base.x, y: base.y } : p;
      });
      return {
        teamSliders: nextSliders,
        players: restoredPlayers,
      };
    });
  },

  resetKickoff: () => {
    useHistoryStore.getState().pushSnapshot(get());
    set((state) => {
      const centerBall = { x: 60, y: 40 };
      const neutralSliders = {
        home: { depth: 50, width: 50, shiftX: 50, shiftY: 50 },
        away: { depth: 50, width: 50, shiftX: 50, shiftY: 50 },
      };

      const kickoffPlayers = state.basePlayers.map((p) => {
        let x = p.x;
        let y = p.y;
        if (p.team === 'home') {
          if (p.role.includes('Boa') || p.role.includes('Mobile') || p.positionGroup === 'FWD') {
            x = Math.min(58.5, x);
          } else {
            x = Math.min(54, x);
          }
        } else {
          if (p.role.includes('Boa') || p.role.includes('Mobile') || p.positionGroup === 'FWD') {
            x = Math.max(61.5, x);
          } else {
            x = Math.max(66, x);
          }
        }
        return { ...p, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
      });

      const nextState = {
        ...state,
        players: kickoffPlayers,
        basePlayers: kickoffPlayers,
        ball: centerBall,
        ballCarrierId: null,
        teamSliders: neutralSliders,
      };
      scheduleAutosave(nextState);
      return nextState;
    });
  },

  resetPositions: () => {
    useHistoryStore.getState().pushSnapshot(get());
    set((state) => {
      const homePl = buildFormationPlayers(state.homeFormation, 'home');
      const awayPl = buildFormationPlayers(state.awayFormation, 'away');
      const allPl = [...homePl, ...awayPl];
      const neutralSliders = {
        home: { depth: 50, width: 50, shiftX: 50, shiftY: 50 },
        away: { depth: 50, width: 50, shiftX: 50, shiftY: 50 },
      };
      const centerBall = { x: 60, y: 40 };
      const nextState = {
        ...state,
        players: allPl,
        basePlayers: allPl,
        ball: centerBall,
        ballCarrierId: null,
        teamSliders: neutralSliders,
      };
      scheduleAutosave(nextState);
      return nextState;
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
      const updatedBase = state.basePlayers.map((p) =>
        p.id === id ? { ...p, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) } : p
      );

      // Se il giocatore spostato è il portatore di palla, la palla si sposta solidale con lui
      let nextBall = state.ball;
      if (state.ballCarrierId === id) {
        const p = state.players.find((pl) => pl.id === id);
        const sign = p?.team === 'away' ? -1.8 : 1.8;
        nextBall = {
          x: Number(Math.max(2, Math.min(118, x + sign)).toFixed(1)),
          y: Number(y.toFixed(1)),
        };
      }

      const nextState = { ...state, players: updatedPlayers, basePlayers: updatedBase, ball: nextBall };
      scheduleAutosave(nextState);
      return nextState;
    });
  },

  moveBall: (x, y, pushHistory = true) => {
    if (pushHistory) {
      useHistoryStore.getState().pushSnapshot(get());
    }
    set((state) => {
      const nextBall = { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
      
      // Controllo aggancio magnetico: se rilasciata entro 3.5m da un giocatore
      let newCarrierId = state.ballCarrierId;
      let closestPlayer: PlayerNode | null = null;
      let minDistance = 3.6;

      for (const p of state.players) {
        const d = Math.hypot(p.x - nextBall.x, p.y - nextBall.y);
        if (d < minDistance) {
          minDistance = d;
          closestPlayer = p;
        }
      }

      if (closestPlayer) {
        newCarrierId = closestPlayer.id;
        const sign = closestPlayer.team === 'away' ? -1.8 : 1.8;
        nextBall.x = Number(Math.max(2, Math.min(118, closestPlayer.x + sign)).toFixed(1));
        nextBall.y = closestPlayer.y;
      } else {
        // Se allontanato da tutti, perde possesso
        newCarrierId = null;
      }

      const nextState = { ...state, ball: nextBall, ballCarrierId: newCarrierId };
      scheduleAutosave(nextState);
      return { ball: nextBall, ballCarrierId: newCarrierId };
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
      basePlayers: strat.players,
      ball: strat.ball,
      ballCarrierId: null,
      teamSliders: {
        home: { depth: 50, width: 50, shiftX: 50, shiftY: 50 },
        away: { depth: 50, width: 50, shiftX: 50, shiftY: 50 },
      },
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
      const pList: KeyframePlayer[] = state.players.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        visible: true,
      }));
      const newIndex = state.keyframes.length + 1;
      const prevMaxTime =
        state.keyframes.length === 0
          ? 0
          : Math.max(...state.keyframes.map(getKeyframeTimestamp));
      const nextTime = state.keyframes.length === 0 ? 0 : prevMaxTime + 2000;
      const kf: Keyframe = {
        id: `kf-${Date.now()}`,
        timestamp: nextTime,
        timestampMs: nextTime,
        label: label || `Step ${newIndex}`,
        players: pList,
        ball: {
          x: state.ball.x,
          y: state.ball.y,
          z: 0,
          carrierId: state.ballCarrierId,
        },
      };
      const updated = [...state.keyframes, kf];
      return {
        keyframes: updated,
        activeKeyframeIndex: updated.length - 1,
        animation: {
          ...state.animation,
          currentTime: nextTime,
          totalDuration: Math.max(1000, nextTime),
        },
      };
    });
    scheduleAutosave(get());
  },

  applyKeyframeAtIndex: (index) => {
    const { keyframes, players, animation } = get();
    if (index < 0 || index >= keyframes.length) return;
    const target = keyframes[index];
    const pMap = normalizeKeyframePlayers(target.players);
    const kfTime = getKeyframeTimestamp(target);

    set({
      activeKeyframeIndex: index,
      ball: { x: target.ball.x, y: target.ball.y },
      ballCarrierId: target.ball.carrierId ?? null,
      players: players.map((p) => {
        const pos = pMap.get(p.id);
        return pos ? { ...p, x: pos.x, y: pos.y } : p;
      }),
      animation: {
        ...animation,
        currentTime: kfTime,
      },
    });
  },

  updateKeyframe: (id, patch) => {
    set((state) => {
      const updated = state.keyframes.map((k) => (k.id === id ? { ...k, ...patch } : k));
      const maxTime = Math.max(1000, ...updated.map(getKeyframeTimestamp));
      return {
        keyframes: updated,
        animation: {
          ...state.animation,
          totalDuration: maxTime,
        },
      };
    });
    scheduleAutosave(get());
  },

  deleteKeyframe: (id) => {
    set((state) => {
      if (state.keyframes.length <= 1) return state;
      const filtered = state.keyframes.filter((k) => k.id !== id);
      const filteredActions = state.actions.filter(
        (a) => a.keyframeFrom !== id && a.keyframeTo !== id
      );
      const maxTime = Math.max(1000, ...filtered.map(getKeyframeTimestamp));
      return {
        keyframes: filtered,
        actions: filteredActions,
        activeKeyframeIndex: Math.min(state.activeKeyframeIndex, filtered.length - 1),
        animation: {
          ...state.animation,
          totalDuration: maxTime,
          currentTime: Math.min(state.animation.currentTime, maxTime),
        },
      };
    });
    scheduleAutosave(get());
  },

  addAction: (action) => {
    set((state) => ({
      actions: [...state.actions.filter((a) => a.id !== action.id), action],
    }));
    scheduleAutosave(get());
  },

  updateAction: (id, patch) => {
    set((state) => ({
      actions: state.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
    scheduleAutosave(get());
  },

  deleteAction: (id) => {
    set((state) => ({
      actions: state.actions.filter((a) => a.id !== id),
    }));
    scheduleAutosave(get());
  },

  setAnimation: (patch) => {
    set((state) => ({
      animation: { ...state.animation, ...patch },
    }));
  },

  seekAnimation: (currentTimeMs) => {
    const { keyframes, actions, animation, players } = get();
    const clampedTime = Math.max(0, Math.min(animation.totalDuration, currentTimeMs));
    const interpolated = interpolateAt(keyframes, clampedTime, actions);

    set({
      animation: {
        ...animation,
        currentTime: clampedTime,
      },
      ball: { x: interpolated.ball.x, y: interpolated.ball.y },
      ballCarrierId: interpolated.ball.carrierId,
      players: players.map((p) => {
        const nextPos = interpolated.players.get(p.id);
        return nextPos ? { ...p, x: nextPos.x, y: nextPos.y } : p;
      }),
    });
  },

  togglePlayAnimation: () => {
    const { animation } = get();
    if (!animation.playing && animation.currentTime >= animation.totalDuration) {
      set({
        animation: {
          ...animation,
          playing: true,
          currentTime: 0,
        },
      });
    } else {
      set({
        animation: {
          ...animation,
          playing: !animation.playing,
        },
      });
    }
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
