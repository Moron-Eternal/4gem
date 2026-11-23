import './styles/theme.css';

import { healPokemon } from './data/pokemonFactory';
import { TRAINERS } from './data/trainers';
import { soundEngine } from './engine/audio/soundEngine';
import { createNewSaveState, loadGame, saveGame } from './engine/save/saveManager';
import { SaveState } from './types/game';
import { BattleLabUI } from './ui/BattleLabUI';
import { BattleConfig, BattleOutcome, BattleUI } from './ui/BattleUI';
import { OverworldUI } from './ui/OverworldUI';
import { TitleScreen } from './ui/TitleScreen';

interface ActiveScreen {
  unmount(): void;
}

class PokemonFireRedApp {
  private frameEl: HTMLElement;
  private activeScreen: ActiveScreen | null = null;
  private save: SaveState | null = null;
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

    this.showTitle();
  }

  private swapScreen(next: ActiveScreen): void {
    this.activeScreen?.unmount();
    this.activeScreen = next;
  }

  private showTitle(): void {
    soundEngine.playMusic('title');
    const title = new TitleScreen(this.frameEl, {
      onNewGame: () => {
        this.save = createNewSaveState();
        saveGame(this.save);
        this.showOverworld();
      },
      onContinue: () => {
        this.save = loadGame() ?? createNewSaveState();
        this.showOverworld();
      },
      onOpenLab: () => {
        this.labReturnTarget = 'title';
        this.showBattleLab();
      },
    });
    this.swapScreen(title);
    title.mount();
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
      onReturnTitle: () => this.showTitle(),
    });
    this.swapScreen(overworld);
    overworld.mount(initialMessage);
  }

  private showBattle(config: BattleConfig): void {
    if (!this.save) return;
    const battle = new BattleUI(this.frameEl, this.save, config, (outcome) => {
      this.handleBattleOutcome(outcome);
    });
    this.swapScreen(battle);
    battle.mount();
  }

  private handleBattleOutcome(outcome: BattleOutcome): void {
    if (!this.save) {
      this.showTitle();
      return;
    }

    let postMessages: string[] | undefined;

    if (outcome.result === 'lose') {
      // Classic FireRed blackout respawn at nearest safe town with full heal!
      for (const mon of this.save.party) {
        healPokemon(mon);
      }
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
        this.showTitle();
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
