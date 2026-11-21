// Living Auralis Ecosystem Spawning, Creature Interactions & 3-Phase Astral Seraph Boss AI

import { world, system, EntityDamageCause } from "@minecraft/server";
import {
  DIMENSION_ID,
  ENTITIES,
  ITEMS,
  PARTICLES,
  SOUNDS,
  safeSpawnParticle,
  safePlaySound,
  dist3,
} from "./constants.js";
import { getZoneAt } from "./noise.js";

const seraphState = new Map(); // entity.id -> { phase, nextSkillTick, summonedGuards, pillarTick }
const altarCooldown = new Map();

// =============================================================================
// 1. NATURAL AMBIENT ECOSYSTEM SPAWNING IN AURALIS
// =============================================================================

export function tickEcosystemSpawning() {
  let dim;
  try {
    dim = world.getDimension(DIMENSION_ID);
  } catch {
    return;
  }

  const players = dim.getPlayers();
  if (players.length === 0) return;

  for (const player of players) {
    if (!player.isValid) continue;
    const loc = player.location;

    // Enforce gentle per-area entity cap so performance stays silky smooth!
    let nearbyMobs;
    try {
      nearbyMobs = dim.getEntities({
        families: ["auralis"],
        location: loc,
        maxDistance: 64,
      });
    } catch {
      continue;
    }

    // Spawn luminous trail particles on existing Lumina Rays & Choir Wisps!
    for (const mob of nearbyMobs) {
      if (!mob.isValid) continue;
      if (mob.typeId === ENTITIES.LUMINA_RAY && Math.random() < 0.65) {
        safeSpawnParticle(dim, PARTICLES.MANTA_TRAIL, mob.location);
      } else if (mob.typeId === ENTITIES.CHOIR_WISP && Math.random() < 0.45) {
        safeSpawnParticle(dim, PARTICLES.WISP_NOTES, {
          x: mob.location.x,
          y: mob.location.y + 0.7,
          z: mob.location.z,
        });
      }
    }

    if (nearbyMobs.length >= 12) continue;

    // Pick a scenic spawn offset 18..42 blocks away
    const ang = Math.random() * Math.PI * 2;
    const rad = 18 + Math.random() * 24;
    const sx = Math.floor(loc.x + Math.cos(ang) * rad);
    const sz = Math.floor(loc.z + Math.sin(ang) * rad);
    const zone = getZoneAt(sx, sz);

    const roll = Math.random();
    try {
      if (roll < 0.34) {
        // Lumina Ray gliding serenely through open twilight sky!
        const sy = Math.max(76, Math.min(138, Math.floor(loc.y + 8 + Math.random() * 18)));
        const b = dim.getBlock({ x: sx, y: sy, z: sz });
        if (b && b.isAir) {
          dim.spawnEntity(ENTITIES.LUMINA_RAY, { x: sx + 0.5, y: sy, z: sz + 0.5 });
        }
      } else if (roll < 0.64) {
        // Choir Wisp floating near islands & canopies!
        const sy = Math.max(66, Math.min(130, Math.floor(loc.y + 2 + Math.random() * 10)));
        const b = dim.getBlock({ x: sx, y: sy, z: sz });
        if (b && b.isAir) {
          dim.spawnEntity(ENTITIES.CHOIR_WISP, { x: sx + 0.5, y: sy, z: sz + 0.5 });
        }
      } else if (roll < 0.84) {
        // Tide-Glass Crab on solid ground (Tide-Moss / Auralite)!
        const groundY = findSurfaceY(dim, sx, sz, Math.floor(loc.y) + 14, Math.floor(loc.y) - 18);
        if (groundY !== null) {
          dim.spawnEntity(ENTITIES.GLASS_CRAB, { x: sx + 0.5, y: groundY + 1, z: sz + 0.5 });
        }
      } else if (zone === "spire_gardens" || zone === "astral_citadel" || zone === "bell_reefs") {
        // Gilded Sentinel patrolling sacred architecture!
        const groundY = findSurfaceY(dim, sx, sz, Math.floor(loc.y) + 18, Math.floor(loc.y) - 16);
        if (groundY !== null) {
          dim.spawnEntity(ENTITIES.GILDED_SENTINEL, { x: sx + 0.5, y: groundY + 2, z: sz + 0.5 });
        }
      }
    } catch {
      // Unloaded chunk skip
    }
  }
}

function findSurfaceY(dim, x, z, maxY, minY) {
  const hi = Math.min(200, maxY);
  const lo = Math.max(40, minY);
  for (let y = hi; y >= lo; y--) {
    try {
      const b = dim.getBlock({ x, y, z });
      const above = dim.getBlock({ x, y: y + 1, z });
      if (b && !b.isAir && !b.isLiquid && above && above.isAir) {
        return y;
      }
    } catch {
      return null;
    }
  }
  return null;
}

// =============================================================================
// 2. CREATURE INTERACTIONS (Feeding Lumina Rays & Calming Wisps!)
// =============================================================================

export function handleEntityInteract(event) {
  const { player, target, itemStack } = event;
  if (!player || !target || !target.isValid) return;

  if (target.typeId === ENTITIES.LUMINA_RAY && itemStack?.typeId === ITEMS.PRISM_BERRY) {
    system.run(() => {
      if (!target.isValid || !player.isValid) return;
      const dim = target.dimension;
      const loc = target.location;

      // Consume 1 Prism Berry in non-creative
      try {
        const equip = player.getComponent("minecraft:equippable");
        const held = equip?.getEquipment("Mainhand");
        if (held && held.typeId === ITEMS.PRISM_BERRY) {
          if (held.amount > 1) {
            held.amount -= 1;
            equip.setEquipment("Mainhand", held);
          } else {
            equip.setEquipment("Mainhand", undefined);
          }
        }
      } catch {
        // Safe ignore
      }

      try {
        const hp = target.getComponent("minecraft:health");
        hp?.resetToMaxValue();
        player.addEffect("minecraft:slow_falling", 900, { amplifier: 0, showParticles: false });
        player.addEffect("minecraft:night_vision", 1200, { amplifier: 0, showParticles: false });
      } catch {
        // Safe ignore
      }

      safePlaySound(dim, SOUNDS.MANTA_CALL, loc, { volume: 1.0, pitch: 1.15 });
      safeSpawnParticle(dim, PARTICLES.WISP_NOTES, loc);
      safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, loc);
      player.onScreenDisplay.setActionBar("§b✦ The Lumina Ray sings in gratitude — §eSky-Grace & Starlight Sight granted!");
    });
  }
}

// =============================================================================
// 3. VESPERA ALTAR AWAKENING & THE ASTRAL SERAPH 3-PHASE BOSS ENCOUNTER!
// =============================================================================

export function summonAstralSeraphAtAltar(player, block) {
  const dim = block.dimension;
  const loc = block.location;
  const key = `${dim.id}:${loc.x},${loc.y},${loc.z}`;
  const now = system.currentTick;

  if (altarCooldown.get(key) && now < altarCooldown.get(key)) {
    player.onScreenDisplay.setActionBar("§d✦ The Vespera Altar is already resonating...");
    return;
  }

  // Prevent duplicate boss spawns right next to an active Seraph
  try {
    const existing = dim.getEntities({
      type: ENTITIES.ASTRAL_SERAPH,
      location: loc,
      maxDistance: 48,
    });
    if (existing.length > 0) {
      player.onScreenDisplay.setActionBar("§e✦ The Astral Seraph already graces this Citadel!");
      return;
    }
  } catch {
    // Continue
  }

  // Check if player holds Resonant Star-Core
  const equip = player.getComponent("minecraft:equippable");
  const held = equip?.getEquipment("Mainhand");
  if (!held || held.typeId !== ITEMS.STAR_CORE) {
    safePlaySound(dim, SOUNDS.CRYSTAL_STEP, loc, { pitch: 0.85 });
    safeSpawnParticle(dim, PARTICLES.CRYSTAL_SHIMMER, { x: loc.x + 0.5, y: loc.y + 1.2, z: loc.z + 0.5 });
    player.onScreenDisplay.setActionBar("§dVespera Sanctum Altar §8— §7Offer a §dResonant Star-Core §7to awaken §eThe Astral Seraph§7.");
    return;
  }

  // Consume 1 Resonant Star-Core
  try {
    if (held.amount > 1) {
      held.amount -= 1;
      equip.setEquipment("Mainhand", held);
    } else {
      equip.setEquipment("Mainhand", undefined);
    }
  } catch {
    // Safe ignore
  }

  altarCooldown.set(key, now + 200);
  const center = { x: loc.x + 0.5, y: loc.y + 1.2, z: loc.z + 0.5 };

  // Dramatic 40-tick Boss Awakening Sequence!
  safePlaySound(dim, SOUNDS.SERAPH_AWAKEN, center, { volume: 1.0 });
  safeSpawnParticle(dim, PARTICLES.STAR_PILLAR, center);
  safeSpawnParticle(dim, PARTICLES.SERAPH_NOVA, center);

  for (const p of dim.getPlayers({ location: center, maxDistance: 56 })) {
    p.onScreenDisplay.setTitle("§e✦ §dTHE ASTRAL SERAPH §e✦", {
      subtitle: "§bSovereign of the Glass Tide awakens...",
      fadeInDuration: 12,
      stayDuration: 70,
      fadeOutDuration: 20,
    });
  }

  system.runTimeout(() => {
    safeSpawnParticle(dim, PARTICLES.STAR_PILLAR, { x: center.x, y: center.y + 3, z: center.z });
    safeSpawnParticle(dim, PARTICLES.HARMONIC_RING, { x: center.x, y: center.y + 1, z: center.z });
  }, 18);

  system.runTimeout(() => {
    try {
      const spawnLoc = { x: center.x, y: center.y + 3.5, z: center.z };
      const boss = dim.spawnEntity(ENTITIES.ASTRAL_SERAPH, spawnLoc);
      safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, spawnLoc);
      safeSpawnParticle(dim, PARTICLES.SERAPH_NOVA, spawnLoc);
      safePlaySound(dim, SOUNDS.SERAPH_PULSE, spawnLoc, { volume: 1.0 });
      seraphState.set(boss.id, {
        phase: 1,
        nextSkillTick: system.currentTick + 90,
        summonedGuards: false,
      });
    } catch (err) {
      console.warn(`[Auralis] Seraph spawn warning: ${err}`);
    }
  }, 40);
}

/**
 * Runs every 10 ticks (0.5s) — drives The Astral Seraph's 3-Phase Cinematic Boss Mechanics!
 */
export function tickSeraphBossAI() {
  const tick = system.currentTick;
  let dims = [];
  try {
    dims = [world.getDimension(DIMENSION_ID), world.getDimension("minecraft:overworld")];
  } catch {
    return;
  }

  for (const dim of dims) {
    let bosses;
    try {
      bosses = dim.getEntities({ type: ENTITIES.ASTRAL_SERAPH });
    } catch {
      continue;
    }

    for (const boss of bosses) {
      if (!boss.isValid) continue;
      const loc = boss.location;

      // Ambient radiant particles around the Seraph
      if (tick % 20 === 0) {
        safeSpawnParticle(dim, PARTICLES.WISP_NOTES, { x: loc.x, y: loc.y + 2.5, z: loc.z });
      }

      let st = seraphState.get(boss.id);
      if (!st) {
        st = { phase: 1, nextSkillTick: tick + 80, summonedGuards: false };
        seraphState.set(boss.id, st);
      }

      const hpComp = boss.getComponent("minecraft:health");
      const hpPct = hpComp ? hpComp.currentValue / Math.max(1, hpComp.effectiveMax) : 1.0;

      const nearbyPlayers = dim.getPlayers({ location: loc, maxDistance: 44 });
      if (nearbyPlayers.length === 0) continue;

      // --- Phase Transitions ---
      if (hpPct <= 0.65 && st.phase < 2) {
        st.phase = 2;
        safePlaySound(dim, SOUNDS.SERAPH_AWAKEN, loc, { volume: 1.0, pitch: 1.1 });
        safeSpawnParticle(dim, PARTICLES.SERAPH_NOVA, loc);
        safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, { x: loc.x, y: loc.y + 2, z: loc.z });
        for (const p of nearbyPlayers) {
          p.onScreenDisplay.setActionBar("§e✦ §dPhase II: Harmonic Resonance — §bThe Seraph calls its Guardians!");
        }
        if (!st.summonedGuards) {
          st.summonedGuards = true;
          for (const ox of [-5, 5]) {
            try {
              const gLoc = { x: loc.x + ox, y: loc.y + 1, z: loc.z };
              dim.spawnEntity(ENTITIES.GILDED_SENTINEL, gLoc);
              safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, gLoc);
            } catch {
              // Ignore
            }
          }
        }
      } else if (hpPct <= 0.30 && st.phase < 3) {
        st.phase = 3;
        safePlaySound(dim, SOUNDS.SERAPH_AWAKEN, loc, { volume: 1.0, pitch: 1.25 });
        safeSpawnParticle(dim, PARTICLES.SERAPH_NOVA, loc);
        safeSpawnParticle(dim, PARTICLES.STAR_PILLAR, loc);
        for (const p of nearbyPlayers) {
          p.onScreenDisplay.setActionBar("§e✦ §cPhase III: Crescendo of the Glass Tide!");
        }
      }

      // --- Special Telegraphed Boss Attacks ---
      if (tick >= st.nextSkillTick) {
        const cooldown = st.phase === 3 ? 85 : st.phase === 2 ? 110 : 140;
        st.nextSkillTick = tick + cooldown;

        if (st.phase === 1 || Math.random() < 0.45) {
          // Attack A: Radiant Harmonic Shockwave Nova!
          safePlaySound(dim, SOUNDS.SERAPH_PULSE, loc, { volume: 1.0 });
          safeSpawnParticle(dim, PARTICLES.SERAPH_NOVA, { x: loc.x, y: loc.y + 0.6, z: loc.z });
          safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, { x: loc.x, y: loc.y + 1.5, z: loc.z });

          for (const p of nearbyPlayers) {
            const d = dist3(p.location, loc);
            if (d <= 8.5) {
              const dx = (p.location.x - loc.x) / Math.max(0.4, d);
              const dz = (p.location.z - loc.z) / Math.max(0.4, d);
              try {
                p.applyDamage(st.phase === 3 ? 9 : 6, { cause: EntityDamageCause.magic, damagingEntity: boss });
                p.applyKnockback({ x: dx * 1.4, z: dz * 1.4 }, 0.55);
              } catch {
                // Safe guard
              }
            }
          }
        } else {
          // Attack B: Telegraphed Falling Star-Pillars (dodgeable!)
          const targets = nearbyPlayers.slice(0, st.phase === 3 ? 3 : 2);
          for (const targetPlayer of targets) {
            const strikeLoc = { ...targetPlayer.location };
            safeSpawnParticle(dim, PARTICLES.HARMONIC_RING, { x: strikeLoc.x, y: strikeLoc.y + 0.15, z: strikeLoc.z });
            safePlaySound(dim, SOUNDS.RITUAL_CHIME, strikeLoc, { pitch: 1.35, volume: 0.9 });

            system.runTimeout(() => {
              safeSpawnParticle(dim, PARTICLES.STAR_PILLAR, strikeLoc);
              safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, { x: strikeLoc.x, y: strikeLoc.y + 1, z: strikeLoc.z });
              safePlaySound(dim, SOUNDS.SERAPH_PULSE, strikeLoc, { pitch: 1.2, volume: 0.9 });

              for (const p of dim.getPlayers({ location: strikeLoc, maxDistance: 3.4 })) {
                try {
                  p.applyDamage(st.phase === 3 ? 10 : 7, { cause: EntityDamageCause.magic, damagingEntity: boss });
                } catch {
                  // Safe ignore
                }
              }
            }, 30);
          }
        }
      }
    }
  }
}

/**
 * Grand Victory Celebration when The Astral Seraph is defeated!
 */
export function handleSeraphDeath(event) {
  const dead = event.deadEntity;
  if (!dead || dead.typeId !== ENTITIES.ASTRAL_SERAPH) return;
  seraphState.delete(dead.id);

  const dim = dead.dimension;
  const loc = dead.location;
  safePlaySound(dim, SOUNDS.SERAPH_DEFEAT, loc, { volume: 1.0 });
  safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, { x: loc.x, y: loc.y + 2, z: loc.z });
  safeSpawnParticle(dim, PARTICLES.SERAPH_NOVA, loc);
  safeSpawnParticle(dim, PARTICLES.AURORA_RIBBONS, { x: loc.x, y: loc.y + 8, z: loc.z });

  for (const p of dim.getPlayers({ location: loc, maxDistance: 64 })) {
    try {
      p.addEffect("minecraft:regeneration", 200, { amplifier: 1, showParticles: false });
      p.addEffect("minecraft:slow_falling", 200, { amplifier: 0, showParticles: false });
    } catch {
      // Safe ignore
    }
    p.onScreenDisplay.setTitle("§e✦ §bSERAPH VANQUISHED §e✦", {
      subtitle: "§dThe Prism-Tide sings your triumph!",
      fadeInDuration: 12,
      stayDuration: 85,
      fadeOutDuration: 25,
    });
  }
}
