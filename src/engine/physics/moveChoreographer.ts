import { MoveData, MovePhysicsProfile, TrainerSpriteStyle } from '../../types/game';
import {
  ARENA_H,
  ARENA_W,
  ArenaGrid,
  ENEMY_ANCHOR_X,
  ENEMY_ANCHOR_Y,
  PLAY_MAX_X,
  PLAY_MAX_Y,
  PLAY_MIN_X,
  PLAY_MIN_Y,
  PLAYER_ANCHOR_X,
  PLAYER_ANCHOR_Y,
} from './arenaGrid';
import { ParticleSystem } from './particleSystem';

export interface FighterVisualState {
  x: number;
  y: number;
  /** Persistent tactical arena position (updated by Move steps, Lunge attacks, and Knockback!) */
  homeX: number;
  homeY: number;
  z: number;
  hitFlash: number;
  knockbackVx: number;
  knockbackVy: number;
  wetness: number;
  singed: number;
  frosted: number;
  shocked: number;
  rootedTurns: number;
  alpha: number;
  scaleMult: number;
  /** True if facing right toward opponent */
  facingRight: boolean;
}

export interface BeamVisual {
  kind: 'flamethrower' | 'water_jet' | 'ice_beam' | 'solar_beam' | 'vine_whip' | 'psychic' | 'poison';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  progress: number;
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
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  elapsed: number;
  duration: number;
  impactFired: boolean;
  onImpact?: () => void;
  onComplete?: () => void;
  emitAccum: number;
  boltAccum: number;
}

export interface ActiveStepSequence {
  side: 'player' | 'enemy';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  elapsed: number;
  duration: number;
  crossedFire: boolean;
  crossedWater: boolean;
  crossedIce: boolean;
  stepEmitAccum: number;
  onStepSound?: (surface: 'normal' | 'water' | 'fire' | 'ice') => void;
  onComplete?: (hazards: { crossedFire: boolean; crossedWater: boolean; crossedIce: boolean }) => void;
}

export interface ActiveIntroSequence {
  mode: 'wild' | 'trainer' | 'pvp';
  enemyTrainerStyle: TrainerSpriteStyle;
  playerTrainerStyle: TrainerSpriteStyle;
  elapsed: number;
  duration: number;
  enemyPopped: boolean;
  playerPopped: boolean;
  onBallThrow?: () => void;
  onBallOpen?: () => void;
  onComplete?: () => void;
  threwEnemy: boolean;
  threwPlayer: boolean;
}

export interface ActiveCatchSequence {
  ballStyle: 'poke_ball' | 'great_ball' | 'ultra_ball';
  shakes: number;
  caught: boolean;
  elapsed: number;
  totalDuration: number;
  phase: 'throw' | 'absorb' | 'drop' | 'shake' | 'resolve';
  shookCount: number;
  onShake?: (index: number) => void;
  onComplete?: (caught: boolean) => void;
}

export function createFighterVisual(side: 'player' | 'enemy'): FighterVisualState {
  const ax = side === 'player' ? PLAYER_ANCHOR_X : ENEMY_ANCHOR_X;
  const ay = side === 'player' ? PLAYER_ANCHOR_Y : ENEMY_ANCHOR_Y;
  return {
    x: ax,
    y: ay,
    homeX: ax,
    homeY: ay,
    z: 0,
    hitFlash: 0,
    knockbackVx: 0,
    knockbackVy: 0,
    wetness: 0,
    singed: 0,
    frosted: 0,
    shocked: 0,
    rootedTurns: 0,
    alpha: 1,
    scaleMult: 1,
    facingRight: side === 'player',
  };
}

export function clampArenaPos(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(PLAY_MIN_X + 12, Math.min(PLAY_MAX_X - 12, Math.round(x))),
    y: Math.max(PLAY_MIN_Y + 10, Math.min(PLAY_MAX_Y - 10, Math.round(y))),
  };
}

/**
 * Coordinates 2D tactical positioning, animated dashing, battle-start Poké Ball summon intros,
 * stat-scaled directional elemental moves, physical knockback, destructible pillars, and catching.
 */
export class MoveChoreographer {
  public readonly grid: ArenaGrid;
  public readonly particles: ParticleSystem;

  public playerVisual: FighterVisualState = createFighterVisual('player');
  public enemyVisual: FighterVisualState = createFighterVisual('enemy');

  public activeMove: ActiveMoveSequence | null = null;
  public activeStep: ActiveStepSequence | null = null;
  public activeIntro: ActiveIntroSequence | null = null;
  public activeCatch: ActiveCatchSequence | null = null;

  public activeBeams: BeamVisual[] = [];
  public activeProjectiles: ProjectileVisual[] = [];

  /** Trainer sprite intro visuals rendered on left/right edges during battle start */
  public playerTrainerVisual = { visible: false, x: 26, y: 56, alpha: 0, style: 'red' as TrainerSpriteStyle };
  public enemyTrainerVisual = { visible: false, x: 166, y: 56, alpha: 0, style: 'rival' as TrainerSpriteStyle };

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
    this.activeStep = null;
    this.activeIntro = null;
    this.activeCatch = null;
    this.activeBeams = [];
    this.activeProjectiles = [];
    this.playerTrainerVisual.visible = false;
    this.enemyTrainerVisual.visible = false;
    this.shakeMag = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.screenFlash = 0;
  }

  public getDistanceBetweenFighters(): number {
    return Math.hypot(
      this.enemyVisual.homeX - this.playerVisual.homeX,
      this.enemyVisual.homeY - this.playerVisual.homeY
    );
  }

  public triggerBattleIntro(
    mode: 'wild' | 'trainer' | 'pvp',
    enemyTrainerStyle: TrainerSpriteStyle,
    callbacks?: {
      onBallThrow?: () => void;
      onBallOpen?: () => void;
      onComplete?: () => void;
    }
  ): void {
    this.resetVisuals();
    this.playerVisual.alpha = 0;
    this.playerVisual.scaleMult = 0.2;
    this.enemyVisual.alpha = mode === 'wild' ? 1 : 0;
    this.enemyVisual.scaleMult = mode === 'wild' ? 1 : 0.2;
    if (mode === 'wild') {
      this.enemyVisual.x = PLAY_MAX_X + 12;
      this.enemyVisual.z = 12;
    }

    this.playerTrainerVisual = { visible: true, x: 24, y: 56, alpha: 1, style: 'red' };
    this.enemyTrainerVisual = {
      visible: mode !== 'wild',
      x: 168,
      y: 56,
      alpha: mode !== 'wild' ? 1 : 0,
      style: enemyTrainerStyle,
    };

    this.activeIntro = {
      mode,
      enemyTrainerStyle,
      playerTrainerStyle: 'red',
      elapsed: 0,
      duration: 1.35,
      enemyPopped: mode === 'wild',
      playerPopped: false,
      threwEnemy: mode === 'wild',
      threwPlayer: false,
      onBallThrow: callbacks?.onBallThrow,
      onBallOpen: callbacks?.onBallOpen,
      onComplete: callbacks?.onComplete,
    };
  }

  public triggerStepMove(
    side: 'player' | 'enemy',
    rawToX: number,
    rawToY: number,
    callbacks?: {
      onStepSound?: (surface: 'normal' | 'water' | 'fire' | 'ice') => void;
      onComplete?: (hazards: { crossedFire: boolean; crossedWater: boolean; crossedIce: boolean }) => void;
    }
  ): void {
    const v = side === 'player' ? this.playerVisual : this.enemyVisual;
    const other = side === 'player' ? this.enemyVisual : this.playerVisual;
    let { x: toX, y: toY } = clampArenaPos(rawToX, rawToY);

    // Prevent stepping directly onto opponent's sprite tile (keep minimum 20 units standoff)
    const dToOther = Math.hypot(toX - other.homeX, toY - other.homeY);
    if (dToOther < 20) {
      const ang = Math.atan2(v.homeY - other.homeY, v.homeX - other.homeX);
      const clamped = clampArenaPos(other.homeX + Math.cos(ang) * 21, other.homeY + Math.sin(ang) * 21);
      toX = clamped.x;
      toY = clamped.y;
    }

    const dist = Math.hypot(toX - v.homeX, toY - v.homeY);
    if (dist < 2) {
      callbacks?.onComplete?.({ crossedFire: false, crossedWater: false, crossedIce: false });
      return;
    }

    const duration = Math.max(0.22, Math.min(0.58, dist / 145));
    this.activeStep = {
      side,
      fromX: v.homeX,
      fromY: v.homeY,
      toX,
      toY,
      elapsed: 0,
      duration,
      crossedFire: false,
      crossedWater: false,
      crossedIce: false,
      stepEmitAccum: 0,
      onStepSound: callbacks?.onStepSound,
      onComplete: callbacks?.onComplete,
    };
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

    const attacker = attackerSide === 'player' ? this.playerVisual : this.enemyVisual;
    const defender = attackerSide === 'player' ? this.enemyVisual : this.playerVisual;

    this.activeMove = {
      attackerSide,
      move,
      profile,
      startX: attacker.homeX,
      startY: attacker.homeY,
      endX: defender.homeX,
      endY: defender.homeY,
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
    return (
      this.activeMove !== null ||
      this.activeStep !== null ||
      this.activeIntro !== null ||
      this.activeCatch !== null
    );
  }

  public step(dt: number): void {
    const clampedDt = Math.min(0.05, dt);

    // Update dynamic facing so combatants always face each other across the 2D arena!
    this.playerVisual.facingRight = this.enemyVisual.x >= this.playerVisual.x;
    this.enemyVisual.facingRight = this.playerVisual.x > this.enemyVisual.x;

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

    this.stepFighterVisual(this.playerVisual, clampedDt);
    this.stepFighterVisual(this.enemyVisual, clampedDt);

    if (this.activeIntro) {
      this.stepActiveIntro(this.activeIntro, clampedDt);
    } else if (this.activeStep) {
      this.stepActiveStep(this.activeStep, clampedDt);
    } else if (this.activeMove) {
      this.stepActiveMove(this.activeMove, clampedDt);
    } else if (this.activeCatch) {
      this.stepActiveCatch(this.activeCatch, clampedDt);
    }

    this.grid.step(clampedDt);
    this.particles.step(clampedDt);
  }

  private stepFighterVisual(v: FighterVisualState, dt: number): void {
    v.hitFlash = Math.max(0, v.hitFlash - dt * 4.2);
    v.wetness = Math.max(0, v.wetness - dt * 0.08);
    v.singed = Math.max(0, v.singed - dt * 0.12);
    v.frosted = Math.max(0, v.frosted - dt * 0.09);
    v.shocked = Math.max(0, v.shocked - dt * 1.4);

    const isMoveControlled =
      (this.activeMove &&
        ((this.activeMove.attackerSide === 'player' && v === this.playerVisual) ||
          (this.activeMove.attackerSide === 'enemy' && v === this.enemyVisual)) &&
        (this.activeMove.move.archetype === 'surf_wave' ||
          this.activeMove.move.archetype === 'physical_lunge')) ||
      (this.activeStep &&
        ((this.activeStep.side === 'player' && v === this.playerVisual) ||
          (this.activeStep.side === 'enemy' && v === this.enemyVisual)));

    if (!isMoveControlled && !this.activeIntro) {
      v.x += v.knockbackVx * dt;
      v.y += v.knockbackVy * dt;
      v.knockbackVx *= Math.pow(0.02, dt);
      v.knockbackVy *= Math.pow(0.02, dt);

      const spring = 1 - Math.exp(-dt * 8.5);
      v.x += (v.homeX - v.x) * spring;
      v.y += (v.homeY - v.y) * spring;
      v.z += (0 - v.z) * spring;
    }

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

  private stepActiveIntro(seq: ActiveIntroSequence, dt: number): void {
    seq.elapsed += dt;
    this.activeProjectiles = [];
    const t = seq.elapsed;

    // 1. Enemy entrance (0.0 .. 0.65s)
    if (seq.mode === 'wild') {
      const u = Math.min(1, t / 0.5);
      this.enemyVisual.x = PLAY_MAX_X + 10 + (ENEMY_ANCHOR_X - (PLAY_MAX_X + 10)) * (1 - Math.pow(1 - u, 3));
      this.enemyVisual.z = Math.sin(u * Math.PI) * 14;
      this.enemyVisual.alpha = 1;
      this.enemyVisual.scaleMult = 1;
    } else {
      if (!seq.threwEnemy && t >= 0.08) {
        seq.threwEnemy = true;
        seq.onBallThrow?.();
      }
      if (t < 0.45) {
        const u = Math.max(0, (t - 0.08) / 0.37);
        this.activeProjectiles.push({
          kind: 'pokeball',
          ballStyle: 'poke_ball',
          x: 168 + (ENEMY_ANCHOR_X - 168) * u,
          y: 56,
          z: Math.sin(u * Math.PI) * 28,
          radius: 4,
          rotation: u * Math.PI * 4,
        });
      } else if (!seq.enemyPopped) {
        seq.enemyPopped = true;
        seq.onBallOpen?.();
        this.grid.addRipple(ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, 22, 'fire', 54);
        this.particles.emitFireBurst(ENEMY_ANCHOR_X, ENEMY_ANCHOR_Y, 16, -1, 0.4);
      } else {
        const popU = Math.min(1, (t - 0.45) / 0.24);
        this.enemyVisual.alpha = popU;
        this.enemyVisual.scaleMult = 0.2 + popU * 0.8;
        this.enemyTrainerVisual.alpha = Math.max(0, 1 - (t - 0.5) * 3.5);
        this.enemyTrainerVisual.x = 168 + Math.max(0, t - 0.5) * 45;
      }
    }

    // 2. Player Poké Ball throw (0.38 .. 1.05s)
    if (!seq.threwPlayer && t >= 0.38) {
      seq.threwPlayer = true;
      seq.onBallThrow?.();
    }
    if (t >= 0.38 && t < 0.82) {
      const u = (t - 0.38) / 0.44;
      this.activeProjectiles.push({
        kind: 'pokeball',
        ballStyle: 'poke_ball',
        x: 24 + (PLAYER_ANCHOR_X - 24) * u,
        y: 56,
        z: Math.sin(u * Math.PI) * 30,
        radius: 4,
        rotation: u * Math.PI * 4,
      });
    } else if (t >= 0.82 && !seq.playerPopped) {
      seq.playerPopped = true;
      seq.onBallOpen?.();
      this.grid.addRipple(PLAYER_ANCHOR_X, PLAYER_ANCHOR_Y, 22, 'fire', 54);
      this.particles.emitFireBurst(PLAYER_ANCHOR_X, PLAYER_ANCHOR_Y, 16, 1, 0.4);
    } else if (seq.playerPopped) {
      const popU = Math.min(1, (t - 0.82) / 0.24);
      this.playerVisual.alpha = popU;
      this.playerVisual.scaleMult = 0.2 + popU * 0.8;
      this.playerTrainerVisual.alpha = Math.max(0, 1 - (t - 0.85) * 3.5);
      this.playerTrainerVisual.x = 24 - Math.max(0, t - 0.85) * 45;
    }

    if (t >= seq.duration) {
      this.playerVisual.alpha = 1;
      this.playerVisual.scaleMult = 1;
      this.enemyVisual.alpha = 1;
      this.enemyVisual.scaleMult = 1;
      this.playerTrainerVisual.visible = false;
      this.enemyTrainerVisual.visible = false;
      this.activeProjectiles = [];
      const done = seq.onComplete;
      this.activeIntro = null;
      done?.();
    }
  }

  private stepActiveStep(seq: ActiveStepSequence, dt: number): void {
    seq.elapsed += dt;
    seq.stepEmitAccum += dt;
    const u = Math.min(1, seq.elapsed / seq.duration);
    const ease = u * u * (3 - 2 * u);

    const v = seq.side === 'player' ? this.playerVisual : this.enemyVisual;
    v.x = seq.fromX + (seq.toX - seq.fromX) * ease;
    v.y = seq.fromY + (seq.toY - seq.fromY) * ease;
    v.z = Math.abs(Math.sin(u * Math.PI * 2.5)) * 4.5;

    const surface = this.grid.samplePointSurface(v.x, v.y);
    if (surface === 'fire') {
      seq.crossedFire = true;
      v.singed = Math.max(v.singed, 0.65);
    } else if (surface === 'water') {
      seq.crossedWater = true;
      v.wetness = Math.max(v.wetness, 0.75);
    } else if (surface === 'ice') {
      seq.crossedIce = true;
      v.frosted = Math.max(v.frosted, 0.55);
    }

    if (seq.stepEmitAccum > 0.075) {
      seq.stepEmitAccum = 0;
      seq.onStepSound?.(surface);
      if (surface === 'water') {
        this.particles.emitWaterBurst(v.x, v.y + 4, 4, 0, 0.3);
        this.grid.addRipple(v.x, v.y + 3, 10, 'water', 34);
      } else if (surface === 'fire') {
        this.particles.emitFireBurst(v.x, v.y + 4, 5, 0, 0.35);
      } else if (surface === 'ice') {
        this.particles.emitIceShards(v.x, v.y + 4, 4, 0.3);
      } else {
        this.particles.emitRockDebris(v.x, v.y + 5, 3, 0.25);
      }
    }

    if (u >= 1) {
      v.homeX = seq.toX;
      v.homeY = seq.toY;
      v.x = seq.toX;
      v.y = seq.toY;
      v.z = 0;
      const done = seq.onComplete;
      const hazards = {
        crossedFire: seq.crossedFire,
        crossedWater: seq.crossedWater,
        crossedIce: seq.crossedIce,
      };
      this.activeStep = null;
      done?.(hazards);
    }
  }

  private fireImpact(
    seq: ActiveMoveSequence,
    defender: FighterVisualState,
    dirX: number,
    dirY: number
  ): void {
    if (seq.impactFired) return;
    seq.impactFired = true;

    const s = seq.profile.scaleFactor;
    const isStatus = seq.move.category === 'status';

    if (!isStatus) {
      defender.hitFlash = 1.0;
      defender.knockbackVx = dirX * (24 + s * 64);
      defender.knockbackVy = dirY * (24 + s * 64);
      this.shakeMag = Math.max(this.shakeMag, seq.profile.shakeIntensity);

      // Apply persistent tactical Knockback! (e.g., Surf, Hydro Pump, Gust, Body Slam push foe back!)
      if (seq.profile.knockbackPx > 0) {
        const pushed = clampArenaPos(
          defender.homeX + dirX * seq.profile.knockbackPx,
          defender.homeY + dirY * seq.profile.knockbackPx
        );
        defender.homeX = pushed.x;
        defender.homeY = pushed.y;
      }

      // Vine Whip / Mega Drain roots target in place!
      if (seq.move.rootsTarget) {
        defender.rootedTurns = Math.max(defender.rootedTurns, 2);
      }
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
    const { startX, startY, endX, endY } = seq;

    const rawDx = endX - startX;
    const rawDy = endY - startY;
    const dist = Math.max(1, Math.hypot(rawDx, rawDy));
    const dirX = rawDx / dist;
    const dirY = rawDy / dist;

    const p = seq.profile;
    const s = p.scaleFactor;
    const arch = seq.move.archetype;

    this.activeBeams = [];
    this.activeProjectiles = [];

    if (arch === 'surf_wave') {
      // === SURF: Exact spirit of reference screenshots, now working at ANY 2D angle + physical knockback! ===
      const waveSpanY = Math.max(8, Math.min(ARENA_H * 0.52, 7 + Math.pow(s, 1.32) * 46));
      const waveThickX = 6 + s * 16;

      if (t < 0.20) {
        const u = t / 0.20;
        const swellX = startX - dirX * (6 - u * 4);
        const swellY = startY - dirY * (6 - u * 4);
        attacker.x = startX - dirX * (3 * (1 - u));
        attacker.y = startY - dirY * (3 * (1 - u));
        attacker.z = u * (2 + s * 4);

        this.grid.injectWater(
          swellX,
          swellY,
          waveThickX * (0.45 + u * 0.45),
          waveSpanY * (0.4 + u * 0.55),
          p.waveHeight * (0.45 + u * 0.5),
          dirX * (18 + s * 28),
          dirY * (18 + s * 28),
          0.22 + s * 0.28
        );
      } else if (t < 0.72) {
        const u = (t - 0.20) / 0.52;
        const ease = u * u * (3 - 2 * u);
        const waveX = startX + (endX - startX - dirX * 10) * ease;
        const waveY = startY + (endY - startY - dirY * 10) * ease;
        attacker.x = waveX - dirX * (3 + s * 4);
        attacker.y = waveY + Math.sin(u * Math.PI * 2) * (1 + s * 1.5);
        attacker.z = 2 + s * 4 + Math.sin(u * Math.PI) * 2.5;

        const perpX = -dirY;
        const perpY = dirX;
        const slices = 7;
        for (let k = -slices; k <= slices; k++) {
          const frac = k / slices;
          const curveLag = -(frac * frac) * (4 + s * 15);
          const sx = waveX + perpX * frac * waveSpanY + dirX * curveLag;
          const sy = waveY + perpY * frac * waveSpanY + dirY * curveLag;
          const localDepth = p.waveHeight * (1.0 - Math.abs(frac) * 0.35);
          this.grid.injectWater(
            sx,
            sy,
            waveThickX * 0.55,
            Math.max(3.5, waveSpanY / slices + 2.5),
            localDepth,
            dirX * (28 + s * 44),
            dirY * (28 + s * 44) + frac * 6,
            0.25 + s * 0.42
          );
        }

        if (seq.emitAccum > 0.03) {
          seq.emitAccum = 0;
          const sprayCount = Math.max(2, Math.round(2 + s * 14));
          this.particles.emitWaterBurst(
            waveX + dirX * 3,
            waveY + (Math.random() - 0.5) * waveSpanY * 1.25,
            sprayCount,
            dirX,
            s * 0.85
          );
        }

        if (u >= 0.86 && !seq.impactFired) {
          this.fireImpact(seq, defender, dirX, dirY);
          defender.wetness = 1.0;
          this.screenFlash = 0.16 + s * 0.22;
          this.screenFlashColor = 'cyan';

          this.grid.injectWater(
            endX,
            endY,
            10 + s * 24,
            waveSpanY * 1.1,
            p.waveHeight * 1.15,
            dirX * (22 + s * 36),
            dirY * (22 + s * 36),
            0.65 + s * 0.65
          );
          this.particles.emitWaterBurst(endX, endY, Math.round(p.particleCount * 0.48), dirX, s);
          this.particles.emitWaterBurst(endX - dirX * 8, endY, Math.round(p.particleCount * 0.3), -dirX * 0.3, s);

          this.grid.addRipple(endX, endY, 16 + s * 40, 'water', 48 + s * 28);
          if (s >= 0.42) this.grid.addRipple(endX, endY, 10 + s * 26, 'water', 34 + s * 22);
          if (s >= 0.72) this.grid.addRipple(endX - dirX * 8, endY + 5, 30 + s * 38, 'water', 60);
        }
      } else {
        const u = (t - 0.72) / 0.28;
        attacker.x = (endX - dirX * 14) + (attacker.homeX - (endX - dirX * 14)) * u;
        attacker.y = (endY - dirY * 14) + (attacker.homeY - (endY - dirY * 14)) * u;
        attacker.z = (1 - u) * 3;
        if (!seq.impactFired) {
          this.fireImpact(seq, defender, dirX, dirY);
          defender.wetness = 1.0;
        }
      }
    } else if (arch === 'water_jet') {
      const jetProgress = Math.min(1, t / 0.55);
      const curX = startX + rawDx * jetProgress;
      const curY = startY + rawDy * jetProgress;
      const beamW = Math.max(3, p.beamWidthPx * 0.38);

      if (t < 0.78) {
        this.activeBeams.push({
          kind: 'water_jet',
          x1: startX + dirX * 10,
          y1: startY + dirY * 10,
          x2: curX,
          y2: curY,
          width: beamW,
          progress: jetProgress,
          intensity: 0.7 + s * 0.5,
        });
        this.grid.injectWater(curX, curY, 5 + s * 11, beamW * 0.85, p.waveHeight * 0.72, dirX * 26, dirY * 26, 0.42);
        if (seq.emitAccum > 0.03) {
          seq.emitAccum = 0;
          this.particles.emitWaterBurst(curX, curY, Math.round(3 + s * 10), dirX, s * 0.75);
        }
      }
      if (t >= 0.52 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX, dirY);
        defender.wetness = 0.95;
        this.grid.injectWater(endX, endY, p.envSpreadRadius * 0.75, p.envSpreadRadius * 0.72, p.waveHeight, dirX * 22, dirY * 22, 0.75);
        this.particles.emitWaterBurst(endX, endY, Math.round(p.particleCount * 0.4), dirX, s);
        this.grid.addRipple(endX, endY, 16 + s * 32, 'water', 52);
      }
    } else if (arch === 'flamethrower' || arch === 'ember' || arch === 'fire_blast') {
      const isBlast = arch === 'fire_blast';
      const isEmber = arch === 'ember';
      const reachT = Math.min(1, t / 0.45);
      const curX = startX + rawDx * reachT;
      const curY = startY + rawDy * reachT;
      const coneW = Math.max(3, p.beamWidthPx * (isEmber ? 0.34 : isBlast ? 0.68 : 0.55));

      if (t < 0.82) {
        this.activeBeams.push({
          kind: 'flamethrower',
          x1: startX + dirX * 10,
          y1: startY + dirY * 10,
          x2: curX,
          y2: curY + Math.sin(seq.elapsed * 22) * (1.2 + s * 2.8),
          width: coneW,
          progress: reachT,
          intensity: 0.75 + s * 0.6,
        });

        const samples = 5;
        for (let i = 1; i <= samples; i++) {
          const f = (i / samples) * reachT;
          const fx = startX + rawDx * f;
          const fy = startY + rawDy * f + (Math.random() - 0.5) * (coneW * 0.6);
          const localRad = Math.max(3, coneW * (0.3 + f * 0.7) * 0.55);
          this.grid.injectFire(fx, fy, localRad, localRad * 0.9, p.envIntensity * (0.6 + f * 0.6));
        }

        if (seq.emitAccum > 0.025) {
          seq.emitAccum = 0;
          this.particles.emitFireBurst(curX - dirX * 6, curY + (Math.random() - 0.5) * coneW * 0.65, Math.max(3, Math.round(3 + s * 16)), dirX, s);
        }
      }

      if (t >= 0.46 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX, dirY);
        defender.singed = 1.0;
        this.screenFlash = 0.2 + s * 0.25;
        this.screenFlashColor = 'orange';

        const rad = p.envSpreadRadius * (isBlast ? 1.25 : 0.92);
        this.grid.injectFire(endX, endY, rad, rad * 0.95, p.envIntensity * 1.45);
        this.particles.emitFireBurst(endX, endY, Math.round(p.particleCount * 0.48), dirX, s);
        this.grid.addRipple(endX, endY, 16 + s * 36, 'fire', 58);

        if (isBlast || s >= 0.72) {
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
      const isSky = arch === 'thunder_strike';
      const boltCount = Math.max(1, Math.round(1 + s * 4));
      const thickness = s >= 0.72 ? 3 : s >= 0.42 ? 2 : 1;

      if (t < 0.24) {
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
          this.fireImpact(seq, defender, dirX, dirY);
          defender.shocked = 1.0;
          this.screenFlash = 0.3 + s * 0.3;
          this.screenFlashColor = 'yellow';

          this.grid.injectElectric(endX, endY, p.envSpreadRadius * 0.9, 1.1 + s * 0.5);
          this.grid.addRipple(endX, endY, 18 + s * 34, 'electric', 72);
          this.particles.emitElectricSparks(endX, endY, Math.round(p.particleCount * 0.35), s);
        }
      }
    } else if (arch === 'ice_beam' || arch === 'blizzard') {
      const reachT = Math.min(1, t / 0.48);
      const curX = startX + rawDx * reachT;
      const curY = startY + rawDy * reachT;
      const beamW = Math.max(4, p.beamWidthPx * (arch === 'blizzard' ? 0.78 : 0.42));

      if (t < 0.80) {
        this.activeBeams.push({
          kind: 'ice_beam',
          x1: startX + dirX * 10,
          y1: startY + dirY * 10,
          x2: curX,
          y2: curY,
          width: beamW,
          progress: reachT,
          intensity: 0.75 + s * 0.5,
        });
        this.grid.injectIce(curX, curY + (Math.random() - 0.5) * beamW * 0.5, 6 + s * 14, p.envIntensity * 0.8);
        if (seq.emitAccum > 0.03) {
          seq.emitAccum = 0;
          this.particles.emitIceShards(curX, curY, Math.round(4 + s * 10), s);
        }
      }

      if (t >= 0.48 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX, dirY);
        defender.frosted = 1.0;
        this.screenFlash = 0.22 + s * 0.2;
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
      const reachT = Math.min(1, t / 0.48);
      const curX = startX + rawDx * reachT;
      const curY = startY + rawDy * reachT;

      if (arch === 'solar_beam') {
        if (t < 0.26) {
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
            y1: startY + dirY * 10,
            x2: endX + dirX * 16,
            y2: endY + dirY * 16,
            width: Math.max(8, p.beamWidthPx * 0.58),
            progress: 1,
            intensity: 1.0,
          });
          this.grid.injectFlora((startX + endX) / 2, (startY + endY) / 2, 16 + s * 22, 0.6 + s * 0.5);
        }
      } else if (arch === 'vine_whip') {
        if (t < 0.72) {
          this.activeBeams.push({
            kind: 'vine_whip',
            x1: startX + dirX * 8,
            y1: startY + dirY * 8,
            x2: curX,
            y2: curY + Math.sin(t * 16) * 5,
            width: Math.max(3, 3 + s * 7),
            progress: reachT,
            intensity: 0.9,
          });
        }
      } else {
        if (t < 0.78 && seq.emitAccum > 0.025) {
          seq.emitAccum = 0;
          this.particles.emitLeaves(curX, curY + (Math.random() - 0.5) * (10 + s * 24), Math.round(4 + s * 12), dirX, s);
        }
      }

      if (t >= 0.48 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX, dirY);
        this.grid.injectFlora(endX, endY, p.envSpreadRadius * 0.95, 0.55 + s * 0.6);
        this.grid.injectFlora((startX + endX) / 2, (startY + endY) / 2, p.envSpreadRadius * 0.65, 0.35 + s * 0.4);
        this.particles.emitLeaves(endX, endY, Math.round(p.particleCount * 0.35), dirX, s);
        this.grid.addRipple(endX, endY, 16 + s * 26, 'normal', 50);
      }
    } else if (arch === 'rock_throw' || arch === 'earthquake') {
      if (arch === 'rock_throw') {
        if (t < 0.56) {
          const u = t / 0.56;
          const bx = startX + rawDx * u;
          const by = startY + rawDy * u;
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
          this.fireImpact(seq, defender, dirX, dirY);
          this.grid.injectCrater(endX, endY, p.envSpreadRadius * 0.85, 0.55 + s * 0.5);
          this.particles.emitRockDebris(endX, endY, Math.round(p.particleCount * 0.4), s);
          this.grid.addRipple(endX, endY, 18 + s * 32, 'rock', 56);

          // Rock Tomb erects a physical Destructible Stone Pillar between combatants!
          if (seq.move.createsPillar) {
            const px = startX + rawDx * 0.62 + (Math.random() - 0.5) * 10;
            const py = startY + rawDy * 0.62 + (Math.random() - 0.5) * 14;
            this.grid.spawnPillar(px, py, 6 + Math.round(s * 3), s >= 0.65 ? 3 : 2);
            this.particles.emitRockDebris(px, py, 16, s);
          }
        }
      } else {
        if (t < 0.78) {
          this.shakeMag = Math.max(this.shakeMag, p.shakeIntensity * 0.85);
          const faultF = Math.min(1, t / 0.5);
          const faultX = startX + rawDx * faultF;
          const faultY = startY + rawDy * faultF;
          if (seq.emitAccum > 0.06) {
            seq.emitAccum = 0;
            this.grid.injectCrater(faultX, faultY + (Math.random() - 0.5) * (10 + s * 24), 6 + s * 10, 0.45 + s * 0.45);
            this.particles.emitRockDebris(faultX, faultY, Math.round(4 + s * 12), s);
          }
        }
        if (t >= 0.45 && !seq.impactFired) {
          this.fireImpact(seq, defender, dirX, dirY);
          // Earthquake shatters ALL Stone Pillars into explosive shrapnel!
          if (seq.move.id === 'earthquake' && this.grid.pillars.length > 0) {
            const broken = this.grid.shatterAllPillars();
            for (const pil of broken) {
              this.particles.emitRockDebris(pil.x, pil.y, 26, Math.max(0.6, s));
              this.grid.addRipple(pil.x, pil.y, 20, 'rock', 60);
            }
          }
          this.grid.injectCrater(endX, endY, p.envSpreadRadius * 1.1, 0.7 + s * 0.45);
          this.particles.emitRockDebris(endX, endY, Math.round(p.particleCount * 0.45), s);
          this.grid.addRipple(endX, endY, 24 + s * 44, 'rock', 64);
          this.grid.addRipple((startX + endX) / 2, (startY + endY) / 2, 22 + s * 40, 'rock', 52);
        }
      }
    } else if (arch === 'physical_lunge') {
      // Tackle / Quick Attack physically close distance and stay closer if lungeAdvancePx is large!
      const contactX = endX - dirX * 16;
      const contactY = endY - dirY * 16;

      if (t < 0.48) {
        const u = t / 0.48;
        attacker.x = startX + (contactX - startX) * (u * u);
        attacker.y = startY + (contactY - startY) * (u * u);
        attacker.z = Math.sin(u * Math.PI) * 5;
        if (seq.emitAccum > 0.04) {
          seq.emitAccum = 0;
          this.particles.emitRockDebris(attacker.x - dirX * 6, attacker.y + 4, 2, s * 0.4);
        }
      } else {
        if (!seq.impactFired) {
          this.fireImpact(seq, defender, dirX, dirY);
          this.particles.emitRockDebris(endX, endY, Math.round(8 + s * 24), s * 0.8);
          this.grid.addRipple(endX, endY, 12 + s * 20, 'normal', 64);
          if (s >= 0.65) this.grid.injectCrater(endX, endY, 8 + s * 8, 0.35);

          // Gap-closing moves (Tackle / Quick Attack) actually advance attacker's home position forward!
          if ((seq.move.lungeAdvancePx ?? 0) >= 50 && dist > 30) {
            const settle = clampArenaPos(
              startX + dirX * Math.min(dist - 24, (seq.move.lungeAdvancePx ?? 0) * 0.45),
              startY + dirY * Math.min(dist - 24, (seq.move.lungeAdvancePx ?? 0) * 0.45)
            );
            attacker.homeX = settle.x;
            attacker.homeY = settle.y;
          }
        }
        const u = (t - 0.48) / 0.52;
        attacker.x = contactX + (attacker.homeX - contactX) * u;
        attacker.y = contactY + (attacker.homeY - contactY) * u;
        attacker.z = 0;
      }
    } else if (arch === 'wind_gust') {
      if (seq.emitAccum > 0.025 && t < 0.78) {
        seq.emitAccum = 0;
        for (let i = 0; i < 4 + Math.round(s * 9); i++) {
          this.particles.spawn({
            kind: 'dust',
            x: startX + (Math.random() - 0.5) * 14,
            y: startY + (Math.random() - 0.5) * (16 + s * 36),
            z: 4 + Math.random() * 6,
            vx: dirX * (85 + s * 75),
            vy: dirY * (85 + s * 75) + (Math.random() - 0.5) * 22,
            life: 0.45,
            r: 226,
            g: 238,
            b: 245,
            size: Math.random() < 0.4 ? 2 : 1,
          });
        }
      }
      if (t >= 0.45 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX, dirY);
        this.grid.applyWindGust(dirX >= 0 ? 1 : -1, 0.55 + s * 0.5);
        this.grid.addRipple(endX, endY, 16 + s * 26, 'normal', 60);
      }
    } else if (arch === 'psychic_wave') {
      const reachT = Math.min(1, t / 0.52);
      const curX = startX + rawDx * reachT;
      const curY = startY + rawDy * reachT;
      if (t < 0.78) {
        this.activeBeams.push({
          kind: 'psychic',
          x1: startX + dirX * 8,
          y1: startY + dirY * 8,
          x2: curX,
          y2: curY,
          width: Math.max(6, p.beamWidthPx * 0.5),
          progress: reachT,
          intensity: 0.8 + s * 0.5,
        });
        if (seq.emitAccum > 0.04) {
          seq.emitAccum = 0;
          this.grid.addRipple(curX, curY, 10 + s * 16, 'psychic', 44);
        }
      }
      if (t >= 0.5 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX, dirY);
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
      const curX = startX + rawDx * reachT;
      const curY = startY + rawDy * reachT;
      if (t < 0.72 && seq.emitAccum > 0.03) {
        seq.emitAccum = 0;
        for (let i = 0; i < 4 + Math.round(s * 8); i++) {
          this.particles.spawn({
            kind: 'poison',
            x: curX + (Math.random() - 0.5) * 10,
            y: curY + (Math.random() - 0.5) * (8 + s * 14),
            z: 4 + Math.random() * 6,
            vx: dirX * 22 + (Math.random() - 0.5) * 18,
            vy: dirY * 22 + (Math.random() - 0.5) * 18,
            life: 0.45,
            r: isPowder ? 134 : 168,
            g: isPowder ? 239 : 72,
            b: isPowder ? 172 : 215,
            size: Math.random() < 0.5 ? 2 : 1,
          });
        }
      }
      if (t >= 0.5 && !seq.impactFired) {
        this.fireImpact(seq, defender, dirX, dirY);
        this.grid.addRipple(endX, endY, 14 + s * 22, 'psychic', 48);
      }
    } else {
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
        this.fireImpact(seq, defender, dirX, dirY);
        this.grid.addRipple(tx, ty, 20, isSelf ? 'electric' : 'normal', 46);
      }
    }

    if (seq.elapsed >= seq.duration) {
      if (!seq.impactFired) {
        this.fireImpact(seq, defender, dirX, dirY);
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
    const tx = this.enemyVisual.homeX;
    const ty = this.enemyVisual.homeY;

    if (seq.elapsed < throwEnd) {
      seq.phase = 'throw';
      const u = seq.elapsed / throwEnd;
      const bx = this.playerVisual.homeX + (tx - this.playerVisual.homeX) * u;
      const by = this.playerVisual.homeY + (ty - this.playerVisual.homeY) * u;
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
        x: tx,
        y: ty - 12,
        z: 14,
        radius: 4.5,
        rotation: 0,
        capturedGlow: 1 - u,
      });
    } else if (seq.elapsed < dropEnd) {
      seq.phase = 'drop';
      const u = (seq.elapsed - absorbEnd) / (dropEnd - absorbEnd);
      this.enemyVisual.alpha = 0;
      const bounce = Math.abs(Math.cos(u * Math.PI * 1.5)) * (1 - u) * 16;
      this.activeProjectiles.push({
        kind: 'pokeball',
        ballStyle: seq.ballStyle,
        x: tx,
        y: ty + 4,
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
          x: tx + tilt * 3,
          y: ty + 4,
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
            x: tx,
            y: ty + 4,
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
                x: tx,
                y: ty,
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
