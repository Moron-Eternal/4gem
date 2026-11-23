import { ITEMS, MART_STOCK_CERULEAN, MART_STOCK_VIRIDIAN } from '../data/items';
import { MOVES } from '../data/moves';
import { createPokemon, expForLevel, getDisplayName, grantExp, healPokemon } from '../data/pokemonFactory';
import { SPECIES, SPECIES_LIST } from '../data/species';
import { resolveTrainerData } from '../data/trainers';
import { TYPE_COLORS } from '../data/typeChart';
import { soundEngine } from '../engine/audio/soundEngine';
import {
  OVERWORLD_VIEW_H,
  OVERWORLD_VIEW_W,
  OverworldEngine,
} from '../engine/overworld/overworldEngine';
import {
  addInventoryItem,
  consumeInventoryItem,
  recordPokedexCaught,
  saveGame,
} from '../engine/save/saveManager';
import { getOfficialItemUrl, getOfficialSpriteUrl, spriteManager } from '../engine/sprites/spriteManager';
import { Direction, MapDefinition, NpcEntity, SaveState } from '../types/game';
import { playBattleStartTransition } from './BattleTransition';
import { BattleConfig } from './BattleUI';

export interface OverworldUICallbacks {
  onStartBattle: (config: BattleConfig) => void;
  onOpenLab: () => void;
  onReturnTitle: () => void;
}

export class OverworldUI {
  private container: HTMLElement;
  private save: SaveState;
  private callbacks: OverworldUICallbacks;

  private engine: OverworldEngine;
  private canvas: HTMLCanvasElement | null = null;
  private rafId: number | null = null;
  private lastTs = 0;
  private transitioning = false;

  private dialogueQueue: string[] = [];
  private dialogueDoneCb: (() => void) | null = null;
  private modalOpen = false;

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, save: SaveState, callbacks: OverworldUICallbacks) {
    this.container = container;
    this.save = save;
    this.callbacks = callbacks;

    this.engine = new OverworldEngine(save, {
      onWarpBlocked: (msg) => {
        soundEngine.playBlip();
        this.showDialogue([msg]);
      },
      onMapChanged: (map) => {
        soundEngine.playBlip();
        this.updateTopBar();
        soundEngine.playMusic(map.musicTrack);
        saveGame(this.save);
        this.showToast(`${map.name} — ${map.subtitle}`);
      },
      onInteractNpc: (npc) => this.handleNpcInteract(npc),
      onReadSign: (lines) => {
        soundEngine.playBlip();
        this.showDialogue(lines);
      },
      onWildEncounter: (speciesId, level, map) => {
        const wild = createPokemon(speciesId, level);
        this.triggerTransitionToBattle('wild', {
          mode: 'wild',
          biome: map.arenaBiome,
          wildPokemon: wild,
        });
      },
      onTrainerSpotted: (npc) => {
        if (!npc.trainerId) return;
        const tr = resolveTrainerData(npc.trainerId, this.save.starterId);
        soundEngine.playConfirm();
        this.showDialogue(tr.introDialogue, () => {
          this.triggerTransitionToBattle(tr.isGymLeader ? 'boss' : 'trainer', {
            mode: 'trainer',
            biome: tr.arenaBiome,
            trainer: tr,
          });
        });
      },
    });

    this.keyDownHandler = (e) => this.onKeyDown(e);
    this.keyUpHandler = (e) => this.onKeyUp(e);
  }

  private async triggerTransitionToBattle(
    style: 'wild' | 'trainer' | 'boss',
    config: BattleConfig
  ): Promise<void> {
    if (this.transitioning) return;
    this.transitioning = true;
    this.engine.paused = true;
    this.engine.clearInputs();
    const stage = (this.container.querySelector('.overworld-stage') as HTMLElement) ?? this.container;
    await playBattleStartTransition(stage, style);
    this.callbacks.onStartBattle(config);
  }

  public mount(initialMessage?: string[]): void {
    const map = this.engine.getCurrentMap();
    soundEngine.playMusic(map.musicTrack);
    spriteManager.preloadCommonItems();

    this.container.innerHTML = `
      <div class="top-bar">
        <div class="top-bar-left">
          <span class="location-pill" id="ow-map-name">${map.name}</span>
          <span class="stat-chip" id="ow-money">₽${this.save.money}</span>
          <span class="stat-chip" id="ow-badges">BADGES: ${this.save.badges.length}</span>
        </div>
        <div class="top-bar-actions">
          <button class="pixel-btn sm" id="ow-btn-party">PARTY (${this.save.party.length})</button>
          <button class="pixel-btn sm" id="ow-btn-bag">BAG</button>
          <button class="pixel-btn sm" id="ow-btn-dex">DEX (${this.save.pokedexCaught.length})</button>
          <button class="pixel-btn sm gold" id="ow-btn-lab">BATTLE LAB</button>
          <button class="pixel-btn sm dark" id="ow-btn-save">SAVE</button>
          <button class="pixel-btn sm dark" id="ow-btn-bgm">BGM: ${soundEngine.isMusicEnabled() ? 'ON' : 'OFF'}</button>
          <button class="pixel-btn sm dark" id="ow-btn-sfx">SFX: ${soundEngine.isSfxEnabled() ? 'ON' : 'OFF'}</button>
        </div>
      </div>

      <div class="overworld-stage">
        <canvas
          class="overworld-canvas"
          id="overworld-canvas"
          width="${OVERWORLD_VIEW_W * 3}"
          height="${OVERWORLD_VIEW_H * 3}"
        ></canvas>

        <div class="gba-box dialogue-overlay" id="ow-dialogue" style="display:none;">
          <div class="dialogue-text" id="ow-dialogue-text"></div>
          <div class="dialogue-next">▼ PRESS SPACE / CLICK</div>
        </div>

        <div class="touch-controls" id="ow-touch">
          <div class="touch-dpad">
            <div></div>
            <button class="touch-key" data-dir="up">▲</button>
            <div></div>
            <button class="touch-key" data-dir="left">◀</button>
            <div></div>
            <button class="touch-key" data-dir="right">▶</button>
            <div></div>
            <button class="touch-key" data-dir="down">▼</button>
            <div></div>
          </div>
          <div class="touch-ab">
            <button class="touch-key round" id="touch-a">A</button>
          </div>
        </div>

        <div id="ow-modal-slot"></div>
      </div>

      <div class="controls-hint-bar">
        <span id="ow-objective"></span>
        <span>WASD / Arrows: Move • Space / Z: Interact • X: Party</span>
      </div>
    `;

    this.canvas = this.container.querySelector('#overworld-canvas');
    this.updateTopBar();
    this.bindEvents();

    if (initialMessage && initialMessage.length > 0) {
      this.showDialogue(initialMessage);
    } else if (!this.save.flags.seen_intro) {
      this.save.flags.seen_intro = true;
      this.showDialogue([
        'Welcome to PALLET TOWN! Head southeast into PROF. OAK’S LAB to choose your first POKéMON!',
        'In battle, reposition tactically around elemental hazards—and watch your moves expand in range and power as you evolve!',
      ]);
    }

    this.lastTs = performance.now();
    this.loop(this.lastTs);
  }

  public unmount(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.engine.clearInputs();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);

    this.container.querySelector('#ow-dialogue')?.addEventListener('click', () => this.advanceDialogue());
    this.container.querySelector('#ow-btn-party')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.openPartyModal();
    });
    this.container.querySelector('#ow-btn-bag')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.openBagModal();
    });
    this.container.querySelector('#ow-btn-dex')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.openPokedexModal();
    });
    this.container.querySelector('#ow-btn-lab')?.addEventListener('click', () => {
      soundEngine.playConfirm();
      saveGame(this.save);
      this.callbacks.onOpenLab();
    });
    this.container.querySelector('#ow-btn-save')?.addEventListener('click', () => {
      const ok = saveGame(this.save);
      soundEngine.playConfirm();
      this.showDialogue([ok ? 'RED saved the game! Your Kanto journey is safely stored.' : 'Could not access browser storage.']);
    });
    this.container.querySelector('#ow-btn-bgm')?.addEventListener('click', () => {
      const on = soundEngine.toggleMusic();
      const btn = this.container.querySelector('#ow-btn-bgm');
      if (btn) btn.textContent = `BGM: ${on ? 'ON' : 'OFF'}`;
    });
    this.container.querySelector('#ow-btn-sfx')?.addEventListener('click', () => {
      const on = soundEngine.toggleSfx();
      const btn = this.container.querySelector('#ow-btn-sfx');
      if (btn) btn.textContent = `SFX: ${on ? 'ON' : 'OFF'}`;
    });

    this.container.querySelectorAll('[data-dir]').forEach((el) => {
      const dir = (el as HTMLElement).dataset.dir as Direction;
      const start = (e: Event) => {
        e.preventDefault();
        this.engine.setDirectionHeld(dir, true);
      };
      const end = (e: Event) => {
        e.preventDefault();
        this.engine.setDirectionHeld(dir, false);
      };
      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointerleave', end);
      el.addEventListener('pointercancel', end);
    });
    this.container.querySelector('#touch-a')?.addEventListener('click', () => {
      if (this.dialogueQueue.length > 0) this.advanceDialogue();
      else this.engine.interactFacing();
    });
  }

  private mapKeyToDir(key: string): Direction | null {
    switch (key) {
      case 'ArrowUp': case 'w': case 'W': return 'up';
      case 'ArrowDown': case 's': case 'S': return 'down';
      case 'ArrowLeft': case 'a': case 'A': return 'left';
      case 'ArrowRight': case 'd': case 'D': return 'right';
      default: return null;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.transitioning) return;
    const dir = this.mapKeyToDir(e.key);
    if (dir) {
      e.preventDefault();
      if (!this.modalOpen && this.dialogueQueue.length === 0) {
        this.engine.setDirectionHeld(dir, true);
      }
      return;
    }

    if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      if (this.dialogueQueue.length > 0) this.advanceDialogue();
      else if (!this.modalOpen) this.engine.interactFacing();
    } else if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      if (this.modalOpen) this.closeModal();
      else if (this.dialogueQueue.length === 0) this.openPartyModal();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const dir = this.mapKeyToDir(e.key);
    if (dir) this.engine.setDirectionHeld(dir, false);
  }

  private updateTopBar(): void {
    const map: MapDefinition = this.engine.getCurrentMap();
    const mapEl = this.container.querySelector('#ow-map-name');
    const moneyEl = this.container.querySelector('#ow-money');
    const badgeEl = this.container.querySelector('#ow-badges');
    const partyBtn = this.container.querySelector('#ow-btn-party');
    const dexBtn = this.container.querySelector('#ow-btn-dex');
    const objEl = this.container.querySelector('#ow-objective');

    if (mapEl) mapEl.textContent = map.name;
    if (moneyEl) moneyEl.textContent = `₽${this.save.money}`;
    if (badgeEl) badgeEl.textContent = `BADGES: ${this.save.badges.length}`;
    if (partyBtn) partyBtn.textContent = `PARTY (${this.save.party.length})`;
    if (dexBtn) dexBtn.textContent = `DEX (${this.save.pokedexCaught.length})`;

    if (objEl) {
      let goal = 'GOAL: Visit PROF. OAK’S LAB (southeast Pallet Town) to choose your starter!';
      if (!this.save.flags.has_starter) {
        goal = 'GOAL: Visit PROF. OAK’S LAB (southeast Pallet Town) to choose your starter!';
      } else if (!this.save.defeatedTrainers.includes('rival_lab')) {
        goal = 'GOAL: Battle RIVAL BLUE inside Oak’s Lab, then head north to Route 1!';
      } else if (!this.save.flags.badge_boulder) {
        goal = 'GOAL: Travel north through Viridian Forest to challenge BROCK in Pewter Gym!';
      } else if (!this.save.flags.badge_cascade) {
        goal = 'GOAL: Head east through Route 3 to Cerulean City & defeat MISTY for the Cascade Badge!';
      } else if (!this.save.defeatedTrainers.includes('rival_cerulean')) {
        goal = 'GOAL: Cross Nugget Bridge north of Cerulean City for the RIVAL BLUE FINALE!';
      } else {
        goal = 'KANTO CHAMPION! Catch ’em all, evolve your team, or play 2P Co-Op VS!';
      }
      objEl.textContent = goal;
    }
  }

  private showToast(msg: string): void {
    const objEl = this.container.querySelector('#ow-objective');
    if (objEl) objEl.textContent = msg;
    window.setTimeout(() => this.updateTopBar(), 2600);
  }

  private showDialogue(lines: string[], onDone?: () => void): void {
    this.dialogueQueue = [...lines];
    this.dialogueDoneCb = onDone ?? null;
    this.engine.paused = true;
    this.engine.clearInputs();
    this.renderDialogue();
  }

  private renderDialogue(): void {
    const box = this.container.querySelector('#ow-dialogue') as HTMLElement | null;
    const textEl = this.container.querySelector('#ow-dialogue-text');
    if (!box || !textEl) return;

    if (this.dialogueQueue.length === 0) {
      box.style.display = 'none';
      if (!this.modalOpen && !this.transitioning) this.engine.paused = false;
      const cb = this.dialogueDoneCb;
      this.dialogueDoneCb = null;
      cb?.();
      return;
    }

    box.style.display = 'block';
    textEl.textContent = this.dialogueQueue[0];
  }

  private advanceDialogue(): void {
    soundEngine.playBlip();
    this.dialogueQueue.shift();
    this.renderDialogue();
  }

  private handleNpcInteract(npc: NpcEntity): void {
    soundEngine.playBlip();

    if (npc.role === 'heal') {
      for (const mon of this.save.party) healPokemon(mon);
      soundEngine.playHealJingle();
      saveGame(this.save);
      this.showDialogue(npc.dialogue);
      return;
    }

    if (npc.role === 'mart') {
      this.showDialogue(npc.dialogue, () => this.openMartModal());
      return;
    }

    if (npc.role === 'oak') {
      if (!this.save.flags.has_starter) {
        this.showDialogue(npc.dialogue, () => this.openStarterModal());
      } else {
        this.showDialogue([
          `PROF. OAK: Your POKéDEX shows ${this.save.pokedexCaught.length} species caught so far!`,
          'PROF. OAK: Watch how your partner’s attacks expand in reach and scale once it evolves!',
        ]);
      }
      return;
    }

    if (npc.role === 'starter_table' && !this.save.flags.has_starter) {
      this.openStarterModal(npc.starterSpeciesId);
      return;
    }

    // Human NPC who gifts an item once and stays on the map permanently!
    if (npc.role === 'item_giver' && npc.pickupItem) {
      if (!this.save.collectedItems.includes(npc.id)) {
        this.save.collectedItems.push(npc.id);
        addInventoryItem(this.save, npc.pickupItem.itemId, npc.pickupItem.quantity);
        soundEngine.playLevelUp();
        saveGame(this.save);
        this.showDialogue(npc.dialogue);
      } else {
        this.showDialogue(npc.postPickupDialogue ?? npc.dialogue);
      }
      return;
    }

    // Ground Poké Ball pickup
    if (npc.role === 'item_pickup' && npc.pickupItem) {
      if (!this.save.collectedItems.includes(npc.id)) {
        this.save.collectedItems.push(npc.id);
        addInventoryItem(this.save, npc.pickupItem.itemId, npc.pickupItem.quantity);
        soundEngine.playLevelUp();
        saveGame(this.save);
        this.showDialogue(npc.dialogue);
      }
      return;
    }

    if (npc.role === 'trainer' && npc.trainerId) {
      const tr = resolveTrainerData(npc.trainerId, this.save.starterId);
      if (this.save.defeatedTrainers.includes(tr.id)) {
        this.showDialogue(tr.postBattleDialogue);
      } else if (!this.save.party.some((m) => m.hp > 0)) {
        this.showDialogue(['You need a healthy POKéMON before battling! Visit MOM or a POKéMON CENTER!']);
      } else {
        this.showDialogue(tr.introDialogue, () => {
          this.triggerTransitionToBattle(tr.isGymLeader ? 'boss' : 'trainer', {
            mode: 'trainer',
            biome: tr.arenaBiome,
            trainer: tr,
          });
        });
      }
      return;
    }

    this.showDialogue(npc.dialogue);
  }

  private closeModal(): void {
    const slot = this.container.querySelector('#ow-modal-slot');
    if (slot) slot.innerHTML = '';
    this.modalOpen = false;
    if (this.dialogueQueue.length === 0 && !this.transitioning) {
      this.engine.paused = false;
    }
    this.updateTopBar();
  }

  private openStarterModal(preselect?: 'bulbasaur' | 'charmander' | 'squirtle'): void {
    const slot = this.container.querySelector('#ow-modal-slot');
    if (!slot) return;
    this.modalOpen = true;
    this.engine.paused = true;
    this.engine.clearInputs();

    const starters: Array<{ id: 'bulbasaur' | 'charmander' | 'squirtle'; pitch: string }> = [
      {
        id: 'bulbasaur',
        pitch: 'GRASS/POISON • Vine Whip snares foes in place & Razor Leaf overgrows the arena!',
      },
      {
        id: 'charmander',
        pitch: 'FIRE • Close-range Scratch & small Embers grow into CHARIZARD’s full-arena Flamethrower!',
      },
      {
        id: 'squirtle',
        pitch: 'WATER • Gap-closing Tackle & Surf waves that swell into BLASTOISE’s knockback tsunamis!',
      },
    ];

    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="gba-box modal-card">
          <div class="modal-header">
            <span class="modal-title">CHOOSE YOUR FIRST POKéMON!</span>
            <button class="pixel-btn sm dark" id="st-cancel">CANCEL</button>
          </div>
          <div class="modal-body">
            <div class="starter-grid">
              ${starters
                .map((st) => {
                  const sp = SPECIES[st.id];
                  const tc = TYPE_COLORS[sp.types[0]];
                  const highlight = preselect === st.id ? 'border-color:#d93829;background:#fffbeb;' : '';
                  return `
                    <div class="starter-card" data-pick-starter="${st.id}" style="${highlight}">
                      <img class="starter-preview" src="${getOfficialSpriteUrl(st.id)}" alt="${sp.name}" />
                      <div style="font-family:var(--font-pixel);font-size:11px;">${sp.name}</div>
                      <span class="type-pill" style="background:${tc.bg};color:${tc.text};">${sp.types.join(' / ')}</span>
                      <p style="font-size:10px;line-height:1.45;color:#334155;">${st.pitch}</p>
                      <button class="pixel-btn sm primary" style="width:100%;">CHOOSE ${sp.name}</button>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    slot.querySelector('#st-cancel')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.closeModal();
    });

    slot.querySelectorAll('[data-pick-starter]').forEach((card) => {
      card.addEventListener('click', () => {
        const pickedId = (card as HTMLElement).dataset.pickStarter as 'bulbasaur' | 'charmander' | 'squirtle';
        const starter = createPokemon(pickedId, 5);
        this.save.starterId = pickedId;
        this.save.party = [starter];
        this.save.flags.has_starter = true;
        recordPokedexCaught(this.save, pickedId);
        soundEngine.playLevelUp();
        saveGame(this.save);
        this.closeModal();
        this.showDialogue([
          `RED received ${SPECIES[pickedId].name} (Lv. 5) from PROF. OAK!`,
          'PROF. OAK: Wonderful choice! Step south—BLUE wants a quick match before you head to Route 1!',
        ]);
      });
    });
  }

  private openMartModal(): void {
    const slot = this.container.querySelector('#ow-modal-slot');
    if (!slot) return;
    this.modalOpen = true;
    this.engine.paused = true;
    this.engine.clearInputs();

    const stockIds = this.save.mapId === 'cerulean_city' ? MART_STOCK_CERULEAN : MART_STOCK_VIRIDIAN;

    const render = () => {
      slot.innerHTML = `
        <div class="modal-backdrop">
          <div class="gba-box modal-card">
            <div class="modal-header">
              <span class="modal-title">POKé MART • FUNDS: ₽${this.save.money}</span>
              <button class="pixel-btn sm dark" id="mart-close">DONE</button>
            </div>
            <div class="modal-body">
              ${stockIds
                .map((id) => {
                  const it = ITEMS[id];
                  const owned = this.save.inventory.find((i) => i.itemId === id)?.quantity ?? 0;
                  const canAfford = this.save.money >= it.price;
                  return `
                    <div class="item-row">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <img class="item-icon-img" src="${getOfficialItemUrl(it.id)}" alt="${it.name}" />
                        <div>
                          <div style="font-family:var(--font-pixel);font-size:10px;">
                            ${it.name} <span style="color:#64748b;">(Owned: ${owned})</span>
                          </div>
                          <div style="font-size:10px;color:#475569;margin-top:3px;">${it.description}</div>
                        </div>
                      </div>
                      <button class="pixel-btn sm primary" data-buy="${id}" ${canAfford ? '' : 'disabled'}>
                        BUY ₽${it.price}
                      </button>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        </div>
      `;

      slot.querySelector('#mart-close')?.addEventListener('click', () => {
        soundEngine.playBlip();
        saveGame(this.save);
        this.closeModal();
      });

      slot.querySelectorAll('[data-buy]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = (btn as HTMLElement).dataset.buy!;
          const it = ITEMS[id];
          if (!it || this.save.money < it.price) return;
          this.save.money -= it.price;
          addInventoryItem(this.save, id, 1);
          soundEngine.playConfirm();
          this.updateTopBar();
          render();
        });
      });
    };

    render();
  }

  private openPartyModal(): void {
    const slot = this.container.querySelector('#ow-modal-slot');
    if (!slot) return;
    this.modalOpen = true;
    this.engine.paused = true;
    this.engine.clearInputs();

    const rareCandyQty = () => this.save.inventory.find((i) => i.itemId === 'rare_candy')?.quantity ?? 0;
    const potionQty = () => this.save.inventory.find((i) => i.itemId === 'potion')?.quantity ?? 0;

    const render = () => {
      slot.innerHTML = `
        <div class="modal-backdrop">
          <div class="gba-box modal-card">
            <div class="modal-header">
              <span class="modal-title">POKéMON PARTY (${this.save.party.length}/6)</span>
              <button class="pixel-btn sm dark" id="party-close">CLOSE</button>
            </div>
            <div class="modal-body">
              ${
                this.save.party.length === 0
                  ? `<p style="font-size:11px;">No POKéMON yet! Visit PROF. OAK’S LAB in Pallet Town.</p>`
                  : `<div class="party-list">
                      ${this.save.party
                        .map((mon, idx) => {
                          const sp = SPECIES[mon.speciesId];
                          const moveNames = mon.moves
                            .map((m) => MOVES[m.moveId]?.name ?? m.moveId)
                            .join(', ');
                          return `
                            <div class="party-card ${mon.hp <= 0 ? 'fainted' : ''}" style="flex-direction:column;align-items:stretch;">
                              <div style="display:flex;align-items:center;gap:10px;">
                                <img class="party-thumb-img" src="${getOfficialSpriteUrl(mon.speciesId)}" alt="${getDisplayName(mon)}" />
                                <div style="flex:1;min-width:0;">
                                  <div style="font-family:var(--font-pixel);font-size:9px;">
                                    ${idx === 0 ? '★ ' : ''}${getDisplayName(mon)} Lv.${mon.level}
                                  </div>
                                  <div style="font-size:10px;color:#334155;margin-top:3px;">
                                    HP ${mon.hp}/${mon.maxHp} • Atk ${mon.atk} • SpA ${mon.spAtk}
                                  </div>
                                  <div style="font-size:9px;color:#64748b;margin-top:2px;">
                                    ${sp?.types.join('/').toUpperCase()} • ${moveNames}
                                  </div>
                                </div>
                              </div>
                              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                ${idx > 0 ? `<button class="pixel-btn sm" data-lead="${idx}">SET LEAD</button>` : ''}
                                ${
                                  potionQty() > 0 && mon.hp > 0 && mon.hp < mon.maxHp
                                    ? `<button class="pixel-btn sm" data-heal="${idx}">POTION (${potionQty()})</button>`
                                    : ''
                                }
                                ${
                                  rareCandyQty() > 0 && mon.level < 100
                                    ? `<button class="pixel-btn sm gold" data-candy="${idx}">RARE CANDY (${rareCandyQty()})</button>`
                                    : ''
                                }
                              </div>
                            </div>
                          `;
                        })
                        .join('')}
                    </div>`
              }
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding-top:8px;border-top:2px solid #cbd5e1;">
                <span style="font-size:10px;color:#475569;">PC Box Stored: ${this.save.pcBox.length}</span>
                <button class="pixel-btn sm dark" id="btn-to-title">TITLE SCREEN</button>
              </div>
            </div>
          </div>
        </div>
      `;

      slot.querySelector('#party-close')?.addEventListener('click', () => {
        soundEngine.playBlip();
        this.closeModal();
      });

      slot.querySelector('#btn-to-title')?.addEventListener('click', () => {
        soundEngine.playBlip();
        saveGame(this.save);
        this.closeModal();
        this.callbacks.onReturnTitle();
      });

      slot.querySelectorAll('[data-lead]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number((btn as HTMLElement).dataset.lead);
          const [picked] = this.save.party.splice(idx, 1);
          this.save.party.unshift(picked);
          soundEngine.playConfirm();
          saveGame(this.save);
          render();
        });
      });

      slot.querySelectorAll('[data-heal]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number((btn as HTMLElement).dataset.heal);
          const mon = this.save.party[idx];
          if (!mon || !consumeInventoryItem(this.save, 'potion', 1)) return;
          mon.hp = Math.min(mon.maxHp, mon.hp + 25);
          soundEngine.playHealJingle();
          saveGame(this.save);
          render();
        });
      });

      slot.querySelectorAll('[data-candy]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number((btn as HTMLElement).dataset.candy);
          const mon = this.save.party[idx];
          if (!mon || mon.level >= 100 || !consumeInventoryItem(this.save, 'rare_candy', 1)) return;
          const needed = Math.max(1, expForLevel(mon.level + 1) - mon.exp);
          const res = grantExp(mon, needed);
          soundEngine.playLevelUp();
          if (res.evolvedTo) {
            spriteManager.preload([res.evolvedTo]);
            recordPokedexCaught(this.save, res.evolvedTo);
            soundEngine.playEvolutionFanfare();
            saveGame(this.save);
            this.closeModal();
            this.showDialogue([
              `Whoa!! ${SPECIES[res.evolvedFrom!]?.name} evolved into ${SPECIES[res.evolvedTo]?.name} (Lv.${mon.level})!`,
              `Its elemental moves now have dramatically wider range and power in battle!`,
            ]);
            return;
          }
          saveGame(this.save);
          render();
        });
      });
    };

    render();
  }

  private openBagModal(): void {
    const slot = this.container.querySelector('#ow-modal-slot');
    if (!slot) return;
    this.modalOpen = true;
    this.engine.paused = true;
    this.engine.clearInputs();

    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="gba-box modal-card">
          <div class="modal-header">
            <span class="modal-title">TRAINER BAG • ₽${this.save.money}</span>
            <button class="pixel-btn sm dark" id="ow-bag-close">CLOSE</button>
          </div>
          <div class="modal-body">
            ${
              this.save.inventory.length === 0
                ? `<p style="font-size:11px;">Your bag is empty! Visit a Poké Mart in Viridian or Cerulean City.</p>`
                : this.save.inventory
                    .map((inv) => {
                      const it = ITEMS[inv.itemId];
                      if (!it) return '';
                      return `
                        <div class="item-row">
                          <div style="display:flex;align-items:center;gap:10px;">
                            <img class="item-icon-img" src="${getOfficialItemUrl(it.id)}" alt="${it.name}" />
                            <div>
                              <div style="font-family:var(--font-pixel);font-size:10px;">${it.name} ×${inv.quantity}</div>
                              <div style="font-size:10px;color:#475569;margin-top:3px;">${it.description}</div>
                            </div>
                          </div>
                        </div>
                      `;
                    })
                    .join('')
            }
            <p style="font-size:10px;color:#0f766e;">Tip: Use Potions and Rare Candies from the PARTY menu, and throw Poké Balls during wild encounters!</p>
          </div>
        </div>
      </div>
    `;

    slot.querySelector('#ow-bag-close')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.closeModal();
    });
  }

  private openPokedexModal(): void {
    const slot = this.container.querySelector('#ow-modal-slot');
    if (!slot) return;
    this.modalOpen = true;
    this.engine.paused = true;
    this.engine.clearInputs();

    slot.innerHTML = `
      <div class="modal-backdrop">
        <div class="gba-box modal-card">
          <div class="modal-header">
            <span class="modal-title">KANTO POKéDEX • CAUGHT ${this.save.pokedexCaught.length}/${SPECIES_LIST.length}</span>
            <button class="pixel-btn sm dark" id="dex-close">CLOSE</button>
          </div>
          <div class="modal-body">
            <div class="party-list">
              ${SPECIES_LIST.map((sp) => {
                const caught = this.save.pokedexCaught.includes(sp.id);
                const seen = this.save.pokedexSeen.includes(sp.id);
                return `
                  <div class="party-card" style="opacity:${seen ? 1 : 0.55};">
                    ${
                      seen
                        ? `<img class="party-thumb-img" src="${getOfficialSpriteUrl(sp.id)}" alt="${sp.name}" />`
                        : `<div class="party-thumb-img" style="display:flex;align-items:center;justify-content:center;font-family:var(--font-pixel);font-size:14px;color:#94a3b8;">?</div>`
                    }
                    <div style="flex:1;min-width:0;">
                      <div style="font-family:var(--font-pixel);font-size:9px;">
                        #${String(sp.dexNumber).padStart(3, '0')} ${seen ? sp.name : '?????'} ${caught ? '●' : ''}
                      </div>
                      <div style="font-size:9px;color:#475569;margin-top:3px;line-height:1.35;">
                        ${seen ? sp.pokedexEntry : 'Explore Kanto routes & tall grass to discover!'}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    slot.querySelector('#dex-close')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.closeModal();
    });
  }

  private loop = (ts: number): void => {
    const dt = Math.max(0, Math.min(0.05, (ts - this.lastTs) / 1000));
    this.lastTs = ts;

    this.engine.step(dt);
    if (this.canvas) {
      this.engine.render(this.canvas);
    }

    this.rafId = requestAnimationFrame(this.loop);
  };
}
