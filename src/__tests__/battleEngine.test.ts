import { describe, expect, it } from 'vitest';
import { MOVES } from '../data/moves';
import { createPokemon, expForLevel, grantExp } from '../data/pokemonFactory';
import { getTypeEffectiveness } from '../data/typeChart';
import {
  calculateCatchAttempt,
  createDefaultStages,
  resolveMoveExecution,
} from '../engine/battle/battleEngine';
import { evaluateEndOfTurnEnvironment } from '../engine/battle/environmentRules';
import { ArenaGrid, ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y } from '../engine/physics/arenaGrid';

describe('Battle Mechanics, Environmental Reactions, Catching & Evolution', () => {
  it('computes Gen 3 FireRed type effectiveness accurately (including 4x dual-type weakness)', () => {
    expect(getTypeEffectiveness('water', ['rock', 'ground'])).toBe(4);
    expect(getTypeEffectiveness('electric', ['ground'])).toBe(0);
    expect(getTypeEffectiveness('fire', ['grass', 'poison'])).toBe(2);
    expect(getTypeEffectiveness('grass', ['fire', 'flying'])).toBe(0.25);
  });

  it('amplifies Electric damage by +35% and guarantees hit on Flooded terrain', () => {
    const pikachu = createPokemon('pikachu', 20);
    const snorlax = createPokemon('snorlax', 20);
    const dryGrid = new ArenaGrid('gym_floor');
    const wetGrid = new ArenaGrid('gym_floor');
    wetGrid.injectWater(ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, 24, 24, 1.0, 0, 0, 0.5);

    const fixedRng = () => 0.5;
    const dryRes = resolveMoveExecution({
      attacker: pikachu,
      defender: snorlax,
      move: MOVES.thunderbolt,
      attackerStages: createDefaultStages(),
      defenderStages: createDefaultStages(),
      attackerSide: 'player',
      envSnapshot: dryGrid.getSnapshot(),
      rng: fixedRng,
    });
    const wetRes = resolveMoveExecution({
      attacker: pikachu,
      defender: snorlax,
      move: MOVES.thunderbolt,
      attackerStages: createDefaultStages(),
      defenderStages: createDefaultStages(),
      attackerSide: 'player',
      envSnapshot: wetGrid.getSnapshot(),
      rng: fixedRng,
    });

    expect(wetRes.damage).toBeGreaterThan(dryRes.damage);
    expect(wetRes.envMessages.some((m) => m.includes('flooded floor'))).toBe(true);
  });

  it('applies Burning Ground end-of-turn chip to grounded non-Fire Pokémon but spares Fire/Flying types', () => {
    const grid = new ArenaGrid('viridian_forest');
    grid.injectFire(ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, 24, 24, 1.4);

    const player = createPokemon('charmander', 16);
    const groundedTarget = createPokemon('bulbasaur', 16);
    const eventsGrounded = evaluateEndOfTurnEnvironment(player, groundedTarget, grid);
    expect(eventsGrounded.some((e) => e.side === 'enemy' && e.hpDelta < 0)).toBe(true);

    const flyingTarget = createPokemon('pidgeotto', 16);
    const eventsFlying = evaluateEndOfTurnEnvironment(player, flyingTarget, grid);
    expect(eventsFlying.some((e) => e.side === 'enemy' && e.hpDelta < 0)).toBe(false);
  });

  it('evolves Charmander -> Charmeleon -> Charizard on XP threshold and increases Sp. Atk', () => {
    const mon = createPokemon('charmander', 5);
    const startSpAtk = mon.spAtk;

    const neededFor16 = expForLevel(16) - mon.exp + 10;
    const res1 = grantExp(mon, neededFor16);
    expect(res1.evolvedFrom).toBe('charmander');
    expect(res1.evolvedTo).toBe('charmeleon');
    expect(mon.speciesId).toBe('charmeleon');
    expect(mon.spAtk).toBeGreaterThan(startSpAtk);

    const neededFor32 = expForLevel(32) - mon.exp + 10;
    const res2 = grantExp(mon, neededFor32);
    expect(res2.evolvedFrom).toBe('charmeleon');
    expect(res2.evolvedTo).toBe('charizard');
    expect(mon.speciesId).toBe('charizard');
    expect(mon.moves.some((m) => m.moveId === 'fire_blast' || m.moveId === 'flamethrower')).toBe(true);
  });

  it('gives higher catch probability on weakened sleeping wild Pokémon with Great Ball', () => {
    const wild = createPokemon('pidgey', 4);
    wild.hp = 1;
    wild.status = 'sleep';

    const result = calculateCatchAttempt(wild, 'great_ball', () => 0.1);
    expect(result.caught).toBe(true);
    expect(result.shakes).toBe(3);
  });
});
