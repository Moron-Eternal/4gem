#!/usr/bin/env python3
"""
Generates all 6 Custom Entities for Auralis: The Prism-Tide Firmament:
  1. auralis:lumina_ray       (Graceful Celestial Sky-Manta — passive ambient glider)
  2. auralis:choir_wisp       (Porcelain & Gold Singing Lantern Spirit — curious guide)
  3. auralis:glass_crab       (Crystalline Sea-Glass Reef Crustacean — neutral defender)
  4. auralis:gilded_sentinel  (Floating Alabaster & Brass Temple Guardian — ranged/melee)
  5. auralis:astral_seraph    (Sovereign of the Glass Tide — 3-Phase Multi-Winged Boss!)
  6. auralis:astral_bolt      (Glowing Celestial Energy Projectile)

Outputs BP/entities/*.json, RP/models/entity/*.geo.json, RP/animations/*.animation.json,
RP/animation_controllers/*.animation_controllers.json, RP/entity/*.entity.json,
and RP/render_controllers/auralis_entity.render_controllers.json.
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
# 2. CUSTOM 3D ENTITY GEOMETRIES (UV-synced with tools/generate_textures.py)
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
                    "visible_bounds_width": 4.0,
                    "visible_bounds_height": 2.0,
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
                        "cubes": [
                            {"origin": [7, 5, -6], "size": [14, 2, 12], "uv": [0, 22]},
                        ],
                    },
                    {
                        "name": "wing_l_tip",
                        "parent": "wing_l",
                        "pivot": [21, 6, 0],
                        "cubes": [
                            {"origin": [21, 5.5, -4], "size": [8, 1, 8], "uv": [0, 22]},
                        ],
                    },
                    {
                        "name": "wing_r",
                        "parent": "root",
                        "pivot": [-7, 6, -1],
                        "cubes": [
                            {"origin": [-21, 5, -6], "size": [14, 2, 12], "uv": [0, 38]},
                        ],
                    },
                    {
                        "name": "wing_r_tip",
                        "parent": "wing_r",
                        "pivot": [-21, 6, 0],
                        "cubes": [
                            {"origin": [-29, 5.5, -4], "size": [8, 1, 8], "uv": [0, 38]},
                        ],
                    },
                    {
                        "name": "tail_1",
                        "parent": "root",
                        "pivot": [0, 6, 8],
                        "cubes": [
                            {"origin": [-1, 5, 8], "size": [2, 2, 10], "uv": [0, 52]},
                        ],
                    },
                    {
                        "name": "tail_2",
                        "parent": "tail_1",
                        "pivot": [0, 6, 18],
                        "cubes": [
                            {"origin": [-0.5, 5.5, 18], "size": [1, 1, 10], "uv": [0, 52]},
                        ],
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
                        "cubes": [
                            {"origin": [-5, 14, -4], "size": [10, 14, 8], "uv": [0, 0]},
                        ],
                    },
                    {
                        "name": "core",
                        "parent": "body",
                        "pivot": [0, 10, 0],
                        "rotation": [45, 45, 0],
                        "cubes": [
                            {"origin": [-3, 7, -3], "size": [6, 6, 6], "uv": [34, 24]},
                        ],
                    },
                    {
                        "name": "head",
                        "parent": "body",
                        "pivot": [0, 30, 0],
                        "cubes": [
                            {"origin": [-4, 29, -4], "size": [8, 8, 8], "uv": [0, 24]},
                        ],
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
                        "cubes": [
                            {"origin": [7, 14, -2.5], "size": [5, 12, 5], "uv": [38, 0]},
                        ],
                    },
                    {
                        "name": "arm_r",
                        "parent": "body",
                        "pivot": [-8, 25, 0],
                        "cubes": [
                            {"origin": [-12, 14, -2.5], "size": [5, 12, 5], "uv": [38, 0]},
                        ],
                    },
                ],
            }
        ],
    })

    # --- 5. astral_seraph (128x128) — Majestic Triple-Winged Astrolabe Boss! ---
    write_json(RP / "models/entity/astral_seraph.geo.json", {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.auralis_astral_seraph",
                    "texture_width": 128,
                    "texture_height": 128,
                    "visible_bounds_width": 6.5,
                    "visible_bounds_height": 6.0,
                    "visible_bounds_offset": [0, 2.6, 0],
                },
                "bones": [
                    {
                        "name": "root",
                        "pivot": [0, 32, 0],
                        "cubes": [
                            {"origin": [-8, 26, -6], "size": [16, 22, 12], "uv": [0, 0]},
                            {"origin": [-7, 8, -5], "size": [14, 18, 10], "uv": [60, 34]},
                        ],
                    },
                    {
                        "name": "star_heart",
                        "parent": "root",
                        "pivot": [0, 37, -7],
                        "rotation": [45, 45, 0],
                        "cubes": [
                            {"origin": [-5, 32, -12], "size": [10, 10, 10], "uv": [60, 10]},
                        ],
                    },
                    {
                        "name": "head",
                        "parent": "root",
                        "pivot": [0, 50, 0],
                        "cubes": [
                            {"origin": [-6, 50, -6], "size": [12, 12, 12], "uv": [0, 36]},
                        ],
                    },
                    {
                        "name": "halo_outer",
                        "parent": "root",
                        "pivot": [0, 44, 2],
                        "cubes": [
                            {"origin": [-16, 58, 1], "size": [32, 2, 2], "uv": [60, 0]},
                            {"origin": [-16, 28, 1], "size": [32, 2, 2], "uv": [60, 0]},
                            {"origin": [-16, 30, 1], "size": [2, 28, 2], "uv": [60, 0]},
                            {"origin": [14, 30, 1], "size": [2, 28, 2], "uv": [60, 0]},
                        ],
                    },
                    {
                        "name": "halo_inner",
                        "parent": "root",
                        "pivot": [0, 44, 2],
                        "rotation": [0, 0, 45],
                        "cubes": [
                            {"origin": [-12, 54, 1], "size": [24, 2, 2], "uv": [60, 0]},
                            {"origin": [-12, 32, 1], "size": [24, 2, 2], "uv": [60, 0]},
                            {"origin": [-12, 34, 1], "size": [2, 20, 2], "uv": [60, 0]},
                            {"origin": [10, 34, 1], "size": [2, 20, 2], "uv": [60, 0]},
                        ],
                    },
                    # Three pairs of majestic crystalline wings!
                    {
                        "name": "wing_top_l",
                        "parent": "root",
                        "pivot": [8, 46, 4],
                        "rotation": [0, -12, -20],
                        "cubes": [{"origin": [8, 43, 3], "size": [28, 8, 2], "uv": [0, 64]}],
                    },
                    {
                        "name": "wing_top_r",
                        "parent": "root",
                        "pivot": [-8, 46, 4],
                        "rotation": [0, 12, 20],
                        "cubes": [{"origin": [-36, 43, 3], "size": [28, 8, 2], "uv": [0, 64]}],
                    },
                    {
                        "name": "wing_mid_l",
                        "parent": "root",
                        "pivot": [8, 37, 5],
                        "rotation": [0, -18, 4],
                        "cubes": [{"origin": [8, 34, 4], "size": [24, 7, 2], "uv": [0, 78]}],
                    },
                    {
                        "name": "wing_mid_r",
                        "parent": "root",
                        "pivot": [-8, 37, 5],
                        "rotation": [0, 18, -4],
                        "cubes": [{"origin": [-32, 34, 4], "size": [24, 7, 2], "uv": [0, 78]}],
                    },
                    {
                        "name": "wing_low_l",
                        "parent": "root",
                        "pivot": [8, 28, 5],
                        "rotation": [0, -22, 26],
                        "cubes": [{"origin": [8, 25, 4], "size": [19, 6, 2], "uv": [0, 90]}],
                    },
                    {
                        "name": "wing_low_r",
                        "parent": "root",
                        "pivot": [-8, 28, 5],
                        "rotation": [0, 22, -26],
                        "cubes": [{"origin": [-27, 25, 4], "size": [19, 6, 2], "uv": [0, 90]}],
                    },
                    {
                        "name": "arm_l",
                        "parent": "root",
                        "pivot": [12, 42, 0],
                        "cubes": [{"origin": [11, 27, -3], "size": [6, 16, 6], "uv": [60, 64]}],
                    },
                    {
                        "name": "arm_r",
                        "parent": "root",
                        "pivot": [-12, 42, 0],
                        "cubes": [{"origin": [-17, 27, -3], "size": [6, 16, 6], "uv": [60, 64]}],
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
                        "cubes": [
                            {"origin": [-2.5, 1.5, -2.5], "size": [5, 5, 5], "uv": [0, 0]},
                        ],
                    }
                ],
            }
        ],
    })


# =============================================================================
# 3. FLUID MULTI-BONE ANIMATIONS & ANIMATION CONTROLLERS
# =============================================================================

def build_animations():
    write_json(RP / "animations/auralis_mobs.animation.json", {
        "format_version": "1.8.0",
        "animations": {
            "animation.auralis.lumina_ray.glide": {
                "loop": True,
                "bones": {
                    "root": {"position": [0, "math.sin(q.life_time * 90) * 1.4", 0]},
                    "wing_l": {"rotation": [0, 0, "math.sin(q.life_time * 130) * 20"]},
                    "wing_l_tip": {"rotation": [0, 0, "math.sin(q.life_time * 130 - 50) * 24"]},
                    "wing_r": {"rotation": [0, 0, "-math.sin(q.life_time * 130) * 20"]},
                    "wing_r_tip": {"rotation": [0, 0, "-math.sin(q.life_time * 130 - 50) * 24"]},
                    "tail_1": {"rotation": ["math.sin(q.life_time * 130 - 60) * 12", "math.cos(q.life_time * 80) * 8", 0]},
                    "tail_2": {"rotation": ["math.sin(q.life_time * 130 - 120) * 16", "math.cos(q.life_time * 80 - 60) * 12", 0]},
                },
            },
            "animation.auralis.choir_wisp.float": {
                "loop": True,
                "bones": {
                    "body": {"position": [0, "math.sin(q.life_time * 140) * 2.0", 0]},
                    "halo": {"rotation": ["math.sin(q.life_time * 80) * 10", "q.life_time * 75", 0]},
                    "petals": {"rotation": [0, "-q.life_time * 110", "math.sin(q.life_time * 90) * 8"]},
                },
            },
            "animation.auralis.glass_crab.walk": {
                "loop": True,
                "bones": {
                    "legs_l": {"rotation": ["math.sin(q.modified_distance_moved * 60) * 18", 0, 0]},
                    "legs_r": {"rotation": ["-math.sin(q.modified_distance_moved * 60) * 18", 0, 0]},
                    "claw_l": {"rotation": ["math.sin(q.life_time * 120) * 8", 0, 0]},
                    "claw_r": {"rotation": ["-math.sin(q.life_time * 120) * 8", 0, 0]},
                },
            },
            "animation.auralis.gilded_sentinel.hover": {
                "loop": True,
                "bones": {
                    "body": {"position": [0, "math.sin(q.life_time * 110) * 2.2", 0]},
                    "core": {"rotation": ["q.life_time * 65", "q.life_time * 95", 0]},
                    "halo": {"rotation": ["math.sin(q.life_time * 70) * 12", "q.life_time * 90", 0]},
                    "arm_l": {"position": [0, "math.sin(q.life_time * 110 + 90) * 1.5", 0]},
                    "arm_r": {"position": [0, "math.sin(q.life_time * 110 - 90) * 1.5", 0]},
                },
            },
            "animation.auralis.astral_seraph.majesty": {
                "loop": True,
                "bones": {
                    "root": {"position": [0, "math.sin(q.life_time * 80) * 3.0", 0]},
                    "star_heart": {"rotation": ["q.life_time * 55", "q.life_time * 85", 0]},
                    "halo_outer": {"rotation": [0, 0, "q.life_time * 38"]},
                    "halo_inner": {"rotation": ["math.sin(q.life_time * 45) * 14", "math.cos(q.life_time * 45) * 14", "-q.life_time * 58"]},
                    "wing_top_l": {"rotation": [0, "math.sin(q.life_time * 110) * 24", "-18 + math.sin(q.life_time * 110) * 14"]},
                    "wing_top_r": {"rotation": [0, "-math.sin(q.life_time * 110) * 24", "18 - math.sin(q.life_time * 110) * 14"]},
                    "wing_mid_l": {"rotation": [0, "math.sin(q.life_time * 110 - 45) * 22", "4 + math.sin(q.life_time * 110 - 45) * 12"]},
                    "wing_mid_r": {"rotation": [0, "-math.sin(q.life_time * 110 - 45) * 22", "-4 - math.sin(q.life_time * 110 - 45) * 12"]},
                    "wing_low_l": {"rotation": [0, "math.sin(q.life_time * 110 - 90) * 18", "24 + math.sin(q.life_time * 110 - 90) * 10"]},
                    "wing_low_r": {"rotation": [0, "-math.sin(q.life_time * 110 - 90) * 18", "-24 - math.sin(q.life_time * 110 - 90) * 10"]},
                    "arm_l": {"position": [0, "math.sin(q.life_time * 95 + 60) * 2.0", 0]},
                    "arm_r": {"position": [0, "math.sin(q.life_time * 95 - 60) * 2.0", 0]},
                },
            },
            "animation.auralis.astral_bolt.spin": {
                "loop": True,
                "bones": {
                    "bolt": {"rotation": ["q.life_time * 360", "q.life_time * 480", 0]},
                },
            },
        },
    })

    write_json(RP / "animation_controllers/auralis_mobs.animation_controllers.json", {
        "format_version": "1.10.0",
        "animation_controllers": {
            "controller.animation.auralis.always_active": {
                "initial_state": "active",
                "states": {
                    "active": {
                        "animations": ["main_anim"]
                    }
                },
            }
        },
    })


# =============================================================================
# 4. RP CLIENT ENTITIES (RP/entity/*.entity.json)
# =============================================================================

def build_rp_entities():
    specs = [
        ("lumina_ray", "geometry.auralis_lumina_ray", "animation.auralis.lumina_ray.glide", "#2EC8C8", "#FFE082", "auralis:manta_trail"),
        ("choir_wisp", "geometry.auralis_choir_wisp", "animation.auralis.choir_wisp.float", "#F5ECE0", "#FF9EB8", "auralis:wisp_notes"),
        ("glass_crab", "geometry.auralis_glass_crab", "animation.auralis.glass_crab.walk", "#E4DACB", "#52E6E2", None),
        ("gilded_sentinel", "geometry.auralis_gilded_sentinel", "animation.auralis.gilded_sentinel.hover", "#E6D294", "#5CF0F0", None),
        ("astral_seraph", "geometry.auralis_astral_seraph", "animation.auralis.astral_seraph.majesty", "#F4C95D", "#D67CFF", "auralis:ambient_motes"),
        ("astral_bolt", "geometry.auralis_astral_bolt", "animation.auralis.astral_bolt.spin", None, None, "auralis:sentinel_beam"),
    ]
    for name, geo, anim, egg_base, egg_over, particle in specs:
        desc = {
            "identifier": f"auralis:{name}",
            "materials": {"default": "entity_alphatest"},
            "textures": {"default": f"textures/entity/{name}"},
            "geometry": {"default": geo},
            "animations": {
                "main_anim": anim,
                "ctrl": "controller.animation.auralis.always_active",
            },
            "scripts": {"animate": ["ctrl"]},
            "render_controllers": ["controller.render.auralis_entity"],
        }
        if egg_base and egg_over:
            desc["spawn_egg"] = {"base_color": egg_base, "overlay_color": egg_over}
        if particle:
            desc["particle_effects"] = {"aura": particle}
        write_json(RP / "entity" / f"{name}.entity.json", {
            "format_version": "1.10.0",
            "minecraft:client_entity": {"description": desc},
        })


# =============================================================================
# 5. BP ENTITY BEHAVIORS (BP/entities/*.json — Clean 1.21.50 Schema!)
# =============================================================================

def build_bp_entities():
    # --- 1. Lumina Ray (Serene Sky-Manta Glider) ---
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
                "minecraft:flying_speed": {"value": 0.14},
                "minecraft:movement": {"value": 0.28},
                "minecraft:navigation.float": {"can_path_over_water": True},
                "minecraft:movement.hover": {},
                "minecraft:jump.static": {},
                "minecraft:can_fly": {},
                "minecraft:physics": {"has_gravity": False, "has_collision": True},
                "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
                "minecraft:loot": {"table": "loot_tables/entities/lumina_ray.json"},
                "minecraft:damage_sensor": {
                    "triggers": [{"cause": "fall", "deals_damage": "no"}]
                },
                "minecraft:behavior.float_wander": {
                    "priority": 1,
                    "xz_dist": 24,
                    "y_dist": 8,
                    "y_offset": 2.0,
                    "random_reselect": True,
                    "float_duration": [3.0, 7.0],
                },
                "minecraft:behavior.tempt": {
                    "priority": 0,
                    "speed_multiplier": 1.2,
                    "items": ["auralis:prism_berry"],
                    "within_radius": 14.0,
                },
                "minecraft:behavior.look_at_player": {"priority": 3, "look_distance": 12.0},
            },
        },
    })

    # --- 2. Choir Wisp (Curious Friendly Lantern-Bell Spirit) ---
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
                "minecraft:flying_speed": {"value": 0.16},
                "minecraft:movement": {"value": 0.25},
                "minecraft:navigation.float": {"can_path_over_water": True},
                "minecraft:movement.hover": {},
                "minecraft:jump.static": {},
                "minecraft:can_fly": {},
                "minecraft:physics": {"has_gravity": False, "has_collision": True},
                "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
                "minecraft:loot": {"table": "loot_tables/entities/choir_wisp.json"},
                "minecraft:damage_sensor": {
                    "triggers": [{"cause": "fall", "deals_damage": "no"}]
                },
                "minecraft:behavior.tempt": {
                    "priority": 1,
                    "speed_multiplier": 1.35,
                    "items": ["auralis:tuning_fork", "auralis:solarium_ingot", "auralis:astral_lyre"],
                    "within_radius": 18.0,
                },
                "minecraft:behavior.float_wander": {
                    "priority": 2,
                    "xz_dist": 14,
                    "y_dist": 5,
                    "y_offset": 1.0,
                    "random_reselect": True,
                    "float_duration": [2.0, 5.0],
                },
                "minecraft:behavior.look_at_player": {"priority": 3, "look_distance": 10.0},
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
                "minecraft:loot": {"table": "loot_tables/entities/glass_crab.json"},
                "minecraft:behavior.hurt_by_target": {"priority": 1},
                "minecraft:behavior.melee_attack": {"priority": 2, "speed_multiplier": 1.35, "track_target": True},
                "minecraft:behavior.random_stroll": {"priority": 4, "speed_multiplier": 0.85},
                "minecraft:behavior.look_at_player": {"priority": 5, "look_distance": 8.0},
                "minecraft:behavior.random_look_around": {"priority": 6},
            },
        },
    })

    # --- 4. Gilded Sentinel (Hostile Floating Temple Guardian) ---
    write_json(BP / "entities/gilded_sentinel.json", {
        "format_version": "1.21.50",
        "minecraft:entity": {
            "description": {
                "identifier": "auralis:gilded_sentinel",
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False,
            },
            "components": {
                "minecraft:type_family": {"family": ["auralis", "gilded_sentinel", "monster", "mob"]},
                "minecraft:collision_box": {"width": 1.0, "height": 2.3},
                "minecraft:health": {"value": 56, "max": 56},
                "minecraft:knockback_resistance": {"value": 0.45},
                "minecraft:flying_speed": {"value": 0.14},
                "minecraft:movement": {"value": 0.27},
                "minecraft:attack": {"damage": 7},
                "minecraft:navigation.hover": {"can_path_over_water": True, "can_path_from_air": True},
                "minecraft:movement.hover": {},
                "minecraft:jump.static": {},
                "minecraft:can_fly": {},
                "minecraft:physics": {"has_gravity": False, "has_collision": True},
                "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
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
                    "within_radius": 22.0,
                    "entity_types": [
                        {
                            "filters": {"test": "is_family", "subject": "other", "value": "player"},
                            "max_dist": 22.0,
                        }
                    ],
                },
                "minecraft:behavior.ranged_attack": {
                    "priority": 3,
                    "attack_interval_min": 2.2,
                    "attack_interval_max": 3.4,
                    "attack_radius": 18.0,
                    "burst_shots": 1,
                },
                "minecraft:behavior.float_wander": {
                    "priority": 5,
                    "xz_dist": 12,
                    "y_dist": 4,
                    "y_offset": 1.5,
                    "random_reselect": True,
                    "float_duration": [2.0, 5.0],
                },
                "minecraft:behavior.look_at_player": {"priority": 6, "look_distance": 16.0},
            },
        },
    })

    # --- 5. THE ASTRAL SERAPH (Epic Multi-Phase Boss!) ---
    write_json(BP / "entities/astral_seraph.json", {
        "format_version": "1.21.50",
        "minecraft:entity": {
            "description": {
                "identifier": "auralis:astral_seraph",
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False,
            },
            "components": {
                "minecraft:type_family": {"family": ["auralis", "astral_seraph", "boss", "monster", "mob"]},
                "minecraft:boss": {
                    "name": "§e✦ §dThe Astral Seraph §e✦",
                    "hud_range": 72,
                    "should_darken_sky": False,
                },
                "minecraft:collision_box": {"width": 2.0, "height": 3.8},
                "minecraft:health": {"value": 360, "max": 360},
                "minecraft:knockback_resistance": {"value": 0.85},
                "minecraft:fire_immune": True,
                "minecraft:flying_speed": {"value": 0.22},
                "minecraft:movement": {"value": 0.34},
                "minecraft:attack": {"damage": 11},
                "minecraft:navigation.hover": {"can_path_over_water": True, "can_path_from_air": True},
                "minecraft:movement.hover": {},
                "minecraft:jump.static": {},
                "minecraft:can_fly": {},
                "minecraft:physics": {"has_gravity": False, "has_collision": True},
                "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
                "minecraft:persistent": {},
                "minecraft:loot": {"table": "loot_tables/entities/astral_seraph.json"},
                "minecraft:experience_reward": {"on_death": "250"},
                "minecraft:shooter": {"def": "auralis:astral_bolt"},
                "minecraft:damage_sensor": {
                    "triggers": [
                        {"cause": "fall", "deals_damage": "no"},
                        {"cause": "drowning", "deals_damage": "no"},
                    ]
                },
                "minecraft:behavior.hurt_by_target": {"priority": 1},
                "minecraft:behavior.nearest_attackable_target": {
                    "priority": 2,
                    "must_see": False,
                    "reselect_targets": True,
                    "within_radius": 48.0,
                    "entity_types": [
                        {
                            "filters": {"test": "is_family", "subject": "other", "value": "player"},
                            "max_dist": 48.0,
                        }
                    ],
                },
                "minecraft:behavior.ranged_attack": {
                    "priority": 3,
                    "attack_interval_min": 1.6,
                    "attack_interval_max": 2.4,
                    "attack_radius": 32.0,
                    "burst_shots": 3,
                    "burst_interval": 0.25,
                },
                "minecraft:behavior.float_wander": {
                    "priority": 5,
                    "xz_dist": 16,
                    "y_dist": 6,
                    "y_offset": 3.0,
                    "random_reselect": True,
                    "float_duration": [2.0, 4.0],
                },
                "minecraft:behavior.look_at_player": {"priority": 6, "look_distance": 36.0},
            },
        },
    })

    # --- 6. Astral Bolt Projectile ---
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
                "minecraft:collision_box": {"width": 0.35, "height": 0.35},
                "minecraft:projectile": {
                    "on_hit": {
                        "impact_damage": {"damage": 6, "knockback": True, "semi_random_diff_damage": False},
                        "particle_on_hit": {"particle_type": "endrod", "num_particles": 8, "on_entity_hit": True, "on_other_hit": True},
                        "remove_on_hit": {},
                    },
                    "power": 1.45,
                    "gravity": 0.005,
                    "inertia": 1.0,
                    "liquid_inertia": 0.95,
                    "uncertainty_base": 2.5,
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
    print("Generated all 6 custom Auralis entities (BP + RP + 3D models + animations + controllers)!")


if __name__ == "__main__":
    main()
