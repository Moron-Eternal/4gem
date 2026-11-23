import { describe, expect, it } from 'vitest';
import { MOVES } from '../data/moves';
import { createPokemon } from '../data/pokemonFactory';
import { createDefaultStages } from '../engine/battle/battleEngine';
import { computeMoveScale } from '../engine/battle/moveScaling';

describe('Stat-, Level-, and Evolution-Stage Move Scaling', () => {
  it('monotonically grows Surf wave scale from Squirtle Lv.1 -> Wartortle Lv.40 -> Blastoise Lv.100', () => {
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

    expect(p1.beamWidthPx).toBeLessThan(p2.beamWidthPx);
    expect(p2.beamWidthPx).toBeLessThan(p3.beamWidthPx);

    expect(p1.waveHeight).toBeLessThan(p2.waveHeight);
    expect(p2.waveHeight).toBeLessThan(p3.waveHeight);

    expect(p1.particleCount).toBeLessThan(p2.particleCount);
    expect(p2.particleCount).toBeLessThan(p3.particleCount);
  });

  it('monotonically grows Flamethrower scale from Charmander Lv.5 -> Charmeleon Lv.28 -> Charizard Lv.100', () => {
    const ch5 = createPokemon('charmander', 5);
    const cm28 = createPokemon('charmeleon', 28);
    const cz100 = createPokemon('charizard', 100);

    const p1 = computeMoveScale(ch5, MOVES.flamethrower);
    const p2 = computeMoveScale(cm28, MOVES.flamethrower);
    const p3 = computeMoveScale(cz100, MOVES.flamethrower);

    expect(p1.scaleFactor).toBeLessThan(p2.scaleFactor);
    expect(p2.scaleFactor).toBeLessThan(p3.scaleFactor);
    expect(p3.scaleFactor).toBeGreaterThanOrEqual(0.85);
    expect(p1.envSpreadRadius).toBeLessThan(p3.envSpreadRadius);
  });

  it('increases scale when Sp. Atk battle stages are boosted (e.g. Calm Mind)', () => {
    const mon = createPokemon('wartortle', 30);
    const baseStages = createDefaultStages();
    const boostedStages = { ...createDefaultStages(), spAtk: 2 };

    const pBase = computeMoveScale(mon, MOVES.surf, baseStages);
    const pBoosted = computeMoveScale(mon, MOVES.surf, boostedStages);

    expect(pBoosted.relevantStat).toBeGreaterThan(pBase.relevantStat);
    expect(pBoosted.scaleFactor).toBeGreaterThan(pBase.scaleFactor);
    expect(pBoosted.beamWidthPx).toBeGreaterThan(pBase.beamWidthPx);
  });
});
