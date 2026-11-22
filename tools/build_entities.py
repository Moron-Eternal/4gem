#!/usr/bin/env python3
"""
Generates all 10 Custom Entities for Auralis: The Prism-Tide Firmament (v2 Overhaul):
  1. auralis:lumina_ray       (Serene Celestial Sky-Manta — passive smooth glider)
  2. auralis:choir_wisp       (Porcelain & Gold Singing Lantern Spirit — friendly hoverer)
  3. auralis:glass_crab       (Crystalline Sea-Glass Reef Crustacean — neutral defender)
  4. auralis:nimbus_stag      (Celestial Cloud-Deer — NEW passive meadow & cloud roamer!)
  5. auralis:tide_jelly       (Aurelia Cloud-Jelly — NEW serene pulsing sky-jellyfish!)
  6. auralis:shard_stalker    (Crystalline Twilight Lynx — NEW aggressive ground prowler!)
  7. auralis:astral_weaver    (Cloaked Twilight Caster — NEW aggressive hovering ruin mage!)
  8. auralis:gilded_sentinel  (Floating Alabaster & Brass Temple Guardian — controlled hover combat)
  9. auralis:astral_seraph    (Sovereign of the Glass Tide — Sculpted 24-Bone 3-Phase Boss!)
 10. auralis:astral_bolt      (Glowing Celestial Energy Projectile)

Strictly uses full `query.*` Molang syntax in all 1.8.0 animations and 1.10.0 controllers,
client-synced Entity Properties for multi-state animations, head look-at-target tracking,
and Allay/Blaze-proven smooth hovering AI (zero erratic float_wander!).
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BP = ROOT / "packs" / "BP"
RP = ROOT / "packs" / "RP"


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


# =============================================================================
# 1. RENDER CONTROLLER
# =============================================================================

def build_render_controller():
    rc = {
        "format_version": "1.8.0",
        "render_controllers": {
            "controller.render.auralis_entity": {
                "geometry": "Geometry.default",
                "materials": [{"*": "Material.default"}],
                "textures": ["Texture.default"],
            }
        },
    }
    write_json(RP / "render_controllers" / "auralis_entity.render_controllers.json", rc)


# =============================================================================
# 2. CUSTOM 3D ENTITY GEOMETRIES (All facing -Z North, 1:1 UV-synced!)
# =============================================================================

def build_geometries():
    # --- 1. lumina_ray (64x64) ---
    write_json(RP / "models/entity/lumina_ray.geo.json", {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.auralis_lumina_ray",
                    "texture_width": 64,
                    "texture_height": 64,
                    "visible_bounds_width": 4.5,
                    "visible_bounds_height": 2.2,
                    "visible_bounds_offset": [0, 0.5, 0],
                },
                "bones": [
                    {
                        "name": "root",
                        "pivot": [0, 6, 0],
                        "cubes": [
                            {"origin": [-7, 4, -8], "size": [14, 4, 16], "uv": [0, 0]},
                            {"origin": [-3, 7, -5], "size": [6, 2, 6], "uv": [28, 52]},
                        ],
                    },
                    {
                        "name": "wing_l",
                        "parent": "root",
                        "pivot": [7, 6, -1],
                        "cubes": [{"origin": [7, 5, -6], "size": [14, 2, 12], "uv": [0, 22]}],
                    },
                    {
                        "name": "wing_l_tip",
                        "parent": "wing_l",
                        "pivot": [21, 6, 0],
                        "cubes": [{"origin": [21, 5.5, -4], "size": [8, 1, 8], "uv": [0, 22]}],
                    },
                    {
                        "name": "wing_r",
                        "parent": "root",
                        "pivot": [-7, 6, -1],
                        "cubes": [{"origin": [-21, 5, -6], "size": [14, 2, 12], "uv": [0, 38]}],
                    },
                    {
                        "name": "wing_r_tip",
                        "parent": "wing_r",
                        "pivot": [-21, 6, 0],
                        "cubes": [{"origin": [-29, 5.5, -4], "size": [8, 1, 8], "uv": [0, 38]}],
                    },
                    {
                        "name": "horn_l",
                        "parent": "root",
                        "pivot": [4.5, 5.5, -8],
                        "rotation": [0, -10, 6],
                        "cubes": [{"origin": [3.5, 4.7, -12.8], "size": [2, 1.5, 5], "uv": [28, 52]}],
                    },
                    {
                        "name": "horn_r",
                        "parent": "root",
                        "pivot": [-4.5, 5.5, -8],
                        "rotation": [0, 10, -6],
                        "cubes": [{"origin": [-5.5, 4.7, -12.8], "size": [2, 1.5, 5], "uv": [28, 52]}],
                    },
                    {
                        "name": "tail_1",
                        "parent": "root",
                        "pivot": [0, 6, 8],
                        "cubes": [{"origin": [-1, 5, 8], "size": [2, 2, 10], "uv": [0, 52]}],
                    },
                    {
                        "name": "tail_2",
                        "parent": "tail_1",
                        "pivot": [0, 6, 18],
                        "cubes": [{"origin": [-0.5, 5.5, 18], "size": [1, 1, 10], "uv": [0, 52]}],
                    },
                ],
            }
        ],
    })

    # --- 2. choir_wisp (64x64) ---
    write_json(RP / "models/entity/choir_wisp.geo.json", {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.auralis_choir_wisp",
                    "texture_width": 64,
                    "texture_height": 64,
                    "visible_bounds_width": 2.0,
                    "visible_bounds_height": 2.0,
                    "visible_bounds_offset": [0, 0.75, 0],
                },
                "bones": [
                    {
                        "name": "body",
                        "pivot": [0, 10, 0],
                        "cubes": [
                            {"origin": [-4, 8, -4], "size": [8, 8, 8], "uv": [0, 0]},
                            {"origin": [-2, 4, -2], "size": [4, 4, 4], "uv": [0, 18]},
                        ],
                    },
                    {
                        "name": "halo",
                        "parent": "body",
                        "pivot": [0, 18, 0],
                        "cubes": [
                            {"origin": [-5, 17.5, -5], "size": [10, 1, 2], "uv": [16, 28]},
                            {"origin": [-5, 17.5, 3], "size": [10, 1, 2], "uv": [16, 28]},
                            {"origin": [-5, 17.5, -3], "size": [2, 1, 6], "uv": [16, 28]},
                            {"origin": [3, 17.5, -3], "size": [2, 1, 6], "uv": [16, 28]},
                        ],
                    },
                    {
                        "name": "petals",
                        "parent": "body",
                        "pivot": [0, 9, 0],
                        "cubes": [
                            {"origin": [6, 7, -1], "size": [2, 4, 2], "uv": [0, 28]},
                            {"origin": [-8, 7, -1], "size": [2, 4, 2], "uv": [0, 28]},
                            {"origin": [-1, 7, 6], "size": [2, 4, 2], "uv": [0, 28]},
                            {"origin": [-1, 7, -8], "size": [2, 4, 2], "uv": [0, 28]},
                        ],
                    },
                ],
            }
        ],
    })

    # --- 3. glass_crab (64x64) ---
    write_json(RP / "models/entity/glass_crab.geo.json", {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.auralis_glass_crab",
                    "texture_width": 64,
                    "texture_height": 64,
                    "visible_bounds_width": 2.0,
                    "visible_bounds_height": 2.0,
                    "visible_bounds_offset": [0, 0.5, 0],
                },
                "bones": [
                    {
                        "name": "body",
                        "pivot": [0, 4, 0],
                        "cubes": [
                            {"origin": [-5, 2, -4], "size": [10, 5, 8], "uv": [0, 0]},
                            {"origin": [-2, 7, -2], "size": [4, 7, 4], "uv": [0, 15]},
                            {"origin": [1.5, 7, -1], "size": [2.5, 5, 2.5], "rotation": [12, 15, 18], "pivot": [2, 7, 0], "uv": [0, 15]},
                            {"origin": [-4, 7, -1], "size": [2.5, 4.5, 2.5], "rotation": [-10, -20, -18], "pivot": [-2, 7, 0], "uv": [0, 15]},
                        ],
                    },
                    {
                        "name": "claw_l",
                        "parent": "body",
                        "pivot": [5, 4, -4],
                        "cubes": [{"origin": [3, 2.5, -9], "size": [4, 3, 5], "uv": [20, 15]}],
                    },
                    {
                        "name": "claw_r",
                        "parent": "body",
                        "pivot": [-5, 4, -4],
                        "cubes": [{"origin": [-7, 2.5, -9], "size": [4, 3, 5], "uv": [20, 15]}],
                    },
                    {
                        "name": "legs_l",
                        "parent": "body",
                        "pivot": [5, 3, 0],
                        "cubes": [
                            {"origin": [5, 0, -3], "size": [5, 2, 2], "uv": [0, 28]},
                            {"origin": [5, 0, 0], "size": [5, 2, 2], "uv": [0, 28]},
                            {"origin": [5, 0, 3], "size": [5, 2, 2], "uv": [0, 28]},
                        ],
                    },
                    {
                        "name": "legs_r",
                        "parent": "body",
                        "pivot": [-5, 3, 0],
                        "cubes": [
                            {"origin": [-10, 0, -3], "size": [5, 2, 2], "uv": [0, 28]},
                            {"origin": [-10, 0, 0], "size": [5, 2, 2], "uv": [0, 28]},
                            {"origin": [-10, 0, 3], "size": [5, 2, 2], "uv": [0, 28]},
                        ],
                    },
                ],
            }
        ],
    })

    # --- 4. gilded_sentinel (64x64) ---
    write_json(RP / "models/entity/gilded_sentinel.geo.json", {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.auralis_gilded_sentinel",
                    "texture_width": 64,
                    "texture_height": 64,
                    "visible_bounds_width": 2.5,
                    "visible_bounds_height": 3.0,
                    "visible_bounds_offset": [0, 1.4, 0],
                },
                "bones": [
                    {
                        "name": "body",
                        "pivot": [0, 18, 0],
                        "cubes": [{"origin": [-5, 14, -4], "size": [10, 14, 8], "uv": [0, 0]}],
                    },
                    {
                        "name": "core",
                        "parent": "body",
                        "pivot": [0, 10, 0],
                        "rotation": [45, 45, 0],
                        "cubes": [{"origin": [-3, 7, -3], "size": [6, 6, 6], "uv": [34, 24]}],
                    },
                    {
                        "name": "head",
                        "parent": "body",
                        "pivot": [0, 29, 0],
                        "cubes": [{"origin": [-4, 29, -4], "size": [8, 8, 8], "uv": [0, 24]}],
                    },
                    {
                        "name": "halo",
                        "parent": "head",
                        "pivot": [0, 39, 0],
                        "cubes": [
                            {"origin": [-6, 38, -6], "size": [12, 2, 2], "uv": [0, 42]},
                            {"origin": [-6, 38, 4], "size": [12, 2, 2], "uv": [0, 42]},
                            {"origin": [-6, 38, -4], "size": [2, 2, 8], "uv": [0, 42]},
                            {"origin": [4, 38, -4], "size": [2, 2, 8], "uv": [0, 42]},
                        ],
                    },
                    {
                        "name": "arm_l",
                        "parent": "body",
                        "pivot": [8, 25, 0],
                        "cubes": [{"origin": [7, 14, -2.5], "size": [5, 12, 5], "uv": [38, 0]}],
                    },
                    {
                        "name": "arm_r",
                        "parent": "body",
                        "pivot": [-8, 25, 0],
                        "cubes": [{"origin": [-12, 14, -2.5], "size": [5, 12, 5], "uv": [38, 0]}],
                    },
                ],
            }
        ],
    })

    # --- 5. astral_seraph (128x128) — Sculpted 24-Bone Sovereign Boss Model! ---
    write_json(RP / "models/entity/astral_seraph.geo.json", {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.auralis_astral_seraph",
                    "texture_width": 128,
                    "texture_height": 128,
                    "visible_bounds_width": 7.5,
                    "visible_bounds_height": 6.5,
                    "visible_bounds_offset": [0, 2.8, 0],
                },
                "bones": [
                    {
                        "name": "root",
                        "pivot": [0, 32, 0],
                    },
                    {
                        "name": "torso",
                        "parent": "root",
                        "pivot": [0, 34, 0],
                        "cubes": [
                            {"origin": [-7, 28, -5], "size": [14, 18, 10], "uv": [0, 0]},
                            {"origin": [-5, 22, -4], "size": [10, 6, 8], "uv": [48, 0]},
                        ],
                    },
                    {
                        "name": "star_heart",
                        "parent": "torso",
                        "pivot": [0, 38, -6.5],
                        "rotation": [45, 45, 0],
                        "cubes": [
                            {"origin": [-3, 35, -9.5], "size": [6, 6, 6], "uv": [42, 40]},
                        ],
                    },
                    {
                        "name": "head",
                        "parent": "torso",
                        "pivot": [0, 47, 0],
                        "cubes": [
                            {"origin": [-5, 47, -5], "size": [10, 10, 10], "uv": [0, 30]},
                        ],
                    },
                    {
                        "name": "crown",
                        "parent": "head",
                        "pivot": [0, 57, -1],
                        "cubes": [
                            # Sculpted rising twin-fin celestial diadem + central spire
                            {"origin": [-6, 56, -4], "size": [12, 3, 2], "uv": [42, 30]},
                            {"origin": [-2, 59, -4], "size": [4, 5, 2], "uv": [42, 30]},
                            {"origin": [4, 58, -3], "size": [3, 6, 2], "rotation": [0, 0, 22], "pivot": [5, 58, -2], "uv": [42, 30]},
                            {"origin": [-7, 58, -3], "size": [3, 6, 2], "rotation": [0, 0, -22], "pivot": [-5, 58, -2], "uv": [42, 30]},
                        ],
                    },
                    # Articulated flowing split celestial robe ribbons!
                    {
                        "name": "robe_front",
                        "parent": "torso",
                        "pivot": [0, 22, -4],
                        "cubes": [{"origin": [-4, 4, -5], "size": [8, 18, 2], "uv": [70, 34]}],
                    },
                    {
                        "name": "robe_back",
                        "parent": "torso",
                        "pivot": [0, 22, 4],
                        "cubes": [{"origin": [-4, 2, 3], "size": [8, 20, 2], "uv": [70, 34]}],
                    },
                    {
                        "name": "robe_l",
                        "parent": "torso",
                        "pivot": [5, 22, 0],
                        "rotation": [0, 90, 0],
                        "cubes": [{"origin": [1, 4, -1], "size": [8, 18, 2], "uv": [70, 34]}],
                    },
                    {
                        "name": "robe_r",
                        "parent": "torso",
                        "pivot": [-5, 22, 0],
                        "rotation": [0, -90, 0],
                        "cubes": [{"origin": [-9, 4, -1], "size": [8, 18, 2], "uv": [70, 34]}],
                    },
                    # Ornate Shoulder Pauldrons & Articulated Arms + Radiant Astral Halberd!
                    {
                        "name": "pauldron_l",
                        "parent": "torso",
                        "pivot": [8, 44, 0],
                        "rotation": [0, 0, -14],
                        "cubes": [{"origin": [6, 41, -4], "size": [7, 6, 8], "uv": [86, 0]}],
                    },
                    {
                        "name": "arm_l",
                        "parent": "torso",
                        "pivot": [10, 42, 0],
                        "cubes": [{"origin": [8, 32, -2.5], "size": [5, 10, 5], "uv": [86, 16]}],
                    },
                    {
                        "name": "forearm_l",
                        "parent": "arm_l",
                        "pivot": [10.5, 32, 0],
                        "cubes": [{"origin": [8, 22, -2.5], "size": [5, 10, 5], "uv": [106, 16]}],
                    },
                    {
                        "name": "pauldron_r",
                        "parent": "torso",
                        "pivot": [-8, 44, 0],
                        "rotation": [0, 0, 14],
                        "cubes": [{"origin": [-13, 41, -4], "size": [7, 6, 8], "uv": [86, 0]}],
                    },
                    {
                        "name": "arm_r",
                        "parent": "torso",
                        "pivot": [-10, 42, 0],
                        "cubes": [{"origin": [-13, 32, -2.5], "size": [5, 10, 5], "uv": [86, 16]}],
                    },
                    {
                        "name": "forearm_r",
                        "parent": "arm_r",
                        "pivot": [-10.5, 32, 0],
                        "cubes": [{"origin": [-13, 22, -2.5], "size": [5, 10, 5], "uv": [106, 16]}],
                    },
                    {
                        "name": "scepter",
                        "parent": "forearm_r",
                        "pivot": [-10.5, 24, -2],
                        "rotation": [78, 0, 0],
                        "cubes": [
                            {"origin": [-11.5, 14, -3], "size": [2, 30, 2], "uv": [94, 34]},
                            {"origin": [-13.5, 42, -3], "size": [6, 12, 2], "uv": [104, 34]},
                            {"origin": [-12, 40, -3.5], "size": [3, 3, 3], "uv": [70, 56]},
                        ],
                    },
                    # Twin Jeweled Astrolabe Halos behind torso!
                    {
                        "name": "halo_outer",
                        "parent": "torso",
                        "pivot": [0, 44, 6],
                        "cubes": [
                            {"origin": [-15, 58, 5], "size": [30, 2, 2], "uv": [0, 54]},
                            {"origin": [-15, 28, 5], "size": [30, 2, 2], "uv": [0, 54]},
                            {"origin": [-15, 30, 5], "size": [2, 28, 2], "uv": [0, 54]},
                            {"origin": [13, 30, 5], "size": [2, 28, 2], "uv": [0, 54]},
                            # 4 Cardinal glowing astrolabe gems
                            {"origin": [-1.5, 59, 4.5], "size": [3, 3, 3], "uv": [70, 56]},
                            {"origin": [-1.5, 26, 4.5], "size": [3, 3, 3], "uv": [70, 56]},
                            {"origin": [-17, 42.5, 4.5], "size": [3, 3, 3], "uv": [70, 56]},
                            {"origin": [14, 42.5, 4.5], "size": [3, 3, 3], "uv": [70, 56]},
                        ],
                    },
                    {
                        "name": "halo_inner",
                        "parent": "torso",
                        "pivot": [0, 44, 6],
                        "rotation": [0, 0, 45],
                        "cubes": [
                            {"origin": [-11, 54, 5], "size": [22, 2, 2], "uv": [0, 54]},
                            {"origin": [-11, 32, 5], "size": [22, 2, 2], "uv": [0, 54]},
                            {"origin": [-11, 34, 5], "size": [2, 20, 2], "uv": [0, 54]},
                            {"origin": [9, 34, 5], "size": [2, 20, 2], "uv": [0, 54]},
                        ],
                    },
                    # Three Multi-Segment Articulated Feathered Wing Pairs!
                    {
                        "name": "wing_top_l",
                        "parent": "torso",
                        "pivot": [7, 45, 5],
                        "rotation": [0, -14, -18],
                        "cubes": [{"origin": [7, 41, 4], "size": [18, 8, 2], "uv": [0, 62]}],
                    },
                    {
                        "name": "wing_top_l_tip",
                        "parent": "wing_top_l",
                        "pivot": [25, 45, 5],
                        "rotation": [0, -8, -8],
                        "cubes": [{"origin": [25, 42, 4.5], "size": [14, 6, 1], "uv": [42, 62]}],
                    },
                    {
                        "name": "wing_top_r",
                        "parent": "torso",
                        "pivot": [-7, 45, 5],
                        "rotation": [0, 14, 18],
                        "cubes": [{"origin": [-25, 41, 4], "size": [18, 8, 2], "uv": [0, 62]}],
                    },
                    {
                        "name": "wing_top_r_tip",
                        "parent": "wing_top_r",
                        "pivot": [-25, 45, 5],
                        "rotation": [0, 8, 8],
                        "cubes": [{"origin": [-39, 42, 4.5], "size": [14, 6, 1], "uv": [42, 62]}],
                    },
                    {
                        "name": "wing_mid_l",
                        "parent": "torso",
                        "pivot": [7, 37, 5.5],
                        "rotation": [0, -20, 4],
                        "cubes": [{"origin": [7, 33.5, 4.5], "size": [16, 7, 2], "uv": [0, 76]}],
                    },
                    {
                        "name": "wing_mid_l_tip",
                        "parent": "wing_mid_l",
                        "pivot": [23, 37, 5.5],
                        "rotation": [0, -8, 6],
                        "cubes": [{"origin": [23, 34.5, 5], "size": [12, 5, 1], "uv": [38, 76]}],
                    },
                    {
                        "name": "wing_mid_r",
                        "parent": "torso",
                        "pivot": [-7, 37, 5.5],
                        "rotation": [0, 20, -4],
                        "cubes": [{"origin": [-23, 33.5, 4.5], "size": [16, 7, 2], "uv": [0, 76]}],
                    },
                    {
                        "name": "wing_mid_r_tip",
                        "parent": "wing_mid_r",
                        "pivot": [-23, 37, 5.5],
                        "rotation": [0, 8, -6],
                        "cubes": [{"origin": [-35, 34.5, 5], "size": [12, 5, 1], "uv": [38, 76]}],
                    },
                    {
                        "name": "wing_low_l",
                        "parent": "torso",
                        "pivot": [6, 29, 5.5],
                        "rotation": [0, -24, 24],
                        "cubes": [{"origin": [6, 26, 4.5], "size": [18, 6, 2], "uv": [0, 88]}],
                    },
                    {
                        "name": "wing_low_r",
                        "parent": "torso",
                        "pivot": [-6, 29, 5.5],
                        "rotation": [0, 24, -24],
                        "cubes": [{"origin": [-24, 26, 4.5], "size": [18, 6, 2], "uv": [0, 88]}],
                    },
                ],
            }
        ],
    })

    # --- 6. astral_bolt (32x32) ---
    write_json(RP / "models/entity/astral_bolt.geo.json", {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.auralis_astral_bolt",
                    "texture_width": 32,
                    "texture_height": 32,
                    "visible_bounds_width": 1.0,
                    "visible_bounds_height": 1.0,
                    "visible_bounds_offset": [0, 0.25, 0],
                },
                "bones": [
                    {
                        "name": "bolt",
                        "pivot": [0, 4, 0],
                        "rotation": [45, 45, 0],
                        "cubes": [{"origin": [-2.5, 1.5, -2.5], "size": [5, 5, 5], "uv": [0, 0]}],
                    }
                ],
            }
        ],
    })

    # --- 7. nimbus_stag (64x64) — Graceful Celestial Cloud-Deer ---
    write_json(RP / "models/entity/nimbus_stag.geo.json", {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.auralis_nimbus_stag",
                    "texture_width": 64,
                    "texture_height": 64,
                    "visible_bounds_width": 2.6,
                    "visible_bounds_height": 2.8,
                    "visible_bounds_offset": [0, 1.2, 0],
                },
                "bones": [
                    {
                        "name": "body",
                        "pivot": [0, 14, 0],
                        "cubes": [{"origin": [-5, 11, -9], "size": [10, 9, 18], "uv": [0, 0]}],
                    },
                    {
                        "name": "neck",
                        "parent": "body",
                        "pivot": [0, 18, -7],
                        "rotation": [22, 0, 0],
                        "cubes": [{"origin": [-2.5, 17, -9.5], "size": [5, 9, 5], "uv": [0, 28]}],
                    },
                    {
                        "name": "head",
                        "parent": "neck",
                        "pivot": [0, 25, -8],
                        "rotation": [-22, 0, 0],
                        "cubes": [
                            {"origin": [-3, 23, -15], "size": [6, 6, 9], "uv": [22, 28]},
                            # Branching Crystalline Antlers!
                            {"origin": [1.5, 29, -9], "size": [1.5, 7, 1.5], "rotation": [-12, 0, 22], "pivot": [2, 29, -8.5], "uv": [54, 28]},
                            {"origin": [3.5, 33, -10], "size": [1.2, 5, 1.2], "rotation": [-22, 0, 42], "pivot": [4, 33, -9.5], "uv": [54, 28]},
                            {"origin": [-3, 29, -9], "size": [1.5, 7, 1.5], "rotation": [-12, 0, -22], "pivot": [-2, 29, -8.5], "uv": [54, 28]},
                            {"origin": [-4.7, 33, -10], "size": [1.2, 5, 1.2], "rotation": [-22, 0, -42], "pivot": [-4, 33, -9.5], "uv": [54, 28]},
                        ],
                    },
                    {
                        "name": "ear_l",
                        "parent": "head",
                        "pivot": [3, 27, -7.5],
                        "rotation": [0, 0, 24],
                        "cubes": [{"origin": [3, 27, -8], "size": [2, 3, 1], "uv": [0, 28]}],
                    },
                    {
                        "name": "ear_r",
                        "parent": "head",
                        "pivot": [-3, 27, -7.5],
                        "rotation": [0, 0, -24],
                        "cubes": [{"origin": [-5, 27, -8], "size": [2, 3, 1], "uv": [0, 28]}],
                    },
                    {
                        "name": "leg_fl",
                        "parent": "body",
                        "pivot": [3, 12, -6],
                        "cubes": [{"origin": [1.5, 0, -7.5], "size": [3, 12, 3], "uv": [0, 44]}],
                    },
                    {
                        "name": "leg_fr",
                        "parent": "body",
                        "pivot": [-3, 12, -6],
                        "cubes": [{"origin": [-4.5, 0, -7.5], "size": [3, 12, 3], "uv": [0, 44]}],
                    },
                    {
                        "name": "leg_bl",
                        "parent": "body",
                        "pivot": [3, 12, 6],
                        "cubes": [{"origin": [1.5, 0, 4.5], "size": [3, 12, 3], "uv": [0, 44]}],
                    },
                    {
                        "name": "leg_br",
                        "parent": "body",
                        "pivot": [-3, 12, 6],
                        "cubes": [{"origin": [-4.5, 0, 4.5], "size": [3, 12, 3], "uv": [0, 44]}],
                    },
                    {
                        "name": "tail",
                        "parent": "body",
                        "pivot": [0, 17, 9],
                        "rotation": [-18, 0, 0],
                        "cubes": [{"origin": [-1.5, 15.5, 8.5], "size": [3, 3, 4], "uv": [16, 44]}],
                    },
                ],
            }
        ],
    })

    # --- 8. tide_jelly (64x64) — Serene Aurelia Cloud-Jellyfish ---
    tentacle_coords = [(3, -3), (-3, -3), (4, 1), (-4, 1), (2, 4), (-2, 4)]
    jelly_bones = [
        {
            "name": "bell",
            "pivot": [0, 16, 0],
            "cubes": [
                {"origin": [-6, 12, -6], "size": [12, 8, 12], "uv": [0, 0]},
                {"origin": [-4, 20, -4], "size": [8, 3, 8], "uv": [0, 22]},
            ],
        },
        {
            "name": "core",
            "parent": "bell",
            "pivot": [0, 14, 0],
            "cubes": [{"origin": [-2.5, 11.5, -2.5], "size": [5, 5, 5], "uv": [34, 22]}],
        },
    ]
    for i, (tx, tz) in enumerate(tentacle_coords, start=1):
        jelly_bones.append({
            "name": f"tentacle_{i}",
            "parent": "bell",
            "pivot": [tx, 12, tz],
            "cubes": [{"origin": [tx - 1, 4, tz - 1], "size": [2, 8, 2], "uv": [0, 36]}],
        })
        jelly_bones.append({
            "name": f"tentacle_{i}_tip",
            "parent": f"tentacle_{i}",
            "pivot": [tx, 4, tz],
            "cubes": [{"origin": [tx - 0.5, -3, tz - 0.5], "size": [1, 7, 1], "uv": [12, 36]}],
        })
    write_json(RP / "models/entity/tide_jelly.geo.json", {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.auralis_tide_jelly",
                    "texture_width": 64,
                    "texture_height": 64,
                    "visible_bounds_width": 2.2,
                    "visible_bounds_height": 2.6,
                    "visible_bounds_offset": [0, 1.0, 0],
                },
                "bones": jelly_bones,
            }
        ],
    })

    # --- 9. shard_stalker (64x64) — Sleek Crystalline Twilight Lynx Predator ---
    write_json(RP / "models/entity/shard_stalker.geo.json", {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.auralis_shard_stalker",
                    "texture_width": 64,
                    "texture_height": 64,
                    "visible_bounds_width": 2.4,
                    "visible_bounds_height": 1.8,
                    "visible_bounds_offset": [0, 0.75, 0],
                },
                "bones": [
                    {
                        "name": "body",
                        "pivot": [0, 11, 0],
                        "cubes": [
                            {"origin": [-4.5, 8, -8], "size": [9, 8, 16], "uv": [0, 0]},
                            # Glowing crystal dorsal blades along spine!
                            {"origin": [-1, 15, -5], "size": [2, 5, 3], "rotation": [-18, 0, 0], "pivot": [0, 15, -4], "uv": [34, 26]},
                            {"origin": [-1, 15, 0], "size": [2, 6, 3], "rotation": [-24, 0, 0], "pivot": [0, 15, 1], "uv": [34, 26]},
                            {"origin": [-1, 14.5, 5], "size": [2, 4.5, 2.5], "rotation": [-30, 0, 0], "pivot": [0, 14.5, 6], "uv": [34, 26]},
                        ],
                    },
                    {
                        "name": "head",
                        "parent": "body",
                        "pivot": [0, 13, -8],
                        "cubes": [
                            {"origin": [-4, 10, -15], "size": [8, 7, 8], "uv": [0, 26]},
                        ],
                    },
                    {
                        "name": "ear_l",
                        "parent": "head",
                        "pivot": [3, 17, -9],
                        "rotation": [-10, 0, 14],
                        "cubes": [{"origin": [2, 16.5, -10], "size": [2, 3.5, 2], "uv": [34, 26]}],
                    },
                    {
                        "name": "ear_r",
                        "parent": "head",
                        "pivot": [-3, 17, -9],
                        "rotation": [-10, 0, -14],
                        "cubes": [{"origin": [-4, 16.5, -10], "size": [2, 3.5, 2], "uv": [34, 26]}],
                    },
                    {
                        "name": "leg_fl",
                        "parent": "body",
                        "pivot": [3, 9, -5.5],
                        "cubes": [{"origin": [1.5, 0, -7], "size": [3, 9, 3], "uv": [0, 44]}],
                    },
                    {
                        "name": "leg_fr",
                        "parent": "body",
                        "pivot": [-3, 9, -5.5],
                        "cubes": [{"origin": [-4.5, 0, -7], "size": [3, 9, 3], "uv": [0, 44]}],
                    },
                    {
                        "name": "leg_bl",
                        "parent": "body",
                        "pivot": [3, 9, 5.5],
                        "cubes": [{"origin": [1.5, 0, 4], "size": [3, 9, 3], "uv": [0, 44]}],
                    },
                    {
                        "name": "leg_br",
                        "parent": "body",
                        "pivot": [-3, 9, 5.5],
                        "cubes": [{"origin": [-4.5, 0, 4], "size": [3, 9, 3], "uv": [0, 44]}],
                    },
                    {
                        "name": "tail_1",
                        "parent": "body",
                        "pivot": [0, 13, 8],
                        "rotation": [-14, 0, 0],
                        "cubes": [{"origin": [-1, 12, 8], "size": [2, 2, 10], "uv": [16, 44]}],
                    },
                    {
                        "name": "tail_2",
                        "parent": "tail_1",
                        "pivot": [0, 13, 18],
                        "cubes": [{"origin": [-1, 12, 18], "size": [2, 3, 5], "uv": [34, 26]}],
                    },
                ],
            }
        ],
    })

    # --- 10. astral_weaver (64x64) — Cloaked Twilight Ruin Spellcaster ---
    write_json(RP / "models/entity/astral_weaver.geo.json", {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.auralis_astral_weaver",
                    "texture_width": 64,
                    "texture_height": 64,
                    "visible_bounds_width": 2.4,
                    "visible_bounds_height": 3.0,
                    "visible_bounds_offset": [0, 1.35, 0],
                },
                "bones": [
                    {
                        "name": "body",
                        "pivot": [0, 18, 0],
                        "cubes": [{"origin": [-5, 13, -4], "size": [10, 14, 8], "uv": [0, 0]}],
                    },
                    {
                        "name": "robe_hem",
                        "parent": "body",
                        "pivot": [0, 13, 0],
                        "cubes": [{"origin": [-5, 5, -4], "size": [10, 8, 8], "uv": [0, 44]}],
                    },
                    {
                        "name": "head",
                        "parent": "body",
                        "pivot": [0, 27, 0],
                        "cubes": [{"origin": [-4.5, 27, -4.5], "size": [9, 9, 9], "uv": [0, 24]}],
                    },
                    {
                        "name": "arm_l",
                        "parent": "body",
                        "pivot": [6, 25, 0],
                        "cubes": [{"origin": [5, 14, -2.5], "size": [4, 11, 5], "uv": [38, 0]}],
                    },
                    {
                        "name": "orb_l",
                        "parent": "arm_l",
                        "pivot": [7, 11, -3],
                        "cubes": [{"origin": [5, 9, -5], "size": [4, 4, 4], "uv": [38, 20]}],
                    },
                    {
                        "name": "arm_r",
                        "parent": "body",
                        "pivot": [-6, 25, 0],
                        "cubes": [{"origin": [-9, 14, -2.5], "size": [4, 11, 5], "uv": [38, 0]}],
                    },
                    {
                        "name": "orb_r",
                        "parent": "arm_r",
                        "pivot": [-7, 11, -3],
                        "cubes": [{"origin": [-9, 9, -5], "size": [4, 4, 4], "uv": [38, 20]}],
                    },
                    {
                        "name": "sigil_ring",
                        "parent": "body",
                        "pivot": [0, 24, 6],
                        "cubes": [
                            {"origin": [-5, 28, 5], "size": [10, 1, 2], "uv": [38, 30]},
                            {"origin": [-5, 19, 5], "size": [10, 1, 2], "uv": [38, 30]},
                            {"origin": [-5, 20, 5], "size": [1, 8, 2], "uv": [38, 30]},
                            {"origin": [4, 20, 5], "size": [1, 8, 2], "uv": [38, 30]},
                        ],
                    },
                ],
            }
        ],
    })


# =============================================================================
# 3. FLUID MULTI-STATE ANIMATIONS & CONTROLLERS (100% STRICT `query.*` MOLANG!)
# =============================================================================

def build_animations():
    # Organic asymmetric jellyfish jet-propulsion wave: quick contraction -> languid drift!
    jelly_bones_anim = {
        "bell": {
            "position": [0, "(math.sin(query.life_time * 85) + 0.28 * math.sin(query.life_time * 170)) * 2.1", 0],
            "rotation": ["math.sin(query.life_time * 42) * 7", 0, "math.cos(query.life_time * 36) * 7"],
            "scale": [
                "1.0 + (math.sin(query.life_time * 85) + 0.25 * math.sin(query.life_time * 170)) * 0.10",
                "1.0 - (math.sin(query.life_time * 85) + 0.25 * math.sin(query.life_time * 170)) * 0.12",
                "1.0 + (math.sin(query.life_time * 85) + 0.25 * math.sin(query.life_time * 170)) * 0.10",
            ],
        },
        "core": {
            "rotation": [0, "query.life_time * 52", 0],
            "scale": [
                "1.0 + math.sin(query.life_time * 85 - 40) * 0.14",
                "1.0 + math.sin(query.life_time * 85 - 40) * 0.14",
                "1.0 + math.sin(query.life_time * 85 - 40) * 0.14",
            ],
        },
    }
    for i in range(1, 7):
        phase = i * 55
        jelly_bones_anim[f"tentacle_{i}"] = {
            "rotation": [
                "math.sin(query.life_time * 85 - " + str(phase) + ") * 15",
                0,
                "math.cos(query.life_time * 70 - " + str(phase) + ") * 11",
            ]
        }
        jelly_bones_anim[f"tentacle_{i}_tip"] = {
            "rotation": [
                "math.sin(query.life_time * 85 - " + str(phase + 75) + ") * 24",
                0,
                "math.cos(query.life_time * 70 - " + str(phase + 75) + ") * 16",
            ]
        }

    write_json(RP / "animations/auralis_mobs.animation.json", {
        "format_version": "1.8.0",
        "animations": {
            # Universal clean head-look animation for all headed creatures!
            "animation.auralis.look_at_target": {
                "loop": True,
                "bones": {
                    "head": {
                        "rotation": [
                            "math.clamp(query.target_x_rotation, -35, 35)",
                            "math.clamp(query.target_y_rotation, -48, 48)",
                            0,
                        ]
                    }
                },
            },

            # 1. Lumina Ray: Graceful slow manta wing undulations, banking sway & cephalic horn flutter!
            "animation.auralis.lumina_ray.glide": {
                "loop": True,
                "bones": {
                    "root": {
                        "position": [0, "math.sin(query.life_time * 75) * 1.6", 0],
                        "rotation": ["math.sin(query.life_time * 75 - 30) * 5", 0, "math.sin(query.life_time * 42) * 7"],
                    },
                    "horn_l": {"rotation": ["math.sin(query.life_time * 105 - 20) * 6", 0, "math.sin(query.life_time * 75) * 4"]},
                    "horn_r": {"rotation": ["math.sin(query.life_time * 105 - 20) * 6", 0, "-math.sin(query.life_time * 75) * 4"]},
                    "wing_l": {"rotation": [0, 0, "math.sin(query.life_time * 105) * 21"]},
                    "wing_l_tip": {"rotation": [0, 0, "math.sin(query.life_time * 105 - 55) * 26"]},
                    "wing_r": {"rotation": [0, 0, "-math.sin(query.life_time * 105) * 21"]},
                    "wing_r_tip": {"rotation": [0, 0, "-math.sin(query.life_time * 105 - 55) * 26"]},
                    "tail_1": {"rotation": ["math.sin(query.life_time * 105 - 65) * 12", "math.cos(query.life_time * 62) * 8", 0]},
                    "tail_2": {"rotation": ["math.sin(query.life_time * 105 - 125) * 16", "math.cos(query.life_time * 62 - 65) * 12", 0]},
                },
            },

            # 2. Choir Wisp: Gentle rhythmic bob, musical head tilt & counter-spinning halo/petals
            "animation.auralis.choir_wisp.float": {
                "loop": True,
                "bones": {
                    "body": {
                        "position": [0, "math.sin(query.life_time * 125) * 1.9", 0],
                        "rotation": ["math.sin(query.life_time * 65) * 6", 0, "math.cos(query.life_time * 55) * 7"],
                    },
                    "halo": {"rotation": ["math.sin(query.life_time * 70) * 11", "query.life_time * 72", 0]},
                    "petals": {
                        "position": [0, "math.sin(query.life_time * 125 - 60) * 1.1", 0],
                        "rotation": [0, "-query.life_time * 98", "math.sin(query.life_time * 80) * 9"],
                    },
                },
            },

            # 3. Tide-Glass Crab: Lively carapace scuttle-rock + expressive snapping claws
            "animation.auralis.glass_crab.walk": {
                "loop": True,
                "bones": {
                    "body": {
                        "position": [0, "math.abs(math.sin(query.modified_distance_moved * 60)) * 0.55 * query.modified_move_speed", 0],
                        "rotation": [0, 0, "math.sin(query.modified_distance_moved * 60) * 5 * query.modified_move_speed"],
                    },
                    "legs_l": {"rotation": ["math.sin(query.modified_distance_moved * 60) * 24", 0, 0]},
                    "legs_r": {"rotation": ["-math.sin(query.modified_distance_moved * 60) * 24", 0, 0]},
                    "claw_l": {
                        "rotation": [
                            "math.sin(query.life_time * 110) * 10 - variable.attack_time * 36",
                            "math.sin(query.life_time * 82) * 7",
                            "math.sin(query.life_time * 110) * 5",
                        ]
                    },
                    "claw_r": {
                        "rotation": [
                            "-math.sin(query.life_time * 110) * 10 - variable.attack_time * 36",
                            "-math.sin(query.life_time * 82) * 7",
                            "-math.sin(query.life_time * 110) * 5",
                        ]
                    },
                },
            },

            # 4. Nimbus Stag: Graceful quadruped idle breathing, periodic ear twitches & springy prance!
            "animation.auralis.nimbus_stag.idle": {
                "loop": True,
                "bones": {
                    "body": {"position": [0, "math.sin(query.life_time * 75) * 0.28", 0]},
                    "neck": {"rotation": ["math.sin(query.life_time * 58) * 4.5", 0, 0]},
                    "ear_l": {"rotation": [0, "math.pow(math.max(0, math.sin(query.life_time * 38)), 8) * 16", "math.sin(query.life_time * 75) * 4"]},
                    "ear_r": {"rotation": [0, "-math.pow(math.max(0, math.sin(query.life_time * 38 + 25)), 8) * 16", "-math.sin(query.life_time * 75) * 4"]},
                    "tail": {"rotation": ["math.sin(query.life_time * 120) * 9", "math.cos(query.life_time * 90) * 10", 0]},
                },
            },
            "animation.auralis.nimbus_stag.walk": {
                "loop": True,
                "bones": {
                    "body": {
                        "position": [0, "math.abs(math.sin(query.modified_distance_moved * 42)) * 0.85 * query.modified_move_speed", 0],
                        "rotation": ["math.sin(query.modified_distance_moved * 42) * 3.5 * query.modified_move_speed", 0, 0],
                    },
                    "leg_fl": {"rotation": ["math.cos(query.modified_distance_moved * 42) * 36 * query.modified_move_speed", 0, 0]},
                    "leg_br": {"rotation": ["math.cos(query.modified_distance_moved * 42) * 36 * query.modified_move_speed", 0, 0]},
                    "leg_fr": {"rotation": ["-math.cos(query.modified_distance_moved * 42) * 36 * query.modified_move_speed", 0, 0]},
                    "leg_bl": {"rotation": ["-math.cos(query.modified_distance_moved * 42) * 36 * query.modified_move_speed", 0, 0]},
                    "neck": {"rotation": ["math.sin(query.modified_distance_moved * 42) * 5 * query.modified_move_speed", 0, 0]},
                    "ear_l": {"rotation": [0, 0, "math.sin(query.modified_distance_moved * 42) * 8 * query.modified_move_speed"]},
                    "ear_r": {"rotation": [0, 0, "-math.sin(query.modified_distance_moved * 42) * 8 * query.modified_move_speed"]},
                },
            },

            # 5. Aurelia Cloud-Jelly: Organic jet-propulsion bell-pulse + flowing tendrils!
            "animation.auralis.tide_jelly.pulse": {
                "loop": True,
                "bones": jelly_bones_anim,
            },

            # 6. Shard Stalker: Lithe feline prowl, vigilant ears, tail whip & pinned-ear pounce!
            "animation.auralis.shard_stalker.idle": {
                "loop": True,
                "bones": {
                    "body": {"position": [0, "math.sin(query.life_time * 95) * 0.32", 0]},
                    "ear_l": {"rotation": ["math.sin(query.life_time * 52) * 6", "math.sin(query.life_time * 40) * 10", 0]},
                    "ear_r": {"rotation": ["math.sin(query.life_time * 52 + 40) * 6", "-math.sin(query.life_time * 40 + 40) * 10", 0]},
                    "tail_1": {"rotation": ["math.sin(query.life_time * 110) * 8", "math.sin(query.life_time * 85) * 20", 0]},
                    "tail_2": {"rotation": ["math.sin(query.life_time * 110 - 60) * 12", "math.sin(query.life_time * 85 - 50) * 26", 0]},
                },
            },
            "animation.auralis.shard_stalker.walk": {
                "loop": True,
                "bones": {
                    "leg_fl": {"rotation": ["math.cos(query.modified_distance_moved * 48) * 44 * query.modified_move_speed", 0, 0]},
                    "leg_fr": {"rotation": ["math.cos(query.modified_distance_moved * 48 + 45) * 44 * query.modified_move_speed", 0, 0]},
                    "leg_bl": {"rotation": ["-math.cos(query.modified_distance_moved * 48) * 44 * query.modified_move_speed", 0, 0]},
                    "leg_br": {"rotation": ["-math.cos(query.modified_distance_moved * 48 + 45) * 44 * query.modified_move_speed", 0, 0]},
                    "body": {
                        "position": [0, "math.abs(math.sin(query.modified_distance_moved * 48)) * 0.65 * query.modified_move_speed", 0],
                        "rotation": [
                            "math.sin(query.modified_distance_moved * 48) * 6 * query.modified_move_speed",
                            0,
                            "math.cos(query.modified_distance_moved * 48) * 4 * query.modified_move_speed",
                        ],
                    },
                    "tail_1": {"rotation": ["-8 * query.modified_move_speed", "math.sin(query.modified_distance_moved * 48) * 18 * query.modified_move_speed", 0]},
                },
            },
            "animation.auralis.shard_stalker.attack": {
                "loop": False,
                "animation_length": 0.45,
                "bones": {
                    "body": {"rotation": ["-15 * math.sin(query.anim_time * 400)", 0, 0]},
                    "head": {"rotation": ["20 * math.sin(query.anim_time * 400)", 0, 0]},
                    "ear_l": {"rotation": ["-34 * math.sin(query.anim_time * 400)", 0, "14 * math.sin(query.anim_time * 400)"]},
                    "ear_r": {"rotation": ["-34 * math.sin(query.anim_time * 400)", 0, "-14 * math.sin(query.anim_time * 400)"]},
                    "leg_fl": {"rotation": ["-52 * math.sin(query.anim_time * 400)", 0, 0]},
                    "leg_fr": {"rotation": ["-52 * math.sin(query.anim_time * 400)", 0, 0]},
                    "leg_bl": {"rotation": ["24 * math.sin(query.anim_time * 400)", 0, 0]},
                    "leg_br": {"rotation": ["24 * math.sin(query.anim_time * 400)", 0, 0]},
                    "tail_1": {"rotation": ["22 * math.sin(query.anim_time * 400)", "26 * math.sin(query.anim_time * 800)", 0]},
                    "tail_2": {"rotation": ["18 * math.sin(query.anim_time * 400)", "-32 * math.sin(query.anim_time * 800)", 0]},
                },
            },

            # 7. Astral Weaver: Mystic hover + dramatic pulsing-orb chime-casting pose!
            "animation.auralis.astral_weaver.hover": {
                "loop": True,
                "bones": {
                    "body": {
                        "position": [0, "math.sin(query.life_time * 105) * 2.0", 0],
                        "rotation": ["math.sin(query.life_time * 65) * 3", 0, "math.cos(query.life_time * 55) * 3"],
                    },
                    "robe_hem": {"rotation": ["math.sin(query.life_time * 105 - 50) * 10", 0, 0]},
                    "sigil_ring": {"rotation": ["math.sin(query.life_time * 55) * 8", 0, "query.life_time * 68"]},
                    "arm_l": {"rotation": ["-14 + math.sin(query.life_time * 105) * 8", 0, "-10"]},
                    "arm_r": {"rotation": ["-14 - math.sin(query.life_time * 105) * 8", 0, "10"]},
                    "orb_l": {
                        "position": [0, "math.sin(query.life_time * 140) * 0.8", 0],
                        "rotation": ["query.life_time * 115", "query.life_time * 145", 0],
                    },
                    "orb_r": {
                        "position": [0, "-math.sin(query.life_time * 140) * 0.8", 0],
                        "rotation": ["-query.life_time * 115", "-query.life_time * 145", 0],
                    },
                },
            },
            "animation.auralis.astral_weaver.cast": {
                "loop": True,
                "bones": {
                    "body": {"position": [0, "2.8 + math.sin(query.life_time * 180) * 1.2", 0], "rotation": ["-6", 0, 0]},
                    "robe_hem": {"rotation": ["16 + math.sin(query.life_time * 220) * 10", 0, 0]},
                    "arm_l": {"rotation": ["-118 + math.sin(query.life_time * 240) * 11", 0, "-24"]},
                    "arm_r": {"rotation": ["-118 - math.sin(query.life_time * 240) * 11", 0, "24"]},
                    "sigil_ring": {"rotation": ["math.sin(query.life_time * 180) * 18", 0, "query.life_time * 240"]},
                    "orb_l": {
                        "rotation": ["query.life_time * 300", "query.life_time * 360", 0],
                        "scale": [
                            "1.25 + math.sin(query.life_time * 320) * 0.22",
                            "1.25 + math.sin(query.life_time * 320) * 0.22",
                            "1.25 + math.sin(query.life_time * 320) * 0.22",
                        ],
                    },
                    "orb_r": {
                        "rotation": ["-query.life_time * 300", "-query.life_time * 360", 0],
                        "scale": [
                            "1.25 + math.cos(query.life_time * 320) * 0.22",
                            "1.25 + math.cos(query.life_time * 320) * 0.22",
                            "1.25 + math.cos(query.life_time * 320) * 0.22",
                        ],
                    },
                },
            },

            # 8. Gilded Sentinel: Serene temple vigil (hover) + NEW Raised-Gauntlets Combat Guard (alert)!
            "animation.auralis.gilded_sentinel.hover": {
                "loop": True,
                "bones": {
                    "body": {"position": [0, "math.sin(query.life_time * 105) * 2.0", 0]},
                    "core": {"rotation": ["query.life_time * 65", "query.life_time * 95", 0]},
                    "halo": {"rotation": ["math.sin(query.life_time * 70) * 10", "query.life_time * 88", 0]},
                    "arm_l": {"position": [0, "math.sin(query.life_time * 105 + 90) * 1.4", 0], "rotation": ["-10 + math.sin(query.life_time * 90) * 6", 0, 0]},
                    "arm_r": {"position": [0, "math.sin(query.life_time * 105 - 90) * 1.4", 0], "rotation": ["-10 - math.sin(query.life_time * 90) * 6", 0, 0]},
                },
            },
            "animation.auralis.gilded_sentinel.alert": {
                "loop": True,
                "bones": {
                    "body": {"position": [0, "2.4 + math.sin(query.life_time * 165) * 1.3", 0], "rotation": ["8", 0, 0]},
                    "core": {
                        "rotation": ["query.life_time * 220", "query.life_time * 290", 0],
                        "scale": [
                            "1.18 + math.sin(query.life_time * 260) * 0.14",
                            "1.18 + math.sin(query.life_time * 260) * 0.14",
                            "1.18 + math.sin(query.life_time * 260) * 0.14",
                        ],
                    },
                    "halo": {"rotation": ["14 + math.sin(query.life_time * 140) * 12", "query.life_time * 210", 0]},
                    "arm_l": {
                        "position": [0, "math.sin(query.life_time * 200) * 1.1", "-1.5"],
                        "rotation": ["-78 + math.sin(query.life_time * 220) * 8", 0, "-14"],
                    },
                    "arm_r": {
                        "position": [0, "-math.sin(query.life_time * 200) * 1.1", "-1.5"],
                        "rotation": ["-78 - math.sin(query.life_time * 220) * 8", 0, "14"],
                    },
                },
            },

            # 9. THE ASTRAL SERAPH 2.1 — 5 Rich Multi-State Boss Animations with Pauldron Flare & Scepter Flourishes!
            # State 0: Majestic Celestial Hover (halo spin & wing amplitude scale cleanly with boss_phase!)
            "animation.auralis.astral_seraph.majesty": {
                "loop": True,
                "bones": {
                    "root": {"position": [0, "math.sin(query.life_time * 85) * 2.8", 0]},
                    "torso": {"rotation": ["math.sin(query.life_time * 85) * 3.5", 0, 0]},
                    "star_heart": {"rotation": ["query.life_time * 60", "query.life_time * 95", 0]},
                    "pauldron_l": {"rotation": [0, 0, "math.sin(query.life_time * 85 - 25) * 4"]},
                    "pauldron_r": {"rotation": [0, 0, "-math.sin(query.life_time * 85 - 25) * 4"]},
                    "halo_outer": {"rotation": [0, 0, "query.life_time * (32 + query.property('auralis:boss_phase') * 16)"]},
                    "halo_inner": {
                        "rotation": [
                            "math.sin(query.life_time * 55) * 14",
                            "math.cos(query.life_time * 55) * 14",
                            "-query.life_time * (48 + query.property('auralis:boss_phase') * 22)",
                        ]
                    },
                    "robe_front": {"rotation": ["-6 - math.sin(query.life_time * 95) * 7", 0, 0]},
                    "robe_back": {"rotation": ["14 + math.sin(query.life_time * 95 - 50) * 10", 0, 0]},
                    "robe_l": {"rotation": ["math.sin(query.life_time * 95 - 25) * 8", 0, 0]},
                    "robe_r": {"rotation": ["math.sin(query.life_time * 95 - 25) * 8", 0, 0]},
                    "wing_top_l": {"rotation": [0, "math.sin(query.life_time * 115) * (19 + query.property('auralis:boss_phase') * 3)", "math.sin(query.life_time * 115) * 14"]},
                    "wing_top_l_tip": {"rotation": [0, "math.sin(query.life_time * 115 - 45) * 19", "math.sin(query.life_time * 115 - 45) * 12"]},
                    "wing_top_r": {"rotation": [0, "-math.sin(query.life_time * 115) * (19 + query.property('auralis:boss_phase') * 3)", "-math.sin(query.life_time * 115) * 14"]},
                    "wing_top_r_tip": {"rotation": [0, "-math.sin(query.life_time * 115 - 45) * 19", "-math.sin(query.life_time * 115 - 45) * 12"]},
                    "wing_mid_l": {"rotation": [0, "math.sin(query.life_time * 115 - 45) * (17 + query.property('auralis:boss_phase') * 3)", "math.sin(query.life_time * 115 - 45) * 12"]},
                    "wing_mid_l_tip": {"rotation": [0, "math.sin(query.life_time * 115 - 90) * 17", "math.sin(query.life_time * 115 - 90) * 10"]},
                    "wing_mid_r": {"rotation": [0, "-math.sin(query.life_time * 115 - 45) * (17 + query.property('auralis:boss_phase') * 3)", "-math.sin(query.life_time * 115 - 45) * 12"]},
                    "wing_mid_r_tip": {"rotation": [0, "-math.sin(query.life_time * 115 - 90) * 17", "-math.sin(query.life_time * 115 - 90) * 10"]},
                    "wing_low_l": {"rotation": [0, "math.sin(query.life_time * 115 - 90) * 16", "math.sin(query.life_time * 115 - 90) * 10"]},
                    "wing_low_r": {"rotation": [0, "-math.sin(query.life_time * 115 - 90) * 16", "-math.sin(query.life_time * 115 - 90) * 10"]},
                    "arm_l": {"rotation": ["-14 + math.sin(query.life_time * 85) * 8", 0, "-12"]},
                    "forearm_l": {"rotation": ["-22 + math.sin(query.life_time * 85 - 40) * 6", 0, 0]},
                    "arm_r": {"rotation": ["-24 - math.sin(query.life_time * 85) * 7", 0, "10"]},
                    "forearm_r": {"rotation": ["-28 + math.sin(query.life_time * 85) * 6", 0, 0]},
                    "scepter": {"rotation": ["math.sin(query.life_time * 85 - 20) * 5", 0, 0]},
                },
            },

            # State 1: Starlight Bolt Volley (wings & pauldrons flare wide, scepter aims directly forward!)
            "animation.auralis.astral_seraph.bolt_volley": {
                "loop": True,
                "bones": {
                    "root": {"position": [0, "2.0 + math.sin(query.life_time * 160) * 1.4", 0]},
                    "torso": {"rotation": ["10", 0, 0]},
                    "star_heart": {"rotation": ["query.life_time * 180", "query.life_time * 240", 0]},
                    "pauldron_l": {"rotation": [0, 0, "-10"]},
                    "pauldron_r": {"rotation": [0, 0, "10"]},
                    "halo_outer": {"rotation": [0, 0, "query.life_time * 140"]},
                    "halo_inner": {"rotation": [0, 0, "-query.life_time * 200"]},
                    "wing_top_l": {"rotation": [0, "-22 + math.sin(query.life_time * 220) * 12", -8]},
                    "wing_top_l_tip": {"rotation": [0, -8, -4]},
                    "wing_top_r": {"rotation": [0, "22 - math.sin(query.life_time * 220) * 12", 8]},
                    "wing_top_r_tip": {"rotation": [0, 8, 4]},
                    "wing_mid_l": {"rotation": [0, "-16 + math.sin(query.life_time * 220 - 30) * 10", -8]},
                    "wing_mid_r": {"rotation": [0, "16 - math.sin(query.life_time * 220 - 30) * 10", 8]},
                    "wing_low_l": {"rotation": [0, -10, -6]},
                    "wing_low_r": {"rotation": [0, 10, 6]},
                    "arm_r": {"rotation": ["-95 + math.sin(query.life_time * 280) * 10", 0, "8"]},
                    "forearm_r": {"rotation": ["-18", 0, 0]},
                    "scepter": {"rotation": ["-16 + math.sin(query.life_time * 280) * 8", 0, 0]},
                    "arm_l": {"rotation": ["-65", 0, "-28"]},
                    "forearm_l": {"rotation": ["-30", 0, 0]},
                    "robe_back": {"rotation": ["26 + math.sin(query.life_time * 180) * 8", 0, 0]},
                    "robe_l": {"rotation": ["10 + math.sin(query.life_time * 180) * 6", 0, 0]},
                    "robe_r": {"rotation": ["10 + math.sin(query.life_time * 180) * 6", 0, 0]},
                },
            },

            # State 2: Radiant Swoop Slash (aerodynamic forward lean + sweeping halberd arc!)
            "animation.auralis.astral_seraph.swoop_slash": {
                "loop": True,
                "bones": {
                    "root": {"position": [0, "math.sin(query.life_time * 200) * 1.2", 0]},
                    "torso": {"rotation": ["22", "math.sin(query.life_time * 260) * 24", 0]},
                    "star_heart": {"rotation": ["query.life_time * 220", "query.life_time * 280", 0]},
                    "pauldron_l": {"rotation": [0, 0, "8"]},
                    "pauldron_r": {"rotation": [0, 0, "-8"]},
                    "halo_outer": {"rotation": [0, 0, "query.life_time * 220"]},
                    "halo_inner": {"rotation": [0, 0, "-query.life_time * 260"]},
                    "wing_top_l": {"rotation": [0, -32, 8]},
                    "wing_top_l_tip": {"rotation": [0, -18, 6]},
                    "wing_top_r": {"rotation": [0, 32, -8]},
                    "wing_top_r_tip": {"rotation": [0, 18, -6]},
                    "wing_mid_l": {"rotation": [0, -28, 8]},
                    "wing_mid_l_tip": {"rotation": [0, -14, 6]},
                    "wing_mid_r": {"rotation": [0, 28, -8]},
                    "wing_mid_r_tip": {"rotation": [0, 14, -6]},
                    "wing_low_l": {"rotation": [0, -20, 6]},
                    "wing_low_r": {"rotation": [0, 20, -6]},
                    "arm_r": {"rotation": ["-108 + math.sin(query.life_time * 320) * 52", "-25", "18"]},
                    "forearm_r": {"rotation": ["-24", 0, 0]},
                    "scepter": {"rotation": ["math.sin(query.life_time * 320) * 32", 0, "-16"]},
                    "arm_l": {"rotation": ["32", 0, "-22"]},
                    "robe_back": {"rotation": ["38", 0, 0]},
                    "robe_front": {"rotation": ["18", 0, 0]},
                },
            },

            # State 3: Harmonic Shockwave Nova (wings fold inward to gather energy, then snap open!)
            "animation.auralis.astral_seraph.harmonic_nova": {
                "loop": True,
                "bones": {
                    "root": {"position": [0, "4.0 + math.sin(query.life_time * 240) * 1.0", 0]},
                    "torso": {"rotation": ["-12", 0, 0]},
                    "pauldron_l": {"rotation": [0, 0, "-16"]},
                    "pauldron_r": {"rotation": [0, 0, "16"]},
                    "star_heart": {"rotation": ["query.life_time * 360", "query.life_time * 420", 0], "scale": ["1.3 + math.sin(query.life_time * 320) * 0.25", "1.3 + math.sin(query.life_time * 320) * 0.25", "1.3 + math.sin(query.life_time * 320) * 0.25"]},
                    "halo_outer": {"rotation": ["math.sin(query.life_time * 180) * 20", 0, "query.life_time * 300"]},
                    "halo_inner": {"rotation": [0, "math.cos(query.life_time * 180) * 20", "-query.life_time * 360"]},
                    "wing_top_l": {"rotation": [0, "14 + 26 * math.sin(query.life_time * 220)", -10]},
                    "wing_top_r": {"rotation": [0, "-14 - 26 * math.sin(query.life_time * 220)", 10]},
                    "wing_mid_l": {"rotation": [0, "20 + 28 * math.sin(query.life_time * 220)", -4]},
                    "wing_mid_r": {"rotation": [0, "-20 - 28 * math.sin(query.life_time * 220)", 4]},
                    "wing_low_l": {"rotation": [0, "20 + 22 * math.sin(query.life_time * 220)", -4]},
                    "wing_low_r": {"rotation": [0, "-20 - 22 * math.sin(query.life_time * 220)", 4]},
                    "arm_l": {"rotation": ["-70", "25", "-45"]},
                    "arm_r": {"rotation": ["-70", "-25", "45"]},
                    "robe_front": {"rotation": ["-18 - math.sin(query.life_time * 220) * 10", 0, 0]},
                    "robe_back": {"rotation": ["22 + math.sin(query.life_time * 220) * 10", 0, 0]},
                    "robe_l": {"rotation": ["16 + math.sin(query.life_time * 220) * 8", 0, 0]},
                    "robe_r": {"rotation": ["16 + math.sin(query.life_time * 220) * 8", 0, 0]},
                },
            },

            # State 4: Celestial Star-Pillars Invocation (both arms & Astral Halberd lifted skyward like a beacon!)
            "animation.auralis.astral_seraph.star_pillars": {
                "loop": True,
                "bones": {
                    "root": {"position": [0, "5.0 + math.sin(query.life_time * 150) * 1.5", 0]},
                    "torso": {"rotation": ["-14", 0, 0]},
                    "pauldron_l": {"rotation": [0, 0, "-14"]},
                    "pauldron_r": {"rotation": [0, 0, "14"]},
                    "star_heart": {"rotation": ["query.life_time * 240", "query.life_time * 300", 0]},
                    "halo_outer": {"rotation": [0, 0, "query.life_time * 200"]},
                    "halo_inner": {"rotation": [0, 0, "-query.life_time * 240"]},
                    "wing_top_l": {"rotation": [0, -8, "-22 + math.sin(query.life_time * 180) * 10"]},
                    "wing_top_r": {"rotation": [0, 8, "22 - math.sin(query.life_time * 180) * 10"]},
                    "wing_mid_l": {"rotation": [0, -8, "-20 + math.sin(query.life_time * 180 - 40) * 10"]},
                    "wing_mid_r": {"rotation": [0, 8, "20 - math.sin(query.life_time * 180 - 40) * 10"]},
                    "wing_low_l": {"rotation": [0, -6, -16]},
                    "wing_low_r": {"rotation": [0, 6, 16]},
                    "arm_r": {"rotation": ["-158 + math.sin(query.life_time * 200) * 8", 0, "14"]},
                    "forearm_r": {"rotation": ["-12", 0, 0]},
                    "scepter": {"rotation": ["-68", 0, 0]},
                    "arm_l": {"rotation": ["-148 - math.sin(query.life_time * 200) * 8", 0, "-18"]},
                    "forearm_l": {"rotation": ["-16", 0, 0]},
                    "robe_front": {"rotation": ["-14 + math.sin(query.life_time * 180) * 8", 0, 0]},
                    "robe_back": {"rotation": ["24 + math.sin(query.life_time * 180) * 8", 0, 0]},
                },
            },

            # 10. Astral Bolt spin + radiant pulse
            "animation.auralis.astral_bolt.spin": {
                "loop": True,
                "bones": {
                    "bolt": {
                        "rotation": ["query.life_time * 360", "query.life_time * 480", 0],
                        "scale": [
                            "1.0 + math.sin(query.life_time * 480) * 0.14",
                            "1.0 + math.sin(query.life_time * 480) * 0.14",
                            "1.0 + math.sin(query.life_time * 480) * 0.14",
                        ],
                    },
                },
            },
        },
    })

    # Clean 1.10.0 Animation Controllers with smooth blend transitions!
    write_json(RP / "animation_controllers/auralis_mobs.animation_controllers.json", {
        "format_version": "1.10.0",
        "animation_controllers": {
            "controller.animation.auralis.always_active": {
                "initial_state": "active",
                "states": {
                    "active": {"animations": ["main_anim"]},
                },
            },
            "controller.animation.auralis.quadruped": {
                "initial_state": "idle",
                "states": {
                    "idle": {
                        "animations": ["idle"],
                        "transitions": [{"walk": "query.modified_move_speed > 0.12"}],
                        "blend_transition": 0.2,
                    },
                    "walk": {
                        "animations": ["idle", "walk"],
                        "transitions": [{"idle": "query.modified_move_speed <= 0.12"}],
                        "blend_transition": 0.2,
                    },
                },
            },
            "controller.animation.auralis.stalker": {
                "initial_state": "idle",
                "states": {
                    "idle": {
                        "animations": ["idle"],
                        "transitions": [
                            {"attack": "variable.attack_time > 0.0"},
                            {"walk": "query.modified_move_speed > 0.12"},
                        ],
                        "blend_transition": 0.15,
                    },
                    "walk": {
                        "animations": ["idle", "walk"],
                        "transitions": [
                            {"attack": "variable.attack_time > 0.0"},
                            {"idle": "query.modified_move_speed <= 0.12"},
                        ],
                        "blend_transition": 0.15,
                    },
                    "attack": {
                        "animations": ["attack"],
                        "transitions": [{"idle": "query.all_animations_finished"}],
                        "blend_transition": 0.1,
                    },
                },
            },
            "controller.animation.auralis.weaver": {
                "initial_state": "hover",
                "states": {
                    "hover": {
                        "animations": ["hover"],
                        "transitions": [{"cast": "query.property('auralis:casting') == true"}],
                        "blend_transition": 0.2,
                    },
                    "cast": {
                        "animations": ["cast"],
                        "transitions": [{"hover": "query.property('auralis:casting') == false"}],
                        "blend_transition": 0.2,
                    },
                },
            },
            "controller.animation.auralis.sentinel": {
                "initial_state": "hover",
                "states": {
                    "hover": {
                        "animations": ["hover"],
                        "transitions": [{"alert": "query.property('auralis:alert') == true"}],
                        "blend_transition": 0.22,
                    },
                    "alert": {
                        "animations": ["alert"],
                        "transitions": [{"hover": "query.property('auralis:alert') == false"}],
                        "blend_transition": 0.22,
                    },
                },
            },
            "controller.animation.auralis.seraph_boss": {
                "initial_state": "majesty",
                "states": {
                    "majesty": {
                        "animations": ["majesty"],
                        "transitions": [
                            {"bolt_volley": "query.property('auralis:boss_state') == 1"},
                            {"swoop_slash": "query.property('auralis:boss_state') == 2"},
                            {"harmonic_nova": "query.property('auralis:boss_state') == 3"},
                            {"star_pillars": "query.property('auralis:boss_state') == 4"},
                        ],
                        "blend_transition": 0.25,
                    },
                    "bolt_volley": {
                        "animations": ["bolt_volley"],
                        "transitions": [
                            {"majesty": "query.property('auralis:boss_state') == 0"},
                            {"swoop_slash": "query.property('auralis:boss_state') == 2"},
                            {"harmonic_nova": "query.property('auralis:boss_state') == 3"},
                            {"star_pillars": "query.property('auralis:boss_state') == 4"},
                        ],
                        "blend_transition": 0.22,
                    },
                    "swoop_slash": {
                        "animations": ["swoop_slash"],
                        "transitions": [
                            {"majesty": "query.property('auralis:boss_state') == 0"},
                            {"bolt_volley": "query.property('auralis:boss_state') == 1"},
                            {"harmonic_nova": "query.property('auralis:boss_state') == 3"},
                            {"star_pillars": "query.property('auralis:boss_state') == 4"},
                        ],
                        "blend_transition": 0.18,
                    },
                    "harmonic_nova": {
                        "animations": ["harmonic_nova"],
                        "transitions": [
                            {"majesty": "query.property('auralis:boss_state') == 0"},
                            {"bolt_volley": "query.property('auralis:boss_state') == 1"},
                            {"swoop_slash": "query.property('auralis:boss_state') == 2"},
                            {"star_pillars": "query.property('auralis:boss_state') == 4"},
                        ],
                        "blend_transition": 0.22,
                    },
                    "star_pillars": {
                        "animations": ["star_pillars"],
                        "transitions": [
                            {"majesty": "query.property('auralis:boss_state') == 0"},
                            {"bolt_volley": "query.property('auralis:boss_state') == 1"},
                            {"swoop_slash": "query.property('auralis:boss_state') == 2"},
                            {"harmonic_nova": "query.property('auralis:boss_state') == 3"},
                        ],
                        "blend_transition": 0.22,
                    },
                },
            },
        },
    })


# =============================================================================
# 4. RP CLIENT ENTITIES (RP/entity/*.entity.json)
# =============================================================================

def build_rp_entities():
    def write_rp(name, geo, animations, animate_list, egg=None, particle=None):
        desc = {
            "identifier": f"auralis:{name}",
            "materials": {"default": "entity_alphatest"},
            "textures": {"default": f"textures/entity/{name}"},
            "geometry": {"default": geo},
            "animations": animations,
            "scripts": {"animate": animate_list},
            "render_controllers": ["controller.render.auralis_entity"],
        }
        if egg:
            desc["spawn_egg"] = {"base_color": egg[0], "overlay_color": egg[1]}
        if particle:
            desc["particle_effects"] = {"aura": particle}
        write_json(RP / "entity" / f"{name}.entity.json", {
            "format_version": "1.10.0",
            "minecraft:client_entity": {"description": desc},
        })

    write_rp(
        "lumina_ray", "geometry.auralis_lumina_ray",
        {"main_anim": "animation.auralis.lumina_ray.glide", "ctrl": "controller.animation.auralis.always_active"},
        ["ctrl"], egg=("#2EC8C8", "#FFE082"), particle="auralis:manta_trail",
    )
    write_rp(
        "choir_wisp", "geometry.auralis_choir_wisp",
        {"main_anim": "animation.auralis.choir_wisp.float", "ctrl": "controller.animation.auralis.always_active"},
        ["ctrl"], egg=("#F5ECE0", "#FF9EB8"), particle="auralis:wisp_notes",
    )
    write_rp(
        "glass_crab", "geometry.auralis_glass_crab",
        {"main_anim": "animation.auralis.glass_crab.walk", "ctrl": "controller.animation.auralis.always_active"},
        ["ctrl"], egg=("#E4DACB", "#52E6E2"),
    )
    write_rp(
        "nimbus_stag", "geometry.auralis_nimbus_stag",
        {
            "idle": "animation.auralis.nimbus_stag.idle",
            "walk": "animation.auralis.nimbus_stag.walk",
            "look": "animation.auralis.look_at_target",
            "ctrl": "controller.animation.auralis.quadruped",
        },
        ["ctrl", "look"], egg=("#F4F0EC", "#7EF0EC"),
    )
    write_rp(
        "tide_jelly", "geometry.auralis_tide_jelly",
        {"main_anim": "animation.auralis.tide_jelly.pulse", "ctrl": "controller.animation.auralis.always_active"},
        ["ctrl"], egg=("#F69EC4", "#8AF4F0"), particle="auralis:ambient_motes",
    )
    write_rp(
        "shard_stalker", "geometry.auralis_shard_stalker",
        {
            "idle": "animation.auralis.shard_stalker.idle",
            "walk": "animation.auralis.shard_stalker.walk",
            "attack": "animation.auralis.shard_stalker.attack",
            "look": "animation.auralis.look_at_target",
            "ctrl": "controller.animation.auralis.stalker",
        },
        ["ctrl", "look"], egg=("#2E2862", "#D882FF"),
    )
    write_rp(
        "astral_weaver", "geometry.auralis_astral_weaver",
        {
            "hover": "animation.auralis.astral_weaver.hover",
            "cast": "animation.auralis.astral_weaver.cast",
            "look": "animation.auralis.look_at_target",
            "ctrl": "controller.animation.auralis.weaver",
        },
        ["ctrl", "look"], egg=("#2C2664", "#F4CA64"), particle="auralis:sentinel_beam",
    )
    write_rp(
        "gilded_sentinel", "geometry.auralis_gilded_sentinel",
        {
            "hover": "animation.auralis.gilded_sentinel.hover",
            "alert": "animation.auralis.gilded_sentinel.alert",
            "look": "animation.auralis.look_at_target",
            "ctrl": "controller.animation.auralis.sentinel",
        },
        ["ctrl", "look"], egg=("#E6D294", "#5CF0F0"),
    )
    write_rp(
        "astral_seraph", "geometry.auralis_astral_seraph",
        {
            "majesty": "animation.auralis.astral_seraph.majesty",
            "bolt_volley": "animation.auralis.astral_seraph.bolt_volley",
            "swoop_slash": "animation.auralis.astral_seraph.swoop_slash",
            "harmonic_nova": "animation.auralis.astral_seraph.harmonic_nova",
            "star_pillars": "animation.auralis.astral_seraph.star_pillars",
            "look": "animation.auralis.look_at_target",
            "ctrl": "controller.animation.auralis.seraph_boss",
        },
        ["ctrl", "look"], egg=("#F4C95D", "#D67CFF"), particle="auralis:ambient_motes",
    )
    write_rp(
        "astral_bolt", "geometry.auralis_astral_bolt",
        {"main_anim": "animation.auralis.astral_bolt.spin", "ctrl": "controller.animation.auralis.always_active"},
        ["ctrl"], particle="auralis:sentinel_beam",
    )


# =============================================================================
# 5. BP ENTITY BEHAVIORS (Smooth Allay/Blaze Hovering + Arena-Tethered Boss!)
# =============================================================================

def build_bp_entities():
    # --- 1. Lumina Ray (Serene Sky-Manta Glider — ZERO erratic float_wander!) ---
    write_json(BP / "entities/lumina_ray.json", {
        "format_version": "1.21.50",
        "minecraft:entity": {
            "description": {
                "identifier": "auralis:lumina_ray",
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False,
            },
            "components": {
                "minecraft:type_family": {"family": ["auralis", "lumina_ray", "mob"]},
                "minecraft:collision_box": {"width": 1.6, "height": 0.7},
                "minecraft:health": {"value": 24, "max": 24},
                "minecraft:flying_speed": {"value": 0.08},
                "minecraft:movement": {"value": 0.14},
                "minecraft:navigation.hover": {
                    "can_path_over_water": True,
                    "can_sink": False,
                    "can_path_from_air": True,
                    "avoid_damage_blocks": True,
                },
                "minecraft:movement.hover": {"max_turn": 12.0},
                "minecraft:jump.static": {},
                "minecraft:can_fly": {},
                "minecraft:physics": {"has_gravity": False, "has_collision": True},
                "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
                "minecraft:despawn": {"despawn_from_distance": {}},
                "minecraft:loot": {"table": "loot_tables/entities/lumina_ray.json"},
                "minecraft:damage_sensor": {
                    "triggers": [{"cause": "fall", "deals_damage": "no"}]
                },
                "minecraft:behavior.tempt": {
                    "priority": 1,
                    "speed_multiplier": 1.15,
                    "items": ["auralis:prism_berry"],
                    "within_radius": 14.0,
                    "can_tempt_vertically": True,
                },
                "minecraft:behavior.random_hover": {
                    "priority": 2,
                    "xz_dist": 12,
                    "y_dist": 4,
                    "y_offset": 0,
                    "interval": 45,
                    "hover_height": [5, 12],
                },
                "minecraft:behavior.look_at_player": {"priority": 4, "look_distance": 12.0},
            },
        },
    })

    # --- 2. Choir Wisp (Calm Curious Allay-Style Lantern Spirit) ---
    write_json(BP / "entities/choir_wisp.json", {
        "format_version": "1.21.50",
        "minecraft:entity": {
            "description": {
                "identifier": "auralis:choir_wisp",
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False,
            },
            "components": {
                "minecraft:type_family": {"family": ["auralis", "choir_wisp", "mob"]},
                "minecraft:collision_box": {"width": 0.65, "height": 0.9},
                "minecraft:health": {"value": 16, "max": 16},
                "minecraft:flying_speed": {"value": 0.09},
                "minecraft:movement": {"value": 0.14},
                "minecraft:navigation.hover": {
                    "can_path_over_water": True,
                    "can_sink": False,
                    "can_path_from_air": True,
                    "avoid_damage_blocks": True,
                },
                "minecraft:movement.hover": {"max_turn": 20.0},
                "minecraft:jump.static": {},
                "minecraft:can_fly": {},
                "minecraft:physics": {"has_gravity": False, "has_collision": True},
                "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
                "minecraft:despawn": {"despawn_from_distance": {}},
                "minecraft:loot": {"table": "loot_tables/entities/choir_wisp.json"},
                "minecraft:damage_sensor": {
                    "triggers": [{"cause": "fall", "deals_damage": "no"}]
                },
                "minecraft:behavior.tempt": {
                    "priority": 1,
                    "speed_multiplier": 1.25,
                    "items": ["auralis:tuning_fork", "auralis:solarium_ingot", "auralis:astral_lyre"],
                    "within_radius": 16.0,
                    "can_tempt_vertically": True,
                },
                "minecraft:behavior.random_hover": {
                    "priority": 2,
                    "xz_dist": 8,
                    "y_dist": 4,
                    "y_offset": -1,
                    "interval": 16,
                    "hover_height": [1, 4],
                },
                "minecraft:behavior.look_at_player": {"priority": 3, "look_distance": 10.0},
                "minecraft:behavior.random_look_around": {"priority": 4},
            },
        },
    })

    # --- 3. Tide-Glass Crab (Neutral Crystal-Shelled Reef Defender) ---
    write_json(BP / "entities/glass_crab.json", {
        "format_version": "1.21.50",
        "minecraft:entity": {
            "description": {
                "identifier": "auralis:glass_crab",
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False,
            },
            "components": {
                "minecraft:type_family": {"family": ["auralis", "glass_crab", "arthropod", "mob"]},
                "minecraft:collision_box": {"width": 0.95, "height": 0.8},
                "minecraft:health": {"value": 28, "max": 28},
                "minecraft:movement": {"value": 0.24},
                "minecraft:attack": {"damage": 5},
                "minecraft:navigation.walk": {"can_path_over_water": True, "avoid_damage_blocks": True},
                "minecraft:movement.basic": {},
                "minecraft:jump.static": {},
                "minecraft:breathable": {"breathes_air": True, "breathes_water": True},
                "minecraft:physics": {},
                "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
                "minecraft:despawn": {"despawn_from_distance": {}},
                "minecraft:loot": {"table": "loot_tables/entities/glass_crab.json"},
                "minecraft:behavior.hurt_by_target": {"priority": 1},
                "minecraft:behavior.melee_attack": {"priority": 2, "speed_multiplier": 1.35, "track_target": True},
                "minecraft:behavior.random_stroll": {"priority": 4, "speed_multiplier": 0.85},
                "minecraft:behavior.look_at_player": {"priority": 5, "look_distance": 8.0},
                "minecraft:behavior.random_look_around": {"priority": 6},
            },
        },
    })

    # --- 4. NEW Passive: Nimbus Stag (Peaceful Celestial Cloud-Deer) ---
    write_json(BP / "entities/nimbus_stag.json", {
        "format_version": "1.21.50",
        "minecraft:entity": {
            "description": {
                "identifier": "auralis:nimbus_stag",
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False,
            },
            "components": {
                "minecraft:type_family": {"family": ["auralis", "nimbus_stag", "animal", "mob"]},
                "minecraft:collision_box": {"width": 0.95, "height": 1.7},
                "minecraft:health": {"value": 24, "max": 24},
                "minecraft:movement": {"value": 0.27},
                "minecraft:navigation.walk": {
                    "can_path_over_water": True,
                    "avoid_water": True,
                    "avoid_damage_blocks": True,
                },
                "minecraft:movement.basic": {},
                "minecraft:jump.static": {},
                "minecraft:physics": {},
                "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
                "minecraft:despawn": {"despawn_from_distance": {}},
                "minecraft:loot": {"table": "loot_tables/entities/nimbus_stag.json"},
                "minecraft:damage_sensor": {
                    "triggers": [{"cause": "fall", "deals_damage": "no"}]
                },
                "minecraft:behavior.float": {"priority": 0},
                "minecraft:behavior.panic": {"priority": 1, "speed_multiplier": 1.55},
                "minecraft:behavior.tempt": {
                    "priority": 2,
                    "speed_multiplier": 1.15,
                    "items": ["auralis:prism_berry"],
                    "within_radius": 14.0,
                },
                "minecraft:behavior.random_stroll": {"priority": 4, "speed_multiplier": 0.9},
                "minecraft:behavior.look_at_player": {"priority": 5, "look_distance": 10.0},
                "minecraft:behavior.random_look_around": {"priority": 6},
            },
        },
    })

    # --- 5. NEW Passive: Aurelia Cloud-Jelly (Ultra-Calm Bioluminescent Sky-Jellyfish) ---
    write_json(BP / "entities/tide_jelly.json", {
        "format_version": "1.21.50",
        "minecraft:entity": {
            "description": {
                "identifier": "auralis:tide_jelly",
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False,
            },
            "components": {
                "minecraft:type_family": {"family": ["auralis", "tide_jelly", "mob"]},
                "minecraft:collision_box": {"width": 0.85, "height": 1.2},
                "minecraft:health": {"value": 14, "max": 14},
                "minecraft:flying_speed": {"value": 0.055},
                "minecraft:movement": {"value": 0.08},
                "minecraft:navigation.hover": {
                    "can_path_over_water": True,
                    "can_sink": False,
                    "can_path_from_air": True,
                    "avoid_damage_blocks": True,
                },
                "minecraft:movement.hover": {"max_turn": 8.0},
                "minecraft:jump.static": {},
                "minecraft:can_fly": {},
                "minecraft:physics": {"has_gravity": False, "has_collision": True},
                "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
                "minecraft:despawn": {"despawn_from_distance": {}},
                "minecraft:loot": {"table": "loot_tables/entities/tide_jelly.json"},
                "minecraft:damage_sensor": {
                    "triggers": [{"cause": "fall", "deals_damage": "no"}]
                },
                "minecraft:behavior.random_hover": {
                    "priority": 2,
                    "xz_dist": 7,
                    "y_dist": 3,
                    "y_offset": 0,
                    "interval": 36,
                    "hover_height": [2, 6],
                },
                "minecraft:behavior.look_at_player": {"priority": 4, "look_distance": 8.0},
            },
        },
    })

    # --- 6. NEW Aggressive: Shard Stalker (Agile Crystalline Twilight Lynx Prowler) ---
    write_json(BP / "entities/shard_stalker.json", {
        "format_version": "1.21.50",
        "minecraft:entity": {
            "description": {
                "identifier": "auralis:shard_stalker",
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False,
            },
            "components": {
                "minecraft:type_family": {"family": ["auralis", "shard_stalker", "monster", "mob"]},
                "minecraft:collision_box": {"width": 0.9, "height": 1.05},
                "minecraft:health": {"value": 34, "max": 34},
                "minecraft:movement": {"value": 0.34},
                "minecraft:attack": {"damage": 6},
                "minecraft:follow_range": {"value": 28, "max": 28},
                "minecraft:navigation.walk": {
                    "can_path_over_water": True,
                    "avoid_water": True,
                    "avoid_damage_blocks": True,
                },
                "minecraft:movement.basic": {},
                "minecraft:jump.static": {},
                "minecraft:physics": {},
                "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
                "minecraft:despawn": {"despawn_from_distance": {}},
                "minecraft:loot": {"table": "loot_tables/entities/shard_stalker.json"},
                "minecraft:experience_reward": {"on_death": "12"},
                "minecraft:damage_sensor": {
                    "triggers": [{"cause": "fall", "deals_damage": "no"}]
                },
                "minecraft:behavior.float": {"priority": 0},
                "minecraft:behavior.hurt_by_target": {"priority": 1},
                "minecraft:behavior.nearest_attackable_target": {
                    "priority": 2,
                    "must_see": True,
                    "reselect_targets": True,
                    "within_radius": 22.0,
                    "entity_types": [
                        {
                            "filters": {"test": "is_family", "subject": "other", "value": "player"},
                            "max_dist": 22.0,
                        }
                    ],
                },
                "minecraft:behavior.leap_at_target": {"priority": 3, "yd": 0.42, "must_be_on_ground": True},
                "minecraft:behavior.melee_attack": {"priority": 4, "speed_multiplier": 1.25, "track_target": True},
                "minecraft:behavior.look_at_target": {"priority": 5},
                "minecraft:behavior.random_stroll": {"priority": 6, "speed_multiplier": 0.85},
                "minecraft:behavior.look_at_player": {"priority": 7, "look_distance": 10.0},
                "minecraft:behavior.random_look_around": {"priority": 8},
            },
        },
    })

    # --- 7. NEW Aggressive: Astral Weaver (Cloaked Hovering Ruin Spellcaster) ---
    write_json(BP / "entities/astral_weaver.json", {
        "format_version": "1.21.50",
        "minecraft:entity": {
            "description": {
                "identifier": "auralis:astral_weaver",
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False,
                "properties": {
                    "auralis:casting": {
                        "type": "bool",
                        "default": False,
                        "client_sync": True,
                    }
                },
            },
            "components": {
                "minecraft:type_family": {"family": ["auralis", "astral_weaver", "monster", "mob"]},
                "minecraft:collision_box": {"width": 0.85, "height": 2.1},
                "minecraft:health": {"value": 38, "max": 38},
                "minecraft:knockback_resistance": {"value": 0.30},
                "minecraft:flying_speed": {"value": 0.10},
                "minecraft:movement": {"value": 0.20},
                "minecraft:follow_range": {"value": 32, "max": 32},
                "minecraft:navigation.hover": {
                    "can_path_over_water": True,
                    "can_sink": False,
                    "can_path_from_air": True,
                    "avoid_damage_blocks": True,
                },
                "minecraft:movement.hover": {"max_turn": 25.0},
                "minecraft:jump.static": {},
                "minecraft:can_fly": {},
                "minecraft:physics": {"has_gravity": False, "has_collision": True},
                "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
                "minecraft:despawn": {"despawn_from_distance": {}},
                "minecraft:loot": {"table": "loot_tables/entities/astral_weaver.json"},
                "minecraft:experience_reward": {"on_death": "16"},
                "minecraft:shooter": {"def": "auralis:astral_bolt"},
                "minecraft:damage_sensor": {
                    "triggers": [{"cause": "fall", "deals_damage": "no"}]
                },
                "minecraft:behavior.hurt_by_target": {"priority": 1},
                "minecraft:behavior.nearest_attackable_target": {
                    "priority": 2,
                    "must_see": True,
                    "reselect_targets": True,
                    "within_radius": 26.0,
                    "entity_types": [
                        {
                            "filters": {"test": "is_family", "subject": "other", "value": "player"},
                            "max_dist": 26.0,
                        }
                    ],
                },
                "minecraft:behavior.look_at_target": {"priority": 2},
                "minecraft:behavior.ranged_attack": {
                    "priority": 3,
                    "attack_interval_min": 2.4,
                    "attack_interval_max": 3.4,
                    "attack_radius": 22.0,
                    "burst_shots": 1,
                    "charge_charged_trigger": 0.0,
                    "charge_shoot_trigger": 0.6,
                },
                "minecraft:behavior.random_hover": {
                    "priority": 5,
                    "xz_dist": 8,
                    "y_dist": 3,
                    "y_offset": 0,
                    "interval": 18,
                    "hover_height": [1, 3],
                },
                "minecraft:behavior.look_at_player": {"priority": 6, "look_distance": 18.0},
            },
        },
    })

    # --- 8. Gilded Sentinel (Controlled Hovering Temple Guardian — Blaze/Allay Hybrid!) ---
    write_json(BP / "entities/gilded_sentinel.json", {
        "format_version": "1.21.50",
        "minecraft:entity": {
            "description": {
                "identifier": "auralis:gilded_sentinel",
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False,
                "properties": {
                    "auralis:alert": {
                        "type": "bool",
                        "default": False,
                        "client_sync": True,
                    }
                },
            },
            "components": {
                "minecraft:type_family": {"family": ["auralis", "gilded_sentinel", "monster", "mob"]},
                "minecraft:collision_box": {"width": 1.0, "height": 2.3},
                "minecraft:health": {"value": 52, "max": 52},
                "minecraft:knockback_resistance": {"value": 0.45},
                "minecraft:flying_speed": {"value": 0.11},
                "minecraft:movement": {"value": 0.22},
                "minecraft:attack": {"damage": 7},
                "minecraft:follow_range": {"value": 36, "max": 36},
                "minecraft:navigation.hover": {
                    "can_path_over_water": True,
                    "can_sink": False,
                    "can_path_from_air": True,
                    "avoid_damage_blocks": True,
                },
                "minecraft:movement.hover": {"max_turn": 28.0},
                "minecraft:jump.static": {},
                "minecraft:can_fly": {},
                "minecraft:physics": {"has_gravity": False, "has_collision": True},
                "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
                "minecraft:despawn": {"despawn_from_distance": {}},
                "minecraft:loot": {"table": "loot_tables/entities/gilded_sentinel.json"},
                "minecraft:experience_reward": {"on_death": "18"},
                "minecraft:shooter": {"def": "auralis:astral_bolt"},
                "minecraft:damage_sensor": {
                    "triggers": [{"cause": "fall", "deals_damage": "no"}]
                },
                "minecraft:behavior.hurt_by_target": {"priority": 1},
                "minecraft:behavior.nearest_attackable_target": {
                    "priority": 2,
                    "must_see": True,
                    "reselect_targets": True,
                    "within_radius": 24.0,
                    "entity_types": [
                        {
                            "filters": {"test": "is_family", "subject": "other", "value": "player"},
                            "max_dist": 24.0,
                        }
                    ],
                },
                "minecraft:behavior.look_at_target": {"priority": 2},
                "minecraft:behavior.ranged_attack": {
                    "priority": 3,
                    "attack_interval_min": 2.2,
                    "attack_interval_max": 3.2,
                    "attack_radius": 20.0,
                    "burst_shots": 1,
                    "charge_charged_trigger": 0.0,
                    "charge_shoot_trigger": 0.5,
                },
                "minecraft:behavior.random_hover": {
                    "priority": 5,
                    "xz_dist": 8,
                    "y_dist": 3,
                    "y_offset": 0,
                    "interval": 16,
                    "hover_height": [1, 3],
                },
                "minecraft:behavior.look_at_player": {"priority": 6, "look_distance": 18.0},
            },
        },
    })

    # --- 9. THE ASTRAL SERAPH 2.0 (Arena-Tethered Script-Steered Boss with Synced Animation States!) ---
    write_json(BP / "entities/astral_seraph.json", {
        "format_version": "1.21.50",
        "minecraft:entity": {
            "description": {
                "identifier": "auralis:astral_seraph",
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False,
                "properties": {
                    "auralis:boss_state": {
                        "type": "int",
                        "range": [0, 4],
                        "default": 0,
                        "client_sync": True,
                    },
                    "auralis:boss_phase": {
                        "type": "int",
                        "range": [1, 3],
                        "default": 1,
                        "client_sync": True,
                    },
                },
            },
            "components": {
                "minecraft:type_family": {"family": ["auralis", "astral_seraph", "boss", "monster", "mob"]},
                "minecraft:boss": {
                    "name": "§e✦ §dThe Astral Seraph §e✦",
                    "hud_range": 72,
                    "should_darken_sky": False,
                },
                "minecraft:collision_box": {"width": 1.8, "height": 3.8},
                "minecraft:health": {"value": 360, "max": 360},
                "minecraft:knockback_resistance": {"value": 0.92},
                "minecraft:fire_immune": True,
                # Minimal native drift so our 10Hz Arena-Tethered Boss Controller owns flight & facing cleanly!
                "minecraft:flying_speed": {"value": 0.02},
                "minecraft:movement": {"value": 0.02},
                "minecraft:follow_range": {"value": 64, "max": 64},
                "minecraft:attack": {"damage": 10},
                "minecraft:can_fly": {},
                "minecraft:physics": {"has_gravity": False, "has_collision": True},
                "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
                "minecraft:persistent": {},
                "minecraft:loot": {"table": "loot_tables/entities/astral_seraph.json"},
                "minecraft:experience_reward": {"on_death": "250"},
                "minecraft:damage_sensor": {
                    "triggers": [
                        {"cause": "fall", "deals_damage": "no"},
                        {"cause": "drowning", "deals_damage": "no"},
                        {"cause": "suffocation", "deals_damage": "no"},
                    ]
                },
                "minecraft:behavior.hurt_by_target": {"priority": 1},
                "minecraft:behavior.nearest_attackable_target": {
                    "priority": 2,
                    "must_see": False,
                    "reselect_targets": True,
                    "within_radius": 56.0,
                    "entity_types": [
                        {
                            "filters": {"test": "is_family", "subject": "other", "value": "player"},
                            "max_dist": 56.0,
                        }
                    ],
                },
                "minecraft:behavior.look_at_target": {"priority": 1},
                "minecraft:behavior.look_at_player": {"priority": 2, "look_distance": 48.0},
            },
        },
    })

    # --- 10. Astral Bolt Projectile ---
    write_json(BP / "entities/astral_bolt.json", {
        "format_version": "1.21.50",
        "minecraft:entity": {
            "description": {
                "identifier": "auralis:astral_bolt",
                "is_spawnable": False,
                "is_summonable": True,
                "is_experimental": False,
            },
            "components": {
                "minecraft:collision_box": {"width": 0.4, "height": 0.4},
                "minecraft:projectile": {
                    "on_hit": {
                        "impact_damage": {"damage": 6, "knockback": True, "semi_random_diff_damage": False},
                        "particle_on_hit": {"particle_type": "endrod", "num_particles": 6, "on_entity_hit": True, "on_other_hit": True},
                        "remove_on_hit": {},
                    },
                    "power": 1.35,
                    "gravity": 0.002,
                    "inertia": 1.0,
                    "liquid_inertia": 0.95,
                    "uncertainty_base": 1.8,
                    "hit_sound": "auralis.crystal.step",
                },
                "minecraft:physics": {"has_gravity": False, "has_collision": True},
                "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
            },
        },
    })


def main():
    build_render_controller()
    build_geometries()
    build_animations()
    build_rp_entities()
    build_bp_entities()
    print("Generated all 10 custom Auralis v2 entities (BP + RP + 3D models + strict query.* animations + multi-state controllers)!")


if __name__ == "__main__":
    main()
