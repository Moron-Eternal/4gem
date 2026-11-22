// Worldgen 2.1 — Guaranteed Infinite Non-Overlapping 80x80 Macro-Cell Floating Archipelago,
// Walkable Cloud-Shelf Plains, 6 Enriched Architectural Landmarks & Grounded Crystal Geode Outcrops
// for Auralis: The Prism-Tide Firmament.
//
// Uses temporary TickingAreaManager areas per macro-cell so islands stream reliably at ANY
// Bedrock Simulation Distance (including default Sim Distance 4!) with ZERO chunk-boundary slicing
// and ZERO island-to-island clipping.

import { world, system, BlockPermutation, ItemStack } from "@minecraft/server";
import {
  DIMENSION_ID,
  SANCTUARY_CENTER,
  DP_SANCTUARY_BUILT,
  DP_GEN_BUCKETS,
  BLOCKS,
  ITEMS,
} from "./constants.js";
import {
  hash2,
  hash3,
  fbm2,
  worldToCell,
  getCellLayout,
} from "./noise.js";

const MAX_BUCKET_LEN = 24000;
const YIELD_STRIDE = 72;
const permCache = new Map();
const generatedCells = new Set();
const queuedCells = new Set();
const failedCellRetryTick = new Map();
let cellsLoaded = false;
let sanctuaryBuilding = false;
let activeJobs = 0;
let activeCellInfo = null;

function perm(id, states = undefined) {
  const key = states ? `${id}|${JSON.stringify(states)}` : id;
  let p = permCache.get(key);
  if (!p) {
    p = states ? BlockPermutation.resolve(id, states) : BlockPermutation.resolve(id);
    permCache.set(key, p);
  }
  return p;
}

function clampInt(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function setBlk(dim, x, y, z, blockPerm, ctx = null) {
  try {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    if (iy < -60 || iy > 315) return false;
    if (ctx?.bounds) {
      if (ix < ctx.bounds.minX || ix > ctx.bounds.maxX || iz < ctx.bounds.minZ || iz > ctx.bounds.maxZ) {
        return false;
      }
    }
    const b = dim.getBlock({ x: ix, y: iy, z: iz });
    if (!b) {
      if (ctx) ctx.missedWrites++;
      return false;
    }
    b.setPermutation(blockPerm);
    return true;
  } catch {
    if (ctx) ctx.missedWrites++;
    return false;
  }
}

function loadGeneratedCells() {
  if (cellsLoaded) return;
  cellsLoaded = true;
  for (let i = 0; i < 16; i++) {
    try {
      const raw = world.getDynamicProperty(`${DP_GEN_BUCKETS}${i}`);
      if (typeof raw === "string" && raw.length > 0) {
        for (const k of raw.split(";")) {
          if (k) generatedCells.add(k);
        }
      }
    } catch {
      break;
    }
  }
}

function persistCell(key) {
  generatedCells.add(key);
  try {
    const all = Array.from(generatedCells);
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
 * Cleans up any leftover add-on ticking areas from interrupted sessions on worldLoad.
 */
export function cleanupWorldGenTickingAreas() {
  try {
    if (world.tickingAreaManager && typeof world.tickingAreaManager.removeAllTickingAreas === "function") {
      world.tickingAreaManager.removeAllTickingAreas();
    }
  } catch {
    // Safe fallback
  }
}

/**
 * Safely creates a temporary ticking area via TickingAreaManager (with /tickingarea fallback)
 * so macro-cell generation succeeds reliably at ANY Simulation Distance (including default 4!).
 */
export async function withTickingArea(dim, id, from, to, fn) {
  let usedApi = false;
  let usedCmd = false;
  const fromLoc = { x: Math.floor(from.x), y: Math.floor(from.y), z: Math.floor(from.z) };
  const toLoc = { x: Math.floor(to.x), y: Math.floor(to.y), z: Math.floor(to.z) };

  try {
    const tam = world.tickingAreaManager;
    if (tam && typeof tam.createTickingArea === "function") {
      try {
        if (typeof tam.hasTickingArea === "function" && tam.hasTickingArea(id)) {
          tam.removeTickingArea(id);
        }
        const opts = { dimension: dim, from: fromLoc, to: toLoc };
        // If another temporary Auralis ticking area (e.g. player teleport) is finishing up, wait briefly
        for (let wait = 0; wait < 5; wait++) {
          const hasCap = typeof tam.hasCapacity === "function" ? tam.hasCapacity(opts) : true;
          if (hasCap) break;
          await system.waitTicks(4);
        }
        const hasCap = typeof tam.hasCapacity === "function" ? tam.hasCapacity(opts) : true;
        if (hasCap) {
          await tam.createTickingArea(id, opts);
          usedApi = true;
        }
      } catch {
        usedApi = false;
      }
    }
    if (!usedApi) {
      dim.runCommand(
        `tickingarea add ${fromLoc.x} ${fromLoc.y} ${fromLoc.z} ${toLoc.x} ${toLoc.y} ${toLoc.z} ${id} true`
      );
      usedCmd = true;
      await system.waitTicks(12);
    } else {
      await system.waitTicks(1);
    }
    return await fn();
  } finally {
    try {
      if (usedApi && world.tickingAreaManager?.hasTickingArea(id)) {
        world.tickingAreaManager.removeTickingArea(id);
      } else if (usedCmd) {
        dim.runCommand(`tickingarea remove ${id}`);
      }
    } catch {
      // Safe cleanup
    }
  }
}

// =============================================================================
// CURATED BOTANICAL, GEOLOGICAL & ARCHITECTURAL HELPERS
// =============================================================================

const NON_GROUND_IDS = new Set([
  "minecraft:air",
  "minecraft:water",
  "minecraft:flowing_water",
  BLOCKS.PRISM_LEAVES,
  BLOCKS.LANTERN_BLOOM,
  BLOCKS.CHIME_REED,
  BLOCKS.SEA_CRYSTAL,
]);

/**
 * Finds the highest solid terrain block at (x, z) within [minY..maxY]
 * so trees, crystal outcrops, and updraft vents NEVER float or get buried on slopes!
 */
function findLocalTopY(dim, x, z, maxY, minY) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  for (let y = Math.floor(maxY); y >= Math.floor(minY); y--) {
    try {
      const b = dim.getBlock({ x: ix, y, z: iz });
      if (!b) continue;
      if (!NON_GROUND_IDS.has(b.typeId)) return y;
    } catch {
      // Ignore probe error
    }
  }
  return null;
}

function groundFoundationColumn(dim, x, startY, maxDepth, fillPerm, ctx) {
  const ix = Math.floor(x);
  const iz = Math.floor(startY.z);
  for (let d = 1; d <= maxDepth; d++) {
    const y = Math.floor(startY.y) - d;
    try {
      const below = dim.getBlock({ x: ix, y, z: iz });
      if (below && below.typeId !== "minecraft:air") break;
      setBlk(dim, ix, y, iz, fillPerm, ctx);
    } catch {
      break;
    }
  }
}

function placePrismTree(dim, cx, cy, cz, seed, ctx) {
  const groundY = findLocalTopY(dim, cx, cz, cy + 4, cy - 4);
  if (groundY === null) return;
  const baseY = groundY + 1;

  const height = 5 + Math.floor(hash2(cx, cz, seed) * 4);
  const logP = perm(BLOCKS.PRISM_LOG);
  const leafP = perm(BLOCKS.PRISM_LEAVES);
  const lanternP = perm(BLOCKS.LANTERN_BLOOM);

  for (let y = 0; y < height; y++) {
    setBlk(dim, cx, baseY + y, cz, logP, ctx);
  }
  const topY = baseY + height;
  for (let dy = -1; dy <= 2; dy++) {
    const rad = dy === 2 ? 1.6 : dy === 1 ? 2.7 : 3.3;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= rad + (hash3(cx + dx, topY + dy, cz + dz, seed) - 0.5) * 0.65) {
          if (dx === 0 && dz === 0 && dy < 0) continue;
          setBlk(dim, cx + dx, topY + dy, cz + dz, leafP, ctx);
        }
      }
    }
  }
  // Delicate hanging weeping leaf tendrils & Lantern Blooms
  for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
    if (hash2(cx + dx, cz + dz, seed + 5) > 0.35) {
      setBlk(dim, cx + dx, topY - 2, cz + dz, leafP, ctx);
      if (hash2(cx + dx, cz + dz, seed + 9) > 0.55) {
        setBlk(dim, cx + dx, topY - 3, cz + dz, lanternP, ctx);
      }
    }
  }
}

/**
 * Grounded Rocky Crystal Geode Outcrop — replaces awkward random single crystals!
 * Snaps cleanly to local terrain height, back-fills any slope step under the rock base,
 * and seats 2..4 Sea-Crystal clusters intentionally atop Starstone/Auralite rock.
 */
function placeCrystalOutcrop(dim, cx, cy, cz, seed, ctx) {
  const groundY = findLocalTopY(dim, cx, cz, cy + 4, cy - 4);
  if (groundY === null) return;
  const baseY = groundY + 1;

  const star = perm(BLOCKS.STARSTONE);
  const stone = perm(BLOCKS.AURALITE);
  const crystal = perm(BLOCKS.SEA_CRYSTAL);

  const offsets = [
    [0, 0, 0, star],
    [1, 0, 0, star],
    [-1, 0, 0, stone],
    [0, 0, 1, stone],
    [0, 0, -1, star],
    [0, 1, 0, star],
  ];
  for (const [dx, dy, dz, blk] of offsets) {
    setBlk(dim, cx + dx, baseY + dy, cz + dz, blk, ctx);
    if (dy === 0) {
      groundFoundationColumn(dim, cx + dx, { y: baseY, z: cz + dz }, 2, stone, ctx);
    }
  }
  // Grounded crystal shards resting cleanly on rock faces
  setBlk(dim, cx, baseY + 2, cz, crystal, ctx);
  if (hash2(cx, cz, seed + 1) > 0.25) setBlk(dim, cx + 1, baseY + 1, cz, crystal, ctx);
  if (hash2(cx, cz, seed + 2) > 0.35) setBlk(dim, cx, baseY + 1, cz - 1, crystal, ctx);
  if (hash2(cx, cz, seed + 3) > 0.55) setBlk(dim, cx - 1, baseY + 1, cz, crystal, ctx);
}

function placeAstrolabeRing(dim, cx, cy, cz, radius, tiltX = 0.25, tiltZ = 0.15, useGlassAccent = true, ctx = null) {
  const brass = perm(BLOCKS.GILDED_BRASS);
  const solarium = perm(BLOCKS.SOLARIUM_BLOCK);
  const glass = perm(BLOCKS.STARLIGHT_GLASS);
  const steps = Math.max(40, Math.floor(radius * 7));
  for (let i = 0; i < steps; i++) {
    const ang = (i / steps) * Math.PI * 2;
    const rx = Math.cos(ang) * radius;
    const rz = Math.sin(ang) * radius;
    const ry = rx * Math.sin(tiltX) + rz * Math.sin(tiltZ);
    const bx = Math.round(cx + rx);
    const by = Math.round(cy + ry);
    const bz = Math.round(cz + rz);
    const blk = i % 12 === 0 ? solarium : (useGlassAccent && i % 4 === 0 ? glass : brass);
    setBlk(dim, bx, by, bz, blk, ctx);
  }
}

function placeTreasureChest(dim, x, y, z, ctx) {
  try {
    setBlk(dim, x, y, z, perm("minecraft:chest"), ctx);
    const blk = dim.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });
    const inv = blk?.getComponent("minecraft:inventory")?.container;
    if (!inv) return;
    const pool = [
      [ITEMS.SOLARIUM_INGOT, 2 + Math.floor(hash2(x, z, 11) * 4)],
      [ITEMS.PRISM_SHARD, 4 + Math.floor(hash2(x, z, 12) * 6)],
      [ITEMS.PRISM_BERRY, 3 + Math.floor(hash2(x, z, 13) * 5)],
      [ITEMS.CELESTIAL_NECTAR, 1 + Math.floor(hash2(x, z, 14) * 2)],
    ];
    if (hash2(x, z, 15) > 0.50) pool.push([ITEMS.GALE_PRISM, 1]);
    if (hash2(x, z, 16) > 0.56) pool.push([ITEMS.STAR_CORE, 1]);
    if (hash2(x, z, 17) > 0.60) pool.push([BLOCKS.LANTERN_BLOOM, 2]);
    if (hash2(x, z, 18) > 0.52) pool.push([BLOCKS.CLOUD_VENT, 1]);

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

/**
 * Builds a lower walkable Cloud-Landing Shelf with a glowing Updraft Cloud-Vent
 * tucked strictly inside the macro-cell's safe bounds so explorers can glide down and
 * ride the breeze effortlessly back up without endless bridging!
 */
function* placeLowerCloudShelfJob(dim, rawCx, cy, rawCz, rad, seed, ctx) {
  const b = ctx?.bounds;
  const cx = b ? clampInt(rawCx, b.minX + rad + 2, b.maxX - rad - 2) : Math.round(rawCx);
  const cz = b ? clampInt(rawCz, b.minZ + rad + 2, b.maxZ - rad - 2) : Math.round(rawCz);

  const cloud = perm(BLOCKS.CLOUDSTONE);
  const rose = perm(BLOCKS.ROSE_CLOUD);
  const vent = perm(BLOCKS.CLOUD_VENT);
  const brass = perm(BLOCKS.GILDED_BRASS);
  const lantern = perm(BLOCKS.LANTERN_BLOOM);
  const air = perm("minecraft:air");
  let ops = 0;

  for (let dx = -rad; dx <= rad; dx++) {
    for (let dz = -rad; dz <= rad; dz++) {
      const d = Math.hypot(dx, dz);
      const eff = rad + (fbm2((cx + dx) * 0.16, (cz + dz) * 0.16, 2, seed + 7) - 0.5) * 2.6;
      if (d > eff) continue;
      const norm = 1.0 - d / eff;
      const depth = Math.max(1, Math.floor(norm * 4.2));
      for (let dy = -depth; dy <= 0; dy++) {
        const isRim = d > eff - 2.6 || dy === -depth;
        setBlk(dim, cx + dx, cy + dy, cz + dz, isRim ? rose : cloud, ctx);
        if (++ops % YIELD_STRIDE === 0) yield;
      }
    }
  }
  // Ornate brass-rimmed Updraft Cloud-Vent pad + twin beacon lanterns at shelf center
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    setBlk(dim, cx + dx, cy, cz + dz, brass, ctx);
    setBlk(dim, cx + dx, cy + 1, cz + dz, air, ctx);
  }
  setBlk(dim, cx, cy, cz, vent, ctx);
  setBlk(dim, cx, cy + 1, cz, air, ctx);
  setBlk(dim, cx, cy + 2, cz, air, ctx);
  setBlk(dim, cx + 4, cy + 1, cz, lantern, ctx);
  setBlk(dim, cx - 4, cy + 1, cz, lantern, ctx);
}

/**
 * Curated Architectural Building: Ornate Wayfarer's Sky-Pavilion (11x11 domed tea-shrine!)
 */
function* placeWayfarerPavilionJob(dim, cx, cy, cz, ctx) {
  const gilded = perm(BLOCKS.GILDED_TRAVERTINE);
  const stone = perm(BLOCKS.AURALITE);
  const brass = perm(BLOCKS.GILDED_BRASS);
  const planks = perm(BLOCKS.PRISM_PLANKS);
  const log = perm(BLOCKS.PRISM_LOG);
  const glass = perm(BLOCKS.STARLIGHT_GLASS);
  const lantern = perm(BLOCKS.LANTERN_BLOOM);
  const solBlk = perm(BLOCKS.SOLARIUM_BLOCK);
  const reed = perm(BLOCKS.CHIME_REED);
  const air = perm("minecraft:air");
  let ops = 0;

  // Raised carved terrace floor (11x11 octagonal) with flush stone foundation plinth
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > 8) continue;
      const border = Math.abs(dx) === 5 || Math.abs(dz) === 5 || Math.abs(dx) + Math.abs(dz) === 8;
      const centerMedallion = dx === 0 && dz === 0;
      const p = centerMedallion
        ? solBlk
        : border
          ? brass
          : Math.abs(dx) <= 2 && Math.abs(dz) <= 2
            ? planks
            : gilded;
      setBlk(dim, cx + dx, cy, cz + dz, p, ctx);
      groundFoundationColumn(dim, cx + dx, { y: cy, z: cz + dz }, 4, border ? gilded : stone, ctx);
      // Clear interior airspace cleanly
      for (let h = 1; h <= 8; h++) {
        setBlk(dim, cx + dx, cy + h, cz + dz, air, ctx);
      }
      if (++ops % YIELD_STRIDE === 0) yield;
    }
  }

  // 12 Graceful Perimeter Pillars (4 timber corners + 8 carved travertine doorway frames)
  for (const [px, pz] of [[-4, -4], [4, -4], [-4, 4], [4, 4], [-2, -5], [2, -5], [-2, 5], [2, 5], [-5, -2], [-5, 2], [5, -2], [5, 2]]) {
    for (let h = 1; h <= 5; h++) {
      setBlk(dim, cx + px, cy + h, cz + pz, h === 5 ? brass : (Math.abs(px) === 4 ? log : gilded), ctx);
    }
    if (++ops % 32 === 0) yield;
  }

  // Sculpted Domed Starlight-Glass & Prism-Plank Roof + Oculus Skylight + Hanging Chandelier
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      const m = Math.abs(dx) + Math.abs(dz);
      if (m > 8) continue;
      if (m >= 6) {
        setBlk(dim, cx + dx, cy + 6, cz + dz, m === 8 ? brass : planks, ctx);
      } else if (m >= 3) {
        setBlk(dim, cx + dx, cy + 7, cz + dz, (dx === 0 || dz === 0) ? brass : glass, ctx);
      } else {
        setBlk(dim, cx + dx, cy + 8, cz + dz, m === 0 ? solBlk : glass, ctx);
      }
      if (++ops % YIELD_STRIDE === 0) yield;
    }
  }
  setBlk(dim, cx, cy + 9, cz, lantern, ctx);
  setBlk(dim, cx, cy + 6, cz, lantern, ctx);
  // Corner eaves lanterns
  for (const [lx, lz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
    setBlk(dim, cx + lx, cy + 7, cz + lz, lantern, ctx);
  }

  // Cozy interior furnishings: Crafting table + Supply Chest + corner lanterns + chime planters
  setBlk(dim, cx - 2, cy + 1, cz - 2, perm("minecraft:crafting_table"), ctx);
  placeTreasureChest(dim, cx + 2, cy + 1, cz - 2, ctx);
  setBlk(dim, cx - 3, cy + 1, cz + 3, lantern, ctx);
  setBlk(dim, cx + 3, cy + 1, cz + 3, lantern, ctx);
  setBlk(dim, cx - 3, cy + 1, cz - 3, reed, ctx);
  setBlk(dim, cx + 3, cy + 1, cz - 3, reed, ctx);
}

/**
 * Curated Architectural Building: 22-Block Climbable Alabaster & Brass Bell-Tower (Campanile!)
 */
function* placeBellCampanileJob(dim, cx, cy, cz, ctx) {
  const gilded = perm(BLOCKS.GILDED_TRAVERTINE);
  const stone = perm(BLOCKS.AURALITE);
  const brass = perm(BLOCKS.GILDED_BRASS);
  const planks = perm(BLOCKS.PRISM_PLANKS);
  const solBlk = perm(BLOCKS.SOLARIUM_BLOCK);
  const glass = perm(BLOCKS.STARLIGHT_GLASS);
  const lantern = perm(BLOCKS.LANTERN_BLOOM);
  const air = perm("minecraft:air");
  let ops = 0;

  // Base foundation plinth (7x7) grounded firmly into terrain
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      const edge = Math.abs(dx) === 3 || Math.abs(dz) === 3;
      setBlk(dim, cx + dx, cy, cz + dz, edge ? brass : gilded, ctx);
      groundFoundationColumn(dim, cx + dx, { y: cy, z: cz + dz }, 4, edge ? gilded : stone, ctx);
    }
  }
  yield;

  // Tower shaft H = 1..15 with arched entry doors + climbable interior spiral stairs!
  const stairRing = [
    [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2],
    [2, -1], [2, 0], [2, 1], [2, 2],
    [1, 2], [0, 2], [-1, 2], [-2, 2],
    [-2, 1], [-2, 0], [-2, -1],
  ];
  for (let h = 1; h <= 15; h++) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const isWall = Math.abs(dx) === 3 || Math.abs(dz) === 3;
        const isCorner = Math.abs(dx) === 3 && Math.abs(dz) === 3;
        if (!isWall) {
          setBlk(dim, cx + dx, cy + h, cz + dz, air, ctx);
        } else if (isCorner) {
          setBlk(dim, cx + dx, cy + h, cz + dz, h % 5 === 0 ? brass : gilded, ctx);
        } else if (h <= 3 && (dx === 0 || dz === 0)) {
          // Tall open entrance arches on all 4 ground sides!
          setBlk(dim, cx + dx, cy + h, cz + dz, air, ctx);
        } else if (h === 4 && (dx === 0 || dz === 0)) {
          // Gilded arch keystone above each doorway
          setBlk(dim, cx + dx, cy + h, cz + dz, brass, ctx);
        } else if ((h === 8 || h === 12) && (Math.abs(dx) <= 1 || Math.abs(dz) <= 1) && (dx === 0 || dz === 0)) {
          // Tall starlight-glass lancet windows
          setBlk(dim, cx + dx, cy + h, cz + dz, glass, ctx);
        } else {
          setBlk(dim, cx + dx, cy + h, cz + dz, h === 15 ? brass : gilded, ctx);
        }
        if (++ops % YIELD_STRIDE === 0) yield;
      }
    }
    // Walkable spiral stepping shelf circling up the inner wall!
    const [sx, sz] = stairRing[(h - 1) % stairRing.length];
    const [sx2, sz2] = stairRing[h % stairRing.length];
    setBlk(dim, cx + sx, cy + h, cz + sz, planks, ctx);
    setBlk(dim, cx + sx2, cy + h, cz + sz2, planks, ctx);
  }

  // Belfry Floor (H=16) + Open Colonnade Belfry (H=17..20) + Golden Resonance Bell + Spire Roof!
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) continue; // stairwell hatch opening!
      setBlk(dim, cx + dx, cy + 16, cz + dz, planks, ctx);
    }
  }
  for (const [px, pz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
    for (let h = 17; h <= 21; h++) {
      setBlk(dim, cx + px, cy + h, cz + pz, h === 21 ? brass : gilded, ctx);
    }
    // Projecting belfry corner lantern finials!
    setBlk(dim, cx + px + Math.sign(px), cy + 21, cz + pz + Math.sign(pz), lantern, ctx);
  }
  // Stepped Golden Pyramid Belfry Roof
  for (let tier = 0; tier <= 3; tier++) {
    const r = 3 - tier;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        setBlk(dim, cx + dx, cy + 21 + tier, cz + dz, tier === 3 ? solBlk : (tier % 2 === 0 ? brass : gilded), ctx);
      }
    }
  }
  setBlk(dim, cx, cy + 25, cz, lantern, ctx);
  // Suspended Golden Resonance Bell inside the belfry + Treasure Chest!
  setBlk(dim, cx, cy + 20, cz, brass, ctx);
  setBlk(dim, cx, cy + 19, cz, solBlk, ctx);
  setBlk(dim, cx, cy + 18, cz, lantern, ctx);
  placeTreasureChest(dim, cx + 2, cy + 17, cz, ctx);
}

/**
 * Curated Architectural Building: Cloud-Harbor Shrine, Sky-Dock & Harbor Beacon Lighthouse!
 */
function* placeCloudHarborJob(dim, cx, cy, cz, ctx) {
  const planks = perm(BLOCKS.PRISM_PLANKS);
  const log = perm(BLOCKS.PRISM_LOG);
  const gilded = perm(BLOCKS.GILDED_TRAVERTINE);
  const brass = perm(BLOCKS.GILDED_BRASS);
  const glass = perm(BLOCKS.STARLIGHT_GLASS);
  const lantern = perm(BLOCKS.LANTERN_BLOOM);
  const solBlk = perm(BLOCKS.SOLARIUM_BLOCK);
  const vent = perm(BLOCKS.CLOUD_VENT);
  const cloud = perm(BLOCKS.CLOUDSTONE);
  const air = perm("minecraft:air");
  let ops = 0;

  // Sweeping Prism-Plank Harbor Boardwalk (North-South pier + timber pilings)
  for (let dz = -14; dz <= 14; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      const isPiling = Math.abs(dx) === 2 && dz % 4 === 0;
      setBlk(dim, cx + dx, cy + 1, cz + dz, isPiling ? log : planks, ctx);
      setBlk(dim, cx + dx, cy + 2, cz + dz, air, ctx);
      setBlk(dim, cx + dx, cy + 3, cz + dz, air, ctx);
      if (isPiling) {
        groundFoundationColumn(dim, cx + dx, { y: cy + 1, z: cz + dz }, 4, log, ctx);
      }
      if (++ops % YIELD_STRIDE === 0) yield;
    }
    if (dz % 6 === 0) {
      // Dockside lantern posts!
      for (const sx of [-3, 3]) {
        setBlk(dim, cx + sx, cy + 1, cz + dz, log, ctx);
        groundFoundationColumn(dim, cx + sx, { y: cy + 1, z: cz + dz }, 4, log, ctx);
        setBlk(dim, cx + sx, cy + 2, cz + dz, log, ctx);
        setBlk(dim, cx + sx, cy + 3, cz + dz, brass, ctx);
        setBlk(dim, cx + sx, cy + 4, cz + dz, lantern, ctx);
      }
    }
  }

  // Harbor Beacon Lighthouse Mast on the West Pierhead (visible 150+ blocks across the Cloud Sea!)
  const lx = cx - 6;
  const lz = cz - 8;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      setBlk(dim, lx + dx, cy + 1, lz + dz, Math.abs(dx) + Math.abs(dz) === 2 ? brass : gilded, ctx);
      groundFoundationColumn(dim, lx + dx, { y: cy + 1, z: lz + dz }, 4, cloud, ctx);
    }
  }
  for (let h = 2; h <= 9; h++) {
    setBlk(dim, lx, cy + h, lz, h % 3 === 0 ? brass : log, ctx);
  }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    setBlk(dim, lx + dx, cy + 9, lz + dz, glass, ctx);
  }
  setBlk(dim, lx, cy + 10, lz, solBlk, ctx);
  setBlk(dim, lx, cy + 11, lz, lantern, ctx);
  yield;

  // Cozy Harbor Shelter House beside the dock (x: +4..+11, z: -4..+4)
  for (let dx = 4; dx <= 11; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      setBlk(dim, cx + dx, cy + 1, cz + dz, gilded, ctx);
      groundFoundationColumn(dim, cx + dx, { y: cy + 1, z: cz + dz }, 4, cloud, ctx);
      const wall = dx === 4 || dx === 11 || dz === -4 || dz === 4;
      const corner = (dx === 4 || dx === 11) && (dz === -4 || dz === 4);
      for (let h = 2; h <= 5; h++) {
        if (!wall) {
          setBlk(dim, cx + dx, cy + h, cz + dz, air, ctx);
        } else if (corner) {
          setBlk(dim, cx + dx, cy + h, cz + dz, log, ctx);
        } else if (dx === 4 && Math.abs(dz) <= 1 && h <= 4) {
          // Open entrance facing the dock!
          setBlk(dim, cx + dx, cy + h, cz + dz, air, ctx);
        } else if (h === 3 && (dz === 0 || dx === 7 || dx === 8)) {
          setBlk(dim, cx + dx, cy + h, cz + dz, glass, ctx);
        } else {
          setBlk(dim, cx + dx, cy + h, cz + dz, planks, ctx);
        }
        if (++ops % YIELD_STRIDE === 0) yield;
      }
    }
  }
  // Pitched Alabaster & Prism-Plank Gable Roof
  for (let tier = 0; tier <= 3; tier++) {
    for (let dx = 3 + tier; dx <= 12 - tier; dx++) {
      for (let dz = -5; dz <= 5; dz++) {
        if (dx === 3 + tier || dx === 12 - tier || tier === 3) {
          setBlk(dim, cx + dx, cy + 6 + tier, cz + dz, tier === 3 ? brass : planks, ctx);
        }
      }
    }
  }
  setBlk(dim, cx + 8, cy + 2, cz - 2, perm("minecraft:crafting_table"), ctx);
  setBlk(dim, cx + 9, cy + 2, cz + 2, lantern, ctx);
  placeTreasureChest(dim, cx + 9, cy + 2, cz, ctx);

  // Three glowing Updraft Cloud-Vents snapped cleanly to local cloud surface!
  for (const [vx, vz] of [[0, -17], [0, 17], [-12, 0]]) {
    const vy = findLocalTopY(dim, cx + vx, cz + vz, cy + 4, cy - 2) ?? cy;
    for (const [bx, bz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      setBlk(dim, cx + vx + bx, vy, cz + vz + bz, brass, ctx);
      setBlk(dim, cx + vx + bx, vy + 1, cz + vz + bz, air, ctx);
    }
    setBlk(dim, cx + vx, vy, cz + vz, vent, ctx);
    setBlk(dim, cx + vx, vy + 1, cz + vz, air, ctx);
    setBlk(dim, cx + vx, vy + 2, cz + vz, air, ctx);
  }
}

// =============================================================================
// 1. GRAND ARRIVAL ATOLL — SANCTUARY CROWN 2.1 (0, 84, 0, Radius 28!)
// =============================================================================

function* buildSanctuaryCrownJob(dim) {
  const { x: cx, y: cy, z: cz } = SANCTUARY_CENTER;
  const radius = 28;
  const ctx = {
    missedWrites: 0,
    bounds: { minX: -35, maxX: 35, minZ: -35, maxZ: 35 },
  };

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
  const lantern = perm(BLOCKS.LANTERN_BLOOM);
  const reed = perm(BLOCKS.CHIME_REED);
  const cloud = perm(BLOCKS.CLOUDSTONE);
  const rose = perm(BLOCKS.ROSE_CLOUD);
  const vent = perm(BLOCKS.CLOUD_VENT);
  const air = perm("minecraft:air");
  const astrolabeOn = perm(BLOCKS.ASTROLABE, { "auralis:attuned": true });
  let ops = 0;

  // 1. Sweeping 56-block wide Multi-Tiered Porcelain Sanctuary Plateau
  for (let dx = -34; dx <= 34; dx++) {
    for (let dz = -34; dz <= 34; dz++) {
      const dist = Math.hypot(dx, dz);
      const taper = Math.max(0, 1.0 - Math.max(0, dist - 22) / 10);
      const edgeNoise = (fbm2((cx + dx) * 0.09, (cz + dz) * 0.09, 2, 11) - 0.5) * 4.8 * taper;
      const effR = Math.min(32, radius + edgeNoise);
      if (dist > effR) continue;

      const norm = 1.0 - dist / effR;
      const topH = dist < 9.5 ? 2 : dist < 17 ? 1 : 0;
      const depth = Math.max(2, Math.floor(Math.pow(norm, 1.15) * 20 + hash2(dx, dz, 3) * 3));

      for (let dy = -depth; dy <= topH; dy++) {
        let p = stone;
        if (dy === topH) {
          if (dist < 7.2) {
            p = dist > 5.8 ? brass : gilded;
          } else if (Math.abs(dx) <= 1 && dz > 7 && dz < 25) {
            p = water;
            setBlk(dim, cx + dx, cy + dy - 1, cz + dz, glass, ctx);
          } else if ((Math.abs(dx) <= 1 && dz < -7 && dz > -27) || (Math.abs(dz) <= 1 && Math.abs(dx) > 7 && Math.abs(dx) < 27)) {
            p = gilded;
          } else {
            p = moss;
          }
        } else if (dy < -3) {
          p = hash3(dx, dy, dz, 55) > 0.94 ? solOre : star;
        }
        setBlk(dim, cx + dx, cy + dy, cz + dz, p, ctx);
        if (++ops % YIELD_STRIDE === 0) yield;
      }

      // Lush Chime-Reeds (NO random loose crystals on grass!)
      if (dist >= 12 && dist <= effR - 2.5 && Math.abs(dx) > 3 && Math.abs(dz) > 3) {
        const r = hash2(dx, dz, 88);
        if (r > 0.952) {
          setBlk(dim, cx + dx, cy + topH + 1, cz + dz, reed, ctx);
        }
      }
    }
  }

  // 2. Cascading Starlight Waterfall plunging off South edge into the Rose-Gold Cloud Sea
  for (let wy = cy; wy >= 34; wy--) {
    for (let dx = -1; dx <= 1; dx++) {
      setBlk(dim, cx + dx, wy, cz + 26, water, ctx);
    }
    if (++ops % 40 === 0) yield;
  }

  // 3. Central Mirrored Observatory Dais (Awakened Return Astrolabe + 4 Grand Arches)
  const oy = cy + 2;
  setBlk(dim, cx, oy, cz, astrolabeOn, ctx);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    setBlk(dim, cx + dx, oy, cz + dz, veil, ctx);
    setBlk(dim, cx + dx, oy - 1, cz + dz, solBlk, ctx);
  }
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    setBlk(dim, cx + dx, oy, cz + dz, brass, ctx);
  }
  for (const [px, pz] of [[5, 5], [5, -5], [-5, 5], [-5, -5]]) {
    for (let h = 1; h <= 9; h++) {
      setBlk(dim, cx + px, oy + h, cz + pz, h === 1 || h === 9 ? brass : gilded, ctx);
    }
    setBlk(dim, cx + px, oy + 10, cz + pz, lantern, ctx);
    yield;
  }
  for (let i = -4; i <= 4; i++) {
    const archH = Math.round(10 + Math.cos((i / 4.5) * (Math.PI / 2)) * 3.4);
    const blk = Math.abs(i) <= 1 ? solBlk : (Math.abs(i) % 2 === 0 ? brass : glass);
    setBlk(dim, cx + i, oy + archH, cz - 5, blk, ctx);
    setBlk(dim, cx + i, oy + archH, cz + 5, blk, ctx);
    setBlk(dim, cx - 5, oy + archH, cz + i, blk, ctx);
    setBlk(dim, cx + 5, oy + archH, cz + i, blk, ctx);
  }
  yield;

  // 4. Giant Hovering Golden Astrolabe Rings crowning the Sanctuary Sky
  placeAstrolabeRing(dim, cx, cy + 20, cz, 21, 0.34, 0.14, true, ctx);
  yield;
  placeAstrolabeRing(dim, cx, cy + 18, cz, 16, -0.28, 0.34, false, ctx);
  yield;

  // 5. Sanctuary Wayfarer Library Gazebo on the NW terrace!
  yield* placeWayfarerPavilionJob(dim, cx - 15, cy + 1, cz - 14, ctx);

  // 6. Signature Prism-Coral Trees & Grounded Cliff-Rim Crystal Geode Outcrops
  for (const [tx, tz] of [[16, -14], [17, 13], [-17, 13], [12, 18], [-12, 18]]) {
    placePrismTree(dim, cx + tx, cy + 1, cz + tz, 300 + tx * 7 + tz, ctx);
    yield;
  }
  for (const [gx, gz] of [[21, -7], [-22, 6], [19, 17]]) {
    placeCrystalOutcrop(dim, cx + gx, cy + 1, cz + gz, 700 + gx * 11 + gz, ctx);
    yield;
  }

  // 7. Four Cardinal Cloud-Terrace Launch Piers (with Updraft Cloud-Vents!) strictly inside ±35
  for (const [px, pz] of [[0, -31], [0, 31], [31, 0], [-31, 0]]) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= 3.4) {
          setBlk(dim, cx + px + dx, cy - 1, cz + pz + dz, d > 2.2 ? rose : cloud, ctx);
          if (d < 2.2) setBlk(dim, cx + px + dx, cy - 2, cz + pz + dz, rose, ctx);
          setBlk(dim, cx + px + dx, cy, cz + pz + dz, air, ctx);
          setBlk(dim, cx + px + dx, cy + 1, cz + pz + dz, air, ctx);
        }
      }
    }
    setBlk(dim, cx + px, cy - 1, cz + pz, vent, ctx);
    yield;
  }

  persistCell("0,0");
  world.setDynamicProperty(DP_SANCTUARY_BUILT, true);
}

// =============================================================================
// 2. GRAND ASTRAL CITADEL 2.1 (Wide 52-Block Open Boss Arena!)
// =============================================================================

function* buildAstralCitadelJob(dim, layout, ctx) {
  const { cx, cy, cz, radius: R } = layout;
  const gilded = perm(BLOCKS.GILDED_TRAVERTINE);
  const stone = perm(BLOCKS.AURALITE);
  const star = perm(BLOCKS.STARSTONE);
  const brass = perm(BLOCKS.GILDED_BRASS);
  const solBlk = perm(BLOCKS.SOLARIUM_BLOCK);
  const glass = perm(BLOCKS.STARLIGHT_GLASS);
  const lantern = perm(BLOCKS.LANTERN_BLOOM);
  const altar = perm(BLOCKS.VESPERA_ALTAR);
  let ops = 0;

  // Wide, uncluttered 52-block diameter circular Boss Arena Platform
  for (let dx = -R; dx <= R; dx++) {
    for (let dz = -R; dz <= R; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > R) continue;
      const depth = Math.max(2, Math.floor((1 - d / R) * 16));
      for (let dy = -depth; dy <= 0; dy++) {
        let p = dy < -3 ? star : stone;
        if (dy === 0) {
          if (d < 4.0) p = brass;
          else if (Math.abs(d - 14) < 1.2 || d > R - 1.6) p = brass;
          else if ((Math.abs(dx) <= 1 || Math.abs(dz) <= 1) && d < R - 1.5) p = solBlk;
          else p = gilded;
        }
        setBlk(dim, cx + dx, cy + dy, cz + dz, p, ctx);
        if (++ops % YIELD_STRIDE === 0) yield;
      }
    }
  }

  // 8 Outer Perimeter Triumphal Obelisks (at R=22, keeping central 42-block arena WIDE OPEN for boss combat!)
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const px = Math.round(cx + Math.cos(ang) * 22);
    const pz = Math.round(cz + Math.sin(ang) * 22);
    for (let h = 1; h <= 11; h++) {
      setBlk(dim, px, cy + h, pz, h % 4 === 0 ? brass : (h > 9 ? glass : gilded), ctx);
    }
    setBlk(dim, px, cy + 12, pz, lantern, ctx);
    yield;
  }

  // Four low carved avenue Lantern Braziers framing the 4 cardinal approaches
  for (const [bx, bz] of [[0, 17], [0, -17], [17, 0], [-17, 0]]) {
    setBlk(dim, cx + bx, cy + 1, cz + bz, brass, ctx);
    setBlk(dim, cx + bx, cy + 2, cz + bz, lantern, ctx);
  }

  // High Overhead Interlocking Astrolabe Crown Rings (cy + 22 -> completely clear of Seraph flight!)
  placeAstrolabeRing(dim, cx, cy + 22, cz, 23, 0.28, -0.18, true, ctx);
  yield;
  placeAstrolabeRing(dim, cx, cy + 22, cz, 18, -0.32, 0.24, false, ctx);
  yield;

  // Vespera Sanctum Altar + Twin Perimeter Treasure Chests
  setBlk(dim, cx, cy + 1, cz, altar, ctx);
  placeTreasureChest(dim, cx + 18, cy + 1, cz + 3, ctx);
  placeTreasureChest(dim, cx - 18, cy + 1, cz - 3, ctx);

  // Lower Cloud-Shelf Approach Deck with Updraft Cloud-Vent right into the Citadel!
  yield* placeLowerCloudShelfJob(dim, cx, 50, cz + 20, 11, layout.seed + 99, ctx);
}

// =============================================================================
// 3. WALKABLE CLOUD-SHELF PLAINS & CLOUD-HARBOR SHRINE
// =============================================================================

function* buildCloudPlainsJob(dim, layout, ctx) {
  const { cx, cy, cz, radius: rad, minX, maxX, minZ, maxZ, seed } = layout;
  const cloud = perm(BLOCKS.CLOUDSTONE);
  const rose = perm(BLOCKS.ROSE_CLOUD);
  const moss = perm(BLOCKS.TIDE_MOSS);
  let ops = 0;

  for (let bx = minX; bx <= maxX; bx++) {
    for (let bz = minZ; bz <= maxZ; bz++) {
      const dx = bx - cx;
      const dz = bz - cz;
      const dist = Math.hypot(dx, dz);
      const edgeLimit = Math.min(bx - minX, maxX - bx, bz - minZ, maxZ - bz);
      const taper = Math.min(1.0, edgeLimit / 4.0);
      const jitter = (fbm2(bx * 0.08, bz * 0.08, 2, seed) - 0.5) * 6.5 * taper;
      const eff = rad + jitter;
      if (dist > eff) continue;

      const norm = 1.0 - dist / eff;
      const billow = Math.floor(fbm2(bx * 0.06, bz * 0.06, 2, seed + 17) * 2.4 * norm);
      const topY = cy + (dist < 16 ? 0 : billow);
      const depth = Math.max(2, Math.floor(Math.pow(norm, 0.85) * 7 + 1));

      for (let y = topY - depth; y <= topY; y++) {
        let p = cloud;
        if (y === topY && dist > eff - 4.0) p = rose;
        else if (y <= topY - depth + 1) p = rose;
        else if (y === topY && dist > 16 && fbm2(bx * 0.12, bz * 0.12, 2, seed + 44) > 0.72) p = moss;
        setBlk(dim, bx, y, bz, p, ctx);
        if (++ops % YIELD_STRIDE === 0) yield;
      }
    }
  }

  // Curated Cloud-Harbor Shrine, Sky-Dock, Beacon Lighthouse & 3 Updraft Cloud-Vents!
  yield* placeCloudHarborJob(dim, cx, cy, cz, ctx);

  // Two sculptural Prism-Coral trees growing on moss pockets of the cloud plain
  for (const [tx, tz] of [[-16, -12], [-15, 13]]) {
    if (Math.hypot(tx, tz) < rad - 5) {
      placePrismTree(dim, cx + tx, cy + 1, cz + tz, seed + tx * 5 + tz, ctx);
      yield;
    }
  }
}

// =============================================================================
// 4. GRAND PEARL-TERRACE ATOLL (Huge Island + Wayfarer Sky-Pavilion!)
// =============================================================================

function* buildPearlAtollJob(dim, layout, ctx) {
  const { cx, cy, cz, radius: rad, minX, maxX, minZ, maxZ, seed } = layout;
  const stone = perm(BLOCKS.AURALITE);
  const star = perm(BLOCKS.STARSTONE);
  const moss = perm(BLOCKS.TIDE_MOSS);
  const solOre = perm(BLOCKS.SOLARIUM_ORE);
  const water = perm("minecraft:water");
  const reed = perm(BLOCKS.CHIME_REED);
  let ops = 0;

  for (let bx = minX; bx <= maxX; bx++) {
    for (let bz = minZ; bz <= maxZ; bz++) {
      const dx = bx - cx;
      const dz = bz - cz;
      const dist = Math.hypot(dx, dz);
      const edgeLimit = Math.min(bx - minX, maxX - bx, bz - minZ, maxZ - bz);
      const taper = Math.min(1.0, edgeLimit / 4.0);
      const jitter = (fbm2(bx * 0.09, bz * 0.09, 2, seed) - 0.5) * 5.2 * taper;
      const eff = rad + jitter;
      if (dist > eff) continue;

      const norm = 1.0 - dist / eff;
      const topOff = dist < 9.5 ? 1 : (norm > 0.42 ? 1 : 0);
      const depth = Math.max(2, Math.floor(Math.pow(norm, 1.15) * (rad * 0.72)));

      // Small scenic spring pool tucked at (+11, +6) away from central Pavilion!
      const poolDist = Math.hypot(dx - 11, dz - 6);
      const inPool = poolDist < 3.8 && dist < eff - 4.0;

      for (let dy = -depth; dy <= topOff; dy++) {
        let p = stone;
        if (dy === topOff) {
          p = inPool ? water : moss;
        } else if (dy === topOff - 1 && inPool) {
          p = stone;
        } else if (dy < -3) {
          p = hash3(bx, cy + dy, bz, seed) > 0.935 ? solOre : star;
        }
        setBlk(dim, bx, cy + dy, bz, p, ctx);
        if (++ops % YIELD_STRIDE === 0) yield;
      }

      if (!inPool && dist >= 9.0 && dist <= eff - 2.5) {
        const r = hash2(bx, bz, seed + 21);
        if (r > 0.955) setBlk(dim, bx, cy + topOff + 1, bz, reed, ctx);
      }
    }
  }

  // Grand Centerpiece Building: Wayfarer's Sky-Pavilion!
  yield* placeWayfarerPavilionJob(dim, cx, cy + 1, cz, ctx);

  // 4 Signature Prism-Coral Trees gracing the wide plateau
  for (const [tx, tz] of [[-14, -12], [14, -12], [-15, 11], [-8, 16]]) {
    if (Math.hypot(tx, tz) < rad - 4) {
      placePrismTree(dim, cx + tx, cy + 1, cz + tz, seed + tx * 7 + tz, ctx);
      yield;
    }
  }

  // Grounded Rocky Crystal Geode Outcrops near cliff ledges (zero random grass crystals!)
  for (const [gx, gz] of [[17, -4], [-17, -2]]) {
    if (Math.hypot(gx, gz) < rad - 3) {
      placeCrystalOutcrop(dim, cx + gx, cy + 1, cz + gz, seed + gx * 13, ctx);
      yield;
    }
  }

  // Lower walkable Cloud-Landing Shelf with Updraft Cloud-Vent
  yield* placeLowerCloudShelfJob(dim, cx, 50, cz + Math.min(18, rad - 4), 10, seed + 88, ctx);
}

// =============================================================================
// 5. SUNKEN BELL-REEF (Wide Reflecting Lagoon + 22-Block Climbable Bell-Tower!)
// =============================================================================

function* buildBellReefJob(dim, layout, ctx) {
  const { cx, cy, cz, radius: rad, minX, maxX, minZ, maxZ, seed } = layout;
  const stone = perm(BLOCKS.AURALITE);
  const star = perm(BLOCKS.STARSTONE);
  const moss = perm(BLOCKS.TIDE_MOSS);
  const planks = perm(BLOCKS.PRISM_PLANKS);
  const glass = perm(BLOCKS.STARLIGHT_GLASS);
  const reed = perm(BLOCKS.CHIME_REED);
  const water = perm("minecraft:water");
  let ops = 0;

  for (let bx = minX; bx <= maxX; bx++) {
    for (let bz = minZ; bz <= maxZ; bz++) {
      const dx = bx - cx;
      const dz = bz - cz;
      const dist = Math.hypot(dx, dz);
      const edgeLimit = Math.min(bx - minX, maxX - bx, bz - minZ, maxZ - bz);
      const taper = Math.min(1.0, edgeLimit / 4.0);
      const jitter = (fbm2(bx * 0.10, bz * 0.10, 2, seed) - 0.5) * 4.5 * taper;
      const eff = rad + jitter;
      if (dist > eff) continue;

      const isLagoon = dist >= 6.8 && dist < eff - 5.5 && !(Math.abs(dx) <= 1 || Math.abs(dz) <= 1);
      const isBridge = dist >= 6.8 && dist < eff - 5.5 && (Math.abs(dx) <= 1 || Math.abs(dz) <= 1);
      const depth = Math.max(3, Math.floor((1 - dist / eff) * 10));

      for (let dy = -depth; dy <= 0; dy++) {
        let p = dy < -3 ? star : stone;
        if (dy === 0) {
          p = isLagoon ? water : (isBridge ? planks : moss);
        } else if (dy === -1 && isLagoon) {
          p = water;
        } else if (dy === -2 && isLagoon) {
          // Luminous Starlight Glass & Auralite floor — ZERO underwater custom crystals / ZERO air bubbles!
          p = hash2(bx, bz, seed + 9) > 0.85 ? glass : stone;
        }
        setBlk(dim, bx, cy + dy, bz, p, ctx);
        if (++ops % YIELD_STRIDE === 0) yield;
      }

      if (!isLagoon && !isBridge && dist > eff - 5.0 && dist < eff - 1.8) {
        if (hash2(bx, bz, seed + 31) > 0.945) {
          setBlk(dim, bx, cy + 1, bz, reed, ctx);
        }
      }
    }
  }

  // Towering 22-Block Climbable Alabaster & Brass Bell-Tower!
  yield* placeBellCampanileJob(dim, cx, cy, cz, ctx);

  // Two grounded rocky Crystal Geode Outcrops + Prism Trees on the dry outer shore
  for (const [gx, gz] of [[rad - 4, 4], [-(rad - 4), -4]]) {
    placeCrystalOutcrop(dim, cx + gx, cy + 1, cz + gz, seed + gx * 9, ctx);
    yield;
  }
  for (const [tx, tz] of [[-(rad - 5), 10], [rad - 5, -10]]) {
    if (Math.hypot(tx, tz) < rad - 2) {
      placePrismTree(dim, cx + tx, cy + 1, cz + tz, seed + tx * 11, ctx);
      yield;
    }
  }

  yield* placeLowerCloudShelfJob(dim, cx, 48, cz - Math.min(18, rad - 4), 10, seed + 77, ctx);
}

// =============================================================================
// 6. GILDED SPIRE GARDENS (Broad Observatory Terrace + Shattered Dome Ruins!)
// =============================================================================

function* buildSpireGardenJob(dim, layout, ctx) {
  const { cx, cy, cz, radius: rad, minX, maxX, minZ, maxZ, seed } = layout;
  const gilded = perm(BLOCKS.GILDED_TRAVERTINE);
  const stone = perm(BLOCKS.AURALITE);
  const star = perm(BLOCKS.STARSTONE);
  const moss = perm(BLOCKS.TIDE_MOSS);
  const solOre = perm(BLOCKS.SOLARIUM_ORE);
  const solBlk = perm(BLOCKS.SOLARIUM_BLOCK);
  const brass = perm(BLOCKS.GILDED_BRASS);
  const glass = perm(BLOCKS.STARLIGHT_GLASS);
  const lantern = perm(BLOCKS.LANTERN_BLOOM);
  let ops = 0;

  for (let bx = minX; bx <= maxX; bx++) {
    for (let bz = minZ; bz <= maxZ; bz++) {
      const dx = bx - cx;
      const dz = bz - cz;
      const dist = Math.hypot(dx, dz);
      const edgeLimit = Math.min(bx - minX, maxX - bx, bz - minZ, maxZ - bz);
      const taper = Math.min(1.0, edgeLimit / 4.0);
      const jitter = (fbm2(bx * 0.09, bz * 0.09, 2, seed) - 0.5) * 4.6 * taper;
      const eff = rad + jitter;
      if (dist > eff) continue;

      const norm = 1.0 - dist / eff;
      const topOff = dist < 10.5 ? 2 : (dist < 16 ? 1 : 0);
      const depth = Math.max(3, Math.floor(Math.pow(norm, 1.1) * (rad * 0.85)));

      for (let dy = -depth; dy <= topOff; dy++) {
        let p = stone;
        if (dy === topOff) {
          if (dist < 10.5) {
            p = Math.abs(dist - 9.5) < 1.1 || dist < 2.2 ? brass : (Math.abs(dx) === Math.abs(dz) || dx === 0 || dz === 0 ? star : gilded);
          } else if (dist < 15.5) {
            p = Math.abs(dist - 14.5) < 1.0 ? gilded : moss;
          } else {
            p = moss;
          }
        } else if (dy < -2) {
          p = hash3(bx, cy + dy, bz, seed) > 0.91 ? solOre : star;
        }
        setBlk(dim, bx, cy + dy, bz, p, ctx);
        if (++ops % YIELD_STRIDE === 0) yield;
      }
    }
  }

  // Celestial Observatory Ruin: 6 Sculpted Pillars + Shattered Starlight-Glass Dome Ribs!
  const oy = cy + 2;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const px = Math.round(cx + Math.cos(ang) * 9.5);
    const pz = Math.round(cz + Math.sin(ang) * 9.5);
    const pillarH = i % 2 === 0 ? 11 : 7;
    for (let h = 1; h <= pillarH; h++) {
      setBlk(dim, px, oy + h, pz, h % 4 === 0 ? brass : gilded, ctx);
    }
    if (pillarH === 11) {
      setBlk(dim, px, oy + 12, pz, lantern, ctx);
      for (let s = 1; s <= 6; s++) {
        const t = s / 8;
        const rx = Math.round(cx + Math.cos(ang) * (9.5 * (1 - t)));
        const rz = Math.round(cz + Math.sin(ang) * (9.5 * (1 - t)));
        const ry = Math.round(oy + 11 + Math.sin(t * Math.PI * 0.5) * 6);
        setBlk(dim, rx, ry, rz, s % 2 === 0 ? brass : glass, ctx);
        if (s === 4) {
          setBlk(dim, rx, ry - 1, rz, lantern, ctx);
        }
      }
    }
    yield;
  }

  // Central Star-Podium + Reliquary Chest + Twin Orbiting Armillary Rings!
  setBlk(dim, cx, oy + 1, cz, solBlk, ctx);
  setBlk(dim, cx, oy + 2, cz, lantern, ctx);
  placeTreasureChest(dim, cx + 4, oy + 1, cz, ctx);

  placeAstrolabeRing(dim, cx, oy + 14, cz, 12, 0.38, -0.24, true, ctx);
  yield;
  placeAstrolabeRing(dim, cx, oy + 14, cz, 9, -0.32, 0.30, false, ctx);
  yield;

  // Grounded Crystal Geode Outcrops along outer rocky terraces
  for (const [gx, gz] of [[15, 8], [-15, -8], [10, -14]]) {
    if (Math.hypot(gx, gz) < rad - 3) {
      placeCrystalOutcrop(dim, cx + gx, cy + 1, cz + gz, seed + gx * 7 + gz, ctx);
      yield;
    }
  }

  yield* placeLowerCloudShelfJob(dim, cx - 8, 50, cz + 12, 10, seed + 66, ctx);
}

// =============================================================================
// MACRO-CELL DISPATCHER WITH TEMPORARY TICKING AREA (Works at Sim Dist 4+!)
// =============================================================================

function* buildLayoutGenerator(dim, layout, ctx) {
  if (layout.kind === "astral_citadel") {
    yield* buildAstralCitadelJob(dim, layout, ctx);
  } else if (layout.kind === "cloud_plains") {
    yield* buildCloudPlainsJob(dim, layout, ctx);
  } else if (layout.kind === "spire_gardens") {
    yield* buildSpireGardenJob(dim, layout, ctx);
  } else if (layout.kind === "bell_reefs") {
    yield* buildBellReefJob(dim, layout, ctx);
  } else {
    yield* buildPearlAtollJob(dim, layout, ctx);
  }
}

async function generateCellAsync(dim, gx, gz, layout) {
  const key = `${gx},${gz}`;
  const ctx = {
    missedWrites: 0,
    bounds: {
      minX: layout.minX,
      maxX: layout.maxX,
      minZ: layout.minZ,
      maxZ: layout.maxZ,
    },
  };

  activeCellInfo = { key, kind: layout.kind };
  try {
    if (layout.kind === "sanctuary" || layout.kind === "empty_sky") {
      persistCell(key);
      return true;
    }

    // Load EVERY chunk spanning this macro-cell cleanly via temporary ticking area!
    // Covers strictly [minX..maxX] x [minZ..maxZ] (25..36 chunks) so islands NEVER slice or fail on Sim Dist 4!
    await withTickingArea(
      dim,
      "auralis_cell_gen",
      { x: layout.minX, y: 16, z: layout.minZ },
      { x: layout.maxX, y: 160, z: layout.maxZ },
      async () => {
        await new Promise((resolve) => {
          system.runJob(
            (function* () {
              try {
                yield* buildLayoutGenerator(dim, layout, ctx);
              } finally {
                resolve();
              }
            })()
          );
        });
        // Allow Bedrock 4 ticks to flush sky-lighting & client chunk mesh updates before releasing ticking area
        await system.waitTicks(4);
      }
    );

    if (ctx.missedWrites === 0) {
      failedCellRetryTick.delete(key);
      persistCell(key);
      return true;
    }
    failedCellRetryTick.set(key, system.currentTick + 80);
    return false;
  } catch (err) {
    failedCellRetryTick.set(key, system.currentTick + 100);
    console.warn(`[Auralis] Cell (${key}) generation retry scheduled: ${err}`);
    return false;
  } finally {
    queuedCells.delete(key);
    activeJobs = Math.max(0, activeJobs - 1);
    activeCellInfo = null;
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

export async function ensureSanctuaryReady() {
  loadGeneratedCells();
  if (world.getDynamicProperty(DP_SANCTUARY_BUILT) === true) {
    return true;
  }
  if (sanctuaryBuilding) {
    for (let i = 0; i < 80 && sanctuaryBuilding; i++) {
      await system.waitTicks(5);
    }
    return true;
  }

  sanctuaryBuilding = true;
  try {
    const dim = world.getDimension(DIMENSION_ID);
    await withTickingArea(
      dim,
      "auralis_sanctuary_v2",
      { x: -36, y: 20, z: -36 },
      { x: 36, y: 140, z: 36 },
      async () => {
        await new Promise((resolve) => {
          system.runJob(
            (function* () {
              try {
                yield* buildSanctuaryCrownJob(dim);
              } finally {
                resolve();
              }
            })()
          );
        });
        await system.waitTicks(4);
      }
    );
    return true;
  } catch (err) {
    console.warn(`[Auralis] Sanctuary v2 init notice: ${err}`);
    return false;
  } finally {
    sanctuaryBuilding = false;
  }
}

/**
 * Called periodically while players explore Auralis — streams non-overlapping 80x80
 * Macro-Cells across the surrounding +/- 160-block horizon using temporary ticking areas!
 * Guaranteed to work at ANY Bedrock Simulation Distance (4..12) with ZERO chunk cutoffs.
 */
export function tickWorldGen() {
  loadGeneratedCells();
  if (sanctuaryBuilding || activeJobs >= 1) return;

  let dim;
  try {
    dim = world.getDimension(DIMENSION_ID);
  } catch {
    return;
  }

  const players = dim.getPlayers();
  if (players.length === 0) return;

  const nowTick = system.currentTick;
  const candidates = [];

  for (const player of players) {
    if (!player.isValid) continue;
    const loc = player.location;
    const { gx: pgx, gz: pgz } = worldToCell(loc.x, loc.z);

    // Collect every ungenerated cell within +/- 2 macro-cells (+/- 160 blocks)
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const gx = pgx + dx;
        const gz = pgz + dz;
        const key = `${gx},${gz}`;
        if (generatedCells.has(key) || queuedCells.has(key)) continue;

        const retryAt = failedCellRetryTick.get(key);
        if (retryAt && nowTick < retryAt) continue;

        const layout = getCellLayout(gx, gz);
        if (layout.kind === "empty_sky") {
          persistCell(key);
          continue;
        }
        if (layout.kind === "sanctuary") {
          if (world.getDynamicProperty(DP_SANCTUARY_BUILT) === true) {
            persistCell(key);
          }
          continue;
        }

        const distSq = (layout.cx - loc.x) ** 2 + (layout.cz - loc.z) ** 2;
        candidates.push({ gx, gz, key, layout, distSq });
      }
    }
  }

  if (candidates.length === 0) return;

  // Always stream the CLOSEST horizon island first so neighboring rings & Cloud Promenade appear immediately!
  candidates.sort((a, b) => a.distSq - b.distSq);
  const chosen = candidates[0];

  queuedCells.add(chosen.key);
  activeJobs++;
  void generateCellAsync(dim, chosen.gx, chosen.gz, chosen.layout);
}

export function getGeneratedSectorCount() {
  loadGeneratedCells();
  return generatedCells.size;
}

export function getWorldGenStatus() {
  loadGeneratedCells();
  return {
    chartedCount: generatedCells.size,
    activeCell: activeCellInfo,
  };
}
