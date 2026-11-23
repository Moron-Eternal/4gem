import { MoveReachStatus } from '../../types/game';
import { getBattleTrainerSprite } from '../overworld/characterSprites';
import { SpriteEntry, spriteManager } from '../sprites/spriteManager';
import {
  ARENA_H,
  ARENA_W,
  ArenaGrid,
  BaseMaterial,
  PLAY_MAX_X,
  PLAY_MIN_X,
  RENDER_H,
  RENDER_SCALE,
  RENDER_W,
} from './arenaGrid';
import { BeamVisual, FighterVisualState, MoveChoreographer, ProjectileVisual } from './moveChoreographer';

export interface TacticalOverlayState {
  /** Active actor center in 192x108 arena coordinates */
  actorX: number;
  actorY: number;
  /** Cyan speed movement circle when choosing a tactical step */
  moveRadius?: number;
  hoverDestX?: number;
  hoverDestY?: number;
  /** Dashed Move Reach ring when previewing a move */
  rangeRadius?: number;
  rangeStatus?: MoveReachStatus;
}

export interface RenderSprites {
  player: SpriteEntry | null;
  enemy: SpriteEntry | null;
  playerScale: number;
  enemyScale: number;
  tacticalOverlay?: TacticalOverlayState;
}

/**
 * High-craft 384x216 Pixel-Art Battle Arena Renderer!
 *
 * Key visual breakthrough:
 * - The 192x108 fluid/fire/ice/crater field upscales cleanly 2x onto the 384x216 composite stage
 * - Official PokeAPI FireRed/LeafGreen & Gen 4 Pokémon sprites render DIRECTLY onto 384x216 at
 *   EXACT 1:1 NATIVE PIXEL RESOLUTION — zero downsampling, zero squashing, authentic GBA sharpness!
 * - Depth-sorted foreground VFX (splashing water spray, roaring flames, lightning forks,
 *   destructible Stone Pillars, Vine Root snares, Poké Balls, steam clouds) layer OVER sprites!
 */
export class ArenaRenderer {
  private gridCanvas: HTMLCanvasElement;
  private gridCtx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private pixels32: Uint32Array;
  private pixels8: Uint8ClampedArray;

  private stageCanvas: HTMLCanvasElement;
  private stageCtx: CanvasRenderingContext2D;

  constructor() {
    this.gridCanvas = document.createElement('canvas');
    this.gridCanvas.width = ARENA_W;
    this.gridCanvas.height = ARENA_H;
    const gCtx = this.gridCanvas.getContext('2d', { alpha: false });
    if (!gCtx) throw new Error('Could not initialize grid 2D context');
    this.gridCtx = gCtx;
    this.gridCtx.imageSmoothingEnabled = false;
    this.imageData = this.gridCtx.createImageData(ARENA_W, ARENA_H);
    this.pixels8 = this.imageData.data;
    this.pixels32 = new Uint32Array(this.imageData.data.buffer);

    this.stageCanvas = document.createElement('canvas');
    this.stageCanvas.width = RENDER_W;
    this.stageCanvas.height = RENDER_H;
    const sCtx = this.stageCanvas.getContext('2d', { alpha: false });
    if (!sCtx) throw new Error('Could not initialize stage 2D context');
    this.stageCtx = sCtx;
    this.stageCtx.imageSmoothingEnabled = false;
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

  public render(
    targetCanvas: HTMLCanvasElement,
    choreo: MoveChoreographer,
    sprites: RenderSprites
  ): void {
    const grid = choreo.grid;
    const t = grid.simTime;

    // === PASS 1: Render 192x108 terrain, craters, flora, water waves/foam, ice, fire, glow ===
    this.renderGridToBuffer(grid, t);
    this.renderRipples(grid);
    for (const beam of choreo.activeBeams) {
      this.renderBeam(beam, t);
    }
    this.gridCtx.putImageData(this.imageData, 0, 0);

    // Upscale pixel-sharp 2x onto the 384x216 composite stage!
    const ctx = this.stageCtx;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.gridCanvas, 0, 0, ARENA_W, ARENA_H, 0, 0, RENDER_W, RENDER_H);

    // === PASS 2: Tactical Range & Speed Movement Rings on the Arena Floor ===
    if (sprites.tacticalOverlay) {
      this.renderTacticalOverlay(ctx, sprites.tacticalOverlay, t);
    }

    // === PASS 3: Depth-Sorted Entities (Stone Pillars, Trainer Intro Sprites, 1:1 Native PokéAPI Sprites!) ===
    type DrawItem = { sortY: number; draw: () => void };
    const drawList: DrawItem[] = [];

    for (const pil of grid.pillars) {
      drawList.push({
        sortY: pil.y,
        draw: () => this.renderStonePillar(ctx, pil.x * RENDER_SCALE, pil.y * RENDER_SCALE, pil.radius * RENDER_SCALE, pil.height * RENDER_SCALE, pil.hp / pil.maxHp),
      });
    }

    if (choreo.playerTrainerVisual.visible && choreo.playerTrainerVisual.alpha > 0.02) {
      drawList.push({
        sortY: choreo.playerTrainerVisual.y,
        draw: () => this.renderTrainerIntroSprite(ctx, choreo.playerTrainerVisual, true),
      });
    }
    if (choreo.enemyTrainerVisual.visible && choreo.enemyTrainerVisual.alpha > 0.02) {
      drawList.push({
        sortY: choreo.enemyTrainerVisual.y,
        draw: () => this.renderTrainerIntroSprite(ctx, choreo.enemyTrainerVisual, false),
      });
    }

    drawList.push({
      sortY: choreo.playerVisual.y,
      draw: () => this.renderFighterSprite(ctx, sprites.player, choreo.playerVisual, t),
    });
    drawList.push({
      sortY: choreo.enemyVisual.y,
      draw: () => this.renderFighterSprite(ctx, sprites.enemy, choreo.enemyVisual, t),
    });

    drawList.sort((a, b) => a.sortY - b.sortY);
    for (const item of drawList) item.draw();

    // === PASS 4: Foreground Crisp VFX (Lightning Forks, Projectiles, Poké Balls, Particles, & Steam!) ===
    this.renderLightningStage(ctx, grid);
    this.renderProjectiles(ctx, choreo.activeProjectiles);
    this.renderParticles(ctx, choreo);
    this.renderSteamOverlay(ctx, grid, t);

    // Subtle impact screen flash
    if (choreo.screenFlash > 0.02) {
      const a = Math.min(0.4, choreo.screenFlash);
      ctx.fillStyle =
        choreo.screenFlashColor === 'yellow'
          ? `rgba(254, 249, 175, ${a})`
          : choreo.screenFlashColor === 'orange'
          ? `rgba(255, 165, 65, ${a})`
          : choreo.screenFlashColor === 'cyan'
          ? `rgba(186, 238, 255, ${a})`
          : `rgba(255, 255, 255, ${a})`;
      ctx.fillRect(0, 0, RENDER_W, RENDER_H);
    }

    // === FINAL BLIT to Display Canvas with pixel-sharp scaling & camera shake ===
    const tCtx = targetCanvas.getContext('2d');
    if (!tCtx) return;
    tCtx.imageSmoothingEnabled = false;
    tCtx.fillStyle = '#0b1018';
    tCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

    const scaleX = targetCanvas.width / RENDER_W;
    const scaleY = targetCanvas.height / RENDER_H;
    const dx = Math.round(choreo.shakeX * RENDER_SCALE * scaleX);
    const dy = Math.round(choreo.shakeY * RENDER_SCALE * scaleY);
    tCtx.drawImage(
      this.stageCanvas,
      0,
      0,
      RENDER_W,
      RENDER_H,
      dx,
      dy,
      targetCanvas.width,
      targetCanvas.height
    );
  }

  private renderTacticalOverlay(
    ctx: CanvasRenderingContext2D,
    ov: TacticalOverlayState,
    t: number
  ): void {
    const cx = Math.round(ov.actorX * RENDER_SCALE);
    const cy = Math.round(ov.actorY * RENDER_SCALE);

    ctx.save();

    // 1. Speed Movement Budget Ring (cyan)
    if (ov.moveRadius && ov.moveRadius > 0) {
      const r = ov.moveRadius * RENDER_SCALE;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.92)';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -t * 16;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (ov.hoverDestX !== undefined && ov.hoverDestY !== undefined) {
        const hx = Math.round(ov.hoverDestX * RENDER_SCALE);
        const hy = Math.round(ov.hoverDestY * RENDER_SCALE);
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(hx, hy);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
        ctx.fillRect(hx - 4, hy - 4, 8, 8);
        ctx.strokeStyle = '#0f172a';
        ctx.strokeRect(hx - 4, hy - 4, 8, 8);
      }
    }

    // 2. Move Reach Ring (green = in range, amber = dash & strike, crimson = out of range)
    if (ov.rangeRadius && ov.rangeRadius > 0 && ov.rangeRadius < 195) {
      const r = ov.rangeRadius * RENDER_SCALE;
      const stroke =
        ov.rangeStatus === 'in_range'
          ? 'rgba(34, 197, 94, 0.92)'
          : ov.rangeStatus === 'dash_strike'
          ? 'rgba(250, 204, 21, 0.92)'
          : 'rgba(239, 68, 68, 0.9)';
      const fill =
        ov.rangeStatus === 'in_range'
          ? 'rgba(34, 197, 94, 0.09)'
          : ov.rangeStatus === 'dash_strike'
          ? 'rgba(250, 204, 21, 0.08)'
          : 'rgba(239, 68, 68, 0.08)';

      ctx.strokeStyle = stroke;
      ctx.fillStyle = fill;
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 4]);
      ctx.lineDashOffset = -t * 14;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderStonePillar(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    radius: number,
    height: number,
    hpRatio: number
  ): void {
    const x = Math.round(px);
    const y = Math.round(py);
    const w = Math.max(18, Math.round(radius * 1.9));
    const h = Math.max(22, Math.round(height * 1.1));
    const hw = Math.round(w / 2);

    // Ground shadow + crater dust halo
    ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, w * 0.72, w * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helper for crisp 2px-aligned pixel blocks (matches 2x physics pixel scale)
    const rect = (rx: number, ry: number, rw: number, rh: number, col: string) => {
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(rx), Math.round(ry), Math.round(rw), Math.round(rh));
    };

    // Dark outline silhouette — stepped jagged boulder spire tapering upward!
    rect(x - hw - 4, y - Math.round(h * 0.48), w + 8, Math.round(h * 0.48) + 4, '#241e19');
    rect(x - hw - 2, y - Math.round(h * 0.82), w + 4, Math.round(h * 0.82) + 4, '#241e19');
    rect(x - Math.round(hw * 0.75), y - h - 2, Math.round(w * 0.78), h + 4, '#241e19');
    rect(x - Math.round(hw * 0.35), y - h - 6, Math.round(w * 0.42), 8, '#241e19');

    // Mid sandstone-granite core body
    rect(x - hw - 2, y - Math.round(h * 0.44), w + 4, Math.round(h * 0.44) + 2, '#7d6c57');
    rect(x - hw, y - Math.round(h * 0.78), w, Math.round(h * 0.78) + 2, '#7d6c57');
    rect(x - Math.round(hw * 0.65), y - h, Math.round(w * 0.68), h, '#7d6c57');
    rect(x - Math.round(hw * 0.25), y - h - 4, Math.round(w * 0.3), 6, '#8f7d66');

    // Sunlit left granite facet
    rect(x - hw, y - Math.round(h * 0.42), Math.round(w * 0.46), Math.round(h * 0.42), '#ad9b82');
    rect(x - hw + 2, y - Math.round(h * 0.74), Math.round(w * 0.44), Math.round(h * 0.72), '#ad9b82');
    rect(x - Math.round(hw * 0.55), y - h + 2, Math.round(w * 0.34), Math.round(h * 0.35), '#c9b89f');
    // Sharp sunlit top ridge speculars
    rect(x - Math.round(hw * 0.2), y - h - 3, Math.round(w * 0.18), 4, '#e3d5be');
    rect(x - hw + 2, y - Math.round(h * 0.74), Math.round(w * 0.25), 3, '#dfd0b8');
    rect(x - hw, y - Math.round(h * 0.42), Math.round(w * 0.2), 2, '#dfd0b8');

    // Deep shaded right facet & chiseled rock planes
    rect(x + Math.round(w * 0.06), y - Math.round(h * 0.72), Math.round(w * 0.42), Math.round(h * 0.72) + 2, '#574a3c');
    rect(x + Math.round(w * 0.16), y - Math.round(h * 0.42), Math.round(w * 0.34), Math.round(h * 0.42) + 2, '#453a2e');
    // Chiseled diagonal fracture shadow across middle
    rect(x - Math.round(w * 0.22), y - Math.round(h * 0.52), Math.round(w * 0.48), 2, '#4a3f33');
    rect(x - Math.round(w * 0.3), y - Math.round(h * 0.26), Math.round(w * 0.38), 2, '#5c4e3f');

    // Scattered jagged rubble boulders around base
    rect(x - hw - 6, y - 2, 6, 6, '#241e19');
    rect(x - hw - 5, y - 1, 4, 4, '#9c8b73');
    rect(x + hw + 1, y - 1, 6, 5, '#241e19');
    rect(x + hw + 2, y, 4, 3, '#6e5e4b');

    // Deep glowing/dark stress cracks once damaged
    if (hpRatio < 0.75) {
      rect(x - 2, y - Math.round(h * 0.78), 2, Math.round(h * 0.46), '#1c1714');
      rect(x, y - Math.round(h * 0.55), 5, 2, '#1c1714');
      rect(x - 5, y - Math.round(h * 0.38), 4, 2, '#1c1714');
      if (hpRatio < 0.45) {
        rect(x + 3, y - Math.round(h * 0.65), 2, Math.round(h * 0.42), '#1c1714');
      }
    }
  }

  private renderTrainerIntroSprite(
    ctx: CanvasRenderingContext2D,
    tv: { x: number; y: number; alpha: number; style: string },
    faceRight: boolean
  ): void {
    const sp = getBattleTrainerSprite(tv.style, faceRight);
    const x = Math.round(tv.x * RENDER_SCALE - sp.width / 2);
    const y = Math.round(tv.y * RENDER_SCALE - sp.height * 0.72);
    ctx.save();
    ctx.globalAlpha = tv.alpha;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
    ctx.beginPath();
    ctx.ellipse(Math.round(tv.x * RENDER_SCALE), Math.round(tv.y * RENDER_SCALE + 10), 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(sp, x, y);
    ctx.restore();
  }

  /**
   * Draws official PokeAPI Pokémon sprites at EXACT 1:1 NATIVE PIXEL RESOLUTION on our 384x216 stage!
   * Zero downsampling, razor-sharp outlines, authentic GBA size proportions, and elemental overlays.
   */
  private renderFighterSprite(
    ctx: CanvasRenderingContext2D,
    entry: SpriteEntry | null,
    vis: FighterVisualState,
    t: number
  ): void {
    if (!entry || vis.alpha <= 0.02) return;

    const bob = Math.sin(t * 4.2 + (vis.facingRight ? 0 : 1.7)) * 1.4;
    const shockJitter = vis.shocked > 0.1 ? (Math.random() - 0.5) * 5 : 0;

    // Official FireRed/Platinum sprites drawn at EXACT 1:1 native pixel fidelity!
    // Fallback 24x24 sprites scale up cleanly 2x to match native FireRed proportions.
    const baseW = entry.source === 'pokeapi' ? entry.canvas.width : entry.nativeWidth;
    const baseH = entry.source === 'pokeapi' ? entry.canvas.height : entry.nativeHeight;
    const drawW = Math.max(12, Math.round(baseW * vis.scaleMult));
    const drawH = Math.max(12, Math.round(baseH * vis.scaleMult));

    const sx = Math.round(vis.x * RENDER_SCALE + shockJitter);
    const sy = Math.round((vis.y - vis.z) * RENDER_SCALE + bob);
    const footY = Math.round(vis.y * RENDER_SCALE + 14);

    // 1. Grounded elliptical pixel shadow
    ctx.save();
    ctx.globalAlpha = 0.34 * vis.alpha;
    ctx.fillStyle = '#0f172a';
    const shW = Math.max(14, Math.round(drawW * 0.42));
    const shH = Math.max(5, Math.round(drawW * 0.14));
    ctx.beginPath();
    ctx.ellipse(Math.round(vis.x * RENDER_SCALE), footY, shW, shH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Draw crisp 1:1 official Pokémon sprite (PokeAPI front sprites face left, so flip when facingRight!)
    ctx.save();
    ctx.globalAlpha = vis.alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.translate(sx, sy);
    if (vis.facingRight) {
      ctx.scale(-1, 1);
    }

    const spriteCanvas = vis.hitFlash > 0.35 ? entry.whiteCanvas : entry.canvas;
    const ox = -Math.round(drawW / 2);
    const oy = -Math.round(drawH * 0.68);
    ctx.drawImage(spriteCanvas, ox, oy, drawW, drawH);

    // Elemental sheen overlays on sprite
    if (vis.hitFlash <= 0.35) {
      if (vis.frosted > 0.2) {
        ctx.globalAlpha = Math.min(0.45, vis.frosted * 0.45);
        ctx.drawImage(entry.iceCanvas, ox, oy, drawW, drawH);
      } else if (vis.singed > 0.25) {
        ctx.globalAlpha = Math.min(0.35, vis.singed * 0.35);
        ctx.drawImage(entry.fireCanvas, ox, oy, drawW, drawH);
      } else if (vis.wetness > 0.35) {
        ctx.globalAlpha = Math.min(0.24, vis.wetness * 0.24);
        ctx.drawImage(entry.wetCanvas, ox, oy, drawW, drawH);
      }
    }
    ctx.restore();

    // 3. Tangled Emerald Vine Root Snare around feet when rooted by Vine Whip!
    if (vis.rootedTurns > 0 && vis.alpha > 0.5) {
      ctx.save();
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(Math.round(vis.x * RENDER_SCALE), footY - 2, shW + 3, shH + 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(Math.round(vis.x * RENDER_SCALE), footY - 3, shW + 2, shH + 1, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
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

        switch (mat) {
          case BaseMaterial.GymWall: {
            const rib = (x < PLAY_MIN_X ? x : ARENA_W - 1 - x) % 6;
            if (rib === 0) { r = 58; g = 74; b = 92; }
            else if (rib === 1) { r = 104; g = 124; b = 144; }
            else if (rib === 2 || rib === 3) { r = 164; g = 182; b = 198; }
            else if (rib === 4) { r = 212; g = 224; b = 234; }
            else { r = 84; g = 102; b = 120; }
            if ((y & 15) === 0) { r -= 14; g -= 14; b -= 12; }
            break;
          }
          case BaseMaterial.GymFloor: {
            r = 160; g = 186; b = 192;
            if (x === PLAY_MIN_X || x === PLAY_MAX_X) { r = 72; g = 88; b = 104; }
            else if (x === PLAY_MIN_X + 1 || x === PLAY_MAX_X - 1) { r = 208; g = 222; b = 228; }
            else if (((x + y) & 31) === 0 && n > 160) { r -= 5; g -= 4; b -= 3; }
            break;
          }
          case BaseMaterial.GymEmblemGold: r = 214; g = 188; b = 114; break;
          case BaseMaterial.GymEmblemWhite: r = 232; g = 240; b = 244; break;
          case BaseMaterial.GymEmblemDark: r = 110; g = 136; b = 144; break;
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
            const ridge = (x * 5 + y * 2) & 7;
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
            const tile = x % 12 === 0 || y % 12 === 0;
            r = tile ? 156 : 196;
            g = tile ? 182 : 216;
            b = tile ? 202 : 228;
            break;
          }
          case BaseMaterial.PoolWater:
            r = 66; g = 138; b = 192;
            break;
        }

        const cr = crater[idx];
        if (cr > 0.06) {
          const leftCr = x > 0 ? crater[idx - 1] : 0;
          const topCr = y > 0 ? crater[idx - w] : 0;
          if (cr > leftCr + 0.14 || cr > topCr + 0.14) {
            r += 22; g += 18; b += 14;
          } else {
            const dark = 1 - cr * 0.65;
            r *= dark; g *= dark; b *= dark;
          }
        }

        const sc = scorch[idx];
        if (sc > 0.04) {
          const ash = Math.min(0.84, sc * 0.85);
          r = r * (1 - ash) + 34 * ash;
          g = g * (1 - ash) + 28 * ash;
          b = b * (1 - ash) + 28 * ash;
        }

        const fl = flora[idx];
        if (fl > 0.12) {
          const sway = ((x + Math.round(waveAnim)) & 3) === 0;
          const fAlpha = Math.min(0.92, fl * 0.95);
          r = r * (1 - fAlpha) + (sway ? 62 : 42) * fAlpha;
          g = g * (1 - fAlpha) + (sway ? 174 : 138) * fAlpha;
          b = b * (1 - fAlpha) + (sway ? 66 : 54) * fAlpha;
        }

        const wt = water[idx];
        if (wt > 0.05) {
          const wL = x > 0 ? water[idx - 1] : wt;
          const wR = x < w - 1 ? water[idx + 1] : wt;
          const wU = y > 0 ? water[idx - w] : wt;
          const gradX = wR - wL;
          const gradY = wt - wU;

          const depthT = Math.min(1, wt / 1.35);
          const alpha = Math.min(0.78, 0.22 + depthT * 0.54);

          let wr = 82 - depthT * 36;
          let wg = 128 - depthT * 46;
          let wb = 176 - depthT * 36;

          const caustic = Math.sin(x * 0.25 + y * 0.18 + t * 5.2);
          if (caustic > 0.78 && wt < 0.48) { wr += 28; wg += 32; wb += 26; }

          const shade = gradX * -58 + gradY * -18;
          wr += shade; wg += shade * 0.9; wb += shade * 0.8;

          r = r * (1 - alpha) + wr * alpha;
          g = g * (1 - alpha) + wg * alpha;
          b = b * (1 - alpha) + wb * alpha;

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

        const ic = ice[idx];
        if (ic > 0.08) {
          const glint = ((x + y) & 7) === 0 && n > 140;
          const ia = Math.min(0.84, 0.32 + ic * 0.54);
          r = r * (1 - ia) + (glint ? 245 : 140) * ia;
          g = g * (1 - ia) + (glint ? 252 : 226) * ia;
          b = b * (1 - ia) + 255 * ia;
        }

        const ch = charge[idx];
        if (ch > 0.08) {
          const crackle = ((x * 13 + y * 29 + fireTick * 17) & 7) === 0;
          const ca = Math.min(0.9, ch * (crackle ? 0.9 : 0.4));
          r = r * (1 - ca) + (crackle ? 255 : 130) * ca;
          g = g * (1 - ca) + (crackle ? 248 : 238) * ca;
          b = b * (1 - ca) + (crackle ? 140 : 255) * ca;
        }

        const fi = fire[idx];
        if (fi > 0.05) {
          const flicker = (((x * 11 + y * 23 + fireTick * 7) & 31) / 31) * 0.32;
          const level = fi + flicker;
          if (level > 1.05) { r = 255; g = 248; b = 186; }
          else if (level > 0.65) { r = 255; g = 178; b = 38; }
          else if (level > 0.32) { r = 242; g = 84; b = 22; }
          else {
            const ea = Math.min(0.85, level * 2.4);
            r = r * (1 - ea) + 195 * ea;
            g = g * (1 - ea) + 38 * ea;
            b = b * (1 - ea) + 18 * ea;
          }
        }

        const gr = glowR[idx];
        const gg = glowG[idx];
        const gb = glowB[idx];
        if (gr > 0.01 || gg > 0.01 || gb > 0.01) {
          r += gr * 72; g += gg * 62; b += gb * 72;
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
        this.setPixel(rp.x + Math.cos(ang) * rp.radius, rp.y + Math.sin(ang) * rp.radius * 0.72, r, g, b, rp.alpha * 0.8);
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
        const halfW = Math.max(1.5, beam.width * (0.24 + f * 0.76) * 0.5);
        const wobble = Math.sin(f * 16 - t * 28) * (1.2 + halfW * 0.14);
        const span = Math.ceil(halfW);
        for (let k = -span; k <= span; k++) {
          const distFrac = Math.abs(k) / Math.max(1, halfW);
          if (distFrac > 1) continue;
          const px = cx + nx * (k + wobble);
          const py = cy + ny * (k + wobble);
          if (distFrac < 0.34) this.setPixel(px, py, 255, 250, 195, 0.96);
          else if (distFrac < 0.70) this.setPixel(px, py, 255, 162, 32, 0.90);
          else this.setPixel(px, py, 224, 58, 18, 0.75);
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
          if (distFrac < 0.35 || ((i + k) & 3) === 0) this.setPixel(px, py, 238, 248, 255, 0.92);
          else this.setPixel(px, py, 64, 152, 228, 0.85);
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
          if (distFrac < 0.45) this.setPixel(cx + nx * k, cy + ny * k, 255, 255, 224, 0.98);
          else this.setPixel(cx + nx * k, cy + ny * k, 134, 245, 92, 0.82);
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

  private renderLightningStage(ctx: CanvasRenderingContext2D, grid: ArenaGrid): void {
    if (grid.lightningArcs.length === 0) return;
    ctx.save();
    ctx.lineCap = 'square';
    for (const seg of grid.lightningArcs) {
      const a = Math.max(0.25, seg.life / seg.maxLife);
      ctx.strokeStyle = seg.isWaterBranch
        ? `rgba(92, 236, 255, ${(a * 0.72).toFixed(2)})`
        : `rgba(254, 232, 72, ${(a * 0.78).toFixed(2)})`;
      ctx.lineWidth = (seg.thickness + 2) * RENDER_SCALE;
      ctx.beginPath();
      ctx.moveTo(seg.x1 * RENDER_SCALE, seg.y1 * RENDER_SCALE);
      ctx.lineTo(seg.x2 * RENDER_SCALE, seg.y2 * RENDER_SCALE);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${a.toFixed(2)})`;
      ctx.lineWidth = Math.max(1, seg.thickness) * RENDER_SCALE;
      ctx.beginPath();
      ctx.moveTo(seg.x1 * RENDER_SCALE, seg.y1 * RENDER_SCALE);
      ctx.lineTo(seg.x2 * RENDER_SCALE, seg.y2 * RENDER_SCALE);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D, projectiles: ProjectileVisual[]): void {
    for (const pr of projectiles) {
      const px = Math.round(pr.x * RENDER_SCALE);
      const py = Math.round((pr.y - pr.z) * RENDER_SCALE);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(px - 6, Math.round(pr.y * RENDER_SCALE) + 4, 12, 4);

      if (pr.kind === 'boulder') {
        const r = Math.round(pr.radius * RENDER_SCALE);
        ctx.fillStyle = '#3b332b';
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
        ctx.fillStyle = '#8c7a64';
        ctx.fillRect(px - r + 2, py - r + 2, r * 2 - 4, r * 2 - 4);
        ctx.fillStyle = '#c4b49a';
        ctx.fillRect(px - r + 2, py - r + 2, Math.max(4, r - 2), Math.max(4, r - 2));
      } else if (pr.kind === 'pokeball') {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(pr.rotation);

        // Use official PokeAPI Poké Ball item sprite if loaded, else crisp 14x14 pixel Poké Ball!
        const officialBall = pr.ballStyle ? spriteManager.getItemCanvas(pr.ballStyle) : null;
        if (officialBall) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(officialBall, -10, -10, 20, 20);
        } else {
          const topColor =
            pr.ballStyle === 'great_ball'
              ? '#2563eb'
              : pr.ballStyle === 'ultra_ball'
              ? '#1f2937'
              : '#ef4444';
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-7, -7, 14, 14);
          ctx.fillStyle = topColor;
          ctx.fillRect(-5, -5, 10, 5);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-5, 1, 10, 4);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-5, 0, 10, 2);
          ctx.fillStyle = pr.capturedGlow ? '#fca5a5' : '#ffffff';
          ctx.fillRect(-2, -1, 4, 4);
        }
        ctx.restore();
      }
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D, choreo: MoveChoreographer): void {
    const pool = choreo.particles.pool;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.active) continue;
      const lifeRatio = Math.max(0, p.life / p.maxLife);
      const px = Math.round(p.x * RENDER_SCALE);
      const py = Math.round((p.y - p.z * 0.65) * RENDER_SCALE);
      if (px < -4 || px >= RENDER_W + 4 || py < -4 || py >= RENDER_H + 4) continue;

      const alpha = p.kind === 'smoke' ? lifeRatio * 0.65 : Math.min(1, lifeRatio * 1.4);
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(2)})`;
      const sz = p.size * RENDER_SCALE;
      ctx.fillRect(px, py, sz, sz);
    }
  }

  private renderSteamOverlay(ctx: CanvasRenderingContext2D, grid: ArenaGrid, t: number): void {
    const steam = grid.steam;
    const w = ARENA_W;
    const drift = Math.floor(t * 8);

    for (let y = 2; y < ARENA_H - 2; y += 2) {
      const row = y * w;
      for (let x = PLAY_MIN_X; x <= PLAY_MAX_X; x += 2) {
        const s = steam[row + x];
        if (s < 0.14) continue;
        if (((x + y + drift) & 2) === 0 && s < 0.42) continue;
        const a = Math.min(0.68, s * 0.62);
        ctx.fillStyle = `rgba(232, 240, 248, ${a.toFixed(2)})`;
        ctx.fillRect(x * RENDER_SCALE, y * RENDER_SCALE, 2 * RENDER_SCALE, 2 * RENDER_SCALE);
      }
    }
  }
}
