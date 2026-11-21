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

    # --- 1. auralite_stone: Pale pearl travertine with delicate warm striations & subtle gold veins ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=101)
            strata = 0.5 + 0.5 * math.sin((y / 16.0) * math.tau * 2 + n * 2.4)
            t = 0.65 * n + 0.35 * strata
            col = lerp_rgb((212, 198, 184), (247, 241, 232), t)
            rough = clamp(165 + (1.0 - t) * 45)
            metal, emis = 0, 0
            hv = clamp(115 + t * 80)
            # Subtle warm rose-gold mineral vein
            vein = abs(math.sin((x * 0.45 + y * 0.72) + n * 2.1))
            if vein < 0.085:
                col = lerp_rgb(col, (226, 184, 108), 0.72)
                metal = 150
                rough = 75
                hv = clamp(hv - 15)
            elif n < 0.24:
                col = lerp_rgb(col, (186, 170, 160), 0.5)
                hv = clamp(hv - 25)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("auralite_stone", img, mer, hgt)
    block_names.append("auralite_stone")

    # --- 2. starstone: Deep twilight indigo basalt flecked with glowing starlight specks ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    stars = {(2, 3, "cyan"), (11, 2, "gold"), (6, 9, "cyan"), (14, 11, "violet"), (4, 14, "gold"), (10, 13, "cyan")}
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=202)
            col = lerp_rgb((22, 25, 52), (58, 63, 108), n)
            metal, emis, rough = 18, 0, clamp(150 + (1 - n) * 55)
            hv = clamp(95 + n * 90)
            # Subtle fractured slate ridges
            if (x + y * 2) % 7 == 0 and n < 0.45:
                col = lerp_rgb(col, (15, 17, 36), 0.55)
                hv = clamp(hv - 35)
            for sx, sy, kind in stars:
                if (x, y) == (sx, sy):
                    if kind == "cyan":
                        col = (128, 245, 240)
                    elif kind == "gold":
                        col = (255, 219, 118)
                    else:
                        col = (210, 168, 255)
                    emis = 215
                    rough = 40
                    hv = 220
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("starstone", img, mer, hgt)
    block_names.append("starstone")

    # --- 3. tide_moss_top: Lush iridescent aquamarine-turquoise velvet moss with tiny pearl blooms ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    blossoms = {(3, 4), (11, 6), (7, 13), (13, 12)}
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=303)
            c1 = (28, 126, 132)
            c2 = (68, 206, 196)
            c3 = (138, 244, 228)
            col = lerp_rgb(c1, c2, min(1.0, n * 1.35)) if n < 0.72 else lerp_rgb(c2, c3, (n - 0.72) / 0.28)
            emis = 28 if n > 0.75 else 10
            rough = clamp(185 - n * 40)
            hv = clamp(120 + n * 85)
            if (x, y) in blossoms:
                col = (255, 212, 218)
                emis = 155
                rough = 80
                hv = 230
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (0, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("tide_moss_top", img, mer, hgt)
    block_names.append("tide_moss_top")

    # --- 4. tide_moss_side: Pearl Auralite stone topped by draped glowing turquoise moss ---
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
            col = lerp_rgb((28, 134, 138), (112, 238, 222), 0.35 + 0.55 * t + 0.1 * n)
            if y == depth - 1:
                col = lerp_rgb(col, (20, 95, 102), 0.35)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (0, 24 if y < depth - 1 else 8, 170))
            hgt.putpixel((x, y), clamp(190 + t * 40))
    save_block_pbr("tide_moss_side", img, mer, hgt)
    block_names.append("tide_moss_side")

    # --- 5. gilded_travertine: Carved alabaster tile with burnished gold borders & diamond inlay ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=404)
            col = lerp_rgb((228, 218, 206), (250, 245, 236), n)
            metal, emis, rough = 0, 0, 145
            hv = clamp(150 + n * 35)
            # Outer carved bevel & gold trim
            if x in (0, 15) or y in (0, 15):
                col = lerp_rgb((194, 180, 166), (218, 204, 190), n)
                hv = 95
            elif x in (1, 14) or y in (1, 14):
                col = lerp_rgb((206, 156, 56), (252, 218, 114), 0.4 + 0.6 * n)
                metal, emis, rough = 225, 25, 55
                hv = 210
            # Center recessed diamond gold motif
            dist = abs(x - 7.5) + abs(y - 7.5)
            if 3.2 <= dist <= 4.3:
                col = lerp_rgb((212, 162, 62), (255, 224, 128), 0.5 + 0.5 * n)
                metal, emis, rough = 230, 35, 50
                hv = 215
            elif dist < 2.2:
                col = lerp_rgb((92, 218, 212), (170, 250, 245), 0.5 + 0.5 * n)
                metal, emis, rough = 40, 95, 45
                hv = 180
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("gilded_travertine", img, mer, hgt)
    block_names.append("gilded_travertine")

    # --- 6. solarium_ore: Starstone shot through with blazing molten-gold crystal veins ---
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
    for ox, oy in ore_pixels:
        if (ox, oy) in bright_cores:
            img.putpixel((ox, oy), (255, 244, 178, 255))
            mer.putpixel((ox, oy), (235, 255, 35))
            hgt.putpixel((ox, oy), 245)
        else:
            img.putpixel((ox, oy), (242, 184, 58, 255))
            mer.putpixel((ox, oy), (215, 195, 50))
            hgt.putpixel((ox, oy), 215)
        # Warm halo on adjacent dark pixels
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = (ox + dx) % 16, (oy + dy) % 16
            if (nx, ny) not in ore_pixels:
                c = img.getpixel((nx, ny))
                blended = lerp_rgb(c[:3], (182, 124, 44), 0.38)
                img.putpixel((nx, ny), (*blended, 255))
    save_block_pbr("solarium_ore", img, mer, hgt)
    block_names.append("solarium_ore")

    # --- 7. solarium_block: Radiant forged celestial gold-crystal block ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            dx, dy = abs(x - 7.5), abs(y - 7.5)
            edge = max(dx, dy)
            n = fbm_tile(x, y, 16, seed=505)
            if edge >= 6.5:
                col = lerp_rgb((156, 104, 24), (214, 158, 48), n)
                metal, emis, rough, hv = 240, 40, 58, 155
            elif edge >= 5.0:
                col = lerp_rgb((222, 170, 58), (255, 224, 120), 0.4 + 0.6 * n)
                metal, emis, rough, hv = 245, 95, 42, 220
            else:
                rad = math.hypot(dx, dy) / 6.0
                col = lerp_rgb((255, 249, 206), (242, 186, 62), min(1.0, rad))
                metal, emis, rough, hv = 220, clamp(235 - rad * 110), 30, clamp(245 - rad * 40)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("solarium_block", img, mer, hgt)
    block_names.append("solarium_block")

    # --- 8. prism_log_side: Fluted pearl-lavender bark with glowing aquamarine fissures ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=606)
            flute = 0.5 + 0.5 * math.sin((x / 16.0) * math.tau * 4 + math.sin(y * 0.4) * 0.6)
            col = lerp_rgb((96, 86, 126), (218, 210, 228), flute * 0.78 + n * 0.22)
            emis = 0
            rough = clamp(165 - flute * 35)
            hv = clamp(110 + flute * 100)
            if flute < 0.16 and (y + x) % 3 != 0:
                col = lerp_rgb((66, 220, 216), (144, 250, 242), n)
                emis = 155
                rough = 65
                hv = 80
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (10, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("prism_log_side", img, mer, hgt)
    block_names.append("prism_log_side")

    # --- 9. prism_log_top: Concentric pearlescent rings & luminous cyan heartwood ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            r = math.hypot(x - 7.5, y - 7.5)
            n = fbm_tile(x, y, 16, seed=609)
            if r > 6.6:
                col = lerp_rgb((116, 102, 146), (186, 174, 204), n)
                emis, rough, hv = 0, 175, 165
            else:
                ring = 0.5 + 0.5 * math.sin(r * 2.4 + n * 0.9)
                col = lerp_rgb((110, 214, 210), (242, 236, 230), ring)
                if r < 2.2:
                    col = lerp_rgb((135, 250, 244), (255, 236, 178), 1.0 - r / 2.2)
                    emis = 165
                else:
                    emis = clamp((1.0 - ring) * 75)
                rough = 125
                hv = clamp(130 + ring * 55)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (0, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("prism_log_top", img, mer, hgt)
    block_names.append("prism_log_top")

    # --- 10. prism_planks: Luminous ivory-and-seafoam refined planks ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        plank_id = y // 4
        seam_x = (plank_id * 7 + 3) % 16
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=707 + plank_id * 5)
            grain = 0.5 + 0.5 * math.sin(x * 0.55 + plank_id * 1.7 + n * 2.0)
            col = lerp_rgb((184, 212, 212), (242, 236, 228), 0.55 + 0.35 * grain + 0.1 * n)
            hv = clamp(160 + grain * 25)
            rough = 135
            if y % 4 == 0 or x == seam_x:
                col = lerp_rgb(col, (108, 134, 146), 0.55)
                hv = 85
            elif y % 4 == 1:
                col = lerp_rgb(col, (255, 252, 246), 0.3)
                hv = 195
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (0, 12, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("prism_planks", img, mer, hgt)
    block_names.append("prism_planks")

    # --- 11. prism_leaves: Translucent sea-glass turquoise & rose-gold glowing foliage ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=808)
            n2 = hash2d(x, y, seed=811)
            # Graceful leaf cluster silhouette with crisp alpha cutouts
            if n < 0.23 and n2 < 0.55:
                img.putpixel((x, y), (0, 0, 0, 0))
                mer.putpixel((x, y), (0, 0, 200))
                hgt.putpixel((x, y), 0)
            else:
                if n2 > 0.87:
                    # Rose-gold blossom flecks!
                    col = lerp_rgb((248, 174, 186), (255, 224, 182), n)
                    emis = 165
                else:
                    col = lerp_rgb((36, 164, 172), (144, 250, 238), n)
                    emis = clamp(35 + n * 75)
                img.putpixel((x, y), (*col, 255))
                mer.putpixel((x, y), (15, emis, 85))
                hgt.putpixel((x, y), clamp(120 + n * 110))
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
            sheen = (x + y in (7, 8)) and (3 <= x <= 11) and (3 <= y <= 11)
            if border:
                img.putpixel((x, y), (226, 186, 98, 240))
                mer.putpixel((x, y), (220, 45, 45))
                hgt.putpixel((x, y), 220)
            elif inner:
                img.putpixel((x, y), (144, 242, 244, 185))
                mer.putpixel((x, y), (30, 80, 25))
                hgt.putpixel((x, y), 180)
            elif corner_star:
                img.putpixel((x, y), (255, 232, 162, 225))
                mer.putpixel((x, y), (180, 160, 30))
                hgt.putpixel((x, y), 205)
            elif sheen:
                img.putpixel((x, y), (225, 255, 255, 135))
                mer.putpixel((x, y), (10, 95, 12))
                hgt.putpixel((x, y), 145)
            else:
                img.putpixel((x, y), (124, 228, 240, 72))
                mer.putpixel((x, y), (10, 35, 16))
                hgt.putpixel((x, y), 128)
    save_block_pbr("starlight_glass", img, mer, hgt)
    block_names.append("starlight_glass")

    # --- 13. sea_crystal: Faceted glowing cyan-to-lavender crystal cluster (for custom 3D crystal model!) ---
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    mer = Image.new("RGB", (16, 16), (0, 0, 128))
    hgt = Image.new("L", (16, 16), 128)
    # Full textured faceted crystal surface (used on custom 3D crystal prism cubes!)
    for y in range(16):
        for x in range(16):
            t = 1.0 - (y / 15.0)
            facet = abs((x % 4) - 1.5) / 1.5
            base = lerp_rgb((54, 184, 206), (218, 178, 255), t * 0.55)
            col = lerp_rgb(base, (226, 255, 255), (1.0 - facet) * 0.45 + t * 0.35)
            emis = clamp(115 + t * 135)
            img.putpixel((x, y), (*col, 245))
            mer.putpixel((x, y), (35, emis, 28))
            hgt.putpixel((x, y), clamp(130 + (1.0 - facet) * 90))
    save_block_pbr("sea_crystal", img, mer, hgt)
    block_names.append("sea_crystal")

    # --- 14. lantern_bloom: Glowing warm amber-rose celestial blossom lantern ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            r = math.hypot(x - 7.5, y - 7.5) / 8.0
            if y <= 2 or y >= 13:
                # Burnished brass calyx cap
                col = lerp_rgb((172, 124, 42), (242, 198, 92), 1.0 - abs(x - 7.5) / 8.0)
                metal, emis, rough, hv = 230, 30, 50, 210
            elif x in (0, 7, 8, 15) and y % 2 == 0:
                # Delicate gold lantern ribs
                col = (232, 180, 78)
                metal, emis, rough, hv = 210, 90, 60, 205
            else:
                # Warm radiant rose-amber petal core
                col = lerp_rgb((255, 245, 202), (248, 134, 146), min(1.0, r * 1.15))
                metal, emis, rough, hv = 0, clamp(255 - r * 70), 45, clamp(220 - r * 50)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("lantern_bloom", img, mer, hgt)
    block_names.append("lantern_bloom")

    # --- 15. chime_reed: Slender ivory reeds & hanging brass chime bells (alpha-cutout crossed planes!) ---
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    mer = Image.new("RGB", (16, 16), (0, 0, 140))
    hgt = Image.new("L", (16, 16), 0)
    # Three delicate stalks at x=4, x=8, x=12
    stalks = [(4, 3, 15), (8, 1, 15), (12, 5, 15)]
    for sx, y0, y1 in stalks:
        for y in range(y0, y1 + 1):
            t = 1.0 - (y - y0) / max(1, y1 - y0)
            col = lerp_rgb((108, 188, 186), (245, 240, 224), t)
            img.putpixel((sx, y), (*col, 255))
            mer.putpixel((sx, y), (20, clamp(40 + t * 90), 90))
            hgt.putpixel((sx, y), 180)
        # Hanging golden wind-chime bell near top!
        for by in range(y0, min(15, y0 + 3)):
            for bx in (sx - 1, sx, sx + 1):
                if 0 <= bx < 16 and (by > y0 or bx == sx):
                    img.putpixel((bx, by), (252, 214, 108, 255))
                    mer.putpixel((bx, by), (240, 170, 35))
                    hgt.putpixel((bx, by), 235)
    save_block_pbr("chime_reed", img, mer, hgt)
    block_names.append("chime_reed")

    # --- 16. gilded_brass: Brushed celestial brass plates with astrolabe arc engravings ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=909)
            brush = 0.5 + 0.5 * math.sin(y * 1.6 + n * 1.4)
            col = lerp_rgb((168, 118, 38), (244, 204, 102), 0.45 + 0.4 * brush + 0.15 * n)
            metal, emis, rough, hv = 242, 10, clamp(48 + (1 - brush) * 32), clamp(170 + brush * 30)
            # Riveted border
            if x in (0, 15) or y in (0, 15):
                col = lerp_rgb(col, (112, 74, 20), 0.55)
                hv = 110
            # Engraved concentric compass arc
            r = math.hypot(x - 7.5, y - 7.5)
            if abs(r - 4.8) < 0.55 or (x == 7 and 2 <= y <= 13) or (y == 7 and 2 <= x <= 13):
                col = lerp_rgb(col, (255, 240, 170), 0.6)
                emis = 45
                hv = 125
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("gilded_brass", img, mer, hgt)
    block_names.append("gilded_brass")

    # --- 17 & 18. astrolabe_pedestal (dormant) & astrolabe_pedestal_attuned (glowing!) ---
    for attuned in (False, True):
        img = Image.new("RGBA", (16, 16))
        mer = Image.new("RGB", (16, 16))
        hgt = Image.new("L", (16, 16))
        for y in range(16):
            for x in range(16):
                n = fbm_tile(x, y, 16, seed=1010)
                col = lerp_rgb((218, 208, 198), (248, 243, 236), n)
                metal, emis, rough, hv = 0, 0, 130, 155
                # Ornate gold astrolabe rings & bands
                r = math.hypot(x - 7.5, y - 7.5)
                if y in (0, 1, 14, 15) or abs(r - 5.5) < 0.75:
                    col = lerp_rgb((196, 144, 46), (255, 224, 118), 0.5 + 0.5 * n)
                    metal, emis, rough, hv = 240, 130 if attuned else 20, 42, 220
                elif r < 3.4:
                    if attuned:
                        col = lerp_rgb((255, 244, 210), (98, 248, 246), r / 3.4)
                        metal, emis, rough, hv = 60, 255, 20, 245
                    else:
                        col = lerp_rgb((42, 58, 104), (82, 134, 162), 1.0 - r / 3.4)
                        metal, emis, rough, hv = 30, 55, 65, 170
                elif (x in (3, 12) or y in (3, 12)) and attuned:
                    col = (146, 246, 242)
                    emis = 200
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
            col = lerp_rgb((82, 238, 240), (248, 178, 214), swirl)
            if n > 0.78:
                col = lerp_rgb(col, (255, 250, 224), 0.75)
            alpha = clamp(150 + swirl * 65)
            img.putpixel((x, y), (*col, alpha))
            mer.putpixel((x, y), (20, 245, 20))
            hgt.putpixel((x, y), clamp(120 + swirl * 90))
    save_block_pbr("starlight_veil", img, mer, hgt)
    block_names.append("starlight_veil")

    # --- 20. vespera_altar: Deep indigo Starstone & celestial brass boss-summoning altar ---
    img = Image.new("RGBA", (16, 16))
    mer = Image.new("RGB", (16, 16))
    hgt = Image.new("L", (16, 16))
    for y in range(16):
        for x in range(16):
            n = fbm_tile(x, y, 16, seed=1212)
            col = lerp_rgb((28, 24, 62), (56, 46, 104), n)
            metal, emis, rough, hv = 25, 15, 130, 145
            dist = abs(x - 7.5) + abs(y - 7.5)
            if x in (0, 15) or y in (0, 15):
                col = (224, 172, 66)
                metal, emis, rough, hv = 240, 50, 45, 215
            elif 4.0 <= dist <= 5.2:
                col = (242, 198, 96)
                metal, emis, rough, hv = 240, 110, 40, 225
            elif dist < 2.8:
                col = lerp_rgb((255, 232, 255), (224, 116, 255), dist / 2.8)
                metal, emis, rough, hv = 80, 255, 25, 245
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (metal, emis, rough))
            hgt.putpixel((x, y), hv)
    save_block_pbr("vespera_altar", img, mer, hgt)
    block_names.append("vespera_altar")

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

    # 1. tuning_fork — Starlight Tuning Fork (gold prongs + glowing aquamarine resonance spark)
    items["tuning_fork"] = (
        [
            "................",
            "....GG....GG....",
            "...GYG....GYG...",
            "...GDG.CC.GDG...",
            "...GDGCWWCGDG...",
            "...GDG.CC.GDG...",
            "...GDG....GDG...",
            "....GG....GG....",
            ".....GGGGGG.....",
            "......GYYG......",
            ".......GG.......",
            ".......GD.......",
            "......GAAG......",
            "......GDDG......",
            ".......GG.......",
            "................",
        ],
        {
            "G": (222, 168, 56, 255),
            "Y": (255, 232, 134, 255),
            "D": (146, 98, 24, 255),
            "C": (98, 242, 238, 230),
            "W": (245, 255, 255, 255),
            "A": (196, 136, 255, 255),
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

    # 8. solarium_pickaxe — Sleek golden-and-aquamarine celestial pickaxe
    items["solarium_pickaxe"] = (
        [
            "................",
            "....GGGGGG......",
            "...GYYWWYYGG....",
            "..GYC....CYGG...",
            "..GC......CYYG..",
            "..........GGYG..",
            ".........GR.GG..",
            "........GR..GG..",
            ".......GR....G..",
            "......GR........",
            ".....GR.........",
            "....GR..........",
            "...GR...........",
            "..GR............",
            "..G.............",
            "................",
        ],
        {
            "G": (208, 152, 42, 255),
            "Y": (255, 224, 112, 255),
            "W": (255, 250, 218, 255),
            "C": (94, 242, 236, 255),
            "R": (122, 92, 148, 255),
        },
    )

    # 9. starblade — Sovereign's Starblade: radiant cyan-white crystalline blade & gilded winged hilt
    items["starblade"] = (
        [
            "..............WW",
            ".............CWW",
            "............CWWC",
            "...........CWWC.",
            "..........CWWC..",
            ".........CWWC...",
            "........CWWC....",
            ".......CWWC.....",
            "....G.CWWC......",
            "....GGYYC.......",
            ".....GYYGG......",
            "....GRGYYG......",
            "...GRG..GG......",
            "..GRG...........",
            ".GYG............",
            ".GG.............",
        ],
        {
            "W": (244, 255, 255, 255),
            "C": (82, 238, 242, 255),
            "G": (214, 160, 48, 255),
            "Y": (255, 230, 126, 255),
            "R": (110, 74, 144, 255),
        },
    )

    # 10. tide_glider_charm — Winged sea-glass & brass Gale-Prism relic
    items["tide_glider_charm"] = (
        [
            "................",
            ".WW..........WW.",
            ".WCC........CCW.",
            "..WCC..GG..CCW..",
            "..WWCCGYYGCCWW..",
            "...WCCYWWYCCW...",
            "....CCYWWYCC....",
            ".....CGYYGC.....",
            "......GTTG......",
            ".....GTTTTG.....",
            "....GT.TT.TG....",
            "....T..TT..T....",
            ".......TT.......",
            "................",
            "................",
            "................",
        ],
        {
            "W": (240, 255, 255, 255),
            "C": (110, 244, 240, 255),
            "G": (220, 168, 54, 255),
            "Y": (255, 230, 128, 255),
            "T": (248, 166, 198, 255),
        },
    )

    # 11. astral_lyre — Graceful golden celestial harp with glowing light strings
    items["astral_lyre"] = (
        [
            "................",
            "...GG......GG...",
            "..GYYG....GYYG..",
            "..G..GCCCCG..G..",
            "..G..GCWCCG..G..",
            "..G..GCWCCG..G..",
            "...G.GCWCCG.G...",
            "...G.GCWCCG.G....",
            "....GGCWWCGG....",
            ".....GGYYGG.....",
            "......GYYG......",
            ".....GGDDGG.....",
            "....GGGGGGGG....",
            "................",
            "................",
            "................",
        ],
        {
            "G": (214, 162, 48, 255),
            "Y": (255, 232, 134, 255),
            "D": (146, 98, 24, 255),
            "C": (118, 244, 242, 230),
            "W": (244, 255, 255, 255),
        },
    )
    # Fix line length on row 7 of astral_lyre (16 chars)
    items["astral_lyre"][0][7] = "...G.GCWCCG.G..."

    # 12. chronicle_of_auralis — Deep indigo velvet codex with gold astrolabe clasp
    items["chronicle_of_auralis"] = (
        [
            "................",
            "....GGGGGGGG....",
            "...GIIIIIIIIG...",
            "...GIIBBBBIIPG..",
            "...GIBBWWBBIPG..",
            "...GIBWWWWBIPG..",
            "...GIBBWWBBIPG..",
            "...GIIBBBBIIPG..",
            "...GIIIIIIIIG...",
            "...GIIYYYYIIPG..",
            "...GIIIIIIIIG...",
            "...GGGGGGGGGG...",
            "....PPPPPPPP....",
            ".....GGGGGG.....",
            "................",
            "................",
        ],
        {
            "G": (218, 166, 54, 255),
            "Y": (255, 228, 126, 255),
            "I": (38, 34, 86, 255),
            "B": (78, 224, 226, 255),
            "W": (244, 255, 255, 255),
            "P": (244, 236, 222, 255),
        },
    )

    for name, (grid, pal) in items.items():
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
                col = lerp_rgb(base_rgb, accent_rgb or (246, 206, 98), 0.15 + 0.2 * n)
                if y in (y0, y1 - 1) or x in (x0, x1 - 1):
                    col = accent_rgb or (242, 194, 82)
                    m = 235
                    r = 45
            elif pattern == "crystal":
                t = (y - y0) / max(1, (y1 - y0))
                col = lerp_rgb(accent_rgb or (228, 255, 255), base_rgb, t)
                e = clamp(160 + (1 - t) * 90)
                r = 30
            elif pattern == "body":
                col = lerp_rgb(base_rgb, accent_rgb or base_rgb, n * 0.25)
            img.putpixel((x, y), (*col, 255))
            mer.putpixel((x, y), (m, e, r))


def generate_entities():
    # --- 1. lumina_ray (64x64) ---
    # UV layout matching RP/models/entity/lumina_ray.geo.json:
    # body: uv [0,0], size [14,4,16] -> 60x20
    # wing_l: uv [0,22], size [14,2,12] -> 52x14
    # wing_r: uv [0,38], size [14,2,12] -> 52x14
    # tail_1 / tail_2: uv [0,52], size [2,2,10] -> 24x12
    # eyes/crest: uv [30,52], size [6,2,6]
    img = Image.new("RGBA", (64, 64), (24, 46, 86, 255))
    mer = Image.new("RGB", (64, 64), (10, 40, 110))
    paint_box_uv(img, mer, 0, 0, 14, 4, 16, (34, 128, 162), (96, 240, 236), emis=70, rough=70, pattern="body")
    # Glowing dorsal spine pattern on top face of body (u+d .. u+d+w, v .. v+d -> x:16..30, y:0..16)
    for y in range(2, 14):
        for x in range(21, 25):
            img.putpixel((x, y), (144, 252, 248, 255))
            mer.putpixel((x, y), (40, 225, 35))
        if y in (4, 8, 12):
            for x in range(18, 28):
                img.putpixel((x, y), (255, 220, 124, 255))
                mer.putpixel((x, y), (220, 195, 40))
    # Glowing eyes on front face of body (x:16..30, y:16..20)
    for ex in (18, 19, 26, 27):
        for ey in (17, 18):
            img.putpixel((ex, ey), (255, 238, 142, 255))
            mer.putpixel((ex, ey), (120, 255, 20))
    paint_box_uv(img, mer, 0, 22, 14, 2, 12, (46, 178, 196), (252, 206, 142), emis=110, rough=65, pattern="wing")
    paint_box_uv(img, mer, 0, 38, 14, 2, 12, (46, 178, 196), (252, 206, 142), emis=110, rough=65, pattern="wing")
    paint_box_uv(img, mer, 0, 52, 2, 2, 10, (108, 244, 240), (255, 226, 148), emis=185, rough=45, pattern="wing")
    paint_box_uv(img, mer, 28, 52, 6, 2, 6, (242, 196, 92), (255, 242, 182), emis=160, metal=220, rough=40, pattern="gilded")
    save_entity_pbr("lumina_ray", img, mer)

    # --- 2. choir_wisp (64x64) ---
    # bell hood: uv [0,0], size [8,8,8] -> 32x16
    # core heart: uv [0,18], size [4,4,4] -> 16x8
    # petals (4): uv [0,28], size [2,4,2] -> 8x6
    # halo ring: uv [16,28], size [10,1,2] -> 24x3
    img = Image.new("RGBA", (64, 64), (240, 234, 224, 255))
    mer = Image.new("RGB", (64, 64), (20, 45, 110))
    paint_box_uv(img, mer, 0, 0, 8, 8, 8, (244, 236, 226), (242, 196, 96), emis=35, rough=95, pattern="gilded")
    # Cute luminous eyes on front of bell hood (x:8..16, y:8..16)
    for ex in (10, 13):
        img.putpixel((ex, 11), (104, 246, 244, 255))
        img.putpixel((ex, 12), (240, 255, 255, 255))
        mer.putpixel((ex, 11), (20, 255, 25))
        mer.putpixel((ex, 12), (20, 255, 25))
    paint_box_uv(img, mer, 0, 18, 4, 4, 4, (255, 186, 206), (255, 244, 204), emis=255, rough=25, pattern="crystal")
    paint_box_uv(img, mer, 0, 28, 2, 4, 2, (98, 242, 238), (222, 184, 255), emis=210, rough=35, pattern="crystal")
    paint_box_uv(img, mer, 16, 28, 10, 1, 2, (248, 208, 102), (255, 244, 184), emis=165, metal=235, rough=35, pattern="gilded")
    save_entity_pbr("choir_wisp", img, mer)

    # --- 3. glass_crab (64x64) ---
    # shell: uv [0,0], size [10,5,8] -> 36x13
    # crystal spire: uv [0,15], size [4,7,4] -> 16x11
    # claws: uv [20,15], size [4,3,5] -> 18x8
    # legs: uv [0,28], size [5,2,2] -> 14x4
    img = Image.new("RGBA", (64, 64), (226, 218, 208, 255))
    mer = Image.new("RGB", (64, 64), (20, 20, 120))
    paint_box_uv(img, mer, 0, 0, 10, 5, 8, (236, 226, 212), (110, 224, 220), emis=25, rough=95, pattern="gilded")
    # Crab eyes on front (x:8..18, y:8..13)
    for ex in (10, 15):
        img.putpixel((ex, 9), (32, 34, 68, 255))
        img.putpixel((ex, 10), (128, 252, 248, 255))
        mer.putpixel((ex, 10), (0, 245, 30))
    paint_box_uv(img, mer, 0, 15, 4, 7, 4, (68, 228, 230), (224, 184, 255), emis=220, rough=28, pattern="crystal")
    paint_box_uv(img, mer, 20, 15, 4, 3, 5, (232, 182, 74), (118, 242, 236), emis=80, metal=180, rough=55, pattern="gilded")
    paint_box_uv(img, mer, 0, 28, 5, 2, 2, (198, 188, 178), (228, 186, 98), emis=15, rough=115, pattern="body")
    save_entity_pbr("glass_crab", img, mer)

    # --- 4. gilded_sentinel (64x64) ---
    # torso: uv [0,0], size [10,14,8] -> 36x22
    # head: uv [0,24], size [8,8,8] -> 32x16
    # arms/gauntlets: uv [38,0], size [5,12,5] -> 20x17
    # core: uv [34,24], size [6,6,6] -> 24x12
    # halo: uv [0,42], size [12,2,2] -> 28x4
    img = Image.new("RGBA", (64, 64), (234, 226, 214, 255))
    mer = Image.new("RGB", (64, 64), (120, 20, 90))
    paint_box_uv(img, mer, 0, 0, 10, 14, 8, (238, 230, 218), (232, 184, 72), emis=20, metal=60, rough=105, pattern="gilded")
    paint_box_uv(img, mer, 0, 24, 8, 8, 8, (240, 232, 222), (236, 188, 76), emis=20, metal=80, rough=95, pattern="gilded")
    # Faceless glowing diamond visor slit on head front (x:8..16, y:32..40)
    for y in range(34, 38):
        for x in range(9, 15):
            if abs(x - 11.5) + abs(y - 35.5) <= 2.5:
                img.putpixel((x, y), (94, 248, 248, 255))
                mer.putpixel((x, y), (40, 255, 20))
    paint_box_uv(img, mer, 38, 0, 5, 12, 5, (226, 174, 64), (255, 228, 128), emis=45, metal=235, rough=45, pattern="gilded")
    paint_box_uv(img, mer, 34, 24, 6, 6, 6, (92, 244, 246), (222, 154, 255), emis=255, rough=20, pattern="crystal")
    paint_box_uv(img, mer, 0, 42, 12, 2, 2, (246, 204, 96), (255, 244, 188), emis=185, metal=240, rough=35, pattern="gilded")
    save_entity_pbr("gilded_sentinel", img, mer)

    # --- 5. astral_seraph (128x128) — Majestic Boss Texture ---
    # torso: uv [0,0], size [16,22,12] -> 56x34
    # head: uv [0,36], size [12,12,12] -> 48x24
    # wings (3 pairs): uv [0,64], size [24,8,2] -> 52x10, uv [0,78], size [20,7,2], uv [0,90], size [16,6,2]
    # halo rings: uv [60,0], size [24,2,2] -> 52x4
    # star heart: uv [60,10], size [10,10,10] -> 40x20
    # robe/tail: uv [60,34], size [14,18,10] -> 48x28
    # gauntlets: uv [60,64], size [6,16,6] -> 24x22
    img = Image.new("RGBA", (128, 128), (242, 236, 226, 255))
    mer = Image.new("RGB", (128, 128), (90, 30, 85))
    paint_box_uv(img, mer, 0, 0, 16, 22, 12, (244, 238, 228), (242, 192, 78), emis=30, metal=100, rough=85, pattern="gilded")
    paint_box_uv(img, mer, 0, 36, 12, 12, 12, (246, 240, 232), (248, 204, 94), emis=40, metal=130, rough=75, pattern="gilded")
    # Radiant star crown & diamond visor on Seraph face (x:12..24, y:48..60)
    for y in range(51, 57):
        for x in range(14, 22):
            if abs(x - 17.5) + abs(y - 53.5) <= 3.2:
                img.putpixel((x, y), (255, 240, 168, 255))
                mer.putpixel((x, y), (120, 255, 20))
    # Triple luminous feathered crystal wings (turquoise -> rose-gold -> radiant gold!)
    paint_box_uv(img, mer, 0, 64, 24, 8, 2, (98, 244, 240), (255, 214, 152), emis=210, rough=35, pattern="wing")
    paint_box_uv(img, mer, 0, 78, 20, 7, 2, (244, 146, 198), (255, 226, 142), emis=205, rough=35, pattern="wing")
    paint_box_uv(img, mer, 0, 90, 16, 6, 2, (164, 156, 255), (122, 248, 244), emis=200, rough=35, pattern="wing")
    # Astrolabe halo rings (pure radiant gold)
    paint_box_uv(img, mer, 60, 0, 24, 2, 2, (252, 206, 86), (255, 246, 192), emis=225, metal=245, rough=30, pattern="gilded")
    # Star-heart core (blazing violet-gold-cyan)
    paint_box_uv(img, mer, 60, 10, 10, 10, 10, (255, 232, 162), (232, 128, 255), emis=255, rough=18, pattern="crystal")
    # Floating lower alabaster & indigo celestial vestments
    paint_box_uv(img, mer, 60, 34, 14, 18, 10, (44, 42, 98), (242, 196, 86), emis=55, metal=80, rough=95, pattern="gilded")
    # Gilded gauntlets
    paint_box_uv(img, mer, 60, 64, 6, 16, 6, (238, 188, 74), (126, 246, 242), emis=85, metal=230, rough=40, pattern="gilded")
    save_entity_pbr("astral_seraph", img, mer)

    # --- 6. astral_bolt (32x32) ---
    img = Image.new("RGBA", (32, 32), (122, 244, 246, 255))
    mer = Image.new("RGB", (32, 32), (40, 255, 20))
    paint_box_uv(img, mer, 0, 0, 4, 4, 4, (132, 248, 248), (246, 158, 255), emis=255, rough=18, pattern="crystal")
    save_entity_pbr("astral_bolt", img, mer)


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
    print(f"Generated {len(block_names)} PBR blocks, {len(item_names)} items, 6 PBR entities, 1 particle atlas, and pack_icon.png!")


if __name__ == "__main__":
    main()
