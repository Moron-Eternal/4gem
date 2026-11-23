export type ParticleKind =
  | 'foam'
  | 'water'
  | 'fire'
  | 'ember'
  | 'smoke'
  | 'steam'
  | 'spark'
  | 'ice'
  | 'rock'
  | 'dust'
  | 'leaf'
  | 'psychic'
  | 'poison'
  | 'star';

export interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  z: number; // elevation above arena floor
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  drag: number;
  size: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  bounce: number;
}

const MAX_PARTICLES = 1800;

export class ParticleSystem {
  public readonly pool: Particle[] = [];
  private cursor = 0;

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        active: false,
        kind: 'water',
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        gravity: 0,
        drag: 0.98,
        size: 1,
        life: 0,
        maxLife: 1,
        r: 255,
        g: 255,
        b: 255,
        bounce: 0,
      });
    }
  }

  public clear(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool[i].active = false;
    }
  }

  public spawn(opts: {
    kind: ParticleKind;
    x: number;
    y: number;
    z?: number;
    vx: number;
    vy: number;
    vz?: number;
    gravity?: number;
    drag?: number;
    size?: number;
    life: number;
    r: number;
    g: number;
    b: number;
    bounce?: number;
  }): void {
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;

    p.active = true;
    p.kind = opts.kind;
    p.x = opts.x;
    p.y = opts.y;
    p.z = opts.z ?? 0;
    p.vx = opts.vx;
    p.vy = opts.vy;
    p.vz = opts.vz ?? 0;
    p.gravity = opts.gravity ?? 0;
    p.drag = opts.drag ?? 0.96;
    p.size = opts.size ?? 1;
    p.life = opts.life;
    p.maxLife = opts.life;
    p.r = opts.r;
    p.g = opts.g;
    p.b = opts.b;
    p.bounce = opts.bounce ?? 0;
  }

  public emitWaterBurst(x: number, y: number, count: number, dirX: number, scale: number): void {
    for (let i = 0; i < count; i++) {
      const ang = (Math.random() - 0.5) * Math.PI * 1.4 + (dirX >= 0 ? 0 : Math.PI);
      const spd = (18 + Math.random() * 58) * (0.65 + scale * 0.85);
      const isFoam = Math.random() < 0.62;
      this.spawn({
        kind: isFoam ? 'foam' : 'water',
        x: x + (Math.random() - 0.5) * (6 + scale * 18),
        y: y + (Math.random() - 0.5) * (8 + scale * 28),
        z: 1 + Math.random() * 5,
        vx: Math.cos(ang) * spd + dirX * 14,
        vy: Math.sin(ang) * spd * 0.85,
        vz: 16 + Math.random() * (26 + scale * 32),
        gravity: 95,
        drag: 0.95,
        size: isFoam && Math.random() < 0.35 + scale * 0.35 ? 2 : 1,
        life: 0.25 + Math.random() * (0.35 + scale * 0.35),
        r: isFoam ? 236 + Math.floor(Math.random() * 19) : 92 + Math.floor(Math.random() * 60),
        g: isFoam ? 245 + Math.floor(Math.random() * 10) : 165 + Math.floor(Math.random() * 55),
        b: isFoam ? 255 : 225 + Math.floor(Math.random() * 30),
        bounce: 0.2,
      });
    }
  }

  public emitFireBurst(x: number, y: number, count: number, dirX: number, scale: number): void {
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * (0.6 + scale * 0.9);
      const spd = (24 + Math.random() * 64) * (0.6 + scale * 0.75);
      const roll = Math.random();
      let r = 255;
      let g = 140;
      let b = 30;
      let kind: ParticleKind = 'fire';
      if (roll < 0.22) {
        // White-gold intense core
        r = 255;
        g = 248;
        b = 185;
      } else if (roll < 0.58) {
        // Bright orange-gold
        r = 255;
        g = 155 + Math.floor(Math.random() * 65);
        b = 28;
      } else if (roll < 0.82) {
        // Deep crimson ember
        kind = 'ember';
        r = 235;
        g = 58;
        b = 20;
      } else {
        // Rising soot smoke
        kind = 'smoke';
        r = 55;
        g = 48;
        b = 46;
      }

      this.spawn({
        kind,
        x: x + (Math.random() - 0.5) * (4 + scale * 14),
        y: y + (Math.random() - 0.5) * (6 + scale * 22),
        z: Math.random() * 4,
        vx: Math.cos(spread) * dirX * spd + (Math.random() - 0.5) * 18,
        vy: Math.sin(spread) * spd - (kind === 'smoke' ? 14 : 4),
        vz: kind === 'smoke' ? 22 : 10 + Math.random() * 20,
        gravity: kind === 'smoke' ? -8 : 24,
        drag: 0.94,
        size: scale > 0.55 && Math.random() < 0.45 ? 2 : 1,
        life: 0.22 + Math.random() * (0.35 + scale * 0.35),
        r,
        g,
        b,
      });
    }
  }

  public emitElectricSparks(x: number, y: number, count: number, scale: number): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (24 + Math.random() * 72) * (0.65 + scale * 0.7);
      const cyan = Math.random() < 0.35;
      this.spawn({
        kind: 'spark',
        x: x + (Math.random() - 0.5) * (6 + scale * 16),
        y: y + (Math.random() - 0.5) * (6 + scale * 16),
        z: 2 + Math.random() * 6,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: 12 + Math.random() * 24,
        gravity: 40,
        drag: 0.91,
        size: Math.random() < 0.3 ? 2 : 1,
        life: 0.15 + Math.random() * 0.25,
        r: cyan ? 125 : 255,
        g: cyan ? 245 : 242,
        b: cyan ? 255 : 92,
      });
    }
  }

  public emitRockDebris(x: number, y: number, count: number, scale: number): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (14 + Math.random() * 48) * (0.6 + scale * 0.75);
      const isDust = Math.random() < 0.45;
      this.spawn({
        kind: isDust ? 'dust' : 'rock',
        x: x + (Math.random() - 0.5) * (6 + scale * 18),
        y: y + (Math.random() - 0.5) * (6 + scale * 18),
        z: 2 + Math.random() * 8,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.85,
        vz: 24 + Math.random() * (34 + scale * 36),
        gravity: 135,
        drag: 0.96,
        size: !isDust && Math.random() < 0.45 + scale * 0.25 ? 2 : 1,
        life: 0.35 + Math.random() * 0.45,
        r: isDust ? 186 : 138 - Math.floor(Math.random() * 40),
        g: isDust ? 168 : 118 - Math.floor(Math.random() * 35),
        b: isDust ? 142 : 95 - Math.floor(Math.random() * 30),
        bounce: 0.38,
      });
    }
  }

  public emitIceShards(x: number, y: number, count: number, scale: number): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (16 + Math.random() * 52) * (0.65 + scale * 0.75);
      const bright = Math.random() < 0.5;
      this.spawn({
        kind: 'ice',
        x: x + (Math.random() - 0.5) * (6 + scale * 18),
        y: y + (Math.random() - 0.5) * (6 + scale * 18),
        z: 2 + Math.random() * 8,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: 14 + Math.random() * 24,
        gravity: 75,
        drag: 0.95,
        size: Math.random() < 0.4 ? 2 : 1,
        life: 0.28 + Math.random() * 0.4,
        r: bright ? 225 : 105,
        g: bright ? 248 : 225,
        b: 255,
        bounce: 0.3,
      });
    }
  }

  public emitLeaves(x: number, y: number, count: number, dirX: number, scale: number): void {
    for (let i = 0; i < count; i++) {
      const spd = (20 + Math.random() * 58) * (0.65 + scale * 0.75);
      const ang = (Math.random() - 0.5) * 1.1 + (dirX >= 0 ? 0 : Math.PI);
      const bright = Math.random() < 0.5;
      this.spawn({
        kind: 'leaf',
        x: x + (Math.random() - 0.5) * (6 + scale * 18),
        y: y + (Math.random() - 0.5) * (8 + scale * 22),
        z: 2 + Math.random() * 10,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: 8 + Math.random() * 16,
        gravity: 22,
        drag: 0.95,
        size: Math.random() < 0.55 ? 2 : 1,
        life: 0.35 + Math.random() * 0.45,
        r: bright ? 134 : 34,
        g: bright ? 239 : 185,
        b: bright ? 92 : 76,
      });
    }
  }

  public step(dt: number): void {
    const clampedDt = Math.min(0.05, dt);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= clampedDt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      const d = Math.pow(p.drag, clampedDt * 60);
      p.vx *= d;
      p.vy *= d;
      p.vz -= p.gravity * clampedDt;

      p.x += p.vx * clampedDt;
      p.y += p.vy * clampedDt;
      p.z += p.vz * clampedDt;

      if (p.z < 0) {
        p.z = 0;
        if (p.bounce > 0 && Math.abs(p.vz) > 8) {
          p.vz = -p.vz * p.bounce;
          p.vx *= 0.7;
          p.vy *= 0.7;
        } else {
          p.vz = 0;
          p.vx *= 0.78;
          p.vy *= 0.78;
        }
      }
    }
  }
}
