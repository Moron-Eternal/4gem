import { Direction } from '../../types/game';

/**
 * Hand-authored GBA Pokémon FireRed 16x22 pixel-art overworld character sprites
 * (4 directions x 3 smooth walk frames) AND 40x48 Trainer Battle Intro sprites.
 * Zero boxy rectangles—authentic GBA silhouettes, hats, hair shading, outfits, & outlines!
 */

export interface CharacterPalette {
  hair: string;
  hairShade: string;
  hat?: string;
  hatTrim?: string;
  skin: string;
  skinShade: string;
  shirt: string;
  shirtShade: string;
  accent: string;
  pants: string;
  shoes: string;
  spikyHair?: boolean;
  nurseCap?: boolean;
  labCoat?: boolean;
}

export const CHARACTER_PALETTES: Record<string, CharacterPalette> = {
  red: {
    hair: '#1c1917',
    hairShade: '#09090b',
    hat: '#dc2626',
    hatTrim: '#f8fafc',
    skin: '#fcd5b0',
    skinShade: '#e3a87b',
    shirt: '#dc2626',
    shirtShade: '#991b1b',
    accent: '#f8fafc',
    pants: '#2563eb',
    shoes: '#dc2626',
  },
  rival: {
    hair: '#9a5b25',
    hairShade: '#693914',
    skin: '#fcd5b0',
    skinShade: '#e3a87b',
    shirt: '#4f46e5',
    shirtShade: '#312e81',
    accent: '#e2e8f0',
    pants: '#1e293b',
    shoes: '#475569',
    spikyHair: true,
  },
  oak: {
    hair: '#cbd5e1',
    hairShade: '#64748b',
    skin: '#f6cba4',
    skinShade: '#d99e70',
    shirt: '#f8fafc',
    shirtShade: '#cbd5e1',
    accent: '#b91c1c',
    pants: '#78350f',
    shoes: '#451a03',
    labCoat: true,
  },
  mom: {
    hair: '#7c2d12',
    hairShade: '#451a03',
    skin: '#fcd5b0',
    skinShade: '#e3a87b',
    shirt: '#ec4899',
    shirtShade: '#be185d',
    accent: '#fef3c7',
    pants: '#9d174d',
    shoes: '#78350f',
  },
  nurse: {
    hair: '#f472b6',
    hairShade: '#db2777',
    skin: '#fde2c8',
    skinShade: '#e8b68e',
    shirt: '#fdf2f8',
    shirtShade: '#fbcfe8',
    accent: '#ef4444',
    pants: '#f472b6',
    shoes: '#ffffff',
    nurseCap: true,
  },
  mart: {
    hair: '#1e293b',
    hairShade: '#0f172a',
    hat: '#1d4ed8',
    hatTrim: '#93c5fd',
    skin: '#fcd5b0',
    skinShade: '#e3a87b',
    shirt: '#2563eb',
    shirtShade: '#1e40af',
    accent: '#f8fafc',
    pants: '#1e293b',
    shoes: '#111827',
  },
  brock: {
    hair: '#292524',
    hairShade: '#0c0a09',
    skin: '#d99b66',
    skinShade: '#b37442',
    shirt: '#5c6b2e',
    shirtShade: '#3d471d',
    accent: '#ea580c',
    pants: '#785a3a',
    shoes: '#292524',
    spikyHair: true,
  },
  misty: {
    hair: '#f97316',
    hairShade: '#c2410c',
    skin: '#fcd5b0',
    skinShade: '#e3a87b',
    shirt: '#facc15',
    shirtShade: '#ca8a04',
    accent: '#ef4444',
    pants: '#2563eb',
    shoes: '#dc2626',
  },
  youngster: {
    hair: '#3f2a1d',
    hairShade: '#26170e',
    hat: '#eab308',
    hatTrim: '#1d4ed8',
    skin: '#fcd5b0',
    skinShade: '#e3a87b',
    shirt: '#facc15',
    shirtShade: '#ca8a04',
    accent: '#ffffff',
    pants: '#1d4ed8',
    shoes: '#ef4444',
  },
  bug_catcher: {
    hair: '#854d0e',
    hairShade: '#422006',
    hat: '#e5c068',
    hatTrim: '#15803d',
    skin: '#fcd5b0',
    skinShade: '#e3a87b',
    shirt: '#4d9a3d',
    shirtShade: '#2e6b24',
    accent: '#fef08a',
    pants: '#784c22',
    shoes: '#451a03',
  },
  picnicker: {
    hair: '#92400e',
    hairShade: '#5c2407',
    hat: '#16a34a',
    hatTrim: '#fef08a',
    skin: '#fcd5b0',
    skinShade: '#e3a87b',
    shirt: '#22c55e',
    shirtShade: '#15803d',
    accent: '#ffffff',
    pants: '#166534',
    shoes: '#78350f',
  },
  camper: {
    hair: '#451a03',
    hairShade: '#260e02',
    hat: '#0f766e',
    hatTrim: '#facc15',
    skin: '#fcd5b0',
    skinShade: '#e3a87b',
    shirt: '#14b8a6',
    shirtShade: '#0f766e',
    accent: '#fde68a',
    pants: '#475569',
    shoes: '#334155',
  },
  hiker: {
    hair: '#451a03',
    hairShade: '#260e02',
    skin: '#eab386',
    skinShade: '#c48658',
    shirt: '#b45309',
    shirtShade: '#78350f',
    accent: '#fde047',
    pants: '#44403c',
    shoes: '#1c1917',
  },
  swimmer: {
    hair: '#0369a1',
    hairShade: '#0c4a6e',
    hat: '#38bdf8',
    hatTrim: '#f8fafc',
    skin: '#f0b88a',
    skinShade: '#cf9060',
    shirt: '#f0b88a',
    shirtShade: '#cf9060',
    accent: '#0284c7',
    pants: '#0284c7',
    shoes: '#38bdf8',
  },
  villager: {
    hair: '#57534e',
    hairShade: '#292524',
    skin: '#fcd5b0',
    skinShade: '#e3a87b',
    shirt: '#0ea5e9',
    shirtShade: '#0369a1',
    accent: '#e0f2fe',
    pants: '#334155',
    shoes: '#1e293b',
  },
};

const spriteCache = new Map<string, HTMLCanvasElement>();
const battleTrainerCache = new Map<string, HTMLCanvasElement>();

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function addGbaOutline(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const img = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(img.data);
  const out = img.data;
  const opaque = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    return src[(y * w + x) * 4 + 3] > 20;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) {
        const i = (y * w + x) * 4;
        out[i] = 20;
        out[i + 1] = 24;
        out[i + 2] = 34;
        out[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Returns a cached crisp 16x22 GBA FireRed-style character sprite for any NPC/Player,
 * direction, and walk frame (0 = idle, 1 = left step, 2 = right step).
 */
export function getOverworldCharacterSprite(
  style: string,
  dir: Direction,
  frame: number
): HTMLCanvasElement {
  const f = frame % 3;
  const key = `${style}_${dir}_${f}`;
  const existing = spriteCache.get(key);
  if (existing) return existing;

  const w = 16;
  const h = 22;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;

  const pal = CHARACTER_PALETTES[style] ?? CHARACTER_PALETTES.villager;
  const bob = f === 0 ? 0 : -1;

  // === HEAD & HAIR/HAT (rows 1..10) ===
  if (pal.hat) {
    // Iconic curved baseball/trainer cap with front white visor patch!
    px(ctx, 4, 1 + bob, 8, 2, pal.hat);
    px(ctx, 3, 3 + bob, 10, 3, pal.hat);
    px(ctx, 3, 5 + bob, 10, 1, pal.shirtShade);
    if (dir === 'down') {
      px(ctx, 5, 3 + bob, 6, 2, pal.hatTrim ?? '#ffffff');
    } else if (dir === 'left') {
      px(ctx, 2, 4 + bob, 4, 2, pal.hat);
      px(ctx, 4, 3 + bob, 3, 1, pal.hatTrim ?? '#ffffff');
    } else if (dir === 'right') {
      px(ctx, 10, 4 + bob, 4, 2, pal.hat);
      px(ctx, 9, 3 + bob, 3, 1, pal.hatTrim ?? '#ffffff');
    }
    // Hair peeks beneath cap
    px(ctx, 3, 6 + bob, 10, 2, pal.hair);
  } else if (pal.nurseCap) {
    px(ctx, 5, 1 + bob, 6, 3, '#ffffff');
    px(ctx, 7, 2 + bob, 2, 1, '#ef4444');
    px(ctx, 3, 4 + bob, 10, 4, pal.hair);
    px(ctx, 2, 6 + bob, 2, 3, pal.hairShade);
    px(ctx, 12, 6 + bob, 2, 3, pal.hairShade);
  } else {
    px(ctx, 4, 2 + bob, 8, 5, pal.hair);
    px(ctx, 3, 3 + bob, 10, 4, pal.hair);
    if (pal.spikyHair) {
      px(ctx, 3, 1 + bob, 2, 2, pal.hair);
      px(ctx, 7, 1 + bob, 2, 2, pal.hair);
      px(ctx, 11, 1 + bob, 2, 2, pal.hair);
    }
    px(ctx, 4, 2 + bob, 6, 1, pal.hairShade);
  }

  // Face / Back of head
  if (dir === 'up') {
    px(ctx, 4, 5 + bob, 8, 5, pal.hair);
    px(ctx, 5, 8 + bob, 6, 2, pal.hairShade);
  } else if (dir === 'down') {
    px(ctx, 4, 6 + bob, 8, 4, pal.skin);
    px(ctx, 4, 9 + bob, 8, 1, pal.skinShade);
    // Crisp GBA anime eyes with white highlight
    px(ctx, 5, 7 + bob, 2, 2, '#181c24');
    px(ctx, 9, 7 + bob, 2, 2, '#181c24');
    px(ctx, 5, 7 + bob, 1, 1, '#ffffff');
    px(ctx, 9, 7 + bob, 1, 1, '#ffffff');
    // Hair bangs
    px(ctx, 4, 6 + bob, 2, 1, pal.hair);
    px(ctx, 10, 6 + bob, 2, 1, pal.hair);
  } else if (dir === 'left') {
    px(ctx, 4, 6 + bob, 7, 4, pal.skin);
    px(ctx, 9, 6 + bob, 3, 4, pal.hair);
    px(ctx, 5, 7 + bob, 2, 2, '#181c24');
    px(ctx, 5, 7 + bob, 1, 1, '#ffffff');
  } else {
    px(ctx, 5, 6 + bob, 7, 4, pal.skin);
    px(ctx, 4, 6 + bob, 3, 4, pal.hair);
    px(ctx, 9, 7 + bob, 2, 2, '#181c24');
    px(ctx, 10, 7 + bob, 1, 1, '#ffffff');
  }

  // === TORSO / JACKET / ARMS (rows 10..16) ===
  const armSwingL = f === 1 ? -1 : f === 2 ? 1 : 0;
  const armSwingR = -armSwingL;

  // Arms
  px(ctx, 2, 11 + bob + armSwingL, 2, 4, pal.shirtShade);
  px(ctx, 2, 14 + bob + armSwingL, 2, 2, pal.skin);
  px(ctx, 12, 11 + bob + armSwingR, 2, 4, pal.shirtShade);
  px(ctx, 12, 14 + bob + armSwingR, 2, 2, pal.skin);

  // Main jacket / shirt
  px(ctx, 4, 10 + bob, 8, 6, pal.shirt);
  px(ctx, 4, 15 + bob, 8, 1, pal.shirtShade);

  if (dir === 'down') {
    // Collar / undershirt / lab coat lapel
    px(ctx, 6, 10 + bob, 4, 2, pal.accent);
    if (pal.labCoat) {
      px(ctx, 7, 11 + bob, 2, 5, pal.accent);
    } else {
      px(ctx, 7, 11 + bob, 2, 4, pal.accent);
    }
  } else if (dir === 'up') {
    // Backpack or collar
    px(ctx, 5, 11 + bob, 6, 4, style === 'red' ? '#b45309' : pal.shirtShade);
  }

  // === LEGS & SNEAKERS (rows 16..20) ===
  const legLY = f === 1 ? 15 : 16;
  const legRY = f === 2 ? 15 : 16;
  px(ctx, 4, legLY, 3, 3, pal.pants);
  px(ctx, 9, legRY, 3, 3, pal.pants);
  px(ctx, 4, legLY + 3, 3, 2, pal.shoes);
  px(ctx, 9, legRY + 3, 3, 2, pal.shoes);

  addGbaOutline(ctx, w, h);
  spriteCache.set(key, c);
  return c;
}

/**
 * Generates a crisp 36x44 pixel-art Trainer Battle Sprite for the Battle Start
 * Poké Ball throw intro and 2P PvP Team Builder!
 */
export function getBattleTrainerSprite(style: string, faceRight = false): HTMLCanvasElement {
  const key = `${style}_${faceRight ? 'r' : 'l'}`;
  const existing = battleTrainerCache.get(key);
  if (existing) return existing;

  const w = 36;
  const h = 44;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;

  const pal = CHARACTER_PALETTES[style] ?? CHARACTER_PALETTES.red;

  const draw = () => {
    // Sculpted Head & Cap / Hair
    if (pal.hat) {
      // Rounded GBA cap dome + curved visor pointing forward
      px(ctx, 13, 3, 11, 2, pal.hat);
      px(ctx, 11, 5, 15, 3, pal.hat);
      px(ctx, 7, 7, 19, 2, pal.hat);
      px(ctx, 12, 5, 8, 2, pal.hatTrim ?? '#ffffff'); // iconic white semi-circle cap badge
      px(ctx, 7, 8, 7, 1, pal.shirtShade); // visor underside shadow
      // Swept hair bangs & sideburns under cap
      px(ctx, 11, 9, 14, 3, pal.hair);
      px(ctx, 21, 9, 5, 7, pal.hair);
      px(ctx, 23, 10, 3, 5, pal.hairShade);
    } else {
      px(ctx, 12, 4, 13, 7, pal.hair);
      px(ctx, 10, 6, 16, 6, pal.hair);
      if (pal.spikyHair) {
        // Dramatic Blue / Brock anime spikes!
        px(ctx, 8, 3, 4, 4, pal.hair);
        px(ctx, 14, 1, 5, 4, pal.hair);
        px(ctx, 21, 2, 5, 4, pal.hair);
        px(ctx, 25, 5, 3, 4, pal.hairShade);
      }
      px(ctx, 13, 4, 8, 2, pal.hairShade);
    }

    // 3/4 Profile Face with cheek shading & sharp eyes
    px(ctx, 11, 10, 11, 7, pal.skin);
    px(ctx, 12, 16, 9, 2, pal.skinShade);
    px(ctx, 12, 11, 2, 3, '#181c24'); // front eye
    px(ctx, 12, 11, 1, 1, '#ffffff');
    px(ctx, 17, 11, 2, 3, '#181c24'); // back eye
    px(ctx, 17, 11, 1, 1, '#ffffff');
    px(ctx, 14, 15, 3, 1, '#9a3412'); // determined mouth

    // Neck & Dynamic Angled Jacket / Vest
    px(ctx, 15, 17, 5, 2, pal.skinShade);
    px(ctx, 12, 18, 12, 11, pal.shirt);
    px(ctx, 11, 19, 13, 9, pal.shirt);
    px(ctx, 11, 26, 13, 3, pal.shirtShade);
    // Crisp collar & undershirt V
    px(ctx, 13, 18, 5, 9, pal.accent);
    px(ctx, 12, 18, 2, 3, pal.accent);
    px(ctx, 18, 18, 2, 3, pal.accent);
    // Belt
    px(ctx, 11, 28, 13, 2, '#1e293b');
    px(ctx, 14, 28, 3, 2, '#facc15');

    // Extended forward throwing arm holding Poké Ball!
    px(ctx, 6, 19, 6, 4, pal.shirt);
    px(ctx, 6, 22, 6, 1, pal.shirtShade);
    px(ctx, 3, 18, 4, 4, pal.skin);
    // Poké Ball poised in hand
    px(ctx, 2, 14, 5, 5, '#ef4444');
    px(ctx, 2, 17, 5, 2, '#f8fafc');
    px(ctx, 2, 16, 5, 1, '#111827');

    // Back arm braced with cuff
    px(ctx, 23, 19, 5, 7, pal.shirtShade);
    px(ctx, 24, 25, 4, 3, pal.skin);

    // Athletic split-stance legs & detailed FireRed sneakers!
    px(ctx, 10, 30, 6, 9, pal.pants);
    px(ctx, 19, 30, 6, 9, pal.pants);
    px(ctx, 10, 34, 2, 5, '#1e3a8a'); // knee shading
    px(ctx, 23, 34, 2, 5, '#1e3a8a');
    px(ctx, 7, 39, 9, 4, pal.shoes);
    px(ctx, 19, 39, 9, 4, pal.shoes);
    px(ctx, 7, 41, 9, 2, '#f8fafc');
    px(ctx, 19, 41, 9, 2, '#f8fafc');
  };

  if (faceRight) {
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    draw();
    ctx.restore();
  } else {
    draw();
  }

  addGbaOutline(ctx, w, h);
  battleTrainerCache.set(key, c);
  return c;
}
