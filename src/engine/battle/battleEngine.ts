import { ITEMS } from '../../data/items';
import { MOVES } from '../../data/moves';
import { getDisplayName } from '../../data/pokemonFactory';
import { SPECIES } from '../../data/species';
import { getEffectivenessLabel, getTypeEffectiveness } from '../../data/typeChart';
import {
  ArenaEnvSnapshot,
  MoveData,
  PokemonInstance,
  StatStages,
  StatusCondition,
} from '../../types/game';
import { ArenaGrid, PLAY_MAX_X, PLAY_MAX_Y, PLAY_MIN_X, PLAY_MIN_Y } from '../physics/arenaGrid';
import { evaluateMoveEnvironment } from './environmentRules';
import { computeMovementBudget, computeMoveScale, evaluateMoveReach, stageMultiplier } from './moveScaling';

export function createDefaultStages(): StatStages {
  return { atk: 0, def: 0, spAtk: 0, spDef: 0, spd: 0 };
}

export interface MoveResolution {
  hit: boolean;
  damage: number;
  isCrit: boolean;
  effectiveness: number;
  effectivenessLabel: string | null;
  drainHeal: number;
  appliedStatus?: StatusCondition;
  statChangeLog?: string;
  envMessages: string[];
  missedReason?: 'miss' | 'paralyzed' | 'asleep';
  pillarBlocked?: boolean;
}

export function applyStatStage(
  stages: StatStages,
  stat: keyof StatStages,
  delta: number,
  targetName: string
): string {
  const prev = stages[stat];
  const next = Math.max(-6, Math.min(6, prev + delta));
  stages[stat] = next;

  const statLabel: Record<keyof StatStages, string> = {
    atk: 'Attack',
    def: 'Defense',
    spAtk: 'Sp. Atk',
    spDef: 'Sp. Def',
    spd: 'Speed',
  };

  if (next === prev) {
    return `${targetName}'s ${statLabel[stat]} won't go any ${delta > 0 ? 'higher' : 'lower'}!`;
  }
  const adverb = Math.abs(delta) >= 2 ? 'sharply ' : '';
  return `${targetName}'s ${statLabel[stat]} ${adverb}${delta > 0 ? 'rose' : 'fell'}!`;
}

export function getEffectiveSpeed(mon: PokemonInstance, stages: StatStages): number {
  let spd = mon.spd * stageMultiplier(stages.spd);
  if (mon.status === 'paralyze') spd *= 0.5;
  return spd;
}

export function determineTurnOrder(
  player: PokemonInstance,
  playerMove: MoveData,
  playerStages: StatStages,
  enemy: PokemonInstance,
  enemyMove: MoveData,
  enemyStages: StatStages
): ['player', 'enemy'] | ['enemy', 'player'] {
  const pPri = playerMove.priority ?? 0;
  const ePri = enemyMove.priority ?? 0;
  if (pPri !== ePri) {
    return pPri > ePri ? ['player', 'enemy'] : ['enemy', 'player'];
  }
  const pSpd = getEffectiveSpeed(player, playerStages);
  const eSpd = getEffectiveSpeed(enemy, enemyStages);
  if (pSpd !== eSpd) {
    return pSpd > eSpd ? ['player', 'enemy'] : ['enemy', 'player'];
  }
  return Math.random() < 0.5 ? ['player', 'enemy'] : ['enemy', 'player'];
}

export function resolveMoveExecution(params: {
  attacker: PokemonInstance;
  defender: PokemonInstance;
  move: MoveData;
  attackerStages: StatStages;
  defenderStages: StatStages;
  attackerSide: 'player' | 'enemy';
  envSnapshot: ArenaEnvSnapshot;
  grid?: ArenaGrid;
  positions?: { ax: number; ay: number; dx: number; dy: number };
  rng?: () => number;
}): MoveResolution {
  const {
    attacker,
    defender,
    move,
    attackerStages,
    defenderStages,
    attackerSide,
    envSnapshot,
    grid,
    positions,
  } = params;
  const rng = params.rng ?? Math.random;
  const attackerSpecies = SPECIES[attacker.speciesId];
  const defenderSpecies = SPECIES[defender.speciesId];

  if (attacker.status === 'sleep') {
    if ((attacker.sleepTurns ?? 0) > 0) {
      attacker.sleepTurns = (attacker.sleepTurns ?? 1) - 1;
      return {
        hit: false,
        damage: 0,
        isCrit: false,
        effectiveness: 1,
        effectivenessLabel: null,
        drainHeal: 0,
        envMessages: [],
        missedReason: 'asleep',
      };
    } else {
      attacker.status = 'none';
    }
  }
  if (attacker.status === 'paralyze' && rng() < 0.25) {
    return {
      hit: false,
      damage: 0,
      isCrit: false,
      effectiveness: 1,
      effectivenessLabel: null,
      drainHeal: 0,
      envMessages: [],
      missedReason: 'paralyzed',
    };
  }

  const attackerZone = attackerSide === 'player' ? envSnapshot.playerZone : envSnapshot.enemyZone;
  const defenderZone = attackerSide === 'player' ? envSnapshot.enemyZone : envSnapshot.playerZone;

  const envMods = evaluateMoveEnvironment(
    move,
    attacker,
    defender,
    attackerZone,
    defenderZone,
    envSnapshot,
    grid,
    positions
  );

  const effAccuracy = envMods.guaranteedHit
    ? 100
    : Math.max(35, Math.min(100, move.accuracy + envMods.accuracyDelta));
  if (rng() * 100 > effAccuracy) {
    return {
      hit: false,
      damage: 0,
      isCrit: false,
      effectiveness: 1,
      effectivenessLabel: null,
      drainHeal: 0,
      envMessages: envMods.messages,
      missedReason: 'miss',
    };
  }

  const res: MoveResolution = {
    hit: true,
    damage: 0,
    isCrit: false,
    effectiveness: 1,
    effectivenessLabel: null,
    drainHeal: 0,
    envMessages: [...envMods.messages],
    pillarBlocked: envMods.pillarBlocked,
  };

  if (move.category !== 'status' && move.power > 0) {
    const effectiveness = getTypeEffectiveness(move.type, defenderSpecies?.types ?? ['normal']);
    res.effectiveness = effectiveness;
    res.effectivenessLabel = getEffectivenessLabel(effectiveness);

    if (effectiveness === 0) return res;

    const critChance = move.highCrit ? 0.16 : 0.0625;
    res.isCrit = rng() < critChance;

    const isSpecial = move.category === 'special';
    const rawAtk = isSpecial
      ? (attacker.statOverride?.spAtk ?? attacker.spAtk) * stageMultiplier(attackerStages.spAtk)
      : (attacker.statOverride?.atk ?? attacker.atk) * stageMultiplier(attackerStages.atk);
    const rawDef = isSpecial
      ? defender.spDef * stageMultiplier(defenderStages.spDef)
      : defender.def * stageMultiplier(defenderStages.def);

    const burnPenalty = !isSpecial && attacker.status === 'burn' ? 0.75 : 1.0;
    const stab = attackerSpecies && attackerSpecies.types.includes(move.type) ? 1.5 : 1.0;
    const critMult = res.isCrit ? 1.5 : 1.0;
    const randFactor = 0.88 + rng() * 0.12;

    const baseDamage =
      (((2 * attacker.level) / 5 + 2) * move.power * (rawAtk / Math.max(1, rawDef))) / 50 + 2;

    res.damage = Math.max(
      1,
      Math.floor(
        baseDamage *
          stab *
          effectiveness *
          critMult *
          burnPenalty *
          envMods.damageMultiplier *
          randFactor
      )
    );

    if (move.drainRatio && res.damage > 0) {
      res.drainHeal = Math.max(1, Math.floor(res.damage * move.drainRatio));
    }
  }

  if (envMods.applySpeedDropOnTarget) {
    applyStatStage(defenderStages, 'spd', -1, getDisplayName(defender));
  }

  if (move.statusEffect && defender.status === 'none') {
    const defTypes = defenderSpecies?.types ?? [];
    const immune =
      (move.statusEffect.condition === 'burn' && defTypes.includes('fire')) ||
      (move.statusEffect.condition === 'poison' && defTypes.includes('poison')) ||
      (move.statusEffect.condition === 'paralyze' && defTypes.includes('electric'));

    const totalChance =
      move.statusEffect.chance +
      (move.statusEffect.condition === 'paralyze' ? envMods.bonusParalyzeChance : 0);

    if (!immune && rng() < totalChance) {
      defender.status = move.statusEffect.condition;
      if (move.statusEffect.condition === 'sleep') {
        defender.sleepTurns = 2 + Math.floor(rng() * 2);
      }
      res.appliedStatus = move.statusEffect.condition;
    }
  } else if (
    envMods.bonusParalyzeChance > 0 &&
    defender.status === 'none' &&
    !(defenderSpecies?.types ?? []).includes('electric') &&
    rng() < envMods.bonusParalyzeChance
  ) {
    defender.status = 'paralyze';
    res.appliedStatus = 'paralyze';
  }

  if (move.statChange && rng() < move.statChange.chance) {
    const isSelf = move.statChange.target === 'self';
    const targetStages = isSelf ? attackerStages : defenderStages;
    const targetName = isSelf ? getDisplayName(attacker) : getDisplayName(defender);
    res.statChangeLog = applyStatStage(
      targetStages,
      move.statChange.stat,
      move.statChange.stages,
      targetName
    );
  }

  return res;
}

export function resolveStatusTick(mon: PokemonInstance): { damage: number; message: string } | null {
  if (mon.hp <= 0) return null;
  if (mon.status === 'burn') {
    const damage = Math.max(1, Math.floor(mon.maxHp / 12));
    return { damage, message: `${getDisplayName(mon)} is hurt by its burn!` };
  }
  if (mon.status === 'poison') {
    const damage = Math.max(1, Math.floor(mon.maxHp / 10));
    return { damage, message: `${getDisplayName(mon)} is hurt by poison!` };
  }
  return null;
}

export interface AiTurnDecision {
  move: MoveData;
  stepTo?: { x: number; y: number };
  onlyApproach?: boolean;
}

/**
 * Tactical AI decision maker: chooses the best move AND repositions dynamically
 * to close in for Scratch/Bite, escape burning ground, or exploit Electrified Water!
 */
export function chooseAiDecision(
  aiMon: PokemonInstance,
  playerMon: PokemonInstance,
  aiStages: StatStages,
  aiPos: { x: number; y: number },
  playerPos: { x: number; y: number },
  envSnapshot: ArenaEnvSnapshot,
  isRooted = false
): AiTurnDecision {
  const playerTypes = SPECIES[playerMon.speciesId]?.types ?? ['normal'];
  const aiTypes = SPECIES[aiMon.speciesId]?.types ?? ['normal'];
  const usable = aiMon.moves.filter((m) => m.pp > 0 && MOVES[m.moveId]);
  const budget = computeMovementBudget(aiMon, aiStages, envSnapshot.enemyZone, isRooted);

  if (usable.length === 0) {
    return { move: MOVES.tackle };
  }

  let bestDecision: AiTurnDecision = { move: MOVES[usable[0].moveId] };
  let bestScore = -Infinity;

  for (const slot of usable) {
    const move = MOVES[slot.moveId];
    const prof = computeMoveScale(aiMon, move, aiStages);
    const reach = evaluateMoveReach(aiPos.x, aiPos.y, playerPos.x, playerPos.y, move, prof, budget);

    let score = 20 + Math.random() * 14;
    if (move.category === 'status') {
      score = playerMon.status === 'none' && move.statusEffect ? 44 : 22;
    } else {
      const eff = getTypeEffectiveness(move.type, playerTypes);
      const stab = aiTypes.includes(move.type) ? 1.35 : 1.0;
      score = move.power * eff * stab + Math.random() * 16;

      if (move.type === 'electric' && envSnapshot.playerZone.water >= 0.08) score *= 1.45;
      if (move.type === 'fire' && envSnapshot.playerZone.flora >= 0.14) score *= 1.3;
      if (move.type === 'ice' && envSnapshot.playerZone.water >= 0.08) score *= 1.25;
    }

    // Factor in range reachability!
    if (reach.status === 'in_range') {
      score += 18;
    } else if (reach.status === 'dash_strike') {
      score += 6;
    } else {
      score *= 0.45;
    }

    if (score > bestScore) {
      bestScore = score;
      if (reach.status === 'dash_strike') {
        bestDecision = { move, stepTo: { x: reach.approachX, y: reach.approachY } };
      } else if (reach.status === 'out_of_range') {
        bestDecision = { move, stepTo: { x: reach.approachX, y: reach.approachY }, onlyApproach: true };
      } else {
        // If standing in active fire and not Fire-type, sidestep out of flames!
        if (envSnapshot.enemyZone.fire >= 0.14 && !aiTypes.includes('fire')) {
          const dodgeY = aiPos.y > 54 ? Math.max(PLAY_MIN_Y + 12, aiPos.y - 24) : Math.min(PLAY_MAX_Y - 12, aiPos.y + 24);
          bestDecision = {
            move,
            stepTo: { x: Math.max(PLAY_MIN_X + 14, Math.min(PLAY_MAX_X - 14, aiPos.x)), y: dodgeY },
          };
        } else {
          bestDecision = { move };
        }
      }
    }
  }

  return bestDecision;
}

export function chooseAiMove(
  aiMon: PokemonInstance,
  playerMon: PokemonInstance,
  envSnapshot: ArenaEnvSnapshot
): MoveData {
  return chooseAiDecision(
    aiMon,
    playerMon,
    createDefaultStages(),
    { x: 140, y: 56 },
    { x: 52, y: 56 },
    envSnapshot
  ).move;
}

export function calculateCatchAttempt(
  wildMon: PokemonInstance,
  ballItemId: string,
  rng: () => number = Math.random
): { caught: boolean; shakes: number } {
  const species = SPECIES[wildMon.speciesId];
  const item = ITEMS[ballItemId] ?? ITEMS.poke_ball;
  const catchRate = species?.catchRate ?? 120;
  const ballMult = item.catchMultiplier ?? 1.0;

  const hpFactor = (3 * wildMon.maxHp - 2 * wildMon.hp) / (3 * Math.max(1, wildMon.maxHp));
  const statusBonus =
    wildMon.status === 'sleep' ? 1.85 : wildMon.status !== 'none' ? 1.4 : 1.0;

  const probability = Math.max(
    0.08,
    Math.min(0.98, hpFactor * (catchRate / 255) * ballMult * statusBonus * 1.15)
  );

  if (rng() < probability) {
    return { caught: true, shakes: 3 };
  }
  const shakes = Math.min(2, Math.max(1, Math.floor(probability * 3.2)));
  return { caught: false, shakes };
}

export function calculateExpReward(defeated: PokemonInstance, isTrainer: boolean): number {
  const species = SPECIES[defeated.speciesId];
  const baseExp = species?.baseExp ?? 64;
  const trainerMult = isTrainer ? 1.5 : 1.0;
  return Math.max(18, Math.floor(((baseExp * defeated.level) / 5) * trainerMult * 2.2));
}
