/**
 * OpenPitch — Template Canonici di Formazione (7 Moduli Standard)
 *
 * Conforme alla Regola Non Negoziabile #3 (Zero Nomi Propri):
 * Ogni slot è rigorosamente mappato su una delle 30 Tipologie Astratte (PLAYER_ARCHETYPES_30).
 * Coordinate in formato StatsBomb canonico [0..120] x [0..80].
 */

import { FormationPreset, PlayerNode } from './types';
import { PLAYER_ARCHETYPES_30 } from './presets';

interface FormationSlotDef {
  number: number;
  archetypeId: number;
  role: string;
  xSb: number; // 0..120
  ySb: number; // 0..80
}

export const CANONICAL_FORMATION_TEMPLATES: Record<FormationPreset, FormationSlotDef[]> = {
  '4-3-3': [
    { number: 1, archetypeId: 2, role: 'Portiere Sweeper', xSb: 8, ySb: 40 },
    { number: 2, archetypeId: 8, role: 'Terzino Fluidificante DX', xSb: 34, ySb: 67 },
    { number: 5, archetypeId: 6, role: 'Difensore Centrale Costruttore DX', xSb: 28, ySb: 50 },
    { number: 4, archetypeId: 4, role: 'Difensore Centrale Copertura SX', xSb: 28, ySb: 30 },
    { number: 3, archetypeId: 9, role: 'Terzino Invertito SX', xSb: 36, ySb: 13 },
    { number: 6, archetypeId: 12, role: 'Playmaker Basso', xSb: 50, ySb: 40 },
    { number: 8, archetypeId: 11, role: 'Mediano Incontrista DX', xSb: 62, ySb: 54 },
    { number: 10, archetypeId: 13, role: 'Mezzala d’Inserimento SX', xSb: 66, ySb: 25 },
    { number: 7, archetypeId: 16, role: 'Ala Classica DX', xSb: 85, ySb: 66 },
    { number: 9, archetypeId: 19, role: 'Centravanti Boa', xSb: 90, ySb: 40 },
    { number: 11, archetypeId: 15, role: 'Ala Invertita SX', xSb: 84, ySb: 17 },
  ],
  '4-2-3-1': [
    { number: 1, archetypeId: 2, role: 'Portiere Sweeper', xSb: 8, ySb: 40 },
    { number: 2, archetypeId: 8, role: 'Terzino Fluidificante DX', xSb: 32, ySb: 67 },
    { number: 5, archetypeId: 6, role: 'Centrale Costruttore DX', xSb: 26, ySb: 50 },
    { number: 4, archetypeId: 4, role: 'Centrale Copertura SX', xSb: 26, ySb: 30 },
    { number: 3, archetypeId: 7, role: 'Terzino Bloccato SX', xSb: 32, ySb: 13 },
    { number: 6, archetypeId: 10, role: 'Mediano Metodista', xSb: 49, ySb: 32 },
    { number: 8, archetypeId: 27, role: 'Tuttocampista Universale', xSb: 50, ySb: 50 },
    { number: 7, archetypeId: 15, role: 'Ala Invertita DX', xSb: 77, ySb: 65 },
    { number: 10, archetypeId: 23, role: 'Regista Avanzato', xSb: 73, ySb: 40 },
    { number: 11, archetypeId: 14, role: 'Trequartista Associativo SX', xSb: 78, ySb: 16 },
    { number: 9, archetypeId: 20, role: 'Centravanti Mobile', xSb: 91, ySb: 40 },
  ],
  '3-5-2': [
    { number: 1, archetypeId: 1, role: 'Portiere Classico', xSb: 8, ySb: 40 },
    { number: 2, archetypeId: 5, role: 'Braccetto Aggressivo DX', xSb: 29, ySb: 58 },
    { number: 6, archetypeId: 6, role: 'Centrale Costruttore', xSb: 25, ySb: 40 },
    { number: 4, archetypeId: 4, role: 'Braccetto Copertura SX', xSb: 29, ySb: 22 },
    { number: 7, archetypeId: 17, role: 'Ala Tornante / Quinto DX', xSb: 60, ySb: 70 },
    { number: 8, archetypeId: 11, role: 'Mediano Incontrista DX', xSb: 61, ySb: 52 },
    { number: 5, archetypeId: 12, role: 'Playmaker Basso', xSb: 50, ySb: 40 },
    { number: 10, archetypeId: 13, role: 'Mezzala d’Inserimento SX', xSb: 62, ySb: 28 },
    { number: 3, archetypeId: 17, role: 'Ala Tornante / Quinto SX', xSb: 60, ySb: 10 },
    { number: 9, archetypeId: 19, role: 'Centravanti Boa', xSb: 89, ySb: 46 },
    { number: 11, archetypeId: 18, role: 'Seconda Punta Creativa', xSb: 85, ySb: 33 },
  ],
  '4-4-2': [
    { number: 1, archetypeId: 1, role: 'Portiere Classico', xSb: 8, ySb: 40 },
    { number: 2, archetypeId: 7, role: 'Terzino Bloccato DX', xSb: 31, ySb: 66 },
    { number: 5, archetypeId: 6, role: 'Centrale Costruttore DX', xSb: 28, ySb: 49 },
    { number: 4, archetypeId: 4, role: 'Centrale Copertura SX', xSb: 28, ySb: 31 },
    { number: 3, archetypeId: 8, role: 'Terzino Fluidificante SX', xSb: 31, ySb: 14 },
    { number: 7, archetypeId: 16, role: 'Esterno Destro', xSb: 60, ySb: 66 },
    { number: 8, archetypeId: 11, role: 'Mediano Incontrista DX', xSb: 55, ySb: 47 },
    { number: 6, archetypeId: 10, role: 'Mediano Metodista SX', xSb: 55, ySb: 33 },
    { number: 11, archetypeId: 15, role: 'Esterno Sinistro', xSb: 60, ySb: 14 },
    { number: 9, archetypeId: 19, role: 'Centravanti Boa', xSb: 88, ySb: 47 },
    { number: 10, archetypeId: 20, role: 'Centravanti Mobile', xSb: 88, ySb: 33 },
  ],
  '3-4-3': [
    { number: 1, archetypeId: 2, role: 'Portiere Sweeper', xSb: 8, ySb: 40 },
    { number: 2, archetypeId: 5, role: 'Braccetto Aggressivo DX', xSb: 29, ySb: 58 },
    { number: 6, archetypeId: 6, role: 'Centrale Costruttore', xSb: 25, ySb: 40 },
    { number: 4, archetypeId: 4, role: 'Braccetto Copertura SX', xSb: 29, ySb: 22 },
    { number: 7, archetypeId: 17, role: 'Quinto DX', xSb: 59, ySb: 69 },
    { number: 8, archetypeId: 27, role: 'Tuttocampista DX', xSb: 55, ySb: 48 },
    { number: 5, archetypeId: 10, role: 'Mediano Metodista SX', xSb: 55, ySb: 32 },
    { number: 3, archetypeId: 17, role: 'Quinto SX', xSb: 59, ySb: 11 },
    { number: 10, archetypeId: 15, role: 'Inside Forward DX', xSb: 83, ySb: 59 },
    { number: 9, archetypeId: 26, role: 'Finalizzatore Puro', xSb: 91, ySb: 40 },
    { number: 11, archetypeId: 15, role: 'Inside Forward SX', xSb: 83, ySb: 21 },
  ],
  '5-3-2': [
    { number: 1, archetypeId: 1, role: 'Portiere Classico', xSb: 8, ySb: 40 },
    { number: 2, archetypeId: 7, role: 'Quinto Basso DX', xSb: 34, ySb: 70 },
    { number: 5, archetypeId: 5, role: 'Braccetto DX', xSb: 28, ySb: 54 },
    { number: 6, archetypeId: 28, role: 'Leader Difensivo / Torre', xSb: 24, ySb: 40 },
    { number: 4, archetypeId: 4, role: 'Centrale SX', xSb: 28, ySb: 26 },
    { number: 3, archetypeId: 7, role: 'Quinto Basso SX', xSb: 34, ySb: 10 },
    { number: 8, archetypeId: 11, role: 'Mezzala Incontrista DX', xSb: 54, ySb: 53 },
    { number: 10, archetypeId: 12, role: 'Playmaker Basso', xSb: 49, ySb: 40 },
    { number: 7, archetypeId: 13, role: 'Mezzala d’Inserimento SX', xSb: 54, ySb: 27 },
    { number: 9, archetypeId: 19, role: 'Centravanti Boa', xSb: 84, ySb: 46 },
    { number: 11, archetypeId: 20, role: 'Centravanti Mobile', xSb: 84, ySb: 34 },
  ],
  '4-1-4-1': [
    { number: 1, archetypeId: 2, role: 'Portiere Sweeper', xSb: 8, ySb: 40 },
    { number: 2, archetypeId: 8, role: 'Terzino Fluidificante DX', xSb: 32, ySb: 67 },
    { number: 5, archetypeId: 6, role: 'Centrale Costruttore DX', xSb: 26, ySb: 50 },
    { number: 4, archetypeId: 4, role: 'Centrale Copertura SX', xSb: 26, ySb: 30 },
    { number: 3, archetypeId: 9, role: 'Terzino Invertito SX', xSb: 32, ySb: 13 },
    { number: 6, archetypeId: 10, role: 'Mediano Metodista', xSb: 47, ySb: 40 },
    { number: 7, archetypeId: 16, role: 'Esterno DX', xSb: 74, ySb: 66 },
    { number: 8, archetypeId: 27, role: 'Tuttocampista DX', xSb: 68, ySb: 51 },
    { number: 10, archetypeId: 13, role: 'Mezzala d’Inserimento SX', xSb: 68, ySb: 29 },
    { number: 11, archetypeId: 15, role: 'Ala Invertita SX', xSb: 74, ySb: 14 },
    { number: 9, archetypeId: 20, role: 'Centravanti Mobile', xSb: 91, ySb: 40 },
  ],
};

export function buildFormationPlayers(
  formation: FormationPreset,
  team: 'home' | 'away'
): PlayerNode[] {
  const slots = CANONICAL_FORMATION_TEMPLATES[formation] || CANONICAL_FORMATION_TEMPLATES['4-3-3'];

  return slots.map((slot) => {
    const arch = PLAYER_ARCHETYPES_30.find((a) => a.id === slot.archetypeId) || PLAYER_ARCHETYPES_30[0];
    const prefix = team === 'home' ? 'H' : 'A';
    const id = `${team}-${slot.number.toString().padStart(2, '0')}`;

    // Per away invertiamo la prospettiva del campo in coordinate StatsBomb (120 - x, 80 - y)
    const x = team === 'home' ? slot.xSb : Number((120 - slot.xSb).toFixed(1));
    const y = team === 'home' ? slot.ySb : Number((80 - slot.ySb).toFixed(1));

    return {
      id,
      number: slot.number,
      archetypeId: arch.id,
      archetypeName: arch.name,
      codeLabel: `${prefix}${slot.number.toString().padStart(2, '0')} · ${arch.name}`,
      team,
      role: `${slot.role} (#${slot.number})`,
      positionGroup: arch.positionGroup,
      x,
      y,
      vx: team === 'home' ? 0.4 : -0.4,
      vy: 0,
      heightCm: arch.defaultHeightCm,
      foot: arch.defaultFoot,
      confidence: 1.0,
      sources: ['manual_entry'],
      attributes: {
        passing: arch.defaultStats.passing,
        pressResistance: arch.defaultStats.pressResistance,
        aerial: arch.defaultStats.aerial,
        progressiveCarries: arch.defaultStats.progressiveCarries,
        defensiveIndex: arch.defaultStats.defensiveIndex,
        speed: arch.defaultStats.speed,
        composure: arch.defaultStats.composure,
      },
    };
  });
}

