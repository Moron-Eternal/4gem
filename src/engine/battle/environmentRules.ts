import { SPECIES } from '../../data/species';
import { ArenaEnvSnapshot, MoveData, PokemonInstance, ZoneEnvSample } from '../../types/game';
import { ArenaGrid } from '../physics/arenaGrid';

export interface EnvMoveModifiers {
  damageMultiplier: number;
  accuracyDelta: number;
  guaranteedHit: boolean;
  bonusParalyzeChance: number;
  applySpeedDropOnTarget: boolean;
  messages: string[];
}

export interface EndOfTurnEnvEvent {
  side: 'player' | 'enemy';
  hpDelta: number; // negative = burn hazard damage, positive = flora heal
  message: string;
}

export function isGrounded(mon: PokemonInstance): boolean {
  const species = SPECIES[mon.speciesId];
  if (!species) return true;
  return !species.types.includes('flying');
}

/**
 * Evaluates how persistent environmental conditions in the ArenaGrid modify
 * an incoming move's damage, accuracy, and tactical side-effects.
 */
export function evaluateMoveEnvironment(
  move: MoveData,
  attacker: PokemonInstance,
  defender: PokemonInstance,
  attackerZone: ZoneEnvSample,
  defenderZone: ZoneEnvSample,
  snapshot: ArenaEnvSnapshot,
  grid?: ArenaGrid
): EnvMoveModifiers {
  const result: EnvMoveModifiers = {
    damageMultiplier: 1.0,
    accuracyDelta: 0,
    guaranteedHit: false,
    bonusParalyzeChance: 0,
    applySpeedDropOnTarget: false,
    messages: [],
  };

  const defenderWet = defenderZone.water >= 0.08 || snapshot.centerZone.water >= 0.14;
  const defenderBurning = defenderZone.fire >= 0.07;
  const defenderOvergrown = defenderZone.flora >= 0.14;
  const defenderCratered = defenderZone.crater >= 0.12 || snapshot.centerZone.crater >= 0.15;
  const defenderFrozen = defenderZone.ice >= 0.12;
  const attackerInFlames = attackerZone.fire >= 0.08;
  const attackerInWater = attackerZone.water >= 0.1;

  // 1. Steam Haze accuracy reduction (unless move clears steam or auto-conducts)
  if (snapshot.steamTurns > 0 && move.type !== 'flying') {
    result.accuracyDelta -= 15;
  }

  // 2. Electric + Water Puddles = ELECTRIFIED WATER CHAIN REACTION!
  if (move.type === 'electric' && defenderWet) {
    result.damageMultiplier *= 1.35;
    result.guaranteedHit = true;
    result.bonusParalyzeChance += 0.2;
    result.messages.push('Lightning surged through the flooded floor!');
  }

  // 3. Fire interactions (Overgrown ignition, Burning boost, Water damping/Steam, Ice melt)
  if (move.type === 'fire') {
    if (defenderOvergrown) {
      result.damageMultiplier *= 1.25;
      result.messages.push('The flames ignited the overgrown foliage!');
    } else if (defenderBurning || attackerInFlames) {
      result.damageMultiplier *= 1.2;
    }

    if (defenderWet) {
      result.damageMultiplier *= 0.75;
      result.messages.push('Water boiled into a thick STEAM cloud!');
    } else if (defenderFrozen) {
      result.messages.push('The searing heat melted the ice sheet!');
    }
  }

  // 4. Water interactions (Flooded boost, Extinguishing flames into Steam)
  if (move.type === 'water') {
    if (attackerInWater || defenderWet) {
      result.damageMultiplier *= 1.2;
    }
    if (defenderBurning) {
      result.messages.push('The wave extinguished the flames in a burst of STEAM!');
    }
  }

  // 5. Ice + Water Puddles = FLASH FREEZE!
  if (move.type === 'ice') {
    if (defenderWet) {
      result.damageMultiplier *= 1.2;
      if (isGrounded(defender)) {
        result.applySpeedDropOnTarget = true;
        result.messages.push('Standing water froze into slick ICE! Target slowed!');
      }
    } else if (defenderFrozen) {
      result.damageMultiplier *= 1.2;
    }
  }

  // 6. Rock / Ground on Cratered terrain
  if ((move.type === 'rock' || move.type === 'ground') && defenderCratered) {
    result.damageMultiplier *= 1.15;
    result.messages.push('Shattered terrain amplified the seismic force!');
  }

  // 7. Wind / Flying clears Steam & fans flames
  if (move.type === 'flying') {
    if (snapshot.steamTurns > 0) {
      result.messages.push('The gust blew away the STEAM cloud!');
    } else if (defenderBurning || attackerInFlames) {
      result.damageMultiplier *= 1.15;
      result.messages.push('The wind fanned the roaring flames!');
    }
  }

  // Also check live grid reactions if fired after choreography
  if (grid) {
    if (grid.recentReactions.steamTriggered && !result.messages.some((m) => m.includes('STEAM'))) {
      result.messages.push('Fire and water collided into a STEAM cloud!');
    }
    if (
      grid.recentReactions.electricChainCells > 60 &&
      !result.messages.some((m) => m.includes('flooded floor'))
    ) {
      result.messages.push('Electricity cascaded across the puddles!');
    }
  }

  return result;
}

/**
 * Evaluates persistent end-of-turn battlefield hazards (Burning ground chip & Overgrown Grass heal).
 */
export function evaluateEndOfTurnEnvironment(
  player: PokemonInstance,
  enemy: PokemonInstance,
  grid: ArenaGrid
): EndOfTurnEnvEvent[] {
  const events: EndOfTurnEnvEvent[] = [];
  const snap = grid.getSnapshot();

  const checkSide = (side: 'player' | 'enemy', mon: PokemonInstance, zone: ZoneEnvSample) => {
    if (mon.hp <= 0) return;
    const species = SPECIES[mon.speciesId];
    if (!species) return;
    const grounded = isGrounded(mon);

    // Burning ground hurts grounded non-Fire Pokémon
    if (grounded && zone.fire >= 0.14 && !species.types.includes('fire')) {
      const dmg = Math.max(1, Math.floor(mon.maxHp / 16));
      events.push({
        side,
        hpDelta: -dmg,
        message: `${species.name} was seared by the burning ground!`,
      });
    }

    // Overgrown flora gently restores Grass-type Pokémon
    if (grounded && zone.flora >= 0.22 && species.types.includes('grass') && mon.hp < mon.maxHp) {
      const heal = Math.max(1, Math.floor(mon.maxHp / 16));
      events.push({
        side,
        hpDelta: heal,
        message: `${species.name} absorbed nutrients from the overgrown vines!`,
      });
    }
  };

  checkSide('player', player, snap.playerZone);
  checkSide('enemy', enemy, snap.enemyZone);

  if (grid.steamTurns > 0) {
    grid.steamTurns -= 1;
  }

  return events;
}
