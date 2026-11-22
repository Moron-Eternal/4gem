#!/usr/bin/env python3
"""
Procedural High-Craft Pixel Art, PBR Texture Set (MER + Heightmap),
Entity Skin, Particle Atlas, and Pack Icon Generator for:
    AURALIS: The Prism-Tide Firmament (Minecraft Bedrock Edition)
"""

import json
import math
import os
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
RP_TEX = ROOT / "packs" / "RP" / "textures"
BP_ROOT = ROOT / "packs" / "BP"
RP_ROOT = ROOT / "packs" / "RP"

BLOCKS_DIR = RP_TEX / "blocks"
ITEMS_DIR = RP_TEX / "items"
ENTITY_DIR = RP_TEX / "entity"
PARTICLE_DIR = RP_TEX / "particle"

for d in (BLOCKS_DIR, ITEMS_DIR, ENTITY_DIR, PARTICLE_DIR):
    d.mkdir(parents=True, exist_ok=True)


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(round(v))))


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_rgb(c1, c2, t):
    return (
        clamp(lerp(c1[0], c2[0], t)),
        clamp(lerp(c1[1], c2[1], t)),
        clamp(lerp(c1[2], c2[2], t)),
    )


def hash2d(x, y, seed=0):
    n = (x * 374761393 + y * 668265263 + seed * 1442695041) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def tile_noise(x, y, size=16, period=4, seed=0):
    fx = (x / size) * period
    fy = (y / size) * period
    ix, iy = int(math.floor(fx)), int(math.floor(fy))
    tx, ty = fx - ix, fy - iy
    u = tx * tx * (3 - 2 * tx)
    v = ty * ty * (3 - 2 * ty)
    x0, x1 = ix % period, (ix + 1) % period
    y0, y1 = iy % period, (iy + 1) % period
    a = hash2d(x0, y0, seed)
    b = hash2d(x1, y0, seed)
    c = hash2d(x0, y1, seed)
    d = hash2d(x1, y1, seed)
    return lerp(lerp(a, b, u), lerp(c, d, u), v)


def fbm_tile(x, y, size=16, seed=0):
    return (
        0.55 * tile_noise(x, y, size, 4, seed)
        + 0.30 * tile_noise(x, y, size, 8, seed + 17)
        + 0.15 * hash2d(x % size, y % size, seed + 31)
    )


def save_block_pbr(name, color_img, mer_img, height_img):
    """Save block PNG, MER RGB PNG, single-channel L heightmap PNG, and .texture_set.json."""
    color_img.save(BLOCKS_DIR / f"{name}.png")
    mer_img.convert("RGB").save(BLOCKS_DIR / f"{name}_mer.png")
    height_img.convert("L").save(BLOCKS_DIR / f"{name}_heightmap.png")
    ts = {
        "format_version": "1.16.100",
        "minecraft:texture_set": {
            "color": name,
            "metalness_emissive_roughness": f"{name}_mer",
            "heightmap": f"{name}_heightmap",
        },
    }
    with open(BLOCKS_DIR / f"{name}.texture_set.json", "w", encoding="utf-8") as f:
        json.dump(ts, f, indent=2)


def save_entity_pbr(name, color_img, mer_img):
    """Save entity RGBA PNG, MER RGB PNG, and .texture_set.json (for glowing eyes/cores/wings!)."""
    color_img.save(ENTITY_DIR / f"{name}.png")
    mer_img.convert("RGB").save(ENTITY_DIR / f"{name}_mer.png")
    ts = {
        "format_version": "1.16.100",
        "minecraft:texture_set": {
            "color": name,
            "metalness_emissive_roughness": f"{name}_mer",
        },
    }
    with open(ENTITY_DIR / f"{name}.texture_set.json", "w", encoding="utf-8") as f:
        json.dump(ts, f, indent=2)


# =============================================================================
# 1. BLOCK TEXTURES (16x16 Painterly Pixel Art + PBR Maps)
# =============================================================================

def generate_blocks():
    block_names = []

    # --- 1. auralite_stone: Pale pearl travertine with layered sedimentary veins & subtle rose-gold flecks ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=101)
            n2 = tile_noise(x * 2, y, 16, period=4, seed=113)
            strata = 0.5 + 0.5 * math.sin((y / 16.0) * math.tau * 2 + n * 2.2)
            t = 0.54 * n + 0.30 * strata + 0.16 * n2
            col = lerp_rgb((206, 192, 178), (249, 243, 234), t)
            rough = clamp(162 + (1.0 - t) * 48)
            metal, emis = 0, 0
            hv = clamp(112 + t * 88)
            vein = abs(math.sin((x * 0.42 + y * 0.78) + n * 2.1))
            if vein < 0.082:
                col = lerp_rgb(col, (232, 188, 108), 0.74)
                metal = 165
                rough = 70
                hv = clamp(hv - 16)
            elif n < 0.22:
                col = lerp_rgb(col, (180, 164, 154), 0.52)
                hv = clamp(hv - 28)
            elif t > 0.80:
                col = lerp_rgb(col, (254, 250, 244), 0.35)
                hv = clamp(hv + 14)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("auralite_stone", img, mer, hgt)
    block_names.append("auralite_stone")

    # --- 2. starstone: Deep twilight indigo basalt with cosmic slate striations & twinkling starlight ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    stars = {
        (2, 3): ("cyan", 1.0),
        (11, 2): ("gold", 1.0),
        (6, 9): ("cyan", 0.95),
        (14, 11): ("violet", 0.95),
        (4, 14): ("gold", 0.9),
        (10, 13): ("cyan", 0.85),
        (8, 5): ("violet", 0.6),
    }
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=202)
            ridge = 0.5 + 0.5 * math.sin((x * 0.35 + y * 0.65) + n * 2.6)
            t = 0.65 * n + 0.35 * ridge
            col = lerp_rgb((18, 22, 48), (62, 66, 118), t)
            metal, emis, rough = 22, 0, clamp(148 + (1.0 - t) * 58)
            hv = clamp(92 + t * 98)
            if ridge < 0.16:
                col = lerp_rgb(col, (12, 14, 34), 0.6)
                hv = clamp(hv - 36)
            if (x, y) in stars:
                kind, intensity = stars[(x, y)]
                if kind == "cyan":
                    col = lerp_rgb(col, (132, 248, 244), intensity)
                elif kind == "gold":
                    col = lerp_rgb(col, (255, 224, 126), intensity)
                else:
                    col = lerp_rgb(col, (216, 174, 255), intensity)
                emis = clamp(150 + intensity * 75)
                rough = 36
                hv = 225
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("starstone", img, mer, hgt)
    block_names.append("starstone")

    # --- 3. tide_moss_top: Lush iridescent aquamarine-turquoise velvet moss with delicate rose-pearl dew buds ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    blossoms = {(3, 4), (11, 6), (7, 13), (13, 12)}
    dew_tips = {(4, 4), (11, 5), (6, 13)}
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=303)
            tuft = hash2d(x, y, seed=319)
            t = 0.72 * n + 0.28 * tuft
            c1 = (24, 118, 128)
            c2 = (64, 204, 194)
            c3 = (146, 248, 232)
            col = lerp_rgb(c1, c2, min(1.0, t * 1.38)) if t < 0.70 else lerp_rgb(c2, c3, (t - 0.70) / 0.30)
            emis = 32 if t > 0.74 else 10
            rough = clamp(188 - t * 44)
            hv = clamp(114 + t * 96)
            if (x, y) in blossoms:
                col = (255, 214, 220)
                emis = 165
                rough = 75
                hv = 236
            elif (x, y) in dew_tips:
                col = lerp_rgb(col, (240, 252, 248), 0.55)
                emis = 85
                hv = 212
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (0, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("tide_moss_top", img, mer, hgt)
    block_names.append("tide_moss_top")

    # --- 4. tide_moss_side: Pearl Auralite stone topped by softly shaded draped turquoise moss ---
    stone_img = Image.open(BLOCKS_DIR / "auralite_stone.png").convert("RGBA")
    stone_mer = Image.open(BLOCKS_DIR / "auralite_stone_mer.png").convert("RGB")
    stone_hgt = Image.open(BLOCKS_DIR / "auralite_stone_heightmap.png").convert("L")
    img = stone_img.copy()
    mer = stone_mer.copy()
    hgt = stone_hgt.copy()
    drape = [4, 5, 6, 4, 3, 5, 7, 5, 4, 3, 5, 6, 4, 3, 5, 4]
    for x in range(16):
        depth = drape[x]
        for y in range(depth):
            n = fbm_tile(x, y, 16, seed=307)
            t = 1.0 - (y / max(1, depth))
            col = lerp_rgb((26, 130, 136), (124, 242, 226), 0.32 + 0.56 * t + 0.12 * n)
            if y == depth - 1:
                col = lerp_rgb(col, (18, 86, 96), 0.42)
            elif y == 0:
                col = lerp_rgb(col, (162, 250, 238), 0.25)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (0, 28 if y < depth - 1 else 8, 168))
            hgt.putpixel((x, y), clamp(192 + t * 42))
        # Soft ambient occlusion shadow right beneath moss overhang on the pearl stone!
        if depth < 16:
            sc = img.getpixel((x, depth))[:3]
            img.putpixel((x, depth), (*lerp_rgb(sc, (148, 140, 136), 0.38), 255))
    save_block_pbr("tide_moss_side", img, mer, hgt)
    block_names.append("tide_moss_side")

    # --- 5. gilded_travertine: Chiseled alabaster slab with beveled burnished gold borders & diamond inlay ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=404)
            col = lerp_rgb((228, 218, 204), (252, 246, 236), n)
            metal, emis, rough = 0, 0, 140
            hv = clamp(150 + n * 34)
            bevel_lit = (x == 2 and 2 <= y <= 13) or (y == 2 and 2 <= x <= 13)
            bevel_shd = (x == 13 and 2 <= y <= 13) or (y == 13 and 2 <= x <= 13)
            if x in (0, 15) or y in (0, 15):
                col = lerp_rgb((186, 172, 158), (212, 198, 184), n)
                hv = 88
            elif x in (1, 14) or y in (1, 14):
                is_hi = (x == 1 or y == 1) and not (x == 14 or y == 14)
                col = lerp_rgb((196, 144, 48), (255, 226, 126), (0.68 if is_hi else 0.28) + 0.25 * n)
                metal, emis, rough = 235, 28, 48
                hv = 216
            elif bevel_lit:
                col = lerp_rgb(col, (255, 252, 246), 0.45)
                hv = 185
            elif bevel_shd:
                col = lerp_rgb(col, (192, 178, 164), 0.35)
                hv = 128
            dist = abs(x - 7.5) + abs(y - 7.5)
            if 3.2 <= dist <= 4.3:
                is_hi = (x + y) < 15
                col = lerp_rgb((204, 152, 52), (255, 232, 136), (0.72 if is_hi else 0.35) + 0.2 * n)
                metal, emis, rough = 238, 38, 44
                hv = 222
            elif dist < 2.2:
                col = lerp_rgb((96, 226, 222), (192, 254, 250), 0.55 + 0.45 * (1.0 - dist / 2.2))
                metal, emis, rough = 45, 110, 38
                hv = 192
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("gilded_travertine", img, mer, hgt)
    block_names.append("gilded_travertine")

    # --- 6. solarium_ore: Starstone embedded with sculpted glowing molten-gold crystal clusters ---
    base_img = Image.open(BLOCKS_DIR / "starstone.png").convert("RGBA")
    base_mer = Image.open(BLOCKS_DIR / "starstone_mer.png").convert("RGB")
    base_hgt = Image.open(BLOCKS_DIR / "starstone_heightmap.png").convert("L")
    img, mer, hgt = base_img.copy(), base_mer.copy(), base_hgt.copy()
    ore_pixels = [
        (3, 3), (4, 3), (4, 4), (5, 4), (3, 4),
        (10, 4), (11, 4), (11, 5), (12, 5), (10, 5),
        (6, 9), (7, 9), (7, 10), (8, 10), (8, 11), (7, 11),
        (2, 11), (3, 12), (2, 12),
        (12, 11), (13, 12), (12, 12), (13, 11),
    ]
    bright_cores = {(4, 3), (11, 4), (7, 10), (12, 12), (2, 12)}
    dark_rims = {(5, 4), (12, 5), (8, 11), (3, 12), (13, 12)}
    for ox, oy in ore_pixels:
        if (ox, oy) in bright_cores:
            img.putpixel((ox, oy), (255, 248, 190, 255))
            mer.putpixel((ox, oy), (240, 255, 28))
            hgt.putpixel((ox, oy), 250)
        elif (ox, oy) in dark_rims:
            img.putpixel((ox, oy), (196, 134, 34, 255))
            mer.putpixel((ox, oy), (215, 135, 55))
            hgt.putpixel((ox, oy), 192)
        else:
            img.putpixel((ox, oy), (246, 190, 62, 255))
            mer.putpixel((ox, oy), (225, 200, 44))
            hgt.putpixel((ox, oy), 224)
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = (ox + dx) % 16, (oy + dy) % 16
            if (nx, ny) not in ore_pixels:
                c = img.getpixel((nx, ny))
                blended = lerp_rgb(c[:3], (182, 126, 46), 0.36)
                img.putpixel((nx, ny), (*blended, 255))
    save_block_pbr("solarium_ore", img, mer, hgt)
    block_names.append("solarium_ore")

    # --- 7. solarium_block: Radiant forged celestial gold-crystal block with sunburst bezel ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            dx, dy = abs(x - 7.5), abs(y - 7.5)
            edge = max(dx, dy)
            n = fbm_tile(x, y, 16, seed=505)
            if edge >= 6.5:
                is_hi = (x == 0 or y == 0)
                col = lerp_rgb((148, 96, 20), (224, 168, 54), (0.65 if is_hi else 0.35) * 0.7 + 0.3 * n)
                metal, emis, rough, hv = 242, 42, 54, 152
            elif edge >= 5.0:
                is_hi = (x < 3 or y < 3)
                col = lerp_rgb((218, 164, 52), (255, 232, 134), (0.72 if is_hi else 0.38) + 0.2 * n)
                metal, emis, rough, hv = 248, 105, 38, 224
            else:
                rad = math.hypot(dx, dy) / 5.8
                ray = 0.14 if (abs(dx - dy) < 0.7 or dx < 0.7 or dy < 0.7) else 0.0
                col = lerp_rgb((255, 252, 218), (242, 184, 58), max(0.0, min(1.0, rad - ray)))
                metal, emis, rough, hv = 225, clamp(242 - rad * 105 + ray * 80), 28, clamp(248 - rad * 36)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("solarium_block", img, mer, hgt)
    block_names.append("solarium_block")

    # --- 8. prism_log_side: Handcrafted vertical pearl-lavender bark with subtle aqua sap fissures ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    col_shade = [0.35, 0.72, 0.92, 0.62, 0.18, 0.68, 0.95, 0.78, 0.42, 0.76, 0.94, 0.60, 0.18, 0.66, 0.90, 0.70]
    for y in range(16):
        for x in range(16):
            grain = hash2d(x, y, seed=606)
            vstreak = tile_noise(x, y * 2, 16, period=4, seed=612)
            base_s = col_shade[x]
            knot = 1.0 if ((x in (0, 8) and y in (3, 4, 11, 12)) or (x in (4, 12) and y in (1, 8, 9))) else 0.0
            s = max(0.0, min(1.0, base_s * 0.78 + vstreak * 0.16 + grain * 0.06 - knot * 0.22))
            col = lerp_rgb((88, 76, 116), (218, 210, 228), s)
            emis = 0
            rough = clamp(178 - s * 36)
            hv = clamp(96 + s * 116)
            if (x == 4 and 2 <= y <= 13 and y not in (7, 8)) or (x == 12 and (y <= 5 or y >= 9) and y != 12):
                sap_t = 0.55 + 0.45 * vstreak
                col = lerp_rgb((66, 198, 202), (148, 248, 242), sap_t)
                emis = clamp(110 + sap_t * 65)
                rough = 72
                hv = 76
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (6, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("prism_log_side", img, mer, hgt)
    block_names.append("prism_log_side")

    # --- 9. prism_log_top: Perfectly centered symmetric concentric rings + full 2px perimeter bark frame ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            dx = abs(x - 7.5)
            dy = abs(y - 7.5)
            edge_d = min(x, 15 - x, y, 15 - y)
            cheb = max(dx, dy)
            eucl = math.hypot(dx, dy)
            r = 0.65 * eucl + 0.35 * cheb
            n_sym = hash2d(int(dx * 2), int(dy * 2), seed=609)
            n_fine = hash2d(x, y, seed=619)

            if edge_d == 0:
                col = lerp_rgb((82, 70, 110), (118, 104, 148), 0.5 * n_sym + 0.5 * n_fine)
                emis, rough, hv = 0, 185, 165
            elif edge_d == 1:
                is_corner = dx > 5.8 and dy > 5.8
                if is_corner:
                    col = lerp_rgb((94, 80, 124), (126, 112, 156), n_fine)
                    hv = 158
                else:
                    col = lerp_rgb((138, 124, 164), (176, 164, 196), 0.6 * n_sym + 0.4 * n_fine)
                    hv = 178
                emis, rough = 0, 168
            else:
                if r < 1.15:
                    col = lerp_rgb((248, 238, 194), (255, 248, 218), n_fine)
                    emis, rough, hv = 110, 105, 162
                elif r < 2.35:
                    col = lerp_rgb((132, 224, 222), (174, 240, 236), 0.5 + 0.5 * n_fine)
                    emis, rough, hv = 75, 115, 145
                elif r < 3.55:
                    col = lerp_rgb((228, 222, 216), (244, 240, 234), 0.5 + 0.5 * n_fine)
                    emis, rough, hv = 15, 130, 164
                elif r < 4.75:
                    col = lerp_rgb((152, 214, 214), (192, 230, 228), 0.5 + 0.5 * n_fine)
                    emis, rough, hv = 48, 125, 148
                else:
                    col = lerp_rgb((218, 214, 212), (238, 234, 228), 0.5 + 0.5 * n_fine)
                    emis, rough, hv = 10, 135, 162
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (0, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("prism_log_top", img, mer, hgt)
    block_names.append("prism_log_top")

    # --- 10. prism_planks: Crisp 4-row Minecraft wooden planks in luminous ivory & soft seafoam ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    plank_seams = [2, 10, 6, 14]
    for y in range(16):
        row = y // 4
        ry = y % 4
        seam_x = plank_seams[row]
        for x in range(16):
            g1 = tile_noise(x, row * 3 + ry, 16, period=4, seed=707 + row * 11)
            g2 = hash2d(x, y, seed=719 + row * 7)
            grain = 0.65 * g1 + 0.35 * g2
            base = lerp_rgb((196, 216, 214), (242, 238, 230), 0.35 + 0.65 * grain)
            hv = clamp(158 + grain * 24)
            rough = 138
            emis = 10
            if ry == 3 or x == seam_x:
                col = lerp_rgb(base, (124, 144, 154), 0.62)
                hv = 82
                rough = 175
                emis = 0
            elif ry == 0 or x == (seam_x + 1) % 16:
                col = lerp_rgb(base, (254, 252, 246), 0.42)
                hv = 198
                rough = 118
                emis = 18
            else:
                col = base
                if ry == 1 and grain > 0.68:
                    col = lerp_rgb(col, (176, 232, 228), 0.30)
                    emis = 24
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (0, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("prism_planks", img, mer, hgt)
    block_names.append("prism_planks")

    # --- 11. prism_leaves: Translucent sea-glass turquoise & rose-gold glowing foliage with petal depth ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=808)
            n2 = hash2d(x, y, seed=811)
            leaf_d = fbm_tile((x + 4) % 16, (y + 3) % 16, 16, seed=823)
            if n < 0.22 and n2 < 0.56:
                img.putpixel((x, y), (0, 0, 0, 0))
                mer.putpixel((x, y), (0, 0, 200))
                hgt.putpixel((x, y), 0)
            else:
                if n2 > 0.86:
                    col = lerp_rgb((248, 168, 184), (255, 228, 186), n)
                    emis = 175
                    hv = 236
                else:
                    col = lerp_rgb((30, 152, 164), (154, 252, 240), 0.65 * n + 0.35 * leaf_d)
                    if leaf_d < 0.30:
                        col = lerp_rgb(col, (22, 108, 124), 0.45)
                    emis = clamp(32 + n * 78)
                    hv = clamp(118 + n * 114)
                img.putpixel((x, y), (*col, 255))
                mer.putpixel((x, y), (16, emis, 82))
                hgt.putpixel((x, y), hv)
    save_block_pbr("prism_leaves", img, mer, hgt)
    block_names.append("prism_leaves")

    # --- 12. starlight_glass: Translucent pale cyan-gold celestial etched glass ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            border = x in (0, 15) or y in (0, 15)
            inner = x in (1, 14) or y in (1, 14)
            corner_star = (x in (2, 13) and y in (2, 13))
            sheen = ((x + y in (7, 8)) and (3 <= x <= 10) and (3 <= y <= 10)) or ((x, y) in ((11, 4), (12, 5)))
            if border:
                is_hi = x == 0 or y == 0
                img.putpixel((x, y), (242, 204, 114, 244) if is_hi else (206, 164, 78, 244))
                mer.putpixel((x, y), (230, 50, 40))
                hgt.putpixel((x, y), 224)
            elif inner:
                img.putpixel((x, y), (150, 246, 248, 190))
                mer.putpixel((x, y), (35, 88, 22))
                hgt.putpixel((x, y), 182)
            elif corner_star:
                img.putpixel((x, y), (255, 236, 168, 232))
                mer.putpixel((x, y), (195, 165, 28))
                hgt.putpixel((x, y), 210)
            elif sheen:
                img.putpixel((x, y), (232, 255, 255, 142))
                mer.putpixel((x, y), (15, 105, 12))
                hgt.putpixel((x, y), 150)
            else:
                img.putpixel((x, y), (124, 230, 242, 70))
                mer.putpixel((x, y), (10, 36, 14))
                hgt.putpixel((x, y), 128)
    save_block_pbr("starlight_glass", img, mer, hgt)
    block_names.append("starlight_glass")

    # --- 13. sea_crystal: Crisp faceted glowing sea-glass & amethyst crystal (per-face UV synced!) ---
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    mer = Image.new("RGB", (16, 16), (0, 0, 128))
    hgt = Image.new("L", (16, 16), 128)
    for y in range(16):
        t = 1.0 - (y / 15.0)
        for x in range(16):
            fx = x % 4
            diag = (x + y * 2) % 8
            if y >= 13:
                n = hash2d(x, y, seed=555)
                col = lerp_rgb((22, 54, 82), (48, 122, 142), 0.35 + 0.45 * (fx in (1, 2)) + 0.2 * n)
                emis, rough, hv = 42, 92, 118
            else:
                if fx == 0:
                    col = lerp_rgb((36, 124, 156), (124, 134, 222), t * 0.65)
                    emis, rough, hv = clamp(85 + t * 85), 40, 148
                elif fx == 1:
                    col = lerp_rgb((162, 250, 248), (248, 255, 255), 0.38 + t * 0.62)
                    emis, rough, hv = clamp(185 + t * 70), 12, 246
                elif fx == 2:
                    col = lerp_rgb((56, 202, 218), (192, 236, 255), t * 0.72)
                    if diag in (2, 3):
                        col = lerp_rgb(col, (242, 214, 255), 0.48)
                    emis, rough, hv = clamp(140 + t * 95), 22, 198
                else:
                    col = lerp_rgb((26, 94, 128), (96, 136, 206), t * 0.55)
                    emis, rough, hv = clamp(70 + t * 72), 50, 124
                if y <= 2:
                    tip_mix = 0.28 if fx in (0, 3) else 0.48
                    col = lerp_rgb(col, (194, 250, 255), tip_mix)
                    emis = clamp(emis + 35)
                    hv = clamp(hv + 24)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (48, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("sea_crystal", img, mer, hgt)
    block_names.append("sea_crystal")

    # --- 14. lantern_bloom: INTENSE MASTERWORK REWORK — 32x32 4-Quadrant Sculpted Celestial Lotus Lantern! ---
    #   Q0 (0..15,  0..15): Luminous peach-apricot -> rose-blush filigree glass side pane + brass cornice
    #   Q1 (16..31, 0..15): TOP CAP — Centered symmetric 8-petal gilded brass lotus rosette + peach-ivory jewel!
    #   Q2 (0..15, 16..31): BOTTOM FACE — Concentric brass bezel + warm glowing apricot glass diffuser
    #   Q3 (16..31,16..31): Left half (16..23): Brushed brass ribs & cornice; Right half (24..31): Glowing finial bud!
    img = Image.new("RGBA", (32, 32), (206, 154, 58, 255))
    mer = Image.new("RGB", (32, 32), (220, 40, 50))
    hgt = Image.new("L", (32, 32), 160)

    # Q0: Glowing Stained-Glass Lotus Side Panel (0..15, 0..15)
    for y in range(16):
        for x in range(16):
            dx = abs(x - 7.5)
            dy = abs(y - 7.5)
            r = math.hypot(dx, dy) / 7.2
            n = hash2d(x, y, seed=1414)
            if y in (0, 15) or x in (0, 15):
                # Outer bronze-gold bezel lip
                col = lerp_rgb((152, 102, 30), (208, 154, 56), 0.4 + 0.6 * (y == 0 or x == 0))
                metal, emis, rough, hv = 235, 18, 52, 188
            elif y in (1, 14) or x in (1, 14):
                # Gleaming gilded brass inner frame molding + corner rivets
                is_rivet = (x in (1, 14) and y in (1, 14))
                col = (255, 232, 138) if is_rivet else lerp_rgb((204, 152, 52), (248, 206, 98), 0.55 + 0.3 * n)
                metal, emis, rough, hv = 242, 48 if is_rivet else 26, 40, 224
            else:
                # Warm radiant peach-apricot candle heart blooming into dusty rose-coral!
                warm_t = min(1.0, r * 1.05)
                if warm_t < 0.48:
                    col = lerp_rgb((255, 250, 218), (255, 204, 154), warm_t / 0.48)
                else:
                    col = lerp_rgb((255, 204, 154), (242, 132, 152), (warm_t - 0.48) / 0.52)
                metal = 0
                emis = clamp(255 - warm_t * 62)
                rough = 38
                hv = clamp(216 - warm_t * 48)
                # Delicate arched golden lotus filigree lattice across upper corners & center stem
                arch_d = abs(math.hypot(dx, (y - 9.0)) - 5.2)
                if (arch_d < 0.55 and y <= 8) or (dx < 0.7 and y in (2, 13)):
                    col = lerp_rgb(col, (238, 186, 80), 0.78)
                    metal, emis, rough, hv = 215, 115, 48, 226
                elif dx < 1.8 and dy < 1.8:
                    # Extra luminous golden-white flame heart
                    col = lerp_rgb(col, (255, 253, 236), 0.55)
                    emis = 255
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)

    # Q1: TOP CAP — Ornate Perfectly Symmetric 8-Petal Gilded Brass Lotus Rosette (16..31, 0..15)
    for ly in range(16):
        for lx in range(16):
            x, y = 16 + lx, ly
            dx = lx - 7.5
            dy = ly - 7.5
            cheb = max(abs(dx), abs(dy))
            r = math.hypot(dx, dy)
            ang = math.atan2(dy, dx)
            n = hash2d(int(abs(dx) * 2), int(abs(dy) * 2), seed=1421)
            petal_wave = 0.5 + 0.5 * math.cos(ang * 8.0)

            if cheb >= 7.0:
                # Crisp dark antique-bronze outer molding border
                col = lerp_rgb((128, 84, 24), (174, 122, 40), 0.5 + 0.5 * n)
                metal, emis, rough, hv = 232, 12, 58, 135
            elif cheb >= 6.0:
                # Raised brushed gold bevel cornice
                col = lerp_rgb((212, 162, 58), (254, 224, 124), 0.55 + 0.45 * petal_wave)
                metal, emis, rough, hv = 245, 38, 38, 222
            elif r >= 2.7:
                # Sculpted 8-petal brass lotus relief!
                # Carved petals rise bright gold; grooves recede into warm bronze
                if petal_wave > 0.42:
                    t_p = (petal_wave - 0.42) / 0.58
                    col = lerp_rgb((194, 142, 46), (255, 230, 132), 0.35 + 0.65 * t_p)
                    metal, emis, rough, hv = 244, clamp(30 + t_p * 55), 36, clamp(185 + t_p * 55)
                else:
                    col = lerp_rgb((122, 78, 26), (168, 114, 38), petal_wave / 0.42)
                    metal, emis, rough, hv = 225, 16, 62, 118
                # Delicate glowing warm-rose filigree dots nestled between outer petal tips
                if 4.2 <= r <= 5.4 and petal_wave < 0.25:
                    col = (255, 198, 174)
                    metal, emis, rough, hv = 60, 195, 40, 198
            elif r >= 1.9:
                # Recessed bronze collar framing the lotus finial crown
                col = lerp_rgb((138, 90, 28), (196, 144, 52), n)
                metal, emis, rough, hv = 238, 32, 46, 152
            else:
                # Perfectly centered luminous warm peach-ivory lotus jewel cabochon!
                t_c = r / 1.9
                col = lerp_rgb((255, 250, 220), (252, 184, 162), t_c)
                metal, emis, rough, hv = 40, clamp(255 - t_c * 55), 26, clamp(248 - t_c * 24)

            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)

    # Q2: BOTTOM FACE — Brushed Brass Underside Bezel + Warm Apricot Diffuser Window (0..15, 16..31)
    for ly in range(16):
        for lx in range(16):
            x, y = lx, 16 + ly
            dx, dy = lx - 7.5, ly - 7.5
            r = math.hypot(dx, dy)
            cheb = max(abs(dx), abs(dy))
            n = hash2d(lx, ly, seed=1433)
            if cheb >= 6.5:
                col = lerp_rgb((128, 84, 24), (178, 126, 44), n)
                metal, emis, rough, hv = 232, 12, 58, 145
            elif r >= 4.4:
                col = lerp_rgb((186, 134, 44), (242, 196, 88), 0.5 + 0.5 * n)
                metal, emis, rough, hv = 242, 28, 44, 205
            else:
                t_d = r / 4.4
                col = lerp_rgb((255, 248, 214), (248, 168, 154), t_d)
                metal, emis, rough, hv = 0, clamp(250 - t_d * 75), 36, clamp(190 - t_d * 30)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)

    # Q3: Corner Brass Ribs/Cornices (16..23, 16..31) + Glowing Finial Lotus Bud (24..31, 16..31)
    for ly in range(16):
        for lx in range(8):
            # Left half: Brushed vertical brass ribs & riveted horizontal cornice bands
            x, y = 16 + lx, 16 + ly
            n = hash2d(lx, ly, seed=1445)
            shade = 0.35 + 0.65 * (1.0 - abs(lx - 3.5) / 4.0)
            if ly in (0, 5, 10, 15):
                col = lerp_rgb((136, 90, 26), (192, 140, 48), shade)
                hv = 152
            else:
                col = lerp_rgb((186, 136, 44), (254, 224, 122), shade * 0.8 + n * 0.2)
                hv = 218
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (244, 34, 38))
            hgt.putpixel((x, y), hv)

        for lx in range(8):
            # Right half: Sculpted rose-peach lotus bud finial tip nestled in a golden calyx
            x, y = 24 + lx, 16 + ly
            t = 1.0 - (ly / 15.0)
            cx_d = abs(lx - 3.5) / 4.0
            if ly >= 11 or (ly <= 1 and cx_d > 0.55):
                col = lerp_rgb((176, 124, 38), (248, 206, 102), 1.0 - cx_d * 0.85)
                metal, emis, rough, hv = 244, 38, 38, 212
            elif ly <= 2:
                # Top crown of the bud: warm rose-apricot petal tip with soft golden center
                col = lerp_rgb((248, 174, 166), (255, 232, 188), 1.0 - cx_d * 0.9)
                metal, emis, rough, hv = 65, clamp(175 + (1.0 - cx_d) * 55), 30, 238
            else:
                col = lerp_rgb((244, 152, 168), (255, 234, 192), min(1.0, t * 0.65 + (1.0 - cx_d) * 0.45))
                metal, emis, rough, hv = 45, clamp(170 + t * 65), 30, 234
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)

    save_block_pbr("lantern_bloom", img, mer, hgt)
    block_names.append("lantern_bloom")

    # --- 15. chime_reed: Slender pearlescent sea-glass reeds & hanging golden wind-chime bells ---
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    mer = Image.new("RGB", (16, 16), (0, 0, 140))
    hgt = Image.new("L", (16, 16), 0)
    stalks = [(4, 3, 15), (8, 1, 15), (12, 5, 15)]
    for sx, y0, y1 in stalks:
        for y in range(y0, y1 + 1):
            t = 1.0 - (y - y0) / max(1, y1 - y0)
            col = lerp_rgb((92, 184, 184), (246, 244, 232), t)
            img.putpixel((sx, y), (*col, 255))
            mer.putpixel((sx, y), (25, clamp(45 + t * 95), 82))
            hgt.putpixel((sx, y), 184)
        for by in range(y0, min(15, y0 + 3)):
            for bx in (sx - 1, sx, sx + 1):
                if 0 <= bx < 16 and (by > y0 or bx == sx):
                    is_hi = bx == sx and by == y0
                    col = (255, 244, 178) if is_hi else ((248, 206, 96) if by == y0 + 1 else (218, 166, 62))
                    img.putpixel((bx, by), (*col, 255))
                    mer.putpixel((bx, by), (242, 185 if is_hi else 145, 32))
                    hgt.putpixel((bx, by), 240)
        # Delicate glowing aqua chime clapper drop beneath bell
        if y0 + 3 < 15:
            img.putpixel((sx, y0 + 3), (144, 250, 246, 255))
            mer.putpixel((sx, y0 + 3), (40, 225, 25))
            hgt.putpixel((sx, y0 + 3), 215)
    save_block_pbr("chime_reed", img, mer, hgt)
    block_names.append("chime_reed")

    # --- 16. gilded_brass: Brushed celestial brass plates with astrolabe arc engravings & beveled rivets ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=909)
            brush = 0.5 + 0.5 * math.sin(y * 1.6 + n * 1.4)
            col = lerp_rgb((162, 112, 34), (248, 208, 104), 0.45 + 0.4 * brush + 0.15 * n)
            metal, emis, rough, hv = 244, 12, clamp(46 + (1 - brush) * 32), clamp(168 + brush * 34)
            if x in (0, 15) or y in (0, 15):
                col = lerp_rgb(col, (108, 70, 18), 0.58)
                hv = 104
            elif x in (1, 14) or y in (1, 14):
                is_hi = x == 1 or y == 1
                col = lerp_rgb(col, (255, 236, 162) if is_hi else (142, 94, 28), 0.35)
                hv = 205 if is_hi else 138
            if x in (2, 13) and y in (2, 13):
                col = (255, 236, 154)
                hv = 232
            r = math.hypot(x - 7.5, y - 7.5)
            if abs(r - 4.8) < 0.55 or (x in (7, 8) and 2 <= y <= 13 and x == 7) or (y == 7 and 2 <= x <= 13):
                col = lerp_rgb(col, (255, 242, 176), 0.62)
                emis = 52
                hv = 128
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("gilded_brass", img, mer, hgt)
    block_names.append("gilded_brass")

    # --- 17 & 18. astrolabe_pedestal (dormant) & astrolabe_pedestal_attuned (32x32 4-quadrant PBR atlas!) ---
    #   Q0 (0..15,  0..15): Top Carved Marble Compass-Rose Dais
    #   Q1 (16..31, 0..15): Fluted Alabaster & Brass Pedestal Pillar Sides
    #   Q2 (0..15, 16..31): Brushed Celestial Gold Armillary Ring Strips
    #   Q3 (16..31,16..31): Floating Starlight Octahedron Core
    for attuned in (False, True):
        img = Image.new("RGBA", (32, 32))
        mer = Image.new("RGB", (32, 32))
        hgt = Image.new("L", (32, 32))

        # Q0: Top Carved Marble Compass-Rose Slab
        for y in range(16):
            for x in range(16):
                n = fbm_tile(x, y, 16, seed=1010)
                col = lerp_rgb((222, 212, 200), (250, 245, 238), n)
                metal, emis, rough, hv = 0, 0, 128, 155
                r = math.hypot(x - 7.5, y - 7.5)
                if x in (0, 15) or y in (0, 15):
                    col = lerp_rgb((186, 136, 44), (242, 198, 92), 0.5 + 0.5 * n)
                    metal, emis, rough, hv = 240, 80 if attuned else 18, 42, 212
                elif abs(r - 5.4) < 0.85:
                    col = lerp_rgb((204, 154, 52), (255, 228, 126), 0.5 + 0.5 * n)
                    metal, emis, rough, hv = 244, 130 if attuned else 22, 38, 226
                elif r < 3.4:
                    if attuned:
                        col = lerp_rgb((255, 250, 220), (96, 250, 248), r / 3.4)
                        metal, emis, rough, hv = 65, 255, 18, 248
                    else:
                        col = lerp_rgb((36, 52, 98), (78, 130, 162), 1.0 - r / 3.4)
                        metal, emis, rough, hv = 35, 58, 60, 172
                elif attuned and (abs(x - 7.5) < 0.8 or abs(y - 7.5) < 0.8) and r > 3.4 and r < 6.8:
                    col = (138, 248, 244)
                    emis, rough, hv = 210, 32, 198
                img.putpixel((x, y), (*col, 255))
                mer.putpixel((x, y), (metal, emis, rough))
                hgt.putpixel((x, y), hv)

        # Q1: Fluted Alabaster & Brass Column Sides (16..31, 0..15)
        for ly in range(16):
            for lx in range(16):
                x, y = 16 + lx, ly
                n = hash2d(lx, ly, seed=1025)
                if ly in (0, 1, 14, 15):
                    col = lerp_rgb((184, 134, 42), (250, 214, 108), 0.5 + 0.5 * (ly in (1, 14)))
                    metal, emis, rough, hv = 242, 75 if attuned else 20, 40, 220
                else:
                    flute = 0.5 + 0.5 * math.cos(lx * math.pi * 0.5)
                    col = lerp_rgb((206, 196, 184), (250, 245, 238), 0.35 + 0.65 * flute)
                    metal, emis, rough, hv = 0, 0, 132, clamp(130 + flute * 75)
                    if attuned and lx in (3, 7, 8, 12):
                        col = lerp_rgb(col, (124, 248, 244), 0.72)
                        emis, rough, hv = 195, 36, 110
                img.putpixel((x, y), (*col, 255))
                mer.putpixel((x, y), (metal, emis, rough))
                hgt.putpixel((x, y), hv)

        # Q2: Celestial Gold Armillary Rings (0..15, 16..31)
        for ly in range(16):
            for lx in range(16):
                x, y = lx, 16 + ly
                tick_mark = (lx % 4 == 0)
                if ly < 8:
                    # Outer gilded ring
                    col = (255, 244, 186) if tick_mark else lerp_rgb((196, 146, 46), (248, 210, 102), 0.5 + 0.5 * (ly % 4 == 1))
                    metal, emis, rough, hv = 246, (120 if tick_mark else 42) if attuned else 24, 34, 230
                else:
                    # Inner luminous aqua-gold ring
                    col = (146, 252, 248) if (attuned and tick_mark) else lerp_rgb((188, 140, 44), (248, 216, 114), 0.55)
                    metal, emis, rough, hv = 240, (220 if tick_mark else 58) if attuned else 30, 32, 224
                img.putpixel((x, y), (*col, 255))
                mer.putpixel((x, y), (metal, emis, rough))
                hgt.putpixel((x, y), hv)

        # Q3: Floating Starlight Octahedron Core (16..31, 16..31)
        for ly in range(16):
            for lx in range(16):
                x, y = 16 + lx, 16 + ly
                r = math.hypot(lx - 7.5, ly - 7.5) / 8.5
                if attuned:
                    col = lerp_rgb((255, 254, 232), (96, 248, 246), min(1.0, r * 1.15))
                    metal, emis, rough, hv = 65, 255, 14, 250
                else:
                    col = lerp_rgb((108, 186, 212), (34, 46, 94), min(1.0, r * 1.15))
                    metal, emis, rough, hv = 40, 82, 42, 195
                img.putpixel((x, y), (*col, 255))
                mer.putpixel((x, y), (metal, emis, rough))
                hgt.putpixel((x, y), hv)

        nm = "astrolabe_pedestal_attuned" if attuned else "astrolabe_pedestal"
        save_block_pbr(nm, img, mer, hgt)
        block_names.append(nm)

    # --- 19. starlight_veil: Translucent swirling rose-gold & aquamarine liquid starlight ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=1111)
            swirl = 0.5 + 0.5 * math.sin((x + y) * 0.6 + n * 4.0)
            col = lerp_rgb((82, 240, 242), (250, 180, 216), swirl)
            if n > 0.76:
                col = lerp_rgb(col, (255, 252, 228), 0.78)
            alpha = clamp(152 + swirl * 66)
            img.putpixel((x, y), (*col, alpha))
            mer.putpixel((x, y), (20, 248, 18))
            hgt.putpixel((x, y), clamp(120 + swirl * 92))
    save_block_pbr("starlight_veil", img, mer, hgt)
    block_names.append("starlight_veil")

    # --- 20. vespera_altar: 32x32 4-Quadrant Cosmic Starstone & Celestial Brass Boss Altar ---
    #   Q0 (0..15,  0..15): Top Engraved Twilight Star-Sigil Dais
    #   Q1 (16..31, 0..15): Carved Starstone & Gilded Rune Altar Sides
    #   Q2 (0..15, 16..31): Corner Spire Braziers + Glowing Violet Ember Caps
    #   Q3 (16..31,16..31): Floating Radiant Lavender Star-Prism
    img = Image.new("RGBA", (32, 32))
    mer = Image.new("RGB", (32, 32))
    hgt = Image.new("L", (32, 32))

    # Q0: Top Engraved Star-Sigil Dais
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=1212)
            col = lerp_rgb((24, 20, 56), (54, 44, 102), n)
            metal, emis, rough, hv = 25, 18, 126, 145
            dist = abs(x - 7.5) + abs(y - 7.5)
            if x in (0, 15) or y in (0, 15):
                col = lerp_rgb((196, 146, 52), (248, 206, 98), 0.5 + 0.5 * n)
                metal, emis, rough, hv = 242, 55, 42, 218
            elif 4.0 <= dist <= 5.2:
                col = (248, 204, 100)
                metal, emis, rough, hv = 244, 125, 36, 228
            elif dist < 2.8:
                col = lerp_rgb((255, 236, 255), (224, 118, 255), dist / 2.8)
                metal, emis, rough, hv = 85, 255, 22, 248
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)

    # Q1: Carved Starstone & Gilded Rune Altar Sides (16..31, 0..15)
    for ly in range(16):
        for lx in range(16):
            x, y = 16 + lx, ly
            n = hash2d(lx, ly, seed=1225)
            if ly in (0, 1, 14, 15):
                col = lerp_rgb((188, 138, 46), (250, 210, 104), 0.4 + 0.6 * (ly in (1, 14)))
                metal, emis, rough, hv = 242, 65, 40, 222
            elif ly in (6, 7) and (lx % 4 in (1, 2)):
                col = (224, 136, 255)
                metal, emis, rough, hv = 75, 235, 28, 198
            else:
                col = lerp_rgb((26, 22, 60), (60, 50, 112), n)
                metal, emis, rough, hv = 28, 18, 128, clamp(132 + n * 48)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)

    # Q2: Corner Spire Braziers (0..7, 16..31) & Glowing Amethyst Caps (8..15, 16..23)
    for ly in range(16):
        for lx in range(16):
            x, y = lx, 16 + ly
            if lx < 8:
                if ly < 3:
                    col = (232, 148, 255)
                    metal, emis, rough, hv = 70, 245, 24, 240
                elif ly in (3, 14, 15):
                    col = (242, 196, 88)
                    metal, emis, rough, hv = 242, 85, 38, 224
                else:
                    col = lerp_rgb((34, 28, 76), (72, 58, 132), 1.0 - abs(lx - 3.5) / 4.0)
                    metal, emis, rough, hv = 35, 30, 108, 175
            else:
                r = math.hypot((lx - 8) - 3.5, (ly % 8) - 3.5) / 4.2
                col = lerp_rgb((255, 236, 255), (218, 114, 255), min(1.0, r))
                metal, emis, rough, hv = 80, 255, 22, 246
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)

    # Q3: Hovering Radiant Lavender Star-Prism (16..31, 16..31)
    for ly in range(16):
        for lx in range(16):
            x, y = 16 + lx, 16 + ly
            r = math.hypot(lx - 7.5, ly - 7.5) / 8.5
            col = lerp_rgb((255, 246, 255), (196, 104, 255), min(1.0, r * 1.15))
            if abs(lx - 7.5) < 1.2 or abs(ly - 7.5) < 1.2:
                col = lerp_rgb(col, (144, 252, 250), 0.35)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (85, 255, 16))
            hgt.putpixel((x, y), clamp(252 - r * 35))

    save_block_pbr("vespera_altar", img, mer, hgt)
    block_names.append("vespera_altar")

    # --- 21. cloudstone: Soft billowing pearl-ivory condensed cloud block (walkable Cloud-Shelf Plains!) ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            n1 = tile_noise(x, y, 16, period=4, seed=1301)
            n2 = tile_noise(x + 3, y + 5, 16, period=8, seed=1309)
            puff = max(0.0, min(1.0, 0.62 * n1 + 0.38 * n2))
            col = lerp_rgb((218, 214, 232), (253, 250, 246), puff)
            if puff > 0.72:
                col = lerp_rgb(col, (255, 252, 244), 0.55)
            elif puff < 0.28:
                col = lerp_rgb(col, (192, 198, 224), 0.35)
            emis = clamp(18 + puff * 26)
            rough = clamp(205 - puff * 25)
            hv = clamp(120 + puff * 95)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (0, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("cloudstone", img, mer, hgt)
    block_names.append("cloudstone")

    # --- 22. rose_cloud: Warm sunset rose-gold & peach billowing cloud bank ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            n1 = tile_noise(x, y, 16, period=4, seed=1401)
            n2 = tile_noise(x + 6, y + 2, 16, period=8, seed=1409)
            puff = max(0.0, min(1.0, 0.64 * n1 + 0.36 * n2))
            col = lerp_rgb((228, 152, 174), (255, 224, 198), puff)
            if puff > 0.72:
                col = lerp_rgb(col, (255, 244, 218), 0.45)
            elif puff < 0.25:
                col = lerp_rgb(col, (194, 124, 162), 0.40)
            emis = clamp(32 + puff * 44)
            rough = clamp(195 - puff * 25)
            hv = clamp(125 + puff * 90)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (0, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("rose_cloud", img, mer, hgt)
    block_names.append("rose_cloud")

    # --- 23. cloud_vent: Carved alabaster & gilded brass swirling updraft wind-ring ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            dx, dy = x - 7.5, y - 7.5
            r = math.hypot(dx, dy)
            ang = math.atan2(dy, dx)
            n = fbm_tile(x, y, 16, seed=1505)
            edge = min(x, 15 - x, y, 15 - y)
            if edge == 0:
                col = lerp_rgb((214, 206, 218), (242, 238, 244), n)
                metal, emis, rough, hv = 0, 12, 165, 165
            elif 5.2 <= r <= 6.6:
                col = lerp_rgb((196, 148, 54), (252, 218, 114), 0.4 + 0.6 * n)
                metal, emis, rough, hv = 235, 55, 42, 222
            elif r < 5.2:
                swirl = 0.5 + 0.5 * math.sin(ang * 3.0 + r * 1.4)
                col = lerp_rgb((96, 240, 242), (255, 206, 214), swirl)
                if r < 2.0:
                    col = lerp_rgb(col, (255, 252, 236), 0.7)
                metal, emis, rough, hv = 30, clamp(175 + swirl * 80), 28, clamp(90 + swirl * 60)
            else:
                col = lerp_rgb((232, 224, 236), (250, 244, 240), n)
                metal, emis, rough, hv = 0, 24, 155, 180
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("cloud_vent", img, mer, hgt)
    block_names.append("cloud_vent")

    return block_names


# =============================================================================
# 2. ITEM TEXTURES (16x16 Crisp Pixel Art Icons)
# =============================================================================

def draw_pixels(img, grid, palette):
    """Paint a 16x16 pixel art ASCII map into an RGBA image."""
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch in palette:
                img.putpixel((x, y), palette[ch])


def generate_items():
    items = {}

    # 1. tuning_fork — Starlight Tuning Fork (beveled gold prongs + aquamarine resonance arc)
    items["tuning_fork"] = (
        [
            "................",
            "....YG....YG....",
            ".S.GYD....GYD.S.",
            "S..GYD.CC.GYD..S",
            "S..GYDCWWCGYD..S",
            ".S.GYD.CC.GYD.S.",
            "...GYD....GYD...",
            "....GG....GG....",
            ".....GYYYYG.....",
            "......GDDG......",
            ".......YG.......",
            ".......GD.......",
            "......GAAG......",
            "......GDDG......",
            ".......GG.......",
            "................",
        ],
        {
            "G": (218, 162, 50, 255),
            "Y": (255, 234, 140, 255),
            "D": (138, 90, 22, 255),
            "C": (98, 244, 240, 245),
            "S": (122, 238, 242, 145),
            "W": (248, 255, 255, 255),
            "A": (204, 142, 255, 255),
        },
    )

    # 2. raw_solarium — Raw glowing amber-gold celestial crystal cluster
    items["raw_solarium"] = (
        [
            "................",
            ".......OO.......",
            "......OYYO......",
            ".....OYWWYO.....",
            "...OOOYWWYOO....",
            "..OYYOYYYYOYYO..",
            "..OYWYGGGGYWYO..",
            "..OYYGGWWGGYYO..",
            "...OGGGYYGGGO...",
            "....OGGGGGGO....",
            "....OODGGDOO....",
            ".....ODDDDO.....",
            "......OOOO......",
            "................",
            "................",
            "................",
        ],
        {
            "O": (124, 72, 16, 255),
            "D": (168, 108, 24, 255),
            "G": (226, 164, 42, 255),
            "Y": (255, 224, 104, 255),
            "W": (255, 250, 212, 255),
        },
    )

    # 3. solarium_ingot — Gleaming forged celestial Solarium bar
    items["solarium_ingot"] = (
        [
            "................",
            "................",
            "................",
            "......OOOOO.....",
            "....OOYYYYYOO...",
            "...OYYWWWWYYGO..",
            "..OYYWWYYYYGGDO.",
            "..OYYYYGGGGGGDO.",
            ".OYYGGGGGGGGGDO.",
            ".OGGGGGGGGGDDO..",
            ".OGDDDDDDDDDO...",
            "..OOOOOOOOOO....",
            "................",
            "................",
            "................",
            "................",
        ],
        {
            "O": (118, 70, 16, 255),
            "D": (164, 108, 26, 255),
            "G": (224, 168, 48, 255),
            "Y": (255, 224, 108, 255),
            "W": (255, 252, 222, 255),
        },
    )

    # 4. prism_shard — Faceted aquamarine-to-lavender sea-glass shard
    items["prism_shard"] = (
        [
            "................",
            ".......OO.......",
            "......OCCO......",
            ".....OCWWCO.....",
            ".....OCWWCO.....",
            "....OCCWWCCO....",
            "....OCCCLLCO....",
            "...OCCCCLLLCO...",
            "...OCCCLLLLCO...",
            "....OCCLLLCO....",
            "....OCLLLLCO....",
            ".....OCLLCO.....",
            "......OLLO......",
            ".......OO.......",
            "................",
            "................",
        ],
        {
            "O": (36, 92, 118, 255),
            "C": (82, 232, 228, 255),
            "L": (184, 144, 246, 255),
            "W": (232, 255, 255, 255),
        },
    )

    # 5. prism_berry — Luminous rose-teal starlit fruit
    items["prism_berry"] = (
        [
            "................",
            ".......GG.......",
            "......GYYG......",
            ".......GG.......",
            ".....OOOOOO.....",
            "....ORRRPPPO....",
            "...ORWWWRPPCO...",
            "...ORWWPPCCCO...",
            "...ORPPPCCCCO...",
            "...OPPPCCCCCO...",
            "....OPCCCCCO....",
            ".....OCCCCO.....",
            "......OOOO......",
            "................",
            "................",
            "................",
        ],
        {
            "G": (212, 164, 58, 255),
            "Y": (255, 226, 128, 255),
            "O": (86, 48, 92, 255),
            "R": (248, 146, 176, 255),
            "P": (212, 144, 232, 255),
            "C": (98, 236, 228, 255),
            "W": (255, 246, 252, 255),
        },
    )

    # 6. celestial_nectar — Glass vial of glowing rose-gold twilight dew
    items["celestial_nectar"] = (
        [
            "................",
            "......GGGG......",
            "......GYYG......",
            ".....OCCCCO.....",
            "......OCCO......",
            ".....OCWWCO.....",
            "....OCRRRRCO....",
            "...OCRYYYYRCO...",
            "...OCYWWWWYCO...",
            "...OCYYYYYYCO...",
            "...OCRRYYRRCO...",
            "....OCRRRRCO....",
            ".....OCCCCO.....",
            "......OOOO......",
            "................",
            "................",
        ],
        {
            "G": (196, 144, 46, 255),
            "Y": (255, 218, 108, 255),
            "O": (74, 96, 126, 255),
            "C": (182, 238, 246, 235),
            "R": (246, 134, 168, 255),
            "W": (255, 250, 228, 255),
        },
    )

    # 7. resonant_star_core — Golden astrolabe sphere enclosing magenta-cyan star heart
    items["resonant_star_core"] = (
        [
            "................",
            ".....GGGGGG.....",
            "...GGY....YGG...",
            "..GY..CCCC..YG..",
            "..G..CCWWCC..G..",
            ".GY.CWWMMWWC.YG.",
            ".G..CWMMMMWC..G.",
            ".G..CWWMMWWC..G.",
            ".GY..CCWWCC..YG.",
            "..G...CCCC...G..",
            "..GY........YG..",
            "...GGY....YGG...",
            ".....GGGGGG.....",
            ".......YY.......",
            "................",
            "................",
        ],
        {
            "G": (214, 160, 48, 255),
            "Y": (255, 232, 132, 255),
            "C": (96, 244, 242, 255),
            "M": (236, 118, 255, 255),
            "W": (255, 252, 255, 255),
        },
    )

    # 8. solarium_pickaxe — Beveled golden-and-aquamarine celestial pickaxe
    items["solarium_pickaxe"] = (
        [
            "................",
            "....GGYYGG......",
            "...GYWWWWYGG....",
            "..GYCC..CCYYG...",
            "..GDD....CWWYG..",
            "..........GCYYG.",
            ".........GR.GYG.",
            "........PR..GDG.",
            ".......GR....GD.",
            "......PR........",
            ".....GR.........",
            "....PR..........",
            "...GR...........",
            "..PR............",
            ".YG.............",
            "................",
        ],
        {
            "G": (210, 152, 42, 255),
            "D": (134, 86, 20, 255),
            "Y": (255, 228, 120, 255),
            "W": (255, 252, 224, 255),
            "C": (94, 244, 238, 255),
            "R": (108, 76, 138, 255),
            "P": (154, 114, 188, 255),
        },
    )

    # 9. starblade — Sovereign's Starblade: faceted crystalline edge, starlight fuller & gilded winged hilt
    items["starblade"] = (
        [
            "..............WW",
            ".............CWW",
            "............BCWC",
            "...........BCWCB",
            "..........BCWCB.",
            ".........BCWCB..",
            "........BCWCB...",
            ".......BCWCB....",
            "...YG.BCWCB.....",
            "....GYYWCB......",
            ".....GYYYG......",
            "....GRGYYGD.....",
            "...PRG..GDD.....",
            "..GRG...........",
            ".GYG............",
            ".GD.............",
        ],
        {
            "W": (246, 255, 255, 255),
            "C": (104, 246, 244, 255),
            "B": (46, 168, 204, 255),
            "G": (214, 160, 48, 255),
            "D": (138, 90, 22, 255),
            "Y": (255, 234, 136, 255),
            "R": (102, 68, 138, 255),
            "P": (158, 116, 198, 255),
        },
    )

    # 10. tide_glider_charm — Winged sea-glass & rose-gold Gale-Prism relic
    items["tide_glider_charm"] = (
        [
            "................",
            ".WW..........WW.",
            ".WCB........BCW.",
            "..WCB..YG..BCW..",
            "..WCCBGYYGBCCW..",
            "...CCBYWWYBCC...",
            "....CBYWWYBC....",
            ".....BGYYGB.....",
            "......GTTG......",
            ".....GTWWTG.....",
            "....GP.TT.PG....",
            "....P..TT..P....",
            ".......PP.......",
            "................",
            "................",
            "................",
        ],
        {
            "W": (244, 255, 255, 255),
            "C": (110, 246, 242, 255),
            "B": (52, 178, 208, 255),
            "G": (218, 164, 52, 255),
            "Y": (255, 234, 136, 255),
            "T": (248, 166, 198, 255),
            "P": (214, 118, 164, 255),
        },
    )

    # 11. astral_lyre — Graceful golden celestial harp with 4 distinct luminous light strings
    items["astral_lyre"] = (
        [
            "................",
            "..GY........YG..",
            ".GYYGGGGGGGGYYG.",
            ".GD.C.W..W.C.DG.",
            "..G.C.W..W.C.G..",
            "..G.C.W..W.C.G..",
            "..G.C.W..W.C.G..",
            "...GC.W..W.CG...",
            "...GGCCCCCCGG...",
            "....GYYRRYYG....",
            ".....GYRRYG.....",
            ".....GGDDGG.....",
            "....GYYYYYYG....",
            "....DDDDDDDD....",
            "................",
            "................",
        ],
        {
            "G": (214, 160, 48, 255),
            "Y": (255, 234, 138, 255),
            "D": (142, 94, 22, 255),
            "R": (236, 154, 172, 255),
            "C": (106, 242, 240, 235),
            "W": (242, 255, 255, 255),
        },
    )

    # 12. chronicle_of_auralis — Deep indigo velvet codex with astrolabe star clasp & parchment pages
    items["chronicle_of_auralis"] = (
        [
            "................",
            "...GGYYYYYYGG...",
            "..GVIIIIIIIIIG..",
            "..GVIBBIIBBIGP..",
            "..GVIBCWWCBISP..",
            "..GVICWWWWCIGP..",
            "..GVIBCWWCBISP..",
            "..GVIBBIIBBIGP..",
            "..GVIIIIIIIIIG..",
            "..GVIIYYYYIIGP..",
            "..GVIIIIIIIIIG..",
            "..GDDDDDDDDDDG..",
            "...GPPPPPPPPG...",
            "....GGGGGGGG....",
            "................",
            "................",
        ],
        {
            "G": (214, 162, 50, 255),
            "Y": (255, 232, 134, 255),
            "D": (138, 92, 24, 255),
            "I": (34, 30, 82, 255),
            "V": (66, 56, 132, 255),
            "B": (58, 174, 212, 255),
            "C": (106, 242, 240, 255),
            "W": (248, 255, 255, 255),
            "P": (246, 238, 222, 255),
            "S": (208, 194, 174, 255),
        },
    )

    for name, (grid, pal) in items.items():
        assert len(grid) == 16 and all(len(r) == 16 for r in grid), f"Item grid {name} must be 16x16"
        img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        draw_pixels(img, grid, pal)
        img.save(ITEMS_DIR / f"{name}.png")

    return list(items.keys())


# =============================================================================
# 3. ENTITY SKINS (UV-aligned with Custom 3D .geo.json Models + PBR Emissives!)
# =============================================================================

def paint_box_uv(img, mer, u, v, w, h, d, base_rgb, accent_rgb=None, emis=0, metal=0, rough=140, pattern="smooth"):
    """Paint standard Bedrock box-UV region [u, u+2*(w+d)] x [v, v+h+d] cleanly."""
    W, H = img.size
    x0, x1 = max(0, u), min(W, u + 2 * (w + d))
    y0, y1 = max(0, v), min(H, v + d + h)
    for y in range(y0, y1):
        for x in range(x0, x1):
            n = hash2d(x, y, seed=u * 31 + v * 17)
            col = base_rgb
            e = emis
            m = metal
            r = rough
            if pattern == "wing":
                t = (x - x0) / max(1, (x1 - x0))
                col = lerp_rgb(base_rgb, accent_rgb or (255, 224, 150), t)
                if (x + y) % 5 == 0:
                    col = lerp_rgb(col, (255, 246, 210), 0.45)
                    e = max(e, 175)
            elif pattern == "gilded":
                col = lerp_rgb(base_rgb, accent_rgb or (246, 206, 98), 0.14 + 0.18 * n)
                if y in (y0, y1 - 1) or x in (x0, x1 - 1):
                    col = accent_rgb or (242, 194, 82)
                    m = 235
                    r = 44
            elif pattern == "crystal":
                t = (y - y0) / max(1, (y1 - y0))
                col = lerp_rgb(accent_rgb or (228, 255, 255), base_rgb, t)
                e = clamp(160 + (1 - t) * 90)
                r = 28
            elif pattern == "body":
                col = lerp_rgb(base_rgb, accent_rgb or base_rgb, n * 0.25)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (m, e, r))


def paint_box_face(img, mer, x0, y0, fw, fh, fn):
    """Paint a specific rectangular UV sub-face (e.g., Top/Bottom/Front/Side) with fn(lx, ly, fw, fh) -> (rgb, mer)."""
    W, H = img.size
    for ly in range(fh):
        py = y0 + ly
        if not (0 <= py < H):
            continue
        for lx in range(fw):
            px = x0 + lx
            if not (0 <= px < W):
                continue
            col, m_val = fn(lx, ly, fw, fh)
            img.putpixel((px, py), (*col, 255))
            mer.putpixel((px, py), m_val)


def generate_entities():
    # --- 1. lumina_ray (64x64) — Ethereal Sky-Manta with Counter-Shaded Pearl Belly & Starlight Wing Patterns ---
    img = Image.new("RGBA", (64, 64), (24, 48, 92, 255))
    mer = Image.new("RGB", (64, 64), (10, 42, 108))
    paint_box_uv(img, mer, 0, 0, 14, 4, 16, (30, 118, 156), (92, 236, 232), emis=68, rough=70, pattern="body")
    # Body Top face (x:16..30, y:0..16): Rich twilight-teal back -> radiant cyan spine -> golden chevron bands!
    def ray_top(lx, ly, fw, fh):
        cx = abs(lx - (fw - 1) / 2.0) / (fw / 2.0)
        ty = ly / max(1, fh - 1)
        col = lerp_rgb((24, 96, 138), (64, 198, 212), 1.0 - cx * 0.7)
        emis, metal = clamp(65 + (1.0 - cx) * 75), 18
        if abs(lx - 6.5) <= 1.2 and 1 <= ly <= 14:
            col = lerp_rgb((148, 254, 250), (255, 246, 200), ty * 0.5)
            emis = 235
        elif ly in (4, 8, 12) and abs(lx - 6.5) <= 4.5:
            col = (255, 224, 128)
            emis, metal = 210, 220
        elif (lx in (2, 11) and ly in (3, 7, 11)):
            col = (255, 240, 178)
            emis = 225
        return col, (metal, emis, 38)
    paint_box_face(img, mer, 16, 0, 14, 16, ray_top)

    # Body Bottom face (x:30..44, y:0..16): Soft counter-shaded pearl-ivory & rose-blush manta underside!
    def ray_belly(lx, ly, fw, fh):
        cx = abs(lx - (fw - 1) / 2.0) / (fw / 2.0)
        col = lerp_rgb((246, 238, 232), (242, 184, 204), cx * 0.75)
        return col, (10, 58, 95)
    paint_box_face(img, mer, 30, 0, 14, 16, ray_belly)

    # Front face eyes & gentle grin (x:16..30, y:16..20)
    for ex in (18, 19, 26, 27):
        for ey in (17, 18):
            img.putpixel((ex, ey), (255, 244, 164, 255) if ey == 17 else (132, 252, 250, 255))
            mer.putpixel((ex, ey), (110, 255, 18))

    # Graceful Starlight-Dappled Manta Wings (wing_l [0,22], wing_r [0,38], size [14,2,12] -> top x:12..26, bottom x:26..40)
    for wy in (22, 38):
        paint_box_uv(img, mer, 0, wy, 14, 2, 12, (42, 172, 194), (255, 214, 146), emis=115, rough=58, pattern="wing")
        def wing_top_fn(lx, ly, fw, fh):
            tx = lx / max(1, fw - 1)
            ty = ly / max(1, fh - 1)
            # Sweeping ocean-teal -> bright seafoam -> warm sunset rose-gold trailing wingtips!
            col = lerp_rgb((36, 152, 182), (108, 242, 238), min(1.0, tx * 1.4)) if tx < 0.65 else lerp_rgb((108, 242, 238), (255, 212, 150), (tx - 0.65) / 0.35)
            emis, metal = clamp(105 + tx * 115), 25
            if ly <= 1:
                col = lerp_rgb((244, 204, 102), (255, 246, 192), tx)
                metal, emis = 220, 180
            elif ly >= fh - 2:
                col = lerp_rgb(col, (255, 198, 214), 0.55)
                emis = 215
            elif (lx * 3 + ly * 5) % 13 == 0:
                col = (255, 248, 210)
                emis = 245
            return col, (metal, emis, 38)
        def wing_bot_fn(lx, ly, fw, fh):
            tx = lx / max(1, fw - 1)
            col = lerp_rgb((244, 236, 232), (252, 194, 208), tx * 0.8)
            return col, (10, clamp(70 + tx * 85), 80)
        paint_box_face(img, mer, 12, wy, 14, 12, wing_top_fn)
        paint_box_face(img, mer, 26, wy, 14, 12, wing_bot_fn)

    paint_box_uv(img, mer, 0, 52, 2, 2, 10, (112, 246, 244), (255, 228, 152), emis=195, rough=40, pattern="wing")
    paint_box_uv(img, mer, 28, 52, 6, 2, 6, (244, 198, 92), (255, 244, 186), emis=170, metal=228, rough=36, pattern="gilded")
    save_entity_pbr("lumina_ray", img, mer)

    # --- 2. choir_wisp (64x64) — Porcelain & Filigree Gold Lantern Spirit ---
    img = Image.new("RGBA", (64, 64), (242, 236, 226, 255))
    mer = Image.new("RGB", (64, 64), (20, 48, 105))
    paint_box_uv(img, mer, 0, 0, 8, 8, 8, (246, 238, 228), (242, 196, 92), emis=38, rough=88, pattern="gilded")
    # Delicate gold filigree arch along all 4 sides of the porcelain hood (y:8..16, x:0..32)
    for side_idx in range(4):
        sx0 = side_idx * 8
        for lx in range(8):
            # Bottom golden rim + delicate top crown inlay
            img.putpixel((sx0 + lx, 15), (242, 194, 82, 255))
            mer.putpixel((sx0 + lx, 15), (235, 70, 38))
            if lx in (0, 7):
                img.putpixel((sx0 + lx, 9), (248, 208, 104, 255))
                mer.putpixel((sx0 + lx, 9), (235, 70, 38))
    # Serene luminous crescent-aqua eyes + warm blush cheeks on front face (x:8..16, y:8..16)
    for ex in (10, 13):
        img.putpixel((ex, 11), (108, 248, 246, 255))
        img.putpixel((ex, 12), (246, 255, 255, 255))
        mer.putpixel((ex, 11), (30, 255, 20))
        mer.putpixel((ex, 12), (30, 255, 20))
    for cx in (9, 14):
        img.putpixel((cx, 13), (255, 194, 204, 255))
        mer.putpixel((cx, 13), (10, 120, 65))
    paint_box_uv(img, mer, 0, 18, 4, 4, 4, (255, 184, 204), (255, 248, 208), emis=255, rough=22, pattern="crystal")
    paint_box_uv(img, mer, 0, 28, 2, 4, 2, (98, 244, 240), (228, 184, 255), emis=215, rough=32, pattern="crystal")
    paint_box_uv(img, mer, 16, 28, 10, 1, 2, (250, 210, 100), (255, 248, 192), emis=175, metal=240, rough=30, pattern="gilded")
    save_entity_pbr("choir_wisp", img, mer)

    # --- 3. glass_crab (64x64) — Opalescent Pearl-Shell & Faceted Sea-Crystal Crab ---
    img = Image.new("RGBA", (64, 64), (228, 220, 210, 255))
    mer = Image.new("RGB", (64, 64), (20, 22, 115))
    paint_box_uv(img, mer, 0, 0, 10, 5, 8, (238, 228, 214), (108, 228, 224), emis=28, rough=88, pattern="gilded")
    # Shell top carapace iridescent seafoam-and-rose mottling (x:8..18, y:0..8)
    def crab_top(lx, ly, fw, fh):
        dx = abs(lx - 4.5) / 5.0
        dy = abs(ly - 3.5) / 4.0
        r = math.hypot(dx, dy)
        col = lerp_rgb((132, 236, 232), (244, 224, 212), min(1.0, r * 1.15))
        if (lx + ly) % 3 == 0 and r < 0.7:
            col = lerp_rgb(col, (255, 204, 214), 0.45)
        return col, (45, clamp(85 - r * 55), 62)
    paint_box_face(img, mer, 8, 0, 10, 8, crab_top)
    # Expressive glossy crab eyes on front (x:8..18, y:8..13)
    for ex in (10, 15):
        img.putpixel((ex, 9), (28, 32, 64, 255))
        img.putpixel((ex, 10), (134, 254, 250, 255))
        mer.putpixel((ex, 10), (10, 250, 22))
    paint_box_uv(img, mer, 0, 15, 4, 7, 4, (62, 228, 234), (232, 188, 255), emis=228, rough=24, pattern="crystal")
    paint_box_uv(img, mer, 20, 15, 4, 3, 5, (238, 186, 74), (124, 246, 240), emis=85, metal=195, rough=48, pattern="gilded")
    paint_box_uv(img, mer, 0, 28, 5, 2, 2, (202, 190, 180), (234, 188, 96), emis=18, rough=110, pattern="body")
    save_entity_pbr("glass_crab", img, mer)

    # --- 4. gilded_sentinel (64x64) — Classical Fluted Alabaster & Brass Temple Guardian ---
    img = Image.new("RGBA", (64, 64), (236, 228, 216, 255))
    mer = Image.new("RGB", (64, 64), (120, 22, 88))
    paint_box_uv(img, mer, 0, 0, 10, 14, 8, (240, 232, 220), (236, 186, 70), emis=22, metal=68, rough=96, pattern="gilded")
    # Carved fluted chest armor + glowing cyan sanctuary rune on torso front (x:8..18, y:8..22)
    def sent_front(lx, ly, fw, fh):
        dx = abs(lx - 4.5)
        if lx in (0, 9) or ly in (0, 13):
            return (242, 194, 78), (238, 52, 38)
        if abs(dx - 2.0) < 0.6 and 2 <= ly <= 11:
            return (206, 196, 184), (35, 10, 118)
        if dx < 1.6 and 3 <= ly <= 8:
            return (112, 250, 248), (55, 248, 20)
        return lerp_rgb((232, 224, 212), (250, 246, 238), 1.0 - dx / 5.0), (50, 18, 95)
    paint_box_face(img, mer, 8, 8, 10, 14, sent_front)
    paint_box_uv(img, mer, 0, 24, 8, 8, 8, (242, 234, 224), (240, 190, 74), emis=22, metal=88, rough=88, pattern="gilded")
    # Recessed dark helm visor slit with blazing turquoise diamond eye (x:8..16, y:32..40)
    for y in range(33, 39):
        for x in range(9, 15):
            d = abs(x - 11.5) + abs(y - 35.5)
            if d <= 2.2:
                img.putpixel((x, y), (112, 252, 252, 255) if d < 1.2 else (62, 224, 232, 255))
                mer.putpixel((x, y), (45, 255, 18))
            elif d <= 3.2:
                img.putpixel((x, y), (34, 32, 68, 255))
                mer.putpixel((x, y), (40, 20, 110))
    paint_box_uv(img, mer, 38, 0, 5, 12, 5, (232, 178, 64), (255, 232, 134), emis=52, metal=240, rough=40, pattern="gilded")
    # Glowing cyan rune stripe on sentinel gauntlets
    for y in range(8, 15):
        img.putpixel((45, y), (114, 250, 248, 255))
        mer.putpixel((45, y), (50, 245, 22))
    paint_box_uv(img, mer, 34, 24, 6, 6, 6, (94, 248, 250), (226, 154, 255), emis=255, rough=18, pattern="crystal")
    paint_box_uv(img, mer, 0, 42, 12, 2, 2, (248, 208, 96), (255, 248, 194), emis=195, metal=244, rough=30, pattern="gilded")
    save_entity_pbr("gilded_sentinel", img, mer)

    # --- 5. astral_seraph (128x128) — Sculpted 24-Bone Sovereign Boss Masterwork Texture ---
    img = Image.new("RGBA", (128, 128), (34, 30, 68, 255))
    mer = Image.new("RGB", (128, 128), (40, 20, 110))

    paint_box_uv(img, mer, 0, 0, 14, 18, 10, (240, 234, 226), (232, 184, 70), emis=20, metal=98, rough=84, pattern="gilded")
    # Front breastplate ornamental sunburst crest (x:10..24, y:10..28)
    for y in range(10, 28):
        for x in range(10, 24):
            dx = abs(x - 16.5)
            dy = y - 10
            if dx >= 5.5 or dy in (0, 17):
                img.putpixel((x, y), (242, 192, 72, 255))
                mer.putpixel((x, y), (242, 55, 36))
            elif dy >= 11 and dx <= 4.2:
                img.putpixel((x, y), (34, 30, 82, 255))
                mer.putpixel((x, y), (45, 28, 110))
                if (x + y) % 5 == 0:
                    img.putpixel((x, y), (252, 224, 134, 255))
                    mer.putpixel((x, y), (220, 165, 34))
            elif abs(dx - (dy * 0.45)) < 0.9 and dy < 13:
                img.putpixel((x, y), (255, 222, 114, 255))
                mer.putpixel((x, y), (246, 110, 30))
            elif dx < 2.2 and 3 <= dy <= 8:
                img.putpixel((x, y), (128, 252, 250, 255))
                mer.putpixel((x, y), (65, 250, 18))
    # Back wing-socket celestial crest (x:34..48, y:10..28)
    for y in range(12, 26):
        for x in range(36, 46):
            if abs(x - 40.5) <= 1.2 or abs(y - 18.5) <= 1.0:
                img.putpixel((x, y), (248, 206, 92, 255))
                mer.putpixel((x, y), (242, 120, 32))

    # Waist sash
    paint_box_uv(img, mer, 48, 0, 10, 6, 8, (40, 36, 90), (246, 200, 84), emis=28, metal=115, rough=80, pattern="gilded")
    for y in range(9, 13):
        for x in range(59, 63):
            img.putpixel((x, y), (124, 252, 250, 255))
            mer.putpixel((x, y), (60, 242, 22))

    # Pauldrons, Upper Sleeves & Golden Gauntlets
    paint_box_uv(img, mer, 86, 0, 7, 6, 8, (244, 238, 228), (248, 204, 84), emis=34, metal=175, rough=58, pattern="gilded")
    paint_box_uv(img, mer, 86, 16, 5, 10, 5, (42, 38, 94), (240, 190, 74), emis=28, metal=85, rough=90, pattern="gilded")
    paint_box_uv(img, mer, 106, 16, 5, 10, 5, (242, 194, 76), (118, 250, 246), emis=78, metal=240, rough=34, pattern="gilded")
    for y in range(23, 29):
        img.putpixel((113, y), (124, 254, 250, 255))
        mer.putpixel((113, y), (55, 250, 20))

    # Head: Sculpted porcelain seraph mask with dark twilight visor, twin blazing eyes & rose-amethyst diadem jewel
    paint_box_uv(img, mer, 0, 30, 10, 10, 10, (246, 240, 232), (246, 200, 86), emis=28, metal=130, rough=68, pattern="gilded")
    for y in range(41, 49):
        for x in range(11, 19):
            img.putpixel((x, y), (24, 20, 54, 255))
            mer.putpixel((x, y), (40, 28, 82))
    for y in range(41, 49):
        img.putpixel((14, y), (248, 204, 90, 255))
        img.putpixel((15, y), (248, 204, 90, 255))
        mer.putpixel((14, y), (242, 85, 32))
        mer.putpixel((15, y), (242, 85, 32))
    for ex in (12, 13, 16, 17):
        img.putpixel((ex, 44), (150, 254, 254, 255))
        img.putpixel((ex, 45), (255, 246, 184, 255))
        mer.putpixel((ex, 44), (60, 255, 16))
        mer.putpixel((ex, 45), (100, 255, 16))
    for cx in (14, 15):
        img.putpixel((cx, 41), (250, 158, 255, 255))
        mer.putpixel((cx, 41), (85, 255, 18))

    # Crown & Star Heart
    paint_box_uv(img, mer, 42, 30, 12, 6, 2, (254, 212, 88), (255, 250, 204), emis=155, metal=250, rough=24, pattern="gilded")
    paint_box_uv(img, mer, 42, 40, 6, 6, 6, (255, 238, 174), (232, 122, 255), emis=255, rough=14, pattern="crystal")

    # Starry Twilight Split Robe Ribbons with embroidered gold hem & constellation dots
    paint_box_uv(img, mer, 70, 34, 8, 18, 2, (34, 30, 82), (246, 202, 84), emis=38, metal=80, rough=98, pattern="gilded")
    for y in range(37, 53):
        for x in range(72, 88):
            if y >= 50:
                img.putpixel((x, y), (250, 210, 96, 255))
                mer.putpixel((x, y), (244, 145, 30))
            elif y == 49:
                img.putpixel((x, y), (124, 250, 248, 255))
                mer.putpixel((x, y), (60, 225, 24))
            elif (x * 7 + y * 13) % 17 == 0:
                img.putpixel((x, y), (255, 240, 168, 255))
                mer.putpixel((x, y), (125, 238, 26))

    # Astral Halberd Shaft & Blazing Crystalline Crescent Blade
    paint_box_uv(img, mer, 94, 34, 2, 30, 2, (242, 196, 76), (255, 242, 168), emis=98, metal=246, rough=28, pattern="gilded")
    paint_box_uv(img, mer, 104, 34, 6, 12, 2, (118, 250, 252), (254, 255, 255), emis=255, metal=95, rough=14, pattern="crystal")

    # Twin Astrolabe Halos & Cardinal Gems
    paint_box_uv(img, mer, 0, 54, 28, 2, 2, (254, 212, 86), (255, 250, 200), emis=218, metal=250, rough=24, pattern="gilded")
    paint_box_uv(img, mer, 70, 56, 3, 3, 3, (128, 254, 252), (255, 244, 184), emis=255, rough=16, pattern="crystal")

    # Sculpted Multi-Tier Iridescent Feathered Wings
    def paint_feathered_wing(u, v, w, h, d, c_root, c_mid, c_tip, c_quill):
        x0, x1 = u, u + 2 * (w + d)
        y0, y1 = v, v + d + h
        for y in range(y0, y1):
            for x in range(x0, x1):
                tx = (x - x0) / max(1, (x1 - x0 - 1))
                ty = (y - y0) / max(1, (y1 - y0 - 1))
                col = lerp_rgb(c_root, c_mid, min(1.0, tx * 1.6)) if tx < 0.6 else lerp_rgb(c_mid, c_tip, (tx - 0.6) / 0.4)
                emis = clamp(128 + tx * 124)
                metal = 45
                if (x - x0) % 4 == 0 and ty > 0.22:
                    col = lerp_rgb(col, c_quill, 0.52)
                    emis = clamp(emis - 52)
                elif (x - x0) % 4 == 1 and ty > 0.28:
                    col = lerp_rgb(col, (255, 252, 236), 0.30)
                    emis = clamp(emis + 25)
                elif (y - y0) <= d + 1:
                    col = lerp_rgb((248, 202, 88), (255, 246, 190), tx)
                    metal = 240
                    emis = 175
                elif ty > 0.76:
                    col = lerp_rgb(col, (255, 252, 236), 0.48)
                    emis = 250
                img.putpixel((x, y), (*col, 255))
                mer.putpixel((x, y), (metal, emis, 28))

    paint_feathered_wing(0, 62, 18, 8, 2, (42, 176, 198), (124, 248, 244), (255, 236, 172), (20, 72, 108))
    paint_feathered_wing(42, 62, 14, 6, 1, (124, 248, 244), (255, 228, 156), (255, 252, 228), (46, 134, 148))
    paint_feathered_wing(0, 76, 16, 7, 2, (208, 96, 158), (254, 176, 198), (255, 240, 176), (96, 36, 84))
    paint_feathered_wing(38, 76, 12, 5, 1, (254, 176, 198), (255, 224, 152), (255, 250, 224), (146, 68, 112))
    paint_feathered_wing(0, 88, 18, 6, 2, (108, 92, 214), (190, 158, 255), (128, 250, 248), (42, 34, 108))
    save_entity_pbr("astral_seraph", img, mer)

    # --- 6. astral_bolt (32x32) ---
    img = Image.new("RGBA", (32, 32), (124, 248, 250, 255))
    mer = Image.new("RGB", (32, 32), (45, 255, 18))
    paint_box_uv(img, mer, 0, 0, 4, 4, 4, (134, 250, 250), (248, 162, 255), emis=255, rough=16, pattern="crystal")
    save_entity_pbr("astral_bolt", img, mer)

    # --- 7. nimbus_stag (64x64) — Pearlescent Cloud-Wool Celestial Deer with Starry Flanks & Rose Belly ---
    img = Image.new("RGBA", (64, 64), (242, 238, 234, 255))
    mer = Image.new("RGB", (64, 64), (10, 20, 128))
    paint_box_uv(img, mer, 0, 0, 10, 9, 18, (246, 242, 238), (218, 214, 232), emis=22, rough=124, pattern="body")
    # Warm sunlit cream-gold back saddle (top face x:18..28, y:0..18) + soft rose-lavender belly (x:28..38, y:0..18)
    paint_box_face(img, mer, 18, 0, 10, 18, lambda lx, ly, fw, fh: (
        lerp_rgb((252, 244, 232), (236, 226, 236), abs(lx - 4.5) / 5.0), (10, 28, 118)
    ))
    paint_box_face(img, mer, 28, 0, 10, 18, lambda lx, ly, fw, fh: (
        lerp_rgb((244, 214, 222), (232, 218, 236), abs(lx - 4.5) / 5.0), (8, 32, 125)
    ))
    # Starry turquoise & pale-gold constellation dapple spots on flanks & back
    for sx, sy, c in [
        (4, 20, (134, 248, 244)), (8, 21, (255, 232, 154)), (12, 20, (134, 248, 244)), (15, 22, (255, 204, 218)),
        (32, 20, (134, 248, 244)), (36, 21, (255, 232, 154)), (40, 20, (134, 248, 244)), (43, 22, (255, 204, 218)),
        (21, 5, (138, 248, 244)), (24, 9, (255, 236, 162)), (22, 13, (138, 248, 244)),
    ]:
        img.putpixel((sx, sy), (*c, 255))
        mer.putpixel((sx, sy), (25, 195, 40))
    # Neck with delicate golden starlight collar band
    paint_box_uv(img, mer, 0, 28, 5, 9, 5, (242, 236, 232), (176, 236, 234), emis=26, rough=118, pattern="body")
    for x in range(0, 20):
        img.putpixel((x, 40), (242, 198, 92, 255))
        mer.putpixel((x, 40), (225, 95, 42))
    # Head with expressive gentle sapphire-aqua eyes, rose cheeks & dark velvety nose
    paint_box_uv(img, mer, 22, 28, 6, 6, 9, (248, 244, 238), (226, 214, 224), emis=20, rough=114, pattern="body")
    for ex in (27, 28, 39, 40):
        img.putpixel((ex, 39), (26, 36, 72, 255) if ex in (28, 39) else (126, 250, 248, 255))
        img.putpixel((ex, 40), (126, 250, 248, 255) if ex in (28, 39) else (244, 255, 255, 255))
        mer.putpixel((ex, 40), (30, 245, 22))
    for nx in (33, 34):
        img.putpixel((nx, 41), (72, 66, 94, 255))
    # Crystalline golden-to-aquamarine antlers
    paint_box_uv(img, mer, 54, 28, 2, 8, 2, (248, 206, 94), (128, 252, 248), emis=205, metal=220, rough=30, pattern="crystal")
    # Slender legs with rose-pearl fetlocks & burnished golden hooves
    paint_box_uv(img, mer, 0, 44, 3, 12, 3, (238, 232, 230), (206, 214, 228), emis=16, rough=120, pattern="body")
    for y in range(56, 59):
        for x in range(0, 12):
            img.putpixel((x, y), (232, 182, 74, 255))
            mer.putpixel((x, y), (228, 52, 42))
    paint_box_uv(img, mer, 16, 44, 3, 3, 4, (252, 248, 244), (156, 248, 244), emis=95, rough=90, pattern="crystal")
    save_entity_pbr("nimbus_stag", img, mer)

    # --- 8. tide_jelly (64x64) — Translucent-Feel Radial-Ribbed Aurelia Cloud-Jelly ---
    img = Image.new("RGBA", (64, 64), (242, 164, 200, 255))
    mer = Image.new("RGB", (64, 64), (18, 168, 42))
    paint_box_uv(img, mer, 0, 0, 12, 8, 12, (248, 152, 196), (124, 248, 246), emis=180, rough=34, pattern="crystal")
    # Radial bioluminescent dome ribs along all 4 sides of outer bell (x:0..48, y:12..20)
    for x in range(0, 48):
        rib = (x % 3 == 0)
        for y in range(12, 20):
            ty = (y - 12) / 7.0
            base = lerp_rgb((134, 250, 248), (252, 158, 204), ty)
            if rib:
                base = lerp_rgb(base, (255, 244, 196), 0.55)
            img.putpixel((x, y), (*base, 255))
            mer.putpixel((x, y), (25, clamp(235 if rib else 175), 26))
        if x % 3 != 0:
            img.putpixel((x, 19), (255, 238, 168, 255))
            mer.putpixel((x, 19), (45, 252, 20))
    paint_box_uv(img, mer, 0, 22, 8, 3, 8, (255, 202, 224), (160, 252, 248), emis=210, rough=28, pattern="crystal")
    paint_box_uv(img, mer, 34, 22, 5, 5, 5, (255, 246, 182), (255, 180, 214), emis=255, rough=16, pattern="crystal")
    paint_box_uv(img, mer, 0, 36, 2, 8, 2, (114, 248, 246), (250, 170, 214), emis=212, rough=30, pattern="crystal")
    paint_box_uv(img, mer, 12, 36, 1, 7, 1, (255, 238, 172), (136, 252, 250), emis=240, rough=22, pattern="crystal")
    save_entity_pbr("tide_jelly", img, mer)

    # --- 9. shard_stalker (64x64) — Sleek Twilight Lynx with Lavender Belly, Glowing Runes & Crystal Claws ---
    img = Image.new("RGBA", (64, 64), (34, 30, 72, 255))
    mer = Image.new("RGB", (64, 64), (35, 25, 102))
    paint_box_uv(img, mer, 0, 0, 9, 8, 16, (34, 30, 74), (78, 64, 138), emis=22, metal=48, rough=92, pattern="body")
    # Soft silver-lavender feline underbelly (bottom face of body: x:25..34, y:0..16)
    paint_box_face(img, mer, 25, 0, 9, 16, lambda lx, ly, fw, fh: (
        lerp_rgb((92, 82, 148), (138, 124, 196), 1.0 - abs(lx - 4.0) / 4.5), (25, 42, 105)
    ))
    # Glowing violet-cyan crystalline rib stripes along predator flanks
    for x in (4, 8, 12, 30, 34, 38):
        for y in range(18, 22):
            img.putpixel((x, y), (144, 206, 255, 255) if y < 20 else (218, 138, 255, 255))
            mer.putpixel((x, y), (65, 210, 28))
    paint_box_uv(img, mer, 0, 26, 8, 7, 8, (40, 34, 84), (92, 76, 156), emis=28, metal=58, rough=88, pattern="body")
    # Fierce golden-magenta predator slit eyes + crisp pale lynx muzzle & whisker tufts (front x:8..16, y:34..41)
    for ex in (9, 10, 13, 14):
        img.putpixel((ex, 37), (255, 222, 112, 255))
        img.putpixel((ex, 38), (244, 122, 255, 255))
        mer.putpixel((ex, 37), (85, 255, 16))
        mer.putpixel((ex, 38), (85, 255, 16))
    for mx in (11, 12):
        img.putpixel((mx, 39), (156, 144, 212, 255))
        img.putpixel((mx, 40), (222, 196, 242, 255))
    paint_box_uv(img, mer, 34, 26, 2, 6, 3, (112, 248, 250), (234, 136, 255), emis=248, rough=20, pattern="crystal")
    paint_box_uv(img, mer, 0, 44, 3, 9, 3, (30, 26, 66), (68, 56, 124), emis=18, metal=42, rough=98, pattern="body")
    for x in range(0, 12):
        img.putpixel((x, 55), (132, 250, 250, 255))
        mer.putpixel((x, 55), (65, 228, 24))
    paint_box_uv(img, mer, 16, 44, 2, 2, 10, (46, 40, 96), (232, 136, 255), emis=145, rough=42, pattern="wing")
    save_entity_pbr("shard_stalker", img, mer)

    # --- 10. astral_weaver (64x64) — Starry Cloaked Twilight Ruin Spellcaster ---
    img = Image.new("RGBA", (64, 64), (30, 26, 70, 255))
    mer = Image.new("RGB", (64, 64), (35, 25, 102))
    paint_box_uv(img, mer, 0, 0, 10, 14, 8, (34, 30, 80), (244, 198, 82), emis=34, metal=88, rough=94, pattern="gilded")
    # Starry embroidery & glowing gold stole down the Weaver's cloak front (x:8..18, y:8..22) and back (x:26..36, y:8..22)
    for y in range(9, 21):
        img.putpixel((12, y), (246, 202, 88, 255))
        img.putpixel((13, y), (246, 202, 88, 255))
        mer.putpixel((12, y), (238, 125, 34))
        mer.putpixel((13, y), (238, 125, 34))
        if y % 3 == 0:
            img.putpixel((12, y), (124, 250, 248, 255))
            mer.putpixel((12, y), (60, 235, 22))
    for bx, by in [(28, 11), (32, 13), (30, 16), (34, 18), (29, 19)]:
        img.putpixel((bx, by), (255, 238, 164, 255))
        mer.putpixel((bx, by), (140, 235, 26))

    paint_box_uv(img, mer, 0, 24, 9, 9, 9, (42, 36, 92), (246, 200, 88), emis=28, metal=78, rough=94, pattern="gilded")
    # Deep shadowed hood framing glowing cyan-gold eyes + gilded lunar brow circlet (x:9..18, y:33..42)
    for y in range(34, 41):
        for x in range(10, 17):
            img.putpixel((x, y), (14, 12, 32, 255))
            mer.putpixel((x, y), (10, 10, 150))
    for ex in (11, 15):
        img.putpixel((ex, 37), (128, 254, 252, 255))
        img.putpixel((ex, 38), (255, 242, 180, 255))
        mer.putpixel((ex, 37), (45, 255, 16))
        mer.putpixel((ex, 38), (85, 255, 16))
    for mx in (12, 13, 14):
        img.putpixel((mx, 35), (254, 218, 106, 255))
        mer.putpixel((mx, 35), (240, 195, 28))
    paint_box_uv(img, mer, 38, 0, 4, 11, 5, (46, 40, 102), (246, 202, 88), emis=38, metal=95, rough=90, pattern="gilded")
    paint_box_uv(img, mer, 0, 44, 10, 8, 8, (30, 26, 72), (118, 248, 246), emis=74, metal=55, rough=88, pattern="gilded")
    paint_box_uv(img, mer, 38, 20, 4, 4, 4, (232, 136, 255), (255, 242, 172), emis=255, rough=16, pattern="crystal")
    paint_box_uv(img, mer, 38, 30, 10, 1, 2, (252, 212, 92), (255, 248, 190), emis=208, metal=248, rough=26, pattern="gilded")
    save_entity_pbr("astral_weaver", img, mer)


# =============================================================================
# 4. PARTICLE ATLAS (128x128 = 4x4 grid of 32x32 crisp luminous sprites)
# =============================================================================

def generate_particle_atlas():
    atlas = Image.new("RGBA", (128, 128), (0, 0, 0, 0))

    def cell(col, row):
        return col * 32, row * 32

    def set_glow(ox, oy, fn):
        for y in range(32):
            for x in range(32):
                nx = (x - 15.5) / 15.5
                ny = (y - 15.5) / 15.5
                a = max(0.0, min(1.0, fn(nx, ny)))
                if a > 0.01:
                    v = clamp(220 + 35 * a)
                    atlas.putpixel((ox + x, oy + y), (v, v, 255, clamp(a * 255)))

    # [0,0] 4-point radiant star
    set_glow(*cell(0, 0), lambda x, y: max(
        math.exp(-(abs(x) * 9.0 + abs(y) * 1.4)),
        math.exp(-(abs(y) * 9.0 + abs(x) * 1.4)),
        0.75 * math.exp(-(x * x + y * y) * 9.0),
    ))
    # [1,0] soft luminous orb
    set_glow(*cell(1, 0), lambda x, y: max(0.0, 1.0 - math.hypot(x, y)) ** 1.7)
    # [2,0] hollow golden harmonic ring
    set_glow(*cell(2, 0), lambda x, y: math.exp(-((math.hypot(x, y) - 0.72) ** 2) * 85.0))
    # [3,0] tall gossamer aurora ribbon
    set_glow(*cell(3, 0), lambda x, y: math.exp(-(x * x) * 16.0) * max(0.0, 1.0 - abs(y)) ** 0.75)

    # [0,1] 8-point starburst nova
    def nova(x, y):
        r = math.hypot(x, y)
        if r > 0.98:
            return 0.0
        ang = math.atan2(y, x)
        rays = (0.5 + 0.5 * math.cos(ang * 8)) ** 2.5
        return max(math.exp(-r * 5.0), rays * max(0.0, 1.0 - r))
    set_glow(*cell(0, 1), nova)

    # [1,1] faceted diamond crystal glint
    set_glow(*cell(1, 1), lambda x, y: max(0.0, 1.0 - (abs(x) * 1.25 + abs(y) * 1.05)) ** 1.1)

    # [2,1] musical chime note
    ox, oy = cell(2, 1)
    d = ImageDraw.Draw(atlas)
    d.ellipse((ox + 7, oy + 19, ox + 17, oy + 27), fill=(255, 255, 255, 255))
    d.rectangle((ox + 15, oy + 6, ox + 18, oy + 23), fill=(255, 255, 255, 255))
    d.polygon([(ox + 17, oy + 6), (ox + 26, oy + 9), (ox + 26, oy + 14), (ox + 17, oy + 11)], fill=(255, 255, 255, 245))

    # [3,1] sweeping wind swirl arc
    def swirl(x, y):
        r = math.hypot(x, y)
        ang = math.atan2(y, x)
        arc = math.exp(-((r - 0.62) ** 2) * 55.0)
        fade = max(0.0, math.sin(ang * 0.5 + 0.8))
        return arc * fade
    set_glow(*cell(3, 1), swirl)

    # [0,2] crescent energy slash wave
    def crescent(x, y):
        d1 = math.hypot(x, y)
        d2 = math.hypot(x + 0.34, y)
        if d1 < 0.88 and d2 > 0.66:
            return max(0.0, (0.88 - d1) * 4.5) * min(1.0, (d2 - 0.66) * 5.0)
        return 0.0
    set_glow(*cell(0, 2), crescent)

    # [1,2] tiny sparkle dust cluster
    pts = [(-0.45, -0.35), (0.38, -0.42), (0.05, 0.10), (-0.32, 0.45), (0.48, 0.32)]
    set_glow(*cell(1, 2), lambda x, y: max(math.exp(-((x - px) ** 2 + (y - py) ** 2) * 65.0) for px, py in pts))

    # [2,2] double concentric ripple ring
    set_glow(*cell(2, 2), lambda x, y: max(
        math.exp(-((math.hypot(x, y) - 0.78) ** 2) * 110.0),
        0.75 * math.exp(-((math.hypot(x, y) - 0.44) ** 2) * 110.0),
    ))

    # [3,2] glowing petal / feather mote
    set_glow(*cell(3, 2), lambda x, y: max(0.0, 1.0 - math.hypot(x * 1.8, y * 0.95)) ** 1.35)

    # [0,3] vertical light pillar ray
    set_glow(*cell(0, 3), lambda x, y: math.exp(-(x * x) * 28.0) * max(0.0, 1.0 - abs(y) * 0.85))

    # [1,3] astrolabe ring + cross glyph
    set_glow(*cell(1, 3), lambda x, y: max(
        math.exp(-((math.hypot(x, y) - 0.68) ** 2) * 90.0),
        (math.exp(-(abs(x) * 18.0)) if abs(y) < 0.72 else 0.0) * 0.8,
        (math.exp(-(abs(y) * 18.0)) if abs(x) < 0.72 else 0.0) * 0.8,
    ))

    # [2,3] glowing dewdrop bubble
    set_glow(*cell(2, 3), lambda x, y: max(
        0.35 * max(0.0, 1.0 - math.hypot(x, y)),
        math.exp(-((math.hypot(x, y) - 0.65) ** 2) * 75.0) * 0.85,
        math.exp(-((x + 0.25) ** 2 + (y + 0.25) ** 2) * 45.0),
    ))

    # [3,3] soft nebula wisp
    set_glow(*cell(3, 3), lambda x, y: max(0.0, 1.0 - math.hypot(x * 0.95, y * 1.15)) ** 2.1 * 0.8)

    atlas.save(PARTICLE_DIR / "auralis_particles.png")


# =============================================================================
# 5. PACK ICON (256x256 Painterly Key Art for BP & RP)
# =============================================================================

def generate_pack_icon():
    W, H = 256, 256
    img = Image.new("RGBA", (W, H))

    # 1. Iridescent Twilight Sky Gradient (indigo zenith -> amethyst -> rose-gold horizon)
    for y in range(H):
        t = y / (H - 1)
        if t < 0.45:
            col = lerp_rgb((18, 22, 62), (76, 48, 118), t / 0.45)
        elif t < 0.75:
            col = lerp_rgb((76, 48, 118), (218, 118, 146), (t - 0.45) / 0.30)
        else:
            col = lerp_rgb((218, 118, 146), (255, 206, 152), (t - 0.75) / 0.25)
        for x in range(W):
            # Subtle horizon glow near center
            glow = math.exp(-(((x - 128) / 90.0) ** 2 + ((y - 165) / 55.0) ** 2))
            c = lerp_rgb(col, (255, 228, 182), glow * 0.35)
            img.putpixel((x, y), (*c, 255))

    draw = ImageDraw.Draw(img, "RGBA")

    # 2. Crisp Starlight & Aurora Ribbons in upper sky
    rng = random.Random(4242)
    for _ in range(70):
        sx, sy = rng.randint(8, 248), rng.randint(8, 130)
        br = rng.randint(170, 255)
        sz = 2 if rng.random() > 0.85 else 1
        draw.ellipse((sx - sz, sy - sz, sx + sz, sy + sz), fill=(br, br, 255, rng.randint(140, 255)))
    # Soft aurora waves
    for band, (cy, col) in enumerate([(48, (96, 240, 232, 42)), (68, (238, 144, 212, 36))]):
        pts = [(x, cy + int(12 * math.sin(x * 0.035 + band * 1.4))) for x in range(0, 260, 8)]
        for i in range(len(pts) - 1):
            draw.line([pts[i], pts[i + 1]], fill=col, width=16)

    # 3. Giant Glowing Golden Astrolabe Rings behind the main island!
    ring_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring_layer)
    rd.ellipse((40, 36, 216, 212), outline=(255, 220, 118, 210), width=5)
    rd.ellipse((54, 50, 202, 198), outline=(116, 246, 240, 145), width=2)
    rd.ellipse((24, 92, 232, 158), outline=(255, 214, 112, 185), width=4)
    glow_ring = ring_layer.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img, glow_ring)
    img = Image.alpha_composite(img, ring_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # 4. Rose-Gold Cloud Sea along the bottom!
    for cx, cy, rx, ry, col in [
        (30, 232, 62, 28, (255, 194, 174, 210)),
        (105, 240, 74, 30, (255, 214, 188, 225)),
        (190, 234, 72, 28, (248, 184, 178, 215)),
        (242, 228, 50, 26, (255, 204, 182, 200)),
        (128, 250, 110, 26, (255, 226, 204, 235)),
    ]:
        draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=col)

    # 5. Floating Porcelain & Starstone Sanctuary Atoll!
    # Tapered deep indigo starstone underbelly
    draw.polygon([(64, 146), (192, 146), (170, 180), (144, 204), (128, 218), (112, 202), (84, 178)], fill=(34, 38, 78, 255))
    draw.polygon([(80, 146), (176, 146), (156, 174), (128, 196), (100, 174)], fill=(52, 56, 102, 255))
    # Pale alabaster travertine rim
    draw.polygon([(56, 134), (200, 134), (192, 150), (64, 150)], fill=(238, 229, 218, 255))
    draw.rectangle((66, 142, 190, 146), fill=(212, 198, 184, 255))
    # Glowing turquoise Tide-Moss cap
    draw.ellipse((54, 122, 202, 144), fill=(52, 204, 196, 255))
    draw.ellipse((68, 126, 188, 140), fill=(98, 240, 230, 255))

    # Cascading Aquamarine Starlight Waterfall spilling off the island into the clouds!
    draw.rectangle((148, 136, 162, 236), fill=(86, 240, 238, 200))
    draw.rectangle((152, 136, 158, 234), fill=(208, 255, 252, 220))

    # Central Alabaster Sanctuary Arch & Glowing Astrolabe Pedestal!
    draw.rectangle((106, 98, 114, 132), fill=(244, 238, 228, 255))
    draw.rectangle((142, 98, 150, 132), fill=(244, 238, 228, 255))
    draw.arc((106, 82, 150, 122), 180, 360, fill=(246, 202, 94, 255), width=5)
    # Glowing portal beam rising from Astrolabe
    beam = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(beam)
    bd.rectangle((122, 34, 134, 128), fill=(120, 248, 246, 115))
    bd.rectangle((125, 34, 131, 128), fill=(255, 246, 206, 180))
    img = Image.alpha_composite(img, beam.filter(ImageFilter.GaussianBlur(4)))
    img = Image.alpha_composite(img, beam)
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rectangle((122, 118, 134, 132), fill=(240, 194, 82, 255))
    draw.ellipse((123, 110, 133, 120), fill=(255, 252, 224, 255))

    # Prism-Coral Tree on the left of the island
    draw.rectangle((76, 102, 82, 130), fill=(196, 186, 212, 255))
    draw.ellipse((60, 84, 98, 110), fill=(58, 208, 206, 245))
    draw.ellipse((68, 78, 92, 98), fill=(134, 248, 238, 245))
    draw.ellipse((74, 84, 84, 92), fill=(255, 198, 210, 235))

    # Soaring Celestial Lumina Ray silhouette in upper right sky!
    draw.polygon([(176, 62), (206, 52), (226, 66), (204, 72), (186, 78)], fill=(86, 238, 240, 245))
    draw.polygon([(186, 66), (204, 58), (214, 65), (198, 70)], fill=(255, 234, 166, 235))
    draw.line([(204, 72), (234, 86)], fill=(140, 250, 248, 200), width=2)

    # Ornate subtle golden vignette border
    draw.rectangle((3, 3, W - 4, H - 4), outline=(246, 204, 102, 190), width=3)
    draw.rectangle((7, 7, W - 8, H - 8), outline=(126, 244, 240, 100), width=1)

    img.save(BP_ROOT / "pack_icon.png")
    img.save(RP_ROOT / "pack_icon.png")


# =============================================================================
# 6. TERRAIN_TEXTURE.JSON, ITEM_TEXTURE.JSON, TEXTURES_LIST.JSON + PREVIEW
# =============================================================================

def write_texture_registries(block_names, item_names):
    terrain = {
        "resource_pack_name": "auralis_firmament",
        "texture_name": "atlas.terrain",
        "padding": 8,
        "num_mip_levels": 4,
        "texture_data": {
            f"auralis_{name}": {"textures": f"textures/blocks/{name}"}
            for name in block_names
        },
    }
    with open(RP_TEX / "terrain_texture.json", "w", encoding="utf-8") as f:
        json.dump(terrain, f, indent=2)

    item_tex = {
        "resource_pack_name": "auralis_firmament",
        "texture_name": "atlas.items",
        "texture_data": {
            f"auralis_{name}": {"textures": f"textures/items/{name}"}
            for name in item_names
        },
    }
    with open(RP_TEX / "item_texture.json", "w", encoding="utf-8") as f:
        json.dump(item_tex, f, indent=2)

    # Build complete textures_list.json for fast loading & PBR registration
    tex_list = []
    for sub in ("blocks", "items", "entity", "particle"):
        folder = RP_TEX / sub
        for p in sorted(folder.glob("*.png")):
            tex_list.append(f"textures/{sub}/{p.stem}")
    with open(RP_TEX / "textures_list.json", "w", encoding="utf-8") as f:
        json.dump(tex_list, f, indent=2)


def build_contact_sheet(block_names, item_names, out_path):
    """Build a crisp upscaled preview sheet for visual QA inspection."""
    scale = 4  # 16 -> 64px per tile
    cols = 8
    all_tiles = [(f"B:{n}", BLOCKS_DIR / f"{n}.png") for n in block_names] + [
        (f"I:{n}", ITEMS_DIR / f"{n}.png") for n in item_names
    ]
    rows = math.ceil(len(all_tiles) / cols)
    sheet = Image.new("RGBA", (cols * 80, rows * 84), (24, 22, 42, 255))
    draw = ImageDraw.Draw(sheet)
    for i, (label, path) in enumerate(all_tiles):
        c, r = i % cols, i // cols
        tile = Image.open(path).convert("RGBA").resize((64, 64), Image.NEAREST)
        x, y = c * 80 + 8, r * 84 + 4
        # Dark checkerboard behind transparent tiles
        draw.rectangle((x - 1, y - 1, x + 64, y + 64), fill=(38, 36, 62, 255), outline=(92, 86, 128, 255))
        sheet.paste(tile, (x, y), tile)
        draw.text((x, y + 67), label[:11], fill=(230, 226, 240, 255))
    sheet.save(out_path)


def main():
    block_names = generate_blocks()
    item_names = generate_items()
    generate_entities()
    generate_particle_atlas()
    if not (BP_ROOT / "pack_icon.png").exists() or "--regen-icon" in os.sys.argv:
        generate_pack_icon()
    write_texture_registries(block_names, item_names)
    scratch_dir = Path("/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/7bbadaad-6a3c-4ea7-a099-4ed7d35e937e/scratch")
    scratch_dir.mkdir(parents=True, exist_ok=True)
    build_contact_sheet(block_names, item_names, scratch_dir / "textures_preview.png")
    print(f"Generated {len(block_names)} PBR blocks, {len(item_names)} items, 10 PBR entities, 1 particle atlas, and preserved pack_icon.png!")


if __name__ == "__main__":
    main()
