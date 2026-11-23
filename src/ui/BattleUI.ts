import { ITEMS } from '../data/items';
import { MOVES } from '../data/moves';
import { createPokemon, expForLevel, getDisplayName, grantExp, LevelUpResult } from '../data/pokemonFactory';
import { SPECIES } from '../data/species';
import { TYPE_COLORS } from '../data/typeChart';
import { soundEngine } from '../engine/audio/soundEngine';
import {
  calculateCatchAttempt,
  calculateExpReward,
  chooseAiMove,
  createDefaultStages,
  determineTurnOrder,
  resolveMoveExecution,
  resolveStatusTick,
} from '../engine/battle/battleEngine';
import { evaluateEndOfTurnEnvironment } from '../engine/battle/environmentRules';
import { computeMoveScale } from '../engine/battle/moveScaling';
import { ARENA_H, ARENA_W, ArenaGrid } from '../engine/physics/arenaGrid';
import { ArenaRenderer } from '../engine/physics/arenaRenderer';
import { MoveChoreographer } from '../engine/physics/moveChoreographer';
import { ParticleSystem } from '../engine/physics/particleSystem';
import {
  addInventoryItem,
  consumeInventoryItem,
  recordPokedexCaught,
  recordPokedexSeen,
} from '../engine/save/saveManager';
import { spriteManager } from '../engine/sprites/spriteManager';
import {
  ArenaBiomeId,
  EnvConditionTag,
  MoveData,
  PokemonInstance,
  SaveState,
  StatStages,
  TrainerData,
} from '../types/game';

export interface BattleConfig {
  mode: 'wild' | 'trainer';
  biome: ArenaBiomeId;
  wildPokemon?: PokemonInstance;
  trainer?: TrainerData;
}

export interface BattleOutcome {
  result: 'win' | 'lose' | 'caught' | 'fled';
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
};

type DeckMenuMode = 'root' | 'moves' | 'bag' | 'party' | 'busy' | 'evolution';

/**
 * Full turn-based Pokémon FireRed Battle Screen paired with the live 192x108
 * pixel-physics battlefield, tactical environmental interactions, catching, XP, and evolution!
 */
export class BattleUI {
  private container: HTMLElement;
  private save: SaveState;
  private config: BattleConfig;
  private onFinish: (outcome: BattleOutcome) => void;

  private grid: ArenaGrid;
  private particles: ParticleSystem;
  private choreo: MoveChoreographer;
  private renderer: ArenaRenderer;

  private rafId: number | null = null;
  private lastTs = 0;
  private canvas: HTMLCanvasElement | null = null;

  private playerIdx = 0;
  private enemyParty: PokemonInstance[] = [];
  private enemyIdx = 0;

  private playerStages: StatStages = createDefaultStages();
  private enemyStages: StatStages = createDefaultStages();

  private menuMode: DeckMenuMode = 'busy';
  private logMain = '';
  private logSub = '';
  private scaleBanner = '';
  private destroyed = false;

  constructor(
    container: HTMLElement,
    save: SaveState,
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

    // Pick first conscious player Pokémon
    const aliveIdx = this.save.party.findIndex((p) => p.hp > 0);
    this.playerIdx = aliveIdx >= 0 ? aliveIdx : 0;

    if (config.mode === 'trainer' && config.trainer) {
      this.enemyParty = config.trainer.party.map((spec) =>
        createPokemon(spec.speciesId, spec.level, { customMoves: spec.customMoves })
      );
    } else if (config.wildPokemon) {
      this.enemyParty = [config.wildPokemon];
    } else {
      this.enemyParty = [createPokemon('pidgey', 4)];
    }

    for (const mon of [...this.save.party, ...this.enemyParty]) {
      spriteManager.preload([mon.speciesId]);
    }
    recordPokedexSeen(this.save, this.enemyParty[0].speciesId);
  }

  private get playerMon(): PokemonInstance {
    return this.save.party[this.playerIdx];
  }

  private get enemyMon(): PokemonInstance {
    return this.enemyParty[this.enemyIdx];
  }

  public mount(): void {
    soundEngine.playMusic(this.config.trainer?.isGymLeader ? 'boss' : 'battle');
    this.renderShell();
    this.lastTs = performance.now();
    this.loop(this.lastTs);

    const intro =
      this.config.mode === 'trainer' && this.config.trainer
        ? `${this.config.trainer.title} ${this.config.trainer.name} sent out ${getDisplayName(this.enemyMon)}!`
        : `A wild ${getDisplayName(this.enemyMon)} (Lv.${this.enemyMon.level}) appeared!`;

    this.setLog(intro, `Go! ${getDisplayName(this.playerMon)}!`);
    this.wait(950).then(() => {
      if (this.destroyed) return;
      this.menuMode = 'root';
      this.setLog(`What will ${getDisplayName(this.playerMon)} do?`, 'Choose an action below.');
      this.renderDeck();
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

  private renderShell(): void {
    this.container.innerHTML = `
      <div class="battle-screen">
        <div class="top-bar">
          <div class="top-bar-left">
            <span class="location-pill">
              ${
                this.config.mode === 'trainer' && this.config.trainer
                  ? `${this.config.trainer.title} ${this.config.trainer.name}`
                  : 'WILD ENCOUNTER'
              }
            </span>
            <span class="stat-chip">ARENA: ${this.config.biome.replace('_', ' ').toUpperCase()}</span>
          </div>
          <div class="top-bar-actions">
            <button class="pixel-btn sm dark" id="btn-battle-mute">
              ${soundEngine.isMuted() ? 'AUDIO: OFF' : 'AUDIO: ON'}
            </button>
          </div>
        </div>

        <div class="battle-arena-wrap">
          <canvas class="battle-canvas" id="battle-canvas" width="${ARENA_W * 4}" height="${ARENA_H * 4}"></canvas>

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
    this.container.querySelector('#btn-battle-mute')?.addEventListener('click', () => {
      soundEngine.toggleMute();
      const b = this.container.querySelector('#btn-battle-mute');
      if (b) b.textContent = soundEngine.isMuted() ? 'AUDIO: OFF' : 'AUDIO: ON';
    });

    this.updateHudPlates();
    this.renderDeck();
  }

  private setLog(main: string, sub = ''): void {
    this.logMain = main;
    this.logSub = sub;
    const mEl = this.container.querySelector('#battle-log-main');
    const sEl = this.container.querySelector('#battle-log-sub');
    if (mEl) mEl.textContent = main;
    if (sEl) sEl.textContent = sub;
  }

  private setScaleBanner(text: string): void {
    this.scaleBanner = text;
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
    const p = this.playerMon;
    const e = this.enemyMon;
    const pEl = this.container.querySelector('#hud-player');
    const eEl = this.container.querySelector('#hud-enemy');

    if (pEl && p) {
      const pct = Math.max(0, Math.min(100, (p.hp / Math.max(1, p.maxHp)) * 100));
      const hpClass = pct <= 22 ? 'low' : pct <= 50 ? 'mid' : '';
      const curFloor = expForLevel(p.level);
      const nextFloor = expForLevel(Math.min(100, p.level + 1));
      const xpPct =
        p.level >= 100 ? 100 : Math.max(0, Math.min(100, ((p.exp - curFloor) / Math.max(1, nextFloor - curFloor)) * 100));

      pEl.innerHTML = `
        <div class="plate-row">
          <span class="plate-name">${getDisplayName(p)}</span>
          ${p.status !== 'none' ? `<span class="status-badge ${p.status}">${p.status.slice(0, 3).toUpperCase()}</span>` : ''}
          <span class="plate-lvl">Lv.${p.level}</span>
        </div>
        <div class="hp-bar-track">
          <div class="hp-bar-fill ${hpClass}" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <div class="hp-nums">
          <span>HP ${p.hp}/${p.maxHp}</span>
          <span>SpA ${p.spAtk}</span>
        </div>
        <div class="xp-bar-track">
          <div class="xp-bar-fill" style="width:${xpPct.toFixed(1)}%"></div>
        </div>
      `;
    }

    if (eEl && e) {
      const pct = Math.max(0, Math.min(100, (e.hp / Math.max(1, e.maxHp)) * 100));
      const hpClass = pct <= 22 ? 'low' : pct <= 50 ? 'mid' : '';
      const partyDots =
        this.config.mode === 'trainer'
          ? `<div class="party-balls">${this.enemyParty
              .map((m) => `<span class="party-ball-dot ${m.hp <= 0 ? 'fainted' : ''}"></span>`)
              .join('')}</div>`
          : '';

      eEl.innerHTML = `
        <div class="plate-row">
          <span class="plate-name">${getDisplayName(e)}</span>
          ${e.status !== 'none' ? `<span class="status-badge ${e.status}">${e.status.slice(0, 3).toUpperCase()}</span>` : ''}
          <span class="plate-lvl">Lv.${e.level}</span>
        </div>
        <div class="hp-bar-track">
          <div class="hp-bar-fill ${hpClass}" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <div class="hp-nums">
          <span>HP ${e.hp}/${e.maxHp}</span>
          ${partyDots}
        </div>
      `;
    }
  }

  private renderDeck(): void {
    const pane = this.container.querySelector('#battle-action-pane');
    if (!pane) return;

    if (this.menuMode === 'busy') {
      pane.innerHTML = `
        <div class="gba-box" style="flex:1;display:flex;align-items:center;justify-content:center;padding:12px;">
          <span style="font-family:var(--font-pixel);font-size:10px;color:#64748b;">BATTLE IN PROGRESS...</span>
        </div>
      `;
      return;
    }

    if (this.menuMode === 'root') {
      pane.innerHTML = `
        <div class="battle-action-grid" style="flex:1;">
          <button class="pixel-btn primary" id="act-fight">FIGHT</button>
          <button class="pixel-btn gold" id="act-bag">BAG</button>
          <button class="pixel-btn" id="act-party">POKéMON</button>
          <button class="pixel-btn dark" id="act-run" ${this.config.mode === 'trainer' ? 'disabled' : ''}>RUN</button>
        </div>
      `;
      pane.querySelector('#act-fight')?.addEventListener('click', () => {
        soundEngine.playBlip();
        this.menuMode = 'moves';
        this.renderDeck();
      });
      pane.querySelector('#act-bag')?.addEventListener('click', () => {
        soundEngine.playBlip();
        this.openBagModal();
      });
      pane.querySelector('#act-party')?.addEventListener('click', () => {
        soundEngine.playBlip();
        this.openPartyModal(false);
      });
      pane.querySelector('#act-run')?.addEventListener('click', () => {
        soundEngine.playBlip();
        this.handleRun();
      });
      return;
    }

    if (this.menuMode === 'moves') {
      const p = this.playerMon;
      pane.innerHTML = `
        <div class="battle-action-grid" style="flex:1;">
          ${p.moves
            .map((slot, idx) => {
              const m = MOVES[slot.moveId];
              if (!m) return '';
              const tc = TYPE_COLORS[m.type];
              const prof = computeMoveScale(p, m, this.playerStages);
              return `
                <button class="move-btn" data-move-idx="${idx}" ${slot.pp <= 0 ? 'disabled' : ''}>
                  <div class="move-btn-head">
                    <span class="move-btn-name">${m.name}</span>
                    <span class="type-pill" style="background:${tc.bg};color:${tc.text};">${m.type}</span>
                  </div>
                  <div class="move-btn-meta">
                    <span>PP ${slot.pp}/${slot.maxPp}</span>
                    <span>SCALE ${Math.round(prof.scaleFactor * 100)}%</span>
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
        this.menuMode = 'root';
        this.renderDeck();
      });

      pane.querySelectorAll('[data-move-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number((btn as HTMLElement).dataset.moveIdx);
          soundEngine.playConfirm();
          this.executePlayerTurnMove(idx);
        });
      });
    }
  }

  private async executePlayerTurnMove(moveIdx: number): Promise<void> {
    const slot = this.playerMon.moves[moveIdx];
    const pMove = slot ? MOVES[slot.moveId] : MOVES.tackle;
    if (!pMove) return;

    this.menuMode = 'busy';
    this.renderDeck();

    const envSnap = this.grid.getSnapshot();
    const eMove = chooseAiMove(this.enemyMon, this.playerMon, envSnap);
    const order = determineTurnOrder(
      this.playerMon,
      pMove,
      this.playerStages,
      this.enemyMon,
      eMove,
      this.enemyStages
    );

    for (const side of order) {
      if (this.destroyed) return;
      if (this.playerMon.hp <= 0 || this.enemyMon.hp <= 0) break;

      if (side === 'player') {
        if (slot && slot.pp > 0) slot.pp -= 1;
        await this.performAttack('player', pMove);
      } else {
        const eSlot = this.enemyMon.moves.find((m) => m.moveId === eMove.id);
        if (eSlot && eSlot.pp > 0) eSlot.pp -= 1;
        await this.performAttack('enemy', eMove);
      }

      if (this.enemyMon.hp <= 0) {
        await this.handleEnemyFainted();
        return;
      }
      if (this.playerMon.hp <= 0) {
        await this.handlePlayerFainted();
        return;
      }
    }

    await this.runEndOfTurnEffects();
    if (this.destroyed) return;

    if (this.enemyMon.hp <= 0) {
      await this.handleEnemyFainted();
      return;
    }
    if (this.playerMon.hp <= 0) {
      await this.handlePlayerFainted();
      return;
    }

    this.setScaleBanner('');
    this.menuMode = 'root';
    this.setLog(`What will ${getDisplayName(this.playerMon)} do?`, 'Environmental effects remain on the floor!');
    this.renderDeck();
  }

  private async performAttack(side: 'player' | 'enemy', move: MoveData): Promise<void> {
    const attacker = side === 'player' ? this.playerMon : this.enemyMon;
    const defender = side === 'player' ? this.enemyMon : this.playerMon;
    const aStages = side === 'player' ? this.playerStages : this.enemyStages;
    const dStages = side === 'player' ? this.enemyStages : this.playerStages;

    const envSnap = this.grid.getSnapshot();
    const res = resolveMoveExecution({
      attacker,
      defender,
      move,
      attackerStages: aStages,
      defenderStages: dStages,
      attackerSide: side,
      envSnapshot: envSnap,
    });

    if (res.missedReason === 'asleep') {
      this.setLog(`${getDisplayName(attacker)} is fast asleep!`);
      await this.wait(850);
      return;
    }
    if (res.missedReason === 'paralyzed') {
      this.setLog(`${getDisplayName(attacker)} is paralyzed! It can't move!`);
      await this.wait(850);
      return;
    }

    const profile = computeMoveScale(attacker, move, aStages);
    const prefix = side === 'enemy' ? 'Foe ' : '';
    this.setLog(
      `${prefix}${getDisplayName(attacker)} used ${move.name}!`,
      `${profile.relevantStatName}: ${profile.relevantStat} • Scale ${Math.round(profile.scaleFactor * 100)}%`
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
      await this.wait(850);
      return;
    }

    // Report effectiveness, critical hit, environmental chain reactions, & status!
    const notes: string[] = [];
    if (res.isCrit) notes.push('A critical hit!');
    if (res.effectivenessLabel) notes.push(res.effectivenessLabel);
    if (res.envMessages.length > 0) notes.push(res.envMessages[0]);
    if (res.appliedStatus) {
      notes.push(`${getDisplayName(defender)} was afflicted with ${res.appliedStatus.toUpperCase()}!`);
    }
    if (res.statChangeLog) notes.push(res.statChangeLog);
    if (res.drainHeal > 0) notes.push(`${getDisplayName(attacker)} drained energy!`);

    if (notes.length > 0) {
      this.setLog(notes[0], notes.slice(1).join(' '));
      this.updateHudPlates();
      await this.wait(950);
    } else {
      await this.wait(350);
    }
  }

  private async runEndOfTurnEffects(): Promise<void> {
    // 1. Environmental hazards (burning ground chip / overgrown grass heal)
    const envEvents = evaluateEndOfTurnEnvironment(this.playerMon, this.enemyMon, this.grid);
    for (const ev of envEvents) {
      const target = ev.side === 'player' ? this.playerMon : this.enemyMon;
      if (target.hp <= 0) continue;
      target.hp = Math.max(0, Math.min(target.maxHp, target.hp + ev.hpDelta));
      this.updateHudPlates();
      this.setLog(ev.message);
      await this.wait(750);
    }

    // 2. Burn / Poison ticks
    for (const mon of [this.playerMon, this.enemyMon]) {
      const tick = resolveStatusTick(mon);
      if (tick) {
        mon.hp = Math.max(0, mon.hp - tick.damage);
        this.updateHudPlates();
        this.setLog(tick.message);
        await this.wait(750);
      }
    }
  }

  private async handleEnemyFainted(): Promise<void> {
    this.choreo.enemyVisual.alpha = 0.15;
    this.setLog(`Foe ${getDisplayName(this.enemyMon)} fainted!`);
    await this.wait(850);

    // Grant XP & check level-ups / evolution!
    const expGain = calculateExpReward(this.enemyMon, this.config.mode === 'trainer');
    const prevSpeciesName = getDisplayName(this.playerMon);
    const lvlRes: LevelUpResult = grantExp(this.playerMon, expGain);
    this.updateHudPlates();

    this.setLog(`${prevSpeciesName} gained ${expGain} EXP. Points!`);
    await this.wait(850);

    if (lvlRes.levelsGained > 0) {
      soundEngine.playLevelUp();
      this.setLog(
        `${prevSpeciesName} grew to Lv. ${this.playerMon.level}!`,
        `Attack ${this.playerMon.atk} • Sp. Atk ${this.playerMon.spAtk} — its moves are even bigger!`
      );
      this.updateHudPlates();
      await this.wait(1250);
    }

    for (const moveName of lvlRes.learnedMoves) {
      this.setLog(`${getDisplayName(this.playerMon)} learned ${moveName}!`);
      await this.wait(950);
    }

    if (lvlRes.evolvedFrom && lvlRes.evolvedTo) {
      spriteManager.preload([lvlRes.evolvedTo]);
      recordPokedexCaught(this.save, lvlRes.evolvedTo);
      await this.showEvolutionModal(lvlRes.evolvedFrom, lvlRes.evolvedTo);
      this.updateHudPlates();
    }

    // Check if Trainer has another Pokémon!
    const nextIdx = this.enemyParty.findIndex((m) => m.hp > 0);
    if (nextIdx >= 0) {
      this.enemyIdx = nextIdx;
      this.enemyStages = createDefaultStages();
      this.choreo.enemyVisual.alpha = 1;
      recordPokedexSeen(this.save, this.enemyMon.speciesId);
      this.updateHudPlates();
      this.setLog(
        `${this.config.trainer?.title ?? 'Trainer'} ${this.config.trainer?.name ?? ''} sent out ${getDisplayName(
          this.enemyMon
        )}!`
      );
      await this.wait(950);
      this.menuMode = 'root';
      this.setLog(`What will ${getDisplayName(this.playerMon)} do?`);
      this.renderDeck();
      return;
    }

    // Victory!
    if (this.config.mode === 'trainer' && this.config.trainer) {
      const tr = this.config.trainer;
      this.save.money += tr.rewardMoney;
      if (!this.save.defeatedTrainers.includes(tr.id)) {
        this.save.defeatedTrainers.push(tr.id);
      }
      if (tr.rewardBadge && !this.save.badges.includes(tr.rewardBadge)) {
        this.save.badges.push(tr.rewardBadge);
        if (tr.id === 'gym_brock') this.save.flags.badge_boulder = true;
        if (tr.id === 'gym_misty') this.save.flags.badge_cascade = true;
      }
      if (tr.rewardItem) {
        addInventoryItem(this.save, tr.rewardItem.itemId, tr.rewardItem.quantity);
      }
      soundEngine.playLevelUp();
      this.setLog(
        `Defeated ${tr.title} ${tr.name}! Won ₽${tr.rewardMoney}!`,
        tr.rewardBadge ? `Earned the ${tr.rewardBadge}!` : ''
      );
      await this.wait(1500);
    } else {
      await this.wait(500);
    }

    this.onFinish({ result: 'win', trainerId: this.config.trainer?.id });
  }

  private async handlePlayerFainted(): Promise<void> {
    this.choreo.playerVisual.alpha = 0.15;
    this.setLog(`${getDisplayName(this.playerMon)} fainted!`);
    await this.wait(950);

    const hasAlive = this.save.party.some((m) => m.hp > 0);
    if (hasAlive) {
      this.openPartyModal(true);
    } else {
      this.setLog('You are out of usable POKéMON!', 'Scurrying back to safety to heal...');
      await this.wait(1400);
      this.onFinish({ result: 'lose' });
    }
  }

  private async handleRun(): Promise<void> {
    if (this.config.mode === 'trainer') return;
    this.menuMode = 'busy';
    this.renderDeck();
    this.setLog('Got away safely!');
    await this.wait(700);
    this.onFinish({ result: 'fled' });
  }

  private openBagModal(): void {
    const slot = this.container.querySelector('#battle-modal-slot');
    if (!slot) return;

    const usable = this.save.inventory.filter((inv) => {
      const it = ITEMS[inv.itemId];
      if (!it) return false;
      if (it.category === 'candy') return false;
      return inv.quantity > 0;
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
                      const disabled = it.category === 'ball' && this.config.mode === 'trainer';
                      return `
                        <div class="item-row">
                          <div>
                            <div style="font-family:var(--font-pixel);font-size:10px;">${it.name} ×${inv.quantity}</div>
                            <div style="font-size:10px;color:#475569;margin-top:3px;">${it.description}</div>
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
    const item = ITEMS[itemId];
    if (!item || !consumeInventoryItem(this.save, itemId, 1)) return;

    this.menuMode = 'busy';
    this.renderDeck();

    if (item.category === 'ball') {
      if (this.config.mode === 'trainer') return;
      this.setLog(`You threw a ${item.name}!`);
      soundEngine.playPokeballThrow();

      const attempt = calculateCatchAttempt(this.enemyMon, item.id);
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
        recordPokedexCaught(this.save, this.enemyMon.speciesId);
        if (this.save.party.length < 6) {
          this.save.party.push(this.enemyMon);
          this.setLog(`Gotcha! ${getDisplayName(this.enemyMon)} was caught!`, 'Added to your Party!');
        } else {
          this.save.pcBox.push(this.enemyMon);
          this.setLog(`Gotcha! ${getDisplayName(this.enemyMon)} was caught!`, 'Sent to Bill’s PC Box!');
        }
        await this.wait(1500);
        this.onFinish({ result: 'caught' });
        return;
      } else {
        this.setLog(`Oh no! The wild ${getDisplayName(this.enemyMon)} broke free!`);
        await this.wait(900);
      }
    } else if (item.category === 'heal' && item.healAmount) {
      const before = this.playerMon.hp;
      this.playerMon.hp = Math.min(this.playerMon.maxHp, this.playerMon.hp + item.healAmount);
      soundEngine.playHealJingle();
      this.updateHudPlates();
      this.setLog(
        `Used ${item.name} on ${getDisplayName(this.playerMon)}!`,
        `Restored ${this.playerMon.hp - before} HP!`
      );
      await this.wait(950);
    } else if (item.category === 'status') {
      this.playerMon.status = 'none';
      this.playerMon.sleepTurns = 0;
      soundEngine.playConfirm();
      this.updateHudPlates();
      this.setLog(`${getDisplayName(this.playerMon)}'s status was cured!`);
      await this.wait(850);
    }

    // Enemy gets its turn after item use
    const eMove = chooseAiMove(this.enemyMon, this.playerMon, this.grid.getSnapshot());
    await this.performAttack('enemy', eMove);
    if (this.playerMon.hp <= 0) {
      await this.handlePlayerFainted();
      return;
    }
    await this.runEndOfTurnEffects();
    this.menuMode = 'root';
    this.setLog(`What will ${getDisplayName(this.playerMon)} do?`);
    this.renderDeck();
  }

  private openPartyModal(forcedSwitch: boolean): void {
    const slot = this.container.querySelector('#battle-modal-slot');
    if (!slot) return;

    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="gba-box modal-card">
          <div class="modal-header">
            <span class="modal-title">${forcedSwitch ? 'CHOOSE NEXT POKéMON' : 'SWITCH POKéMON'}</span>
            ${forcedSwitch ? '' : `<button class="pixel-btn sm dark" id="close-party">CLOSE</button>`}
          </div>
          <div class="modal-body">
            <div class="party-list">
              ${this.save.party
                .map((mon, idx) => {
                  const isCurrent = idx === this.playerIdx;
                  const canSwitch = mon.hp > 0 && !isCurrent;
                  return `
                    <div class="party-card ${mon.hp <= 0 ? 'fainted' : ''}">
                      <canvas class="party-thumb" id="pt-thumb-${idx}" width="44" height="44"></canvas>
                      <div style="flex:1;min-width:0;">
                        <div style="font-family:var(--font-pixel);font-size:9px;">${getDisplayName(mon)} Lv.${mon.level}</div>
                        <div style="font-size:10px;color:#475569;margin-top:3px;">HP ${mon.hp}/${mon.maxHp} • SpA ${mon.spAtk}</div>
                      </div>
                      <button class="pixel-btn sm ${canSwitch ? 'primary' : 'dark'}" data-sw-idx="${idx}" ${
                    canSwitch ? '' : 'disabled'
                  }>
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

    this.save.party.forEach((mon, idx) => {
      const c = slot.querySelector(`#pt-thumb-${idx}`) as HTMLCanvasElement | null;
      if (c) {
        const ctx = c.getContext('2d');
        const sp = spriteManager.getSprite(mon.speciesId);
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(sp.canvas, 4, 4, 36, 36);
        }
      }
    });

    slot.querySelector('#close-party')?.addEventListener('click', () => {
      soundEngine.playBlip();
      slot.innerHTML = '';
    });

    slot.querySelectorAll('[data-sw-idx]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nextIdx = Number((btn as HTMLElement).dataset.swIdx);
        slot.innerHTML = '';
        soundEngine.playConfirm();
        this.playerIdx = nextIdx;
        this.playerStages = createDefaultStages();
        this.choreo.playerVisual.alpha = 1;
        this.updateHudPlates();
        this.menuMode = 'busy';
        this.renderDeck();
        this.setLog(`Go! ${getDisplayName(this.playerMon)}!`);
        await this.wait(800);

        if (!forcedSwitch) {
          const eMove = chooseAiMove(this.enemyMon, this.playerMon, this.grid.getSnapshot());
          await this.performAttack('enemy', eMove);
          if (this.playerMon.hp <= 0) {
            await this.handlePlayerFainted();
            return;
          }
          await this.runEndOfTurnEffects();
        }
        this.menuMode = 'root';
        this.setLog(`What will ${getDisplayName(this.playerMon)} do?`);
        this.renderDeck();
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
              <canvas id="evo-canvas" width="96" height="96" style="margin:0 auto 10px;"></canvas>
              <div style="font-family:var(--font-pixel);font-size:11px;color:#1c1917;line-height:1.7;">
                Congratulations! Your ${fromName} evolved into ${toName}!
              </div>
              <div style="font-size:11px;color:#451a03;margin-top:6px;">
                Its elemental moves are now dramatically larger and more powerful!
              </div>
              <button class="pixel-btn primary" id="evo-ok" style="margin-top:14px;">AWESOME!</button>
            </div>
          </div>
        </div>
      `;

      const c = slot.querySelector('#evo-canvas') as HTMLCanvasElement | null;
      if (c) {
        const ctx = c.getContext('2d');
        const sp = spriteManager.getSprite(toId);
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(sp.canvas, 8, 8, 80, 80);
        }
      }

      slot.querySelector('#evo-ok')?.addEventListener('click', () => {
        soundEngine.playConfirm();
        slot.innerHTML = '';
        resolve();
      });
    });
  }

  private loop = (ts: number): void => {
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
    this.lastTs = ts;

    this.choreo.step(dt);

    if (this.canvas) {
      const pSp = SPECIES[this.playerMon.speciesId];
      const eSp = SPECIES[this.enemyMon.speciesId];
      this.renderer.render(this.canvas, this.choreo, {
        player: spriteManager.getSprite(this.playerMon.speciesId),
        enemy: spriteManager.getSprite(this.enemyMon.speciesId),
        playerScale: pSp?.spriteScale ?? 1,
        enemyScale: eSp?.spriteScale ?? 1,
      });
    }

    // Update live environmental condition badges
    const envEl = this.container.querySelector('#battle-env-tags');
    if (envEl) {
      const snap = this.grid.getSnapshot();
      const html = snap.activeTags
        .map((tag) => `<span class="env-chip ${tag}">${ENV_LABELS[tag]}</span>`)
        .join('');
      if (envEl.innerHTML !== html) {
        envEl.innerHTML = html;
      }
    }

    this.rafId = requestAnimationFrame(this.loop);
  };
}
