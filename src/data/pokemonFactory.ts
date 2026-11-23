import { MOVES } from './moves';
import { SPECIES } from './species';
import { MoveSlot, PokemonInstance, PokemonSpecies } from '../types/game';

let uidCounter = 1;

export function expForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(100, Math.floor(level)));
  return Math.floor(clamped * clamped * clamped * 0.8);
}

export function calcHpStat(base: number, level: number, iv = 15): number {
  return Math.floor(((2 * base + iv) * level) / 100) + level + 10;
}

export function calcOtherStat(base: number, level: number, iv = 15): number {
  return Math.floor(((2 * base + iv) * level) / 100) + 5;
}

export function getMovesForLevel(species: PokemonSpecies, level: number, customMoves?: string[]): MoveSlot[] {
  const chosenIds: string[] = [];

  if (customMoves && customMoves.length > 0) {
    for (const id of customMoves.slice(0, 4)) {
      if (MOVES[id]) chosenIds.push(id);
    }
  } else {
    const eligible = species.learnset
      .filter((entry) => entry.level <= level && MOVES[entry.moveId])
      .sort((a, b) => a.level - b.level);
    const unique: string[] = [];
    for (const entry of eligible) {
      if (!unique.includes(entry.moveId)) {
        unique.push(entry.moveId);
      }
    }
    // Keep the latest 4 learned moves
    const sliced = unique.slice(-4);
    chosenIds.push(...sliced);
  }

  if (chosenIds.length === 0) {
    chosenIds.push('tackle');
  }

  return chosenIds.map((moveId) => {
    const move = MOVES[moveId] ?? MOVES.tackle;
    return {
      moveId: move.id,
      pp: move.maxPp,
      maxPp: move.maxPp,
    };
  });
}

export function createPokemon(
  speciesId: string,
  level: number,
  options?: { customMoves?: string[]; nickname?: string }
): PokemonInstance {
  const species = SPECIES[speciesId] ?? SPECIES.squirtle;
  const clampedLevel = Math.max(1, Math.min(100, Math.round(level)));
  const maxHp = calcHpStat(species.baseStats.hp, clampedLevel);

  return {
    uid: `pkmn_${Date.now().toString(36)}_${uidCounter++}`,
    speciesId: species.id,
    nickname: options?.nickname,
    level: clampedLevel,
    exp: expForLevel(clampedLevel),
    nextLevelExp: expForLevel(Math.min(100, clampedLevel + 1)),
    maxHp,
    hp: maxHp,
    atk: calcOtherStat(species.baseStats.atk, clampedLevel),
    def: calcOtherStat(species.baseStats.def, clampedLevel),
    spAtk: calcOtherStat(species.baseStats.spAtk, clampedLevel),
    spDef: calcOtherStat(species.baseStats.spDef, clampedLevel),
    spd: calcOtherStat(species.baseStats.spd, clampedLevel),
    moves: getMovesForLevel(species, clampedLevel, options?.customMoves),
    status: 'none',
  };
}

export function recalculateStats(mon: PokemonInstance, preserveHpRatio = false): void {
  const species = SPECIES[mon.speciesId];
  if (!species) return;
  const prevMax = mon.maxHp;
  const prevRatio = prevMax > 0 ? mon.hp / prevMax : 1;

  const newMaxHp = calcHpStat(species.baseStats.hp, mon.level);
  const hpGain = Math.max(0, newMaxHp - prevMax);
  mon.maxHp = newMaxHp;
  if (preserveHpRatio) {
    mon.hp = Math.max(1, Math.min(newMaxHp, Math.round(newMaxHp * prevRatio)));
  } else if (mon.hp > 0) {
    mon.hp = Math.min(newMaxHp, mon.hp + hpGain);
  }

  mon.atk = calcOtherStat(species.baseStats.atk, mon.level);
  mon.def = calcOtherStat(species.baseStats.def, mon.level);
  mon.spAtk = calcOtherStat(species.baseStats.spAtk, mon.level);
  mon.spDef = calcOtherStat(species.baseStats.spDef, mon.level);
  mon.spd = calcOtherStat(species.baseStats.spd, mon.level);
  mon.nextLevelExp = expForLevel(Math.min(100, mon.level + 1));
}

export function healPokemon(mon: PokemonInstance): void {
  mon.hp = mon.maxHp;
  mon.status = 'none';
  mon.sleepTurns = 0;
  for (const slot of mon.moves) {
    slot.pp = slot.maxPp;
  }
}

export interface LevelUpResult {
  levelsGained: number;
  learnedMoves: string[];
  evolvedFrom?: string;
  evolvedTo?: string;
}

export function grantExp(mon: PokemonInstance, expGain: number): LevelUpResult {
  const result: LevelUpResult = {
    levelsGained: 0,
    learnedMoves: [],
  };
  if (mon.level >= 100) return result;

  mon.exp += Math.max(1, Math.floor(expGain));

  while (mon.level < 100 && mon.exp >= expForLevel(mon.level + 1)) {
    mon.level += 1;
    result.levelsGained += 1;
    recalculateStats(mon, false);

    const species = SPECIES[mon.speciesId];
    if (species) {
      // Learn new moves unlocked at this level
      for (const entry of species.learnset) {
        if (entry.level === mon.level && MOVES[entry.moveId]) {
          const alreadyHas = mon.moves.some((m) => m.moveId === entry.moveId);
          if (!alreadyHas) {
            const m = MOVES[entry.moveId];
            if (mon.moves.length < 4) {
              mon.moves.push({ moveId: m.id, pp: m.maxPp, maxPp: m.maxPp });
            } else {
              // Replace the weakest / oldest non-signature move
              let replaceIdx = 0;
              let lowestPower = Infinity;
              for (let i = 0; i < mon.moves.length; i++) {
                const existing = MOVES[mon.moves[i].moveId];
                const score = existing ? (existing.category === 'status' ? 20 : existing.power) : 0;
                if (score < lowestPower) {
                  lowestPower = score;
                  replaceIdx = i;
                }
              }
              mon.moves[replaceIdx] = { moveId: m.id, pp: m.maxPp, maxPp: m.maxPp };
            }
            result.learnedMoves.push(m.name);
          }
        }
      }

      // Check evolution threshold
      if (species.evolvesTo && mon.level >= species.evolvesTo.level) {
        const nextSpecies = SPECIES[species.evolvesTo.speciesId];
        if (nextSpecies) {
          if (!result.evolvedFrom) result.evolvedFrom = species.id;
          mon.speciesId = nextSpecies.id;
          result.evolvedTo = nextSpecies.id;
          recalculateStats(mon, false);

          // Also unlock any evolution-level signature move
          for (const entry of nextSpecies.learnset) {
            if (entry.level === mon.level && MOVES[entry.moveId]) {
              const alreadyHas = mon.moves.some((m) => m.moveId === entry.moveId);
              if (!alreadyHas) {
                const m = MOVES[entry.moveId];
                if (mon.moves.length < 4) {
                  mon.moves.push({ moveId: m.id, pp: m.maxPp, maxPp: m.maxPp });
                } else {
                  mon.moves[0] = { moveId: m.id, pp: m.maxPp, maxPp: m.maxPp };
                }
                result.learnedMoves.push(m.name);
              }
            }
          }
        }
      }
    }
  }

  return result;
}

export function getDisplayName(mon: PokemonInstance): string {
  if (mon.nickname) return mon.nickname;
  return SPECIES[mon.speciesId]?.name ?? mon.speciesId.toUpperCase();
}
