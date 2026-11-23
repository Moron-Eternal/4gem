import { describe, expect, it } from 'vitest';
import {
  ArenaGrid,
  ENEMY_ANCHOR_X,
  ENEMY_ANCHOR_Y,
  PLAYER_ANCHOR_X,
  PLAYER_ANCHOR_Y,
} from '../engine/physics/arenaGrid';

describe('ArenaGrid 2D Cellular-Automata, Fluid Physics, Pillars & Wind', () => {
  it('injects water waves that leave persistent standing puddles', () => {
    const grid = new ArenaGrid('gym_floor');
    grid.injectWater(ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, 18, 22, 1.2, 24, 0, 0.9);
    for (let i = 0; i < 20; i++) grid.step(1 / 60);

    const sample = grid.sampleZone(ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, 20);
    expect(sample.water).toBeGreaterThan(0.1);
    expect(sample.tags).toContain('flooded');
  });

  it('ignites Viridian Forest fuel and leaves persistent scorch scars', () => {
    const grid = new ArenaGrid('viridian_forest');
    grid.injectFire(ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, 16, 16, 1.3);
    for (let i = 0; i < 30; i++) grid.step(1 / 60);

    const sample = grid.sampleZone(ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, 18);
    expect(sample.fire).toBeGreaterThan(0.08);
    expect(sample.scorch).toBeGreaterThan(0.1);
    expect(sample.tags).toContain('burning');
  });

  it('triggers Steam and extinguishes fire when Water hits Fire', () => {
    const grid = new ArenaGrid('route_meadow');
    grid.injectFire(ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, 16, 16, 1.2);
    grid.resetRecentReactions();
    grid.injectWater(ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, 18, 18, 1.2, 20, 0, 0.8);

    expect(grid.recentReactions.steamTriggered).toBe(true);
    expect(grid.recentReactions.fireExtinguishedCells).toBeGreaterThan(0);
    expect(grid.steamTurns).toBeGreaterThanOrEqual(2);
    expect(grid.getSnapshot().activeTags).toContain('steam');
  });

  it('conducts Electric voltage through connected water puddles', () => {
    const grid = new ArenaGrid('gym_floor');
    grid.injectWater(100, ENEMY_ANCHOR_Y, 36, 18, 0.8, 0, 0, 0.4);
    grid.injectWater(ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, 22, 18, 0.8, 0, 0, 0.4);
    grid.resetRecentReactions();

    grid.injectElectric(ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, 12, 1.3);

    expect(grid.recentReactions.electricChainCells).toBeGreaterThan(150);
    expect(grid.lightningArcs.length).toBeGreaterThan(0);
  });

  it('flash-freezes standing water into crystalline ice sheets', () => {
    const grid = new ArenaGrid('cerulean_pool');
    grid.resetRecentReactions();
    grid.injectIce(96, 54, 18, 1.1);

    expect(grid.recentReactions.waterFrozenCells).toBeGreaterThan(100);
    const sample = grid.sampleZone(96, 54, 16);
    expect(sample.ice).toBeGreaterThan(0.25);
    expect(sample.tags).toContain('frozen');
  });

  it('spawns Destructible Rock Pillars that block line-of-sight and shatter on Earthquake', () => {
    const grid = new ArenaGrid('pewter_rock');
    const pil = grid.spawnPillar(96, 56, 8, 2);
    expect(pil).not.toBeNull();
    expect(grid.getSnapshot().activeTags).toContain('pillars');

    const hit = grid.findBlockingPillar(PLAYER_ANCHOR_X, PLAYER_ANCHOR_Y, ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y);
    expect(hit?.id).toBe(pil?.id);

    const broken = grid.shatterAllPillars();
    expect(broken.length).toBe(1);
    expect(grid.pillars.length).toBe(0);
  });

  it('physically pushes active flames downwind and clears Steam on applyWindGust', () => {
    const grid = new ArenaGrid('route_meadow');
    grid.injectFire(72, 56, 10, 10, 1.3);
    grid.steamTurns = 2;

    grid.applyWindGust(1, 0.9);
    expect(grid.steamTurns).toBe(0);
    const downwind = grid.sampleZone(84, 56, 10);
    expect(downwind.fire).toBeGreaterThan(0.1);
  });
});
