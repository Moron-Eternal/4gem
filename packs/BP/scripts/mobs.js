// Living Auralis v2 Ecosystem, Graceful Glider Steering & Arena-Tethered Astral Seraph Boss Controller

import { world, system, EntityDamageCause, GameMode } from "@minecraft/server";
import {
  DIMENSION_ID,
  ENTITIES,
  ITEMS,
  PARTICLES,
  SOUNDS,
  safeSpawnParticle,
  safePlaySound,
  dist3,
  dist2,
} from "./constants.js";
import { getZoneAt } from "./noise.js";

// Boss states synced to RP animation controller via auralis:boss_state (0..4)
const BOSS_STATE = {
  MAJESTY: 0,
  BOLT_VOLLEY: 1,
  SWOOP_SLASH: 2,
  HARMONIC_NOVA: 3,
  STAR_PILLARS: 4,
};

const seraphState = new Map(); // entity.id -> controller state
const rayCruise = new Map();   // entity.id -> { cx, cy, cz, angle, radius, speed, dir }
const altarCooldown = new Map();

// =============================================================================
// MATH & ROTATION HELPERS
// =============================================================================

function computeYawPitch(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const horiz = Math.hypot(dx, dz);
  const yaw = (Math.atan2(-dx, dz) * 180) / Math.PI;
  const pitch = Math.max(-38, Math.min(38, (-Math.atan2(dy, Math.max(0.1, horiz)) * 180) / Math.PI));
  return { x: pitch, y: yaw };
}

function stepAngleDeg(cur, target, maxStep) {
  let diff = ((target - cur + 540) % 360) - 180;
  if (diff > maxStep) diff = maxStep;
  else if (diff < -maxStep) diff = -maxStep;
  return cur + diff;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function setEntityPropSafe(entity, propId, value) {
  try {
    entity.setProperty(propId, value);
  } catch {
    // Non-fatal fallback
  }
}

function findSurfaceY(dim, x, z, maxY, minY) {
  const hi = Math.min(200, maxY);
  const lo = Math.max(42, minY);
  for (let y = hi; y >= lo; y--) {
    try {
      const b = dim.getBlock({ x, y, z });
      const above = dim.getBlock({ x, y: y + 1, z });
      const above2 = dim.getBlock({ x, y: y + 2, z });
      if (b && !b.isAir && !b.isLiquid && above && above.isAir && above2 && above2.isAir) {
        return y;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function isCombatTarget(player) {
  if (!player || !player.isValid) return false;
  try {
    const gm = player.getGameMode();
    return gm !== GameMode.Spectator;
  } catch {
    return true;
  }
}

function isSurvivalTarget(player) {
  if (!player || !player.isValid) return false;
  try {
    const gm = player.getGameMode();
    return gm === GameMode.Survival || gm === GameMode.Adventure;
  } catch {
    return true;
  }
}

// =============================================================================
// 1. NATURAL LIVING ECOSYSTEM SPAWNING (ALL 9 CREATURES!)
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

    let nearbyMobs;
    try {
      nearbyMobs = dim.getEntities({
        families: ["auralis"],
        location: loc,
        maxDistance: 72,
      });
    } catch {
      continue;
    }

    // Soft ambient particles on nearby magical creatures
    for (const mob of nearbyMobs) {
      if (!mob.isValid) continue;
      if (mob.typeId === ENTITIES.LUMINA_RAY && Math.random() < 0.55) {
        safeSpawnParticle(dim, PARTICLES.MANTA_TRAIL, mob.location);
      } else if (mob.typeId === ENTITIES.CHOIR_WISP && Math.random() < 0.40) {
        safeSpawnParticle(dim, PARTICLES.WISP_NOTES, {
          x: mob.location.x,
          y: mob.location.y + 0.7,
          z: mob.location.z,
        });
      } else if (mob.typeId === ENTITIES.TIDE_JELLY && Math.random() < 0.35) {
        safeSpawnParticle(dim, PARTICLES.CRYSTAL_SHIMMER, {
          x: mob.location.x,
          y: mob.location.y + 0.4,
          z: mob.location.z,
        });
      }
    }

    if (nearbyMobs.length >= 18) continue;

    // Sample spawn point 18..48 blocks away so large islands & cloud plains feel alive!
    const ang = Math.random() * Math.PI * 2;
    const rad = 18 + Math.random() * 30;
    const sx = Math.floor(loc.x + Math.cos(ang) * rad);
    const sz = Math.floor(loc.z + Math.sin(ang) * rad);
    const zone = getZoneAt(sx, sz);
    const roll = Math.random();

    try {
      if (zone === "cloud_plains") {
        // Cloud Plains: Nimbus Stag herds, Aurelia Cloud-Jellies, Choir Wisps & overhead Lumina Rays!
        if (roll < 0.34) {
          const gy = findSurfaceY(dim, sx, sz, 72, 44);
          if (gy !== null) {
            dim.spawnEntity(ENTITIES.NIMBUS_STAG, { x: sx + 0.5, y: gy + 1, z: sz + 0.5 });
            if (Math.random() < 0.5) {
              const gy2 = findSurfaceY(dim, sx + 2, sz + 1, 72, 44);
              if (gy2 !== null) dim.spawnEntity(ENTITIES.NIMBUS_STAG, { x: sx + 2.5, y: gy2 + 1, z: sz + 1.5 });
            }
          }
        } else if (roll < 0.64) {
          const gy = findSurfaceY(dim, sx, sz, 74, 44);
          const sy = gy !== null ? gy + 4 + Math.floor(Math.random() * 5) : 58;
          const b = dim.getBlock({ x: sx, y: sy, z: sz });
          if (b && b.isAir) dim.spawnEntity(ENTITIES.TIDE_JELLY, { x: sx + 0.5, y: sy, z: sz + 0.5 });
        } else if (roll < 0.84) {
          const sy = clamp(Math.floor(loc.y + 8 + Math.random() * 14), 66, 128);
          const b = dim.getBlock({ x: sx, y: sy, z: sz });
          if (b && b.isAir) dim.spawnEntity(ENTITIES.LUMINA_RAY, { x: sx + 0.5, y: sy, z: sz + 0.5 });
        } else {
          const gy = findSurfaceY(dim, sx, sz, 72, 44);
          if (gy !== null) dim.spawnEntity(ENTITIES.CHOIR_WISP, { x: sx + 0.5, y: gy + 2.5, z: sz + 0.5 });
        }
      } else if (zone === "bell_reefs") {
        // Bell-Reefs: Tide-Glass Crabs, Aurelia Cloud-Jellies, Astral Weavers & Choir Wisps!
        if (roll < 0.30) {
          const gy = findSurfaceY(dim, sx, sz, Math.floor(loc.y) + 18, 44);
          if (gy !== null) dim.spawnEntity(ENTITIES.GLASS_CRAB, { x: sx + 0.5, y: gy + 1, z: sz + 0.5 });
        } else if (roll < 0.56) {
          const gy = findSurfaceY(dim, sx, sz, Math.floor(loc.y) + 18, 44);
          if (gy !== null) dim.spawnEntity(ENTITIES.TIDE_JELLY, { x: sx + 0.5, y: gy + 4, z: sz + 0.5 });
        } else if (roll < 0.80) {
          const gy = findSurfaceY(dim, sx, sz, Math.floor(loc.y) + 20, 44);
          if (gy !== null) dim.spawnEntity(ENTITIES.ASTRAL_WEAVER, { x: sx + 0.5, y: gy + 2, z: sz + 0.5 });
        } else {
          const sy = clamp(Math.floor(loc.y + 8 + Math.random() * 14), 72, 132);
          const b = dim.getBlock({ x: sx, y: sy, z: sz });
          if (b && b.isAir) dim.spawnEntity(ENTITIES.LUMINA_RAY, { x: sx + 0.5, y: sy, z: sz + 0.5 });
        }
      } else if (zone === "spire_gardens" || zone === "astral_citadel") {
        // Spire Gardens & Citadels: Shard Stalkers, Gilded Sentinels, Astral Weavers & Lumina Rays!
        if (roll < 0.34) {
          const gy = findSurfaceY(dim, sx, sz, Math.floor(loc.y) + 20, 48);
          if (gy !== null) dim.spawnEntity(ENTITIES.SHARD_STALKER, { x: sx + 0.5, y: gy + 1, z: sz + 0.5 });
        } else if (roll < 0.62) {
          const gy = findSurfaceY(dim, sx, sz, Math.floor(loc.y) + 20, 48);
          if (gy !== null) dim.spawnEntity(ENTITIES.GILDED_SENTINEL, { x: sx + 0.5, y: gy + 2, z: sz + 0.5 });
        } else if (roll < 0.84) {
          const gy = findSurfaceY(dim, sx, sz, Math.floor(loc.y) + 20, 48);
          if (gy !== null) dim.spawnEntity(ENTITIES.ASTRAL_WEAVER, { x: sx + 0.5, y: gy + 2, z: sz + 0.5 });
        } else {
          const sy = clamp(Math.floor(loc.y + 10 + Math.random() * 14), 86, 138);
          const b = dim.getBlock({ x: sx, y: sy, z: sz });
          if (b && b.isAir) dim.spawnEntity(ENTITIES.LUMINA_RAY, { x: sx + 0.5, y: sy, z: sz + 0.5 });
        }
      } else {
        // Pearl-Terrace Atolls & Sanctuary outskirts: Rich balanced passive + occasional stalker!
        if (roll < 0.26) {
          const gy = findSurfaceY(dim, sx, sz, Math.floor(loc.y) + 18, 44);
          if (gy !== null) dim.spawnEntity(ENTITIES.NIMBUS_STAG, { x: sx + 0.5, y: gy + 1, z: sz + 0.5 });
        } else if (roll < 0.48) {
          const sy = clamp(Math.floor(loc.y + 8 + Math.random() * 14), 76, 134);
          const b = dim.getBlock({ x: sx, y: sy, z: sz });
          if (b && b.isAir) dim.spawnEntity(ENTITIES.LUMINA_RAY, { x: sx + 0.5, y: sy, z: sz + 0.5 });
        } else if (roll < 0.66) {
          const gy = findSurfaceY(dim, sx, sz, Math.floor(loc.y) + 18, 44);
          if (gy !== null) dim.spawnEntity(ENTITIES.CHOIR_WISP, { x: sx + 0.5, y: gy + 2.5, z: sz + 0.5 });
        } else if (roll < 0.80) {
          const gy = findSurfaceY(dim, sx, sz, Math.floor(loc.y) + 18, 44);
          if (gy !== null) dim.spawnEntity(ENTITIES.GLASS_CRAB, { x: sx + 0.5, y: gy + 1, z: sz + 0.5 });
        } else if (roll < 0.90) {
          const gy = findSurfaceY(dim, sx, sz, Math.floor(loc.y) + 18, 44);
          if (gy !== null) dim.spawnEntity(ENTITIES.TIDE_JELLY, { x: sx + 0.5, y: gy + 4, z: sz + 0.5 });
        } else if (zone !== "sanctuary") {
          const gy = findSurfaceY(dim, sx, sz, Math.floor(loc.y) + 18, 48);
          if (gy !== null) dim.spawnEntity(ENTITIES.SHARD_STALKER, { x: sx + 0.5, y: gy + 1, z: sz + 0.5 });
        }
      }
    } catch {
      // Unloaded chunk skip
    }
  }
}

// =============================================================================
// 2. GRACEFUL SKY-MANTA GLIDE STEERING & ASTRAL WEAVER CAST SYNC (Every 4 Ticks)
// =============================================================================

export function tickGracefulFlyers() {
  let dims = [];
  try {
    dims = [world.getDimension(DIMENSION_ID), world.getDimension("minecraft:overworld")];
  } catch {
    return;
  }

  for (const dim of dims) {
    // A. Majestic smooth circular cruising for Lumina Rays (ZERO erratic twitching!)
    let rays;
    try {
      rays = dim.getEntities({ type: ENTITIES.LUMINA_RAY });
    } catch {
      rays = [];
    }
    for (const ray of rays) {
      if (!ray.isValid) continue;
      const loc = ray.location;
      let rc = rayCruise.get(ray.id);
      if (!rc) {
        rc = {
          cx: loc.x,
          cy: clamp(loc.y, 68, 126),
          cz: loc.z,
          angle: Math.random() * Math.PI * 2,
          radius: 13 + Math.random() * 10,
          speed: 0.032 + Math.random() * 0.015,
          dir: Math.random() < 0.5 ? 1 : -1,
        };
        rayCruise.set(ray.id, rc);
      }
      rc.angle += rc.speed * rc.dir;
      const tx = rc.cx + Math.cos(rc.angle) * rc.radius;
      const tz = rc.cz + Math.sin(rc.angle) * rc.radius;
      const ty = rc.cy + Math.sin(rc.angle * 2.0) * 2.4;

      const vx = clamp((tx - loc.x) * 0.045, -0.16, 0.16);
      const vy = clamp((ty - loc.y) * 0.055, -0.09, 0.09);
      const vz = clamp((tz - loc.z) * 0.045, -0.16, 0.16);
      try {
        ray.clearVelocity();
        ray.applyImpulse({ x: vx, y: vy, z: vz });
        if (Math.hypot(vx, vz) > 0.015) {
          const desiredRot = computeYawPitch(loc, { x: loc.x + vx * 8, y: loc.y + vy * 4, z: loc.z + vz * 8 });
          const curRot = ray.getRotation();
          ray.setRotation({
            x: clamp(desiredRot.x * 0.5, -18, 18),
            y: stepAngleDeg(curRot.y, desiredRot.y, 10),
          });
        }
      } catch {
        // Ignore unloaded tick
      }
    }

    // B. Sync Astral Weaver casting pose + facing cleanly toward target player!
    let weavers;
    try {
      weavers = dim.getEntities({ type: ENTITIES.ASTRAL_WEAVER });
    } catch {
      weavers = [];
    }
    for (const weaver of weavers) {
      if (!weaver.isValid) continue;
      try {
        const players = dim.getPlayers({ location: weaver.location, maxDistance: 22 });
        const target = players.find(isSurvivalTarget);
        if (target) {
          setEntityPropSafe(weaver, "auralis:casting", true);
          const want = computeYawPitch(weaver.location, target.location);
          const cur = weaver.getRotation();
          weaver.setRotation({ x: want.x * 0.4, y: stepAngleDeg(cur.y, want.y, 20) });
        } else {
          setEntityPropSafe(weaver, "auralis:casting", false);
        }
      } catch {
        // Safe ignore
      }
    }
  }
}

// =============================================================================
// 3. CREATURE INTERACTIONS (Feeding Lumina Rays & Nimbus Stags Prism Berries!)
// =============================================================================

export function handleEntityInteract(event) {
  const { player, target, itemStack } = event;
  if (!player || !target || !target.isValid) return;

  if (itemStack?.typeId !== ITEMS.PRISM_BERRY) return;

  if (target.typeId === ENTITIES.LUMINA_RAY || target.typeId === ENTITIES.NIMBUS_STAG) {
    const isRay = target.typeId === ENTITIES.LUMINA_RAY;
    system.run(() => {
      if (!target.isValid || !player.isValid) return;
      const dim = target.dimension;
      const loc = target.location;

      // Consume 1 Prism Berry
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
        if (isRay) {
          player.addEffect("minecraft:slow_falling", 900, { amplifier: 0, showParticles: false });
          player.addEffect("minecraft:night_vision", 1200, { amplifier: 0, showParticles: false });
        } else {
          player.addEffect("minecraft:speed", 700, { amplifier: 0, showParticles: false });
          player.addEffect("minecraft:jump_boost", 700, { amplifier: 1, showParticles: false });
          player.addEffect("minecraft:slow_falling", 400, { amplifier: 0, showParticles: false });
        }
      } catch {
        // Safe ignore
      }

      safePlaySound(dim, isRay ? SOUNDS.MANTA_CALL : SOUNDS.STAG_CALL, loc, { volume: 0.75, pitch: 1.08 });
      safeSpawnParticle(dim, PARTICLES.WISP_NOTES, { x: loc.x, y: loc.y + 1.2, z: loc.z });
      safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, loc);
      player.onScreenDisplay.setActionBar(
        isRay
          ? "§b✦ The Lumina Ray sings in gratitude — §eSky-Grace & Starlight Sight granted!"
          : "§b✦ The Nimbus Stag bows gently — §eCloud-Strider Swiftness & Leap granted!"
      );
    });
  }
}

// =============================================================================
// 4. VESPERA ALTAR AWAKENING & ARENA-TETHERED ASTRAL SERAPH 2.0 BOSS AI!
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

  try {
    const existing = dim.getEntities({
      type: ENTITIES.ASTRAL_SERAPH,
      location: loc,
      maxDistance: 56,
    });
    if (existing.length > 0) {
      player.onScreenDisplay.setActionBar("§e✦ The Astral Seraph already graces this Citadel!");
      return;
    }
  } catch {
    // Continue
  }

  const equip = player.getComponent("minecraft:equippable");
  const held = equip?.getEquipment("Mainhand");
  if (!held || held.typeId !== ITEMS.STAR_CORE) {
    safePlaySound(dim, SOUNDS.CRYSTAL_STEP, loc, { pitch: 0.85, volume: 0.65 });
    safeSpawnParticle(dim, PARTICLES.CRYSTAL_SHIMMER, { x: loc.x + 0.5, y: loc.y + 1.2, z: loc.z + 0.5 });
    player.onScreenDisplay.setActionBar("§dVespera Sanctum Altar §8— §7Offer a §dResonant Star-Core §7to awaken §eThe Astral Seraph§7.");
    return;
  }

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

  safePlaySound(dim, SOUNDS.SERAPH_AWAKEN, center, { volume: 0.85 });
  safeSpawnParticle(dim, PARTICLES.STAR_PILLAR, center);
  safeSpawnParticle(dim, PARTICLES.SERAPH_NOVA, center);

  for (const p of dim.getPlayers({ location: center, maxDistance: 64 })) {
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
      setEntityPropSafe(boss, "auralis:boss_state", BOSS_STATE.MAJESTY);
      setEntityPropSafe(boss, "auralis:boss_phase", 1);
      safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, spawnLoc);
      safeSpawnParticle(dim, PARTICLES.SERAPH_NOVA, spawnLoc);
      safePlaySound(dim, SOUNDS.SERAPH_PULSE, spawnLoc, { volume: 0.80 });
      seraphState.set(boss.id, createBossState(spawnLoc, system.currentTick));
    } catch (err) {
      console.warn(`[Auralis] Seraph spawn warning: ${err}`);
    }
  }, 40);
}

function createBossState(anchorLoc, nowTick) {
  return {
    phase: 1,
    state: BOSS_STATE.MAJESTY,
    stateEndTick: nowTick + 45,
    nextAttackTick: nowTick + 55,
    attackIndex: 0,
    summonedGuards: false,
    anchor: { x: anchorLoc.x, y: anchorLoc.y, z: anchorLoc.z },
    orbitAngle: 0,
    orbitDir: 1,
    swoopTarget: null,
    swoopHitDone: false,
  };
}

function fireAimedAstralBolt(dim, boss, origin, targetPos, yawSpreadDeg = 0, speed = 1.35) {
  try {
    const dx = targetPos.x - origin.x;
    const dy = targetPos.y - origin.y;
    const dz = targetPos.z - origin.z;
    const baseAng = Math.atan2(dz, dx) + (yawSpreadDeg * Math.PI) / 180;
    const horiz = Math.max(0.5, Math.hypot(dx, dz));
    const len = Math.hypot(horiz, dy);
    const dirX = (Math.cos(baseAng) * horiz) / len;
    const dirY = dy / len;
    const dirZ = (Math.sin(baseAng) * horiz) / len;

    const spawnPos = {
      x: origin.x + dirX * 1.8,
      y: origin.y + dirY * 1.4,
      z: origin.z + dirZ * 1.8,
    };
    const bolt = dim.spawnEntity(ENTITIES.ASTRAL_BOLT, spawnPos);
    const proj = bolt.getComponent("minecraft:projectile");
    if (proj) {
      try {
        proj.owner = boss;
      } catch {
        // Optional owner bind
      }
      proj.shoot({ x: dirX * speed, y: dirY * speed, z: dirZ * speed });
    } else {
      bolt.applyImpulse({ x: dirX * speed, y: dirY * speed, z: dirZ * speed });
    }
    safeSpawnParticle(dim, PARTICLES.SENTINEL_BEAM, spawnPos);
  } catch {
    // Safe fallback if chunk edge
  }
}

/**
 * Runs every 2 ticks (10 Hz) — delivers silky-smooth Arena-Tethered Flight,
 * guaranteed Target-Facing Rotation, and 4 Telegraphed Animated Boss Attacks!
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

      let st = seraphState.get(boss.id);
      if (!st) {
        st = createBossState(loc, tick);
        seraphState.set(boss.id, st);
        setEntityPropSafe(boss, "auralis:boss_state", BOSS_STATE.MAJESTY);
        setEntityPropSafe(boss, "auralis:boss_phase", 1);
      }

      // Soft ambient aura motes every 1.2s
      if (tick % 24 === 0) {
        safeSpawnParticle(dim, PARTICLES.WISP_NOTES, { x: loc.x, y: loc.y + 2.6, z: loc.z });
      }

      const hpComp = boss.getComponent("minecraft:health");
      const hpPct = hpComp ? hpComp.currentValue / Math.max(1, hpComp.effectiveMax) : 1.0;

      // Acquire nearest valid player within 54 blocks (prefer Survival/Adventure, fallback to Creative for playtesting!)
      let nearbyPlayers = [];
      try {
        nearbyPlayers = dim.getPlayers({ location: loc, maxDistance: 54 }).filter(isCombatTarget);
      } catch {
        nearbyPlayers = [];
      }

      if (nearbyPlayers.length === 0) {
        // Calm idle hover tethered right over its anchor point — NEVER wanders off!
        if (st.state !== BOSS_STATE.MAJESTY) {
          st.state = BOSS_STATE.MAJESTY;
          setEntityPropSafe(boss, "auralis:boss_state", BOSS_STATE.MAJESTY);
        }
        const idleY = st.anchor.y + Math.sin(tick * 0.06) * 0.9;
        try {
          boss.clearVelocity();
          boss.applyImpulse({
            x: clamp((st.anchor.x - loc.x) * 0.06, -0.22, 0.22),
            y: clamp((idleY - loc.y) * 0.07, -0.18, 0.18),
            z: clamp((st.anchor.z - loc.z) * 0.06, -0.22, 0.22),
          });
        } catch {
          // Ignore
        }
        continue;
      }

      // Pick primary target (closest survival player, else closest player so Creative testers also see full combat!)
      const survPlayers = nearbyPlayers.filter(isSurvivalTarget);
      const pool = survPlayers.length > 0 ? survPlayers : nearbyPlayers;
      pool.sort((a, b) => dist3(a.location, loc) - dist3(b.location, loc));
      const target = pool[0];
      const tLoc = target.location;

      // Softly adapt arena anchor if player lured Seraph > 26 blocks away (so spawn-egg fights anywhere work!)
      if (dist2(tLoc.x, tLoc.z, st.anchor.x, st.anchor.z) > 26) {
        st.anchor.x += (tLoc.x - st.anchor.x) * 0.08;
        st.anchor.z += (tLoc.z - st.anchor.z) * 0.08;
        st.anchor.y = tLoc.y + 3.5;
      }

      // --- 1. Phase Transitions (Synced to RP animations!) ---
      if (hpPct <= 0.65 && st.phase < 2) {
        st.phase = 2;
        setEntityPropSafe(boss, "auralis:boss_phase", 2);
        safePlaySound(dim, SOUNDS.SERAPH_AWAKEN, loc, { volume: 0.85, pitch: 1.08 });
        safeSpawnParticle(dim, PARTICLES.SERAPH_NOVA, loc);
        safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, { x: loc.x, y: loc.y + 2, z: loc.z });
        for (const p of nearbyPlayers) {
          p.onScreenDisplay.setActionBar("§e✦ §dPhase II: Harmonic Resonance — §bThe Seraph calls its Guardians!");
        }
        if (!st.summonedGuards) {
          st.summonedGuards = true;
          for (const ox of [-6, 6]) {
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
        setEntityPropSafe(boss, "auralis:boss_phase", 3);
        safePlaySound(dim, SOUNDS.SERAPH_AWAKEN, loc, { volume: 0.90, pitch: 1.18 });
        safeSpawnParticle(dim, PARTICLES.SERAPH_NOVA, loc);
        safeSpawnParticle(dim, PARTICLES.STAR_PILLAR, loc);
        for (const p of nearbyPlayers) {
          p.onScreenDisplay.setActionBar("§e✦ §cPhase III: Crescendo of the Glass Tide!");
        }
      }

      // --- 2. Return to MAJESTY hover state when an attack animation finishes ---
      if (st.state !== BOSS_STATE.MAJESTY && tick >= st.stateEndTick) {
        st.state = BOSS_STATE.MAJESTY;
        st.swoopTarget = null;
        setEntityPropSafe(boss, "auralis:boss_state", BOSS_STATE.MAJESTY);
      }

      // --- 3. Smooth Target-Facing Rotation (NEVER locked looking one direction!) ---
      try {
        const desiredRot = computeYawPitch(
          { x: loc.x, y: loc.y + 2.6, z: loc.z },
          { x: tLoc.x, y: tLoc.y + 1.3, z: tLoc.z }
        );
        const curRot = boss.getRotation();
        const smoothYaw = stepAngleDeg(curRot.y, desiredRot.y, 22);
        const smoothPitch = clamp(desiredRot.x * 0.45, -24, 24);
        boss.setRotation({ x: smoothPitch, y: smoothYaw });
      } catch {
        // Ignore
      }

      // --- 4. Smooth Arena-Tethered Orbit / Swoop Flight Steering ---
      st.orbitAngle += (st.phase === 3 ? 0.068 : st.phase === 2 ? 0.056 : 0.046) * st.orbitDir;
      let desiredX;
      let desiredY;
      let desiredZ;
      let maxHorizSpeed = 0.34;

      if (st.state === BOSS_STATE.SWOOP_SLASH && st.swoopTarget) {
        // Dynamic sweeping melee glide right past the player!
        desiredX = st.swoopTarget.x;
        desiredY = st.swoopTarget.y + 1.4;
        desiredZ = st.swoopTarget.z;
        maxHorizSpeed = 0.56;

        // Execute crescent halberd slash when close to target!
        const distToPlayer = dist3(loc, tLoc);
        if (!st.swoopHitDone && distToPlayer <= 4.4) {
          st.swoopHitDone = true;
          safePlaySound(dim, SOUNDS.STARBLADE, loc, { volume: 0.78, pitch: 0.85 });
          safeSpawnParticle(dim, PARTICLES.STARBLADE_ARC, { x: tLoc.x, y: tLoc.y + 1.2, z: tLoc.z });
          safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, { x: tLoc.x, y: tLoc.y + 1.2, z: tLoc.z });
          for (const p of nearbyPlayers) {
            if (dist3(p.location, loc) <= 5.0) {
              const d = Math.max(0.5, dist3(p.location, loc));
              try {
                p.applyDamage(st.phase === 3 ? 10 : 7, { cause: EntityDamageCause.entityAttack, damagingEntity: boss });
                p.applyKnockback({ x: ((p.location.x - loc.x) / d) * 1.1, z: ((p.location.z - loc.z) / d) * 1.1 }, 0.42);
              } catch {
                // Safe guard
              }
            }
          }
        }
      } else {
        // Controlled majestic combat orbit around player (staying close enough to engage & NEVER fleeing!)
        const orbitR = st.state === BOSS_STATE.HARMONIC_NOVA ? 5.5 : (st.phase === 3 ? 7.5 : 9.0);
        desiredX = tLoc.x + Math.cos(st.orbitAngle) * orbitR;
        desiredZ = tLoc.z + Math.sin(st.orbitAngle) * orbitR;
        desiredY = tLoc.y + (st.state === BOSS_STATE.STAR_PILLARS ? 5.0 : 3.2) + Math.sin(tick * 0.08) * 0.7;

        // Soft arena tether keeps orbit nicely over the Citadel plateau
        const dAnchor = dist2(desiredX, desiredZ, st.anchor.x, st.anchor.z);
        if (dAnchor > 22) {
          const pull = 22 / dAnchor;
          desiredX = st.anchor.x + (desiredX - st.anchor.x) * pull;
          desiredZ = st.anchor.z + (desiredZ - st.anchor.z) * pull;
        }
      }

      // Ground clearance guard so boss never clips into arena floor
      try {
        const below = dim.getBlock({ x: Math.floor(desiredX), y: Math.floor(desiredY - 1), z: Math.floor(desiredZ) });
        if (below && !below.isAir) desiredY = Math.floor(desiredY) + 2.2;
      } catch {
        // Ignore
      }

      try {
        const vx = clamp((desiredX - loc.x) * 0.09, -maxHorizSpeed, maxHorizSpeed);
        const vy = clamp((desiredY - loc.y) * 0.10, -0.32, 0.32);
        const vz = clamp((desiredZ - loc.z) * 0.09, -maxHorizSpeed, maxHorizSpeed);
        boss.clearVelocity();
        boss.applyImpulse({ x: vx, y: vy, z: vz });
      } catch {
        // Ignore
      }

      // --- 5. Relentless, Fair, Telegraphed 4-Attack Boss Cycle! ---
      if (tick >= st.nextAttackTick && st.state === BOSS_STATE.MAJESTY) {
        const cooldown = st.phase === 3 ? 58 : st.phase === 2 ? 72 : 86;
        st.nextAttackTick = tick + cooldown;
        // Cycle cleanly across all 4 signature moves so the fight always feels dynamic!
        const pattern = [
          BOSS_STATE.BOLT_VOLLEY,
          BOSS_STATE.SWOOP_SLASH,
          BOSS_STATE.BOLT_VOLLEY,
          BOSS_STATE.HARMONIC_NOVA,
          BOSS_STATE.STAR_PILLARS,
        ];
        const move = pattern[st.attackIndex % pattern.length];
        st.attackIndex++;
        if (st.attackIndex % 2 === 0) st.orbitDir *= -1;

        const bossId = boss.id;
        const bossCenter = { x: loc.x, y: loc.y + 2.4, z: loc.z };

        if (move === BOSS_STATE.BOLT_VOLLEY) {
          // Attack 1: Starlight Bolt Fan Volley (aimed directly at player!)
          st.state = BOSS_STATE.BOLT_VOLLEY;
          st.stateEndTick = tick + 34;
          setEntityPropSafe(boss, "auralis:boss_state", BOSS_STATE.BOLT_VOLLEY);
          safeSpawnParticle(dim, PARTICLES.SERAPH_CHARGE, bossCenter);
          safePlaySound(dim, SOUNDS.SENTINEL_BLAST, bossCenter, { volume: 0.72, pitch: 1.05 });

          const spreads = st.phase === 3 ? [-24, -12, 0, 12, 24] : [-14, 0, 14];
          system.runTimeout(() => {
            if (!boss.isValid || !target.isValid) return;
            const origin = { x: boss.location.x, y: boss.location.y + 2.3, z: boss.location.z };
            const aim = { x: target.location.x, y: target.location.y + 1.1, z: target.location.z };
            safePlaySound(dim, SOUNDS.SENTINEL_BLAST, origin, { volume: 0.78, pitch: 0.95 });
            for (const sp of spreads) {
              fireAimedAstralBolt(dim, boss, origin, aim, sp, st.phase === 3 ? 1.48 : 1.32);
            }
          }, 12);

          // Phase 3 follow-up burst!
          if (st.phase === 3) {
            system.runTimeout(() => {
              if (!boss.isValid || !target.isValid) return;
              const origin = { x: boss.location.x, y: boss.location.y + 2.3, z: boss.location.z };
              const aim = { x: target.location.x, y: target.location.y + 1.1, z: target.location.z };
              for (const sp of [-8, 8]) {
                fireAimedAstralBolt(dim, boss, origin, aim, sp, 1.52);
              }
            }, 22);
          }
        } else if (move === BOSS_STATE.SWOOP_SLASH) {
          // Attack 2: Radiant Swoop Slash (telegraphed melee halberd dive!)
          st.state = BOSS_STATE.SWOOP_SLASH;
          st.stateEndTick = tick + 36;
          st.swoopHitDone = false;
          st.swoopTarget = { x: tLoc.x, y: tLoc.y, z: tLoc.z };
          setEntityPropSafe(boss, "auralis:boss_state", BOSS_STATE.SWOOP_SLASH);
          safeSpawnParticle(dim, PARTICLES.SERAPH_CHARGE, bossCenter);
          safePlaySound(dim, SOUNDS.RITUAL_CHIME, bossCenter, { volume: 0.72, pitch: 1.18 });
        } else if (move === BOSS_STATE.HARMONIC_NOVA) {
          // Attack 3: Telegraphed Harmonic Shockwave Nova (1.0s gather -> radiant blast!)
          st.state = BOSS_STATE.HARMONIC_NOVA;
          st.stateEndTick = tick + 38;
          setEntityPropSafe(boss, "auralis:boss_state", BOSS_STATE.HARMONIC_NOVA);
          safeSpawnParticle(dim, PARTICLES.SERAPH_CHARGE, bossCenter);
          safePlaySound(dim, SOUNDS.RITUAL_CHIME, bossCenter, { volume: 0.75, pitch: 0.92 });

          system.runTimeout(() => {
            if (!boss.isValid) return;
            const curLoc = boss.location;
            safePlaySound(dim, SOUNDS.SERAPH_PULSE, curLoc, { volume: 0.85 });
            safeSpawnParticle(dim, PARTICLES.SERAPH_NOVA, { x: curLoc.x, y: curLoc.y + 0.8, z: curLoc.z });
            safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, { x: curLoc.x, y: curLoc.y + 1.8, z: curLoc.z });

            const victims = dim.getPlayers({ location: curLoc, maxDistance: 9.0 }).filter(isCombatTarget);
            for (const p of victims) {
              const d = Math.max(0.5, dist3(p.location, curLoc));
              try {
                p.applyDamage(st.phase === 3 ? 9 : 6, { cause: EntityDamageCause.magic, damagingEntity: boss });
                p.applyKnockback({ x: ((p.location.x - curLoc.x) / d) * 1.35, z: ((p.location.z - curLoc.z) / d) * 1.35 }, 0.50);
              } catch {
                // Safe guard
              }
            }
          }, 20);
        } else {
          // Attack 4: Celestial Star-Pillars (dodgeable ground glyph -> sky pillar eruption!)
          st.state = BOSS_STATE.STAR_PILLARS;
          st.stateEndTick = tick + 42;
          setEntityPropSafe(boss, "auralis:boss_state", BOSS_STATE.STAR_PILLARS);
          safeSpawnParticle(dim, PARTICLES.SERAPH_CHARGE, bossCenter);

          const targets = nearbyPlayers.slice(0, st.phase === 3 ? 3 : 2);
          for (const targetPlayer of targets) {
            const strikeLoc = { ...targetPlayer.location };
            safeSpawnParticle(dim, PARTICLES.HARMONIC_RING, { x: strikeLoc.x, y: strikeLoc.y + 0.15, z: strikeLoc.z });
            safePlaySound(dim, SOUNDS.RITUAL_CHIME, strikeLoc, { pitch: 1.25, volume: 0.65 });

            system.runTimeout(() => {
              if (!seraphState.has(bossId)) return;
              safeSpawnParticle(dim, PARTICLES.STAR_PILLAR, strikeLoc);
              safeSpawnParticle(dim, PARTICLES.STARLIGHT_BURST, { x: strikeLoc.x, y: strikeLoc.y + 1, z: strikeLoc.z });
              safePlaySound(dim, SOUNDS.SERAPH_PULSE, strikeLoc, { pitch: 1.15, volume: 0.72 });

              for (const p of dim.getPlayers({ location: strikeLoc, maxDistance: 3.4 })) {
                try {
                  p.applyDamage(st.phase === 3 ? 10 : 7, { cause: EntityDamageCause.magic, damagingEntity: boss });
                } catch {
                  // Safe ignore
                }
              }
            }, 28);
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
  if (!dead) return;
  if (dead.typeId === ENTITIES.LUMINA_RAY) {
    rayCruise.delete(dead.id);
    return;
  }
  if (dead.typeId !== ENTITIES.ASTRAL_SERAPH) return;
  seraphState.delete(dead.id);

  const dim = dead.dimension;
  const loc = dead.location;
  safePlaySound(dim, SOUNDS.SERAPH_DEFEAT, loc, { volume: 0.90 });
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
