// Lag-Free Procedural Floating Archipelago Generator for Auralis: The Prism-Tide Firmament
// Uses system.runJob coroutines + cached BlockPermutations + persisted sector registry.

import { world, system, BlockPermutation, ItemStack } from "@minecraft/server";
import {
  DIMENSION_ID,
  SANCTUARY_CENTER,
  FIRST_CITADEL_CENTER,
  DP_SANCTUARY_BUILT,
  DP_GEN_BUCKETS,
  BLOCKS,
  ITEMS,
} from "./constants.js";
import { hash2, hash3, fbm2, getZoneAt, getNearestCitadel } from "./noise.js";

const SECTOR_SIZE = 32;
const MAX_BUCKET_LEN = 24000;
const permCache = new Map();
const generatedSectors = new Set();
const queuedSectors = new Set();
let sectorsLoaded = false;
let sanctuaryBuilding = false;
let activeJobs = 0;

function perm(id, states = undefined) {
  const key = states ? `${id}|${JSON.stringify(states)}` : id;
  let p = permCache.get(key);
  if (!p) {
    p = states ? BlockPermutation.resolve(id, states) : BlockPermutation.resolve(id);
    permCache.set(key, p);
  }
  return p;
}

function setBlk(dim, x, y, z, blockPerm) {
  try {
    if (y < -60 || y > 315) return false;
    const b = dim.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });
    if (!b) return false;
    b.setPermutation(blockPerm);
    return true;
  } catch {
    return false;
  }
}

function loadGeneratedSectors() {
  if (sectorsLoaded) return;
  sectorsLoaded = true;
  for (let i = 0; i < 16; i++) {
    try {
      const raw = world.getDynamicProperty(`${DP_GEN_BUCKETS}${i}`);
      if (typeof raw === "string" && raw.length > 0) {
        for (const k of raw.split(";")) {
          if (k) generatedSectors.add(k);
        }
      }
    } catch {
      break;
    }
  }
}

function persistSector(key) {
  generatedSectors.add(key);
  try {
    const all = Array.from(generatedSectors);
    let bucket = 0;
    let cur = "";
    for (const k of all) {
      if (cur.length + k.length + 1 > MAX_BUCKET_LEN) {
        world.setDynamicProperty(`${DP_GEN_BUCKETS}${bucket}`, cur);
        bucket++;
        cur = k;
        if (bucket >= 16) break;
      } else {
        cur = cur ? `${cur};${k}` : k;
      }
    }
    if (bucket < 16) {
      world.setDynamicProperty(`${DP_GEN_BUCKETS}${bucket}`, cur);
    }
  } catch {
    // Non-fatal persistence skip
  }
}

/**
 * Safely creates a temporary ticking area via TickingAreaManager (with /tickingarea fallback).
 */
export async function withTickingArea(dim, id, from, to, fn) {
  let usedApi = false;
  try {
    if (world.tickingAreaManager && typeof world.tickingAreaManager.createTickingArea === "function") {
      if (world.tickingAreaManager.hasTickingArea(id)) {
        world.tickingAreaManager.removeTickingArea(id);
      }
      await world.tickingAreaManager.createTickingArea(id, { dimension: dim, from, to });
      usedApi = true;
    } else {
      dim.runCommand(`tickingarea add ${Math.floor(from.x)} ${Math.floor(from.y)} ${Math.floor(from.z)} ${Math.floor(to.x)} ${Math.floor(to.y)} ${Math.floor(to.z)} ${id} true`);
      await system.waitTicks(12);
    }
    return await fn();
  } finally {
    try {
      if (usedApi && world.tickingAreaManager.hasTickingArea(id)) {
        world.tickingAreaManager.removeTickingArea(id);
      } else if (!usedApi) {
        dim.runCommand(`tickingarea remove ${id}`);
      }
    } catch {
      // Safe cleanup
    }
  }
}

// =============================================================================
// ARCHITECTURAL & BOTANICAL BUILDING HELPERS
// =============================================================================

function placePrismTree(dim, cx, cy, cz, seed) {
  const height = 5 + Math.floor(hash2(cx, cz, seed) * 4);
  const logP = perm(BLOCKS.PRISM_LOG);
  const leafP = perm(BLOCKS.PRISM_LEAVES);
  const lanternP = perm(BLOCKS.LANTERN_BLOOM);

  for (let y = 0; y < height; y++) {
    setBlk(dim, cx, cy + y, cz, logP);
  }
  // Curved sculptural weeping coral-prism canopy
  const topY = cy + height;
  for (let dy = -1; dy <= 2; dy++) {
    const rad = dy === 2 ? 1.5 : dy === 1 ? 2.6 : 3.2;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= rad + (hash3(cx + dx, topY + dy, cz + dz, seed) - 0.5) * 0.7) {
          if (dx === 0 && dz === 0 && dy < 0) continue;
          setBlk(dim, cx + dx, topY + dy, cz + dz, leafP);
        }
      }
    }
  }
  // Delicate hanging weeping leaf tendrils & Lantern Blooms!
  for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
    if (hash2(cx + dx, cz + dz, seed + 5) > 0.35) {
      setBlk(dim, cx + dx, topY - 2, cz + dz, leafP);
      if (hash2(cx + dx, cz + dz, seed + 9) > 0.55) {
        setBlk(dim, cx + dx, topY - 3, cz + dz, lanternP);
      }
    }
  }
}

function placeAstrolabeRing(dim, cx, cy, cz, radius, tiltX = 0.25, tiltZ = 0.15, useGlassAccent = true) {
  const brass = perm(BLOCKS.GILDED_BRASS);
  const solarium = perm(BLOCKS.SOLARIUM_BLOCK);
  const glass = perm(BLOCKS.STARLIGHT_GLASS);
  const steps = Math.max(36, Math.floor(radius * 7));
  for (let i = 0; i < steps; i++) {
    const ang = (i / steps) * Math.PI * 2;
    const rx = Math.cos(ang) * radius;
    const rz = Math.sin(ang) * radius;
    const ry = rx * Math.sin(tiltX) + rz * Math.sin(tiltZ);
    const bx = Math.round(cx + rx);
    const by = Math.round(cy + ry);
    const bz = Math.round(cz + rz);
    const blk = i % 12 === 0 ? solarium : (useGlassAccent && i % 4 === 0 ? glass : brass);
    setBlk(dim, bx, by, bz, blk);
  }
}

function placeTreasureChest(dim, x, y, z) {
  try {
    setBlk(dim, x, y, z, perm("minecraft:chest"));
    const blk = dim.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });
    const inv = blk?.getComponent("minecraft:inventory")?.container;
    if (!inv) return;
    const pool = [
      [ITEMS.SOLARIUM_INGOT, 2 + Math.floor(hash2(x, z, 11) * 4)],
      [ITEMS.PRISM_SHARD, 4 + Math.floor(hash2(x, z, 12) * 6)],
      [ITEMS.PRISM_BERRY, 3 + Math.floor(hash2(x, z, 13) * 5)],
      [ITEMS.CELESTIAL_NECTAR, 1 + Math.floor(hash2(x, z, 14) * 2)],
    ];
    if (hash2(x, z, 15) > 0.55) pool.push([ITEMS.GALE_PRISM, 1]);
    if (hash2(x, z, 16) > 0.62) pool.push([ITEMS.STAR_CORE, 1]);
    if (hash2(x, z, 17) > 0.72) pool.push([BLOCKS.LANTERN_BLOOM, 2]);

    let slot = 4;
    for (const [id, count] of pool) {
      try {
        inv.setItem(slot, new ItemStack(id, count));
        slot = (slot + 3) % inv.size;
      } catch {
        // Ignore single item fill error
      }
    }
  } catch {
    // Safe fallback
  }
}

// =============================================================================
// 1. GRAND ARRIVAL ATOLL — THE SANCTUARY CROWN (0, 84, 0)
// =============================================================================

function* buildSanctuaryCrownJob(dim) {
  const { x: cx, y: cy, z: cz } = SANCTUARY_CENTER;
  const radius = 22;
  const stone = perm(BLOCKS.AURALITE);
  const star = perm(BLOCKS.STARSTONE);
  const moss = perm(BLOCKS.TIDE_MOSS);
  const gilded = perm(BLOCKS.GILDED_TRAVERTINE);
  const brass = perm(BLOCKS.GILDED_BRASS);
  const solOre = perm(BLOCKS.SOLARIUM_ORE);
  const solBlk = perm(BLOCKS.SOLARIUM_BLOCK);
  const glass = perm(BLOCKS.STARLIGHT_GLASS);
  const water = perm("minecraft:water");
  const veil = perm(BLOCKS.STARLIGHT_VEIL);
  const crystal = perm(BLOCKS.SEA_CRYSTAL);
  const lantern = perm(BLOCKS.LANTERN_BLOOM);
  const reed = perm(BLOCKS.CHIME_REED);
  const astrolabeOn = perm(BLOCKS.ASTROLABE, { "auralis:attuned": true });

  let ops = 0;

  // 1. Sculpted Multi-Tiered Floating Island Body + Tapered Starstone Stalactite Underbelly
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      const dist = Math.hypot(dx, dz);
      const edgeNoise = (fbm2((cx + dx) * 0.11, (cz + dz) * 0.11, 2, 11) - 0.5) * 4.2;
      const effR = radius + edgeNoise;
      if (dist > effR) continue;

      const norm = 1.0 - dist / effR;
      // Terraced porcelain plateau profile: raised central Sanctuary dais!
      const topH = dist < 8.5 ? 2 : dist < 14 ? 1 : 0;
      const depth = Math.max(2, Math.floor(Math.pow(norm, 1.15) * 19 + hash2(dx, dz, 3) * 3));

      for (let dy = -depth; dy <= topH; dy++) {
        let p = stone;
        if (dy === topH) {
          // Central Observatory Dais vs Outer Tide-Moss Gardens
          if (dist < 6.8) {
            p = dist > 5.4 ? brass : gilded;
          } else if (Math.abs(dx) <= 1 && dz > 6 && dz < 16) {
            // Southern aquamarine stream feeding the starlight waterfall!
            p = water;
            setBlk(dim, cx + dx, cy + dy - 1, cz + dz, glass);
          } else if (Math.abs(dx) <= 1 && dz < -6 && dz > -21) {
            // Northern gilded walkway pointing toward the Astral Citadel!
            p = gilded;
          } else {
            p = moss;
          }
        } else if (dy < -3) {
          p = hash3(dx, dy, dz, 55) > 0.94 ? solOre : star;
        }
        setBlk(dim, cx + dx, cy + dy, cz + dz, p);
        if (++ops % 45 === 0) yield;
      }

      // Lush organic surface flora on outer moss ring
      if (dist >= 9.5 && dist <= effR - 2.2 && !(Math.abs(dx) <= 2 && Math.abs(dz) > 6)) {
        const r = hash2(dx, dz, 88);
        if (r > 0.965) {
          setBlk(dim, cx + dx, cy + topH + 1, cz + dz, crystal);
        } else if (r > 0.925 && r <= 0.955) {
          setBlk(dim, cx + dx, cy + topH + 1, cz + dz, reed);
        }
      }
    }
  }

  // 2. Cascading Starlight Waterfall plunging off South edge into the Rose-Gold Cloud Sea!
  for (let wy = cy; wy >= 34; wy--) {
    for (let dx = -1; dx <= 1; dx++) {
      setBlk(dim, cx + dx, wy, cz + 17, water);
    }
    if (++ops % 30 === 0) yield;
  }

  // 3. Central Astral Mirror Observatory (Awakened Return Astrolabe + 3x3 Starlight Veil + 4 Arches!)
  const oy = cy + 2;
  setBlk(dim, cx, oy, cz, astrolabeOn);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    setBlk(dim, cx + dx, oy, cz + dz, veil);
    setBlk(dim, cx + dx, oy - 1, cz + dz, solBlk);
  }
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    setBlk(dim, cx + dx, oy, cz + dz, brass);
  }

  // Four soaring Alabaster & Gold Observatory Pillars + Connecting Crown Archways
  const pillars = [[5, 5], [5, -5], [-5, 5], [-5, -5]];
  for (const [px, pz] of pillars) {
    for (let h = 1; h <= 8; h++) {
      setBlk(dim, cx + px, oy + h, cz + pz, h === 1 || h === 8 ? brass : gilded);
    }
    setBlk(dim, cx + px, oy + 9, cz + pz, lantern);
    yield;
  }
  // Graceful starlight glass & brass high bridge arcs between pillars
  for (let i = -4; i <= 4; i++) {
    const archH = Math.round(9 + Math.cos((i / 4.5) * (Math.PI / 2)) * 3.2);
    const blk = Math.abs(i) <= 1 ? solBlk : (Math.abs(i) % 2 === 0 ? brass : glass);
    setBlk(dim, cx + i, oy + archH, cz - 5, blk);
    setBlk(dim, cx + i, oy + archH, cz + 5, blk);
    setBlk(dim, cx - 5, oy + archH, cz + i, blk);
    setBlk(dim, cx + 5, oy + archH, cz + i, blk);
  }
  yield;

  // 4. Giant Hovering Golden Astrolabe Rings framing the Sanctuary Crown in the twilight sky!
  placeAstrolabeRing(dim, cx, cy + 18, cz, 19, 0.36, 0.14, true);
  yield;
  placeAstrolabeRing(dim, cx, cy + 16, cz, 15, -0.28, 0.34, false);
  yield;

  // 5. Four Signature Prism-Coral Trees gracing the Sanctuary terraces
  for (const [tx, tz] of [[-12, -10], [13, -9], [-13, 8], [12, 10]]) {
    placePrismTree(dim, cx + tx, cy + 1, cz + tz, 300 + tx * 7 + tz);
    yield;
  }

  // 6. Three Stepping-Stone Prism Islets leading North toward the First Astral Citadel!
  for (let step = 1; step <= 3; step++) {
    const iz = cz - 28 - step * 18;
    const ix = cx + (step % 2 === 0 ? 4 : -4);
    const iy = cy + step * 4;
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= 4.2) {
          setBlk(dim, ix + dx, iy, iz + dz, d < 2 ? gilded : moss);
          setBlk(dim, ix + dx, iy - 1, iz + dz, stone);
          if (d < 2.6) setBlk(dim, ix + dx, iy - 2, iz + dz, star);
        }
      }
    }
    setBlk(dim, ix, iy + 1, iz, step === 2 ? lantern : crystal);
    yield;
  }

  // Mark origin sectors as generated so procedural gen doesn't overwrite Sanctuary
  for (let sx = -1; sx <= 1; sx++) {
    for (let sz = -1; sz <= 1; sz++) {
      persistSector(`${sx},${sz}`);
    }
  }
  world.setDynamicProperty(DP_SANCTUARY_BUILT, true);
}

// =============================================================================
// 2. PROCEDURAL FLOATING ISLANDS, SPIRE GARDENS, BELL-REEFS & ASTRAL CITADELS
// =============================================================================

function* buildAstralCitadelJob(dim, cx, cy, cz) {
  const R = 19;
  const gilded = perm(BLOCKS.GILDED_TRAVERTINE);
  const stone = perm(BLOCKS.AURALITE);
  const star = perm(BLOCKS.STARSTONE);
  const brass = perm(BLOCKS.GILDED_BRASS);
  const solBlk = perm(BLOCKS.SOLARIUM_BLOCK);
  const glass = perm(BLOCKS.STARLIGHT_GLASS);
  const lantern = perm(BLOCKS.LANTERN_BLOOM);
  const altar = perm(BLOCKS.VESPERA_ALTAR);

  let ops = 0;
  // Circular marble-and-starstone palace arena platform
  for (let dx = -R; dx <= R; dx++) {
    for (let dz = -R; dz <= R; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > R) continue;
      const depth = Math.max(2, Math.floor((1 - d / R) * 14));
      for (let dy = -depth; dy <= 0; dy++) {
        let p = dy < -3 ? star : stone;
        if (dy === 0) {
          if (d < 3.5) p = brass;
          else if (Math.abs(d - 11) < 1.2 || d > R - 1.5) p = brass;
          else if ((Math.abs(dx) <= 1 || Math.abs(dz) <= 1) && d < R - 1) p = solBlk;
          else p = gilded;
        }
        setBlk(dim, cx + dx, cy + dy, cz + dz, p);
        if (++ops % 45 === 0) yield;
      }
    }
  }

  // 8 Towering Colonnade Pillars + Glowing Dome Ribs
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const px = Math.round(cx + Math.cos(ang) * 15);
    const pz = Math.round(cz + Math.sin(ang) * 15);
    for (let h = 1; h <= 13; h++) {
      setBlk(dim, px, cy + h, pz, h % 4 === 0 ? brass : gilded);
    }
    setBlk(dim, px, cy + 14, pz, lantern);
    // Graceful starlight-glass dome rib arching toward zenith!
    for (let s = 1; s <= 10; s++) {
      const t = s / 10;
      const rx = Math.round(cx + Math.cos(ang) * (15 * (1 - t)));
      const rz = Math.round(cz + Math.sin(ang) * (15 * (1 - t)));
      const ry = Math.round(cy + 13 + Math.sin(t * Math.PI * 0.5) * 9);
      setBlk(dim, rx, ry, rz, s % 3 === 0 ? brass : glass);
    }
    yield;
  }

  // Twin majestic interlocking Golden Astrolabe Rings crowning the Citadel!
  placeAstrolabeRing(dim, cx, cy + 16, cz, 21, 0.32, -0.22, true);
  yield;
  placeAstrolabeRing(dim, cx, cy + 16, cz, 17, -0.35, 0.28, false);
  yield;

  // Vespera Sanctum Altar at the heart of the Citadel!
  setBlk(dim, cx, cy + 1, cz, altar);
  // Two treasure chests tucked near the outer pillars
  placeTreasureChest(dim, cx + 12, cy + 1, cz);
  placeTreasureChest(dim, cx - 12, cy + 1, cz);
}

function* buildPearlAtollJob(dim, cx, cy, cz, seed) {
  const rad = 8 + Math.floor(hash2(cx, cz, seed) * 8);
  const stone = perm(BLOCKS.AURALITE);
  const star = perm(BLOCKS.STARSTONE);
  const moss = perm(BLOCKS.TIDE_MOSS);
  const solOre = perm(BLOCKS.SOLARIUM_ORE);
  const water = perm("minecraft:water");
  const crystal = perm(BLOCKS.SEA_CRYSTAL);
  const reed = perm(BLOCKS.CHIME_REED);
  const lantern = perm(BLOCKS.LANTERN_BLOOM);
  const hasPool = rad >= 11 && hash2(cx, cz, seed + 2) > 0.35;
  let ops = 0;

  for (let dx = -rad; dx <= rad; dx++) {
    for (let dz = -rad; dz <= rad; dz++) {
      const dist = Math.hypot(dx, dz);
      const jitter = (fbm2((cx + dx) * 0.14, (cz + dz) * 0.14, 2, seed) - 0.5) * 3.4;
      const eff = rad + jitter;
      if (dist > eff) continue;
      const norm = 1.0 - dist / eff;
      const topOff = norm > 0.55 ? 1 : 0;
      const depth = Math.max(2, Math.floor(Math.pow(norm, 1.15) * (rad * 0.95)));

      for (let dy = -depth; dy <= topOff; dy++) {
        let p = stone;
        if (dy === topOff) {
          if (hasPool && dist < 3.4) {
            p = water;
            setBlk(dim, cx + dx, cy + dy - 1, cz + dz, stone);
          } else {
            p = moss;
          }
        } else if (dy < -2) {
          p = hash3(cx + dx, cy + dy, cz + dz, seed) > 0.935 ? solOre : star;
        }
        setBlk(dim, cx + dx, cy + dy, cz + dz, p);
        if (++ops % 45 === 0) yield;
      }

      // Surface crystals & chime reeds
      if (!(hasPool && dist < 4.0) && dist < eff - 1.5) {
        const r = hash2(cx + dx, cz + dz, seed + 21);
        if (r > 0.965) setBlk(dim, cx + dx, cy + topOff + 1, cz + dz, crystal);
        else if (r > 0.935 && r <= 0.955) setBlk(dim, cx + dx, cy + topOff + 1, cz + dz, reed);
      }
    }
  }

  // Signature Prism-Coral Tree(s)
  const treeCount = rad >= 12 ? 2 : 1;
  for (let i = 0; i < treeCount; i++) {
    const ang = hash2(cx + i, cz - i, seed + 40) * Math.PI * 2;
    const dist = hasPool ? Math.min(rad - 3, 5.5) : 2.0;
    const tx = Math.round(cx + Math.cos(ang) * dist);
    const tz = Math.round(cz + Math.sin(ang) * dist);
    placePrismTree(dim, tx, cy + 2, tz, seed + i * 19);
    yield;
  }

  // Occasional cascading starlight waterfall down to the cloud sea!
  if (hasPool && hash2(cx, cz, seed + 77) > 0.45) {
    const wx = cx + Math.floor(rad - 1);
    for (let wy = cy; wy >= 34; wy--) {
      setBlk(dim, wx, wy, cz, water);
      if (++ops % 30 === 0) yield;
    }
  } else {
    setBlk(dim, cx, cy + 2, cz, lantern);
  }
}

function* buildSpireGardenJob(dim, cx, cy, cz, seed) {
  const baseRad = 6 + Math.floor(hash2(cx, cz, seed) * 5);
  const spireH = 16 + Math.floor(hash2(cx, cz, seed + 3) * 18);
  const gilded = perm(BLOCKS.GILDED_TRAVERTINE);
  const stone = perm(BLOCKS.AURALITE);
  const star = perm(BLOCKS.STARSTONE);
  const solOre = perm(BLOCKS.SOLARIUM_ORE);
  const solBlk = perm(BLOCKS.SOLARIUM_BLOCK);
  const brass = perm(BLOCKS.GILDED_BRASS);
  const glass = perm(BLOCKS.STARLIGHT_GLASS);
  const lantern = perm(BLOCKS.LANTERN_BLOOM);
  let ops = 0;

  // Tapered cathedral needle rising high into twilight + sharp starstone root below!
  for (let dy = -baseRad * 2; dy <= spireH; dy++) {
    const t = dy >= 0 ? 1.0 - dy / (spireH + 2) : 1.0 - Math.abs(dy) / (baseRad * 2 + 1);
    const r = Math.max(0.8, baseRad * Math.pow(t, 0.85));
    const ir = Math.ceil(r);
    for (let dx = -ir; dx <= ir; dx++) {
      for (let dz = -ir; dz <= ir; dz++) {
        if (Math.hypot(dx, dz) <= r) {
          let p = stone;
          if (dy < -2) p = hash3(cx + dx, cy + dy, cz + dz, seed) > 0.91 ? solOre : star;
          else if (dy === 0 || dy % 6 === 0) p = brass;
          else if (Math.abs(dx) === Math.floor(r) || Math.abs(dz) === Math.floor(r)) p = gilded;
          else if (dy > spireH - 4) p = glass;
          setBlk(dim, cx + dx, cy + dy, cz + dz, p);
          if (++ops % 45 === 0) yield;
        }
      }
    }
  }
  setBlk(dim, cx, cy + spireH + 1, cz, solBlk);
  setBlk(dim, cx, cy + spireH + 2, cz, lantern);

  // Floating Golden Astrolabe Ring orbiting the Spire Garden pinnacle!
  placeAstrolabeRing(dim, cx, cy + Math.floor(spireH * 0.65), cz, baseRad + 4, 0.35, -0.25, true);
  yield;
}

function* buildBellReefJob(dim, cx, cy, cz, seed) {
  const rad = 10 + Math.floor(hash2(cx, cz, seed) * 6);
  const stone = perm(BLOCKS.AURALITE);
  const star = perm(BLOCKS.STARSTONE);
  const moss = perm(BLOCKS.TIDE_MOSS);
  const gilded = perm(BLOCKS.GILDED_TRAVERTINE);
  const brass = perm(BLOCKS.GILDED_BRASS);
  const crystal = perm(BLOCKS.SEA_CRYSTAL);
  const lantern = perm(BLOCKS.LANTERN_BLOOM);
  const reed = perm(BLOCKS.CHIME_REED);
  const water = perm("minecraft:water");
  let ops = 0;

  // Low-altitude flooded turquoise reef lagoon hovering right above the cloud sea!
  for (let dx = -rad; dx <= rad; dx++) {
    for (let dz = -rad; dz <= rad; dz++) {
      const dist = Math.hypot(dx, dz);
      const eff = rad + (fbm2((cx + dx) * 0.15, (cz + dz) * 0.15, 2, seed) - 0.5) * 3.0;
      if (dist > eff) continue;
      const isBasin = dist < eff - 3.2;
      const depth = Math.max(3, Math.floor((1 - dist / eff) * 8));

      for (let dy = -depth; dy <= 0; dy++) {
        let p = dy < -3 ? star : stone;
        if (dy === 0) p = isBasin ? water : moss;
        else if (dy === -1 && isBasin) p = water;
        else if (dy === -2 && isBasin) p = hash2(cx + dx, cz + dz, seed + 9) > 0.88 ? crystal : stone;
        setBlk(dim, cx + dx, cy + dy, cz + dz, p);
        if (++ops % 45 === 0) yield;
      }

      if (!isBasin && hash2(cx + dx, cz + dz, seed + 31) > 0.91) {
        setBlk(dim, cx + dx, cy + 1, cz + dz, hash2(dx, dz, seed) > 0.5 ? crystal : reed);
      }
    }
  }

  // Ruined Alabaster Bell-Temple Pavilion in the center of the lagoon + Treasure Chest!
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      setBlk(dim, cx + dx, cy, cz + dz, Math.abs(dx) === 2 || Math.abs(dz) === 2 ? brass : gilded);
    }
  }
  for (const [px, pz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    for (let h = 1; h <= 5; h++) {
      setBlk(dim, cx + px, cy + h, cz + pz, h === 5 ? brass : gilded);
    }
  }
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) + Math.abs(dz) <= 3) {
        setBlk(dim, cx + dx, cy + 6, cz + dz, brass);
      }
    }
  }
  setBlk(dim, cx, cy + 5, cz, lantern);
  placeTreasureChest(dim, cx, cy + 1, cz);
  yield;
}

function* generateSectorJob(dim, sx, sz) {
  const key = `${sx},${sz}`;
  activeJobs++;
  try {
    const worldX = sx * SECTOR_SIZE + 16;
    const worldZ = sz * SECTOR_SIZE + 16;

    // Check if an Astral Citadel belongs in this exact sector!
    const nearestCitadel = getNearestCitadel(worldX, worldZ);
    const citSx = Math.floor(nearestCitadel.x / SECTOR_SIZE);
    const citSz = Math.floor(nearestCitadel.z / SECTOR_SIZE);
    if (citSx === sx && citSz === sz) {
      yield* buildAstralCitadelJob(dim, nearestCitadel.x, nearestCitadel.y, nearestCitadel.z);
      persistSector(key);
      return;
    }
    // Leave scenic sky clearance immediately around a Citadel
    if (nearestCitadel.distance < 36) {
      persistSector(key);
      return;
    }

    // Decide whether this 32x32 sector hosts a floating island (~68% density -> dramatic vistas!)
    const roll = hash2(sx, sz, 404);
    if (roll > 0.68) {
      persistSector(key);
      return;
    }

    const ox = sx * SECTOR_SIZE + 8 + Math.floor(hash2(sx, sz, 405) * 16);
    const oz = sz * SECTOR_SIZE + 8 + Math.floor(hash2(sx, sz, 406) * 16);
    const zone = getZoneAt(ox, oz);
    const seed = Math.abs(sx * 73856093 ^ sz * 19349663) % 100000;

    if (zone === "spire_gardens") {
      const oy = 90 + Math.floor(hash2(sx, sz, 407) * 34);
      yield* buildSpireGardenJob(dim, ox, oy, oz, seed);
    } else if (zone === "bell_reefs") {
      const oy = 56 + Math.floor(hash2(sx, sz, 408) * 16);
      yield* buildBellReefJob(dim, ox, oy, oz, seed);
    } else {
      const oy = 74 + Math.floor(hash2(sx, sz, 409) * 32);
      yield* buildPearlAtollJob(dim, ox, oy, oz, seed);
    }

    persistSector(key);
  } finally {
    queuedSectors.delete(key);
    activeJobs = Math.max(0, activeJobs - 1);
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

export async function ensureSanctuaryReady() {
  loadGeneratedSectors();
  if (world.getDynamicProperty(DP_SANCTUARY_BUILT) === true) {
    return true;
  }
  if (sanctuaryBuilding) {
    for (let i = 0; i < 60 && sanctuaryBuilding; i++) {
      await system.waitTicks(5);
    }
    return true;
  }

  sanctuaryBuilding = true;
  try {
    const dim = world.getDimension(DIMENSION_ID);
    await withTickingArea(
      dim,
      "auralis_sanctuary_init",
      { x: -32, y: 20, z: -96 },
      { x: 32, y: 140, z: 32 },
      async () => {
        await new Promise((resolve) => {
          system.runJob(
            (function* () {
              yield* buildSanctuaryCrownJob(dim);
              resolve();
            })()
          );
        });
      }
    );
    return true;
  } catch (err) {
    console.warn(`[Auralis] Sanctuary init notice: ${err}`);
    return false;
  } finally {
    sanctuaryBuilding = false;
  }
}

/**
 * Called periodically while players explore Auralis — smoothly streams surrounding
 * floating archipelago sectors without ever causing lag spikes.
 */
export function tickWorldGen() {
  loadGeneratedSectors();
  if (activeJobs >= 2) return;

  let dim;
  try {
    dim = world.getDimension(DIMENSION_ID);
  } catch {
    return;
  }

  const players = dim.getPlayers();
  if (players.length === 0) return;

  for (const player of players) {
    if (activeJobs >= 2) break;
    const loc = player.location;
    const psx = Math.floor(loc.x / SECTOR_SIZE);
    const psz = Math.floor(loc.z / SECTOR_SIZE);

    // Spiral outward from player up to radius 3 sectors (~96 blocks)
    for (let r = 0; r <= 3 && activeJobs < 2; r++) {
      for (let dx = -r; dx <= r && activeJobs < 2; dx++) {
        for (let dz = -r; dz <= r && activeJobs < 2; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const sx = psx + dx;
          const sz = psz + dz;
          const key = `${sx},${sz}`;
          if (generatedSectors.has(key) || queuedSectors.has(key)) continue;

          // Verify center of sector is loaded before running job
          try {
            const probe = dim.getBlock({
              x: sx * SECTOR_SIZE + 16,
              y: 80,
              z: sz * SECTOR_SIZE + 16,
            });
            if (!probe) continue;
          } catch {
            continue;
          }

          queuedSectors.add(key);
          system.runJob(generateSectorJob(dim, sx, sz));
        }
      }
    }
  }
}

export function getGeneratedSectorCount() {
  loadGeneratedSectors();
  return generatedSectors.size;
}
