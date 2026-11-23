import { ITEMS } from '../../data/items';
import { SPECIES } from '../../data/species';
import { PokemonSpecies } from '../../types/game';
import { generateFallbackSprite } from './fallbackSprites';

export interface SpriteEntry {
  speciesId: string;
  canvas: HTMLCanvasElement;
  whiteCanvas: HTMLCanvasElement;
  iceCanvas: HTMLCanvasElement;
  fireCanvas: HTMLCanvasElement;
  wetCanvas: HTMLCanvasElement;
  source: 'fallback' | 'pokeapi';
  /** Native pixel height of the trimmed official sprite (used for 1:1 fidelity rendering) */
  nativeWidth: number;
  nativeHeight: number;
}

const POKEAPI_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
const POKEAPI_FRLG = `${POKEAPI_BASE}/pokemon/versions/generation-iii/firered-leafgreen`;
const POKEAPI_HGSS = `${POKEAPI_BASE}/pokemon/versions/generation-iv/heartgold-soulsilver`;
const POKEAPI_PLATINUM = `${POKEAPI_BASE}/pokemon/versions/generation-iv/platinum`;
const POKEAPI_BW = `${POKEAPI_BASE}/pokemon/versions/generation-v/black-white`;
const POKEAPI_DEFAULT = `${POKEAPI_BASE}/pokemon`;
const POKEAPI_ITEMS = `${POKEAPI_BASE}/items`;

export function getOfficialSpriteUrl(speciesId: string): string {
  const sp = SPECIES[speciesId];
  if (!sp) return `${POKEAPI_FRLG}/25.png`;
  if (sp.gen4Sprite) {
    return `${POKEAPI_PLATINUM}/${sp.dexNumber}.png`;
  }
  return `${POKEAPI_FRLG}/${sp.dexNumber}.png`;
}

export function getOfficialItemUrl(itemId: string): string {
  const item = ITEMS[itemId];
  const slug = item?.apiSlug ?? 'poke-ball';
  return `${POKEAPI_ITEMS}/${slug}.png`;
}

function createTintedCanvas(
  source: HTMLCanvasElement,
  r: number,
  g: number,
  b: number
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0);
  try {
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 20) {
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
      }
    }
    ctx.putImageData(img, 0, 0);
  } catch {
    // ignore cross-origin tint failure
  }
  return c;
}

function trimTransparentCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const tmp = document.createElement('canvas');
  tmp.width = img.naturalWidth || img.width;
  tmp.height = img.naturalHeight || img.height;
  const ctx = tmp.getContext('2d');
  if (!ctx || tmp.width === 0 || tmp.height === 0) return tmp;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);

  try {
    const data = ctx.getImageData(0, 0, tmp.width, tmp.height).data;
    let minX = tmp.width;
    let minY = tmp.height;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < tmp.height; y++) {
      for (let x = 0; x < tmp.width; x++) {
        const a = data[(y * tmp.width + x) * 4 + 3];
        if (a > 16) {
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) return tmp;
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const oCtx = out.getContext('2d');
    if (oCtx) {
      oCtx.imageSmoothingEnabled = false;
      oCtx.drawImage(tmp, minX, minY, w, h, 0, 0, w, h);
    }
    return out;
  } catch {
    return tmp;
  }
}

/**
 * Loads official Pokémon sprites and item icons directly from https://github.com/PokeAPI/sprites
 * at exact 1:1 native pixel fidelity with transparent-bound trimming, elemental tint masks,
 * and automatic offline custom pixel-art fallbacks.
 */
export class SpriteManager {
  private cache = new Map<string, SpriteEntry>();
  private loading = new Set<string>();
  private itemCache = new Map<string, HTMLCanvasElement>();
  private itemLoading = new Set<string>();

  public getSprite(speciesId: string): SpriteEntry {
    const existing = this.cache.get(speciesId);
    if (existing) return existing;

    const species = SPECIES[speciesId] ?? SPECIES.squirtle;
    const fallbackCanvas = generateFallbackSprite(species);
    const entry: SpriteEntry = {
      speciesId: species.id,
      canvas: fallbackCanvas,
      whiteCanvas: createTintedCanvas(fallbackCanvas, 255, 255, 255),
      iceCanvas: createTintedCanvas(fallbackCanvas, 125, 236, 255),
      fireCanvas: createTintedCanvas(fallbackCanvas, 255, 130, 35),
      wetCanvas: createTintedCanvas(fallbackCanvas, 80, 175, 255),
      source: 'fallback',
      nativeWidth: Math.round(fallbackCanvas.width * 1.6),
      nativeHeight: Math.round(fallbackCanvas.height * 1.6),
    };
    this.cache.set(species.id, entry);
    this.loadRemoteSprite(species);
    return entry;
  }

  public getItemCanvas(itemId: string): HTMLCanvasElement | null {
    const existing = this.itemCache.get(itemId);
    if (existing) return existing;
    this.loadRemoteItem(itemId);
    return null;
  }

  public preload(speciesIds: string[]): void {
    for (const id of speciesIds) {
      this.getSprite(id);
    }
  }

  public preloadCommonItems(): void {
    for (const id of ['poke_ball', 'great_ball', 'ultra_ball', 'potion', 'super_potion', 'rare_candy']) {
      this.loadRemoteItem(id);
    }
  }

  private loadRemoteItem(itemId: string): void {
    if (typeof Image === 'undefined' || this.itemLoading.has(itemId)) return;
    this.itemLoading.add(itemId);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const trimmed = trimTransparentCanvas(img);
      if (trimmed.width > 4) {
        this.itemCache.set(itemId, trimmed);
      }
    };
    img.src = getOfficialItemUrl(itemId);
  }

  private loadRemoteSprite(species: PokemonSpecies): void {
    if (typeof Image === 'undefined' || this.loading.has(species.id)) return;
    this.loading.add(species.id);

    const urls = species.gen4Sprite
      ? [
          `${POKEAPI_PLATINUM}/${species.dexNumber}.png`,
          `${POKEAPI_HGSS}/${species.dexNumber}.png`,
          `${POKEAPI_BW}/${species.dexNumber}.png`,
          `${POKEAPI_DEFAULT}/${species.dexNumber}.png`,
        ]
      : [
          `${POKEAPI_FRLG}/${species.dexNumber}.png`,
          `${POKEAPI_HGSS}/${species.dexNumber}.png`,
          `${POKEAPI_BW}/${species.dexNumber}.png`,
          `${POKEAPI_DEFAULT}/${species.dexNumber}.png`,
        ];

    const tryUrl = (index: number) => {
      if (index >= urls.length) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const trimmed = trimTransparentCanvas(img);
        if (trimmed.width > 4 && trimmed.height > 4) {
          this.cache.set(species.id, {
            speciesId: species.id,
            canvas: trimmed,
            whiteCanvas: createTintedCanvas(trimmed, 255, 255, 255),
            iceCanvas: createTintedCanvas(trimmed, 125, 236, 255),
            fireCanvas: createTintedCanvas(trimmed, 255, 130, 35),
            wetCanvas: createTintedCanvas(trimmed, 92, 188, 255),
            source: 'pokeapi',
            nativeWidth: trimmed.width,
            nativeHeight: trimmed.height,
          });
        }
      };
      img.onerror = () => tryUrl(index + 1);
      img.src = urls[index];
    };

    tryUrl(0);
  }
}

export const spriteManager = new SpriteManager();
