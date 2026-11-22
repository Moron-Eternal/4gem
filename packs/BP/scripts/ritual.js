// Unique Dimensional Entry System: The Harmonic Wellspring Ritual & Sky-Gaze Ascension
// Players build a 3x3 Mirror Pool around a Celestial Astrolabe Pedestal, strike it with a
// Starlight Tuning Fork to awaken the Starlight Veil, then stand on the Astrolabe and
// gaze upward into the sky (or crouch) to ascend through a rose-gold veil into Auralis!

import { world, system, BlockPermutation } from "@minecraft/server";
import {
  DIMENSION_ID,
  OVERWORLD_ID,
  SANCTUARY_SPAWN,
  DP_PLAYER_RETURN,
  BLOCKS,
  PARTICLES,
  SOUNDS,
  SHRINE_CORNER_BLOCKS,
  SHRINE_WATER_BLOCKS,
  safeSpawnParticle,
  safePlaySound,
} from "./constants.js";
import { ensureSanctuaryReady, withTickingArea, tickWorldGen } from "./worldgen.js";

const activeRituals = new Set();
const playerChargeTicks = new Map();
const playerTransitCooldown = new Map();

/**
 * Validates the 3x3 Harmonic Wellspring Mirror Pool centered on an Astrolabe Pedestal:
 *   C  W  C
 *   W  A  W     (A = Astrolabe Pedestal, W = Water / Starlight Veil, C = Crystal/Gilded Corner)
 *   C  W  C
 * Plus open sky clearance above A.
 */
export function validateShrine(dim, loc) {
  const cx = Math.floor(loc.x);
  const cy = Math.floor(loc.y);
  const cz = Math.floor(loc.z);

  let waterCount = 0;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const b = dim.getBlock({ x: cx + dx, y: cy, z: cz + dz });
    if (b && SHRINE_WATER_BLOCKS.has(b.typeId)) waterCount++;
  }

  let cornerCount = 0;
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const b = dim.getBlock({ x: cx + dx, y: cy, z: cz + dz });
    if (b && SHRINE_CORNER_BLOCKS.has(b.typeId)) cornerCount++;
  }

  let skyClear = true;
  for (let h = 1; h <= 6; h++) {
    const b = dim.getBlock({ x: cx, y: cy + h, z: cz });
    if (b && !b.isAir && b.typeId !== BLOCKS.STARLIGHT_VEIL) {
      skyClear = false;
      break;
    }
  }

  return {
    valid: waterCount === 4 && cornerCount === 4 && skyClear,
    waterCount,
    cornerCount,
    skyClear,
  };
}

/**
 * Launches the 4.5-second (90-tick) multi-stage Harmonic Convergence Ritual!
 */
export function triggerHarmonicRitual(player, block) {
  const dim = block.dimension;
  const loc = block.location;
  const key = `${dim.id}:${loc.x},${loc.y},${loc.z}`;

  // If already attuned, play a warm resonant chime and remind player how to ascend!
  try {
    if (block.permutation.getState("auralis:attuned") === true) {
      safePlaySound(dim, SOUNDS.RITUAL_CHIME, loc, { pitch: 1.10, volume: 0.68 });
      safeSpawnParticle(dim, PARTICLES.HARMONIC_RING, { x: loc.x + 0.5, y: loc.y + 1.05, z: loc.z + 0.5 });
      player.onScreenDisplay.setActionBar("§e✦ §bAstrolabe Awakened! §7Stand atop it and §eLook Up at the Sky §7(or Sneak) to cross the veil.");
      return;
    }
  } catch {
    // Ignore state read issues
  }

  if (activeRituals.has(key)) {
    player.onScreenDisplay.setActionBar("§d✦ Harmonic resonance is already converging...");
    return;
  }

  const check = validateShrine(dim, loc);
  if (!check.valid) {
    safePlaySound(dim, SOUNDS.CRYSTAL_STEP, loc, { pitch: 0.78, volume: 0.58 });
    const missing = [];
    if (check.waterCount < 4) missing.push(`§bWater on all 4 cardinal sides (${check.waterCount}/4)`);
    if (check.cornerCount < 4) missing.push(`§dAmethyst/Gold/Prismarine/Quartz at all 4 diagonal corners (${check.cornerCount}/4)`);
    if (!check.skyClear) missing.push("§eOpen sky above the Astrolabe");
    player.onScreenDisplay.setActionBar(`§cIncomplete Mirror Pool: ${missing.join(" §7| ")}`);
    return;
  }

  activeRituals.add(key);
  const center = { x: loc.x + 0.5, y: loc.y + 1.0, z: loc.z + 0.5 };

  // Stage 1 (0.0s): Tuning Fork Resonance Strike!
  safePlaySound(dim, SOUNDS.RITUAL_CHIME, center, { volume: 0.74, pitch: 1.0 });
  safeSpawnParticle(dim, PARTICLES.HARMONIC_RING, center);
  player.onScreenDisplay.setActionBar("§e✦ §bThe Harmonic Wellspring awakens...");

  // Stage 2 (0.5s): Swelling Choir & Corner Energy Beams!
  system.runTimeout(() => {
    safePlaySound(dim, SOUNDS.RITUAL_SWELL, center, { volume: 0.76 });
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      safeSpawnParticle(dim, PARTICLES.CRYSTAL_SHIMMER, { x: loc.x + dx + 0.5, y: loc.y + 1.1, z: loc.z + dz + 0.5 });
      safeSpawnParticle(dim, PARTICLES.STAR_PILLAR, { x: loc.x + dx + 0.5, y: loc.y + 1.5, z: loc.z + dz + 0.5 });
    }
  }, 10);

  // Mid-convergence rhythmic rings & rising vortex
  for (const delay of [24, 42, 60, 74]) {
    system.runTimeout(() => {
      safeSpawnParticle(dim, PARTICLES.HARMONIC_RING, { x: center.x, y: center.y + (delay / 90) * 1.4, z: center.z });
      safeSpawnParticle(dim, PARTICLES.VEIL_VORTEX, center);
    }, delay);
  }

  // Stage 3 (2.2s): Transform Mirror Pool water into shimmering Starlight Veil!
  system.runTimeout(() => {
    try {
      const veilPerm = BlockPermutation.resolve(BLOCKS.STARLIGHT_VEIL);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const wb = dim.getBlock({ x: loc.x + dx, y: loc.y, z: loc.z + dz });
        if (wb && SHRINE_WATER_BLOCKS.has(wb.typeId)) {
          wb.setPermutation(veilPerm);
        }
      }
      safeSpawnParticle(dim, PARTICLES.STAR_PILLAR, { x: center.x, y: center.y + 1.5, z: center.z });
    } catch {
      // Safe guard
    }
  }, 45);

  // Stage 4 (4.2s): Attune Astrolabe Pedestal & Stabilize Dimensional Gateway!
  system.runTimeout(() => {
    activeRituals.delete(key);
    try {
      const cur = dim.getBlock(loc);
      if (cur && cur.typeId === BLOCKS.ASTROLABE) {
        cur.setPermutation(cur.permutation.withState("auralis:attuned", true));
      }
      safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, center);
      safeSpawnParticle(dim, PARTICLES.HARMONIC_RING, center);
      safePlaySound(dim, SOUNDS.RITUAL_CHIME, center, { pitch: 1.18, volume: 0.74 });

      for (const p of dim.getPlayers({ location: center, maxDistance: 16 })) {
        p.onScreenDisplay.setTitle("§e✦ §bVeil Opened §e✦", {
          subtitle: "§7Stand atop the Astrolabe and §eGaze Upward §7to ascend",
          fadeInDuration: 10,
          stayDuration: 65,
          fadeOutDuration: 20,
        });
      }
    } catch {
      // Safe guard
    }
  }, 84);
}

/**
 * Performs the graceful, dreamy dimensional transit with camera fade, safe ticking-area preload,
 * and Slow Falling descent!
 */
export async function transitPlayer(player, toAuralis) {
  const pid = player.id;
  if (playerTransitCooldown.get(pid) && system.currentTick < playerTransitCooldown.get(pid)) {
    return;
  }
  playerTransitCooldown.set(pid, system.currentTick + 120);
  playerChargeTicks.delete(pid);

  const fromDim = player.dimension;
  const fromLoc = { ...player.location };

  // Save Overworld return position right before ascending into Auralis
  if (toAuralis && fromDim.id !== DIMENSION_ID) {
    try {
      player.setDynamicProperty(
        DP_PLAYER_RETURN,
        JSON.stringify({
          dim: fromDim.id,
          x: Math.floor(fromLoc.x) + 0.5,
          y: Math.floor(fromLoc.y) + 1.2,
          z: Math.floor(fromLoc.z) + 0.5,
        })
      );
    } catch {
      // Ignore DP save issue
    }
  }

  // Dreamy ascension lift + particles + harp glissando + rose-gold camera fade!
  safePlaySound(fromDim, toAuralis ? SOUNDS.PORTAL_ASCEND : SOUNDS.PORTAL_RETURN, fromLoc, { volume: 0.78 });
  safeSpawnParticle(fromDim, PARTICLES.STARLIGHT_BURST, { x: fromLoc.x, y: fromLoc.y + 1.0, z: fromLoc.z });
  safeSpawnParticle(fromDim, PARTICLES.GALE_SWIRL, fromLoc);

  try {
    player.addEffect("minecraft:levitation", 36, { amplifier: 1, showParticles: false });
    player.addEffect("minecraft:slow_falling", 140, { amplifier: 0, showParticles: false });
  } catch {
    // Safe guard
  }

  try {
    player.camera.fade({
      fadeColor: toAuralis ? { red: 0.96, green: 0.72, blue: 0.78 } : { red: 0.78, green: 0.94, blue: 0.98 },
      fadeTime: { fadeInTime: 0.9, holdTime: 0.8, fadeOutTime: 1.2 },
    });
  } catch {
    // Camera fade optional fallback
  }

  await system.waitTicks(20);
  if (!player.isValid) return;

  if (toAuralis) {
    // Guarantee the grand Sanctuary Crown arrival atoll is built & loaded!
    await ensureSanctuaryReady();
    const targetDim = world.getDimension(DIMENSION_ID);
    await withTickingArea(
      targetDim,
      `auralis_tp_${pid.slice(-6)}`,
      { x: -12, y: 76, z: -12 },
      { x: 12, y: 108, z: 12 },
      async () => {
        if (!player.isValid) return;
        player.teleport(SANCTUARY_SPAWN, { dimension: targetDim });
        await system.waitTicks(4);
      }
    );
    if (!player.isValid) return;
    safeSpawnParticle(targetDim, PARTICLES.STARLIGHT_BURST, SANCTUARY_SPAWN);
    safeSpawnParticle(targetDim, PARTICLES.HARMONIC_RING, { x: 0.5, y: 87.2, z: 0.5 });
    player.onScreenDisplay.setTitle("§e✦ §bAURALIS §e✦", {
      subtitle: "§dThe Prism-Tide Firmament",
      fadeInDuration: 15,
      stayDuration: 75,
      fadeOutDuration: 25,
    });
    system.runTimeout(() => tickWorldGen(), 6);
  } else {
    // Return gently to player's exact Overworld shrine (or Overworld default spawn)
    let ret = null;
    try {
      const raw = player.getDynamicProperty(DP_PLAYER_RETURN);
      if (typeof raw === "string") ret = JSON.parse(raw);
    } catch {
      ret = null;
    }
    const targetDim = world.getDimension(ret?.dim || OVERWORLD_ID);
    const dest = ret
      ? { x: ret.x, y: ret.y + 1.5, z: ret.z }
      : (() => {
          const sp = world.getDefaultSpawnLocation();
          return { x: sp.x + 0.5, y: Math.max(72, sp.y + 2), z: sp.z + 0.5 };
        })();

    await withTickingArea(
      targetDim,
      `auralis_ret_${pid.slice(-6)}`,
      { x: dest.x - 8, y: dest.y - 8, z: dest.z - 8 },
      { x: dest.x + 8, y: dest.y + 8, z: dest.z + 8 },
      async () => {
        if (!player.isValid) return;
        player.teleport(dest, { dimension: targetDim });
        await system.waitTicks(4);
      }
    );
    if (!player.isValid) return;
    safeSpawnParticle(targetDim, PARTICLES.STARLIGHT_BURST, dest);
    player.onScreenDisplay.setTitle("§bReturned to the Overworld", {
      subtitle: "§7The echo of the Firmament lingers softly...",
      fadeInDuration: 10,
      stayDuration: 55,
      fadeOutDuration: 20,
    });
  }
}

/**
 * Runs every 5 ticks — detects players standing on an Awakened Astrolabe Pedestal
 * and gazing upward at the sky (pitch <= -42 deg) OR sneaking to trigger Ascension!
 */
export function tickPortalAscension() {
  for (const player of world.getAllPlayers()) {
    if (!player.isValid) continue;
    const pid = player.id;
    if (playerTransitCooldown.get(pid) && system.currentTick < playerTransitCooldown.get(pid)) {
      continue;
    }

    const dim = player.dimension;
    const loc = player.location;
    const bx = Math.floor(loc.x);
    const by = Math.floor(loc.y);
    const bz = Math.floor(loc.z);

    // Check block directly under feet or at feet level for an Awakened Astrolabe
    let astrolabeBlock = null;
    for (const dy of [0, -1]) {
      try {
        const b = dim.getBlock({ x: bx, y: by + dy, z: bz });
        if (b && b.typeId === BLOCKS.ASTROLABE && b.permutation.getState("auralis:attuned") === true) {
          astrolabeBlock = b;
          break;
        }
      } catch {
        // Unloaded chunk
      }
    }

    if (!astrolabeBlock) {
      if (playerChargeTicks.has(pid)) playerChargeTicks.delete(pid);
      continue;
    }

    // Spawn delicate ambient vortex around the awakened Astrolabe while player stands on it
    const al = astrolabeBlock.location;
    safeSpawnParticle(dim, PARTICLES.VEIL_VORTEX, { x: al.x + 0.5, y: al.y + 1.0, z: al.z + 0.5 });

    const rot = player.getRotation();
    const lookingUp = rot.x <= -40;
    const sneaking = player.isSneaking;

    if (lookingUp || sneaking) {
      const charge = (playerChargeTicks.get(pid) || 0) + 5;
      playerChargeTicks.set(pid, charge);

      const pct = Math.min(100, Math.floor((charge / 20) * 100));
      const destLabel = dim.id === DIMENSION_ID ? "§bOverworld" : "§dAuralis Firmament";
      player.onScreenDisplay.setActionBar(`§e✦ §fAttuning to ${destLabel} §e${pct}% §7(Hold sky-gaze...)`);

      if (charge === 5) {
        safePlaySound(dim, SOUNDS.PORTAL_HUM, loc, { volume: 0.7, pitch: 1.05 });
        safeSpawnParticle(dim, PARTICLES.HARMONIC_RING, { x: al.x + 0.5, y: al.y + 1.1, z: al.z + 0.5 });
      }

      if (charge >= 20) {
        void transitPlayer(player, dim.id !== DIMENSION_ID);
      }
    } else {
      playerChargeTicks.set(pid, 0);
      const actionText =
        dim.id === DIMENSION_ID
          ? "§e✦ §bLook Up at the Sky §7(or Sneak) to return to the Overworld"
          : "§e✦ §bLook Up at the Sky §7(or Sneak) to ascend to §dAuralis";
      player.onScreenDisplay.setActionBar(actionText);
    }
  }
}
