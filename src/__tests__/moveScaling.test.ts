import { describe, expect, it } from 'vitest';
import { MOVES } from '../data/moves';
import { createPokemon } from '../data/pokemonFactory';
import { createDefaultStages } from '../engine/battle/battleEngine';
import {
  computeMovementBudget,
  computeMoveScale,
  evaluateMoveReach,
} from '../engine/battle/moveScaling';

describe('Stat-, Level-, Evolution Scaling & Dynamic Move Ranges', () => {
  it('monotonically grows Surf wave scale, reach, and knockback from Squirtle Lv.1 -> Wartortle Lv.40 -> Blastoise Lv.100', () => {
    const sq1 = createPokemon('squirtle', 1);
    const wt40 = createPokemon('wartortle', 40);
    const bl100 = createPokemon('blastoise', 100);

    const p1 = computeMoveScale(sq1, MOVES.surf);
    const p2 = computeMoveScale(wt40, MOVES.surf);
    const p3 = computeMoveScale(bl100, MOVES.surf);

    expect(p1.tier).toBe('spark');
    expect(p2.tier).toBe('surge');
    expect(p3.tier).toBe('cataclysm');

    expect(p1.scaleFactor).toBeLessThan(p2.scaleFactor);
    expect(p2.scaleFactor).toBeLessThan(p3.scaleFactor);
    expect(p1.effectiveRangePx).toBeLessThan(p2.effectiveRangePx);
    expect(p2.effectiveRangePx).toBeLessThan(p3.effectiveRangePx);
    expect(p1.knockbackPx).toBeLessThan(p3.knockbackPx);
  });

  it('gives Tackle naturally longer lunge reach than Scratch despite lower base power', () => {
    const charmander = createPokemon('charmander', 5);
    const scratchProf = computeMoveScale(charmander, MOVES.scratch);
    const tackleProf = computeMoveScale(charmander, MOVES.tackle);

    expect(MOVES.tackle.power).toBeLessThan(MOVES.scratch.power);
    expect(tackleProf.effectiveRangePx).toBeGreaterThan(scratchProf.effectiveRangePx);

    // At 78 units distance: Scratch requires closing distance while Tackle is already in range!
    const scratchReach = evaluateMoveReach(52, 56, 130, 56, MOVES.scratch, scratchProf, 35);
    const tackleReach = evaluateMoveReach(52, 56, 130, 56, MOVES.tackle, tackleProf, 35);
    expect(scratchReach.status).not.toBe('in_range');
    expect(tackleReach.status).toBe('in_range');
  });

  it('monotonically expands Flamethrower reach & width from Charmander Lv.5 -> Charmeleon Lv.28 -> Charizard Lv.100', () => {
    const ch5 = createPokemon('charmander', 5);
    const cm28 = createPokemon('charmeleon', 28);
    const cz100 = createPokemon('charizard', 100);

    const p1 = computeMoveScale(ch5, MOVES.flamethrower);
    const p2 = computeMoveScale(cm28, MOVES.flamethrower);
    const p3 = computeMoveScale(cz100, MOVES.flamethrower);

    expect(p1.effectiveRangePx).toBeLessThan(p2.effectiveRangePx);
    expect(p2.effectiveRangePx).toBeLessThan(p3.effectiveRangePx);
    expect(p3.effectiveRangePx).toBeGreaterThanOrEqual(155);
  });

  it('computes faster movement budgets for fast Pokémon and halves budget when rooted by Vine Whip', () => {
    const pikachu = createPokemon('pikachu', 20);
    const snorlax = createPokemon('snorlax', 20);
    const stages = createDefaultStages();

    const pikaMove = computeMovementBudget(pikachu, stages, undefined, false);
    const snorlaxMove = computeMovementBudget(snorlax, stages, undefined, false);
    const pikaRooted = computeMovementBudget(pikachu, stages, undefined, true);

    expect(pikaMove).toBeGreaterThan(snorlaxMove);
    expect(pikaRooted).toBeLessThan(pikaMove * 0.6);
  });

  it('increases scale and reach when Sp. Atk battle stages are boosted (Calm Mind)', () => {
    const mon = createPokemon('wartortle', 30);
    const baseStages = createDefaultStages();
    const boostedStages = { ...createDefaultStages(), spAtk: 2 };

    const pBase = computeMoveScale(mon, MOVES.surf, baseStages);
    const pBoosted = computeMoveScale(mon, MOVES.surf, boostedStages);

    expect(pBoosted.relevantStat).toBeGreaterThan(pBase.relevantStat);
    expect(pBoosted.scaleFactor).toBeGreaterThan(pBase.scaleFactor);
    expect(pBoosted.effectiveRangePx).toBeGreaterThan(pBase.effectiveRangePx);
  });
});
