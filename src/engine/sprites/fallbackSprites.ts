import { PokemonSpecies } from '../../types/game';

/**
 * Generates crisp, recognizable 24x24 pixel-art fallback sprites for every species
 * in our roster so the game works 100% offline or while PokéAPI Gen 3/4 sprites load.
 */
export function generateFallbackSprite(species: PokemonSpecies): HTMLCanvasElement {
  const size = 24;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;

  const { primary, secondary, accent, eye = '#111827' } = species.colors;
  const id = species.id;

  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  // Silhouette presets tailored by Pokémon family (all facing LEFT to match PokéAPI front sprites!)
  if (id === 'squirtle' || id === 'wartortle' || id === 'blastoise') {
    const big = id === 'blastoise';
    const mid = id === 'wartortle';
    // Shell on right/back
    px(11, big ? 5 : 7, big ? 10 : 8, big ? 13 : 11, '#1e293b');
    px(12, big ? 6 : 8, big ? 8 : 6, big ? 11 : 9, secondary);
    px(11, big ? 7 : 9, 2, big ? 9 : 7, '#f8fafc');
    // Cannons for Blastoise!
    if (big) {
      px(12, 2, 3, 4, '#64748b');
      px(17, 2, 3, 4, '#64748b');
      px(12, 2, 3, 1, '#e2e8f0');
    }
    // Head & body on left
    px(5, big ? 6 : 7, 8, 7, primary);
    px(6, 13, 7, 7, primary);
    px(6, 14, 4, 5, '#fef08a'); // belly
    if (mid) {
      px(10, 5, 3, 3, '#e2e8f0'); // feathery ear
      px(18, 12, 4, 6, '#e2e8f0'); // fluffy tail
    } else if (!big) {
      px(19, 13, 3, 5, primary); // curly tail
    }
    // Eyes & feet
    px(6, big ? 8 : 9, 2, 2, '#ffffff');
    px(6, big ? 9 : 10, 1, 1, eye);
    px(6, 20, 3, 2, primary);
    px(12, 20, 3, 2, primary);
  } else if (id === 'charmander' || id === 'charmeleon' || id === 'charizard') {
    const big = id === 'charizard';
    // Wings for Charizard!
    if (big) {
      px(12, 2, 10, 9, '#1e293b');
      px(13, 3, 8, 7, secondary);
      px(12, 2, 9, 2, primary);
    }
    // Body & head
    px(5, big ? 4 : 6, 7, 6, primary);
    px(7, 11, 7, 9, primary);
    px(6, 13, 4, 6, '#fde68a'); // belly
    // Tail with bright flame!
    px(14, 16, 5, 3, primary);
    px(18, 13, 4, 5, '#f97316');
    px(19, 12, 3, 3, '#facc15');
    px(20, 13, 1, 2, '#ffffff');
    // Eyes & feet
    px(6, big ? 6 : 8, 2, 2, '#ffffff');
    px(6, big ? 6 : 8, 1, 2, eye);
    px(6, 20, 3, 2, primary);
    px(11, 20, 3, 2, primary);
  } else if (id === 'bulbasaur' || id === 'ivysaur' || id === 'venusaur') {
    const big = id === 'venusaur';
    const mid = id === 'ivysaur';
    // Bulb / Flower on back
    px(9, 4, 10, 7, secondary);
    if (mid || big) {
      px(10, 2, 8, 4, accent);
      px(12, 1, 4, 2, '#fde047');
    } else {
      px(11, 3, 6, 4, accent);
    }
    // Quadruped body & head
    px(4, 10, 15, 8, primary);
    px(4, 9, 7, 6, primary);
    px(5, 11, 2, 2, '#ffffff');
    px(5, 11, 1, 2, eye);
    px(5, 18, 3, 4, primary);
    px(15, 18, 3, 4, primary);
  } else if (id === 'pikachu' || id === 'raichu') {
    // Tall ears
    px(6, 2, 2, 6, primary);
    px(6, 2, 2, 2, '#111827');
    px(12, 2, 2, 6, primary);
    px(12, 2, 2, 2, '#111827');
    // Round body & head
    px(6, 7, 9, 12, primary);
    // Lightning tail
    px(15, 13, 4, 3, accent);
    px(17, 9, 4, 5, primary);
    // Red cheek & eyes
    px(7, 11, 2, 2, secondary);
    px(7, 9, 1, 2, '#111827');
    px(11, 9, 1, 2, '#111827');
    px(7, 19, 3, 2, primary);
    px(12, 19, 3, 2, primary);
  } else if (id === 'munchlax' || id === 'snorlax') {
    // Iconic rounded silhouette matching the right-side Munchlax in the reference screenshots!
    px(8, 3, 2, 4, primary);
    px(14, 3, 2, 4, primary);
    px(6, 6, 12, 14, primary);
    px(7, 8, 7, 5, secondary); // face
    px(7, 13, 8, 6, secondary); // cream belly
    px(8, 10, 2, 1, '#111827'); // closed sleepy eye
    px(11, 10, 2, 1, '#111827');
    px(7, 20, 4, 2, '#d97706'); // feet
    px(13, 20, 4, 2, '#d97706');
  } else if (id === 'onix' || id === 'geodude' || id === 'graveler' || id === 'golem') {
    if (id === 'onix') {
      px(5, 4, 7, 7, primary);
      px(7, 2, 2, 3, accent); // horn
      px(9, 10, 6, 6, secondary);
      px(13, 14, 6, 6, primary);
      px(17, 10, 5, 5, secondary);
      px(6, 6, 2, 1, '#111827');
    } else {
      px(6, 6, 12, 12, primary);
      px(8, 8, 8, 8, secondary);
      px(3, 10, 4, 4, primary); // rocky fists
      px(17, 10, 4, 4, primary);
      px(8, 10, 2, 2, '#111827');
      px(13, 10, 2, 2, '#111827');
    }
  } else if (id === 'staryu' || id === 'starmie') {
    // 5-point star silhouette + glowing red gem!
    px(10, 2, 4, 20, primary);
    px(2, 10, 20, 4, primary);
    px(5, 5, 14, 14, primary);
    px(8, 8, 8, 8, secondary);
    px(10, 10, 4, 4, accent);
    px(11, 11, 2, 2, '#ffffff');
  } else {
    // Clean stylized creature fallback tailored with species primary/secondary/accent colors
    px(6, 6, 12, 12, primary);
    px(7, 12, 8, 6, secondary);
    px(14, 5, 5, 5, accent);
    px(8, 9, 2, 2, '#ffffff');
    px(8, 9, 1, 2, eye);
    px(7, 18, 3, 3, primary);
    px(14, 18, 3, 3, primary);
  }

  // Add crisp 1px dark GBA outline around opaque pixels
  const img = ctx.getImageData(0, 0, size, size);
  const src = new Uint8ClampedArray(img.data);
  const out = img.data;
  const isOpaque = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return false;
    return src[(y * size + x) * 4 + 3] > 20;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isOpaque(x, y)) continue;
      if (isOpaque(x - 1, y) || isOpaque(x + 1, y) || isOpaque(x, y - 1) || isOpaque(x, y + 1)) {
        const idx = (y * size + x) * 4;
        out[idx] = 17;
        out[idx + 1] = 24;
        out[idx + 2] = 39;
        out[idx + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  return canvas;
}
