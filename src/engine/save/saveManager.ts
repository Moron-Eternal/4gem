import { SaveState } from '../../types/game';

const SAVE_KEY = 'pokemon_firered_elemental_save_v1';

export function createNewSaveState(): SaveState {
  return {
    version: 1,
    playerName: 'RED',
    mapId: 'pallet_town',
    playerX: 5,
    playerY: 7,
    playerDir: 'down',
    starterId: null,
    money: 1000,
    badges: [],
    party: [],
    pcBox: [],
    inventory: [
      { itemId: 'poke_ball', quantity: 8 },
      { itemId: 'potion', quantity: 4 },
    ],
    defeatedTrainers: [],
    collectedItems: [],
    flags: {},
    pokedexSeen: [],
    pokedexCaught: [],
    playTimeSec: 0,
  };
}

export function hasSavedGame(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveGame(state: SaveState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): SaveState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveState;
    if (!parsed || typeof parsed.mapId !== 'string' || !Array.isArray(parsed.party)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function addInventoryItem(state: SaveState, itemId: string, qty: number): void {
  const existing = state.inventory.find((i) => i.itemId === itemId);
  if (existing) {
    existing.quantity += qty;
  } else {
    state.inventory.push({ itemId, quantity: qty });
  }
}

export function consumeInventoryItem(state: SaveState, itemId: string, qty = 1): boolean {
  const idx = state.inventory.findIndex((i) => i.itemId === itemId);
  if (idx === -1 || state.inventory[idx].quantity < qty) return false;
  state.inventory[idx].quantity -= qty;
  if (state.inventory[idx].quantity <= 0) {
    state.inventory.splice(idx, 1);
  }
  return true;
}

export function recordPokedexSeen(state: SaveState, speciesId: string): void {
  if (!state.pokedexSeen.includes(speciesId)) {
    state.pokedexSeen.push(speciesId);
  }
}

export function recordPokedexCaught(state: SaveState, speciesId: string): void {
  recordPokedexSeen(state, speciesId);
  if (!state.pokedexCaught.includes(speciesId)) {
    state.pokedexCaught.push(speciesId);
  }
}
