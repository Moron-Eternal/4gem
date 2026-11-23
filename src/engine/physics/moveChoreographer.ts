import { MoveData, MovePhysicsProfile } from '../../types/game';
import {
  ARENA_H,
  ARENA_W,
  ArenaGrid,
  ENEMY_ANCHOR_X,
  ENEMY_ANCHOR_Y,
  PLAY_MAX_X,
  PLAY_MIN_X,
  PLAYER_ANCHOR_X,
  PLAYER_ANCHOR_Y,
} from './arenaGrid';
import { ParticleSystem } from './particleSystem';

export interface FighterVisualState {
  x: number;
  y: number;
  z: number; // height off floor (jumping / surfing)
  hitFlash: number; // 0..1 white impact flash
  knockbackVx: number;
  knockbackVy: number;
  wetness: number; // 0..1 dripping wet
  singed: number; // 0..1 fire rim & smoke
  frosted: number; // 0..1 crystalline frost overlay
  shocked: number; // 0..1 electric jitter
  alpha: number; // 0..1 (0 while inside Poké Ball or fainted)
  scaleMult: number;
}

export interface BeamVisual {
  kind: 'flamethrower' | 'water_jet' | 'ice_beam' | 'solar_beam' | 'vine_whip' | 'psychic' | 'poison';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  progress: number; // 0..1
  intensity: number;
}

export interface ProjectileVisual {
  kind: 'boulder' | 'fireball' | 'pokeball' | 'sludge' | 'leaf_cluster';
  x: number;
  y: number;
  z: number;
  radius: number;
  rotation: number;
  ballStyle?: 'poke_ball' | 'great_ball' | 'ultra_ball';
  shakeAngle?: number;
  capturedGlow?: number;
}

export interface ActiveMoveSequence {
  attackerSide: 'player' | 'enemy';
  move: MoveData;
  profile: MovePhysicsProfile;
  elapsed: number;
  duration: number;
  impactFired: boolean;
  onImpact?: () => void;
  onComplete?: () => void;
  /** Extra internal timer for pulsing particle/grid injections */
  emitAccum: number;
  boltAccum: number;
}

export interface ActiveCatchSequence {
  ballStyle: 'poke_ball' | 'great_ball' | 'ultra_ball';
  shakes: number; // 0..3
  caught: boolean;
  elapsed: number;
  totalDuration: number;
  phase: 'throw' | 'absorb' | 'drop' | 'shake' | 'resolve';
  shookCount: number;
  onShake?: (index: number) => void;
  onComplete?: (caught: boolean) => void;
}

export function createFighterVisual(side: 'player' | 'enemy'): FighterVisualState {
  return {
    x: side === 'player' ? PLAYER_ANCHOR_X : ENEMY_ANCHOR_X,
    y: side === 'player' ? PLAYER_ANCHOR_Y : ENEMY_ANCHOR_Y,
    z: 0,
    hitFlash: 0,
    knockbackVx: 0,
    knockbackVy: 0,
    wetness: 0,
    singed: 0,
    frosted: 0,
    shocked: 0,
    alpha: 1,
    scaleMult: 1,
  };
}

/**
 * Coordinates real-time stat-scaled move animations, sprite kinematics, camera shake,
 * fluid/fire/electric/ice/crater injections into ArenaGrid, and Poké Ball catch physics.
 */
export class MoveChoreographer {
  public readonly grid: ArenaGrid;
  public readonly particles: ParticleSystem;

  public playerVisual: FighterVisualState = createFighterVisual('player');
  public enemyVisual: FighterVisualState = createFighterVisual('enemy');

  public activeMove: ActiveMoveSequence | null = null;
  public activeCatch: ActiveCatchSequence | null = null;
  public activeBeams: BeamVisual[] = [];
  public activeProjectiles: ProjectileVisual[] = [];

  public shakeMag = 0;
  public shakeX = 0;
  public shakeY = 0;
  public screenFlash = 0;
  public screenFlashColor: 'white' | 'yellow' | 'orange' | 'cyan' = 'white';

  constructor(grid: ArenaGrid, particles: ParticleSystem) {
    this.grid = grid;
    this.particles = particles;
  }

  public resetVisuals(): void {
    this.playerVisual = createFighterVisual('player');
    this.enemyVisual = createFighterVisual('enemy');
    this.activeMove = null;
    this.activeCatch = null;
    this.activeBeams = [];
    this.activeProjectiles = [];
    this.shakeMag = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.screenFlash = 0;
  }

  public triggerMove(
    attackerSide: 'player' | 'enemy',
    move: MoveData,
    profile: MovePhysicsProfile,
    callbacks?: { onImpact?: () => void; onComplete?: () => void }
  ): void {
    this.grid.resetRecentReactions();
    this.activeBeams = [];
    this.activeProjectiles = [];
    this.activeCatch = null;

    this.activeMove = {
      attackerSide,
      move,
      profile,
      elapsed: 0,
      duration: profile.durationSec,
      impactFired: false,
      onImpact: callbacks?.onImpact,
      onComplete: callbacks?.onComplete,
      emitAccum: 0,
      boltAccum: 0,
    };
  }

  public triggerPokeballThrow(
    ballStyle: 'poke_ball' | 'great_ball' | 'ultra_ball',
    shakes: number,
    caught: boolean,
    callbacks?: { onShake?: (idx: number) => void; onComplete?: (caught: boolean) => void }
  ): void {
    this.activeMove = null;
    this.activeBeams = [];
    this.activeProjectiles = [];
    const totalDuration = 1.45 + shakes * 0.65 + 0.55;
    this.activeCatch = {
      ballStyle,
      shakes,
      caught,
      elapsed: 0,
      totalDuration,
      phase: 'throw',
      shookCount: 0,
      onShake: callbacks?.onShake,
      onComplete: callbacks?.onComplete,
    };
  }

  public isBusy(): boolean {
    return this.activeMove !== null || this.activeCatch !== null;
  }

  public step(dt: number): void {
    const clampedDt = Math.min(0.05, dt);

    // 1. Decay camera shake & flash
    if (this.shakeMag > 0.05) {
      this.shakeMag *= Math.pow(0.08, clampedDt);
      this.shakeX = Math.round((Math.random() - 0.5) * 2 * this.shakeMag);
      this.shakeY = Math.round((Math.random() - 0.5) * 2 * this.shakeMag);
    } else {
      this.shakeMag = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }

    if (this.screenFlash > 0) {
      this.screenFlash = Math.max(0, this.screenFlash - clampedDt * 3.8);
    }

    // 2. Step fighter spring recovery & elemental drips/sparks
    this.stepFighterVisual(this.playerVisual, PLAYER_ANCHOR_X, PLAYER_ANCHOR_Y, clampedDt);
    this.stepFighterVisual(this.enemyVisual, ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, clampedDt);

    // 3. Step active move choreography
    if (this.activeMove) {
      this.stepActiveMove(this.activeMove, clampedDt);
    } else if (this.activeCatch) {
      this.stepActiveCatch(this.activeCatch, clampedDt);
    }

    // 4. Advance physics grid & particles
    this.grid.step(clampedDt);
    this.particles.step(clampedDt);
  }

  private stepFighterVisual(
    v: FighterVisualState,
    anchorX: number,
    anchorY: number,
    dt: number
  ): void {
    v.hitFlash = Math.max(0, v.hitFlash - dt * 4.2);
    v.wetness = Math.max(0, v.wetness - dt * 0.08);
    v.singed = Math.max(0, v.singed - dt * 0.12);
    v.frosted = Math.max(0, v.frosted - dt * 0.09);
    v.shocked = Math.max(0, v.shocked - dt * 1.4);

    // Knockback displacement + spring return when not actively lunging/surfing
    const isControlled =
      this.activeMove &&
      ((this.activeMove.attackerSide === 'player' && v === this.playerVisual) ||
        (this.activeMove.attackerSide === 'enemy' && v === this.enemyVisual)) &&
      (this.activeMove.move.archetype === 'surf_wave' ||
        this.activeMove.move.archetype === 'physical_lunge');

    if (!isControlled) {
      v.x += v.knockbackVx * dt;
      v.y += v.knockbackVy * dt;
      v.knockbackVx *= Math.pow(0.02, dt);
      v.knockbackVy *= Math.pow(0.02, dt);

      const spring = 1 - Math.exp(-dt * 8);
      v.x += (anchorX - v.x) * spring;
      v.y += (anchorY - v.y) * spring;
      v.z += (0 - v.z) * spring;
    }

    // Subtle ambient particles on wet/singed Pokémon
    if (v.alpha > 0.5) {
      if (v.singed > 0.25 && Math.random() < dt * 10) {
        this.particles.spawn({
          kind: 'smoke',
          x: v.x + (Math.random() - 0.5) * 12,
          y: v.y - 6 + (Math.random() - 0.5) * 6,
          z: 6,
          vx: (Math.random() - 0.5) * 6,
          vy: -8,
          vz: 14,
          life: 0.35,
          r: 72,
          g: 68,
          b: 66,
          size: 1,
        });
      }
      if (v.wetness > 0.35 && Math.random() < dt * 7) {
        this.particles.spawn({
          kind: 'water',
          x: v.x + (Math.random() - 0.5) * 12,
          y: v.y + (Math.random() - 0.5) * 6,
          z: 5,
          vx: (Math.random() - 0.5) * 8,
          vy: 4,
          vz: 2,
          gravity: 85,
          life: 0.25,
          r: 130,
          g: 210,
          b: 255,
          size: 1,
        });
      }
    }
  }

  private fireImpact(
    seq: ActiveMoveSequence,
    defender: FighterVisualState,
    dirX: number
  ): void {
    if (seq.impactFired) return;
    seq.impactFired = true;

    const s = seq.profile.scaleFactor;
    const isStatus = seq.move.category === 'status';

    if (!isStatus) {
      defender.hitFlash = 1.0;
      defender.knockbackVx = dirX * (28 + s * 78);
      defender.knockbackVy = (Math.random() - 0.5) * (10 + s * 18);
      this.shakeMag = Math.max(this.shakeMag, seq.profile.shakeIntensity);
    }

    seq.onImpact?.();
  }

  private stepActiveMove(seq: ActiveMoveSequence, dt: number): void {
    seq.elapsed += dt;
    seq.emitAccum += dt;
    seq.boltAccum += dt;

    const t = Math.min(1, seq.elapsed / seq.duration);
    const isPlayer = seq.attackerSide === 'player';
    const attacker = isPlayer ? this.playerVisual : this.enemyVisual;
    const defender = isPlayer ? this.enemyVisual : this.playerVisual;
    const startX = isPlayer ? PLAYER_ANCHOR_X : ENEMY_ANCHOR_X;
    const startY = isPlayer ? PLAYER_ANCHOR_Y : ENEMY_ANCHOR_Y;
    const endX = isPlayer ? ENEMY_ANCHOR_X : PLAYER_ANCHOR_X;
    const endY = isPlayer ? ENEMY_ANCHOR_Y : PLAYER_ANCHOR_Y;
    const dirX = isPlayer ? 1 : -1;

    const p = seq.profile;
    const s = p.scaleFactor;
    const arch = seq.move.archetype;

    this.activeBeams = [];
    this.activeProjectiles = [];

    if (arch === 'surf_wave') {
      // === SURF: Exact spirit of reference screenshots! ===
      // Lv.1 Squirtle = compact ~20px crescent wave; Lv.40 Wartortle = medium ~48px foaming wave;
      // Lv.100 Blastoise = monumental full-height tidal wall with deep trough & whitecap foam!
      const waveSpanY = Math.max(8, Math.min(ARENA_H * 0.52, 7 + Math.pow(s, 1.32) * 46));
      const waveThickX = 6 + s * 16;

      if (t < 0.20) {
        // Phase 1: Wave builds behind attacker
        const u = t / 0.20;
        const swellX = startX - dirX * (6 - u * 4);
        attacker.x = startX - dirX * (3 * (1 - u));
        attacker.z = u * (2 + s * 4);

        this.grid.injectWater(
          swellX,
          startY,
          waveThickX * (0.45 + u * 0.45),
          waveSpanY * (0.4 + u * 0.55),
          p.waveHeight * (0.45 + u * 0.5),
          dirX * (18 + s * 28),
          0,
          0.22 + s * 0.28
        );
      } else if (t < 0.72) {
        // Phase 2: Surging wave sweeps across the arena with attacker riding atop crest!
        const u = (t - 0.20) / 0.52;
        const ease = u * u * (3 - 2 * u);
        const waveX = startX + (endX - startX - dirX * 10) * ease;
        attacker.x = waveX - dirX * (3 + s * 4);
        attacker.y = startY + Math.sin(u * Math.PI * 2) * (1 + s * 1.5);
        attacker.z = 2 + s * 4 + Math.sin(u * Math.PI) * 2.5;

        // Curved crescent wave front (leading center, curving wings matching image.png!)
        const slices = 7;
        for (let k = -slices; k <= slices; k++) {
          const frac = k / slices; // -1 .. 1
          const sy = startY + frac * waveSpanY;
          const curveLag = -dirX * (frac * frac) * (4 + s * 15);
          const sx = waveX + curveLag;
          const localDepth = p.waveHeight * (1.0 - Math.abs(frac) * 0.35);
          this.grid.injectWater(
            sx,
            sy,
            waveThickX * 0.55,
            Math.max(3.5, waveSpanY / slices + 2.5),
            localDepth,
            dirX * (28 + s * 44),
            frac * 7,
            0.25 + s * 0.42
          );
        }

        // Selective whitecap foam spray along the leading crest!
        if (seq.emitAccum > 0.03) {
          seq.emitAccum = 0;
          const sprayCount = Math.max(1, Math.round(1 + s * 12));
          this.particles.emitWaterBurst(
            waveX + dirX * 3,
            startY + (Math.random() - 0.5) * waveSpanY * 1.3,
            sprayCount,
            dirX,
            s * 0.85
          );
        }

        // Trigger impact as wave crashes into target!
        if (u >= 0.86 && !seq.impactFired) {
          this.fireImpact(seq, defender, dirX);
          defender.wetness = 1.0;
          this.screenFlash = 0.16 + s * 0.22;
          this.screenFlashColor = 'cyan';

          // Massive splash explosion engulfing target (matching image_2.png!)
          this.grid.injectWater(
            endX,
            endY,
            10 + s * 24,
            waveSpanY * 1.1,
            p.waveHeight * 1.15,
            dirX * (22 + s * 36),
            0,
            0.65 + s * 0.65
          );
          this.particles.emitWaterBurst(endX, endY, Math.round(p.particleCount * 0.48), dirX, s);
          this.particles.emitWaterBurst(endX - dirX * 8, endY, Math.round(p.particleCount * 0.3), -dirX * 0.3, s);

          // Expanding concentric shockwave rings (visible in bottom-right of image_2.png!)
          this.grid.addRipple(endX, endY, 16 + s * 40, 'water', 48 + s * 28);
          if (s >= 0.42) {
            this.grid.addRipple(endX, endY, 10 + s * 26, 'water', 34 + s * 22);
          }
          if (s >= 0.72) {
            this.grid.addRipple(endX - dirX * 8, endY + 6, 30 + s * 38, 'water', 60);
          }
        }
      } else {
        // Phase 3: Wave crashes past & attacker glides back to home anchor
        const u = (t - 0.72) / 0.28;
        attacker.x = (endX - dirX * 14) + (startX - (endX - dirX * 14)) * u;
        attacker.y = startY;
        attacker.z = (1 - u) * 3;
        if (!seq.impactFired) {
          this.fireImpact(seq, defender, dirX);
          defender.wetness = 1.0;
        }
      }
    } else if (arch === 'water_jet') {
      // Water Gun / Bubble Beam / Hydro Pump
      const jetProgress = Math.min(1, t / 0.55);
      const curX = startX + (endX - startX) * jetProgress;
      const beamW = Math.max(3, p.beamWidthPx * 0.38);

      if (t < 0.78) {
        this.activeBeams.push({
          kind: 'water_jet',
          x1: startX + dirX * 10,
          y1: startY,
          x2: curX,
          y2: endY,
          width: beamW,
          progress: jetProgress,
          intensity: 0.7 + s * 0.5,
        });
        this.grid.injectWater(
          curX,
          endY,
          5 + s * 11,
          beamW * 0.85,
          p.waveHeight * 0.72,
          dirX * 26,
          0,
          0.42
        );
        if (seq.emitAccum > 0.03) {
          seq.emitAccum = 0;
          this.particles.emitWaterBurst(curX, endY, Math.round(3 + s * 10), dirX, s * 0.75);
        }
      }

      if (t >= 0.52 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX);
        defender.wetness = 0.95;
        this.grid.injectWater(endX, endY, p.envSpreadRadius * 0.75, p.envSpreadRadius * 0.72, p.waveHeight, dirX * 22, 0, 0.75);
        this.particles.emitWaterBurst(endX, endY, Math.round(p.particleCount * 0.4), dirX, s);
        this.grid.addRipple(endX, endY, 16 + s * 32, 'water', 52);
      }
    } else if (arch === 'flamethrower' || arch === 'ember' || arch === 'fire_blast') {
      // === FLAMETHROWER / EMBER / FIRE BLAST ===
      // Scales from Charmander's narrow flickering jet to Charizard's arena-engulfing inferno!
      const isBlast = arch === 'fire_blast';
      const isEmber = arch === 'ember';
      const reachT = Math.min(1, t / 0.45);
      const curX = startX + (endX - startX) * reachT;
      const coneW = Math.max(3, p.beamWidthPx * (isEmber ? 0.34 : isBlast ? 0.68 : 0.55));

      if (t < 0.82) {
        this.activeBeams.push({
          kind: 'flamethrower',
          x1: startX + dirX * 10,
          y1: startY,
          x2: curX,
          y2: endY + Math.sin(seq.elapsed * 22) * (1.5 + s * 3),
          width: coneW,
          progress: reachT,
          intensity: 0.75 + s * 0.6,
        });

        // Scorch and ignite tiles along the jet path!
        const samples = 5;
        for (let i = 1; i <= samples; i++) {
          const f = (i / samples) * reachT;
          const fx = startX + (endX - startX) * f;
          const fy = startY + (Math.random() - 0.5) * (coneW * 0.65);
          const localRad = Math.max(3, (coneW * (0.3 + f * 0.7)) * 0.55);
          this.grid.injectFire(fx, fy, localRad, localRad * 0.9, p.envIntensity * (0.6 + f * 0.6));
        }

        if (seq.emitAccum > 0.025) {
          seq.emitAccum = 0;
          const count = Math.max(3, Math.round(3 + s * 16));
          this.particles.emitFireBurst(
            curX - dirX * 8,
            endY + (Math.random() - 0.5) * coneW * 0.7,
            count,
            dirX,
            s
          );
        }
      }

      if (t >= 0.46 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX);
        defender.singed = 1.0;
        this.screenFlash = 0.22 + s * 0.28;
        this.screenFlashColor = 'orange';

        const rad = p.envSpreadRadius * (isBlast ? 1.25 : 0.92);
        this.grid.injectFire(endX, endY, rad, rad * 0.95, p.envIntensity * 1.45);
        this.particles.emitFireBurst(endX, endY, Math.round(p.particleCount * 0.48), dirX, s);
        this.grid.addRipple(endX, endY, 16 + s * 36, 'fire', 58);

        if (isBlast || s >= 0.72) {
          // Star/inferno secondary flare around target for high-level / evolved Charizard!
          for (let a = 0; a < 5; a++) {
            const ang = (a / 5) * Math.PI * 2;
            const ox = endX + Math.cos(ang) * (10 + s * 16);
            const oy = endY + Math.sin(ang) * (10 + s * 16);
            this.grid.injectFire(ox, oy, 6 + s * 10, 6 + s * 10, p.envIntensity * 1.1);
          }
          this.grid.addRipple(endX, endY, 26 + s * 40, 'fire', 42);
        }
      }
    } else if (arch === 'electric_bolt' || arch === 'thunder_strike') {
      // === THUNDERBOLT / THUNDER / THUNDERSHOCK ===
      const isSky = arch === 'thunder_strike';
      const boltCount = Math.max(1, Math.round(1 + s * 4));
      const thickness = s >= 0.72 ? 3 : s >= 0.42 ? 2 : 1;

      if (t < 0.24) {
        // Charge sparks around attacker
        if (seq.emitAccum > 0.04) {
          seq.emitAccum = 0;
          this.particles.emitElectricSparks(startX, startY, Math.round(4 + s * 10), s * 0.7);
        }
      } else if (t < 0.78) {
        if (seq.boltAccum > 0.065) {
          seq.boltAccum = 0;
          for (let b = 0; b < boltCount; b++) {
            const ox = isSky ? endX + (Math.random() - 0.5) * (8 + s * 22) : startX + dirX * 8;
            const oy = isSky ? 2 : startY + (Math.random() - 0.5) * (6 + s * 12);
            const tx = endX + (Math.random() - 0.5) * (6 + s * 14);
            const ty = endY + (Math.random() - 0.5) * (6 + s * 16);
            this.grid.addLightningBolt(ox, oy, tx, ty, thickness, 0.14, false);
          }
          this.particles.emitElectricSparks(endX, endY, Math.round(5 + s * 14), s);
        }

        if (t >= 0.36 && !seq.impactFired) {
          this.fireImpact(seq, defender, dirX);
          defender.shocked = 1.0;
          this.screenFlash = 0.35 + s * 0.35;
          this.screenFlashColor = 'yellow';

          // Conducts electricity through any connected water puddles across the arena!!
          this.grid.injectElectric(endX, endY, p.envSpreadRadius * 0.9, 1.1 + s * 0.5);
          this.grid.addRipple(endX, endY, 18 + s * 34, 'electric', 72);
          this.particles.emitElectricSparks(endX, endY, Math.round(p.particleCount * 0.35), s);
        }
      }
    } else if (arch === 'ice_beam' || arch === 'blizzard') {
      // === ICE BEAM / BLIZZARD / POWDER SNOW ===
      const reachT = Math.min(1, t / 0.48);
      const curX = startX + (endX - startX) * reachT;
      const beamW = Math.max(4, p.beamWidthPx * (arch === 'blizzard' ? 0.78 : 0.42));

      if (t < 0.80) {
        this.activeBeams.push({
          kind: 'ice_beam',
          x1: startX + dirX * 10,
          y1: startY,
          x2: curX,
          y2: endY,
          width: beamW,
          progress: reachT,
          intensity: 0.75 + s * 0.5,
        });
        this.grid.injectIce(curX, endY + (Math.random() - 0.5) * beamW * 0.5, 6 + s * 14, p.envIntensity * 0.8);
        if (seq.emitAccum > 0.03) {
          seq.emitAccum = 0;
          this.particles.emitIceShards(curX, endY, Math.round(4 + s * 10), s);
        }
      }

      if (t >= 0.48 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX);
        defender.frosted = 1.0;
        this.screenFlash = 0.25 + s * 0.22;
        this.screenFlashColor = 'cyan';
        const rad = p.envSpreadRadius * (arch === 'blizzard' ? 1.45 : 1.0);
        this.grid.injectIce(endX, endY, rad, p.envIntensity * 1.25);
        if (arch === 'blizzard') {
          this.grid.injectIce(ARENA_W / 2, ARENA_H / 2, 24 + s * 36, p.envIntensity * 0.9);
        }
        this.particles.emitIceShards(endX, endY, Math.round(p.particleCount * 0.38), s);
        this.grid.addRipple(endX, endY, 18 + s * 34, 'ice', 56);
      }
    } else if (arch === 'vine_whip' || arch === 'razor_leaf' || arch === 'solar_beam') {
      // === VINE WHIP / RAZOR LEAF / SOLAR BEAM ===
      const reachT = Math.min(1, t / 0.48);
      const curX = startX + (endX - startX) * reachT;

      if (arch === 'solar_beam') {
        if (t < 0.26) {
          // Charge golden sun sparks
          if (seq.emitAccum > 0.03) {
            seq.emitAccum = 0;
            this.particles.spawn({
              kind: 'star',
              x: startX + (Math.random() - 0.5) * 28,
              y: startY + (Math.random() - 0.5) * 24,
              z: 6,
              vx: (Math.random() - 0.5) * 20,
              vy: (Math.random() - 0.5) * 20,
              life: 0.25,
              r: 254,
              g: 249,
              b: 145,
              size: 2,
            });
          }
        } else if (t < 0.85) {
          this.activeBeams.push({
            kind: 'solar_beam',
            x1: startX + dirX * 10,
            y1: startY,
            x2: endX + dirX * 16,
            y2: endY,
            width: Math.max(8, p.beamWidthPx * 0.58),
            progress: 1,
            intensity: 1.0,
          });
          this.grid.injectFlora(ARENA_W / 2, ARENA_H / 2, 16 + s * 22, 0.6 + s * 0.5);
        }
      } else if (arch === 'vine_whip') {
        if (t < 0.72) {
          this.activeBeams.push({
            kind: 'vine_whip',
            x1: startX + dirX * 8,
            y1: startY,
            x2: curX,
            y2: endY + Math.sin(t * 16) * 6,
            width: Math.max(3, 3 + s * 7),
            progress: reachT,
            intensity: 0.9,
          });
        }
      } else {
        // Razor Leaf cyclone
        if (t < 0.78 && seq.emitAccum > 0.025) {
          seq.emitAccum = 0;
          this.particles.emitLeaves(curX, startY + (Math.random() - 0.5) * (10 + s * 26), Math.round(4 + s * 12), dirX, s);
        }
      }

      if (t >= 0.48 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX);
        this.grid.injectFlora(endX, endY, p.envSpreadRadius * 0.95, 0.55 + s * 0.6);
        this.grid.injectFlora(ARENA_W / 2, ARENA_H / 2, p.envSpreadRadius * 0.65, 0.35 + s * 0.4);
        this.particles.emitLeaves(endX, endY, Math.round(p.particleCount * 0.35), dirX, s);
        this.grid.addRipple(endX, endY, 16 + s * 26, 'normal', 50);
      }
    } else if (arch === 'rock_throw' || arch === 'earthquake') {
      // === ROCK THROW / ROCK TOMB / EARTHQUAKE / DIG / BODY SLAM ===
      if (arch === 'rock_throw') {
        if (t < 0.56) {
          const u = t / 0.56;
          const bx = startX + (endX - startX) * u;
          const by = startY + (endY - startY) * u;
          const bz = Math.sin(u * Math.PI) * (24 + s * 22);
          const count = s >= 0.7 ? 3 : s >= 0.42 ? 2 : 1;
          for (let b = 0; b < count; b++) {
            this.activeProjectiles.push({
              kind: 'boulder',
              x: bx - dirX * b * 10,
              y: by + (b - (count - 1) / 2) * 8,
              z: Math.max(0, bz - b * 5),
              radius: 3.5 + s * 4.5,
              rotation: t * 14 + b,
            });
          }
        }
        if (t >= 0.54 && !seq.impactFired) {
          this.fireImpact(seq, defender, dirX);
          this.grid.injectCrater(endX, endY, p.envSpreadRadius * 0.85, 0.55 + s * 0.5);
          this.particles.emitRockDebris(endX, endY, Math.round(p.particleCount * 0.4), s);
          this.grid.addRipple(endX, endY, 18 + s * 32, 'rock', 56);
        }
      } else {
        // Earthquake / Dig / Body Slam: dramatic seismic shockwaves & ground fissures!
        if (t < 0.78) {
          this.shakeMag = Math.max(this.shakeMag, p.shakeIntensity * 0.85);
          const faultX = startX + (endX - startX) * Math.min(1, t / 0.5);
          if (seq.emitAccum > 0.06) {
            seq.emitAccum = 0;
            this.grid.injectCrater(faultX, startY + (Math.random() - 0.5) * (10 + s * 26), 6 + s * 10, 0.45 + s * 0.45);
            this.particles.emitRockDebris(faultX, startY, Math.round(4 + s * 12), s);
          }
        }
        if (t >= 0.45 && !seq.impactFired) {
          this.fireImpact(seq, defender, dirX);
          this.grid.injectCrater(endX, endY, p.envSpreadRadius * 1.1, 0.7 + s * 0.45);
          this.particles.emitRockDebris(endX, endY, Math.round(p.particleCount * 0.45), s);
          this.grid.addRipple(endX, endY, 24 + s * 44, 'rock', 64);
          this.grid.addRipple(ARENA_W / 2, ARENA_H / 2, 22 + s * 42, 'rock', 52);
        }
      }
    } else if (arch === 'physical_lunge') {
      // Tackle / Scratch / Quick Attack / Bite / Karate Chop
      if (t < 0.48) {
        const u = t / 0.48;
        attacker.x = startX + (endX - startX - dirX * 14) * (u * u);
        attacker.z = Math.sin(u * Math.PI) * 5;
        if (seq.emitAccum > 0.04) {
          seq.emitAccum = 0;
          this.particles.emitRockDebris(attacker.x - dirX * 6, attacker.y + 4, 2, s * 0.4);
        }
      } else {
        const u = (t - 0.48) / 0.52;
        attacker.x = (endX - dirX * 14) + (startX - (endX - dirX * 14)) * u;
        attacker.z = 0;
        if (!seq.impactFired) {
          this.fireImpact(seq, defender, dirX);
          this.particles.emitRockDebris(endX, endY, Math.round(8 + s * 24), s * 0.8);
          this.grid.addRipple(endX, endY, 12 + s * 20, 'normal', 64);
          if (s >= 0.65) {
            this.grid.injectCrater(endX, endY, 8 + s * 8, 0.35);
          }
        }
      }
    } else if (arch === 'wind_gust') {
      if (seq.emitAccum > 0.025 && t < 0.78) {
        seq.emitAccum = 0;
        for (let i = 0; i < 4 + Math.round(s * 8); i++) {
          this.particles.spawn({
            kind: 'dust',
            x: startX + (Math.random() - 0.5) * 14,
            y: startY + (Math.random() - 0.5) * (16 + s * 36),
            z: 4 + Math.random() * 6,
            vx: dirX * (80 + s * 75),
            vy: (Math.random() - 0.5) * 24,
            life: 0.45,
            r: 226,
            g: 238,
            b: 245,
            size: Math.random() < 0.4 ? 2 : 1,
          });
        }
      }
      if (t >= 0.45 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX);
        this.grid.applyWindGust(dirX, 0.5 + s * 0.5);
        this.grid.addRipple(endX, endY, 16 + s * 26, 'normal', 60);
      }
    } else if (arch === 'psychic_wave') {
      const reachT = Math.min(1, t / 0.52);
      const curX = startX + (endX - startX) * reachT;
      if (t < 0.78) {
        this.activeBeams.push({
          kind: 'psychic',
          x1: startX + dirX * 8,
          y1: startY,
          x2: curX,
          y2: endY,
          width: Math.max(6, p.beamWidthPx * 0.5),
          progress: reachT,
          intensity: 0.8 + s * 0.5,
        });
        if (seq.emitAccum > 0.04) {
          seq.emitAccum = 0;
          this.grid.addRipple(curX, endY, 10 + s * 16, 'psychic', 44);
        }
      }
      if (t >= 0.5 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX);
        this.grid.addRipple(endX, endY, 22 + s * 34, 'psychic', 54);
        for (let i = 0; i < 16 + Math.round(s * 30); i++) {
          const ang = Math.random() * Math.PI * 2;
          this.particles.spawn({
            kind: 'psychic',
            x: endX,
            y: endY,
            z: 4,
            vx: Math.cos(ang) * (24 + s * 42),
            vy: Math.sin(ang) * (24 + s * 42),
            life: 0.4,
            r: 236,
            g: 110,
            b: 215,
            size: 2,
          });
        }
      }
    } else if (arch === 'poison_sludge' || arch === 'powder_cloud') {
      const isPowder = arch === 'powder_cloud';
      const reachT = Math.min(1, t / 0.5);
      const curX = startX + (endX - startX) * reachT;
      if (t < 0.72 && seq.emitAccum > 0.03) {
        seq.emitAccum = 0;
        for (let i = 0; i < 4 + Math.round(s * 8); i++) {
          this.particles.spawn({
            kind: 'poison',
            x: curX + (Math.random() - 0.5) * 10,
            y: startY + (Math.random() - 0.5) * (8 + s * 14),
            z: 4 + Math.random() * 6,
            vx: dirX * 22 + (Math.random() - 0.5) * 18,
            vy: (Math.random() - 0.5) * 18,
            life: 0.45,
            r: isPowder ? 134 : 168,
            g: isPowder ? 239 : 72,
            b: isPowder ? 172 : 215,
            size: Math.random() < 0.5 ? 2 : 1,
          });
        }
      }
      if (t >= 0.5 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX);
        this.grid.addRipple(endX, endY, 14 + s * 22, 'psychic', 48);
      }
    } else {
      // stat_aura (Growl, Tail Whip, Harden, Swords Dance, Calm Mind)
      const isSelf = seq.move.statChange?.target === 'self';
      const tx = isSelf ? startX : endX;
      const ty = isSelf ? startY : endY;
      if (t < 0.75 && seq.emitAccum > 0.04) {
        seq.emitAccum = 0;
        for (let i = 0; i < 5; i++) {
          this.particles.spawn({
            kind: 'star',
            x: tx + (Math.random() - 0.5) * 20,
            y: ty + 6,
            z: 2,
            vx: (Math.random() - 0.5) * 10,
            vy: isSelf ? -26 : 16,
            vz: 12,
            life: 0.42,
            r: isSelf ? 250 : 148,
            g: isSelf ? 204 : 163,
            b: isSelf ? 21 : 235,
            size: 2,
          });
        }
      }
      if (t >= 0.5 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX);
        this.grid.addRipple(tx, ty, 20, isSelf ? 'electric' : 'normal', 46);
      }
    }

    // Complete sequence cleanly
    if (seq.elapsed >= seq.duration) {
      if (!seq.impactFired) {
        this.fireImpact(seq, defender, dirX);
      }
      this.activeBeams = [];
      this.activeProjectiles = [];
      const doneCb = seq.onComplete;
      this.activeMove = null;
      doneCb?.();
    }
  }

  private stepActiveCatch(seq: ActiveCatchSequence, dt: number): void {
    seq.elapsed += dt;
    this.activeProjectiles = [];

    const throwEnd = 0.55;
    const absorbEnd = 0.95;
    const dropEnd = 1.35;

    if (seq.elapsed < throwEnd) {
      seq.phase = 'throw';
      const u = seq.elapsed / throwEnd;
      const bx = PLAYER_ANCHOR_X + (ENEMY_ANCHOR_X - PLAYER_ANCHOR_X) * u;
      const by = PLAYER_ANCHOR_Y + (ENEMY_ANCHOR_Y - PLAYER_ANCHOR_Y) * u;
      const bz = Math.sin(u * Math.PI) * 38;
      this.activeProjectiles.push({
        kind: 'pokeball',
        ballStyle: seq.ballStyle,
        x: bx,
        y: by,
        z: bz,
        radius: 4.5,
        rotation: u * Math.PI * 5,
      });
    } else if (seq.elapsed < absorbEnd) {
      seq.phase = 'absorb';
      const u = (seq.elapsed - throwEnd) / (absorbEnd - throwEnd);
      this.enemyVisual.alpha = Math.max(0, 1 - u);
      this.enemyVisual.scaleMult = Math.max(0.15, 1 - u * 0.85);
      this.activeProjectiles.push({
        kind: 'pokeball',
        ballStyle: seq.ballStyle,
        x: ENEMY_ANCHOR_X,
        y: ENEMY_ANCHOR_Y - 12,
        z: 14,
        radius: 4.5,
        rotation: 0,
        capturedGlow: 1 - u,
      });
      if (Math.random() < dt * 28) {
        this.particles.spawn({
          kind: 'fire',
          x: ENEMY_ANCHOR_X + (Math.random() - 0.5) * 14,
          y: ENEMY_ANCHOR_Y + (Math.random() - 0.5) * 10,
          z: 4,
          vx: (Math.random() - 0.5) * 16,
          vy: -14,
          life: 0.25,
          r: 255,
          g: 96,
          b: 96,
          size: 1,
        });
      }
    } else if (seq.elapsed < dropEnd) {
      seq.phase = 'drop';
      const u = (seq.elapsed - absorbEnd) / (dropEnd - absorbEnd);
      this.enemyVisual.alpha = 0;
      const bounce = Math.abs(Math.cos(u * Math.PI * 1.5)) * (1 - u) * 16;
      this.activeProjectiles.push({
        kind: 'pokeball',
        ballStyle: seq.ballStyle,
        x: ENEMY_ANCHOR_X,
        y: ENEMY_ANCHOR_Y + 4,
        z: bounce,
        radius: 4.5,
        rotation: 0,
      });
    } else {
      const shakeElapsed = seq.elapsed - dropEnd;
      const shakeDuration = seq.shakes * 0.65;
      if (shakeElapsed < shakeDuration) {
        seq.phase = 'shake';
        const curShakeIdx = Math.floor(shakeElapsed / 0.65);
        const localT = (shakeElapsed % 0.65) / 0.65;
        if (curShakeIdx >= seq.shookCount) {
          seq.shookCount = curShakeIdx + 1;
          seq.onShake?.(curShakeIdx);
        }
        const tilt = localT < 0.4 ? Math.sin((localT / 0.4) * Math.PI * 2) * 0.55 : 0;
        this.activeProjectiles.push({
          kind: 'pokeball',
          ballStyle: seq.ballStyle,
          x: ENEMY_ANCHOR_X + tilt * 3,
          y: ENEMY_ANCHOR_Y + 4,
          z: 0,
          radius: 4.5,
          rotation: tilt,
          shakeAngle: tilt,
        });
      } else {
        seq.phase = 'resolve';
        const resT = shakeElapsed - shakeDuration;
        if (seq.caught) {
          this.activeProjectiles.push({
            kind: 'pokeball',
            ballStyle: seq.ballStyle,
            x: ENEMY_ANCHOR_X,
            y: ENEMY_ANCHOR_Y + 4,
            z: 0,
            radius: 4.5,
            rotation: 0,
            capturedGlow: 0.4,
          });
          if (resT < 0.1) {
            for (let i = 0; i < 3; i++) {
              const ang = -Math.PI * 0.8 + i * 0.8;
              this.particles.spawn({
                kind: 'star',
                x: ENEMY_ANCHOR_X,
                y: ENEMY_ANCHOR_Y,
                z: 4,
                vx: Math.cos(ang) * 28,
                vy: Math.sin(ang) * 28,
                life: 0.45,
                r: 254,
                g: 240,
                b: 92,
                size: 2,
              });
            }
          }
        } else {
          // Wild Pokémon breaks free!
          this.enemyVisual.alpha = Math.min(1, resT * 3);
          this.enemyVisual.scaleMult = Math.min(1, 0.3 + resT * 2.5);
        }

        if (resT >= 0.52) {
          const done = seq.onComplete;
          const result = seq.caught;
          this.activeCatch = null;
          if (!result) {
            this.enemyVisual.alpha = 1;
            this.enemyVisual.scaleMult = 1;
          }
          done?.(result);
        }
      }
    }
  }
}
