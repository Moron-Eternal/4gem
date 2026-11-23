import { MOVES } from '../data/moves';
import { createPokemon } from '../data/pokemonFactory';
import { SPECIES, SPECIES_LIST } from '../data/species';
import { TYPE_COLORS } from '../data/typeChart';
import { soundEngine } from '../engine/audio/soundEngine';
import { computeMoveScale } from '../engine/battle/moveScaling';
import { ARENA_H, ARENA_W, ArenaGrid } from '../engine/physics/arenaGrid';
import { ArenaRenderer } from '../engine/physics/arenaRenderer';
import { MoveChoreographer } from '../engine/physics/moveChoreographer';
import { ParticleSystem } from '../engine/physics/particleSystem';
import { spriteManager } from '../engine/sprites/spriteManager';
import { ArenaBiomeId, EnvConditionTag, MoveData, PokemonInstance } from '../types/game';

interface ShowcasePreset {
  id: string;
  label: string;
  moveId: string;
  subtitle: string;
  biome: ArenaBiomeId;
  defenderId: string;
  tiers: Array<{ speciesId: string; level: number }>;
}

const SHOWCASE_PRESETS: ShowcasePreset[] = [
  {
    id: 'surf',
    label: 'SURF',
    moveId: 'surf',
    subtitle: 'Sp. Atk sets the size of the wave',
    biome: 'gym_floor',
    defenderId: 'munchlax',
    tiers: [
      { speciesId: 'squirtle', level: 1 },
      { speciesId: 'wartortle', level: 40 },
      { speciesId: 'blastoise', level: 100 },
    ],
  },
  {
    id: 'flamethrower',
    label: 'FLAMETHROWER',
    moveId: 'flamethrower',
    subtitle: 'Sp. Atk & Evolution grow the flame into an inferno',
    biome: 'viridian_forest',
    defenderId: 'snorlax',
    tiers: [
      { speciesId: 'charmander', level: 5 },
      { speciesId: 'charmeleon', level: 28 },
      { speciesId: 'charizard', level: 100 },
    ],
  },
  {
    id: 'thunderbolt',
    label: 'THUNDERBOLT',
    moveId: 'thunderbolt',
    subtitle: 'Sp. Atk expands arcs & chains across water puddles',
    biome: 'cerulean_pool',
    defenderId: 'blastoise',
    tiers: [
      { speciesId: 'pikachu', level: 5 },
      { speciesId: 'pikachu', level: 42 },
      { speciesId: 'raichu', level: 100 },
    ],
  },
  {
    id: 'razor_leaf',
    label: 'RAZOR LEAF',
    moveId: 'razor_leaf',
    subtitle: 'Attack scales the leaf storm & overgrown vines',
    biome: 'route_meadow',
    defenderId: 'onix',
    tiers: [
      { speciesId: 'bulbasaur', level: 5 },
      { speciesId: 'ivysaur', level: 30 },
      { speciesId: 'venusaur', level: 100 },
    ],
  },
  {
    id: 'earthquake',
    label: 'EARTHQUAKE',
    moveId: 'earthquake',
    subtitle: 'Attack deepens craters, rubble & seismic shockwaves',
    biome: 'pewter_rock',
    defenderId: 'charizard',
    tiers: [
      { speciesId: 'geodude', level: 8 },
      { speciesId: 'graveler', level: 36 },
      { speciesId: 'golem', level: 100 },
    ],
  },
  {
    id: 'ice_beam',
    label: 'ICE BEAM',
    moveId: 'ice_beam',
    subtitle: 'Sp. Atk widens the frost beam & freezes water',
    biome: 'cerulean_pool',
    defenderId: 'munchlax',
    tiers: [
      { speciesId: 'squirtle', level: 8 },
      { speciesId: 'wartortle', level: 42 },
      { speciesId: 'lapras', level: 100 },
    ],
  },
];

const SANDBOX_MOVES = [
  'surf',
  'water_gun',
  'flamethrower',
  'fire_blast',
  'thunderbolt',
  'thunder',
  'ice_beam',
  'blizzard',
  'vine_whip',
  'razor_leaf',
  'solar_beam',
  'rock_tomb',
  'earthquake',
  'gust',
  'psychic',
];

const BIOME_OPTIONS: Array<{ id: ArenaBiomeId; name: string }> = [
  { id: 'gym_floor', name: 'Gym Floor (Poké Ball)' },
  { id: 'route_meadow', name: 'Route 1 Meadow' },
  { id: 'viridian_forest', name: 'Viridian Forest' },
  { id: 'pewter_rock', name: 'Pewter Rock Gym' },
  { id: 'cerulean_pool', name: 'Cerulean Water Pool' },
];

const ENV_BADGE_LABELS: Record<EnvConditionTag, string> = {
  burning: 'FIRE',
  flooded: 'FLOODED',
  electrified: 'ELECTRIFIED',
  frozen: 'FROZEN',
  steam: 'STEAM',
  cratered: 'CRATERED',
  overgrown: 'OVERGROWN',
};

interface ShowcaseSlot {
  grid: ArenaGrid;
  particles: ParticleSystem;
  choreo: MoveChoreographer;
  renderer: ArenaRenderer;
  canvas: HTMLCanvasElement | null;
  attacker: PokemonInstance;
  defender: PokemonInstance;
  metaEl: HTMLElement | null;
}

export class BattleLabUI {
  private container: HTMLElement;
  private onBack: () => void;
  private rafId: number | null = null;
  private lastTs = 0;

  private activeTab: 'showcase' | 'sandbox' = 'showcase';
  private presetIdx = 0;
  private showcaseBiome: ArenaBiomeId = SHOWCASE_PRESETS[0].biome;
  private slowMo = false;
  private autoLoop = true;
  private autoLoopTimer = 0.65;
  private showcaseSlots: ShowcaseSlot[] = [];

  // Sandbox state
  private sbAttackerId = 'charmander';
  private sbDefenderId = 'munchlax';
  private sbLevel = 5;
  private sbStatBonus = 0;
  private sbBiome: ArenaBiomeId = 'viridian_forest';
  private sbGrid = new ArenaGrid('viridian_forest');
  private sbParticles = new ParticleSystem();
  private sbChoreo = new MoveChoreographer(this.sbGrid, this.sbParticles);
  private sbRenderer = new ArenaRenderer();
  private sbCanvas: HTMLCanvasElement | null = null;
  private sbEnvEl: HTMLElement | null = null;
  private sbScaleEl: HTMLElement | null = null;
  private sbAttacker: PokemonInstance = createPokemon('charmander', 5);
  private sbDefender: PokemonInstance = createPokemon('munchlax', 50);

  constructor(container: HTMLElement, onBack: () => void) {
    this.container = container;
    this.onBack = onBack;
  }

  public mount(): void {
    this.renderView();
    this.lastTs = performance.now();
    this.loop(this.lastTs);
  }

  public unmount(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private renderView(): void {
    this.container.innerHTML = `
      <div class="lab-screen">
        <div class="lab-tabs">
          <div class="lab-tab-group">
            <button class="pixel-btn sm ${this.activeTab === 'showcase' ? 'gold' : 'dark'}" id="tab-showcase">
              3-PANEL SCALING SHOWCASE
            </button>
            <button class="pixel-btn sm ${this.activeTab === 'sandbox' ? 'gold' : 'dark'}" id="tab-sandbox">
              CUSTOM PHYSICS SANDBOX
            </button>
          </div>
          <div class="lab-tab-group">
            <button class="pixel-btn sm dark" id="btn-lab-mute">${soundEngine.isMuted() ? 'AUDIO: OFF' : 'AUDIO: ON'}</button>
            <button class="pixel-btn sm primary" id="btn-lab-back">EXIT LAB</button>
          </div>
        </div>
        <div id="lab-body" style="flex:1;min-height:0;display:flex;flex-direction:column;"></div>
      </div>
    `;

    this.container.querySelector('#tab-showcase')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.activeTab = 'showcase';
      this.renderView();
    });
    this.container.querySelector('#tab-sandbox')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.activeTab = 'sandbox';
      this.renderView();
    });
    this.container.querySelector('#btn-lab-mute')?.addEventListener('click', () => {
      soundEngine.toggleMute();
      const btn = this.container.querySelector('#btn-lab-mute');
      if (btn) btn.textContent = soundEngine.isMuted() ? 'AUDIO: OFF' : 'AUDIO: ON';
    });
    this.container.querySelector('#btn-lab-back')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.onBack();
    });

    const body = this.container.querySelector('#lab-body') as HTMLElement;
    if (this.activeTab === 'showcase') {
      this.mountShowcaseTab(body);
    } else {
      this.mountSandboxTab(body);
    }
  }

  private mountShowcaseTab(body: HTMLElement): void {
    const preset = SHOWCASE_PRESETS[this.presetIdx];
    const move = MOVES[preset.moveId];

    body.innerHTML = `
      <div class="showcase-wrap">
        <div class="showcase-banner">
          <div class="showcase-move-title">${preset.label}</div>
          <div class="showcase-move-sub">${preset.subtitle}</div>
        </div>

        <div class="showcase-stack">
          ${preset.tiers
            .map(
              (t, idx) => `
            <div class="showcase-panel">
              <canvas class="showcase-canvas" id="sc-canvas-${idx}" width="${ARENA_W * 3}" height="${ARENA_H * 3}"></canvas>
              <div class="showcase-panel-label">${SPECIES[t.speciesId]?.name ?? ''}  Lv. ${t.level}</div>
              <div class="showcase-panel-meta" id="sc-meta-${idx}"></div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="lab-controls">
        ${SHOWCASE_PRESETS.map(
          (p, i) => `
          <button class="pixel-btn sm ${i === this.presetIdx ? 'gold' : 'dark'}" data-preset="${i}">
            ${p.label}
          </button>
        `
        ).join('')}

        <select class="lab-select" id="sc-biome">
          ${BIOME_OPTIONS.map(
            (b) => `<option value="${b.id}" ${b.id === this.showcaseBiome ? 'selected' : ''}>${b.name}</option>`
          ).join('')}
        </select>

        <button class="pixel-btn sm primary" id="sc-fire">FIRE ALL!</button>
        <button class="pixel-btn sm ${this.slowMo ? 'gold' : 'dark'}" id="sc-slowmo">
          SLOW-MO: ${this.slowMo ? 'ON' : 'OFF'}
        </button>
        <button class="pixel-btn sm ${this.autoLoop ? 'gold' : 'dark'}" id="sc-autoloop">
          LOOP: ${this.autoLoop ? 'ON' : 'OFF'}
        </button>
        <button class="pixel-btn sm dark" id="sc-reset">RESET ARENAS</button>
      </div>
    `;

    // Initialize 3 independent synchronized pixel-physics arenas!
    this.showcaseSlots = preset.tiers.map((tier, idx) => {
      const grid = new ArenaGrid(this.showcaseBiome);
      const particles = new ParticleSystem();
      const choreo = new MoveChoreographer(grid, particles);
      const renderer = new ArenaRenderer();
      const attacker = createPokemon(tier.speciesId, tier.level);
      const defender = createPokemon(preset.defenderId, 50);
      spriteManager.preload([tier.speciesId, preset.defenderId]);

      const prof = computeMoveScale(attacker, move);
      const metaEl = body.querySelector(`#sc-meta-${idx}`) as HTMLElement | null;
      if (metaEl) {
        metaEl.textContent = `${prof.relevantStatName.toUpperCase()} ${prof.relevantStat} • SCALE ${Math.round(
          prof.scaleFactor * 100
        )}%`;
      }

      return {
        grid,
        particles,
        choreo,
        renderer,
        canvas: body.querySelector(`#sc-canvas-${idx}`),
        attacker,
        defender,
        metaEl,
      };
    });

    this.autoLoopTimer = 0.45;

    body.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        soundEngine.playBlip();
        const idx = Number((btn as HTMLElement).dataset.preset);
        this.presetIdx = idx;
        this.showcaseBiome = SHOWCASE_PRESETS[idx].biome;
        this.mountShowcaseTab(body);
      });
    });

    body.querySelector('#sc-biome')?.addEventListener('change', (e) => {
      this.showcaseBiome = (e.target as HTMLSelectElement).value as ArenaBiomeId;
      for (const slot of this.showcaseSlots) {
        slot.grid.reset(this.showcaseBiome);
        slot.particles.clear();
      }
    });

    body.querySelector('#sc-fire')?.addEventListener('click', () => {
      this.fireShowcaseAll();
    });

    body.querySelector('#sc-slowmo')?.addEventListener('click', () => {
      this.slowMo = !this.slowMo;
      const el = body.querySelector('#sc-slowmo');
      if (el) {
        el.textContent = `SLOW-MO: ${this.slowMo ? 'ON' : 'OFF'}`;
        el.className = `pixel-btn sm ${this.slowMo ? 'gold' : 'dark'}`;
      }
    });

    body.querySelector('#sc-autoloop')?.addEventListener('click', () => {
      this.autoLoop = !this.autoLoop;
      const el = body.querySelector('#sc-autoloop');
      if (el) {
        el.textContent = `LOOP: ${this.autoLoop ? 'ON' : 'OFF'}`;
        el.className = `pixel-btn sm ${this.autoLoop ? 'gold' : 'dark'}`;
      }
    });

    body.querySelector('#sc-reset')?.addEventListener('click', () => {
      soundEngine.playBlip();
      for (const slot of this.showcaseSlots) {
        slot.grid.reset(this.showcaseBiome);
        slot.particles.clear();
        slot.choreo.resetVisuals();
      }
    });
  }

  private fireShowcaseAll(): void {
    const preset = SHOWCASE_PRESETS[this.presetIdx];
    const move = MOVES[preset.moveId];
    for (let i = 0; i < this.showcaseSlots.length; i++) {
      const slot = this.showcaseSlots[i];
      slot.grid.reset(this.showcaseBiome);
      slot.particles.clear();
      const prof = computeMoveScale(slot.attacker, move);
      slot.choreo.triggerMove('player', move, prof, {
        onImpact: i === 2 ? () => soundEngine.playHit(1, prof.scaleFactor) : undefined,
      });
      if (i === 2) {
        soundEngine.playMoveSfx(move, prof);
      }
    }
    this.autoLoopTimer = 2.4;
  }

  private rebuildSandboxMons(): void {
    this.sbAttacker = createPokemon(this.sbAttackerId, this.sbLevel);
    if (this.sbStatBonus !== 0) {
      this.sbAttacker.statOverride = {
        spAtk: Math.max(8, this.sbAttacker.spAtk + this.sbStatBonus),
        atk: Math.max(8, this.sbAttacker.atk + this.sbStatBonus),
      };
    }
    this.sbDefender = createPokemon(this.sbDefenderId, 50);
    spriteManager.preload([this.sbAttackerId, this.sbDefenderId]);
  }

  private mountSandboxTab(body: HTMLElement): void {
    this.rebuildSandboxMons();
    this.sbGrid.reset(this.sbBiome);
    this.sbParticles.clear();
    this.sbChoreo.resetVisuals();

    const effSpAtk = this.sbAttacker.statOverride?.spAtk ?? this.sbAttacker.spAtk;

    body.innerHTML = `
      <div class="sandbox-body">
        <div class="sandbox-arena-wrap">
          <canvas class="battle-canvas" id="sb-canvas" width="${ARENA_W * 4}" height="${ARENA_H * 4}"></canvas>
          <div class="showcase-panel-label" id="sb-matchup-label" style="font-size:10px;top:8px;left:12px;">
            ${SPECIES[this.sbAttackerId]?.name ?? ''} Lv.${this.sbLevel}  vs  ${SPECIES[this.sbDefenderId]?.name ?? ''}
          </div>
          <div class="env-strip">
            <div class="env-tags" id="sb-env-tags"></div>
            <div class="scale-callout" id="sb-scale-callout">PICK ANY MOVE BELOW TO TEST PIXEL PHYSICS!</div>
          </div>
        </div>

        <div class="sandbox-moves-bar" id="sb-moves-bar">
          ${SANDBOX_MOVES.map((id) => {
            const m = MOVES[id];
            const c = TYPE_COLORS[m.type];
            return `
              <button
                class="pixel-btn sm"
                data-sb-move="${id}"
                style="background:${c.bg};color:${c.text};border-color:${c.border};"
              >
                ${m.name}
              </button>
            `;
          }).join('')}
        </div>

        <div class="lab-controls">
          <label class="lab-field">
            ATTACKER
            <select class="lab-select" id="sb-attacker">
              ${SPECIES_LIST.map(
                (s) =>
                  `<option value="${s.id}" ${s.id === this.sbAttackerId ? 'selected' : ''}>${s.name} (Stage ${
                    s.evoStage + 1
                  })</option>`
              ).join('')}
            </select>
          </label>

          <label class="lab-field">
            DEFENDER
            <select class="lab-select" id="sb-defender">
              ${SPECIES_LIST.map(
                (s) => `<option value="${s.id}" ${s.id === this.sbDefenderId ? 'selected' : ''}>${s.name}</option>`
              ).join('')}
            </select>
          </label>

          <label class="lab-field">
            LEVEL: <span id="sb-lvl-val">${this.sbLevel}</span>
            <input class="lab-range" type="range" min="1" max="100" value="${this.sbLevel}" id="sb-level" />
          </label>

          <label class="lab-field">
            STAT BOOST: <span id="sb-stat-val">Sp.Atk ${effSpAtk}</span>
            <input class="lab-range" type="range" min="-40" max="140" step="10" value="${this.sbStatBonus}" id="sb-stat" />
          </label>

          <label class="lab-field">
            ARENA BIOME
            <select class="lab-select" id="sb-biome">
              ${BIOME_OPTIONS.map(
                (b) => `<option value="${b.id}" ${b.id === this.sbBiome ? 'selected' : ''}>${b.name}</option>`
              ).join('')}
            </select>
          </label>

          <button class="pixel-btn sm dark" id="sb-reset">RESET ARENA</button>
        </div>
      </div>
    `;

    this.sbCanvas = body.querySelector('#sb-canvas');
    this.sbEnvEl = body.querySelector('#sb-env-tags');
    this.sbScaleEl = body.querySelector('#sb-scale-callout');

    const updateStatReadout = () => {
      this.rebuildSandboxMons();
      const lvlEl = body.querySelector('#sb-lvl-val');
      const statEl = body.querySelector('#sb-stat-val');
      const matchupEl = body.querySelector('#sb-matchup-label');
      const sp = this.sbAttacker.statOverride?.spAtk ?? this.sbAttacker.spAtk;
      if (lvlEl) lvlEl.textContent = String(this.sbLevel);
      if (statEl) statEl.textContent = `Sp.Atk ${sp}`;
      if (matchupEl) {
        matchupEl.textContent = `${SPECIES[this.sbAttackerId]?.name ?? ''} Lv.${this.sbLevel}  vs  ${
          SPECIES[this.sbDefenderId]?.name ?? ''
        }`;
      }
    };

    body.querySelector('#sb-attacker')?.addEventListener('change', (e) => {
      this.sbAttackerId = (e.target as HTMLSelectElement).value;
      updateStatReadout();
    });
    body.querySelector('#sb-defender')?.addEventListener('change', (e) => {
      this.sbDefenderId = (e.target as HTMLSelectElement).value;
      updateStatReadout();
    });
    body.querySelector('#sb-level')?.addEventListener('input', (e) => {
      this.sbLevel = Number((e.target as HTMLInputElement).value);
      updateStatReadout();
    });
    body.querySelector('#sb-stat')?.addEventListener('input', (e) => {
      this.sbStatBonus = Number((e.target as HTMLInputElement).value);
      updateStatReadout();
    });
    body.querySelector('#sb-biome')?.addEventListener('change', (e) => {
      this.sbBiome = (e.target as HTMLSelectElement).value as ArenaBiomeId;
      this.sbGrid.reset(this.sbBiome);
      this.sbParticles.clear();
    });
    body.querySelector('#sb-reset')?.addEventListener('click', () => {
      soundEngine.playBlip();
      this.sbGrid.reset(this.sbBiome);
      this.sbParticles.clear();
      this.sbChoreo.resetVisuals();
    });

    body.querySelectorAll('[data-sb-move]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const moveId = (btn as HTMLElement).dataset.sbMove!;
        const move: MoveData = MOVES[moveId];
        if (!move) return;
        const prof = computeMoveScale(this.sbAttacker, move);
        soundEngine.playMoveSfx(move, prof);
        if (this.sbScaleEl) {
          this.sbScaleEl.textContent = `${move.name} • ${prof.relevantStatName.toUpperCase()} ${
            prof.relevantStat
          } • SCALE ${Math.round(prof.scaleFactor * 100)}% (${prof.tier.toUpperCase()})`;
        }
        this.sbChoreo.triggerMove('player', move, prof, {
          onImpact: () => soundEngine.playHit(1, prof.scaleFactor),
        });
      });
    });
  }

  private loop = (ts: number): void => {
    const rawDt = Math.min(0.05, (ts - this.lastTs) / 1000);
    this.lastTs = ts;
    const dt = this.slowMo && this.activeTab === 'showcase' ? rawDt * 0.45 : rawDt;

    if (this.activeTab === 'showcase') {
      const preset = SHOWCASE_PRESETS[this.presetIdx];
      const anyBusy = this.showcaseSlots.some((s) => s.choreo.isBusy());
      if (this.autoLoop && !anyBusy) {
        this.autoLoopTimer -= rawDt;
        if (this.autoLoopTimer <= 0) {
          this.fireShowcaseAll();
        }
      }

      for (const slot of this.showcaseSlots) {
        slot.choreo.step(dt);
        if (slot.canvas) {
          const spA = SPECIES[slot.attacker.speciesId];
          const spD = SPECIES[slot.defender.speciesId];
          slot.renderer.render(slot.canvas, slot.choreo, {
            player: spriteManager.getSprite(slot.attacker.speciesId),
            enemy: spriteManager.getSprite(slot.defender.speciesId),
            playerScale: spA?.spriteScale ?? 1,
            enemyScale: spD?.spriteScale ?? 1,
          });
        }
      }
      // keep preset reference alive
      void preset;
    } else {
      this.sbChoreo.step(rawDt);
      if (this.sbCanvas) {
        const spA = SPECIES[this.sbAttacker.speciesId];
        const spD = SPECIES[this.sbDefender.speciesId];
        this.sbRenderer.render(this.sbCanvas, this.sbChoreo, {
          player: spriteManager.getSprite(this.sbAttacker.speciesId),
          enemy: spriteManager.getSprite(this.sbDefender.speciesId),
          playerScale: spA?.spriteScale ?? 1,
          enemyScale: spD?.spriteScale ?? 1,
        });
      }
      if (this.sbEnvEl) {
        const snap = this.sbGrid.getSnapshot();
        const html = snap.activeTags
          .map((tag) => `<span class="env-chip ${tag}">${ENV_BADGE_LABELS[tag]}</span>`)
          .join('');
        if (this.sbEnvEl.innerHTML !== html) {
          this.sbEnvEl.innerHTML = html;
        }
      }
    }

    this.rafId = requestAnimationFrame(this.loop);
  };
}
