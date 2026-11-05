import { create } from 'zustand';
import {
  AnimationPlaybackState,
  BoardArrow,
  BoardNote,
  BoardPenStroke,
  BoardZone,
  CalibrationKeypoint,
  FormationPreset,
  GameFormat,
  Keyframe,
  KeyframePlayer,
  KeyframeState,
  PlayerNode,
  TacticalAction,
  TacticalState,
  TacticalTag,
  TagCategory,
} from '../core/types';
import { CANONICAL_TACTICAL_TAGS } from '../core/tacticalTagPresets';
import { INITIAL_ABSTRACT_PLAYERS, PLAYER_ARCHETYPES_30 } from '../core/presets';
import { buildFormationPlayers } from '../core/formationPresets';
import { COACHING_STRATEGIES_CATALOG, CoachingStrategy } from '../core/tacticalStrategiesCatalog';
import { useHistoryStore } from './historyStore';
import { saveProjectToIdb } from '../lib/idb';
import {
  getKeyframeTimestamp,
  normalizeKeyframePlayers,
  interpolateAt,
} from '../engine/animationEngine';
import { evaluateTacticalState } from '../engine/mathEngine';

export interface TeamBlockSliders {
  depth: number;  // 0..100 (50 neutral)
  width: number;  // 0..100 (50 neutral)
  shiftX: number; // 0..100 (50 neutral, Forward/Back)
  shiftY: number; // 0..100 (50 neutral, Left/Right)
}

export const DEFAULT_CALIBRATION_KEYPOINTS: CalibrationKeypoint[] = [
  { id: 'kp-1', label: 'Angolo Sup SX (18m, 14m)', imageU: 0.16, imageV: 0.22, pitchX: 18, pitchY: 14 },
  { id: 'kp-2', label: 'Angolo Inf SX (18m, 66m)', imageU: 0.06, imageV: 0.88, pitchX: 18, pitchY: 66 },
  { id: 'kp-3', label: 'Angolo Sup DX (96m, 14m)', imageU: 0.84, imageV: 0.22, pitchX: 96, pitchY: 14 },
  { id: 'kp-4', label: 'Angolo Inf DX (96m, 66m)', imageU: 0.94, imageV: 0.88, pitchX: 96, pitchY: 66 },
];

export interface TacticalScene {
  id: string;
  name: string;
  frameImageUrl: string | null;
  frameMediaName: string;
  perspectiveType: 'Broadcast' | 'Tactical High / Drone' | 'Goal-Line / Set-Piece';
  keypoints: CalibrationKeypoint[];
  players: PlayerNode[];
  ball: { x: number; y: number };
  matchContextNote: string;
  createdAt: string;
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
  tags: TacticalTag[];
  activeTagId: string | null;

  // Multi-frame Dossier & Scene Management
  scenes: TacticalScene[];
  activeSceneId: string;
  analyzingTeam: 'home' | 'away';
  attackDirection: 'right' | 'left';
  currentUploadedFrameUrl: string | null;
  currentUploadedMediaName: string;
  currentKeypoints: CalibrationKeypoint[];
  matchContextNote: string;

  // Actions
  addPlayer: (team: 'home' | 'away', custom?: Partial<PlayerNode>) => PlayerNode;
  removePlayer: (id: string) => void;
  updatePlayer: (id: string, updates: Partial<PlayerNode>) => void;
  setAnalyzingTeam: (team: 'home' | 'away') => void;
  setAttackDirection: (dir: 'right' | 'left') => void;
  setUploadedFrame: (url: string | null, name?: string) => void;
  setKeypoints: (kps: CalibrationKeypoint[]) => void;
  setMatchContextNote: (note: string) => void;
  addScene: (name?: string) => string;
  switchScene: (sceneId: string) => void;
  deleteScene: (sceneId: string) => void;
  exportProjectJson: () => string;
  importProjectJson: (jsonStr: string) => boolean;

  addTacticalTag: (tag: TacticalTag) => void;
  setActiveTag: (tagId: string | null) => void;
  loadTagScenario: (tagId: string) => void;
  createTagFromCurrentBoard: (customTitle?: string) => TacticalTag;
  setGameFormat: (fmt: GameFormat) => void;
  setHomeFormation: (fmt: FormationPreset) => void;
  setAwayFormation: (fmt: FormationPreset) => void;
  updatePlayerArchetype: (playerId: string, archetypeId: number) => void;
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

  // Export current TacticalState for NucleoTattico Math Engine
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
        scenes: state.scenes,
        activeSceneId: state.activeSceneId,
        matchContextNote: state.matchContextNote,
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
  id: `lavagnatattica-${defaultStrategy.id}`,
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
  tags: CANONICAL_TACTICAL_TAGS,
  activeTagId: null,

  // Multi-frame Dossier & Scene Management
  scenes: [
    {
      id: 'scene-1',
      name: 'Scena 1 · Costruzione',
      frameImageUrl: null,
      frameMediaName: '',
      perspectiveType: 'Broadcast',
      keypoints: DEFAULT_CALIBRATION_KEYPOINTS,
      players: defaultStrategy.players,
      ball: defaultStrategy.ball,
      matchContextNote: 'Transizione offensiva · Minuto 75 · Punteggio 1-0',
      createdAt: new Date().toISOString(),
    },
  ],
  activeSceneId: 'scene-1',
  analyzingTeam: 'home',
  attackDirection: 'right',
  currentUploadedFrameUrl: null,
  currentUploadedMediaName: '',
  currentKeypoints: DEFAULT_CALIBRATION_KEYPOINTS,
  matchContextNote: 'Transizione offensiva · Minuto 75 · Punteggio 1-0',

  addPlayer: (team: 'home' | 'away', custom?: Partial<PlayerNode>) => {
    const s = get();
    const teamPlayers = s.players.filter((p) => p.team === team);
    if (teamPlayers.length >= 11) {
      return teamPlayers[teamPlayers.length - 1];
    }
    const usedNumbers = new Set(teamPlayers.map((p) => p.number));
    let nextNum = 2;
    while (usedNumbers.has(nextNum) && nextNum <= 99) {
      nextNum++;
    }
    const defaultArchetype =
      PLAYER_ARCHETYPES_30.find(
        (a) => a.positionGroup === (custom?.positionGroup || 'MID')
      ) || PLAYER_ARCHETYPES_30[0];

    const isHome = team === 'home';
    const newPlayer: PlayerNode = {
      id: `${team}-${String(nextNum).padStart(2, '0')}-${Date.now().toString().slice(-4)}`,
      number: nextNum,
      archetypeId: defaultArchetype.id,
      archetypeName: defaultArchetype.name,
      codeLabel: `${team.toUpperCase()}-${String(nextNum).padStart(2, '0')} (${defaultArchetype.name})`,
      team,
      role: defaultArchetype.name,
      positionGroup: defaultArchetype.positionGroup,
      x: isHome ? 45 + (nextNum % 4) * 6 : 75 - (nextNum % 4) * 6,
      y: 18 + (nextNum % 5) * 11,
      vx: 0,
      vy: 0,
      heightCm: defaultArchetype.defaultHeightCm,
      foot: defaultArchetype.defaultFoot,
      attributes: { ...defaultArchetype.defaultStats },
      ...custom,
    };

    set((state) => ({
      players: [...state.players, newPlayer],
      basePlayers: [...state.basePlayers, newPlayer],
    }));
    scheduleAutosave(get());
    return newPlayer;
  },

  removePlayer: (id: string) => {
    set((state) => ({
      players: state.players.filter((p) => p.id !== id),
      basePlayers: state.basePlayers.filter((p) => p.id !== id),
      ballCarrierId: state.ballCarrierId === id ? null : state.ballCarrierId,
    }));
    scheduleAutosave(get());
  },

  updatePlayer: (id: string, updates: Partial<PlayerNode>) => {
    set((state) => ({
      players: state.players.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      basePlayers: state.basePlayers.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    scheduleAutosave(get());
  },

  setAnalyzingTeam: (team: 'home' | 'away') => {
    set({ analyzingTeam: team });
  },

  setAttackDirection: (dir: 'right' | 'left') => {
    set({ attackDirection: dir });
  },

  setUploadedFrame: (url: string | null, name = '') => {
    set((state) => {
      const updatedScenes = state.scenes.map((sc) =>
        sc.id === state.activeSceneId
          ? { ...sc, frameImageUrl: url, frameMediaName: name }
          : sc
      );
      return {
        currentUploadedFrameUrl: url,
        currentUploadedMediaName: name,
        scenes: updatedScenes,
      };
    });
    scheduleAutosave(get());
  },

  setKeypoints: (kps: CalibrationKeypoint[]) => {
    set((state) => {
      const updatedScenes = state.scenes.map((sc) =>
        sc.id === state.activeSceneId ? { ...sc, keypoints: kps } : sc
      );
      return {
        currentKeypoints: kps,
        scenes: updatedScenes,
      };
    });
    scheduleAutosave(get());
  },

  setMatchContextNote: (note: string) => {
    set((state) => {
      const updatedScenes = state.scenes.map((sc) =>
        sc.id === state.activeSceneId ? { ...sc, matchContextNote: note } : sc
      );
      return {
        matchContextNote: note,
        scenes: updatedScenes,
      };
    });
    scheduleAutosave(get());
  },

  addScene: (name?: string) => {
    const s = get();
    const newIdx = s.scenes.length + 1;
    const newSceneId = `scene-${Date.now()}`;
    const newScene: TacticalScene = {
      id: newSceneId,
      name: name || `Scena ${newIdx}`,
      frameImageUrl: s.currentUploadedFrameUrl,
      frameMediaName: s.currentUploadedMediaName,
      perspectiveType: 'Broadcast',
      keypoints: s.currentKeypoints,
      players: s.players.map((p) => ({ ...p })),
      ball: { ...s.ball },
      matchContextNote: s.matchContextNote,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      scenes: [...state.scenes, newScene],
      activeSceneId: newSceneId,
    }));
    scheduleAutosave(get());
    return newSceneId;
  },

  switchScene: (sceneId: string) => {
    const s = get();
    const currentSceneIdx = s.scenes.findIndex((sc) => sc.id === s.activeSceneId);
    let updatedScenes = [...s.scenes];
    if (currentSceneIdx >= 0) {
      updatedScenes[currentSceneIdx] = {
        ...updatedScenes[currentSceneIdx],
        players: s.players.map((p) => ({ ...p })),
        ball: { ...s.ball },
        keypoints: s.currentKeypoints,
        frameImageUrl: s.currentUploadedFrameUrl,
        frameMediaName: s.currentUploadedMediaName,
        matchContextNote: s.matchContextNote,
      };
    }

    const targetScene = updatedScenes.find((sc) => sc.id === sceneId);
    if (!targetScene) return;

    set({
      scenes: updatedScenes,
      activeSceneId: sceneId,
      players: targetScene.players.map((p) => ({ ...p })),
      ball: { ...targetScene.ball },
      currentKeypoints: targetScene.keypoints,
      currentUploadedFrameUrl: targetScene.frameImageUrl,
      currentUploadedMediaName: targetScene.frameMediaName,
      matchContextNote: targetScene.matchContextNote,
    });
    scheduleAutosave(get());
  },

  deleteScene: (sceneId: string) => {
    const s = get();
    if (s.scenes.length <= 1) return;
    const remaining = s.scenes.filter((sc) => sc.id !== sceneId);
    const nextActive = s.activeSceneId === sceneId ? remaining[0].id : s.activeSceneId;
    set({ scenes: remaining, activeSceneId: nextActive });
    get().switchScene(nextActive);
  },

  exportProjectJson: () => {
    const s = get();
    const payload = {
      format: 'LAVAGNA_TATTICA_PROJECT_V2',
      openCoreVersion: '2.0.0-SUPREME',
      founderAuthority: 'Marco Razzano — 0xLAVAGNATATTICA_MARCO_RAZZANO_FOUNDER_SUPREME_AUTHORITY',
      exportedAt: new Date().toISOString(),
      id: s.id,
      title: s.title,
      description: s.description,
      homeFormation: s.homeFormation,
      awayFormation: s.awayFormation,
      analyzingTeam: s.analyzingTeam,
      attackDirection: s.attackDirection,
      matchContextNote: s.matchContextNote,
      scenes: s.scenes,
      activeSceneId: s.activeSceneId,
      players: s.players,
      ball: s.ball,
      tags: s.tags,
      arrows: s.arrows,
      zones: s.zones,
      notes: s.notes,
    };
    return JSON.stringify(payload, null, 2);
  },

  importProjectJson: (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || !data.players || !Array.isArray(data.players)) {
        return false;
      }
      set({
        id: data.id || `lavagna-imported-${Date.now()}`,
        title: data.title || 'Progetto Importato',
        description: data.description || '',
        homeFormation: data.homeFormation || '4-3-3',
        awayFormation: data.awayFormation || '3-5-2',
        analyzingTeam: data.analyzingTeam || 'home',
        attackDirection: data.attackDirection || 'right',
        matchContextNote: data.matchContextNote || 'Transizione offensiva',
        players: data.players,
        basePlayers: data.players,
        ball: data.ball || { x: 60, y: 40 },
        scenes:
          data.scenes && data.scenes.length > 0
            ? data.scenes
            : [
                {
                  id: 'scene-imported-1',
                  name: 'Scena 1 · Importata',
                  frameImageUrl: null,
                  frameMediaName: '',
                  perspectiveType: 'Broadcast',
                  keypoints: DEFAULT_CALIBRATION_KEYPOINTS,
                  players: data.players,
                  ball: data.ball || { x: 60, y: 40 },
                  matchContextNote: data.matchContextNote || '',
                  createdAt: new Date().toISOString(),
                },
              ],
        activeSceneId: data.activeSceneId || data.scenes?.[0]?.id || 'scene-imported-1',
        tags: Array.isArray(data.tags) ? data.tags : get().tags,
        arrows: Array.isArray(data.arrows) ? data.arrows : [],
        zones: Array.isArray(data.zones) ? data.zones : [],
        notes: Array.isArray(data.notes) ? data.notes : [],
      });
      scheduleAutosave(get());
      return true;
    } catch (e) {
      console.error('Failed to parse project JSON:', e);
      return false;
    }
  },

  addTacticalTag: (tag) => {
    set((state) => ({
      tags: [tag, ...state.tags],
      activeTagId: tag.id,
    }));
  },

  setActiveTag: (tagId) => {
    set({ activeTagId: tagId });
  },

  loadTagScenario: (tagId) => {
    const tag = get().tags.find((t) => t.id === tagId);
    if (!tag) return;
    useHistoryStore.getState().pushSnapshot(get());
    set((state) => {
      const ballPos = { x: tag.pitchCoordinates.x, y: tag.pitchCoordinates.y };
      const actorInvolvement = tag.playersInvolved.find((p) => p.role === 'actor');
      let updatedPlayers = state.players;
      let newCarrierId = state.ballCarrierId;

      if (actorInvolvement) {
        newCarrierId = actorInvolvement.playerId;
        updatedPlayers = state.players.map((p) => {
          if (p.id === actorInvolvement.playerId) {
            return {
              ...p,
              x: Math.max(4, Math.min(116, tag.pitchCoordinates.x - 1.5)),
              y: tag.pitchCoordinates.y,
            };
          }
          return p;
        });
      }

      // Freccia tattica rappresentativa dell'azione
      const targetX = tag.category === 'shot' ? 120 : Math.min(116, tag.pitchCoordinates.x + 16);
      const targetY = tag.category === 'shot' ? 40 : Math.max(10, Math.min(70, tag.pitchCoordinates.y - 6));
      const newArrow: BoardArrow = {
        id: `arrow-tag-${tag.id}`,
        fromX: tag.pitchCoordinates.x,
        fromY: tag.pitchCoordinates.y,
        toX: targetX,
        toY: targetY,
        type: tag.category === 'shot' ? 'pass' : 'run',
        style: 'curved',
        color: '#00E5FF',
        strokeWidth: 2,
      };

      const newNotes = [
        ...state.notes,
        {
          id: `note-${tag.id}`,
          x: tag.pitchCoordinates.x,
          y: Math.min(76, tag.pitchCoordinates.y + 4),
          text: `[TAG SCENARIO] ${tag.title}`,
          color: '#00E5FF',
        },
      ];

      return {
        activeTagId: tag.id,
        ball: ballPos,
        ballCarrierId: newCarrierId,
        players: updatedPlayers,
        arrows: [...state.arrows, newArrow],
        notes: newNotes,
      };
    });
  },

  createTagFromCurrentBoard: (customTitle) => {
    const s = get();
    const ballCarrier = s.players.find((p) => p.id === s.ballCarrierId);
    const category: TagCategory = s.ball.x > 80 ? 'shot' : s.ball.x > 50 ? 'pass' : 'recovery';
    const tacticalState = s.getTacticalState();
    const { metrics } = evaluateTacticalState(tacticalState);
    const bestMove = metrics.chessAlternatives[0];

    const newTag: TacticalTag = {
      id: `tag-${Date.now()}`,
      matchId: s.id,
      timestampSec: Number((s.animation.currentTime / 1000).toFixed(1)),
      category,
      eventType: category === 'shot' ? 'shot_creation' : 'pass_progression',
      title: customTitle || `${category.toUpperCase()} da ${ballCarrier?.archetypeName || 'Pedina'} (${s.ball.x.toFixed(0)}, ${s.ball.y.toFixed(0)})`,
      pitchCoordinates: { x: s.ball.x, y: s.ball.y },
      playersInvolved: ballCarrier
        ? [{ playerId: ballCarrier.id, archetypeId: String(ballCarrier.archetypeId), role: 'actor' }]
        : [],
      metricsSnapshot: {
        xtDelta: bestMove?.deltaXt || 0.02,
        pitchControlAdvantage: (metrics.homePitchControlPct - 50) / 100,
        evalScore: bestMove?.compositeScore || 0.3,
        qualitativeBadge: 'best_move',
      },
      glossaryReferenceId: category === 'shot' ? 'expected-threat' : 'pitch-control',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      tags: [newTag, ...state.tags],
      activeTagId: newTag.id,
    }));

    return newTag;
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

  updatePlayerArchetype: (playerId, archetypeId) => {
    const arch = PLAYER_ARCHETYPES_30.find((a) => a.id === archetypeId);
    if (!arch) return;
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          archetypeId: arch.id,
          archetypeName: arch.name,
          role: `${arch.name} (#${p.number})`,
          positionGroup: arch.positionGroup,
          heightCm: arch.defaultHeightCm,
          foot: arch.defaultFoot,
          attributes: { ...arch.defaultStats },
        };
      }),
    }));
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
