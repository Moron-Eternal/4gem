import {
  ArenaBiomeId,
  ArenaEnvSnapshot,
  DestructiblePillar,
  EnvConditionTag,
  ZoneEnvSample,
} from '../../types/game';

export const ARENA_W = 192;
export const ARENA_H = 108;
export const ARENA_CELLS = ARENA_W * ARENA_H;

/** 2x crisp pixel-art render resolution so official 64x64 PokeAPI sprites render at EXACT 1:1 native pixel fidelity! */
export const RENDER_SCALE = 2;
export const RENDER_W = ARENA_W * RENDER_SCALE; // 384
export const RENDER_H = ARENA_H * RENDER_SCALE; // 216

/** Playable inner bounds inside side arena walls/borders (in 192x108 arena units) */
export const PLAY_MIN_X = 16;
export const PLAY_MAX_X = ARENA_W - 17;
export const PLAY_MIN_Y = 8;
export const PLAY_MAX_Y = ARENA_H - 9;

export const PLAYER_ANCHOR_X = 52;
export const PLAYER_ANCHOR_Y = 56;
export const ENEMY_ANCHOR_X = 140;
export const ENEMY_ANCHOR_Y = 56;

export const enum BaseMaterial {
  GymWall = 0,
  GymFloor = 1,
  GymEmblemGold = 2,
  GymEmblemWhite = 3,
  GymEmblemDark = 4,
  MeadowGrass = 5,
  MeadowDirt = 6,
  ForestFloor = 7,
  ForestCanopy = 8,
  RockFloor = 9,
  RockWall = 10,
  PoolDeck = 11,
  PoolWater = 12,
}

export interface RippleRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  color: 'water' | 'fire' | 'electric' | 'rock' | 'ice' | 'psychic' | 'normal';
}

export interface LightningSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  thickness: number;
  isWaterBranch: boolean;
}

/**
 * Real-time 2D cellular-automata & shallow-water fluid grid for the battle arena.
 * Tracks transient waves, flames, lightning, destructible Stone Pillars, wind advection,
 * and persistent battlefield destruction.
 */
export class ArenaGrid {
  public readonly width = ARENA_W;
  public readonly height = ARENA_H;
  public biome: ArenaBiomeId;

  public baseMaterial = new Uint8Array(ARENA_CELLS);
  public baseNoise = new Uint8Array(ARENA_CELLS);

  public water = new Float32Array(ARENA_CELLS);
  public waterNext = new Float32Array(ARENA_CELLS);
  public foam = new Float32Array(ARENA_CELLS);
  public foamNext = new Float32Array(ARENA_CELLS);
  public waterVx = new Float32Array(ARENA_CELLS);
  public waterVy = new Float32Array(ARENA_CELLS);

  public fire = new Float32Array(ARENA_CELLS);
  public fireNext = new Float32Array(ARENA_CELLS);
  public fuel = new Float32Array(ARENA_CELLS);
  public scorch = new Float32Array(ARENA_CELLS);

  public ice = new Float32Array(ARENA_CELLS);
  public charge = new Float32Array(ARENA_CELLS);
  public chargeNext = new Float32Array(ARENA_CELLS);

  public crater = new Float32Array(ARENA_CELLS);
  public flora = new Float32Array(ARENA_CELLS);
  public steam = new Float32Array(ARENA_CELLS);
  public steamNext = new Float32Array(ARENA_CELLS);

  public glowR = new Float32Array(ARENA_CELLS);
  public glowG = new Float32Array(ARENA_CELLS);
  public glowB = new Float32Array(ARENA_CELLS);

  public ripples: RippleRing[] = [];
  public lightningArcs: LightningSegment[] = [];
  public pillars: DestructiblePillar[] = [];
  private nextPillarId = 1;

  public recentReactions = {
    steamTriggered: false,
    electricChainCells: 0,
    waterFrozenCells: 0,
    floraIgnitedCells: 0,
    fireExtinguishedCells: 0,
    iceMeltedCells: 0,
    pillarsShattered: 0,
  };

  public steamTurns = 0;
  public simTime = 0;
  private stepCounter = 0;

  constructor(biome: ArenaBiomeId = 'gym_floor') {
    this.biome = biome;
    this.reset(biome);
  }

  public resetRecentReactions(): void {
    this.recentReactions.steamTriggered = false;
    this.recentReactions.electricChainCells = 0;
    this.recentReactions.waterFrozenCells = 0;
    this.recentReactions.floraIgnitedCells = 0;
    this.recentReactions.fireExtinguishedCells = 0;
    this.recentReactions.iceMeltedCells = 0;
    this.recentReactions.pillarsShattered = 0;
  }

  public reset(biome: ArenaBiomeId = this.biome): void {
    this.biome = biome;
    this.water.fill(0);
    this.waterNext.fill(0);
    this.foam.fill(0);
    this.foamNext.fill(0);
    this.waterVx.fill(0);
    this.waterVy.fill(0);
    this.fire.fill(0);
    this.fireNext.fill(0);
    this.fuel.fill(0);
    this.scorch.fill(0);
    this.ice.fill(0);
    this.charge.fill(0);
    this.chargeNext.fill(0);
    this.crater.fill(0);
    this.flora.fill(0);
    this.steam.fill(0);
    this.steamNext.fill(0);
    this.glowR.fill(0);
    this.glowG.fill(0);
    this.glowB.fill(0);
    this.ripples = [];
    this.lightningArcs = [];
    this.pillars = [];
    this.steamTurns = 0;
    this.resetRecentReactions();

    this.generateBiomeTerrain(biome);
  }

  private hash2d(x: number, y: number): number {
    let n = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) & 255;
  }

  private generateBiomeTerrain(biome: ArenaBiomeId): void {
    const cx = ARENA_W / 2;
    const cy = ARENA_H / 2;

    for (let y = 0; y < ARENA_H; y++) {
      for (let x = 0; x < ARENA_W; x++) {
        const idx = y * ARENA_W + x;
        const h = this.hash2d(x, y);
        this.baseNoise[idx] = h;

        const isLeftWall = x < PLAY_MIN_X;
        const isRightWall = x > PLAY_MAX_X;

        if (biome === 'gym_floor') {
          if (isLeftWall || isRightWall) {
            this.baseMaterial[idx] = BaseMaterial.GymWall;
            continue;
          }
          this.baseMaterial[idx] = BaseMaterial.GymFloor;

          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);
          const sector = Math.abs(((angle + Math.PI) % (Math.PI / 4)) - Math.PI / 8);

          if (dist >= 20 && dist <= 25 && sector < 0.14 * (1 - (dist - 20) / 6)) {
            this.baseMaterial[idx] = BaseMaterial.GymEmblemGold;
          } else if (dist <= 16.5 && dist >= 10.5) {
            this.baseMaterial[idx] = Math.abs(dy) <= 1.6 ? BaseMaterial.GymFloor : BaseMaterial.GymEmblemGold;
          } else if (dist < 10.5 && dist >= 6.8) {
            this.baseMaterial[idx] = BaseMaterial.GymFloor;
          } else if (dist < 6.8 && dist >= 3.4) {
            this.baseMaterial[idx] = BaseMaterial.GymEmblemWhite;
          } else if (dist < 3.4) {
            this.baseMaterial[idx] = BaseMaterial.GymEmblemDark;
          }
        } else if (biome === 'route_meadow') {
          const dx = (x - cx) / 72;
          const dy = (y - cy) / 36;
          const pathDist = Math.abs(dy + Math.sin(dx * 2.2) * 0.18);
          if (pathDist < 0.34) {
            this.baseMaterial[idx] = BaseMaterial.MeadowDirt;
            this.fuel[idx] = 0.08;
          } else {
            this.baseMaterial[idx] = BaseMaterial.MeadowGrass;
            this.fuel[idx] = 0.85;
            if (h > 195 && !isLeftWall && !isRightWall) {
              this.flora[idx] = 0.25;
            }
          }
        } else if (biome === 'viridian_forest') {
          if (isLeftWall || isRightWall || y < 8 || y > ARENA_H - 9) {
            this.baseMaterial[idx] = BaseMaterial.ForestCanopy;
            this.fuel[idx] = 1.15;
          } else {
            this.baseMaterial[idx] = BaseMaterial.ForestFloor;
            this.fuel[idx] = 1.1;
            if (h > 175) {
              this.flora[idx] = 0.35;
            }
          }
        } else if (biome === 'pewter_rock') {
          if (isLeftWall || isRightWall) {
            this.baseMaterial[idx] = BaseMaterial.RockWall;
          } else {
            this.baseMaterial[idx] = BaseMaterial.RockFloor;
            this.fuel[idx] = 0.02;
            const dist = Math.hypot(x - cx, y - cy);
            if (Math.abs(dist - 22) < 1.2 || Math.abs(dist - 40) < 0.9) {
              this.crater[idx] = 0.16;
            }
          }
        } else if (biome === 'cerulean_pool') {
          if (isLeftWall || isRightWall) {
            this.baseMaterial[idx] = BaseMaterial.GymWall;
          } else if (
            y >= 16 &&
            y <= ARENA_H - 17 &&
            x >= PLAY_MIN_X + 12 &&
            x <= PLAY_MAX_X - 12 &&
            !(Math.hypot(x - PLAYER_ANCHOR_X, y - PLAYER_ANCHOR_Y) < 17) &&
            !(Math.hypot(x - ENEMY_ANCHOR_X, y - ENEMY_ANCHOR_Y) < 17)
          ) {
            this.baseMaterial[idx] = BaseMaterial.PoolWater;
            this.water[idx] = 0.42;
          } else {
            this.baseMaterial[idx] = BaseMaterial.PoolDeck;
            this.water[idx] = 0.06;
          }
        }
      }
    }
  }

  public spawnPillar(x: number, y: number, radius = 8, hp = 2): DestructiblePillar | null {
    const cx = Math.max(PLAY_MIN_X + 14, Math.min(PLAY_MAX_X - 14, Math.round(x)));
    const cy = Math.max(PLAY_MIN_Y + 12, Math.min(PLAY_MAX_Y - 12, Math.round(y)));
    if (this.pillars.length >= 4) {
      this.pillars.shift();
    }
    const pillar: DestructiblePillar = {
      id: this.nextPillarId++,
      x: cx,
      y: cy,
      radius,
      hp,
      maxHp: hp,
      height: 11 + Math.round(radius * 0.7),
    };
    this.pillars.push(pillar);
    this.injectCrater(cx, cy, radius + 3, 0.45);
    return pillar;
  }

  /** Checks if a line segment (x1,y1)->(x2,y2) intersects any destructible Rock Pillar. */
  public findBlockingPillar(x1: number, y1: number, x2: number, y2: number): DestructiblePillar | null {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) return null;

    let closest: DestructiblePillar | null = null;
    let bestT = Infinity;

    for (const pil of this.pillars) {
      const t = Math.max(0.08, Math.min(0.92, ((pil.x - x1) * dx + (pil.y - y1) * dy) / len2));
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const dist = Math.hypot(pil.x - px, pil.y - py);
      if (dist <= pil.radius + 3 && t < bestT) {
        bestT = t;
        closest = pil;
      }
    }
    return closest;
  }

  public damagePillar(pillarId: number, amount = 1): boolean {
    const idx = this.pillars.findIndex((p) => p.id === pillarId);
    if (idx === -1) return false;
    this.pillars[idx].hp -= amount;
    if (this.pillars[idx].hp <= 0) {
      const dead = this.pillars[idx];
      this.pillars.splice(idx, 1);
      this.injectCrater(dead.x, dead.y, dead.radius + 6, 0.65);
      this.recentReactions.pillarsShattered += 1;
      return true;
    }
    return false;
  }

  public shatterAllPillars(): DestructiblePillar[] {
    const broken = [...this.pillars];
    for (const pil of broken) {
      this.injectCrater(pil.x, pil.y, pil.radius + 6, 0.7);
    }
    this.recentReactions.pillarsShattered += broken.length;
    this.pillars = [];
    return broken;
  }

  public addRipple(
    x: number,
    y: number,
    maxRadius: number,
    color: RippleRing['color'],
    speed = 54
  ): void {
    if (this.ripples.length > 26) this.ripples.shift();
    this.ripples.push({
      x,
      y,
      radius: 2,
      maxRadius,
      speed,
      alpha: 0.95,
      color,
    });
  }

  public injectWater(
    cx: number,
    cy: number,
    radiusX: number,
    radiusY: number,
    depth: number,
    vx: number,
    vy: number,
    foamAmount = 0.65
  ): void {
    const minX = Math.max(PLAY_MIN_X, Math.floor(cx - radiusX));
    const maxX = Math.min(PLAY_MAX_X, Math.ceil(cx + radiusX));
    const minY = Math.max(0, Math.floor(cy - radiusY));
    const maxY = Math.min(ARENA_H - 1, Math.ceil(cy + radiusY));

    const invRx = 1 / Math.max(1, radiusX);
    const invRy = 1 / Math.max(1, radiusY);

    for (let y = minY; y <= maxY; y++) {
      const ny = (y - cy) * invRy;
      const ny2 = ny * ny;
      for (let x = minX; x <= maxX; x++) {
        const nx = (x - cx) * invRx;
        const d2 = nx * nx + ny2;
        if (d2 > 1) continue;

        const falloff = 1 - Math.sqrt(d2);
        const idx = y * ARENA_W + x;

        if (this.fire[idx] > 0.08) {
          const steamBoost = Math.min(1.1, this.fire[idx] * 0.9 + depth * 0.5);
          this.steam[idx] = Math.min(1.2, this.steam[idx] + steamBoost);
          this.fire[idx] = Math.max(0, this.fire[idx] - depth * 1.4);
          this.recentReactions.steamTriggered = true;
          this.recentReactions.fireExtinguishedCells += 1;
          this.steamTurns = Math.max(this.steamTurns, 2);
        }

        const addDepth = depth * (0.35 + falloff * 0.85);
        this.water[idx] = Math.min(2.4, Math.max(this.water[idx], addDepth) + addDepth * 0.24);
        this.waterVx[idx] = this.waterVx[idx] * 0.4 + vx * falloff;
        this.waterVy[idx] = this.waterVy[idx] * 0.4 + vy * falloff;

        const leadingEdge = vx >= 0 ? nx > 0.15 : nx < -0.15;
        const edgeFoam = leadingEdge ? foamAmount * (0.55 + falloff * 0.8) : foamAmount * 0.25 * falloff;
        this.foam[idx] = Math.min(1.4, Math.max(this.foam[idx], edgeFoam));
      }
    }
  }

  public injectFire(
    cx: number,
    cy: number,
    radiusX: number,
    radiusY: number,
    intensity: number
  ): void {
    const minX = Math.max(PLAY_MIN_X, Math.floor(cx - radiusX));
    const maxX = Math.min(PLAY_MAX_X, Math.ceil(cx + radiusX));
    const minY = Math.max(0, Math.floor(cy - radiusY));
    const maxY = Math.min(ARENA_H - 1, Math.ceil(cy + radiusY));

    const invRx = 1 / Math.max(1, radiusX);
    const invRy = 1 / Math.max(1, radiusY);

    for (let y = minY; y <= maxY; y++) {
      const ny = (y - cy) * invRy;
      const ny2 = ny * ny;
      for (let x = minX; x <= maxX; x++) {
        const nx = (x - cx) * invRx;
        const d2 = nx * nx + ny2;
        if (d2 > 1) continue;

        const falloff = 1 - Math.sqrt(d2);
        const idx = y * ARENA_W + x;
        const heat = intensity * (0.35 + falloff * 0.9);

        if (this.ice[idx] > 0.05) {
          const melted = Math.min(this.ice[idx], heat * 0.9);
          this.ice[idx] -= melted;
          this.water[idx] = Math.min(1.2, this.water[idx] + melted * 0.5);
          this.steam[idx] = Math.min(1.2, this.steam[idx] + melted * 0.65);
          this.recentReactions.iceMeltedCells += 1;
        }

        if (this.water[idx] > 0.14) {
          const evap = Math.min(this.water[idx], heat * 0.65);
          this.water[idx] = Math.max(0, this.water[idx] - evap);
          this.foam[idx] = Math.max(0, this.foam[idx] - evap);
          this.steam[idx] = Math.min(1.2, this.steam[idx] + evap * 1.15);
          this.recentReactions.steamTriggered = true;
          this.steamTurns = Math.max(this.steamTurns, 2);
          if (this.water[idx] > 0.1) continue;
        }

        let bonusFuel = 0;
        if (this.flora[idx] > 0.1) {
          bonusFuel = this.flora[idx] * 0.7;
          this.fuel[idx] = Math.min(1.5, this.fuel[idx] + this.flora[idx] * 0.9);
          this.flora[idx] = Math.max(0, this.flora[idx] - heat * 0.8);
          this.recentReactions.floraIgnitedCells += 1;
        }

        this.fire[idx] = Math.min(2.0, Math.max(this.fire[idx], heat + bonusFuel));
        this.scorch[idx] = Math.min(1.0, this.scorch[idx] + heat * 0.34 * falloff);
        this.glowR[idx] = Math.min(1, this.glowR[idx] + heat * 0.85);
        this.glowG[idx] = Math.min(1, this.glowG[idx] + heat * 0.42);
      }
    }
  }

  public injectIce(cx: number, cy: number, radius: number, intensity: number): void {
    const minX = Math.max(PLAY_MIN_X, Math.floor(cx - radius));
    const maxX = Math.min(PLAY_MAX_X, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(ARENA_H - 1, Math.ceil(cy + radius));
    const r2 = radius * radius;

    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const falloff = 1 - Math.sqrt(d2) / Math.max(1, radius);
        const idx = y * ARENA_W + x;

        if (this.fire[idx] > 0.05) {
          this.fire[idx] = Math.max(0, this.fire[idx] - intensity * 1.1);
          this.steam[idx] = Math.min(1.0, this.steam[idx] + 0.4 * falloff);
          this.recentReactions.fireExtinguishedCells += 1;
        }

        let freezeAdd = intensity * (0.45 + falloff * 0.65);
        if (this.water[idx] > 0.08) {
          freezeAdd += this.water[idx] * 0.85;
          this.water[idx] *= 0.2;
          this.foam[idx] *= 0.2;
          this.recentReactions.waterFrozenCells += 1;
        }
        this.ice[idx] = Math.min(1.0, Math.max(this.ice[idx], freezeAdd));
        this.glowB[idx] = Math.min(1, this.glowB[idx] + 0.55 * falloff);
        this.glowG[idx] = Math.min(1, this.glowG[idx] + 0.35 * falloff);
      }
    }
  }

  public injectElectric(cx: number, cy: number, radius: number, voltage: number): void {
    const minX = Math.max(PLAY_MIN_X, Math.floor(cx - radius));
    const maxX = Math.min(PLAY_MAX_X, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(ARENA_H - 1, Math.ceil(cy + radius));
    const r2 = radius * radius;

    const wetSeeds: number[] = [];

    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const falloff = 1 - Math.sqrt(d2) / Math.max(1, radius);
        const idx = y * ARENA_W + x;
        this.charge[idx] = Math.min(1.5, Math.max(this.charge[idx], voltage * (0.5 + falloff * 0.7)));
        this.glowR[idx] = Math.min(1, this.glowR[idx] + 0.65 * falloff);
        this.glowG[idx] = Math.min(1, this.glowG[idx] + 0.65 * falloff);
        this.glowB[idx] = Math.min(1, this.glowB[idx] + 0.35 * falloff);
        if (this.water[idx] > 0.1) {
          wetSeeds.push(idx);
        }
      }
    }

    if (wetSeeds.length > 0) {
      const visited = new Uint8Array(ARENA_CELLS);
      const queue: number[] = [];
      for (const s of wetSeeds) {
        if (!visited[s]) {
          visited[s] = 1;
          queue.push(s);
        }
      }
      let head = 0;
      const maxConduct = 2400;
      let conducted = 0;
      const arcPoints: Array<{ x: number; y: number }> = [];

      while (head < queue.length && conducted < maxConduct) {
        const cur = queue[head++];
        const x = cur % ARENA_W;
        const y = (cur - x) / ARENA_W;
        this.charge[cur] = Math.min(1.5, Math.max(this.charge[cur], voltage * 1.1));
        this.glowG[cur] = Math.min(1, this.glowG[cur] + 0.5);
        this.glowB[cur] = Math.min(1, this.glowB[cur] + 0.7);
        conducted++;
        if (conducted % 70 === 0) {
          arcPoints.push({ x, y });
        }

        const neighbors = [cur - 1, cur + 1, cur - ARENA_W, cur + ARENA_W];
        for (const n of neighbors) {
          if (n >= 0 && n < ARENA_CELLS && !visited[n] && this.water[n] > 0.1) {
            visited[n] = 1;
            queue.push(n);
          }
        }
      }
      this.recentReactions.electricChainCells += conducted;

      for (let i = 0; i < arcPoints.length; i++) {
        const p1 = i === 0 ? { x: cx, y: cy } : arcPoints[i - 1];
        const p2 = arcPoints[i];
        this.addLightningBolt(p1.x, p1.y, p2.x, p2.y, 1, 0.28, true);
      }
    }
  }

  public addLightningBolt(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    duration = 0.22,
    isWaterBranch = false
  ): void {
    const steps = Math.max(4, Math.min(12, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 9)));
    let px = x1;
    let py = y1;
    const jitter = isWaterBranch ? 4.5 : 7.5;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const nx = i === steps ? x2 : x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter * 2;
      const ny = i === steps ? y2 : y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter * 2;
      this.lightningArcs.push({
        x1: px,
        y1: py,
        x2: nx,
        y2: ny,
        life: duration,
        maxLife: duration,
        thickness,
        isWaterBranch,
      });
      px = nx;
      py = ny;
    }
  }

  public injectCrater(cx: number, cy: number, radius: number, depth: number): void {
    const minX = Math.max(PLAY_MIN_X, Math.floor(cx - radius));
    const maxX = Math.min(PLAY_MAX_X, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(ARENA_H - 1, Math.ceil(cy + radius));
    const r2 = radius * radius;

    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const dist = Math.sqrt(d2);
        const falloff = 1 - dist / Math.max(1, radius);
        const idx = y * ARENA_W + x;
        const noise = (this.baseNoise[idx] / 255) * 0.25;
        this.crater[idx] = Math.min(1.0, Math.max(this.crater[idx], depth * (falloff + noise * 0.4)));
        if (this.ice[idx] > 0) this.ice[idx] = Math.max(0, this.ice[idx] - depth * 0.8);
        if (this.fire[idx] > 0) this.fire[idx] = Math.max(0, this.fire[idx] - depth * 0.35);
      }
    }

    const crackCount = Math.max(3, Math.round(radius / 4));
    for (let c = 0; c < crackCount; c++) {
      const ang = (c / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const len = radius * (1.1 + Math.random() * 0.7);
      let fx = cx;
      let fy = cy;
      for (let s = 0; s < len; s++) {
        fx += Math.cos(ang + (Math.random() - 0.5) * 0.55);
        fy += Math.sin(ang + (Math.random() - 0.5) * 0.55);
        const ix = Math.round(fx);
        const iy = Math.round(fy);
        if (ix >= PLAY_MIN_X && ix <= PLAY_MAX_X && iy >= 0 && iy < ARENA_H) {
          const idx = iy * ARENA_W + ix;
          this.crater[idx] = Math.min(1.0, Math.max(this.crater[idx], 0.55 * depth));
        }
      }
    }
  }

  public injectFlora(cx: number, cy: number, radius: number, density: number): void {
    const minX = Math.max(PLAY_MIN_X, Math.floor(cx - radius));
    const maxX = Math.min(PLAY_MAX_X, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(ARENA_H - 1, Math.ceil(cy + radius));
    const r2 = radius * radius;

    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const falloff = 1 - Math.sqrt(d2) / Math.max(1, radius);
        const idx = y * ARENA_W + x;
        if (this.fire[idx] > 0.15) continue;
        const waterBonus = this.water[idx] > 0.08 ? 1.45 : 1.0;
        const noise = this.baseNoise[idx] / 255;
        if (noise + falloff * 0.7 > 0.52) {
          const growth = density * falloff * waterBonus;
          this.flora[idx] = Math.min(1.0, Math.max(this.flora[idx], growth));
          this.fuel[idx] = Math.min(1.4, this.fuel[idx] + growth * 0.7);
          this.scorch[idx] = Math.max(0, this.scorch[idx] - growth * 0.4);
        }
      }
    }
  }

  /**
   * Gust / Wing Attack physically pushes Steam clouds away, fans & advects active flames
   * downwind across the floor, and drives surface ripples on water puddles!
   */
  public applyWindGust(dirX: number, strength: number): void {
    this.steamTurns = 0;
    const shift = Math.round(dirX * (4 + strength * 10));
    const fireCopy = new Float32Array(this.fire);

    for (let y = 1; y < ARENA_H - 1; y++) {
      const row = y * ARENA_W;
      for (let x = PLAY_MIN_X; x <= PLAY_MAX_X; x++) {
        const idx = row + x;
        this.steam[idx] *= Math.max(0.05, 1 - strength * 0.8);
        if (this.water[idx] > 0.08) {
          this.waterVx[idx] += dirX * strength * 24;
        }
        const srcX = x - shift;
        if (srcX >= PLAY_MIN_X && srcX <= PLAY_MAX_X) {
          const srcFire = fireCopy[row + srcX];
          if (srcFire > 0.12 && this.water[idx] < 0.1) {
            this.fire[idx] = Math.min(2.0, Math.max(this.fire[idx], srcFire * (0.85 + strength * 0.3)));
            this.scorch[idx] = Math.min(1.0, this.scorch[idx] + 0.18);
          }
        }
      }
    }
  }

  public step(dt: number): void {
    const clampedDt = Math.min(0.05, dt);
    this.simTime += clampedDt;
    this.stepCounter++;

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += r.speed * clampedDt;
      r.alpha = Math.max(0, 1 - r.radius / r.maxRadius);
      if (r.radius >= r.maxRadius) this.ripples.splice(i, 1);
    }

    for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
      this.lightningArcs[i].life -= clampedDt;
      if (this.lightningArcs[i].life <= 0) this.lightningArcs.splice(i, 1);
    }

    const w = ARENA_W;
    const h = ARENA_H;
    const water = this.water;
    const waterNext = this.waterNext;
    const foam = this.foam;
    const foamNext = this.foamNext;
    const fire = this.fire;
    const fireNext = this.fireNext;
    const charge = this.charge;
    const chargeNext = this.chargeNext;
    const steam = this.steam;
    const steamNext = this.steamNext;

    const tickFire = this.stepCounter % 2 === 0;

    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = PLAY_MIN_X; x <= PLAY_MAX_X; x++) {
        const idx = row + x;

        this.glowR[idx] *= 0.86;
        this.glowG[idx] *= 0.86;
        this.glowB[idx] *= 0.86;

        const curW = water[idx];
        const vx = this.waterVx[idx];
        const vy = this.waterVy[idx];
        const avgNeighbors =
          (water[idx - 1] + water[idx + 1] + water[idx - w] + water[idx + w]) * 0.25;

        let advectedW = curW;
        let advectedFoam = foam[idx];
        if (Math.abs(vx) > 0.3 || Math.abs(vy) > 0.3) {
          const sx = Math.max(PLAY_MIN_X, Math.min(PLAY_MAX_X, Math.round(x - vx * clampedDt * 1.1)));
          const sy = Math.max(1, Math.min(h - 2, Math.round(y - vy * clampedDt * 1.1)));
          const sIdx = sy * w + sx;
          advectedW = curW * 0.45 + water[sIdx] * 0.55;
          advectedFoam = foam[idx] * 0.4 + foam[sIdx] * 0.6;
        }

        let nextW = advectedW * 0.72 + avgNeighbors * 0.28;
        const isPool = this.baseMaterial[idx] === BaseMaterial.PoolWater;
        if (isPool) {
          nextW = Math.max(0.38, nextW);
        } else if (nextW > 0.34) {
          nextW = 0.34 + (nextW - 0.34) * (1 - clampedDt * 1.65);
        } else if (nextW > 0.02) {
          nextW *= 1 - clampedDt * 0.014;
        } else {
          nextW = 0;
        }
        waterNext[idx] = nextW;

        this.waterVx[idx] = vx * (1 - clampedDt * 2.8);
        this.waterVy[idx] = vy * (1 - clampedDt * 2.8);

        const slope =
          Math.abs(water[idx + 1] - water[idx - 1]) + Math.abs(water[idx + w] - water[idx - w]);
        let nextFoam = advectedFoam * (1 - clampedDt * 2.2);
        if (slope > 0.24 && nextW > 0.28) {
          nextFoam = Math.min(1.3, nextFoam + slope * 0.26);
        }
        foamNext[idx] = nextFoam > 0.015 ? nextFoam : 0;

        let f = fire[idx];
        if (tickFire) {
          const maxNeighborFire = Math.max(
            fire[idx - 1],
            fire[idx + 1],
            fire[idx - w],
            fire[idx + w]
          );
          if (
            f < 0.05 &&
            maxNeighborFire > 0.46 &&
            this.fuel[idx] > 0.25 &&
            nextW < 0.08 &&
            this.ice[idx] < 0.1
          ) {
            if (((x * 19 + y * 37 + this.stepCounter) & 15) === 0) {
              f = 0.56;
            }
          }
        }
        if (f > 0.01) {
          if (nextW > 0.15) {
            steamNext[idx] = Math.min(1.2, steam[idx] + f * 0.55);
            f *= 0.45;
          } else if (this.fuel[idx] > 0.05) {
            this.fuel[idx] = Math.max(0, this.fuel[idx] - clampedDt * 0.06);
            this.scorch[idx] = Math.min(1.0, this.scorch[idx] + clampedDt * 0.16);
            f = Math.max(0.32, f * (1 - clampedDt * 0.34));
            if (this.flora[idx] > 0) {
              this.flora[idx] = Math.max(0, this.flora[idx] - clampedDt * 0.3);
            }
          } else {
            this.scorch[idx] = Math.min(1.0, this.scorch[idx] + clampedDt * 0.08);
            f *= 1 - clampedDt * 0.7;
          }
          this.glowR[idx] = Math.min(1, this.glowR[idx] + f * 0.45);
          this.glowG[idx] = Math.min(1, this.glowG[idx] + f * 0.2);
        }
        fireNext[idx] = f > 0.02 ? f : 0;

        const c = charge[idx];
        chargeNext[idx] = c > 0.02 ? c * (1 - clampedDt * 4.5) : 0;

        const belowSteam = steam[idx + w];
        const avgS =
          steam[idx] * 0.45 + belowSteam * 0.35 + steam[idx - 1] * 0.1 + steam[idx + 1] * 0.1;
        let nextS = avgS * (1 - clampedDt * 0.52);
        if (f > 0.35 && ((x + y + this.stepCounter) & 7) === 0) {
          nextS = Math.min(1.0, nextS + 0.14);
        }
        steamNext[idx] = nextS > 0.015 ? nextS : 0;
      }
    }

    this.water = waterNext;
    this.waterNext = water;
    this.foam = foamNext;
    this.foamNext = foam;
    this.fire = fireNext;
    this.fireNext = fire;
    this.charge = chargeNext;
    this.chargeNext = charge;
    this.steam = steamNext;
    this.steamNext = steam;
  }

  public samplePointSurface(x: number, y: number): 'fire' | 'water' | 'ice' | 'normal' {
    const ix = Math.max(PLAY_MIN_X, Math.min(PLAY_MAX_X, Math.round(x)));
    const iy = Math.max(1, Math.min(ARENA_H - 2, Math.round(y)));
    const idx = iy * ARENA_W + ix;
    if (this.fire[idx] > 0.18) return 'fire';
    if (this.ice[idx] > 0.18) return 'ice';
    if (this.water[idx] > 0.12) return 'water';
    return 'normal';
  }

  public sampleZone(cx: number, cy: number, radius = 20): ZoneEnvSample {
    const minX = Math.max(PLAY_MIN_X, Math.floor(cx - radius));
    const maxX = Math.min(PLAY_MAX_X, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(ARENA_H - 1, Math.ceil(cy + radius));
    const r2 = radius * radius;

    let count = 0;
    let sumWater = 0;
    let sumFire = 0;
    let sumScorch = 0;
    let sumIce = 0;
    let sumCharge = 0;
    let sumCrater = 0;
    let sumFlora = 0;
    let sumSteam = 0;

    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        if (dx * dx + dy * dy > r2) continue;
        const idx = y * ARENA_W + x;
        sumWater += this.water[idx];
        sumFire += this.fire[idx];
        sumScorch += this.scorch[idx];
        sumIce += this.ice[idx];
        sumCharge += this.charge[idx];
        sumCrater += this.crater[idx];
        sumFlora += this.flora[idx];
        sumSteam += this.steam[idx];
        count++;
      }
    }

    const inv = count > 0 ? 1 / count : 0;
    const sample: ZoneEnvSample = {
      water: sumWater * inv,
      fire: sumFire * inv,
      scorch: sumScorch * inv,
      ice: sumIce * inv,
      charge: sumCharge * inv,
      crater: sumCrater * inv,
      flora: sumFlora * inv,
      steam: sumSteam * inv,
      tags: [],
    };

    if (sample.fire >= 0.08 || sample.scorch >= 0.25) sample.tags.push('burning');
    if (sample.water >= 0.08) sample.tags.push('flooded');
    if (sample.charge >= 0.05) sample.tags.push('electrified');
    if (sample.ice >= 0.12) sample.tags.push('frozen');
    if (sample.steam >= 0.1 || this.steamTurns > 0) sample.tags.push('steam');
    if (sample.crater >= 0.12) sample.tags.push('cratered');
    if (sample.flora >= 0.16) sample.tags.push('overgrown');

    return sample;
  }

  public getSnapshot(
    playerX = PLAYER_ANCHOR_X,
    playerY = PLAYER_ANCHOR_Y,
    enemyX = ENEMY_ANCHOR_X,
    enemyY = ENEMY_ANCHOR_Y
  ): ArenaEnvSnapshot {
    const playerZone = this.sampleZone(playerX, playerY, 20);
    const enemyZone = this.sampleZone(enemyX, enemyY, 20);
    const centerZone = this.sampleZone(ARENA_W / 2, ARENA_H / 2, 34);

    const tagSet = new Set<EnvConditionTag>([
      ...playerZone.tags,
      ...enemyZone.tags,
      ...centerZone.tags,
    ]);
    if (this.steamTurns > 0) tagSet.add('steam');
    if (this.pillars.length > 0) tagSet.add('pillars');

    return {
      playerZone,
      enemyZone,
      centerZone,
      activeTags: Array.from(tagSet),
      steamTurns: this.steamTurns,
      pillarCount: this.pillars.length,
    };
  }
}
