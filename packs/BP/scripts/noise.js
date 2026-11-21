// Deterministic Seeded Noise, FBM & Biome Zone Resolver for Auralis

import { FIRST_CITADEL_CENTER, dist2 } from "./constants.js";

const SEED = 20261121;

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

/**
 * Finds the nearest Astral Citadel coordinates (guaranteed first citadel at 0, -112,
 * plus periodic citadels across the infinite archipelago every ~256 blocks).
 */
export function getNearestCitadel(x, z) {
  const candidates = [FIRST_CITADEL_CENTER];
  const cell = 256;
  const cx = Math.round(x / cell);
  const cz = Math.round(z / cell);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const gx = cx + dx;
      const gz = cz + dz;
      if (gx === 0 && gz === 0) continue;
      if (hash2(gx, gz, 901) < 0.62) {
        const px = gx * cell + Math.floor((hash2(gx, gz, 902) - 0.5) * 80);
        const pz = gz * cell + Math.floor((hash2(gx, gz, 903) - 0.5) * 80);
        const py = 96 + Math.floor(hash2(gx, gz, 904) * 20);
        candidates.push({ x: px, y: py, z: pz });
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
  if (dist2(x, z, 0, 0) <= 36) return "sanctuary";
  const citadel = getNearestCitadel(x, z);
  if (citadel.distance <= 32) return "astral_citadel";

  const n1 = fbm2(x * 0.0065, z * 0.0065, 3, 17);
  const n2 = fbm2(x * 0.0055 + 41.3, z * 0.0055 - 19.7, 2, 73);
  if (n1 > 0.61) return "spire_gardens";
  if (n2 < 0.39) return "bell_reefs";
  return "pearl_atolls";
}
