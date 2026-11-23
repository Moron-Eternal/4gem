import { describe, expect, it } from 'vitest';
import { isTileWalkable, KANTO_MAPS } from '../data/maps/kantoMaps';
import { SPECIES } from '../data/species';
import { TRAINERS } from '../data/trainers';
import { OverworldEngine } from '../engine/overworld/overworldEngine';
import { createNewSaveState } from '../engine/save/saveManager';

describe('Kanto FireRed Overworld Map Integrity & NPC Persistence', () => {
  it('verifies every map has consistent row dimensions, walkable warps, and valid NPC placements', () => {
    const maps = Object.values(KANTO_MAPS);
    expect(maps.length).toBe(10);

    for (const map of maps) {
      expect(map.tiles.length).toBe(map.height);
      for (const row of map.tiles) {
        expect(row.length).toBe(map.width);
      }

      for (const warp of map.warps) {
        expect(
          isTileWalkable(map, warp.x, warp.y),
          `Warp source not walkable in ${map.id} at (${warp.x},${warp.y})`
        ).toBe(true);
        const target = KANTO_MAPS[warp.targetMapId];
        expect(target, `Missing warp target map ${warp.targetMapId}`).toBeDefined();
        expect(
          isTileWalkable(target, warp.targetX, warp.targetY),
          `Warp target not walkable in ${target.id} at (${warp.targetX},${warp.targetY})`
        ).toBe(true);
      }

      for (const enc of map.encounters) {
        expect(SPECIES[enc.speciesId]).toBeDefined();
        expect(enc.minLevel).toBeLessThanOrEqual(enc.maxLevel);
      }

      for (const npc of map.npcs) {
        expect(
          isTileWalkable(map, npc.x, npc.y),
          `NPC ${npc.id} on solid tile in ${map.id} at (${npc.x},${npc.y})`
        ).toBe(true);
        if (npc.trainerId) {
          expect(TRAINERS[npc.trainerId]).toBeDefined();
        }
        // Human NPCs must never use 'item_pickup' (only pokeball ground items should disappear)
        if (npc.role === 'item_pickup') {
          expect(npc.spriteStyle).toBe('pokeball');
        }
      }
    }
  });

  it('never hides human trainers or item_giver NPCs after interaction', () => {
    const save = createNewSaveState();
    save.mapId = 'route_1';
    save.collectedItems.push('route1_clerk', 'route1_potion_ball');
    save.defeatedTrainers.push('youngster_joey');

    const engine = new OverworldEngine(save, {
      onWarpBlocked: () => {},
      onMapChanged: () => {},
      onInteractNpc: () => {},
      onReadSign: () => {},
      onWildEncounter: () => {},
      onTrainerSpotted: () => {},
    });

    const visible = engine.getVisibleNpcs(KANTO_MAPS.route_1).map((n) => n.id);
    // Ground Poké Ball disappears once collected, but Mart Clerk & Youngster Joey MUST remain visible!
    expect(visible).not.toContain('route1_potion_ball');
    expect(visible).toContain('route1_clerk');
    expect(visible).toContain('route1_joey');
  });
});
