import { SPECIES } from '../../data/species';
import { MoveData, MovePhysicsProfile, PokemonInstance, StatStages } from '../../types/game';

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
 * Computes physical/visual scaling for a move based on:
 * - Relevant attacking stat (Sp. Atk for Surf/Flamethrower/Thunderbolt, Atk for Rock Tomb/Vine Whip/Earthquake)
 * - Attacker Level (1..100)
 * - Evolution Stage (0 = basic unevolved, 1 = mid evolution, 2 = final evolution)
 * - STAB (Same-Type Attack Bonus) & Move Base Power
 *
 * Guarantees dramatic, unmistakable visual progression from e.g.:
 *   Squirtle Lv. 1 (~0.22) -> Wartortle Lv. 40 (~0.58) -> Blastoise Lv. 100 (~0.98)
 *   Charmander Lv. 5 (~0.24) -> Charmeleon Lv. 24 (~0.52) -> Charizard Lv. 100 (~1.00)
 */
export function computeMoveScale(
  attacker: PokemonInstance,
  move: MoveData,
  stages?: StatStages
): MovePhysicsProfile {
  const species = SPECIES[attacker.speciesId];
  const { value: statVal, statName } = getEffectiveAttackStat(attacker, move, stages);

  // Normalize stat across typical Gen 3 range: Lv.1 unevolved (~6) up to Lv.100 final evo (~235+)
  const statNorm = Math.max(0, Math.min(1, Math.pow((statVal - 5) / 225, 0.72)));

  // Normalize level 1..100
  const levelNorm = Math.max(0, Math.min(1, Math.pow((attacker.level - 1) / 99, 0.75)));

  // Evolution stage weight: unevolved starters feel smaller & scrappier; evolved forms unleash massive waves/flames
  let evoNorm = 0;
  if (species) {
    if (species.singleStageWeight !== undefined) {
      evoNorm = species.singleStageWeight;
    } else {
      evoNorm = species.evoStage === 2 ? 1.0 : species.evoStage === 1 ? 0.52 : 0.08;
    }
  }

  // Move base power factor (Ember=45 vs Flamethrower=95 vs Fire Blast=115)
  const powerNorm = move.power > 0 ? Math.max(0.55, Math.min(1.12, 0.52 + (move.power / 115) * 0.55)) : 0.75;

  // STAB slight physical boost
  const hasStab = species ? species.types.includes(move.type) : false;
  const stabBonus = hasStab ? 1.06 : 0.96;

  // Weighted composite scale: Stat is the primary driver (55%), Level (25%), Evolution Stage (20%)
  const rawScale = (statNorm * 0.56 + levelNorm * 0.24 + evoNorm * 0.20) * powerNorm * stabBonus;
  const scaleFactor = Math.max(0.20, Math.min(1.0, rawScale));

  const tier: MovePhysicsProfile['tier'] =
    scaleFactor >= 0.72 ? 'cataclysm' : scaleFactor >= 0.43 ? 'surge' : 'spark';

  return {
    scaleFactor,
    tier,
    relevantStat: statVal,
    relevantStatName: statName,
    // Spatial radius/height in arena grid pixels (grid height = 108px)
    beamWidthPx: Math.round(6 + Math.pow(scaleFactor, 1.25) * 68),
    // Fluid wave amplitude (drives height shading & foam generation)
    waveHeight: +(0.32 + scaleFactor * 1.45).toFixed(3),
    // Travel speed across 160px arena
    speedPxPerSec: Math.round(78 + scaleFactor * 62),
    // Pooled pixel particles emitted during move + impact
    particleCount: Math.round(32 + Math.pow(scaleFactor, 1.55) * 520),
    // Environmental alteration strength (puddle depth, fire heat, crater depth, frost)
    envIntensity: +(0.32 + scaleFactor * 0.95).toFixed(3),
    // Radius of persistent floor scarring/flooding/burning around impact
    envSpreadRadius: Math.round(10 + scaleFactor * 34),
    // Crisp pixel camera shake amplitude
    shakeIntensity: +(0.7 + Math.pow(scaleFactor, 1.5) * 5.2).toFixed(2),
    // Web Audio bass weight / filter resonance
    audioBassWeight: +(0.25 + scaleFactor * 0.75).toFixed(3),
    // Total visual choreography duration in seconds
    durationSec: +(0.95 + scaleFactor * 0.55).toFixed(2),
  };
}
