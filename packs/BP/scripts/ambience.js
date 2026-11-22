// Smart OST Music Director, Ambient Aurora/Starlight VFX, Zone Discovery & Buoyant Rose-Gold Cloud Sea

import { world, system } from "@minecraft/server";
import {
  DIMENSION_ID,
  CLOUD_RESCUE_Y,
  DP_PLAYER_JUKEBOX,
  BLOCKS,
  ENTITIES,
  MUSIC,
  PARTICLES,
  SOUNDS,
  ZONE_META,
  safeSpawnParticle,
  safePlaySound,
} from "./constants.js";
import { getZoneAt } from "./noise.js";

const playerCurrentTrack = new Map();
const playerLastZone = new Map();
const playerZoneAnnounceCooldown = new Map();
const playerCloudRescueCooldown = new Map();

/**
 * Allows the Chronicle Jukebox UI to lock a specific OST track (or null for Auto Dynamic OST).
 */
export function setPlayerJukeboxTrack(player, trackId) {
  try {
    player.setDynamicProperty(DP_PLAYER_JUKEBOX, trackId || "");
  } catch {
    // Non-fatal
  }
  if (trackId) {
    switchMusic(player, trackId, 1.5);
  } else {
    playerCurrentTrack.delete(player.id);
  }
}

function switchMusic(player, trackId, fade = 2.5) {
  const pid = player.id;
  if (playerCurrentTrack.get(pid) === trackId) return;
  try {
    player.playMusic(trackId, { fade, loop: true, volume: 0.76 });
    playerCurrentTrack.set(pid, trackId);
  } catch {
    // Fallback if sound API is busy
  }
}

export function stopCustomMusic(player) {
  const pid = player.id;
  if (!playerCurrentTrack.has(pid)) return;
  playerCurrentTrack.delete(pid);
  try {
    player.stopMusic();
  } catch {
    // Safe ignore
  }
}

/**
 * Runs every 20 ticks (1s) — manages dynamic OST crossfades, zone transitions,
 * ambient twilight starlight motes, aurora ribbons, Cloud-Vent plumes, and Buoyant Cloud Sea!
 */
export function tickAmbience() {
  const tick = system.currentTick;

  for (const player of world.getAllPlayers()) {
    if (!player.isValid) continue;
    const pid = player.id;
    const dim = player.dimension;

    if (dim.id !== DIMENSION_ID) {
      let pinned = "";
      try {
        pinned = player.getDynamicProperty(DP_PLAYER_JUKEBOX) || "";
      } catch {
        pinned = "";
      }
      if (!pinned && playerCurrentTrack.has(pid)) {
        stopCustomMusic(player);
        playerLastZone.delete(pid);
      }
      continue;
    }

    const loc = player.location;

    // --- 1. Ambient Twilight Starlight Motes, Aurora Ribbons & Nearby Cloud-Vent Plumes ---
    safeSpawnParticle(dim, PARTICLES.AMBIENT_MOTES, {
      x: loc.x,
      y: loc.y + 3.5,
      z: loc.z,
    });

    if (tick % 60 === 0) {
      safeSpawnParticle(dim, PARTICLES.AURORA_RIBBONS, {
        x: loc.x + (Math.random() - 0.5) * 18,
        y: loc.y + 18 + Math.random() * 10,
        z: loc.z + (Math.random() - 0.5) * 18,
      });
    }

    // Visual rising breeze plumes above nearby Updraft Cloud-Vents
    const px = Math.floor(loc.x);
    const py = Math.floor(loc.y);
    const pz = Math.floor(loc.z);
    for (let dx = -8; dx <= 8; dx += 2) {
      for (let dz = -8; dz <= 8; dz += 2) {
        try {
          const b = dim.getBlock({ x: px + dx, y: py - 1, z: pz + dz });
          if (b && b.typeId === BLOCKS.CLOUD_VENT) {
            safeSpawnParticle(dim, PARTICLES.CLOUD_UPDRAFT, { x: px + dx + 0.5, y: py + 0.2, z: pz + dz + 0.5 });
          }
        } catch {
          // Skip unloaded
        }
      }
    }

    // --- 2. Zone Discovery & Smart Dynamic OST Selection ---
    const zone = getZoneAt(loc.x, loc.z);
    const prevZone = playerLastZone.get(pid);
    if (zone !== prevZone) {
      playerLastZone.set(pid, zone);
      const meta = ZONE_META[zone];
      const nextAnnounce = playerZoneAnnounceCooldown.get(pid) || 0;
      if (meta && prevZone !== undefined && tick >= nextAnnounce) {
        playerZoneAnnounceCooldown.set(pid, tick + 160);
        player.onScreenDisplay.setActionBar(`${meta.name} §8— ${meta.subtitle}`);
      }
    }

    let bossNearby = false;
    try {
      const bosses = dim.getEntities({
        type: ENTITIES.ASTRAL_SERAPH,
        location: loc,
        maxDistance: 68,
      });
      bossNearby = bosses.length > 0;
    } catch {
      bossNearby = false;
    }

    let pinned = "";
    try {
      pinned = player.getDynamicProperty(DP_PLAYER_JUKEBOX) || "";
    } catch {
      pinned = "";
    }

    if (bossNearby) {
      switchMusic(player, MUSIC.SERAPH_BOSS, 1.4);
    } else if (pinned) {
      switchMusic(player, pinned, 2.0);
    } else {
      const targetTrack = ZONE_META[zone]?.track || MUSIC.GLASS_HORIZON;
      switchMusic(player, targetTrack, 2.8);
    }

    // --- 3. Buoyant Rose-Gold Cloud Sea Rescue ---
    if (loc.y < CLOUD_RESCUE_Y) {
      const cd = playerCloudRescueCooldown.get(pid) || 0;
      if (tick >= cd) {
        playerCloudRescueCooldown.set(pid, tick + 80);
        safePlaySound(dim, SOUNDS.CLOUD_UPDRAFT, loc, { volume: 0.72, pitch: 0.90 });
        safeSpawnParticle(dim, PARTICLES.CLOUD_UPDRAFT, loc);
        safeSpawnParticle(dim, PARTICLES.GALE_SWIRL, loc);

        try {
          player.addEffect("minecraft:levitation", 75, { amplifier: 4, showParticles: false });
          player.addEffect("minecraft:slow_falling", 180, { amplifier: 0, showParticles: false });
          player.onScreenDisplay.setActionBar("§d✦ §eThe Rose-Gold Cloud Sea buoys you skyward! §d✦");
        } catch {
          // Safe guard
        }
      }
    }
  }
}
