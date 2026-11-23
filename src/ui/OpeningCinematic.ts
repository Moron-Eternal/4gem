import { MOVES } from '../data/moves';
import { createPokemon } from '../data/pokemonFactory';
import { SPECIES } from '../data/species';
import { soundEngine } from '../engine/audio/soundEngine';
import { computeMoveScale } from '../engine/battle/moveScaling';
import { ArenaGrid, RENDER_H, RENDER_W } from '../engine/physics/arenaGrid';
import { ArenaRenderer } from '../engine/physics/arenaRenderer';
import { MoveChoreographer } from '../engine/physics/moveChoreographer';
import { ParticleSystem } from '../engine/physics/particleSystem';
import { hasSavedGame } from '../engine/save/saveManager';
import { spriteManager } from '../engine/sprites/spriteManager';

export interface OpeningCallbacks {
  onNewGame: () => void;
  onContinue: () => void;
  onOpenPvp: () => void;
  onOpenLab: () => void;
}

interface EmberDot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
}

/**
 * Genuine Pokémon FireRed GBA Opening Screen Animation & Animated Title Screen:
 * Phase 1 (0.0-2.0s): Twinkling midnight starfield + shooting star presenter shimmer
 * Phase 2 (2.0-5.6s): Cinema-bar Charizard vs Blastoise live pixel-physics elemental showdown
 * Phase 3 (5.6s+): Crimson-gold flash -> Blazing FireRed Title Screen with animated embers & Menu
 * Skippable anytime via Space / Enter / Click, and replayable via "REPLAY INTRO".
 */
export class OpeningCinematic {
  private container: HTMLElement;
  private callbacks: OpeningCallbacks;
  private skipToTitle: boolean;

  private rafId: number | null = null;
  private lastTs = 0;
  private elapsed = 0;
  private phase: 'presenter' | 'showdown' | 'title' = 'presenter';

  private canvas: HTMLCanvasElement | null = null;
  private grid = new ArenaGrid('gym_floor');
  private particles = new ParticleSystem();
  private choreo = new MoveChoreographer(this.grid, this.particles);
  private renderer = new ArenaRenderer();

  private demoCharizard = createPokemon('charizard', 100);
  private demoBlastoise = createPokemon('blastoise', 100);
  private showdownFiredFire = false;
  private showdownFiredWater = false;
  private titleFlash = 0;
  private titleCycleTimer = 1.1;
  private titleToggle = false;
  private embers: EmberDot[] = [];
  private stars: Array<{ x: number; y: number; speed: number; phase: number }> = [];

  private keyHandler: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, callbacks: OpeningCallbacks, skipToTitle = false) {
    this.container = container;
    this.callbacks = callbacks;
    this.skipToTitle = skipToTitle;

    spriteManager.preload([
      'charizard', 'blastoise', 'venusaur', 'squirtle', 'wartortle',
      'charmander', 'charmeleon', 'bulbasaur', 'ivysaur', 'pikachu', 'raichu', 'munchlax',
    ]);
    spriteManager.preloadCommonItems();

    for (let i = 0; i < 42; i++) {
      this.stars.push({
        x: Math.random() * RENDER_W,
        y: Math.random() * RENDER_H,
        speed: 8 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.keyHandler = (e: KeyboardEvent) => {
      if (this.phase !== 'title' && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) {
        e.preventDefault();
        this.jumpToTitle();
      }
    };
  }

  public mount(): void {
    window.addEventListener('keydown', this.keyHandler);
    if (this.skipToTitle) {
      this.jumpToTitle();
    } else {
      this.startOpening();
    }
    this.lastTs = performance.now();
    this.loop(this.lastTs);
  }

  public unmount(): void {
    window.removeEventListener('keydown', this.keyHandler);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private startOpening(): void {
    this.elapsed = 0;
    this.phase = 'presenter';
    this.showdownFiredFire = false;
    this.showdownFiredWater = false;
    this.grid.reset('gym_floor');
    this.particles.clear();
    this.choreo.resetVisuals();
    soundEngine.playMusic('intro');

    this.container.innerHTML = `
      <div class="title-screen opening-mode" id="opening-click-skip">
        <canvas class="title-bg-canvas" id="opening-canvas" width="${RENDER_W * 2}" height="${RENDER_H * 2}"></canvas>
        <div class="opening-skip-hint">PRESS SPACE OR CLICK TO SKIP INTRO</div>
      </div>
    `;
    this.canvas = this.container.querySelector('#opening-canvas');
    this.container.querySelector('#opening-click-skip')?.addEventListener('click', () => {
      if (this.phase !== 'title') {
        soundEngine.playBlip();
        this.jumpToTitle();
      }
    });
  }

  private jumpToTitle(): void {
    this.phase = 'title';
    this.titleFlash = 1.0;
    this.titleCycleTimer = 0.8;
    this.grid.reset('gym_floor');
    this.particles.clear();
    this.choreo.resetVisuals();
    soundEngine.playMusic('title');

    const canContinue = hasSavedGame();
    this.container.innerHTML = `
      <div class="title-screen">
        <canvas class="title-bg-canvas" id="opening-canvas" width="${RENDER_W * 2}" height="${RENDER_H * 2}"></canvas>
        <div class="title-scrim"></div>
        <div class="title-audio-corner">
          <button class="pixel-btn sm dark" id="ttl-bgm">BGM: ${soundEngine.isMusicEnabled() ? 'ON' : 'OFF'}</button>
          <button class="pixel-btn sm dark" id="ttl-sfx">SFX: ${soundEngine.isSfxEnabled() ? 'ON' : 'OFF'}</button>
          <button class="pixel-btn sm dark" id="ttl-replay">REPLAY INTRO</button>
        </div>
        <div class="title-content">
          <div class="title-logo-wrap">
            <div class="title-kicker">KANTO ELEMENTAL PHYSICS EDITION</div>
            <h1 class="title-main">POKéMON<br/>FIRERED</h1>
            <div class="title-version">TACTICAL PIXEL BATTLE SIMULATOR</div>
          </div>

          <p class="title-tagline">
            Explore Kanto, catch wild POKéMON, battle Gym Leaders &amp; Friends in <strong>2P Local Co-Op</strong>,
            reposition tactically for move ranges, and watch moves <strong>grow physically larger with Level &amp; Evolution</strong>!
          </p>

          <div class="title-menu">
            ${canContinue ? `<button class="pixel-btn primary" id="btn-continue">CONTINUE JOURNEY</button>` : ''}
            <button class="pixel-btn ${canContinue ? '' : 'primary'}" id="btn-new-game">NEW ADVENTURE</button>
            <button class="pixel-btn pvp-btn" id="btn-pvp-mode">2P LOCAL CO-OP VS</button>
            <button class="pixel-btn gold" id="btn-battle-lab">BATTLE LAB &amp; 3x SHOWCASE</button>
          </div>

          <div class="title-footer">
            <span>WASD / ARROWS: Move</span>
            <span>SPACE / Z: Interact</span>
            <span>OFFICIAL POKEAPI GBA SPRITES</span>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#opening-canvas');

    this.container.querySelector('#btn-continue')?.addEventListener('click', () => {
      soundEngine.playConfirm();
      this.callbacks.onContinue();
    });
    this.container.querySelector('#btn-new-game')?.addEventListener('click', () => {
      soundEngine.playConfirm();
      this.callbacks.onNewGame();
    });
    this.container.querySelector('#btn-pvp-mode')?.addEventListener('click', () => {
      soundEngine.playConfirm();
      this.callbacks.onOpenPvp();
    });
    this.container.querySelector('#btn-battle-lab')?.addEventListener('click', () => {
      soundEngine.playConfirm();
      this.callbacks.onOpenLab();
    });
    this.container.querySelector('#ttl-replay')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.startOpening();
    });
    this.container.querySelector('#ttl-bgm')?.addEventListener('click', () => {
      const on = soundEngine.toggleMusic();
      const el = this.container.querySelector('#ttl-bgm');
      if (el) el.textContent = `BGM: ${on ? 'ON' : 'OFF'}`;
    });
    this.container.querySelector('#ttl-sfx')?.addEventListener('click', () => {
      const on = soundEngine.toggleSfx();
      const el = this.container.querySelector('#ttl-sfx');
      if (el) el.textContent = `SFX: ${on ? 'ON' : 'OFF'}`;
    });
  }

  private loop = (ts: number): void => {
    const dt = Math.max(0, Math.min(0.05, (ts - this.lastTs) / 1000));
    this.lastTs = ts;
    this.elapsed += dt;

    if (this.phase === 'presenter') {
      this.renderPresenterPhase();
      if (this.elapsed >= 2.2) {
        this.phase = 'showdown';
        this.grid.reset('gym_floor');
        this.choreo.resetVisuals();
      }
    } else if (this.phase === 'showdown') {
      const st = this.elapsed - 2.2;
      if (!this.showdownFiredWater && st >= 0.35) {
        this.showdownFiredWater = true;
        const m = MOVES.surf;
        const p = computeMoveScale(this.demoBlastoise, m);
        soundEngine.playMoveSfx(m, p);
        this.choreo.triggerMove('enemy', m, p);
      }
      if (!this.showdownFiredFire && st >= 1.75) {
        this.showdownFiredFire = true;
        const m = MOVES.flamethrower;
        const p = computeMoveScale(this.demoCharizard, m);
        soundEngine.playMoveSfx(m, p);
        this.choreo.triggerMove('player', m, p);
      }
      this.choreo.step(dt);
      this.renderShowdownPhase(st);
      if (st >= 3.5) {
        this.jumpToTitle();
      }
    } else {
      // Live Title Screen background elemental duel + drifting embers!
      if (this.titleFlash > 0) this.titleFlash = Math.max(0, this.titleFlash - dt * 2.2);
      if (!this.choreo.isBusy()) {
        this.titleCycleTimer -= dt;
        if (this.titleCycleTimer <= 0) {
          this.titleCycleTimer = 1.9;
          if (!this.titleToggle) {
            const m = MOVES.flamethrower;
            this.choreo.triggerMove('player', m, computeMoveScale(this.demoCharizard, m));
          } else {
            const m = MOVES.surf;
            this.choreo.triggerMove('enemy', m, computeMoveScale(this.demoBlastoise, m));
          }
          this.titleToggle = !this.titleToggle;
        }
      }
      this.choreo.step(dt);
      this.stepEmbers(dt);
      this.renderTitleBackground();
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private renderPresenterPhase(): void {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = this.elapsed;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Twinkling pixel stars
    for (const s of this.stars) {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 3 + s.phase));
      ctx.fillStyle = `rgba(254, 243, 199, ${tw.toFixed(2)})`;
      ctx.fillRect(Math.round(s.x * 2), Math.round(s.y * 2), 3, 3);
    }

    // Sweeping shooting star comet (0.2s .. 1.1s)
    if (t >= 0.15 && t <= 1.25) {
      const u = (t - 0.15) / 1.1;
      const sx = w * (0.1 + u * 0.8);
      const sy = h * (0.65 - u * 0.35);
      for (let k = 0; k < 8; k++) {
        ctx.fillStyle = `rgba(250, 204, 21, ${(1 - k * 0.12).toFixed(2)})`;
        ctx.fillRect(Math.round(sx - k * 10), Math.round(sy + k * 4), 8 - k, 6 - Math.floor(k / 2));
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(sx), Math.round(sy), 9, 9);
    }

    // Crisp retro presenter text fade-in
    const textAlpha = Math.min(1, Math.max(0, (t - 0.45) * 1.6)) * (t > 1.8 ? Math.max(0, 1 - (t - 1.8) * 2.8) : 1);
    ctx.save();
    ctx.globalAlpha = textAlpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5b938';
    ctx.font = 'bold 20px "Press Start 2P", monospace';
    ctx.fillText('ELEMENTAL ENGINE', w / 2, h / 2 - 8);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('PRESENTS', w / 2, h / 2 + 24);
    ctx.restore();
  }

  private renderShowdownPhase(st: number): void {
    if (!this.canvas) return;
    this.renderer.render(this.canvas, this.choreo, {
      player: spriteManager.getSprite('charizard'),
      enemy: spriteManager.getSprite('blastoise'),
      playerScale: SPECIES.charizard.spriteScale,
      enemyScale: SPECIES.blastoise.spriteScale,
    });

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dramatic cinema letterbox bars!
    const barH = Math.round(h * 0.12);
    ctx.fillStyle = '#090c12';
    ctx.fillRect(0, 0, w, barH);
    ctx.fillRect(0, h - barH, w, barH);

    // Subtitle caption during clash
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px "Press Start 2P", monospace';
    ctx.fillStyle = '#f8fafc';
    const caption =
      st < 1.7 ? 'WATER SURGES WITH SP. ATK...' : 'FIRE GROWS WITH EVOLUTION!';
    ctx.fillText(caption, w / 2, h - Math.round(barH * 0.35));

    // White-gold climax flash leading into Title Reveal!
    if (st > 3.1) {
      const fl = Math.min(1, (st - 3.1) / 0.38);
      ctx.fillStyle = `rgba(255, 240, 200, ${fl.toFixed(2)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private stepEmbers(dt: number): void {
    if (Math.random() < dt * 22 && this.embers.length < 48) {
      this.embers.push({
        x: Math.random() * RENDER_W * 2,
        y: RENDER_H * 2 + 6,
        vx: (Math.random() - 0.5) * 28,
        vy: -(32 + Math.random() * 55),
        size: Math.random() < 0.45 ? 4 : 2,
        life: 2.2 + Math.random() * 1.4,
        maxLife: 3.6,
      });
    }
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.life -= dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.life <= 0 || e.y < -10) this.embers.splice(i, 1);
    }
  }

  private renderTitleBackground(): void {
    if (!this.canvas) return;
    this.renderer.render(this.canvas, this.choreo, {
      player: spriteManager.getSprite('charizard'),
      enemy: spriteManager.getSprite('blastoise'),
      playerScale: SPECIES.charizard.spriteScale,
      enemyScale: SPECIES.blastoise.spriteScale,
    });

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    // Rising FireRed pixel embers
    for (const e of this.embers) {
      const a = Math.min(0.9, e.life / 1.2);
      ctx.fillStyle = e.size > 2 ? `rgba(255, 196, 66, ${a.toFixed(2)})` : `rgba(249, 115, 22, ${a.toFixed(2)})`;
      ctx.fillRect(Math.round(e.x), Math.round(e.y), e.size, e.size);
    }

    if (this.titleFlash > 0.02) {
      ctx.fillStyle = `rgba(255, 238, 195, ${this.titleFlash.toFixed(2)})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
