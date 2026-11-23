import { ITEMS } from '../data/items';
import { MOVES } from '../data/moves';
import { createPokemon, expForLevel, getDisplayName, grantExp, LevelUpResult } from '../data/pokemonFactory';
import { SPECIES } from '../data/species';
import { TYPE_COLORS } from '../data/typeChart';
import { soundEngine } from '../engine/audio/soundEngine';
import {
  calculateCatchAttempt,
  calculateExpReward,
  chooseAiDecision,
  createDefaultStages,
  determineTurnOrder,
  resolveMoveExecution,
  resolveStatusTick,
} from '../engine/battle/battleEngine';
import { evaluateEndOfTurnEnvironment, isGrounded } from '../engine/battle/environmentRules';
import {
  computeMovementBudget,
  computeMoveScale,
  evaluateMoveReach,
} from '../engine/battle/moveScaling';
import {
  ARENA_H,
  ARENA_W,
  ArenaGrid,
  PLAY_MAX_X,
  PLAY_MAX_Y,
  PLAY_MIN_X,
  PLAY_MIN_Y,
  RENDER_H,
  RENDER_W,
} from '../engine/physics/arenaGrid';
import { ArenaRenderer, TacticalOverlayState } from '../engine/physics/arenaRenderer';
import { MoveChoreographer } from '../engine/physics/moveChoreographer';
import { ParticleSystem } from '../engine/physics/particleSystem';
import {
  addInventoryItem,
  consumeInventoryItem,
  recordPokedexCaught,
  recordPokedexSeen,
} from '../engine/save/saveManager';
import { getOfficialItemUrl, getOfficialSpriteUrl, spriteManager } from '../engine/sprites/spriteManager';
import {
  ArenaBiomeId,
  EnvConditionTag,
  MoveData,
  MoveReachEvaluation,
  PokemonInstance,
  PvpMatchConfig,
  SaveState,
  StatStages,
  TrainerData,
} from '../types/game';

export interface BattleConfig {
  mode: 'wild' | 'trainer' | 'pvp';
  biome: ArenaBiomeId;
  wildPokemon?: PokemonInstance;
  trainer?: TrainerData;
  pvp?: PvpMatchConfig;
}

export interface BattleOutcome {
  result: 'win' | 'lose' | 'caught' | 'fled' | 'pvp_rematch' | 'pvp_edit' | 'pvp_exit';
  trainerId?: string;
}

const ENV_LABELS: Record<EnvConditionTag, string> = {
  burning: 'BURNING',
  flooded: 'FLOODED',
  electrified: 'ELECTRIFIED',
  frozen: 'FROZEN',
  steam: 'STEAM',
  cratered: 'CRATERED',
  overgrown: 'OVERGROWN',
  pillars: 'ROCK COVER',
};

type DeckMenuMode = 'root' | 'moves' | 'move_step' | 'busy' | 'pvp_handoff';

interface QueuedTurnAction {
  type: 'move' | 'switch' | 'approach';
  moveIdx?: number;
  switchIdx?: number;
  stepDest?: { x: number; y: number };
}

/**
 * Full Tactical 2D Turn-Based FireRed Battle Screen supporting:
 * - Wild Encounters, Trainer / Gym Battles, AND 2P Local Co-Op PvP!
 * - Battle Start Poké Ball Summon Animation
 * - Speed-based 2D Arena Repositioning + Stat/Level/Evo Dynamic Move Ranges (Scratch vs Tackle vs Flamethrower/Surf!)
 * - Depth-sorted 384x216 1:1 Native PokéAPI Sprites & Interactive Environmental Physics!
 */
export class BattleUI {
  private container: HTMLElement;
  private save: SaveState | null;
  private config: BattleConfig;
  private onFinish: (outcome: BattleOutcome) => void;

  private grid: ArenaGrid;
  private particles: ParticleSystem;
  private choreo: MoveChoreographer;
  private renderer: ArenaRenderer;

  private rafId: number | null = null;
  private lastTs = 0;
  private canvas: HTMLCanvasElement | null = null;

  private p1Party: PokemonInstance[] = [];
  private p2Party: PokemonInstance[] = [];
  private p1Idx = 0;
  private p2Idx = 0;

  private p1Stages: StatStages = createDefaultStages();
  private p2Stages: StatStages = createDefaultStages();

  /** Active actor currently picking a turn ('player' = P1 left, 'enemy' = P2 right in PvP) */
  private choosingSide: 'player' | 'enemy' = 'player';
  private p1Queued: QueuedTurnAction | null = null;
  private p1UsedFreeStep = false;
  private p2UsedFreeStep = false;

  private menuMode: DeckMenuMode = 'busy';
  private hoveredMoveIdx: number | null = null;
  private hoverArenaPos: { x: number; y: number } | null = null;
  private destroyed = false;

  constructor(
    container: HTMLElement,
    save: SaveState | null,
    config: BattleConfig,
    onFinish: (outcome: BattleOutcome) => void
  ) {
    this.container = container;
    this.save = save;
    this.config = config;
    this.onFinish = onFinish;

    this.grid = new ArenaGrid(config.biome);
    this.particles = new ParticleSystem();
    this.choreo = new MoveChoreographer(this.grid, this.particles);
    this.renderer = new ArenaRenderer();

    if (config.mode === 'pvp' && config.pvp) {
      this.p1Party = config.pvp.p1Party;
      this.p2Party = config.pvp.p2Party;
      this.p1Idx = 0;
      this.p2Idx = 0;
    } else {
      this.p1Party = save ? save.party : [createPokemon('charmander', 5)];
      const aliveIdx = this.p1Party.findIndex((p) => p.hp > 0);
      this.p1Idx = aliveIdx >= 0 ? aliveIdx : 0;

      if (config.mode === 'trainer' && config.trainer) {
        this.p2Party = config.trainer.party.map((spec) =>
          createPokemon(spec.speciesId, spec.level, { customMoves: spec.customMoves })
        );
      } else if (config.wildPokemon) {
        this.p2Party = [config.wildPokemon];
      } else {
        this.p2Party = [createPokemon('pidgey', 4)];
      }
      if (save) recordPokedexSeen(save, this.p2Party[0].speciesId);
    }

    spriteManager.preload([...this.p1Party, ...this.p2Party].map((m) => m.speciesId));
    spriteManager.preloadCommonItems();
  }

  private get p1Mon(): PokemonInstance {
    return this.p1Party[this.p1Idx];
  }

  private get p2Mon(): PokemonInstance {
    return this.p2Party[this.p2Idx];
  }

  private get actorMon(): PokemonInstance {
    return this.choosingSide === 'player' ? this.p1Mon : this.p2Mon;
  }

  private get actorStages(): StatStages {
    return this.choosingSide === 'player' ? this.p1Stages : this.p2Stages;
  }

  private get actorVisual() {
    return this.choosingSide === 'player' ? this.choreo.playerVisual : this.choreo.enemyVisual;
  }

  private get targetVisual() {
    return this.choosingSide === 'player' ? this.choreo.enemyVisual : this.choreo.playerVisual;
  }

  private getLiveSnapshot() {
    return this.grid.getSnapshot(
      this.choreo.playerVisual.homeX,
      this.choreo.playerVisual.homeY,
      this.choreo.enemyVisual.homeX,
      this.choreo.enemyVisual.homeY
    );
  }

  private getActorMoveBudget(): number {
    const snap = this.getLiveSnapshot();
    const zone = this.choosingSide === 'player' ? snap.playerZone : snap.enemyZone;
    return computeMovementBudget(
      this.actorMon,
      this.actorStages,
      zone,
      this.actorVisual.rootedTurns > 0
    );
  }

  public mount(): void {
    soundEngine.playMusic(
      this.config.mode === 'pvp' || this.config.trainer?.isGymLeader ? 'boss' : 'battle'
    );
    this.renderShell();
    this.lastTs = performance.now();
    this.loop(this.lastTs);

    const introMsg =
      this.config.mode === 'pvp'
        ? `${this.config.pvp?.p1Name} vs ${this.config.pvp?.p2Name}!`
        : this.config.mode === 'trainer' && this.config.trainer
        ? `${this.config.trainer.title} ${this.config.trainer.name} sent out ${getDisplayName(this.p2Mon)}!`
        : `A wild ${getDisplayName(this.p2Mon)} (Lv.${this.p2Mon.level}) leaped from the grass!`;

    this.setLog(introMsg, `Go! ${getDisplayName(this.p1Mon)}!`);

    const enemyStyle =
      this.config.mode === 'pvp'
        ? 'rival'
        : this.config.trainer?.spriteStyle ?? 'rival';

    this.choreo.triggerBattleIntro(this.config.mode, enemyStyle, {
      onBallThrow: () => soundEngine.playPokeballThrow(),
      onBallOpen: () => soundEngine.playPokeballOpen(),
      onComplete: () => {
        if (this.destroyed) return;
        this.beginTurnSelection('player');
      },
    });
  }

  public unmount(): void {
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  private beginTurnSelection(side: 'player' | 'enemy'): void {
    this.choosingSide = side;
    this.hoveredMoveIdx = null;
    this.hoverArenaPos = null;
    if (side === 'player') {
      this.p1Queued = null;
      this.p1UsedFreeStep = false;
      this.p2UsedFreeStep = false;
    }
    this.menuMode = 'root';
    const who =
      this.config.mode === 'pvp'
        ? side === 'player'
          ? 'PLAYER 1 (RED)'
          : 'PLAYER 2 (BLUE)'
        : getDisplayName(this.p1Mon);
    const dist = Math.round(this.choreo.getDistanceBetweenFighters());
    this.setLog(
      this.config.mode === 'pvp'
        ? `${who}: What will ${getDisplayName(this.actorMon)} do?`
        : `What will ${getDisplayName(this.p1Mon)} do?`,
      `Distance: ${dist}m • Use STEP to reposition or hover moves to check Range!`
    );
    this.updateHudPlates();
    this.renderDeck();
  }

  private renderShell(): void {
    const titleLabel =
      this.config.mode === 'pvp'
        ? '2P LOCAL VS BATTLE'
        : this.config.mode === 'trainer' && this.config.trainer
        ? `${this.config.trainer.title} ${this.config.trainer.name}`
        : 'WILD ENCOUNTER';

    this.container.innerHTML = `
      <div class="battle-screen">
        <div class="top-bar">
          <div class="top-bar-left">
            <span class="location-pill">${titleLabel}</span>
            <span class="stat-chip">ARENA: ${this.config.biome.replace('_', ' ').toUpperCase()}</span>
            <span class="stat-chip" id="battle-dist-chip">DIST: --</span>
          </div>
          <div class="top-bar-actions">
            <button class="pixel-btn sm dark" id="btn-btl-bgm">BGM: ${soundEngine.isMusicEnabled() ? 'ON' : 'OFF'}</button>
            <button class="pixel-btn sm dark" id="btn-btl-sfx">SFX: ${soundEngine.isSfxEnabled() ? 'ON' : 'OFF'}</button>
            ${this.config.mode === 'pvp' ? `<button class="pixel-btn sm primary" id="btn-pvp-quit">QUIT VS</button>` : ''}
          </div>
        </div>

        <div class="battle-arena-wrap">
          <canvas class="battle-canvas" id="battle-canvas" width="${RENDER_W * 2}" height="${RENDER_H * 2}"></canvas>

          <div class="battle-hud-plate player" id="hud-player"></div>
          <div class="battle-hud-plate enemy" id="hud-enemy"></div>

          <div class="env-strip">
            <div class="env-tags" id="battle-env-tags"></div>
            <div class="scale-callout" id="battle-scale-callout" style="display:none;"></div>
          </div>
        </div>

        <div class="battle-deck">
          <div class="gba-box battle-log-box">
            <div class="battle-log-main" id="battle-log-main"></div>
            <div class="battle-log-sub" id="battle-log-sub"></div>
          </div>
          <div id="battle-action-pane" style="display:flex;flex-direction:column;min-height:0;"></div>
        </div>

        <div id="battle-modal-slot"></div>
      </div>
    `;

    this.canvas = this.container.querySelector('#battle-canvas');
    this.bindArenaPointerEvents();

    this.container.querySelector('#btn-btl-bgm')?.addEventListener('click', () => {
      const on = soundEngine.toggleMusic();
      const b = this.container.querySelector('#btn-btl-bgm');
      if (b) b.textContent = `BGM: ${on ? 'ON' : 'OFF'}`;
    });
    this.container.querySelector('#btn-btl-sfx')?.addEventListener('click', () => {
      const on = soundEngine.toggleSfx();
      const b = this.container.querySelector('#btn-btl-sfx');
      if (b) b.textContent = `SFX: ${on ? 'ON' : 'OFF'}`;
    });
    this.container.querySelector('#btn-pvp-quit')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.onFinish({ result: 'pvp_exit' });
    });

    this.updateHudPlates();
    this.renderDeck();
  }

  /** Converts a mouse/touch click on the display canvas into 192x108 arena grid coordinates! */
  private clientToArenaCoords(e: MouseEvent): { x: number; y: number } | null {
    if (!this.canvas) return null;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    // Account for object-fit: contain letterboxing inside canvas box
    const aspectCanvas = RENDER_W / RENDER_H;
    const aspectRect = rect.width / rect.height;
    let drawW = rect.width;
    let drawH = rect.height;
    let offsetX = 0;
    let offsetY = 0;
    if (aspectRect > aspectCanvas) {
      drawW = rect.height * aspectCanvas;
      offsetX = (rect.width - drawW) / 2;
    } else {
      drawH = rect.width / aspectCanvas;
      offsetY = (rect.height - drawH) / 2;
    }

    const nx = (e.clientX - rect.left - offsetX) / drawW;
    const ny = (e.clientY - rect.top - offsetY) / drawH;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;

    return {
      x: Math.max(PLAY_MIN_X + 12, Math.min(PLAY_MAX_X - 12, Math.round(nx * ARENA_W))),
      y: Math.max(PLAY_MIN_Y + 10, Math.min(PLAY_MAX_Y - 10, Math.round(ny * ARENA_H))),
    };
  }

  private clampToMoveBudget(dest: { x: number; y: number }): { x: number; y: number } {
    const budget = this.getActorMoveBudget();
    const ax = this.actorVisual.homeX;
    const ay = this.actorVisual.homeY;
    const dx = dest.x - ax;
    const dy = dest.y - ay;
    const dist = Math.hypot(dx, dy);
    if (dist <= budget) return dest;
    const ratio = budget / Math.max(1, dist);
    return {
      x: Math.max(PLAY_MIN_X + 12, Math.min(PLAY_MAX_X - 12, Math.round(ax + dx * ratio))),
      y: Math.max(PLAY_MIN_Y + 10, Math.min(PLAY_MAX_Y - 10, Math.round(ay + dy * ratio))),
    };
  }

  private bindArenaPointerEvents(): void {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.menuMode !== 'move_step') {
        this.hoverArenaPos = null;
        return;
      }
      const pt = this.clientToArenaCoords(e);
      this.hoverArenaPos = pt ? this.clampToMoveBudget(pt) : null;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverArenaPos = null;
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.menuMode !== 'move_step') return;
      const pt = this.clientToArenaCoords(e);
      if (!pt) return;
      const clamped = this.clampToMoveBudget(pt);
      this.executeFreeTacticalStep(clamped.x, clamped.y);
    });
  }

  private async executeFreeTacticalStep(destX: number, destY: number): Promise<void> {
    const side = this.choosingSide;
    this.menuMode = 'busy';
    this.hoverArenaPos = null;
    this.renderDeck();

    const mon = this.actorMon;
    this.setLog(`${getDisplayName(mon)} repositioned across the arena!`);

    const hazards = await new Promise<{ crossedFire: boolean; crossedWater: boolean; crossedIce: boolean }>((resolve) => {
      this.choreo.triggerStepMove(side, destX, destY, {
        onStepSound: (surf) => soundEngine.playFootstep(surf),
        onComplete: (hz) => resolve(hz),
      });
    });

    if (this.destroyed) return;

    if (side === 'player') this.p1UsedFreeStep = true;
    else this.p2UsedFreeStep = true;

    // Crossing roaring flames singes grounded non-Fire Pokémon!
    const sp = SPECIES[mon.speciesId];
    if (hazards.crossedFire && isGrounded(mon) && sp && !sp.types.includes('fire')) {
      const chip = Math.max(1, Math.floor(mon.maxHp / 18));
      mon.hp = Math.max(1, mon.hp - chip);
      this.updateHudPlates();
      this.setLog(`${getDisplayName(mon)} got singed dashing through flames! (-${chip} HP)`);
      await this.wait(650);
    }

    this.menuMode = 'moves';
    this.setLog(
      `Now choose a move for ${getDisplayName(mon)}!`,
      `Distance: ${Math.round(this.choreo.getDistanceBetweenFighters())}m`
    );
    this.renderDeck();
  }

  private setLog(main: string, sub = ''): void {
    const mEl = this.container.querySelector('#battle-log-main');
    const sEl = this.container.querySelector('#battle-log-sub');
    if (mEl) mEl.textContent = main;
    if (sEl) sEl.textContent = sub;
  }

  private setScaleBanner(text: string): void {
    const el = this.container.querySelector('#battle-scale-callout') as HTMLElement | null;
    if (!el) return;
    if (text) {
      el.style.display = 'block';
      el.textContent = text;
    } else {
      el.style.display = 'none';
    }
  }

  private updateHudPlates(): void {
    const p1 = this.p1Mon;
    const p2 = this.p2Mon;
    const pEl = this.container.querySelector('#hud-player');
    const eEl = this.container.querySelector('#hud-enemy');

    if (pEl && p1) {
      const pct = Math.max(0, Math.min(100, (p1.hp / Math.max(1, p1.maxHp)) * 100));
      const hpClass = pct <= 22 ? 'low' : pct <= 50 ? 'mid' : '';
      const curFloor = expForLevel(p1.level);
      const nextFloor = expForLevel(Math.min(100, p1.level + 1));
      const xpPct =
        p1.level >= 100 ? 100 : Math.max(0, Math.min(100, ((p1.exp - curFloor) / Math.max(1, nextFloor - curFloor)) * 100));
      const p1Dots =
        this.config.mode === 'pvp'
          ? `<div class="party-balls">${this.p1Party
              .map((m) => `<span class="party-ball-dot ${m.hp <= 0 ? 'fainted' : ''}"></span>`)
              .join('')}</div>`
          : `<span>SpA ${p1.spAtk}</span>`;

      pEl.innerHTML = `
        <div class="plate-row">
          <span class="plate-name">${this.config.mode === 'pvp' ? 'P1 ' : ''}${getDisplayName(p1)}</span>
          ${p1.status !== 'none' ? `<span class="status-badge ${p1.status}">${p1.status.slice(0, 3).toUpperCase()}</span>` : ''}
          ${this.choreo.playerVisual.rootedTurns > 0 ? `<span class="status-badge root">ROOT</span>` : ''}
          <span class="plate-lvl">Lv.${p1.level}</span>
        </div>
        <div class="hp-bar-track"><div class="hp-bar-fill ${hpClass}" style="width:${pct.toFixed(1)}%"></div></div>
        <div class="hp-nums"><span>HP ${p1.hp}/${p1.maxHp}</span>${p1Dots}</div>
        ${this.config.mode !== 'pvp' ? `<div class="xp-bar-track"><div class="xp-bar-fill" style="width:${xpPct.toFixed(1)}%"></div></div>` : ''}
      `;
    }

    if (eEl && p2) {
      const pct = Math.max(0, Math.min(100, (p2.hp / Math.max(1, p2.maxHp)) * 100));
      const hpClass = pct <= 22 ? 'low' : pct <= 50 ? 'mid' : '';
      const partyDots =
        this.config.mode !== 'wild'
          ? `<div class="party-balls">${this.p2Party
              .map((m) => `<span class="party-ball-dot ${m.hp <= 0 ? 'fainted' : ''}"></span>`)
              .join('')}</div>`
          : '';

      eEl.innerHTML = `
        <div class="plate-row">
          <span class="plate-name">${this.config.mode === 'pvp' ? 'P2 ' : ''}${getDisplayName(p2)}</span>
          ${p2.status !== 'none' ? `<span class="status-badge ${p2.status}">${p2.status.slice(0, 3).toUpperCase()}</span>` : ''}
          ${this.choreo.enemyVisual.rootedTurns > 0 ? `<span class="status-badge root">ROOT</span>` : ''}
          <span class="plate-lvl">Lv.${p2.level}</span>
        </div>
        <div class="hp-bar-track"><div class="hp-bar-fill ${hpClass}" style="width:${pct.toFixed(1)}%"></div></div>
        <div class="hp-nums"><span>HP ${p2.hp}/${p2.maxHp}</span>${partyDots}</div>
      `;
    }
  }

  private renderDeck(): void {
    const pane = this.container.querySelector('#battle-action-pane');
    if (!pane) return;

    if (this.menuMode === 'busy') {
      pane.innerHTML = `
        <div class="gba-box" style="flex:1;display:flex;align-items:center;justify-content:center;padding:12px;">
          <span style="font-family:var(--font-pixel);font-size:10px;color:#64748b;">RESOLVING ACTION...</span>
        </div>
      `;
      return;
    }

    if (this.menuMode === 'pvp_handoff') {
      pane.innerHTML = `
        <div class="gba-box" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;">
          <div style="font-family:var(--font-pixel);font-size:10px;color:#1d4ed8;">PASS CONTROLS TO PLAYER 2 (BLUE)!</div>
          <button class="pixel-btn primary" id="pvp-ready-p2">PLAYER 2 READY</button>
        </div>
      `;
      pane.querySelector('#pvp-ready-p2')?.addEventListener('click', () => {
        soundEngine.playConfirm();
        this.beginTurnSelection('enemy');
      });
      return;
    }

    if (this.menuMode === 'move_step') {
      const budget = this.getActorMoveBudget();
      pane.innerHTML = `
        <div class="gba-box" style="flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:12px;">
          <div style="font-family:var(--font-pixel);font-size:9px;color:#0369a1;line-height:1.6;">
            CLICK ANYWHERE INSIDE THE CYAN CIRCLE TO REPOSITION!<br/>
            <span style="color:#475569;">Movement Budget: ${budget}m ${
        this.actorVisual.rootedTurns > 0 ? '(ROOTED -55%!)' : '(based on Speed)'
      }</span>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="pixel-btn sm primary" id="step-auto-closer">STEP CLOSER</button>
            <button class="pixel-btn sm dark" id="step-cancel">← BACK</button>
          </div>
        </div>
      `;
      pane.querySelector('#step-auto-closer')?.addEventListener('click', () => {
        const av = this.actorVisual;
        const tv = this.targetVisual;
        const dest = this.clampToMoveBudget({ x: tv.homeX, y: tv.homeY });
        this.executeFreeTacticalStep(dest.x, dest.y);
      });
      pane.querySelector('#step-cancel')?.addEventListener('click', () => {
        soundEngine.playBlip();
        this.hoverArenaPos = null;
        this.menuMode = 'root';
        this.renderDeck();
      });
      return;
    }

    const usedStep = this.choosingSide === 'player' ? this.p1UsedFreeStep : this.p2UsedFreeStep;

    if (this.menuMode === 'root') {
      const isPvp = this.config.mode === 'pvp';
      pane.innerHTML = `
        <div class="battle-action-grid" style="flex:1;">
          <button class="pixel-btn primary" id="act-fight">FIGHT</button>
          <button class="pixel-btn step-btn" id="act-step" ${usedStep ? 'disabled' : ''}>
            ${usedStep ? 'MOVED' : 'STEP / MOVE'}
          </button>
          <button class="pixel-btn" id="act-party">POKéMON</button>
          ${
            isPvp
              ? `<button class="pixel-btn gold" id="act-approach">SPRINT CLOSER</button>`
              : `<button class="pixel-btn gold" id="act-bag">BAG / CATCH</button>`
          }
        </div>
        ${
          !isPvp && this.config.mode === 'wild'
            ? `<button class="pixel-btn sm dark" id="act-run" style="margin-top:6px;">RUN AWAY</button>`
            : ''
        }
      `;
      pane.querySelector('#act-fight')?.addEventListener('click', () => {
        soundEngine.playBlip();
        this.menuMode = 'moves';
        this.renderDeck();
      });
      pane.querySelector('#act-step')?.addEventListener('click', () => {
        soundEngine.playBlip();
        this.menuMode = 'move_step';
        this.setLog(
          `Click a tile inside ${getDisplayName(this.actorMon)}'s cyan movement ring!`,
          'Avoid blazing flames or step into puddles/cover!'
        );
        this.renderDeck();
      });
      pane.querySelector('#act-party')?.addEventListener('click', () => {
        soundEngine.playBlip();
        this.openPartyModal(false);
      });
      pane.querySelector('#act-bag')?.addEventListener('click', () => {
        soundEngine.playBlip();
        this.openBagModal();
      });
      pane.querySelector('#act-run')?.addEventListener('click', () => {
        soundEngine.playBlip();
        this.handleRun();
      });
      pane.querySelector('#act-approach')?.addEventListener('click', () => {
        soundEngine.playConfirm();
        const av = this.actorVisual;
        const tv = this.targetVisual;
        const dest = this.clampToMoveBudget({ x: tv.homeX, y: tv.homeY });
        this.submitChosenAction({ type: 'approach', stepDest: dest });
      });
      return;
    }

    if (this.menuMode === 'moves') {
      const mon = this.actorMon;
      const stages = this.actorStages;
      const budget = usedStep ? 0 : this.getActorMoveBudget();
      const av = this.actorVisual;
      const tv = this.targetVisual;

      pane.innerHTML = `
        <div class="battle-action-grid" style="flex:1;">
          ${mon.moves
            .map((slot, idx) => {
              const m = MOVES[slot.moveId];
              if (!m) return '';
              const tc = TYPE_COLORS[m.type];
              const prof = computeMoveScale(mon, m, stages);
              const reach: MoveReachEvaluation = evaluateMoveReach(
                av.homeX,
                av.homeY,
                tv.homeX,
                tv.homeY,
                m,
                prof,
                budget
              );
              const reachBadge =
                reach.status === 'in_range'
                  ? `<span class="reach-tag ok">IN RANGE</span>`
                  : reach.status === 'dash_strike'
                  ? `<span class="reach-tag dash">DASH+HIT</span>`
                  : `<span class="reach-tag far">TOO FAR</span>`;

              return `
                <button class="move-btn" data-move-idx="${idx}" ${slot.pp <= 0 ? 'disabled' : ''}>
                  <div class="move-btn-head">
                    <span class="move-btn-name">${m.name}</span>
                    <span class="type-pill" style="background:${tc.bg};color:${tc.text};">${m.type}</span>
                  </div>
                  <div class="move-btn-meta">
                    <span>PP ${slot.pp}/${slot.maxPp} • RNG ${prof.effectiveRangePx}m</span>
                    ${reachBadge}
                  </div>
                  <div class="move-btn-env">${m.envHint}</div>
                </button>
              `;
            })
            .join('')}
        </div>
        <button class="pixel-btn sm dark" id="act-back-root" style="margin-top:6px;">← BACK</button>
      `;

      pane.querySelector('#act-back-root')?.addEventListener('click', () => {
        soundEngine.playBlip();
        this.hoveredMoveIdx = null;
        this.menuMode = 'root';
        this.renderDeck();
      });

      pane.querySelectorAll('[data-move-idx]').forEach((btn) => {
        const idx = Number((btn as HTMLElement).dataset.moveIdx);
        btn.addEventListener('mouseenter', () => {
          this.hoveredMoveIdx = idx;
        });
        btn.addEventListener('mouseleave', () => {
          if (this.hoveredMoveIdx === idx) this.hoveredMoveIdx = null;
        });
        btn.addEventListener('click', () => {
          this.hoveredMoveIdx = null;
          const slot = mon.moves[idx];
          const m = MOVES[slot.moveId];
          if (!m) return;
          const prof = computeMoveScale(mon, m, stages);
          const reach = evaluateMoveReach(av.homeX, av.homeY, tv.homeX, tv.homeY, m, prof, budget);

          soundEngine.playConfirm();
          if (reach.status === 'in_range') {
            this.submitChosenAction({ type: 'move', moveIdx: idx });
          } else if (reach.status === 'dash_strike') {
            this.submitChosenAction({
              type: 'move',
              moveIdx: idx,
              stepDest: { x: reach.approachX, y: reach.approachY },
            });
          } else {
            // Too far even with dash -> sprint toward opponent to set up next turn!
            this.setLog(
              `${m.name} is out of range (${reach.distancePx}m vs ${reach.effectiveRangePx}m)!`,
              `${getDisplayName(mon)} sprints closer to close the gap!`
            );
            this.submitChosenAction({
              type: 'approach',
              stepDest: { x: reach.approachX, y: reach.approachY },
            });
          }
        });
      });
    }
  }

  private submitChosenAction(action: QueuedTurnAction): void {
    if (this.config.mode === 'pvp') {
      if (this.choosingSide === 'player') {
        this.p1Queued = action;
        if (this.config.pvp?.privacyHandoff) {
          this.menuMode = 'pvp_handoff';
          this.setLog('PLAYER 1 locked in their order!', 'Hand controls over to PLAYER 2.');
          this.renderDeck();
        } else {
          this.beginTurnSelection('enemy');
        }
      } else {
        const p1Act = this.p1Queued ?? { type: 'move', moveIdx: 0 };
        this.resolvePvpRound(p1Act, action);
      }
      return;
    }

    this.resolveSinglePlayerRound(action);
  }

  private async resolveSinglePlayerRound(p1Act: QueuedTurnAction): Promise<void> {
    this.menuMode = 'busy';
    this.renderDeck();

    const snap = this.getLiveSnapshot();
    const aiDec = chooseAiDecision(
      this.p2Mon,
      this.p1Mon,
      this.p2Stages,
      { x: this.choreo.enemyVisual.homeX, y: this.choreo.enemyVisual.homeY },
      { x: this.choreo.playerVisual.homeX, y: this.choreo.playerVisual.homeY },
      snap,
      this.choreo.enemyVisual.rootedTurns > 0
    );

    const pMove =
      p1Act.type === 'move' && p1Act.moveIdx !== undefined
        ? MOVES[this.p1Mon.moves[p1Act.moveIdx]?.moveId] ?? MOVES.tackle
        : MOVES.tackle;

    const order = determineTurnOrder(
      this.p1Mon,
      pMove,
      this.p1Stages,
      this.p2Mon,
      aiDec.move,
      this.p2Stages
    );

    for (const side of order) {
      if (this.destroyed) return;
      if (this.p1Mon.hp <= 0 || this.p2Mon.hp <= 0) break;

      if (side === 'player') {
        await this.executeQueuedSideAction('player', p1Act);
      } else {
        const aiAct: QueuedTurnAction = aiDec.onlyApproach
          ? { type: 'approach', stepDest: aiDec.stepTo }
          : {
              type: 'move',
              moveIdx: Math.max(0, this.p2Mon.moves.findIndex((m) => m.moveId === aiDec.move.id)),
              stepDest: aiDec.stepTo,
            };
        await this.executeQueuedSideAction('enemy', aiAct);
      }

      if (this.p2Mon.hp <= 0) {
        await this.handleSideFainted('enemy');
        return;
      }
      if (this.p1Mon.hp <= 0) {
        await this.handleSideFainted('player');
        return;
      }
    }

    await this.finishRoundEndOfTurn();
  }

  private async resolvePvpRound(p1Act: QueuedTurnAction, p2Act: QueuedTurnAction): Promise<void> {
    this.menuMode = 'busy';
    this.renderDeck();

    // Switches resolve first!
    if (p1Act.type === 'switch' && p1Act.switchIdx !== undefined) {
      await this.performSwitch('player', p1Act.switchIdx);
    }
    if (p2Act.type === 'switch' && p2Act.switchIdx !== undefined) {
      await this.performSwitch('enemy', p2Act.switchIdx);
    }

    const p1Move =
      p1Act.type === 'move' && p1Act.moveIdx !== undefined
        ? MOVES[this.p1Mon.moves[p1Act.moveIdx]?.moveId] ?? MOVES.tackle
        : MOVES.tackle;
    const p2Move =
      p2Act.type === 'move' && p2Act.moveIdx !== undefined
        ? MOVES[this.p2Mon.moves[p2Act.moveIdx]?.moveId] ?? MOVES.tackle
        : MOVES.tackle;

    const order = determineTurnOrder(
      this.p1Mon,
      p1Move,
      this.p1Stages,
      this.p2Mon,
      p2Move,
      this.p2Stages
    );

    for (const side of order) {
      if (this.destroyed) return;
      if (this.p1Mon.hp <= 0 || this.p2Mon.hp <= 0) break;
      const act = side === 'player' ? p1Act : p2Act;
      if (act.type === 'switch') continue;

      await this.executeQueuedSideAction(side, act);

      if (this.p2Mon.hp <= 0) {
        await this.handleSideFainted('enemy');
        return;
      }
      if (this.p1Mon.hp <= 0) {
        await this.handleSideFainted('player');
        return;
      }
    }

    await this.finishRoundEndOfTurn();
  }

  private async performSwitch(side: 'player' | 'enemy', nextIdx: number): Promise<void> {
    if (side === 'player') {
      this.p1Idx = nextIdx;
      this.p1Stages = createDefaultStages();
      this.choreo.playerVisual.alpha = 1;
      this.choreo.playerVisual.rootedTurns = 0;
    } else {
      this.p2Idx = nextIdx;
      this.p2Stages = createDefaultStages();
      this.choreo.enemyVisual.alpha = 1;
      this.choreo.enemyVisual.rootedTurns = 0;
    }
    soundEngine.playPokeballOpen();
    this.updateHudPlates();
    this.setLog(`Go! ${getDisplayName(side === 'player' ? this.p1Mon : this.p2Mon)}!`);
    await this.wait(700);
  }

  private async executeQueuedSideAction(side: 'player' | 'enemy', act: QueuedTurnAction): Promise<void> {
    const mon = side === 'player' ? this.p1Mon : this.p2Mon;

    if (act.stepDest) {
      this.setLog(
        act.type === 'approach'
          ? `${getDisplayName(mon)} sprinted forward to close the gap!`
          : `${getDisplayName(mon)} dashed into attack range!`
      );
      const hazards = await new Promise<{ crossedFire: boolean; crossedWater: boolean; crossedIce: boolean }>((resolve) => {
        this.choreo.triggerStepMove(side, act.stepDest!.x, act.stepDest!.y, {
          onStepSound: (surf) => soundEngine.playFootstep(surf),
          onComplete: (hz) => resolve(hz),
        });
      });

      const sp = SPECIES[mon.speciesId];
      if (hazards.crossedFire && isGrounded(mon) && sp && !sp.types.includes('fire')) {
        const chip = Math.max(1, Math.floor(mon.maxHp / 18));
        mon.hp = Math.max(1, mon.hp - chip);
        this.updateHudPlates();
        this.setLog(`${getDisplayName(mon)} was singed dashing through fire!`);
        await this.wait(500);
      }
    }

    if (act.type === 'approach') return;

    const slot = act.moveIdx !== undefined ? mon.moves[act.moveIdx] : mon.moves[0];
    const move = slot ? MOVES[slot.moveId] : MOVES.tackle;
    if (!move) return;

    // Double-check live range (e.g., if faster opponent knocked us back with Surf right before our turn!)
    const av = side === 'player' ? this.choreo.playerVisual : this.choreo.enemyVisual;
    const tv = side === 'player' ? this.choreo.enemyVisual : this.choreo.playerVisual;
    const stages = side === 'player' ? this.p1Stages : this.p2Stages;
    const prof = computeMoveScale(mon, move, stages);
    const liveDist = Math.hypot(tv.homeX - av.homeX, tv.homeY - av.homeY);
    const isSelf = move.category === 'status' && move.statChange?.target === 'self';

    if (!isSelf && liveDist > prof.effectiveRangePx + 14) {
      this.setLog(
        `${getDisplayName(mon)} tried ${move.name}, but was knocked out of range!`,
        `(${Math.round(liveDist)}m away vs ${prof.effectiveRangePx}m reach)`
      );
      await this.wait(850);
      return;
    }

    if (slot && slot.pp > 0) slot.pp -= 1;
    await this.performAttack(side, move);
  }

  private async performAttack(side: 'player' | 'enemy', move: MoveData): Promise<void> {
    const attacker = side === 'player' ? this.p1Mon : this.p2Mon;
    const defender = side === 'player' ? this.p2Mon : this.p1Mon;
    const aStages = side === 'player' ? this.p1Stages : this.p2Stages;
    const dStages = side === 'player' ? this.p2Stages : this.p1Stages;
    const av = side === 'player' ? this.choreo.playerVisual : this.choreo.enemyVisual;
    const tv = side === 'player' ? this.choreo.enemyVisual : this.choreo.playerVisual;

    const envSnap = this.getLiveSnapshot();
    const res = resolveMoveExecution({
      attacker,
      defender,
      move,
      attackerStages: aStages,
      defenderStages: dStages,
      attackerSide: side,
      envSnapshot: envSnap,
      grid: this.grid,
      positions: { ax: av.homeX, ay: av.homeY, dx: tv.homeX, dy: tv.homeY },
    });

    if (res.missedReason === 'asleep') {
      this.setLog(`${getDisplayName(attacker)} is fast asleep!`);
      await this.wait(800);
      return;
    }
    if (res.missedReason === 'paralyzed') {
      this.setLog(`${getDisplayName(attacker)} is paralyzed! It can't move!`);
      await this.wait(800);
      return;
    }

    const profile = computeMoveScale(attacker, move, aStages);
    const prefix = this.config.mode === 'pvp' ? (side === 'player' ? 'P1 ' : 'P2 ') : side === 'enemy' ? 'Foe ' : '';
    this.setLog(
      `${prefix}${getDisplayName(attacker)} used ${move.name}!`,
      `${profile.relevantStatName}: ${profile.relevantStat} • Range ${profile.effectiveRangePx}m • Scale ${Math.round(
        profile.scaleFactor * 100
      )}%`
    );
    this.setScaleBanner(
      `${move.name} • ${profile.relevantStatName.toUpperCase()} ${profile.relevantStat} • SCALE ${Math.round(
        profile.scaleFactor * 100
      )}% (${profile.tier.toUpperCase()})`
    );

    soundEngine.playMoveSfx(move, profile);

    await new Promise<void>((resolve) => {
      this.choreo.triggerMove(side, move, profile, {
        onImpact: () => {
          if (res.hit && res.damage > 0) {
            soundEngine.playHit(res.effectiveness, profile.scaleFactor);
            defender.hp = Math.max(0, defender.hp - res.damage);
            if (res.drainHeal > 0) {
              attacker.hp = Math.min(attacker.maxHp, attacker.hp + res.drainHeal);
            }
            this.updateHudPlates();
          }
        },
        onComplete: () => resolve(),
      });
    });

    if (this.destroyed) return;

    if (!res.hit) {
      this.setLog(`${prefix}${getDisplayName(attacker)}'s attack missed!`, res.envMessages[0] ?? '');
      await this.wait(800);
      return;
    }

    const notes: string[] = [];
    if (res.isCrit) notes.push('A critical hit!');
    if (res.effectivenessLabel) notes.push(res.effectivenessLabel);
    if (res.envMessages.length > 0) notes.push(res.envMessages[0]);
    if (move.rootsTarget && defender.hp > 0) {
      notes.push(`${getDisplayName(defender)} was rooted by vines! Movement halved!`);
    }
    if (move.createsPillar) {
      notes.push('A destructible Stone Pillar erupted on the battlefield!');
    }
    if (res.appliedStatus) {
      notes.push(`${getDisplayName(defender)} was afflicted with ${res.appliedStatus.toUpperCase()}!`);
    }
    if (res.statChangeLog) notes.push(res.statChangeLog);
    if (res.drainHeal > 0) notes.push(`${getDisplayName(attacker)} drained energy!`);

    if (notes.length > 0) {
      this.setLog(notes[0], notes.slice(1).join(' '));
      this.updateHudPlates();
      await this.wait(900);
    } else {
      await this.wait(320);
    }
  }

  private async finishRoundEndOfTurn(): Promise<void> {
    if (this.choreo.playerVisual.rootedTurns > 0) this.choreo.playerVisual.rootedTurns--;
    if (this.choreo.enemyVisual.rootedTurns > 0) this.choreo.enemyVisual.rootedTurns--;

    const envEvents = evaluateEndOfTurnEnvironment(
      this.p1Mon,
      this.p2Mon,
      this.grid,
      { x: this.choreo.playerVisual.homeX, y: this.choreo.playerVisual.homeY },
      { x: this.choreo.enemyVisual.homeX, y: this.choreo.enemyVisual.homeY }
    );
    for (const ev of envEvents) {
      const target = ev.side === 'player' ? this.p1Mon : this.p2Mon;
      if (target.hp <= 0) continue;
      target.hp = Math.max(0, Math.min(target.maxHp, target.hp + ev.hpDelta));
      this.updateHudPlates();
      this.setLog(ev.message);
      await this.wait(700);
    }

    for (const mon of [this.p1Mon, this.p2Mon]) {
      const tick = resolveStatusTick(mon);
      if (tick) {
        mon.hp = Math.max(0, mon.hp - tick.damage);
        this.updateHudPlates();
        this.setLog(tick.message);
        await this.wait(700);
      }
    }

    if (this.destroyed) return;
    if (this.p2Mon.hp <= 0) {
      await this.handleSideFainted('enemy');
      return;
    }
    if (this.p1Mon.hp <= 0) {
      await this.handleSideFainted('player');
      return;
    }

    this.setScaleBanner('');
    this.beginTurnSelection('player');
  }

  private async handleSideFainted(faintedSide: 'player' | 'enemy'): Promise<void> {
    if (faintedSide === 'enemy') {
      this.choreo.enemyVisual.alpha = 0.15;
      this.setLog(`${this.config.mode === 'pvp' ? 'P2 ' : 'Foe '}${getDisplayName(this.p2Mon)} fainted!`);
      await this.wait(850);

      // Story XP / Level-Up / Evolution
      if (this.config.mode !== 'pvp' && this.save) {
        const expGain = calculateExpReward(this.p2Mon, this.config.mode === 'trainer');
        const prevName = getDisplayName(this.p1Mon);
        const lvlRes: LevelUpResult = grantExp(this.p1Mon, expGain);
        this.updateHudPlates();
        this.setLog(`${prevName} gained ${expGain} EXP. Points!`);
        await this.wait(850);

        if (lvlRes.levelsGained > 0) {
          soundEngine.playLevelUp();
          this.setLog(
            `${prevName} grew to Lv. ${this.p1Mon.level}!`,
            `Atk ${this.p1Mon.atk} • SpA ${this.p1Mon.spAtk} — moves now have wider reach & scale!`
          );
          this.updateHudPlates();
          await this.wait(1200);
        }
        for (const moveName of lvlRes.learnedMoves) {
          this.setLog(`${getDisplayName(this.p1Mon)} learned ${moveName}!`);
          await this.wait(900);
        }
        if (lvlRes.evolvedFrom && lvlRes.evolvedTo) {
          spriteManager.preload([lvlRes.evolvedTo]);
          recordPokedexCaught(this.save, lvlRes.evolvedTo);
          await this.showEvolutionModal(lvlRes.evolvedFrom, lvlRes.evolvedTo);
          this.updateHudPlates();
        }
      }

      const nextAlive = this.p2Party.findIndex((m) => m.hp > 0);
      if (nextAlive >= 0) {
        if (this.config.mode === 'pvp') {
          this.choosingSide = 'enemy';
          this.openPartyModal(true);
          return;
        }
        await this.performSwitch('enemy', nextAlive);
        if (this.save) recordPokedexSeen(this.save, this.p2Mon.speciesId);
        this.beginTurnSelection('player');
        return;
      }

      if (this.config.mode === 'pvp') {
        this.showPvpVictoryModal('PLAYER 1 (RED)');
        return;
      }

      // Story Victory!
      if (this.config.mode === 'trainer' && this.config.trainer && this.save) {
        const tr = this.config.trainer;
        this.save.money += tr.rewardMoney;
        if (!this.save.defeatedTrainers.includes(tr.id)) this.save.defeatedTrainers.push(tr.id);
        if (tr.rewardBadge && !this.save.badges.includes(tr.rewardBadge)) {
          this.save.badges.push(tr.rewardBadge);
          if (tr.id === 'gym_brock') this.save.flags.badge_boulder = true;
          if (tr.id === 'gym_misty') this.save.flags.badge_cascade = true;
        }
        if (tr.rewardItem) addInventoryItem(this.save, tr.rewardItem.itemId, tr.rewardItem.quantity);
        soundEngine.playLevelUp();
        this.setLog(
          `Defeated ${tr.title} ${tr.name}! Won ₽${tr.rewardMoney}!`,
          tr.rewardBadge ? `Earned the ${tr.rewardBadge}!` : ''
        );
        await this.wait(1500);
      } else {
        await this.wait(450);
      }
      this.onFinish({ result: 'win', trainerId: this.config.trainer?.id });
    } else {
      this.choreo.playerVisual.alpha = 0.15;
      this.setLog(`${this.config.mode === 'pvp' ? 'P1 ' : ''}${getDisplayName(this.p1Mon)} fainted!`);
      await this.wait(850);

      const hasAlive = this.p1Party.some((m) => m.hp > 0);
      if (hasAlive) {
        this.choosingSide = 'player';
        this.openPartyModal(true);
      } else if (this.config.mode === 'pvp') {
        this.showPvpVictoryModal('PLAYER 2 (BLUE)');
      } else {
        this.setLog('You are out of usable POKéMON!', 'Scurrying back to safety to heal...');
        await this.wait(1400);
        this.onFinish({ result: 'lose' });
      }
    }
  }

  private showPvpVictoryModal(winnerName: string): void {
    const slot = this.container.querySelector('#battle-modal-slot');
    if (!slot) return;
    soundEngine.playEvolutionFanfare();

    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="gba-box modal-card" style="max-width:480px;">
          <div class="evo-flash">
            <div style="font-family:var(--font-pixel);font-size:14px;color:#78350f;margin-bottom:10px;">
              ${winnerName} WINS!
            </div>
            <p style="font-size:11px;color:#1c1917;line-height:1.6;">
              What an elemental showdown! Play an instant rematch or draft fresh Kanto squads!
            </p>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:14px;">
              <button class="pixel-btn primary" id="pvp-rematch">REMATCH</button>
              <button class="pixel-btn gold" id="pvp-edit">EDIT TEAMS</button>
              <button class="pixel-btn dark" id="pvp-title">TITLE SCREEN</button>
            </div>
          </div>
        </div>
      </div>
    `;

    slot.querySelector('#pvp-rematch')?.addEventListener('click', () => {
      soundEngine.playConfirm();
      this.onFinish({ result: 'pvp_rematch' });
    });
    slot.querySelector('#pvp-edit')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.onFinish({ result: 'pvp_edit' });
    });
    slot.querySelector('#pvp-title')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.onFinish({ result: 'pvp_exit' });
    });
  }

  private async handleRun(): Promise<void> {
    if (this.config.mode !== 'wild') return;
    this.menuMode = 'busy';
    this.renderDeck();
    this.setLog('Got away safely!');
    await this.wait(650);
    this.onFinish({ result: 'fled' });
  }

  private openBagModal(): void {
    if (!this.save) return;
    const slot = this.container.querySelector('#battle-modal-slot');
    if (!slot) return;

    const usable = this.save.inventory.filter((inv) => {
      const it = ITEMS[inv.itemId];
      return it && it.category !== 'candy' && inv.quantity > 0;
    });

    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="gba-box modal-card">
          <div class="modal-header">
            <span class="modal-title">TRAINER BAG</span>
            <button class="pixel-btn sm dark" id="close-bag">CLOSE</button>
          </div>
          <div class="modal-body">
            ${
              usable.length === 0
                ? `<p style="font-size:11px;">Your bag has no usable battle items.</p>`
                : usable
                    .map((inv) => {
                      const it = ITEMS[inv.itemId];
                      const disabled = it.category === 'ball' && this.config.mode !== 'wild';
                      return `
                        <div class="item-row">
                          <div style="display:flex;align-items:center;gap:10px;">
                            <img class="item-icon-img" src="${getOfficialItemUrl(it.id)}" alt="${it.name}" />
                            <div>
                              <div style="font-family:var(--font-pixel);font-size:10px;">${it.name} ×${inv.quantity}</div>
                              <div style="font-size:10px;color:#475569;margin-top:3px;">${it.description}</div>
                            </div>
                          </div>
                          <button class="pixel-btn sm primary" data-use-item="${it.id}" ${disabled ? 'disabled' : ''}>
                            ${it.category === 'ball' ? 'THROW' : 'USE'}
                          </button>
                        </div>
                      `;
                    })
                    .join('')
            }
          </div>
        </div>
      </div>
    `;

    slot.querySelector('#close-bag')?.addEventListener('click', () => {
      soundEngine.playBlip();
      slot.innerHTML = '';
    });

    slot.querySelectorAll('[data-use-item]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = (btn as HTMLElement).dataset.useItem!;
        slot.innerHTML = '';
        this.useBattleItem(itemId);
      });
    });
  }

  private async useBattleItem(itemId: string): Promise<void> {
    if (!this.save) return;
    const item = ITEMS[itemId];
    if (!item || !consumeInventoryItem(this.save, itemId, 1)) return;

    this.menuMode = 'busy';
    this.renderDeck();

    if (item.category === 'ball') {
      if (this.config.mode !== 'wild') return;
      this.setLog(`You threw a ${item.name}!`);
      soundEngine.playPokeballThrow();

      const attempt = calculateCatchAttempt(this.p2Mon, item.id);
      const ballStyle =
        item.id === 'great_ball' ? 'great_ball' : item.id === 'ultra_ball' ? 'ultra_ball' : 'poke_ball';

      const caught = await new Promise<boolean>((resolve) => {
        this.choreo.triggerPokeballThrow(ballStyle, attempt.shakes, attempt.caught, {
          onShake: () => soundEngine.playPokeballShake(),
          onComplete: (ok) => resolve(ok),
        });
      });

      if (caught) {
        soundEngine.playCatchSuccess();
        recordPokedexCaught(this.save, this.p2Mon.speciesId);
        if (this.save.party.length < 6) {
          this.save.party.push(this.p2Mon);
          this.setLog(`Gotcha! ${getDisplayName(this.p2Mon)} was caught!`, 'Added to your Party!');
        } else {
          this.save.pcBox.push(this.p2Mon);
          this.setLog(`Gotcha! ${getDisplayName(this.p2Mon)} was caught!`, 'Sent to Bill’s PC Box!');
        }
        await this.wait(1400);
        this.onFinish({ result: 'caught' });
        return;
      } else {
        this.setLog(`Oh no! The wild ${getDisplayName(this.p2Mon)} broke free!`);
        await this.wait(850);
      }
    } else if (item.category === 'heal' && item.healAmount) {
      const before = this.p1Mon.hp;
      this.p1Mon.hp = Math.min(this.p1Mon.maxHp, this.p1Mon.hp + item.healAmount);
      soundEngine.playHealJingle();
      this.updateHudPlates();
      this.setLog(`Used ${item.name} on ${getDisplayName(this.p1Mon)}!`, `Restored ${this.p1Mon.hp - before} HP!`);
      await this.wait(900);
    } else if (item.category === 'status') {
      this.p1Mon.status = 'none';
      this.p1Mon.sleepTurns = 0;
      soundEngine.playConfirm();
      this.updateHudPlates();
      this.setLog(`${getDisplayName(this.p1Mon)}'s status was cured!`);
      await this.wait(800);
    }

    // Enemy gets its tactical turn after item use
    const aiDec = chooseAiDecision(
      this.p2Mon,
      this.p1Mon,
      this.p2Stages,
      { x: this.choreo.enemyVisual.homeX, y: this.choreo.enemyVisual.homeY },
      { x: this.choreo.playerVisual.homeX, y: this.choreo.playerVisual.homeY },
      this.getLiveSnapshot(),
      this.choreo.enemyVisual.rootedTurns > 0
    );
    await this.executeQueuedSideAction(
      'enemy',
      aiDec.onlyApproach
        ? { type: 'approach', stepDest: aiDec.stepTo }
        : {
            type: 'move',
            moveIdx: Math.max(0, this.p2Mon.moves.findIndex((m) => m.moveId === aiDec.move.id)),
            stepDest: aiDec.stepTo,
          }
    );
    if (this.p1Mon.hp <= 0) {
      await this.handleSideFainted('player');
      return;
    }
    await this.finishRoundEndOfTurn();
  }

  private openPartyModal(forcedSwitch: boolean): void {
    const slot = this.container.querySelector('#battle-modal-slot');
    if (!slot) return;

    const side = this.choosingSide;
    const party = side === 'player' ? this.p1Party : this.p2Party;
    const activeIdx = side === 'player' ? this.p1Idx : this.p2Idx;

    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="gba-box modal-card">
          <div class="modal-header">
            <span class="modal-title">${forcedSwitch ? 'SEND OUT NEXT POKéMON' : 'SWITCH POKéMON'}</span>
            ${forcedSwitch ? '' : `<button class="pixel-btn sm dark" id="close-party">CLOSE</button>`}
          </div>
          <div class="modal-body">
            <div class="party-list">
              ${party
                .map((mon, idx) => {
                  const isCurrent = idx === activeIdx;
                  const canSwitch = mon.hp > 0 && !isCurrent;
                  return `
                    <div class="party-card ${mon.hp <= 0 ? 'fainted' : ''}">
                      <img class="party-thumb-img" src="${getOfficialSpriteUrl(mon.speciesId)}" alt="${getDisplayName(mon)}" />
                      <div style="flex:1;min-width:0;">
                        <div style="font-family:var(--font-pixel);font-size:9px;">${getDisplayName(mon)} Lv.${mon.level}</div>
                        <div style="font-size:10px;color:#475569;margin-top:3px;">HP ${mon.hp}/${mon.maxHp} • SpA ${mon.spAtk}</div>
                      </div>
                      <button class="pixel-btn sm ${canSwitch ? 'primary' : 'dark'}" data-sw-idx="${idx}" ${canSwitch ? '' : 'disabled'}>
                        ${isCurrent ? 'ACTIVE' : 'SEND'}
                      </button>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    slot.querySelector('#close-party')?.addEventListener('click', () => {
      soundEngine.playBlip();
      slot.innerHTML = '';
    });

    slot.querySelectorAll('[data-sw-idx]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nextIdx = Number((btn as HTMLElement).dataset.swIdx);
        slot.innerHTML = '';
        soundEngine.playConfirm();

        if (forcedSwitch) {
          await this.performSwitch(side, nextIdx);
          this.beginTurnSelection('player');
        } else if (this.config.mode === 'pvp') {
          this.submitChosenAction({ type: 'switch', switchIdx: nextIdx });
        } else {
          this.menuMode = 'busy';
          this.renderDeck();
          await this.performSwitch('player', nextIdx);
          const aiDec = chooseAiDecision(
            this.p2Mon,
            this.p1Mon,
            this.p2Stages,
            { x: this.choreo.enemyVisual.homeX, y: this.choreo.enemyVisual.homeY },
            { x: this.choreo.playerVisual.homeX, y: this.choreo.playerVisual.homeY },
            this.getLiveSnapshot(),
            this.choreo.enemyVisual.rootedTurns > 0
          );
          await this.executeQueuedSideAction(
            'enemy',
            aiDec.onlyApproach
              ? { type: 'approach', stepDest: aiDec.stepTo }
              : {
                  type: 'move',
                  moveIdx: Math.max(0, this.p2Mon.moves.findIndex((m) => m.moveId === aiDec.move.id)),
                  stepDest: aiDec.stepTo,
                }
          );
          if (this.p1Mon.hp <= 0) {
            await this.handleSideFainted('player');
            return;
          }
          await this.finishRoundEndOfTurn();
        }
      });
    });
  }

  private showEvolutionModal(fromId: string, toId: string): Promise<void> {
    return new Promise((resolve) => {
      const slot = this.container.querySelector('#battle-modal-slot');
      if (!slot) {
        resolve();
        return;
      }
      soundEngine.playEvolutionFanfare();
      const fromName = SPECIES[fromId]?.name ?? fromId;
      const toName = SPECIES[toId]?.name ?? toId;

      slot.innerHTML = `
        <div class="modal-backdrop">
          <div class="gba-box modal-card" style="max-width:460px;">
            <div class="evo-flash">
              <div style="font-family:var(--font-pixel);font-size:12px;color:#78350f;margin-bottom:10px;">
                WHAT?! ${fromName} IS EVOLVING!
              </div>
              <img src="${getOfficialSpriteUrl(toId)}" alt="${toName}" style="width:96px;height:96px;image-rendering:pixelated;margin:0 auto 10px;display:block;" />
              <div style="font-family:var(--font-pixel);font-size:11px;color:#1c1917;line-height:1.7;">
                Congratulations! Your ${fromName} evolved into ${toName}!
              </div>
              <div style="font-size:11px;color:#451a03;margin-top:6px;">
                Its elemental moves now have dramatically wider reach, power, and scale!
              </div>
              <button class="pixel-btn primary" id="evo-ok" style="margin-top:14px;">AWESOME!</button>
            </div>
          </div>
        </div>
      `;

      slot.querySelector('#evo-ok')?.addEventListener('click', () => {
        soundEngine.playConfirm();
        slot.innerHTML = '';
        resolve();
      });
    });
  }

  private buildTacticalOverlay(): TacticalOverlayState | undefined {
    if (this.menuMode === 'move_step') {
      return {
        actorX: this.actorVisual.homeX,
        actorY: this.actorVisual.homeY,
        moveRadius: this.getActorMoveBudget(),
        hoverDestX: this.hoverArenaPos?.x,
        hoverDestY: this.hoverArenaPos?.y,
      };
    }

    if (this.menuMode === 'moves' && this.hoveredMoveIdx !== null) {
      const slot = this.actorMon.moves[this.hoveredMoveIdx];
      const move = slot ? MOVES[slot.moveId] : null;
      if (move) {
        const prof = computeMoveScale(this.actorMon, move, this.actorStages);
        const usedStep = this.choosingSide === 'player' ? this.p1UsedFreeStep : this.p2UsedFreeStep;
        const budget = usedStep ? 0 : this.getActorMoveBudget();
        const reach = evaluateMoveReach(
          this.actorVisual.homeX,
          this.actorVisual.homeY,
          this.targetVisual.homeX,
          this.targetVisual.homeY,
          move,
          prof,
          budget
        );
        return {
          actorX: this.actorVisual.homeX,
          actorY: this.actorVisual.homeY,
          rangeRadius: prof.effectiveRangePx,
          rangeStatus: reach.status,
        };
      }
    }

    return undefined;
  }

  private loop = (ts: number): void => {
    const dt = Math.max(0, Math.min(0.05, (ts - this.lastTs) / 1000));
    this.lastTs = ts;

    this.choreo.step(dt);

    if (this.canvas) {
      const pSp = SPECIES[this.p1Mon.speciesId];
      const eSp = SPECIES[this.p2Mon.speciesId];
      this.renderer.render(this.canvas, this.choreo, {
        player: spriteManager.getSprite(this.p1Mon.speciesId),
        enemy: spriteManager.getSprite(this.p2Mon.speciesId),
        playerScale: pSp?.spriteScale ?? 1,
        enemyScale: eSp?.spriteScale ?? 1,
        tacticalOverlay: this.buildTacticalOverlay(),
      });
    }

    const distEl = this.container.querySelector('#battle-dist-chip');
    if (distEl) {
      const d = Math.round(this.choreo.getDistanceBetweenFighters());
      const txt = `DIST: ${d}m`;
      if (distEl.textContent !== txt) distEl.textContent = txt;
    }

    const envEl = this.container.querySelector('#battle-env-tags');
    if (envEl) {
      const snap = this.getLiveSnapshot();
      const html = snap.activeTags
        .map((tag) => `<span class="env-chip ${tag}">${ENV_LABELS[tag]}</span>`)
        .join('');
      if (envEl.innerHTML !== html) envEl.innerHTML = html;
    }

    this.rafId = requestAnimationFrame(this.loop);
  };
}
