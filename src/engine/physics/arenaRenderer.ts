import { ARENA_H, ARENA_W, ArenaGrid, BaseMaterial, PLAY_MAX_X, PLAY_MIN_X } from './arenaGrid';
import { BeamVisual, FighterVisualState, MoveChoreographer, ProjectileVisual } from './moveChoreographer';
import { SpriteEntry } from '../sprites/spriteManager';

export interface RenderSprites {
  player: SpriteEntry | null;
  enemy: SpriteEntry | null;
  playerScale: number;
  enemyScale: number;
  topLabel?: string;
}

/**
 * High-speed direct pixel-buffer renderer at native 192x108 GBA-style resolution.
 * Renders biome tiles, persistent environmental scars, dynamic fluid waves & whitecaps,
 * flickering pixel flames, floor illumination, sprites with elemental overlays, lightning,
 * particles, and Bayer-dithered steam clouds.
 */
export class ArenaRenderer {
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private pixels32: Uint32Array;
  private pixels8: Uint8ClampedArray;

  constructor() {
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = ARENA_W;
    this.offscreen.height = ARENA_H;
    const ctx = this.offscreen.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Could not initialize 2D context for ArenaRenderer');
    }
    this.offCtx = ctx;
    this.offCtx.imageSmoothingEnabled = false;
    this.imageData = this.offCtx.createImageData(ARENA_W, ARENA_H);
    this.pixels8 = this.imageData.data;
    this.pixels32 = new Uint32Array(this.imageData.data.buffer);
  }

  private packRGBA(r: number, g: number, b: number): number {
    const cr = r < 0 ? 0 : r > 255 ? 255 : r | 0;
    const cg = g < 0 ? 0 : g > 255 ? 255 : g | 0;
    const cb = b < 0 ? 0 : b > 255 ? 255 : b | 0;
    return (255 << 24) | (cb << 16) | (cg << 8) | cr;
  }

  private blendPixel(idx: number, r: number, g: number, b: number, alpha: number): void {
    const p = idx * 4;
    const inv = 1 - alpha;
    this.pixels8[p] = (this.pixels8[p] * inv + r * alpha) | 0;
    this.pixels8[p + 1] = (this.pixels8[p + 1] * inv + g * alpha) | 0;
    this.pixels8[p + 2] = (this.pixels8[p + 2] * inv + b * alpha) | 0;
  }

  private setPixel(x: number, y: number, r: number, g: number, b: number, alpha = 1): void {
    const ix = x | 0;
    const iy = y | 0;
    if (ix < 0 || ix >= ARENA_W || iy < 0 || iy >= ARENA_H) return;
    const idx = iy * ARENA_W + ix;
    if (alpha >= 0.99) {
      this.pixels32[idx] = this.packRGBA(r, g, b);
    } else {
      this.blendPixel(idx, r, g, b, alpha);
    }
  }

  private drawLinePixel(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    r: number,
    g: number,
    b: number,
    thickness = 1,
    alpha = 1
  ): void {
    let ix0 = Math.round(x0);
    let iy0 = Math.round(y0);
    const ix1 = Math.round(x1);
    const iy1 = Math.round(y1);
    const dx = Math.abs(ix1 - ix0);
    const dy = Math.abs(iy1 - iy0);
    const sx = ix0 < ix1 ? 1 : -1;
    const sy = iy0 < iy1 ? 1 : -1;
    let err = dx - dy;
    const rad = Math.floor(thickness / 2);

    while (true) {
      for (let oy = -rad; oy <= rad; oy++) {
        for (let ox = -rad; ox <= rad; ox++) {
          this.setPixel(ix0 + ox, iy0 + oy, r, g, b, alpha);
        }
      }
      if (ix0 === ix1 && iy0 === iy1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        ix0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        iy0 += sy;
      }
    }
  }

  public render(
    targetCanvas: HTMLCanvasElement,
    choreo: MoveChoreographer,
    sprites: RenderSprites
  ): void {
    const grid = choreo.grid;
    const t = grid.simTime;

    // === PASS 1: Render 192x108 terrain, craters, flora, water/foam, ice, fire, glow ===
    this.renderGridToBuffer(grid, t);

    // === PASS 2: Concentric ripples (matching bottom-right water shockwave in image_2.png) ===
    this.renderRipples(grid);

    // === PASS 3: Active elemental beams (Flamethrower, Water Jet, Ice Beam, Vine Whip, Solar Beam) ===
    for (const beam of choreo.activeBeams) {
      this.renderBeam(beam, t);
    }

    // === PASS 4: Lightning arcs (including water-puddle chain branches!) ===
    this.renderLightning(grid);

    // Commit pixel buffer to offscreen canvas
    this.offCtx.putImageData(this.imageData, 0, 0);

    // === PASS 5: Pokémon sprites (crisp nearest-neighbor + drop shadow + elemental overlays) ===
    this.renderFighterSprite(
      sprites.player,
      choreo.playerVisual,
      sprites.playerScale,
      true,
      t
    );
    this.renderFighterSprite(
      sprites.enemy,
      choreo.enemyVisual,
      sprites.enemyScale,
      false,
      t
    );

    // === PASS 6: Foreground foam splashes, fire tongues, boulders, Poké Ball, particles, & steam ===
    this.renderProjectiles(choreo.activeProjectiles);
    this.renderParticles(choreo);
    this.renderSteamOverlay(grid, t);

    // === PASS 7: Subtle screen flash on massive impacts ===
    if (choreo.screenFlash > 0.02) {
      const a = Math.min(0.45, choreo.screenFlash);
      this.offCtx.fillStyle =
        choreo.screenFlashColor === 'yellow'
          ? `rgba(254, 249, 175, ${a})`
          : choreo.screenFlashColor === 'orange'
          ? `rgba(255, 165, 65, ${a})`
          : choreo.screenFlashColor === 'cyan'
          ? `rgba(186, 238, 255, ${a})`
          : `rgba(255, 255, 255, ${a})`;
      this.offCtx.fillRect(0, 0, ARENA_W, ARENA_H);
    }

    // Optional top-left label (used in 3-panel Split-Screen Scaling Showcase like image.png!)
    if (sprites.topLabel) {
      this.offCtx.font = 'bold 7px monospace';
      this.offCtx.fillStyle = '#0f172a';
      this.offCtx.fillText(sprites.topLabel, 5, 10);
      this.offCtx.fillText(sprites.topLabel, 3, 10);
      this.offCtx.fillText(sprites.topLabel, 4, 11);
      this.offCtx.fillText(sprites.topLabel, 4, 9);
      this.offCtx.fillStyle = '#f8fafc';
      this.offCtx.fillText(sprites.topLabel, 4, 10);
    }

    // === FINAL BLIT to display canvas with crisp nearest-neighbor pixelation & camera shake ===
    const tCtx = targetCanvas.getContext('2d');
    if (!tCtx) return;
    tCtx.imageSmoothingEnabled = false;
    tCtx.fillStyle = '#0b1018';
    tCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

    const scaleX = targetCanvas.width / ARENA_W;
    const scaleY = targetCanvas.height / ARENA_H;
    const dx = Math.round(choreo.shakeX * scaleX);
    const dy = Math.round(choreo.shakeY * scaleY);
    tCtx.drawImage(
      this.offscreen,
      0,
      0,
      ARENA_W,
      ARENA_H,
      dx,
      dy,
      targetCanvas.width,
      targetCanvas.height
    );
  }

  private renderGridToBuffer(grid: ArenaGrid, t: number): void {
    const w = ARENA_W;
    const h = ARENA_H;
    const baseMat = grid.baseMaterial;
    const noise = grid.baseNoise;
    const water = grid.water;
    const foam = grid.foam;
    const fire = grid.fire;
    const scorch = grid.scorch;
    const ice = grid.ice;
    const charge = grid.charge;
    const crater = grid.crater;
    const flora = grid.flora;
    const glowR = grid.glowR;
    const glowG = grid.glowG;
    const glowB = grid.glowB;

    const waveAnim = Math.sin(t * 4.5);
    const fireTick = Math.floor(t * 14);

    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const idx = row + x;
        const mat = baseMat[idx];
        const n = noise[idx];

        let r = 160;
        let g = 185;
        let b = 192;

        // 1. Base biome material palette
        switch (mat) {
          case BaseMaterial.GymWall: {
            // Vertical grooved steel pillars matching reference screenshots!
            const rib = (x < PLAY_MIN_X ? x : ARENA_W - 1 - x) % 6;
            if (rib === 0) {
              r = 58; g = 74; b = 92;
            } else if (rib === 1) {
              r = 104; g = 124; b = 144;
            } else if (rib === 2 || rib === 3) {
              r = 164; g = 182; b = 198;
            } else if (rib === 4) {
              r = 212; g = 224; b = 234;
            } else {
              r = 84; g = 102; b = 120;
            }
            if ((y & 15) === 0) {
              r -= 14; g -= 14; b -= 12;
            }
            break;
          }
          case BaseMaterial.GymFloor: {
            r = 160; g = 186; b = 192;
            // Subtle floor paneling lines
            if (x === PLAY_MIN_X || x === PLAY_MAX_X) {
              r = 72; g = 88; b = 104;
            } else if (x === PLAY_MIN_X + 1 || x === PLAY_MAX_X - 1) {
              r = 208; g = 222; b = 228;
            } else if (((x + y) & 31) === 0 && n > 160) {
              r -= 5; g -= 4; b -= 3;
            }
            break;
          }
          case BaseMaterial.GymEmblemGold:
            r = 214; g = 188; b = 114;
            break;
          case BaseMaterial.GymEmblemWhite:
            r = 232; g = 240; b = 244;
            break;
          case BaseMaterial.GymEmblemDark:
            r = 110; g = 136; b = 144;
            break;
          case BaseMaterial.MeadowGrass: {
            const blade = ((x * 3 + y * 5 + (n >> 4)) & 7) === 0;
            r = blade ? 82 : 104;
            g = blade ? 156 : 178;
            b = blade ? 68 : 82;
            if (n > 215) { r += 14; g += 14; b -= 4; }
            break;
          }
          case BaseMaterial.MeadowDirt:
            r = 192 + ((n & 15) - 8);
            g = 166 + ((n & 15) - 8);
            b = 116 + ((n & 7) - 4);
            break;
          case BaseMaterial.ForestCanopy:
            r = 34 + (n & 15);
            g = 76 + (n & 23);
            b = 46 + (n & 15);
            break;
          case BaseMaterial.ForestFloor: {
            const leaf = n > 205;
            r = leaf ? 78 : 64 + (n & 11);
            g = leaf ? 132 : 114 + (n & 15);
            b = leaf ? 56 : 62 + (n & 7);
            break;
          }
          case BaseMaterial.RockWall: {
            const ridge = ((x * 5 + y * 2) & 7);
            r = 104 + ridge * 5;
            g = 86 + ridge * 4;
            b = 68 + ridge * 3;
            break;
          }
          case BaseMaterial.RockFloor:
            r = 164 + ((n & 15) - 8);
            g = 142 + ((n & 15) - 8);
            b = 112 + ((n & 11) - 5);
            if (((x ^ y) & 15) === 0 && n > 190) { r -= 14; g -= 14; b -= 12; }
            break;
          case BaseMaterial.PoolDeck: {
            const tile = (x % 12 === 0 || y % 12 === 0);
            r = tile ? 156 : 196;
            g = tile ? 182 : 216;
            b = tile ? 202 : 228;
            break;
          }
          case BaseMaterial.PoolWater:
            r = 66; g = 138; b = 192;
            break;
        }

        // 2. Persistent Craters & Ground Cracks
        const cr = crater[idx];
        if (cr > 0.06) {
          const leftCr = x > 0 ? crater[idx - 1] : 0;
          const topCr = y > 0 ? crater[idx - w] : 0;
          if (cr > leftCr + 0.14 || cr > topCr + 0.14) {
            // Highlighted beveled rim
            r += 22; g += 18; b += 14;
          } else {
            const dark = 1 - cr * 0.65;
            r *= dark;
            g *= dark;
            b *= dark;
          }
        }

        // 3. Persistent Scorch / Char Scars
        const sc = scorch[idx];
        if (sc > 0.04) {
          const ash = Math.min(0.84, sc * 0.85);
          r = r * (1 - ash) + 34 * ash;
          g = g * (1 - ash) + 28 * ash;
          b = b * (1 - ash) + 28 * ash;
        }

        // 4. Persistent Sprouted Flora (vines & lush grass tufts)
        const fl = flora[idx];
        if (fl > 0.12) {
          const sway = ((x + Math.round(waveAnim)) & 3) === 0;
          const fAlpha = Math.min(0.92, fl * 0.95);
          const fr = sway ? 62 : 42;
          const fg = sway ? 174 : 138;
          const fb = sway ? 66 : 54;
          r = r * (1 - fAlpha) + fr * fAlpha;
          g = g * (1 - fAlpha) + fg * fAlpha;
          b = b * (1 - fAlpha) + fb * fAlpha;
        }

        // 5. Dynamic Shallow-Water Waves, Standing Puddles & Pixel Whitecaps!
        const wt = water[idx];
        if (wt > 0.05) {
          // Compute wave surface slope for directional 3D crest shading (just like image.png!)
          const wL = x > 0 ? water[idx - 1] : wt;
          const wR = x < w - 1 ? water[idx + 1] : wt;
          const wU = y > 0 ? water[idx - w] : wt;
          const gradX = wR - wL;
          const gradY = wt - wU;

          // Translucent slate-cerulean wave body with deep navy back trough so floor emblem gleams through!
          const depthT = Math.min(1, wt / 1.35);
          const alpha = Math.min(0.78, 0.22 + depthT * 0.54);

          let wr = 82 - depthT * 36;
          let wg = 128 - depthT * 46;
          let wb = 176 - depthT * 36;

          // Subtle animated water caustic shimmer
          const caustic = Math.sin(x * 0.25 + y * 0.18 + t * 5.2);
          if (caustic > 0.78 && wt < 0.48) {
            wr += 28; wg += 32; wb += 26;
          }

          // Wave slope shadowing (deep navy shadow behind crest, bright translucent teal on front face!)
          const shade = gradX * -58 + gradY * -18;
          wr += shade;
          wg += shade * 0.9;
          wb += shade * 0.8;

          r = r * (1 - alpha) + wr * alpha;
          g = g * (1 - alpha) + wg * alpha;
          b = b * (1 - alpha) + wb * alpha;

          // Crisp selective pixel seafoam crests & impact splash streaks!
          const fm = foam[idx];
          if (fm > 0.26) {
            const dither = ((n ^ (x * 17 + y * 31)) & 255) / 255;
            if (fm > 0.78 || (fm - 0.22) * 1.15 + dither * 0.42 > 0.78) {
              const fa = Math.min(0.95, 0.35 + fm * 0.62);
              r = r * (1 - fa) + 244 * fa;
              g = g * (1 - fa) + 250 * fa;
              b = b * (1 - fa) + 255 * fa;
            }
          }
        }

        // 6. Frozen Ice Sheets (glossy cyan crystal coating + diagonal specular glint)
        const ic = ice[idx];
        if (ic > 0.08) {
          const glint = ((x + y) & 7) === 0 && n > 140;
          const ia = Math.min(0.84, 0.32 + ic * 0.54);
          const ir = glint ? 245 : 140;
          const ig = glint ? 252 : 226;
          const ib = 255;
          r = r * (1 - ia) + ir * ia;
          g = g * (1 - ia) + ig * ia;
          b = b * (1 - ia) + ib * ia;
        }

        // 7. Electrified Water Charge Veins
        const ch = charge[idx];
        if (ch > 0.08) {
          const crackle = (((x * 13 + y * 29 + fireTick * 17) & 7) === 0);
          const ca = Math.min(0.9, ch * (crackle ? 0.9 : 0.4));
          r = r * (1 - ca) + (crackle ? 255 : 130) * ca;
          g = g * (1 - ca) + (crackle ? 248 : 238) * ca;
          b = b * (1 - ca) + (crackle ? 140 : 255) * ca;
        }

        // 8. Active Burning Pixel Flames (flickering multi-stop fire palette!)
        const fi = fire[idx];
        if (fi > 0.05) {
          const flicker = (((x * 11 + y * 23 + fireTick * 7) & 31) / 31) * 0.32;
          const level = fi + flicker;
          if (level > 1.05) {
            // Blinding white-yellow core
            r = 255; g = 248; b = 186;
          } else if (level > 0.65) {
            // Luminous gold-orange flame
            r = 255; g = 178; b = 38;
          } else if (level > 0.32) {
            // Fiery orange-red tongue
            r = 242; g = 84; b = 22;
          } else {
            // Glowing dark-red ember bed
            const ea = Math.min(0.85, level * 2.4);
            r = r * (1 - ea) + 195 * ea;
            g = g * (1 - ea) + 38 * ea;
            b = b * (1 - ea) + 18 * ea;
          }
        }

        // 9. Additive Dynamic Lighting Glow from Flames / Lightning / Ice
        const gr = glowR[idx];
        const gg = glowG[idx];
        const gb = glowB[idx];
        if (gr > 0.01 || gg > 0.01 || gb > 0.01) {
          r += gr * 72;
          g += gg * 62;
          b += gb * 72;
        }

        this.pixels32[idx] = this.packRGBA(r, g, b);
      }
    }
  }

  private renderRipples(grid: ArenaGrid): void {
    for (const rp of grid.ripples) {
      let r = 230, g = 246, b = 255;
      if (rp.color === 'fire') { r = 255; g = 180; b = 75; }
      else if (rp.color === 'electric') { r = 255; g = 248; b = 110; }
      else if (rp.color === 'rock') { r = 215; g = 192; b = 158; }
      else if (rp.color === 'ice') { r = 170; g = 242; b = 255; }
      else if (rp.color === 'psychic') { r = 244; g = 114; b = 224; }

      const steps = Math.max(24, Math.round(rp.radius * 4.5));
      for (let i = 0; i < steps; i++) {
        const ang = (i / steps) * Math.PI * 2;
        const px = rp.x + Math.cos(ang) * rp.radius;
        const py = rp.y + Math.sin(ang) * rp.radius * 0.72; // 2.5D ellipse perspective!
        this.setPixel(px, py, r, g, b, rp.alpha * 0.8);
      }
    }
  }

  private renderBeam(beam: BeamVisual, t: number): void {
    const dx = beam.x2 - beam.x1;
    const dy = beam.y2 - beam.y1;
    const len = Math.max(1, Math.hypot(dx, dy));
    const steps = Math.ceil(len * 1.4);
    const nx = -dy / len;
    const ny = dx / len;

    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const cx = beam.x1 + dx * f;
      const cy = beam.y1 + dy * f;

      if (beam.kind === 'flamethrower') {
        // Widening turbulent fiery cone!
        const halfW = Math.max(1.5, beam.width * (0.24 + f * 0.76) * 0.5);
        const wobble = Math.sin(f * 16 - t * 28) * (1.2 + halfW * 0.14);
        const span = Math.ceil(halfW);
        for (let k = -span; k <= span; k++) {
          const distFrac = Math.abs(k) / Math.max(1, halfW);
          if (distFrac > 1) continue;
          const px = cx + nx * (k + wobble);
          const py = cy + ny * (k + wobble);
          if (distFrac < 0.34) {
            this.setPixel(px, py, 255, 250, 195, 0.96);
          } else if (distFrac < 0.70) {
            this.setPixel(px, py, 255, 162, 32, 0.90);
          } else {
            this.setPixel(px, py, 224, 58, 18, 0.75);
          }
        }
      } else if (beam.kind === 'water_jet') {
        const halfW = Math.max(1.5, beam.width * (0.45 + f * 0.55) * 0.5);
        const wobble = Math.sin(f * 18 - t * 24) * 1.4;
        const span = Math.ceil(halfW);
        for (let k = -span; k <= span; k++) {
          const distFrac = Math.abs(k) / Math.max(1, halfW);
          if (distFrac > 1) continue;
          const px = cx + nx * (k + wobble);
          const py = cy + ny * (k + wobble);
          if (distFrac < 0.35 || ((i + k) & 3) === 0) {
            this.setPixel(px, py, 238, 248, 255, 0.92);
          } else {
            this.setPixel(px, py, 64, 152, 228, 0.85);
          }
        }
      } else if (beam.kind === 'ice_beam') {
        const halfW = Math.max(1.5, beam.width * 0.45);
        const spiral = Math.sin(f * 22 - t * 20) * halfW * 0.8;
        const span = Math.ceil(halfW);
        for (let k = -span; k <= span; k++) {
          const distFrac = Math.abs(k) / Math.max(1, halfW);
          if (distFrac > 1) continue;
          this.setPixel(cx + nx * k, cy + ny * k, distFrac < 0.4 ? 236 : 102, distFrac < 0.4 ? 252 : 216, 255, 0.86);
        }
        this.setPixel(cx + nx * spiral, cy + ny * spiral, 255, 255, 255, 1);
      } else if (beam.kind === 'solar_beam') {
        const halfW = Math.max(3, beam.width * 0.5);
        const span = Math.ceil(halfW);
        for (let k = -span; k <= span; k++) {
          const distFrac = Math.abs(k) / Math.max(1, halfW);
          if (distFrac > 1) continue;
          if (distFrac < 0.45) {
            this.setPixel(cx + nx * k, cy + ny * k, 255, 255, 224, 0.98);
          } else {
            this.setPixel(cx + nx * k, cy + ny * k, 134, 245, 92, 0.82);
          }
        }
      } else if (beam.kind === 'vine_whip') {
        const wave = Math.sin(f * Math.PI * 3 - t * 18) * 5;
        const halfW = Math.max(1, Math.round(beam.width * 0.35));
        for (let k = -halfW; k <= halfW; k++) {
          this.setPixel(cx + nx * (wave + k), cy + ny * (wave + k), 34, k === 0 ? 197 : 132, 68, 0.96);
        }
      } else if (beam.kind === 'psychic') {
        const wave = Math.sin(f * 14 - t * 18) * (beam.width * 0.35);
        this.setPixel(cx + nx * wave, cy + ny * wave, 244, 114, 224, 0.9);
        this.setPixel(cx - nx * wave, cy - ny * wave, 192, 132, 252, 0.9);
      }
    }
  }

  private renderLightning(grid: ArenaGrid): void {
    for (const seg of grid.lightningArcs) {
      const a = Math.max(0.2, seg.life / seg.maxLife);
      // Outer cyan/gold glow
      this.drawLinePixel(
        seg.x1,
        seg.y1,
        seg.x2,
        seg.y2,
        seg.isWaterBranch ? 92 : 254,
        seg.isWaterBranch ? 236 : 232,
        seg.isWaterBranch ? 255 : 72,
        seg.thickness + 2,
        a * 0.65
      );
      // Blinding white inner core
      this.drawLinePixel(seg.x1, seg.y1, seg.x2, seg.y2, 255, 255, 255, Math.max(1, seg.thickness), a);
    }
  }

  private renderFighterSprite(
    entry: SpriteEntry | null,
    vis: FighterVisualState,
    speciesScale: number,
    faceRight: boolean,
    t: number
  ): void {
    if (!entry || vis.alpha <= 0.02) return;

    const ctx = this.offCtx;
    const bob = Math.sin(t * 4.2 + (faceRight ? 0 : 1.7)) * 0.9;
    const shockJitter = vis.shocked > 0.1 ? (Math.random() - 0.5) * 3 : 0;

    // Target sprite pixel height in our 192x108 arena (~24px small basic, ~38px large final evo like Blastoise/Charizard!)
    const targetH = Math.round(30 * speciesScale * vis.scaleMult);
    const aspect = entry.canvas.width / Math.max(1, entry.canvas.height);
    const targetW = Math.max(10, Math.round(targetH * aspect));

    const drawX = Math.round(vis.x + shockJitter);
    const drawY = Math.round(vis.y - vis.z + bob);

    // 1. Grounded elliptical pixel shadow
    ctx.save();
    ctx.globalAlpha = 0.34 * vis.alpha;
    ctx.fillStyle = '#0f172a';
    const shW = Math.max(8, Math.round(targetW * 0.42));
    const shH = Math.max(3, Math.round(targetW * 0.15));
    ctx.beginPath();
    ctx.ellipse(Math.round(vis.x), Math.round(vis.y + targetH * 0.32), shW, shH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Draw crisp nearest-neighbor sprite (PokeAPI sprites face left by default, so flip player to face right!)
    ctx.save();
    ctx.globalAlpha = vis.alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.translate(drawX, drawY);
    if (faceRight) {
      ctx.scale(-1, 1);
    }

    const spriteCanvas = vis.hitFlash > 0.35 ? entry.whiteCanvas : entry.canvas;
    ctx.drawImage(
      spriteCanvas,
      -Math.round(targetW / 2),
      -Math.round(targetH * 0.65),
      targetW,
      targetH
    );

    // Elemental sheen overlays on sprite
    if (vis.frosted > 0.2 && vis.hitFlash <= 0.35) {
      ctx.globalAlpha = Math.min(0.45, vis.frosted * 0.45);
      ctx.drawImage(
        entry.iceCanvas,
        -Math.round(targetW / 2),
        -Math.round(targetH * 0.65),
        targetW,
        targetH
      );
    } else if (vis.singed > 0.25 && vis.hitFlash <= 0.35) {
      ctx.globalAlpha = Math.min(0.35, vis.singed * 0.35);
      ctx.drawImage(
        entry.fireCanvas,
        -Math.round(targetW / 2),
        -Math.round(targetH * 0.65),
        targetW,
        targetH
      );
    }

    ctx.restore();
  }

  private renderProjectiles(projectiles: ProjectileVisual[]): void {
    const ctx = this.offCtx;
    for (const pr of projectiles) {
      const px = Math.round(pr.x);
      const py = Math.round(pr.y - pr.z);

      // Ground shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(px - 3, Math.round(pr.y) + 2, 6, 2);

      if (pr.kind === 'boulder') {
        const r = Math.round(pr.radius);
        ctx.fillStyle = '#44403c';
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
        ctx.fillStyle = '#8c7a64';
        ctx.fillRect(px - r + 1, py - r + 1, r * 2 - 2, r * 2 - 2);
        ctx.fillStyle = '#c4b49a';
        ctx.fillRect(px - r + 1, py - r + 1, Math.max(2, r - 1), Math.max(2, r - 1));
      } else if (pr.kind === 'pokeball') {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(pr.rotation);

        const topColor =
          pr.ballStyle === 'great_ball'
            ? '#2563eb'
            : pr.ballStyle === 'ultra_ball'
            ? '#1f2937'
            : '#ef4444';

        // Crisp 8x8 pixel Poké Ball
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-4, -4, 8, 8);
        ctx.fillStyle = topColor;
        ctx.fillRect(-3, -3, 6, 3);
        if (pr.ballStyle === 'great_ball') {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-3, -3, 2, 1);
          ctx.fillRect(1, -3, 2, 1);
        } else if (pr.ballStyle === 'ultra_ball') {
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-2, -3, 4, 1);
        }
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-3, 1, 6, 2);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-3, 0, 6, 1);
        ctx.fillStyle = pr.capturedGlow ? '#fca5a5' : '#ffffff';
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
      }
    }
  }

  private renderParticles(choreo: MoveChoreographer): void {
    const ctx = this.offCtx;
    const pool = choreo.particles.pool;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.active) continue;
      const lifeRatio = Math.max(0, p.life / p.maxLife);
      const px = Math.round(p.x);
      const py = Math.round(p.y - p.z * 0.65);
      if (px < -2 || px >= ARENA_W + 2 || py < -2 || py >= ARENA_H + 2) continue;

      const alpha = p.kind === 'smoke' ? lifeRatio * 0.65 : Math.min(1, lifeRatio * 1.4);
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(2)})`;
      ctx.fillRect(px, py, p.size, p.size);
    }
  }

  private renderSteamOverlay(grid: ArenaGrid, t: number): void {
    const ctx = this.offCtx;
    const steam = grid.steam;
    const w = ARENA_W;
    const drift = Math.floor(t * 8);

    // Sample on 2x2 pixel blocks for crisp pixel-cloud look & high speed
    for (let y = 2; y < ARENA_H - 2; y += 2) {
      const row = y * w;
      for (let x = PLAY_MIN_X; x <= PLAY_MAX_X; x += 2) {
        const s = steam[row + x];
        if (s < 0.14) continue;
        // Checkerboard Bayer dither
        if (((x + y + drift) & 2) === 0 && s < 0.42) continue;
        const a = Math.min(0.68, s * 0.62);
        ctx.fillStyle = `rgba(232, 240, 248, ${a.toFixed(2)})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
}
