import { MOVES } from '../data/moves';
import { createPokemon } from '../data/pokemonFactory';
import { SPECIES, SPECIES_LIST } from '../data/species';
import { TYPE_COLORS } from '../data/typeChart';
import { soundEngine } from '../engine/audio/soundEngine';
import { getBattleTrainerSprite } from '../engine/overworld/characterSprites';
import { getOfficialSpriteUrl, spriteManager } from '../engine/sprites/spriteManager';
import { ArenaBiomeId, PvpMatchConfig } from '../types/game';

interface DraftSlot {
  speciesId: string;
  level: number;
  moves: string[];
}

const ALL_MOVE_LIST = Object.values(MOVES);

const PVP_PRESETS: Array<{
  label: string;
  biome: ArenaBiomeId;
  p1: DraftSlot[];
  p2: DraftSlot[];
}> = [
  {
    label: 'KANTO STARTERS (Lv.36)',
    biome: 'gym_floor',
    p1: [
      { speciesId: 'charizard', level: 36, moves: ['flamethrower', 'wing_attack', 'scratch', 'earthquake'] },
      { speciesId: 'pikachu', level: 36, moves: ['thunderbolt', 'quick_attack', 'thunder_wave', 'spark'] },
      { speciesId: 'venusaur', level: 36, moves: ['vine_whip', 'razor_leaf', 'solar_beam', 'sleep_powder'] },
    ],
    p2: [
      { speciesId: 'blastoise', level: 36, moves: ['surf', 'ice_beam', 'bite', 'tackle'] },
      { speciesId: 'golem', level: 36, moves: ['rock_tomb', 'earthquake', 'body_slam', 'tackle'] },
      { speciesId: 'arcanine', level: 36, moves: ['flamethrower', 'flame_wheel', 'bite', 'quick_attack'] },
    ],
  },
  {
    label: 'LV.100 ELEMENTAL TITANS',
    biome: 'cerulean_pool',
    p1: [
      { speciesId: 'blastoise', level: 100, moves: ['surf', 'hydro_pump', 'ice_beam', 'earthquake'] },
      { speciesId: 'raichu', level: 100, moves: ['thunderbolt', 'thunder', 'quick_attack', 'thunder_wave'] },
      { speciesId: 'charizard', level: 100, moves: ['flamethrower', 'fire_blast', 'wing_attack', 'earthquake'] },
    ],
    p2: [
      { speciesId: 'venusaur', level: 100, moves: ['solar_beam', 'vine_whip', 'sludge_bomb', 'earthquake'] },
      { speciesId: 'lapras', level: 100, moves: ['surf', 'ice_beam', 'blizzard', 'body_slam'] },
      { speciesId: 'snorlax', level: 100, moves: ['body_slam', 'earthquake', 'ice_beam', 'tackle'] },
    ],
  },
  {
    label: 'LITTLE CUP (Lv.5)',
    biome: 'route_meadow',
    p1: [
      { speciesId: 'charmander', level: 5, moves: ['ember', 'scratch', 'tackle', 'growl'] },
      { speciesId: 'pikachu', level: 5, moves: ['thunder_shock', 'quick_attack', 'growl', 'thunder_wave'] },
    ],
    p2: [
      { speciesId: 'squirtle', level: 5, moves: ['water_gun', 'tackle', 'tail_whip', 'bite'] },
      { speciesId: 'bulbasaur', level: 5, moves: ['vine_whip', 'tackle', 'growl', 'sleep_powder'] },
    ],
  },
  {
    label: 'GYM LEADERS CLASH',
    biome: 'pewter_rock',
    p1: [
      { speciesId: 'onix', level: 35, moves: ['rock_tomb', 'earthquake', 'dig', 'harden'] },
      { speciesId: 'graveler', level: 35, moves: ['rock_throw', 'earthquake', 'body_slam', 'tackle'] },
      { speciesId: 'pidgeot', level: 35, moves: ['wing_attack', 'gust', 'quick_attack', 'body_slam'] },
    ],
    p2: [
      { speciesId: 'starmie', level: 35, moves: ['surf', 'psychic', 'ice_beam', 'water_pulse'] },
      { speciesId: 'poliwhirl', level: 35, moves: ['surf', 'bubble_beam', 'ice_beam', 'body_slam'] },
      { speciesId: 'kadabra', level: 35, moves: ['psychic', 'confusion', 'calm_mind', 'thunder_wave'] },
    ],
  },
];

const BIOMES: Array<{ id: ArenaBiomeId; name: string }> = [
  { id: 'gym_floor', name: 'Gym Floor (Poké Ball)' },
  { id: 'route_meadow', name: 'Route 1 Meadow' },
  { id: 'viridian_forest', name: 'Viridian Forest' },
  { id: 'pewter_rock', name: 'Pewter Rock Gym' },
  { id: 'cerulean_pool', name: 'Cerulean Water Pool' },
];

export interface PvpSetupCallbacks {
  onStartMatch: (config: PvpMatchConfig) => void;
  onBack: () => void;
}

/**
 * 2-Player Local Co-Op / Versus Team Builder!
 * Both Player 1 (RED) and Player 2 (BLUE) draft 1-6 custom Pokémon,
 * choose levels (1-100), customize all 4 moves per Pokémon, pick an Arena Biome,
 * and launch into tactical 2D elemental battles!
 */
export class PvpSetupUI {
  private container: HTMLElement;
  private callbacks: PvpSetupCallbacks;

  private p1Team: DraftSlot[] = PVP_PRESETS[0].p1.map((s) => ({ ...s, moves: [...s.moves] }));
  private p2Team: DraftSlot[] = PVP_PRESETS[0].p2.map((s) => ({ ...s, moves: [...s.moves] }));
  private biome: ArenaBiomeId = 'gym_floor';
  private privacyHandoff = false;

  constructor(container: HTMLElement, callbacks: PvpSetupCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public mount(): void {
    soundEngine.playMusic('gym');
    this.render();
  }

  public unmount(): void {
    // nothing persistent to clean up
  }

  private defaultMovesFor(speciesId: string, level: number): string[] {
    const tmp = createPokemon(speciesId, level);
    const ids = tmp.moves.map((m) => m.moveId);
    while (ids.length < 4) ids.push('tackle');
    return ids.slice(0, 4);
  }

  private renderTeamColumn(side: 1 | 2, team: DraftSlot[]): string {
    const accent = side === 1 ? '#dc2626' : '#2563eb';
    const title = side === 1 ? 'PLAYER 1 (RED)' : 'PLAYER 2 (BLUE)';

    return `
      <div class="pvp-col">
        <div class="pvp-col-head" style="border-color:${accent};">
          <div style="display:flex;align-items:center;gap:8px;">
            <canvas id="pvp-tr-${side}" width="36" height="44" style="width:28px;height:34px;"></canvas>
            <span style="font-family:var(--font-pixel);font-size:10px;color:${accent};">${title} (${team.length}/6)</span>
          </div>
          <button class="pixel-btn sm" data-add="${side}" ${team.length >= 6 ? 'disabled' : ''}>+ ADD</button>
        </div>

        <div class="pvp-slot-list">
          ${team
            .map((slot, idx) => {
              const sp = SPECIES[slot.speciesId] ?? SPECIES.squirtle;
              const tc = TYPE_COLORS[sp.types[0]];
              return `
                <div class="pvp-slot-card">
                  <div class="pvp-slot-top">
                    <img
                      class="pvp-slot-img"
                      src="${getOfficialSpriteUrl(sp.id)}"
                      alt="${sp.name}"
                    />
                    <div class="pvp-slot-info">
                      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                        <select class="lab-select" data-sp="${side}-${idx}">
                          ${SPECIES_LIST.map(
                            (s) => `<option value="${s.id}" ${s.id === slot.speciesId ? 'selected' : ''}>${s.name}</option>`
                          ).join('')}
                        </select>
                        <label style="font-size:9px;color:#cbd5e1;display:flex;align-items:center;gap:4px;">
                          Lv.
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value="${slot.level}"
                            class="lab-select"
                            style="width:52px;"
                            data-lvl="${side}-${idx}"
                          />
                        </label>
                        <span class="type-pill" style="background:${tc.bg};color:${tc.text};">${sp.types.join('/')}</span>
                      </div>
                      <div class="pvp-moves-grid">
                        ${slot.moves
                          .map(
                            (mvId, mIdx) => `
                          <select class="lab-select pvp-mv-sel" data-mv="${side}-${idx}-${mIdx}">
                            ${ALL_MOVE_LIST.map(
                              (m) =>
                                `<option value="${m.id}" ${m.id === mvId ? 'selected' : ''}>${m.name} (${m.type.slice(0, 3).toUpperCase()})</option>`
                            ).join('')}
                          </select>
                        `
                          )
                          .join('')}
                      </div>
                    </div>
                    <button class="pixel-btn sm dark" data-del="${side}-${idx}" ${team.length <= 1 ? 'disabled' : ''}>✕</button>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="lab-screen">
        <div class="top-bar">
          <div class="top-bar-left">
            <span class="location-pill">2P LOCAL CO-OP VS BATTLE</span>
            <span class="stat-chip">BUILD CUSTOM TEAMS &amp; FIGHT!</span>
          </div>
          <div class="top-bar-actions">
            <button class="pixel-btn sm dark" id="pvp-back">← TITLE</button>
          </div>
        </div>

        <div class="pvp-presets-bar">
          <span style="font-family:var(--font-pixel);font-size:8px;color:#94a3b8;">PRESETS:</span>
          ${PVP_PRESETS.map(
            (pr, i) => `<button class="pixel-btn sm dark" data-pvp-preset="${i}">${pr.label}</button>`
          ).join('')}
        </div>

        <div class="pvp-builder-grid">
          ${this.renderTeamColumn(1, this.p1Team)}
          ${this.renderTeamColumn(2, this.p2Team)}
        </div>

        <div class="lab-controls">
          <label class="lab-field">
            ARENA BIOME
            <select class="lab-select" id="pvp-biome">
              ${BIOMES.map(
                (b) => `<option value="${b.id}" ${b.id === this.biome ? 'selected' : ''}>${b.name}</option>`
              ).join('')}
            </select>
          </label>

          <button class="pixel-btn sm ${this.privacyHandoff ? 'gold' : 'dark'}" id="pvp-privacy">
            PRIVACY HANDOFF: ${this.privacyHandoff ? 'ON' : 'OFF'}
          </button>

          <button class="pixel-btn primary" id="pvp-launch">START 2P BATTLE!</button>
        </div>
      </div>
    `;

    // Draw Trainer portraits into column headers
    const c1 = this.container.querySelector('#pvp-tr-1') as HTMLCanvasElement | null;
    if (c1) {
      const ctx = c1.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(getBattleTrainerSprite('red', true), 0, 0);
      }
    }
    const c2 = this.container.querySelector('#pvp-tr-2') as HTMLCanvasElement | null;
    if (c2) {
      const ctx = c2.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(getBattleTrainerSprite('rival', false), 0, 0);
      }
    }

    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.querySelector('#pvp-back')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.callbacks.onBack();
    });

    this.container.querySelectorAll('[data-pvp-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        soundEngine.playConfirm();
        const idx = Number((btn as HTMLElement).dataset.pvpPreset);
        const pr = PVP_PRESETS[idx];
        this.p1Team = pr.p1.map((s) => ({ ...s, moves: [...s.moves] }));
        this.p2Team = pr.p2.map((s) => ({ ...s, moves: [...s.moves] }));
        this.biome = pr.biome;
        this.render();
      });
    });

    this.container.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        soundEngine.playBlip();
        const side = Number((btn as HTMLElement).dataset.add);
        const team = side === 1 ? this.p1Team : this.p2Team;
        if (team.length >= 6) return;
        const pick = side === 1 ? 'pikachu' : 'starmie';
        team.push({ speciesId: pick, level: 36, moves: this.defaultMovesFor(pick, 36) });
        this.render();
      });
    });

    this.container.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        soundEngine.playBlip();
        const [sideStr, idxStr] = (btn as HTMLElement).dataset.del!.split('-');
        const team = Number(sideStr) === 1 ? this.p1Team : this.p2Team;
        if (team.length <= 1) return;
        team.splice(Number(idxStr), 1);
        this.render();
      });
    });

    this.container.querySelectorAll('[data-sp]').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const [sideStr, idxStr] = (sel as HTMLElement).dataset.sp!.split('-');
        const team = Number(sideStr) === 1 ? this.p1Team : this.p2Team;
        const slot = team[Number(idxStr)];
        slot.speciesId = (e.target as HTMLSelectElement).value;
        slot.moves = this.defaultMovesFor(slot.speciesId, slot.level);
        this.render();
      });
    });

    this.container.querySelectorAll('[data-lvl]').forEach((inp) => {
      inp.addEventListener('change', (e) => {
        const [sideStr, idxStr] = (inp as HTMLElement).dataset.lvl!.split('-');
        const team = Number(sideStr) === 1 ? this.p1Team : this.p2Team;
        const slot = team[Number(idxStr)];
        slot.level = Math.max(1, Math.min(100, Number((e.target as HTMLInputElement).value) || 1));
      });
    });

    this.container.querySelectorAll('[data-mv]').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const [sideStr, idxStr, mIdxStr] = (sel as HTMLElement).dataset.mv!.split('-');
        const team = Number(sideStr) === 1 ? this.p1Team : this.p2Team;
        team[Number(idxStr)].moves[Number(mIdxStr)] = (e.target as HTMLSelectElement).value;
      });
    });

    this.container.querySelector('#pvp-biome')?.addEventListener('change', (e) => {
      this.biome = (e.target as HTMLSelectElement).value as ArenaBiomeId;
    });

    this.container.querySelector('#pvp-privacy')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.privacyHandoff = !this.privacyHandoff;
      this.render();
    });

    this.container.querySelector('#pvp-launch')?.addEventListener('click', () => {
      soundEngine.playConfirm();
      const p1Party = this.p1Team.map((s) => createPokemon(s.speciesId, s.level, { customMoves: s.moves }));
      const p2Party = this.p2Team.map((s) => createPokemon(s.speciesId, s.level, { customMoves: s.moves }));
      spriteManager.preload([...this.p1Team.map((s) => s.speciesId), ...this.p2Team.map((s) => s.speciesId)]);
      this.callbacks.onStartMatch({
        p1Name: 'PLAYER 1 (RED)',
        p2Name: 'PLAYER 2 (BLUE)',
        p1Party,
        p2Party,
        biome: this.biome,
        privacyHandoff: this.privacyHandoff,
      });
    });
  }
}
