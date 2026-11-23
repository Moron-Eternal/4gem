import { MOVES } from '../data/moves';
import { createPokemon } from '../data/pokemonFactory';
import { SPECIES } from '../data/species';
import { soundEngine } from '../engine/audio/soundEngine';
import { computeMoveScale } from '../engine/battle/moveScaling';
import { ARENA_H, ARENA_W, ArenaGrid } from '../engine/physics/arenaGrid';
import { ArenaRenderer } from '../engine/physics/arenaRenderer';
import { MoveChoreographer } from '../engine/physics/moveChoreographer';
import { ParticleSystem } from '../engine/physics/particleSystem';
import { hasSavedGame } from '../engine/save/saveManager';
import { spriteManager } from '../engine/sprites/spriteManager';

export interface TitleScreenCallbacks {
  onNewGame: () => void;
  onContinue: () => void;
  onOpenLab: () => void;
}

/**
 * Animated FireRed Title Screen running a live background pixel-physics showcase
 * (Charizard's Flamethrower vs. Blastoise's Surf crashing across the Gym Floor!).
 */
export class TitleScreen {
  private container: HTMLElement;
  private callbacks: TitleScreenCallbacks;
  private rafId: number | null = null;
  private lastTs = 0;

  private grid: ArenaGrid;
  private particles: ParticleSystem;
  private choreo: MoveChoreographer;
  private renderer: ArenaRenderer;
  private canvas: HTMLCanvasElement | null = null;
  private cycleTimer = 0.6;
  private turnToggle = false;

  private demoCharizard = createPokemon('charizard', 100);
  private demoBlastoise = createPokemon('blastoise', 100);

  constructor(container: HTMLElement, callbacks: TitleScreenCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.grid = new ArenaGrid('gym_floor');
    this.particles = new ParticleSystem();
    this.choreo = new MoveChoreographer(this.grid, this.particles);
    this.renderer = new ArenaRenderer();

    spriteManager.preload(['charizard', 'blastoise', 'squirtle', 'wartortle', 'charmander', 'charmeleon', 'bulbasaur', 'venusaur', 'pikachu', 'munchlax']);
  }

  public mount(): void {
    const canContinue = hasSavedGame();
    this.container.innerHTML = `
      <div class="title-screen">
        <canvas class="title-bg-canvas" id="title-demo-canvas" width="${ARENA_W * 4}" height="${ARENA_H * 4}"></canvas>
        <div class="title-scrim"></div>
        <div class="title-content">
          <div class="title-logo-wrap">
            <div class="title-kicker">KANTO ELEMENTAL PHYSICS EDITION</div>
            <h1 class="title-main">POKéMON<br/>FIRERED</h1>
            <div class="title-version">REAL-TIME PIXEL BATTLE SIMULATOR</div>
          </div>

          <p class="title-tagline">
            Follow the classic Kanto journey—catch wild POKéMON, battle trainers &amp; Gym Leaders, and watch your moves
            <strong>grow physically larger as you level up &amp; evolve</strong> while scorching, flooding, freezing,
            and electrifying the battlefield!
          </p>

          <div class="title-menu">
            ${
              canContinue
                ? `<button class="pixel-btn primary" id="btn-continue">CONTINUE JOURNEY</button>`
                : ''
            }
            <button class="pixel-btn ${canContinue ? '' : 'primary'}" id="btn-new-game">NEW ADVENTURE</button>
            <button class="pixel-btn gold" id="btn-battle-lab">BATTLE LAB &amp; 3x SHOWCASE</button>
          </div>

          <div class="title-footer">
            <span>WASD / ARROWS: Move</span>
            <span>Z / ENTER / SPACE: Interact</span>
            <span>X / ESC: Party &amp; Menu</span>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#title-demo-canvas');

    this.container.querySelector('#btn-continue')?.addEventListener('click', () => {
      soundEngine.playConfirm();
      this.callbacks.onContinue();
    });
    this.container.querySelector('#btn-new-game')?.addEventListener('click', () => {
      soundEngine.playConfirm();
      this.callbacks.onNewGame();
    });
    this.container.querySelector('#btn-battle-lab')?.addEventListener('click', () => {
      soundEngine.playConfirm();
      this.callbacks.onOpenLab();
    });

    this.lastTs = performance.now();
    this.loop(this.lastTs);
  }

  public unmount(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (ts: number): void => {
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
    this.lastTs = ts;

    if (!this.choreo.isBusy()) {
      this.cycleTimer -= dt;
      if (this.cycleTimer <= 0) {
        this.cycleTimer = 1.6;
        if (!this.turnToggle) {
          const move = MOVES.flamethrower;
          const prof = computeMoveScale(this.demoCharizard, move);
          this.choreo.triggerMove('player', move, prof);
        } else {
          const move = MOVES.surf;
          const prof = computeMoveScale(this.demoBlastoise, move);
          this.choreo.triggerMove('enemy', move, prof);
        }
        this.turnToggle = !this.turnToggle;
      }
    }

    this.choreo.step(dt);

    if (this.canvas) {
      this.renderer.render(this.canvas, this.choreo, {
        player: spriteManager.getSprite('charizard'),
        enemy: spriteManager.getSprite('blastoise'),
        playerScale: SPECIES.charizard.spriteScale,
        enemyScale: SPECIES.blastoise.spriteScale,
      });
    }

    this.rafId = requestAnimationFrame(this.loop);
  };
}
