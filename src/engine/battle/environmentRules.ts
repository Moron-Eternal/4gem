import { SPECIES } from '../../data/species';
import { ArenaEnvSnapshot, MoveData, PokemonInstance, ZoneEnvSample } from '../../types/game';
import { ArenaGrid, ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, PLAYER_ANCHOR_X, PLAYER_ANCHOR_Y } from '../physics/arenaGrid';

export interface EnvMoveModifiers {
  damageMultiplier: number;
  accuracyDelta: number;
  guaranteedHit: boolean;
  bonusParalyzeChance: number;
  applySpeedDropOnTarget: boolean;
  pillarBlocked: boolean;
  shattersPillar: boolean;
  messages: string[];
}

export interface EndOfTurnEnvEvent {
  side: 'player' | 'enemy';
  hpDelta: number;
  message: string;
}

export function isGrounded(mon: PokemonInstance): boolean {
  const species = SPECIES[mon.speciesId];
  if (!species) return true;
  return !species.types.includes('flying');
}

/**
 * Evaluates live tactical environmental modifiers including Electrified Water,
 * Burning Ground, Steam Haze, Frozen Ice, Craters, Overgrown Flora, Wind, and Destructible Rock Pillars.
 */
export function evaluateMoveEnvironment(
  move: MoveData,
  attacker: PokemonInstance,
  defender: PokemonInstance,
  attackerZone: ZoneEnvSample,
  defenderZone: ZoneEnvSample,
  snapshot: ArenaEnvSnapshot,
  grid?: ArenaGrid,
  positions?: { ax: number; ay: number; dx: number; dy: number }
): EnvMoveModifiers {
  const result: EnvMoveModifiers = {
    damageMultiplier: 1.0,
    accuracyDelta: 0,
    guaranteedHit: false,
    bonusParalyzeChance: 0,
    applySpeedDropOnTarget: false,
    pillarBlocked: false,
    shattersPillar: false,
    messages: [],
  };

  const defenderWet = defenderZone.water >= 0.08 || snapshot.centerZone.water >= 0.14;
  const defenderBurning = defenderZone.fire >= 0.07;
  const defenderOvergrown = defenderZone.flora >= 0.14;
  const defenderCratered = defenderZone.crater >= 0.12 || snapshot.centerZone.crater >= 0.15;
  const defenderFrozen = defenderZone.ice >= 0.12;
  const attackerInFlames = attackerZone.fire >= 0.08;
  const attackerInWater = attackerZone.water >= 0.1;

  // 0. Check Destructible Stone Pillar Cover!
  if (grid && positions && grid.pillars.length > 0 && move.category !== 'status') {
    const bypassesCover =
      move.archetype === 'earthquake' ||
      move.archetype === 'thunder_strike' ||
      move.archetype === 'psychic_wave' ||
      move.archetype === 'blizzard';
    const heavyBreaker =
      move.id === 'earthquake' ||
      move.id === 'hydro_pump' ||
      move.id === 'solar_beam' ||
      move.id === 'fire_blast' ||
      move.id === 'karate_chop';

    if (move.id === 'earthquake') {
      result.shattersPillar = true;
      result.messages.push('EARTHQUAKE shattered the Stone Pillars into flying shrapnel!');
    } else if (!bypassesCover) {
      const blocking = grid.findBlockingPillar(
        positions.ax,
        positions.ay,
        positions.dx,
        positions.dy
      );
      if (blocking) {
        if (heavyBreaker) {
          result.shattersPillar = true;
          grid.damagePillar(blocking.id, 3);
          result.messages.push(`${move.name} smashed straight through the Stone Pillar!`);
        } else {
          result.pillarBlocked = true;
          result.damageMultiplier *= 0.58;
          const broken = grid.damagePillar(blocking.id, 1);
          result.messages.push(
            broken
              ? 'The Stone Pillar absorbed part of the hit and crumbled!'
              : 'A Stone Pillar partially shielded the attack!'
          );
        }
      }
    }
  }

  // 1. Steam Haze accuracy reduction
  if (snapshot.steamTurns > 0 && move.type !== 'flying') {
    result.accuracyDelta -= 15;
  }

  // 2. Electric + Water = ELECTRIFIED WATER!
  if (move.type === 'electric' && defenderWet) {
    result.damageMultiplier *= 1.35;
    result.guaranteedHit = true;
    result.bonusParalyzeChance += 0.2;
    result.messages.push('Lightning surged through the flooded floor!');
  }

  // 3. Fire interactions
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

  // 4. Water interactions
  if (move.type === 'water') {
    if (attackerInWater || defenderWet) {
      result.damageMultiplier *= 1.2;
    }
    if (defenderBurning) {
      result.messages.push('The wave extinguished the flames in a burst of STEAM!');
    }
  }

  // 5. Ice + Water = FLASH FREEZE!
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

  // 7. Wind pushes Steam & fans flames
  if (move.type === 'flying') {
    if (snapshot.steamTurns > 0) {
      result.messages.push('The gust blew away the STEAM cloud!');
    } else if (defenderBurning || attackerInFlames) {
      result.damageMultiplier *= 1.18;
      result.messages.push('The gale pushed and fanned the roaring flames!');
    }
  }

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
 * Evaluates persistent end-of-turn battlefield hazards at each Pokémon's live arena coordinates.
 */
export function evaluateEndOfTurnEnvironment(
  player: PokemonInstance,
  enemy: PokemonInstance,
  grid: ArenaGrid,
  playerPos = { x: PLAYER_ANCHOR_X, y: PLAYER_ANCHOR_Y },
  enemyPos = { x: ENEMY_ANCHOR_X, y: ENEMY_ANCHOR_Y }
): EndOfTurnEnvEvent[] {
  const events: EndOfTurnEnvEvent[] = [];
  const snap = grid.getSnapshot(playerPos.x, playerPos.y, enemyPos.x, enemyPos.y);

  const checkSide = (side: 'player' | 'enemy', mon: PokemonInstance, zone: ZoneEnvSample) => {
    if (mon.hp <= 0) return;
    const species = SPECIES[mon.speciesId];
    if (!species) return;
    const grounded = isGrounded(mon);

    if (grounded && zone.fire >= 0.14 && !species.types.includes('fire')) {
      const dmg = Math.max(1, Math.floor(mon.maxHp / 16));
      events.push({
        side,
        hpDelta: -dmg,
        message: `${species.name} was seared by the burning ground!`,
      });
    }

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
