// Deterministic Seeded Noise, Non-Overlapping Macro-Cell Layout & Biome Zone Resolver (v2)

import { FIRST_CITADEL_CENTER, SANCTUARY_CENTER, dist2 } from "./constants.js";

const SEED = 20261121;

// Macro-Cell Archipelago Architecture:
// Every cell (gx, gz) covers [gx*80 - 40 .. gx*80 + 39] x [gz*80 - 40 .. gz*80 + 39].
// Every island is mathematically clamped strictly inside [center - 35 .. center + 35],
// guaranteeing >= 10 blocks of clean open sky between ANY two neighboring islands!
export const CELL_SIZE = 80;
export const CELL_HALF = 40;
export const CELL_SAFE_SPAN = 35;

export function hash2(x, z, salt = 0) {
  let n = Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(SEED + salt, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

export function hash3(x, y, z, salt = 0) {
  let n =
    Math.imul(x, 374761393) +
    Math.imul(y, 1274126177) +
    Math.imul(z, 668265263) +
    Math.imul(SEED + salt, 1597334677);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function valueNoise2(x, z, salt = 0) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = hash2(ix, iz, salt);
  const b = hash2(ix + 1, iz, salt);
  const c = hash2(ix, iz + 1, salt);
  const d = hash2(ix + 1, iz + 1, salt);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fz);
}

export function fbm2(x, z, octaves = 3, salt = 0) {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    val += valueNoise2(x * freq, z * freq, salt + i * 37) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.02;
  }
  return val / norm;
}

export function worldToCell(x, z) {
  return {
    gx: Math.floor((x + CELL_HALF) / CELL_SIZE),
    gz: Math.floor((z + CELL_HALF) / CELL_SIZE),
  };
}

/**
 * Deterministic check: does macro-cell (gx, gz) host an Astral Citadel boss arena?
 * Guaranteed First Citadel sits cleanly at cell (0, -2) => (0, 100, -160).
 * Additional Citadels appear across the infinite archipelago on a sparse non-adjacent 4x4 macro lattice.
 */
export function isCitadelCell(gx, gz) {
  if (gx === 0 && gz === -2) return true;
  if (Math.abs(gx) <= 1 && Math.abs(gz) <= 1) return false;
  if (gx === 0 && gz === -1) return false;
  // Sparse 4-cell grid (320-block lattice spacing) with deterministic presence
  if (((gx % 4) + 4) % 4 !== 0 || (((gz + 2) % 4) + 4) % 4 !== 0) return false;
  return hash2(gx, gz, 901) < 0.78;
}

/**
 * Computes the EXACT non-overlapping bounding box & archetype for macro-cell (gx, gz).
 * Pure deterministic function shared by worldgen.js and automated overlap verification!
 */
export function getCellLayout(gx, gz) {
  const cellCenterX = gx * CELL_SIZE;
  const cellCenterZ = gz * CELL_SIZE;
  const safeMinX = cellCenterX - CELL_SAFE_SPAN;
  const safeMaxX = cellCenterX + CELL_SAFE_SPAN;
  const safeMinZ = cellCenterZ - CELL_SAFE_SPAN;
  const safeMaxZ = cellCenterZ + CELL_SAFE_SPAN;

  // Origin Cell (0, 0): Sanctuary Crown 2.0
  if (gx === 0 && gz === 0) {
    return {
      gx,
      gz,
      kind: "sanctuary",
      cx: SANCTUARY_CENTER.x,
      cy: SANCTUARY_CENTER.y,
      cz: SANCTUARY_CENTER.z,
      radius: 28,
      minX: safeMinX,
      maxX: safeMaxX,
      minZ: safeMinZ,
      maxZ: safeMaxZ,
      seed: 10001,
    };
  }

  // Cell (0, -1): Guaranteed Grand Cloud-Harbor Promenade linking Sanctuary -> First Citadel!
  if (gx === 0 && gz === -1) {
    return {
      gx,
      gz,
      kind: "cloud_plains",
      cx: cellCenterX,
      cy: 50,
      cz: cellCenterZ,
      radius: 31,
      minX: safeMinX,
      maxX: safeMaxX,
      minZ: safeMinZ,
      maxZ: safeMaxZ,
      seed: 20002,
    };
  }

  // Astral Citadel Macro-Cell
  if (isCitadelCell(gx, gz)) {
    const cy = gx === 0 && gz === -2 ? FIRST_CITADEL_CENTER.y : 94 + Math.floor(hash2(gx, gz, 904) * 16);
    return {
      gx,
      gz,
      kind: "astral_citadel",
      cx: cellCenterX,
      cy,
      cz: cellCenterZ,
      radius: 26,
      minX: safeMinX,
      maxX: safeMaxX,
      minZ: safeMinZ,
      maxZ: safeMaxZ,
      seed: Math.abs((gx * 73856093) ^ (gz * 19349663)) % 100000,
    };
  }

  // ~8% rare open sky vistas so the horizon still feels vast and breathable
  const densityRoll = hash2(gx, gz, 404);
  if (densityRoll > 0.92 && !(Math.abs(gx) <= 1 && Math.abs(gz) <= 1)) {
    return {
      gx,
      gz,
      kind: "empty_sky",
      cx: cellCenterX,
      cy: 80,
      cz: cellCenterZ,
      radius: 0,
      minX: safeMinX,
      maxX: safeMaxX,
      minZ: safeMinZ,
      maxZ: safeMaxZ,
      seed: 0,
    };
  }

  // Bounded jitter (+/- 5 blocks) + generous continental island radius strictly inside CELL_SAFE_SPAN (35)
  const jx = Math.floor((hash2(gx, gz, 405) - 0.5) * 10);
  const jz = Math.floor((hash2(gx, gz, 406) - 0.5) * 10);
  const cx = cellCenterX + jx;
  const cz = cellCenterZ + jz;
  const maxFitRadius = Math.min(
    safeMaxX - cx,
    cx - safeMinX,
    safeMaxZ - cz,
    cz - safeMinZ
  );
  const seed = Math.abs((gx * 73856093) ^ (gz * 19349663)) % 100000;

  // Resolve natural macro-zone archetype
  const zone = resolveProceduralArchetype(gx, gz, cx, cz);

  if (zone === "cloud_plains") {
    const radius = Math.min(maxFitRadius, 26 + Math.floor(hash2(gx, gz, 411) * 6));
    const cy = 48 + Math.floor(hash2(gx, gz, 412) * 5);
    return { gx, gz, kind: "cloud_plains", cx, cy, cz, radius, minX: safeMinX, maxX: safeMaxX, minZ: safeMinZ, maxZ: safeMaxZ, seed };
  }
  if (zone === "spire_gardens") {
    const radius = Math.min(maxFitRadius, 22 + Math.floor(hash2(gx, gz, 413) * 6));
    const cy = 84 + Math.floor(hash2(gx, gz, 407) * 20);
    return { gx, gz, kind: "spire_gardens", cx, cy, cz, radius, minX: safeMinX, maxX: safeMaxX, minZ: safeMinZ, maxZ: safeMaxZ, seed };
  }
  if (zone === "bell_reefs") {
    const radius = Math.min(maxFitRadius, 22 + Math.floor(hash2(gx, gz, 414) * 6));
    const cy = 62 + Math.floor(hash2(gx, gz, 408) * 14);
    return { gx, gz, kind: "bell_reefs", cx, cy, cz, radius, minX: safeMinX, maxX: safeMaxX, minZ: safeMinZ, maxZ: safeMaxZ, seed };
  }
  // Default: Grand Pearl-Terrace Atoll with Wayfarer Pavilion!
  const radius = Math.min(maxFitRadius, 23 + Math.floor(hash2(gx, gz, 415) * 6));
  const cy = 74 + Math.floor(hash2(gx, gz, 409) * 18);
  return { gx, gz, kind: "pearl_atolls", cx, cy, cz, radius, minX: safeMinX, maxX: safeMaxX, minZ: safeMinZ, maxZ: safeMaxZ, seed };
}

function resolveProceduralArchetype(gx, gz, cx, cz) {
  // Ensure immediate ring around Sanctuary Crown showcases diverse landmarks + cloud plains!
  if (gx === 1 && gz === 0) return "pearl_atolls";
  if (gx === -1 && gz === 0) return "bell_reefs";
  if (gx === 0 && gz === 1) return "cloud_plains";
  if (gx === 1 && gz === -1) return "spire_gardens";

  const n1 = fbm2(cx * 0.0045, cz * 0.0045, 3, 17);
  const n2 = fbm2(cx * 0.0045 + 41.3, cz * 0.0045 - 19.7, 2, 73);
  const cRoll = hash2(gx, gz, 515);
  if (cRoll < 0.27) return "cloud_plains";
  if (n1 > 0.59) return "spire_gardens";
  if (n2 < 0.42) return "bell_reefs";
  return "pearl_atolls";
}

/**
 * Finds the nearest Astral Citadel coordinates across the macro-cell lattice.
 */
export function getNearestCitadel(x, z) {
  const { gx, gz } = worldToCell(x, z);
  const candidates = [FIRST_CITADEL_CENTER];

  const baseGx = Math.round(gx / 4) * 4;
  const baseGz = Math.round((gz + 2) / 4) * 4 - 2;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const cgx = baseGx + dx * 4;
      const cgz = baseGz + dz * 4;
      if (isCitadelCell(cgx, cgz)) {
        const lay = getCellLayout(cgx, cgz);
        candidates.push({ x: lay.cx, y: lay.cy, z: lay.cz });
      }
    }
  }

  let best = candidates[0];
  let bestDist = dist2(x, z, best.x, best.z);
  for (let i = 1; i < candidates.length; i++) {
    const d = dist2(x, z, candidates[i].x, candidates[i].z);
    if (d < bestDist) {
      bestDist = d;
      best = candidates[i];
    }
  }
  return { ...best, distance: bestDist };
}

/**
 * Smoothly resolves which Auralis architectural/ecological region occupies (x, z).
 */
export function getZoneAt(x, z) {
  const { gx, gz } = worldToCell(x, z);
  const layout = getCellLayout(gx, gz);
  if (layout.kind !== "empty_sky") {
    return layout.kind;
  }
  return resolveProceduralArchetype(gx, gz, x, z);
}
