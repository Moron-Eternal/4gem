// Custom Item Relics, Consumables, Musical Blocks & Cloud-Vent Updrafts for Auralis (v2)

import { system, EntityDamageCause } from "@minecraft/server";
import {
  DIMENSION_ID,
  ENTITIES,
  PARTICLES,
  SOUNDS,
  safeSpawnParticle,
  safePlaySound,
  dist2,
} from "./constants.js";
import { getNearestCitadel } from "./noise.js";
import { openCodexUI } from "./codex.js";

const PENTATONIC_PITCHES = [0.89, 1.0, 1.12, 1.33, 1.50, 1.78];
const ventCooldown = new Map();
const cloudStepCooldown = new Map();

/**
 * Registers all V2 Block & Item custom components during system.beforeEvents.startup!
 */
export function registerCustomComponents(startupEvent, handlers) {
  const { onAstrolabeInteract, onVesperaAltarInteract } = handlers;

  // --- BLOCK CUSTOM COMPONENTS ---

  startupEvent.blockComponentRegistry.registerCustomComponent("auralis:astrolabe_gateway", {
    onPlayerInteract(event) {
      if (!event.player) return;
      onAstrolabeInteract(event.player, event.block);
    },
  });

  startupEvent.blockComponentRegistry.registerCustomComponent("auralis:vespera_altar", {
    onPlayerInteract(event) {
      if (!event.player) return;
      onVesperaAltarInteract(event.player, event.block);
    },
  });

  startupEvent.blockComponentRegistry.registerCustomComponent("auralis:chime_block", {
    onStepOn(event, params) {
      playMusicalBlockChime(event.dimension, event.block.location, params?.params?.pitch);
    },
    onPlayerInteract(event, params) {
      playMusicalBlockChime(event.dimension, event.block.location, params?.params?.pitch);
    },
    onPlayerBreak(event) {
      safePlaySound(event.dimension, SOUNDS.CRYSTAL_BREAK, event.block.location, { volume: 0.62 });
      safeSpawnParticle(event.dimension, PARTICLES.CRYSTAL_SHIMMER, {
        x: event.block.location.x + 0.5,
        y: event.block.location.y + 0.5,
        z: event.block.location.z + 0.5,
      });
    },
  });

  startupEvent.blockComponentRegistry.registerCustomComponent("auralis:veil_water", {
    onStepOn(event) {
      const entity = event.entity;
      if (!entity || !entity.isValid) return;
      safeSpawnParticle(event.dimension, PARTICLES.CRYSTAL_SHIMMER, {
        x: event.block.location.x + 0.5,
        y: event.block.location.y + 0.9,
        z: event.block.location.z + 0.5,
      });
    },
  });

  // Cushioned walkable cloud blocks (soft sound + gentle cloud landing cushion!)
  startupEvent.blockComponentRegistry.registerCustomComponent("auralis:cloud_cushion", {
    onStepOn(event) {
      const entity = event.entity;
      if (!entity || !entity.isValid) return;
      const now = system.currentTick;
      if (cloudStepCooldown.get(entity.id) && now < cloudStepCooldown.get(entity.id)) return;
      cloudStepCooldown.set(entity.id, now + 10);
      safePlaySound(event.dimension, SOUNDS.CLOUD_STEP, event.block.location, {
        volume: 0.45,
        pitch: 0.92 + Math.random() * 0.16,
      });
    },
  });

  // Glowing Updraft Cloud-Vent: lifts explorers effortlessly from Cloud Plains up to upper islands!
  startupEvent.blockComponentRegistry.registerCustomComponent("auralis:cloud_vent_updraft", {
    onStepOn(event) {
      const entity = event.entity;
      if (!entity || !entity.isValid) return;
      const now = system.currentTick;
      if (ventCooldown.get(entity.id) && now < ventCooldown.get(entity.id)) return;
      ventCooldown.set(entity.id, now + 35);

      const loc = event.block.location;
      const center = { x: loc.x + 0.5, y: loc.y + 1.0, z: loc.z + 0.5 };
      safePlaySound(event.dimension, SOUNDS.CLOUD_UPDRAFT, center, { volume: 0.72, pitch: 1.02 });
      safeSpawnParticle(event.dimension, PARTICLES.CLOUD_UPDRAFT, center);
      safeSpawnParticle(event.dimension, PARTICLES.GALE_SWIRL, center);

      try {
        entity.addEffect("minecraft:levitation", 46, { amplifier: 4, showParticles: false });
        entity.addEffect("minecraft:slow_falling", 180, { amplifier: 0, showParticles: false });
      } catch {
        // Safe fallback
      }
    },
  });

  // --- ITEM CUSTOM COMPONENTS ---

  // 1. Starlight Tuning Fork: Pings nearest Astral Citadel / Sanctuary with a directional starlight beam!
  startupEvent.itemComponentRegistry.registerCustomComponent("auralis:tuning_fork_use", {
    onUse(event) {
      const player = event.source;
      if (!player || !player.isValid) return;
      const dim = player.dimension;
      const loc = player.location;

      safePlaySound(dim, SOUNDS.RITUAL_CHIME, loc, { volume: 0.72, pitch: 1.04 });
      safeSpawnParticle(dim, PARTICLES.HARMONIC_RING, { x: loc.x, y: loc.y + 0.3, z: loc.z });

      if (dim.id !== DIMENSION_ID) {
        player.onScreenDisplay.setActionBar(
          "§e✦ §bTuning Fork resonates! §7Strike an §eAstrolabe Pedestal §7centered in a 3×3 Water & Crystal Mirror Pool."
        );
        return;
      }

      const target = player.isSneaking
        ? { x: 0, y: 88, z: 0, label: "§eSanctuary Crown" }
        : (() => {
            const cit = getNearestCitadel(loc.x, loc.z);
            return { x: cit.x, y: cit.y, z: cit.z, label: "§dAstral Citadel" };
          })();

      const d = Math.round(dist2(loc.x, loc.z, target.x, target.z));
      const dx = (target.x - loc.x) / Math.max(1, d);
      const dz = (target.z - loc.z) / Math.max(1, d);

      for (let i = 2; i <= 10; i += 2) {
        safeSpawnParticle(dim, PARTICLES.CRYSTAL_SHIMMER, {
          x: loc.x + dx * i,
          y: loc.y + 1.4 + i * 0.12,
          z: loc.z + dz * i,
        });
      }
      player.onScreenDisplay.setActionBar(
        `§e✦ §bHarmonic Ping: §f${target.label} §7lies §e${d} blocks §7along the starlight beam §8(Sneak+Use for Sanctuary)`
      );
    },
  });

  // 2. Auralis Gale-Prism: Graceful wind-ribbon boost + Slow Falling for soaring between floating islands!
  startupEvent.itemComponentRegistry.registerCustomComponent("auralis:gale_prism_use", {
    onUse(event) {
      const player = event.source;
      if (!player || !player.isValid) return;
      const dim = player.dimension;
      const loc = player.location;
      const view = player.getViewDirection();

      safePlaySound(dim, SOUNDS.GALE_PRISM, loc, { volume: 0.72, pitch: 1.02 });
      safeSpawnParticle(dim, PARTICLES.GALE_SWIRL, loc);
      safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, { x: loc.x, y: loc.y + 0.5, z: loc.z });

      try {
        player.applyKnockback({ x: view.x * 2.2, z: view.z * 2.2 }, Math.max(0.85, 0.75 + view.y * 0.75));
        player.addEffect("minecraft:slow_falling", 110, { amplifier: 0, showParticles: false });
      } catch {
        // Safe fallback
      }
    },
  });

  // 3. Sovereign's Starblade: Unleashes a radiant sweeping Crescent Starlight Wave!
  startupEvent.itemComponentRegistry.registerCustomComponent("auralis:starblade_use", {
    onUse(event) {
      const player = event.source;
      if (!player || !player.isValid) return;
      const dim = player.dimension;
      const head = player.getHeadLocation();
      const view = player.getViewDirection();

      safePlaySound(dim, SOUNDS.STARBLADE, head, { volume: 0.72 });

      const hitIds = new Set();
      for (let step = 2; step <= 14; step += 1.5) {
        const pt = {
          x: head.x + view.x * step,
          y: head.y + view.y * step,
          z: head.z + view.z * step,
        };
        safeSpawnParticle(dim, PARTICLES.STARBLADE_ARC, pt);
        if (step % 3 === 0) {
          safeSpawnParticle(dim, PARTICLES.CRYSTAL_SHIMMER, pt);
        }

        try {
          const victims = dim.getEntities({
            location: pt,
            maxDistance: 2.6,
            excludeFamilies: ["player"],
          });
          for (const mob of victims) {
            if (!mob.isValid || hitIds.has(mob.id)) continue;
            hitIds.add(mob.id);
            mob.applyDamage(12, { cause: EntityDamageCause.entityAttack, damagingEntity: player });
            mob.applyKnockback({ x: view.x * 1.1, z: view.z * 1.1 }, 0.35);
            safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, mob.location);
          }
        } catch {
          // Safe guard
        }
      }
    },
  });

  // 4. Astral Lyre: Plays lush rolled celestial harp chords & heals nearby allies, Lumina Rays & Nimbus Stags!
  startupEvent.itemComponentRegistry.registerCustomComponent("auralis:astral_lyre_use", {
    onUse(event) {
      const player = event.source;
      if (!player || !player.isValid) return;
      const dim = player.dimension;
      const loc = player.location;

      safePlaySound(dim, SOUNDS.LYRE, loc, { volume: 0.75 });
      safeSpawnParticle(dim, PARTICLES.WISP_NOTES, { x: loc.x, y: loc.y + 1.4, z: loc.z });
      safeSpawnParticle(dim, PARTICLES.HARMONIC_RING, { x: loc.x, y: loc.y + 0.3, z: loc.z });

      try {
        for (const p of dim.getPlayers({ location: loc, maxDistance: 12 })) {
          p.addEffect("minecraft:regeneration", 120, { amplifier: 1, showParticles: false });
          p.addEffect("minecraft:slow_falling", 160, { amplifier: 0, showParticles: false });
        }
        for (const kind of [ENTITIES.LUMINA_RAY, ENTITIES.NIMBUS_STAG]) {
          for (const mob of dim.getEntities({ type: kind, location: loc, maxDistance: 24 })) {
            const hp = mob.getComponent("minecraft:health");
            hp?.resetToMaxValue();
            safeSpawnParticle(dim, PARTICLES.WISP_NOTES, mob.location);
          }
        }
      } catch {
        // Safe guard
      }
      player.onScreenDisplay.setActionBar("§e♪ §bThe Astral Lyre weaves a gentle twilight harmony §e♪");
    },
  });

  // 5. Prism Berry (onConsume): Sweet soft chime + brief Slow Falling!
  startupEvent.itemComponentRegistry.registerCustomComponent("auralis:prism_berry_eat", {
    onConsume(event) {
      const player = event.source;
      if (!player || !player.isValid) return;
      safePlaySound(player.dimension, SOUNDS.CRYSTAL_STEP, player.location, { pitch: 1.2, volume: 0.55 });
      safeSpawnParticle(player.dimension, PARTICLES.CRYSTAL_SHIMMER, player.location);
      try {
        player.addEffect("minecraft:slow_falling", 300, { amplifier: 0, showParticles: false });
      } catch {
        // Safe guard
      }
    },
  });

  // 6. Celestial Nectar (onConsume): Twilight elixir granting Regeneration II + Jump Boost II + Slow Falling!
  startupEvent.itemComponentRegistry.registerCustomComponent("auralis:celestial_nectar_drink", {
    onConsume(event) {
      const player = event.source;
      if (!player || !player.isValid) return;
      safePlaySound(player.dimension, SOUNDS.LYRE, player.location, { volume: 0.68, pitch: 1.06 });
      safeSpawnParticle(player.dimension, PARTICLES.STARLIGHT_BURST, player.location);
      try {
        player.addEffect("minecraft:regeneration", 500, { amplifier: 1, showParticles: false });
        player.addEffect("minecraft:jump_boost", 900, { amplifier: 1, showParticles: false });
        player.addEffect("minecraft:slow_falling", 900, { amplifier: 0, showParticles: false });
      } catch {
        // Safe guard
      }
      player.onScreenDisplay.setActionBar("§e✦ §dCelestial Nectar fills you with weightless starlight!");
    },
  });

  // 7. Resonant Star-Core hint if used in open air
  startupEvent.itemComponentRegistry.registerCustomComponent("auralis:star_core_use", {
    onUse(event) {
      const player = event.source;
      if (!player || !player.isValid) return;
      safePlaySound(player.dimension, SOUNDS.CRYSTAL_STEP, player.location, { pitch: 0.9, volume: 0.58 });
      player.onScreenDisplay.setActionBar("§d✦ Bring this Resonant Star-Core to a §eVespera Sanctum Altar §din an Astral Citadel!");
    },
  });

  // 8. Chronicle of Auralis: Opens the interactive Codex & Live Soundtrack Jukebox UI!
  startupEvent.itemComponentRegistry.registerCustomComponent("auralis:codex_use", {
    onUse(event) {
      const player = event.source;
      if (!player || !player.isValid) return;
      openCodexUI(player);
    },
  });
}

function playMusicalBlockChime(dim, loc, basePitch = 1.0) {
  const idx = Math.abs(Math.floor(loc.x) * 7 + Math.floor(loc.z) * 13) % PENTATONIC_PITCHES.length;
  const pitch = Math.min(1.65, Math.max(0.6, PENTATONIC_PITCHES[idx] * (basePitch || 1.0) * 0.80));
  safePlaySound(dim, SOUNDS.CRYSTAL_STEP, loc, { volume: 0.48, pitch });
  safeSpawnParticle(dim, PARTICLES.CRYSTAL_SHIMMER, { x: loc.x + 0.5, y: loc.y + 0.75, z: loc.z + 0.5 });
}
