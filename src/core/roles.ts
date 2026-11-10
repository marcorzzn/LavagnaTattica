/**
 * Nomi dei ruoli disponibili per le pedine.
 *
 * Sono etichette: non hanno ancora una definizione con fonte e non portano statistiche.
 * Il database dei ruoli verrà ricostruito con voci verificate, più numerose e più precise.
 */

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface PlayerRole {
  id: number;
  name: string;
  positionGroup: PositionGroup;
}

export const PLAYER_ROLES: PlayerRole[] = [
  { id: 1, name: 'Portiere Classico', positionGroup: 'GK' },
  { id: 2, name: 'Portiere Sweeper', positionGroup: 'GK' },
  { id: 3, name: 'Portiere Playmaker', positionGroup: 'GK' },
  { id: 4, name: 'Difensore Centrale Copertura', positionGroup: 'DEF' },
  { id: 5, name: 'Braccetto Aggressivo', positionGroup: 'DEF' },
  { id: 6, name: 'Difensore Centrale Costruttore', positionGroup: 'DEF' },
  { id: 7, name: 'Terzino Bloccato', positionGroup: 'DEF' },
  { id: 8, name: 'Terzino Fluidificante', positionGroup: 'DEF' },
  { id: 9, name: 'Terzino Invertito', positionGroup: 'DEF' },
  { id: 10, name: 'Mediano Metodista', positionGroup: 'MID' },
  { id: 11, name: 'Mediano Incontrista', positionGroup: 'MID' },
  { id: 12, name: 'Playmaker Basso', positionGroup: 'MID' },
  { id: 13, name: 'Mezzala d’Inserimento', positionGroup: 'MID' },
  { id: 14, name: 'Trequartista Associativo', positionGroup: 'MID' },
  { id: 15, name: 'Ala Invertita', positionGroup: 'FWD' },
  { id: 16, name: 'Ala Classica', positionGroup: 'FWD' },
  { id: 17, name: 'Ala Tornante / Quinto', positionGroup: 'MID' },
  { id: 18, name: 'Seconda Punta Creativa', positionGroup: 'FWD' },
  { id: 19, name: 'Centravanti Boa', positionGroup: 'FWD' },
  { id: 20, name: 'Centravanti Mobile', positionGroup: 'FWD' },
  { id: 21, name: 'Falso 9', positionGroup: 'FWD' },
  { id: 22, name: 'Libero Moderno', positionGroup: 'MID' },
  { id: 23, name: 'Regista Avanzato', positionGroup: 'MID' },
  { id: 24, name: 'Attaccante di Movimento', positionGroup: 'FWD' },
  { id: 25, name: 'Rifinitore Puro', positionGroup: 'MID' },
  { id: 26, name: 'Finalizzatore Puro / Pivot', positionGroup: 'FWD' },
  { id: 27, name: 'Tuttocampista Universale', positionGroup: 'MID' },
  { id: 28, name: 'Leader Difensivo / Torre', positionGroup: 'DEF' },
  { id: 29, name: 'Giovane Talento Esplosivo', positionGroup: 'FWD' },
  { id: 30, name: 'Veterano Tattico', positionGroup: 'MID' },
];

export function findRole(id: number): PlayerRole {
  return PLAYER_ROLES.find((r) => r.id === id) ?? PLAYER_ROLES[0];
}
