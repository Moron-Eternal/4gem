import { SPECIES } from '../../data/species';
import { PokemonSpecies } from '../../types/game';
import { generateFallbackSprite } from './fallbackSprites';

export interface SpriteEntry {
  speciesId: string;
  canvas: HTMLCanvasElement;
  whiteCanvas: HTMLCanvasElement;
  iceCanvas: HTMLCanvasElement;
  fireCanvas: HTMLCanvasElement;
  source: 'fallback' | 'pokeapi';
}

const POKEAPI_FRLG =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/firered-leafgreen';
const POKEAPI_PLATINUM =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/platinum';
const POKEAPI_DEFAULT =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

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
    // Fallback if canvas tainted
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
 * Loads Gen 3 FireRed/LeafGreen (and Gen 4 Platinum for Munchlax) sprites from PokéAPI
 * with CORS-safe transparent trimming and instant custom pixel-art fallbacks.
 */
export class SpriteManager {
  private cache = new Map<string, SpriteEntry>();
  private loading = new Set<string>();

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
      source: 'fallback',
    };
    this.cache.set(species.id, entry);
    this.loadRemoteSprite(species);
    return entry;
  }

  public preload(speciesIds: string[]): void {
    for (const id of speciesIds) {
      this.getSprite(id);
    }
  }

  private loadRemoteSprite(species: PokemonSpecies): void {
    if (typeof Image === 'undefined' || this.loading.has(species.id)) return;
    this.loading.add(species.id);

    const urls = species.gen4Sprite
      ? [`${POKEAPI_PLATINUM}/${species.dexNumber}.png`, `${POKEAPI_DEFAULT}/${species.dexNumber}.png`]
      : [
          `${POKEAPI_FRLG}/${species.dexNumber}.png`,
          `${POKEAPI_PLATINUM}/${species.dexNumber}.png`,
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
            source: 'pokeapi',
          });
        }
      };
      img.onerror = () => {
        tryUrl(index + 1);
      };
      img.src = urls[index];
    };

    tryUrl(0);
  }
}

export const spriteManager = new SpriteManager();
