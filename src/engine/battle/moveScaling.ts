import { SPECIES } from '../../data/species';
import {
  MoveData,
  MovePhysicsProfile,
  MoveReachEvaluation,
  PokemonInstance,
  StatStages,
  ZoneEnvSample,
} from '../../types/game';
import { PLAY_MAX_X, PLAY_MAX_Y, PLAY_MIN_X, PLAY_MIN_Y } from '../physics/arenaGrid';

export function stageMultiplier(stage: number): number {
  const clamped = Math.max(-6, Math.min(6, stage));
  return clamped >= 0 ? (2 + clamped) / 2 : 2 / (2 - clamped);
}

export function getEffectiveAttackStat(
  mon: PokemonInstance,
  move: MoveData,
  stages?: StatStages
): { value: number; statName: 'Sp. Atk' | 'Attack' | 'Level' } {
  if (move.scalesWith === 'level') {
    return { value: Math.max(8, mon.level * 2.5), statName: 'Level' };
  }
  if (move.scalesWith === 'spAtk') {
    const base = mon.statOverride?.spAtk ?? mon.spAtk;
    const mult = stages ? stageMultiplier(stages.spAtk) : 1;
    return { value: Math.round(base * mult), statName: 'Sp. Atk' };
  }
  const base = mon.statOverride?.atk ?? mon.atk;
  const mult = stages ? stageMultiplier(stages.atk) : 1;
  return { value: Math.round(base * mult), statName: 'Attack' };
}

/**
 * Computes physical/visual scaling & dynamic move reach from:
 * - Relevant attacking stat (Sp. Atk or Attack including battle stages)
 * - Attacker Level (1..100)
 * - Evolution Stage (0 = basic, 1 = mid, 2 = final)
 * - STAB & Move Base Power
 */
export function computeMoveScale(
  attacker: PokemonInstance,
  move: MoveData,
  stages?: StatStages
): MovePhysicsProfile {
  const species = SPECIES[attacker.speciesId];
  const { value: statVal, statName } = getEffectiveAttackStat(attacker, move, stages);

  const statNorm = Math.max(0, Math.min(1, Math.pow((statVal - 5) / 225, 0.72)));
  const levelNorm = Math.max(0, Math.min(1, Math.pow((attacker.level - 1) / 99, 0.75)));

  let evoNorm = 0;
  if (species) {
    if (species.singleStageWeight !== undefined) {
      evoNorm = species.singleStageWeight;
    } else {
      evoNorm = species.evoStage === 2 ? 1.0 : species.evoStage === 1 ? 0.52 : 0.08;
    }
  }

  const powerNorm = move.power > 0 ? Math.max(0.55, Math.min(1.12, 0.52 + (move.power / 115) * 0.55)) : 0.75;
  const hasStab = species ? species.types.includes(move.type) : false;
  const stabBonus = hasStab ? 1.06 : 0.96;

  const rawScale = (statNorm * 0.56 + levelNorm * 0.24 + evoNorm * 0.20) * powerNorm * stabBonus;
  const scaleFactor = Math.max(0.20, Math.min(1.0, rawScale));

  const tier: MovePhysicsProfile['tier'] =
    scaleFactor >= 0.72 ? 'cataclysm' : scaleFactor >= 0.43 ? 'surge' : 'spark';

  // Effective spatial reach in 192x108 arena grid units:
  // Scales smoothly between move.baseRangePx (Lv.1 unevolved) and move.maxRangePx (Lv.100 final evo)!
  const reachProgress = Math.max(0, Math.min(1, (scaleFactor - 0.18) / 0.82));
  const effectiveRangePx = Math.round(
    move.baseRangePx + (move.maxRangePx - move.baseRangePx) * reachProgress
  );

  // Knockback push distance scaled by strength & evolution
  const knockbackPx = move.knockbackPx
    ? Math.round(move.knockbackPx * (0.45 + scaleFactor * 0.95))
    : 0;

  return {
    scaleFactor,
    tier,
    relevantStat: statVal,
    relevantStatName: statName,
    effectiveRangePx,
    knockbackPx,
    beamWidthPx: Math.round(6 + Math.pow(scaleFactor, 1.25) * 68),
    waveHeight: +(0.32 + scaleFactor * 1.45).toFixed(3),
    speedPxPerSec: Math.round(80 + scaleFactor * 64),
    particleCount: Math.round(36 + Math.pow(scaleFactor, 1.55) * 560),
    envIntensity: +(0.34 + scaleFactor * 0.96).toFixed(3),
    envSpreadRadius: Math.round(10 + scaleFactor * 34),
    shakeIntensity: +(0.7 + Math.pow(scaleFactor, 1.5) * 5.2).toFixed(2),
    audioBassWeight: +(0.25 + scaleFactor * 0.75).toFixed(3),
    durationSec: +(0.92 + scaleFactor * 0.52).toFixed(2),
  };
}

/**
 * Computes how far a Pokémon can reposition in a single turn (in 192x108 arena grid units)
 * based on its Speed stat, battle stages, paralysis, Vine Whip rooting, and terrain!
 */
export function computeMovementBudget(
  mon: PokemonInstance,
  stages: StatStages,
  zone?: ZoneEnvSample,
  isRooted = false
): number {
  const species = SPECIES[mon.speciesId];
  const baseSpd = species?.baseStats.spd ?? 55;
  const effSpd = baseSpd * stageMultiplier(stages.spd) * (mon.status === 'paralyze' ? 0.55 : 1.0);

  // Map speed (~20 Snorlax/Geodude .. 115 Starmie/Raichu) -> 30..64 arena units (~60..128 render px)
  let budget = 26 + Math.min(42, (effSpd / 110) * 38);

  if (isRooted) {
    budget *= 0.45;
  }
  if (zone) {
    const isFlying = species?.types.includes('flying') ?? false;
    const isWater = species?.types.includes('water') ?? false;
    if (!isFlying && zone.water >= 0.14 && !isWater) {
      budget *= 0.78; // wading through puddles slows non-Water Pokémon
    }
    if (!isFlying && zone.ice >= 0.14) {
      budget *= 1.25; // sliding across ice carries extra momentum!
    }
  }

  return Math.round(Math.max(18, Math.min(76, budget)));
}

/**
 * Evaluates whether a target at (dx, dy) is immediately within move range,
 * reachable via a Dash & Strike (using moveBudget), or too far away!
 */
export function evaluateMoveReach(
  ax: number,
  ay: number,
  dx: number,
  dy: number,
  move: MoveData,
  profile: MovePhysicsProfile,
  moveBudgetPx: number
): MoveReachEvaluation {
  const dist = Math.hypot(dx - ax, dy - ay);
  const range = profile.effectiveRangePx;

  // Self-buff moves are always in range
  if (move.category === 'status' && move.statChange?.target === 'self') {
    return {
      status: 'in_range',
      distancePx: Math.round(dist),
      effectiveRangePx: range,
      moveBudgetPx,
      shortfallPx: 0,
      approachX: ax,
      approachY: ay,
    };
  }

  if (dist <= range) {
    return {
      status: 'in_range',
      distancePx: Math.round(dist),
      effectiveRangePx: range,
      moveBudgetPx,
      shortfallPx: 0,
      approachX: ax,
      approachY: ay,
    };
  }

  const shortfall = dist - range;
  const ux = dist > 0.01 ? (dx - ax) / dist : 1;
  const uy = dist > 0.01 ? (dy - ay) / dist : 0;

  // Minimum safe spacing so sprites never overlap awkwardly
  const minStandOff = 22;
  const stepNeeded = Math.min(Math.max(0, dist - minStandOff), shortfall + 4);
  const actualStep = Math.min(moveBudgetPx, stepNeeded);

  const approachX = Math.max(PLAY_MIN_X + 12, Math.min(PLAY_MAX_X - 12, Math.round(ax + ux * actualStep)));
  const approachY = Math.max(PLAY_MIN_Y + 12, Math.min(PLAY_MAX_Y - 12, Math.round(ay + uy * actualStep)));

  const status = shortfall <= moveBudgetPx ? 'dash_strike' : 'out_of_range';

  return {
    status,
    distancePx: Math.round(dist),
    effectiveRangePx: range,
    moveBudgetPx,
    shortfallPx: Math.ceil(shortfall),
    approachX,
    approachY,
  };
}
