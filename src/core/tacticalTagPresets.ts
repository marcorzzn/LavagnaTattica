/**
 * LavagnaTattica — Tag Tattici Canonici & Presets
 * Dimostra il modello dati unico che unisce Analisi Video, Lavagna e Teoria.
 */

import { TacticalTag } from './types';

export const CANONICAL_TACTICAL_TAGS: TacticalTag[] = [
  {
    id: 'tag-001-through-ball-z14',
    matchId: 'canon-derby-2026',
    timestampSec: 142.5,
    frameNumber: 3562,
    category: 'pass',
    eventType: 'through_ball',
    title: 'Filtrante Invasivo in Zona 14 (#10 -> #9)',
    description: 'Imbeccata verticale del Trequartista Associativo per lo scatto in mezzo-spazio del Centravanti Boa.',
    pitchCoordinates: { x: 88.5, y: 38.0 },
    playersInvolved: [
      { playerId: 'home-10', archetypeId: 'trequartista_associativo', role: 'actor', coords: { x: 74, y: 38 } },
      { playerId: 'home-09', archetypeId: 'centravanti_boa', role: 'target', coords: { x: 92, y: 39 } },
      { playerId: 'away-04', archetypeId: 'centrale_copertura', role: 'interceptor', coords: { x: 86, y: 44 } },
    ],
    metricsSnapshot: {
      xtDelta: 0.042,
      pitchControlAdvantage: 0.28,
      fiedlerConnectivity: 0.395,
      evalScore: 0.44,
      qualitativeBadge: 'best_move',
    },
    glossaryReferenceId: 'zone-14',
    certification: {
      wilsonCi95: [0.38, 0.52],
      verifiedByBenchmark: true,
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tag-002-high-press-trap',
    matchId: 'canon-derby-2026',
    timestampSec: 310.2,
    frameNumber: 7755,
    category: 'pressing',
    eventType: 'gegenpressing_trap',
    title: 'Trappola Gegenpressing sulla Costruzione Bassa',
    description: 'Schermatura sul braccetto avversario e riconquista entro 3.8 secondi.',
    pitchCoordinates: { x: 34.0, y: 18.5 },
    playersInvolved: [
      { playerId: 'home-08', archetypeId: 'mezzala_incursore', role: 'actor', coords: { x: 36, y: 20 } },
      { playerId: 'away-02', archetypeId: 'braccetto_aggressivo', role: 'target', coords: { x: 32, y: 17 } },
    ],
    metricsSnapshot: {
      xtDelta: 0.028,
      pitchControlAdvantage: 0.65,
      fiedlerConnectivity: 0.412,
      evalScore: 0.39,
      qualitativeBadge: 'good_move',
    },
    glossaryReferenceId: 'gegenpressing',
    certification: {
      wilsonCi95: [0.60, 0.78],
      verifiedByBenchmark: true,
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tag-003-cutback-left',
    matchId: 'canon-derby-2026',
    timestampSec: 588.0,
    frameNumber: 14700,
    category: 'pass',
    eventType: 'cutback',
    title: 'Catena Mancina e Rimorchio al Limite',
    description: 'Discesa sul fondo dell’ala e scarico rasoterra per il tiro della mezzala d’inserimento.',
    pitchCoordinates: { x: 108.0, y: 22.0 },
    playersInvolved: [
      { playerId: 'home-11', archetypeId: 'ala_invertita', role: 'actor', coords: { x: 110, y: 16 } },
      { playerId: 'home-13', archetypeId: 'mezzala_incursore', role: 'target', coords: { x: 96, y: 32 } },
    ],
    metricsSnapshot: {
      xtDelta: 0.065,
      pitchControlAdvantage: 0.45,
      fiedlerConnectivity: 0.380,
      evalScore: 0.52,
      qualitativeBadge: 'best_move',
    },
    glossaryReferenceId: 'cutback',
    certification: {
      wilsonCi95: [0.48, 0.68],
      verifiedByBenchmark: true,
    },
    createdAt: new Date().toISOString(),
  },
];
