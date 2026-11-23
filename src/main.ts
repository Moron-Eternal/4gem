import './styles/theme.css';

import { healPokemon } from './data/pokemonFactory';
import { TRAINERS } from './data/trainers';
import { soundEngine } from './engine/audio/soundEngine';
import { createNewSaveState, loadGame, saveGame } from './engine/save/saveManager';
import { PvpMatchConfig, SaveState } from './types/game';
import { BattleLabUI } from './ui/BattleLabUI';
import { BattleConfig, BattleOutcome, BattleUI } from './ui/BattleUI';
import { OpeningCinematic } from './ui/OpeningCinematic';
import { OverworldUI } from './ui/OverworldUI';
import { PvpSetupUI } from './ui/PvpSetupUI';

interface ActiveScreen {
  unmount(): void;
}

class PokemonFireRedApp {
  private frameEl: HTMLElement;
  private activeScreen: ActiveScreen | null = null;
  private save: SaveState | null = null;
  private lastPvpConfig: PvpMatchConfig | null = null;
  private labReturnTarget: 'title' | 'overworld' = 'title';

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div class="game-shell">
        <div class="console-frame" id="console-frame"></div>
      </div>
    `;
    const frame = root.querySelector('#console-frame');
    if (!frame) throw new Error('Failed to mount console frame');
    this.frameEl = frame as HTMLElement;

    // Launch straight into the iconic FireRed Opening Cinematic on initial page load!
    this.showTitle(false);
  }

  private swapScreen(next: ActiveScreen): void {
    this.activeScreen?.unmount();
    this.activeScreen = next;
  }

  private showTitle(skipOpening = true): void {
    const opening = new OpeningCinematic(
      this.frameEl,
      {
        onNewGame: () => {
          this.save = createNewSaveState();
          saveGame(this.save);
          this.showOverworld();
        },
        onContinue: () => {
          this.save = loadGame() ?? createNewSaveState();
          this.showOverworld();
        },
        onOpenPvp: () => this.showPvpSetup(),
        onOpenLab: () => {
          this.labReturnTarget = 'title';
          this.showBattleLab();
        },
      },
      skipOpening
    );
    this.swapScreen(opening);
    opening.mount();
  }

  private showOverworld(initialMessage?: string[]): void {
    if (!this.save) {
      this.save = createNewSaveState();
    }
    const overworld = new OverworldUI(this.frameEl, this.save, {
      onStartBattle: (config) => this.showBattle(config),
      onOpenLab: () => {
        this.labReturnTarget = 'overworld';
        this.showBattleLab();
      },
      onReturnTitle: () => this.showTitle(true),
    });
    this.swapScreen(overworld);
    overworld.mount(initialMessage);
  }

  private showPvpSetup(): void {
    const pvp = new PvpSetupUI(this.frameEl, {
      onStartMatch: (cfg) => {
        this.lastPvpConfig = cfg;
        this.showBattle({
          mode: 'pvp',
          biome: cfg.biome,
          pvp: cfg,
        });
      },
      onBack: () => this.showTitle(true),
    });
    this.swapScreen(pvp);
    pvp.mount();
  }

  private showBattle(config: BattleConfig): void {
    const battle = new BattleUI(this.frameEl, this.save, config, (outcome) => {
      this.handleBattleOutcome(outcome, config);
    });
    this.swapScreen(battle);
    battle.mount();
  }

  private handleBattleOutcome(outcome: BattleOutcome, config: BattleConfig): void {
    if (config.mode === 'pvp') {
      if (outcome.result === 'pvp_rematch' && this.lastPvpConfig) {
        for (const m of [...this.lastPvpConfig.p1Party, ...this.lastPvpConfig.p2Party]) {
          healPokemon(m);
        }
        this.showBattle({
          mode: 'pvp',
          biome: this.lastPvpConfig.biome,
          pvp: this.lastPvpConfig,
        });
      } else if (outcome.result === 'pvp_edit') {
        this.showPvpSetup();
      } else {
        this.showTitle(true);
      }
      return;
    }

    if (!this.save) {
      this.showTitle(true);
      return;
    }

    let postMessages: string[] | undefined;

    if (outcome.result === 'lose') {
      for (const mon of this.save.party) healPokemon(mon);
      if (this.save.mapId === 'cerulean_gym' || this.save.mapId === 'cerulean_city') {
        this.save.mapId = 'cerulean_city';
        this.save.playerX = 3;
        this.save.playerY = 8;
      } else if (this.save.mapId === 'pewter_gym' || this.save.mapId === 'pewter_city' || this.save.mapId === 'route_3') {
        this.save.mapId = 'pewter_city';
        this.save.playerX = 3;
        this.save.playerY = 13;
      } else if (this.save.mapId === 'viridian_forest' || this.save.mapId === 'viridian_city') {
        this.save.mapId = 'viridian_city';
        this.save.playerX = 3;
        this.save.playerY = 5;
      } else {
        this.save.mapId = 'pallet_town';
        this.save.playerX = 4;
        this.save.playerY = 6;
      }
      this.save.playerDir = 'down';
      postMessages = ['You hurried back to safety and restored your POKéMON to full health!'];
    } else if (outcome.result === 'win' && outcome.trainerId) {
      const tr = TRAINERS[outcome.trainerId];
      if (tr && tr.defeatDialogue.length > 0) {
        postMessages = tr.defeatDialogue;
      }
    }

    saveGame(this.save);
    this.showOverworld(postMessages);
  }

  private showBattleLab(): void {
    soundEngine.playMusic('none');
    const lab = new BattleLabUI(this.frameEl, () => {
      if (this.labReturnTarget === 'overworld' && this.save) {
        this.showOverworld();
      } else {
        this.showTitle(true);
      }
    });
    this.swapScreen(lab);
    lab.mount();
  }
}

const root = document.getElementById('app');
if (root) {
  new PokemonFireRedApp(root);
}
