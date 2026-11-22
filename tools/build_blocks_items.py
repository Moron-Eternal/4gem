#!/usr/bin/env python3
"""
Generates all Behavior Pack Block JSONs (17), Item JSONs (12),
Recipes (16), and Loot Tables (12) for Auralis: The Prism-Tide Firmament.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BP = ROOT / "packs" / "BP"


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


# =============================================================================
# 1. SEVENTEEN CUSTOM BLOCKS (BP/blocks/*.json)
# =============================================================================

def build_blocks():
    def full_block(
        name,
        category,
        texture,
        destroy_time,
        explosion_res,
        map_color,
        light_emit=0,
        light_damp=15,
        render_method="opaque",
        loot=None,
        extra_components=None,
        face_textures=None,
        tags=None,
    ):
        if face_textures:
            mats = {
                k: {"texture": v, "render_method": render_method}
                for k, v in face_textures.items()
            }
        else:
            mats = {"*": {"texture": texture, "render_method": render_method}}

        comps = {
            "minecraft:geometry": "minecraft:geometry.full_block",
            "minecraft:material_instances": mats,
            "minecraft:destructible_by_mining": {"seconds_to_destroy": destroy_time},
            "minecraft:destructible_by_explosion": {"explosion_resistance": explosion_res},
            "minecraft:light_emission": light_emit,
            "minecraft:light_dampening": light_damp,
            "minecraft:map_color": map_color,
        }
        if loot:
            comps["minecraft:loot"] = f"loot_tables/blocks/{loot}.json"
        if tags:
            for t in tags:
                comps[f"tag:{t}"] = {}
        if extra_components:
            comps.update(extra_components)

        return {
            "format_version": "1.21.90",
            "minecraft:block": {
                "description": {
                    "identifier": f"auralis:{name}",
                    "menu_category": {"category": category},
                },
                "components": comps,
            },
        }

    blocks = {
        "auralite_stone": full_block(
            "auralite_stone", "nature", "auralis_auralite_stone",
            destroy_time=1.4, explosion_res=6.0, map_color="#E8DFD2",
            tags=["minecraft:is_pickaxe_item_destructible", "stone"],
        ),
        "starstone": full_block(
            "starstone", "nature", "auralis_starstone",
            destroy_time=2.2, explosion_res=8.0, map_color="#23284D",
            light_emit=2,
            tags=["minecraft:is_pickaxe_item_destructible", "stone"],
        ),
        "tide_moss": full_block(
            "tide_moss", "nature", None,
            destroy_time=0.8, explosion_res=3.0, map_color="#48CFC5",
            light_emit=2,
            face_textures={
                "up": "auralis_tide_moss_top",
                "down": "auralis_auralite_stone",
                "*": "auralis_tide_moss_side",
            },
            tags=["minecraft:is_hoe_item_destructible", "minecraft:is_pickaxe_item_destructible"],
        ),
        "gilded_travertine": full_block(
            "gilded_travertine", "construction", "auralis_gilded_travertine",
            destroy_time=1.8, explosion_res=8.0, map_color="#E6D2A8",
            light_emit=3,
            tags=["minecraft:is_pickaxe_item_destructible", "stone"],
        ),
        "solarium_ore": full_block(
            "solarium_ore", "nature", "auralis_solarium_ore",
            destroy_time=3.0, explosion_res=6.0, map_color="#D9A744",
            light_emit=9, loot="solarium_ore",
            tags=["minecraft:is_pickaxe_item_destructible", "minecraft:iron_tier_destructible"],
        ),
        "solarium_block": full_block(
            "solarium_block", "construction", "auralis_solarium_block",
            destroy_time=3.2, explosion_res=10.0, map_color="#F5C95A",
            light_emit=12,
            tags=["minecraft:is_pickaxe_item_destructible", "metal"],
        ),
        "prism_planks": full_block(
            "prism_planks", "construction", "auralis_prism_planks",
            destroy_time=1.2, explosion_res=3.0, map_color="#D8E5E3",
            light_emit=1,
            tags=["minecraft:is_axe_item_destructible", "wood"],
        ),
        "prism_leaves": full_block(
            "prism_leaves", "nature", "auralis_prism_leaves",
            destroy_time=0.3, explosion_res=0.5, map_color="#5DDCD2",
            light_emit=6, light_damp=1, render_method="alpha_test",
            loot="prism_leaves",
            tags=["minecraft:is_hoe_item_destructible", "minecraft:is_shears_item_destructible"],
        ),
        "starlight_glass": full_block(
            "starlight_glass", "construction", "auralis_starlight_glass",
            destroy_time=0.5, explosion_res=1.5, map_color="#8CE8EE",
            light_emit=3, light_damp=0, render_method="blend",
            tags=["minecraft:is_pickaxe_item_destructible"],
        ),
        "gilded_brass": full_block(
            "gilded_brass", "construction", "auralis_gilded_brass",
            destroy_time=2.6, explosion_res=9.0, map_color="#D9A84C",
            light_emit=2,
            tags=["minecraft:is_pickaxe_item_destructible", "metal"],
        ),
        "cloudstone": full_block(
            "cloudstone", "nature", "auralis_cloudstone",
            destroy_time=0.45, explosion_res=1.5, map_color="#F0ECF4",
            light_emit=3, light_damp=8,
            extra_components={"auralis:cloud_cushion": {}},
            tags=["minecraft:is_shovel_item_destructible", "minecraft:is_hoe_item_destructible"],
        ),
        "rose_cloud": full_block(
            "rose_cloud", "nature", "auralis_rose_cloud",
            destroy_time=0.45, explosion_res=1.5, map_color="#F4B8C4",
            light_emit=5, light_damp=8,
            extra_components={"auralis:cloud_cushion": {}},
            tags=["minecraft:is_shovel_item_destructible", "minecraft:is_hoe_item_destructible"],
        ),
        "cloud_vent": full_block(
            "cloud_vent", "construction", "auralis_cloud_vent",
            destroy_time=1.4, explosion_res=6.0, map_color="#9EE8EE",
            light_emit=11, light_damp=0,
            extra_components={"auralis:cloud_vent_updraft": {}},
            tags=["minecraft:is_pickaxe_item_destructible"],
        ),
        "starlight_veil": {
            "format_version": "1.21.90",
            "minecraft:block": {
                "description": {
                    "identifier": "auralis:starlight_veil",
                    "menu_category": {"category": "nature"},
                },
                "components": {
                    "minecraft:geometry": "minecraft:geometry.full_block",
                    "minecraft:material_instances": {
                        "*": {
                            "texture": "auralis_starlight_veil",
                            "render_method": "blend",
                            "ambient_occlusion": False,
                            "face_dimming": False,
                        }
                    },
                    "minecraft:collision_box": False,
                    "minecraft:selection_box": {"origin": [-8, 0, -8], "size": [16, 12, 16]},
                    "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.4},
                    "minecraft:destructible_by_explosion": {"explosion_resistance": 12.0},
                    "minecraft:light_emission": 15,
                    "minecraft:light_dampening": 0,
                    "minecraft:map_color": "#8DF2F5",
                    "auralis:veil_water": {},
                },
            },
        },
        # Rotatable Prism Log pillar!
        "prism_log": {
            "format_version": "1.21.90",
            "minecraft:block": {
                "description": {
                    "identifier": "auralis:prism_log",
                    "menu_category": {"category": "nature"},
                    "traits": {
                        "minecraft:placement_position": {
                            "enabled_states": ["minecraft:block_face"]
                        }
                    },
                },
                "components": {
                    "minecraft:geometry": "minecraft:geometry.full_block",
                    "minecraft:material_instances": {
                        "up": {"texture": "auralis_prism_log_top", "render_method": "opaque"},
                        "down": {"texture": "auralis_prism_log_top", "render_method": "opaque"},
                        "*": {"texture": "auralis_prism_log_side", "render_method": "opaque"},
                    },
                    "minecraft:destructible_by_mining": {"seconds_to_destroy": 1.6},
                    "minecraft:destructible_by_explosion": {"explosion_resistance": 3.0},
                    "minecraft:light_emission": 4,
                    "minecraft:map_color": "#ABA2C4",
                    "tag:minecraft:is_axe_item_destructible": {},
                    "tag:wood": {},
                    "tag:log": {},
                },
                "permutations": [
                    {
                        "condition": "q.block_state('minecraft:block_face') == 'north' || q.block_state('minecraft:block_face') == 'south'",
                        "components": {"minecraft:transformation": {"rotation": [90, 0, 0]}},
                    },
                    {
                        "condition": "q.block_state('minecraft:block_face') == 'east' || q.block_state('minecraft:block_face') == 'west'",
                        "components": {"minecraft:transformation": {"rotation": [0, 0, 90]}},
                    },
                ],
            },
        },
        # 3D Custom Sea-Crystal Cluster
        "sea_crystal": {
            "format_version": "1.21.90",
            "minecraft:block": {
                "description": {
                    "identifier": "auralis:sea_crystal",
                    "menu_category": {"category": "nature"},
                },
                "components": {
                    "minecraft:geometry": "geometry.auralis_sea_crystal",
                    "minecraft:material_instances": {
                        "*": {
                            "texture": "auralis_sea_crystal",
                            "render_method": "alpha_test",
                            "ambient_occlusion": False,
                            "face_dimming": False,
                        }
                    },
                    "minecraft:collision_box": {"origin": [-4, 0, -4], "size": [8, 12, 8]},
                    "minecraft:selection_box": {"origin": [-5, 0, -5], "size": [10, 14, 10]},
                    "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.9},
                    "minecraft:destructible_by_explosion": {"explosion_resistance": 2.0},
                    "minecraft:light_emission": 13,
                    "minecraft:light_dampening": 0,
                    "minecraft:map_color": "#6CECE8",
                    "minecraft:loot": "loot_tables/blocks/sea_crystal.json",
                    "auralis:chime_block": {"pitch": 1.15},
                    "tag:minecraft:is_pickaxe_item_destructible": {},
                },
            },
        },
        # 3D Custom Lantern Bloom
        "lantern_bloom": {
            "format_version": "1.21.90",
            "minecraft:block": {
                "description": {
                    "identifier": "auralis:lantern_bloom",
                    "menu_category": {"category": "items"},
                },
                "components": {
                    "minecraft:geometry": "geometry.auralis_lantern_bloom",
                    "minecraft:material_instances": {
                        "*": {
                            "texture": "auralis_lantern_bloom",
                            "render_method": "opaque",
                            "ambient_occlusion": False,
                            "face_dimming": False,
                        }
                    },
                    "minecraft:collision_box": {"origin": [-4.5, 0, -4.5], "size": [9, 13, 9]},
                    "minecraft:selection_box": {"origin": [-5, 0, -5], "size": [10, 15, 10]},
                    "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.6},
                    "minecraft:destructible_by_explosion": {"explosion_resistance": 2.0},
                    "minecraft:light_emission": 15,
                    "minecraft:light_dampening": 0,
                    "minecraft:map_color": "#FFB87C",
                    "tag:minecraft:is_pickaxe_item_destructible": {},
                },
            },
        },
        # 3D Custom Singing Chime-Reed (non-solid botanical wind-chime!)
        "chime_reed": {
            "format_version": "1.21.90",
            "minecraft:block": {
                "description": {
                    "identifier": "auralis:chime_reed",
                    "menu_category": {"category": "nature"},
                },
                "components": {
                    "minecraft:geometry": "geometry.auralis_chime_reed",
                    "minecraft:material_instances": {
                        "*": {
                            "texture": "auralis_chime_reed",
                            "render_method": "alpha_test",
                            "ambient_occlusion": False,
                            "face_dimming": False,
                        }
                    },
                    "minecraft:collision_box": False,
                    "minecraft:selection_box": {"origin": [-6, 0, -6], "size": [12, 16, 12]},
                    "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.2},
                    "minecraft:destructible_by_explosion": {"explosion_resistance": 0.5},
                    "minecraft:light_emission": 5,
                    "minecraft:light_dampening": 0,
                    "minecraft:map_color": "#F5D992",
                    "auralis:chime_block": {"pitch": 1.35},
                },
            },
        },
        # 3D Custom Celestial Astrolabe Pedestal (Portal Gateway with dormant & attuned states!)
        "astrolabe_pedestal": {
            "format_version": "1.21.90",
            "minecraft:block": {
                "description": {
                    "identifier": "auralis:astrolabe_pedestal",
                    "menu_category": {"category": "items"},
                    "states": {
                        "auralis:attuned": [False, True]
                    },
                },
                "components": {
                    "minecraft:geometry": "geometry.auralis_astrolabe_pedestal",
                    "minecraft:material_instances": {
                        "*": {
                            "texture": "auralis_astrolabe_pedestal",
                            "render_method": "opaque",
                            "ambient_occlusion": False,
                            "face_dimming": False,
                        }
                    },
                    "minecraft:collision_box": {"origin": [-7, 0, -7], "size": [14, 12, 14]},
                    "minecraft:selection_box": {"origin": [-7, 0, -7], "size": [14, 16, 14]},
                    "minecraft:destructible_by_mining": {"seconds_to_destroy": 2.5},
                    "minecraft:destructible_by_explosion": {"explosion_resistance": 1200.0},
                    "minecraft:light_emission": 6,
                    "minecraft:light_dampening": 0,
                    "minecraft:map_color": "#E6BD63",
                    "auralis:astrolabe_gateway": {},
                    "tag:minecraft:is_pickaxe_item_destructible": {},
                },
                "permutations": [
                    {
                        "condition": "q.block_state('auralis:attuned') == true",
                        "components": {
                            "minecraft:material_instances": {
                                "*": {
                                    "texture": "auralis_astrolabe_pedestal_attuned",
                                    "render_method": "opaque",
                                    "ambient_occlusion": False,
                                    "face_dimming": False,
                                }
                            },
                            "minecraft:light_emission": 15,
                        },
                    }
                ],
            },
        },
        # 3D Custom Vespera Altar (Boss Summoning Dais!)
        "vespera_altar": {
            "format_version": "1.21.90",
            "minecraft:block": {
                "description": {
                    "identifier": "auralis:vespera_altar",
                    "menu_category": {"category": "items"},
                },
                "components": {
                    "minecraft:geometry": "geometry.auralis_vespera_altar",
                    "minecraft:material_instances": {
                        "*": {
                            "texture": "auralis_vespera_altar",
                            "render_method": "opaque",
                            "ambient_occlusion": False,
                            "face_dimming": False,
                        }
                    },
                    "minecraft:collision_box": {"origin": [-8, 0, -8], "size": [16, 12, 16]},
                    "minecraft:selection_box": {"origin": [-8, 0, -8], "size": [16, 16, 16]},
                    "minecraft:destructible_by_mining": {"seconds_to_destroy": 8.0},
                    "minecraft:destructible_by_explosion": {"explosion_resistance": 1200.0},
                    "minecraft:light_emission": 14,
                    "minecraft:light_dampening": 0,
                    "minecraft:map_color": "#B878F0",
                    "auralis:vespera_altar": {},
                    "tag:minecraft:is_pickaxe_item_destructible": {},
                },
            },
        },
    }

    for name, data in blocks.items():
        write_json(BP / "blocks" / f"{name}.json", data)
    return len(blocks)


# =============================================================================
# 2. TWELVE CUSTOM ITEMS (BP/items/*.json)
# =============================================================================

def build_items():
    def item_def(name, category, stack=64, glint=False, hand_equipped=False, extra=None):
        comps = {
            "minecraft:icon": {"textures": {"default": f"auralis_{name}"}},
            "minecraft:display_name": {"value": f"item.auralis:{name}.name"},
            "minecraft:max_stack_size": stack,
        }
        if glint:
            comps["minecraft:glint"] = True
        if hand_equipped:
            comps["minecraft:hand_equipped"] = True
        if extra:
            comps.update(extra)
        return {
            "format_version": "1.21.90",
            "minecraft:item": {
                "description": {
                    "identifier": f"auralis:{name}",
                    "menu_category": {"category": category},
                },
                "components": comps,
            },
        }

    items = {
        "tuning_fork": item_def(
            "tuning_fork", "equipment", stack=1, glint=True, hand_equipped=True,
            extra={
                "minecraft:cooldown": {"category": "auralis_tuning_fork", "duration": 2.0},
                "auralis:tuning_fork_use": {},
            },
        ),
        "raw_solarium": item_def("raw_solarium", "items", stack=64),
        "solarium_ingot": item_def("solarium_ingot", "items", stack=64, glint=False),
        "prism_shard": item_def("prism_shard", "items", stack=64),
        "prism_berry": item_def(
            "prism_berry", "nature", stack=64,
            extra={
                "minecraft:food": {"nutrition": 4, "saturation_modifier": 0.65, "can_always_eat": True},
                "minecraft:use_modifiers": {"use_duration": 1.2, "movement_modifier": 0.45},
                "minecraft:use_animation": "eat",
                "auralis:prism_berry_eat": {},
            },
        ),
        "celestial_nectar": item_def(
            "celestial_nectar", "nature", stack=16, glint=True,
            extra={
                "minecraft:food": {"nutrition": 6, "saturation_modifier": 1.1, "can_always_eat": True},
                "minecraft:use_modifiers": {"use_duration": 1.4, "movement_modifier": 0.4},
                "minecraft:use_animation": "drink",
                "auralis:celestial_nectar_drink": {},
            },
        ),
        "resonant_star_core": item_def(
            "resonant_star_core", "items", stack=16, glint=True,
            extra={
                "auralis:star_core_use": {},
            },
        ),
        "solarium_pickaxe": item_def(
            "solarium_pickaxe", "equipment", stack=1, hand_equipped=True,
            extra={
                "minecraft:durability": {"max_durability": 1450},
                "minecraft:damage": 5,
                "minecraft:enchantable": {"value": 18, "slot": "pickaxe"},
                "minecraft:repairable": {
                    "repair_items": [{"items": ["auralis:solarium_ingot"], "repair_amount": "context.other->q.remaining_durability + 0.35 * context.other->q.max_durability"}]
                },
                "minecraft:digger": {
                    "use_efficiency": True,
                    "destroy_speeds": [
                        {"block": {"tags": "q.any_tag('stone', 'metal', 'diamond_pick_diggable', 'iron_pick_diggable', 'minecraft:is_pickaxe_item_destructible')"}, "speed": 9},
                        {"block": "auralis:auralite_stone", "speed": 10},
                        {"block": "auralis:starstone", "speed": 10},
                        {"block": "auralis:solarium_ore", "speed": 10},
                        {"block": "auralis:gilded_travertine", "speed": 10},
                        {"block": "auralis:gilded_brass", "speed": 10},
                    ],
                },
                "minecraft:tags": {"tags": ["minecraft:is_pickaxe", "minecraft:is_tool", "minecraft:diamond_tier"]},
            },
        ),
        "starblade": item_def(
            "starblade", "equipment", stack=1, glint=True, hand_equipped=True,
            extra={
                "minecraft:durability": {"max_durability": 2200},
                "minecraft:damage": 10,
                "minecraft:enchantable": {"value": 22, "slot": "sword"},
                "minecraft:cooldown": {"category": "auralis_starblade", "duration": 3.5},
                "minecraft:tags": {"tags": ["minecraft:is_sword", "minecraft:is_tool"]},
                "auralis:starblade_use": {},
            },
        ),
        "tide_glider_charm": item_def(
            "tide_glider_charm", "equipment", stack=1, glint=True, hand_equipped=False,
            extra={
                "minecraft:cooldown": {"category": "auralis_gale_prism", "duration": 3.0},
                "auralis:gale_prism_use": {},
            },
        ),
        "astral_lyre": item_def(
            "astral_lyre", "equipment", stack=1, glint=True, hand_equipped=True,
            extra={
                "minecraft:cooldown": {"category": "auralis_lyre", "duration": 2.5},
                "auralis:astral_lyre_use": {},
            },
        ),
        "chronicle_of_auralis": item_def(
            "chronicle_of_auralis", "items", stack=1, glint=True,
            extra={
                "auralis:codex_use": {},
            },
        ),
    }

    for name, data in items.items():
        write_json(BP / "items" / f"{name}.json", data)
    return len(items)


# =============================================================================
# 3. SIXTEEN CRAFTING & SMELTING RECIPES (BP/recipes/*.json)
# =============================================================================

def build_recipes():
    def shaped(rid, pattern, key, result_item, count=1, unlock=None):
        unlock_list = [{"item": u} for u in (unlock or [next(iter(key.values()))["item"]])]
        return {
            "format_version": "1.20.10",
            "minecraft:recipe_shaped": {
                "description": {"identifier": f"auralis:{rid}"},
                "tags": ["crafting_table"],
                "pattern": pattern,
                "key": key,
                "unlock": unlock_list,
                "result": {"item": result_item, "count": count},
            },
        }

    def shapeless(rid, ingredients, result_item, count=1, unlock=None):
        return {
            "format_version": "1.20.10",
            "minecraft:recipe_shapeless": {
                "description": {"identifier": f"auralis:{rid}"},
                "tags": ["crafting_table"],
                "ingredients": [{"item": i} for i in ingredients],
                "unlock": [{"item": unlock or ingredients[0]}],
                "result": {"item": result_item, "count": count},
            },
        }

    def smelt(rid, inp, out):
        return {
            "format_version": "1.20.10",
            "minecraft:recipe_furnace": {
                "description": {"identifier": f"auralis:{rid}"},
                "tags": ["furnace", "blast_furnace"],
                "input": inp,
                "output": out,
            },
        }

    recipes = {
        # Overworld entry items — accessible & thematic!
        "tuning_fork": shaped(
            "tuning_fork",
            ["A A", "GCG", " G "],
            {
                "A": {"item": "minecraft:amethyst_shard"},
                "G": {"item": "minecraft:gold_ingot"},
                "C": {"item": "minecraft:copper_ingot"},
            },
            "auralis:tuning_fork", 1,
            unlock=["minecraft:amethyst_shard", "minecraft:gold_ingot"],
        ),
        "astrolabe_pedestal": shaped(
            "astrolabe_pedestal",
            ["GAG", "QEQ", "QQQ"],
            {
                "G": {"item": "minecraft:gold_ingot"},
                "A": {"item": "minecraft:amethyst_shard"},
                "Q": {"item": "minecraft:quartz_block"},
                "E": {"item": "minecraft:ender_pearl"},
            },
            "auralis:astrolabe_pedestal", 1,
            unlock=["minecraft:amethyst_shard", "minecraft:ender_pearl"],
        ),
        "chronicle_of_auralis": shapeless(
            "chronicle_of_auralis",
            ["minecraft:book", "minecraft:amethyst_shard"],
            "auralis:chronicle_of_auralis", 1,
            unlock="minecraft:book",
        ),
        # Auralis material smelting & building blocks
        "smelt_solarium": smelt("smelt_solarium", "auralis:raw_solarium", "auralis:solarium_ingot"),
        "prism_planks": shapeless(
            "prism_planks",
            ["auralis:prism_log"],
            "auralis:prism_planks", 4,
            unlock="auralis:prism_log",
        ),
        "solarium_block": shaped(
            "solarium_block",
            ["SSS", "SSS", "SSS"],
            {"S": {"item": "auralis:solarium_ingot"}},
            "auralis:solarium_block", 1,
        ),
        "solarium_ingots_from_block": shapeless(
            "solarium_ingots_from_block",
            ["auralis:solarium_block"],
            "auralis:solarium_ingot", 9,
        ),
        "gilded_travertine": shaped(
            "gilded_travertine",
            ["ASA", "SPS", "ASA"],
            {
                "A": {"item": "auralis:auralite_stone"},
                "S": {"item": "auralis:solarium_ingot"},
                "P": {"item": "auralis:prism_shard"},
            },
            "auralis:gilded_travertine", 4,
        ),
        "gilded_brass": shaped(
            "gilded_brass",
            ["SC", "CS"],
            {
                "S": {"item": "auralis:solarium_ingot"},
                "C": {"item": "minecraft:copper_ingot"},
            },
            "auralis:gilded_brass", 4,
        ),
        "starlight_glass": shaped(
            "starlight_glass",
            ["GPG", "PGP", "GPG"],
            {
                "G": {"item": "minecraft:glass"},
                "P": {"item": "auralis:prism_shard"},
            },
            "auralis:starlight_glass", 4,
            unlock=["auralis:prism_shard"],
        ),
        "lantern_bloom": shaped(
            "lantern_bloom",
            [" S ", "PBP", " S "],
            {
                "S": {"item": "auralis:solarium_ingot"},
                "P": {"item": "auralis:prism_shard"},
                "B": {"item": "auralis:prism_berry"},
            },
            "auralis:lantern_bloom", 2,
        ),
        # Relics, Tools, Consumables & Boss Summoner
        "celestial_nectar": shapeless(
            "celestial_nectar",
            ["minecraft:glass_bottle", "auralis:prism_berry", "auralis:prism_shard", "auralis:raw_solarium"],
            "auralis:celestial_nectar", 1,
            unlock="auralis:prism_berry",
        ),
        "solarium_pickaxe": shaped(
            "solarium_pickaxe",
            ["SSS", " P ", " R "],
            {
                "S": {"item": "auralis:solarium_ingot"},
                "P": {"item": "auralis:prism_shard"},
                "R": {"item": "minecraft:stick"},
            },
            "auralis:solarium_pickaxe", 1,
        ),
        "tide_glider_charm": shaped(
            "tide_glider_charm",
            ["P P", "PSP", " F "],
            {
                "P": {"item": "auralis:prism_shard"},
                "S": {"item": "auralis:solarium_ingot"},
                "F": {"item": "minecraft:feather"},
            },
            "auralis:tide_glider_charm", 1,
        ),
        "astral_lyre": shaped(
            "astral_lyre",
            ["S S", "SPS", "SSS"],
            {
                "S": {"item": "auralis:solarium_ingot"},
                "P": {"item": "auralis:prism_shard"},
            },
            "auralis:astral_lyre", 1,
        ),
        "resonant_star_core": shaped(
            "resonant_star_core",
            ["PSP", "SDS", "PSP"],
            {
                "S": {"item": "auralis:solarium_ingot"},
                "P": {"item": "auralis:prism_shard"},
                "D": {"item": "minecraft:diamond"},
            },
            "auralis:resonant_star_core", 1,
        ),
        "prism_sticks": shaped(
            "prism_sticks",
            ["P", "P"],
            {"P": {"item": "auralis:prism_planks"}},
            "minecraft:stick", 4,
            unlock=["auralis:prism_planks"],
        ),
        "rose_cloud": shaped(
            "rose_cloud",
            [" C ", "CBC", " C "],
            {
                "C": {"item": "auralis:cloudstone"},
                "B": {"item": "auralis:prism_berry"},
            },
            "auralis:rose_cloud", 4,
            unlock=["auralis:cloudstone"],
        ),
        "cloud_vent": shaped(
            "cloud_vent",
            ["BGB", "GCG", "BGB"],
            {
                "B": {"item": "auralis:cloudstone"},
                "G": {"item": "auralis:gilded_brass"},
                "C": {"item": "auralis:prism_shard"},
            },
            "auralis:cloud_vent", 1,
            unlock=["auralis:cloudstone", "auralis:gilded_brass"],
        ),
    }

    for name, data in recipes.items():
        write_json(BP / "recipes" / f"{name}.json", data)
    return len(recipes)


# =============================================================================
# 4. SIXTEEN LOOT TABLES (Blocks, 9 Mobs, Temple Chests & Astral Seraph Boss!)
# =============================================================================

def build_loot_tables():
    tables = {
        "blocks/solarium_ore": {
            "pools": [
                {
                    "rolls": 1,
                    "entries": [
                        {
                            "type": "item",
                            "name": "auralis:raw_solarium",
                            "functions": [{"function": "set_count", "count": {"min": 1, "max": 3}}],
                        }
                    ],
                }
            ]
        },
        "blocks/sea_crystal": {
            "pools": [
                {
                    "rolls": 1,
                    "entries": [
                        {
                            "type": "item",
                            "name": "auralis:prism_shard",
                            "functions": [{"function": "set_count", "count": {"min": 2, "max": 4}}],
                        }
                    ],
                }
            ]
        },
        "blocks/prism_leaves": {
            "pools": [
                {
                    "rolls": 1,
                    "entries": [
                        {"type": "item", "name": "auralis:prism_berry", "weight": 35},
                        {"type": "item", "name": "auralis:prism_shard", "weight": 15},
                        {"type": "empty", "weight": 50},
                    ],
                }
            ]
        },
        "entities/lumina_ray": {
            "pools": [
                {
                    "rolls": 1,
                    "entries": [
                        {
                            "type": "item",
                            "name": "auralis:prism_shard",
                            "functions": [{"function": "set_count", "count": {"min": 1, "max": 3}}],
                        }
                    ],
                }
            ]
        },
        "entities/choir_wisp": {
            "pools": [
                {
                    "rolls": 1,
                    "entries": [
                        {"type": "item", "name": "auralis:prism_berry", "weight": 60},
                        {"type": "item", "name": "auralis:raw_solarium", "weight": 40},
                    ],
                }
            ]
        },
        "entities/glass_crab": {
            "pools": [
                {
                    "rolls": 1,
                    "entries": [
                        {
                            "type": "item",
                            "name": "auralis:prism_shard",
                            "functions": [{"function": "set_count", "count": {"min": 2, "max": 4}}],
                        }
                    ],
                }
            ]
        },
        "entities/nimbus_stag": {
            "pools": [
                {
                    "rolls": 1,
                    "entries": [
                        {
                            "type": "item",
                            "name": "minecraft:leather",
                            "weight": 55,
                            "functions": [{"function": "set_count", "count": {"min": 1, "max": 2}}],
                        },
                        {
                            "type": "item",
                            "name": "auralis:prism_shard",
                            "weight": 35,
                            "functions": [{"function": "set_count", "count": {"min": 1, "max": 2}}],
                        },
                        {"type": "item", "name": "auralis:celestial_nectar", "weight": 10},
                    ],
                }
            ]
        },
        "entities/tide_jelly": {
            "pools": [
                {
                    "rolls": 1,
                    "entries": [
                        {
                            "type": "item",
                            "name": "auralis:cloudstone",
                            "weight": 60,
                            "functions": [{"function": "set_count", "count": {"min": 1, "max": 3}}],
                        },
                        {
                            "type": "item",
                            "name": "auralis:prism_shard",
                            "weight": 40,
                            "functions": [{"function": "set_count", "count": {"min": 1, "max": 2}}],
                        },
                    ],
                }
            ]
        },
        "entities/shard_stalker": {
            "pools": [
                {
                    "rolls": 1,
                    "entries": [
                        {
                            "type": "item",
                            "name": "auralis:prism_shard",
                            "weight": 55,
                            "functions": [{"function": "set_count", "count": {"min": 2, "max": 4}}],
                        },
                        {
                            "type": "item",
                            "name": "auralis:raw_solarium",
                            "weight": 45,
                            "functions": [{"function": "set_count", "count": {"min": 1, "max": 2}}],
                        },
                    ],
                }
            ]
        },
        "entities/astral_weaver": {
            "pools": [
                {
                    "rolls": 1,
                    "entries": [
                        {
                            "type": "item",
                            "name": "auralis:solarium_ingot",
                            "weight": 50,
                            "functions": [{"function": "set_count", "count": {"min": 1, "max": 2}}],
                        },
                        {
                            "type": "item",
                            "name": "auralis:prism_shard",
                            "weight": 35,
                            "functions": [{"function": "set_count", "count": {"min": 2, "max": 4}}],
                        },
                        {"type": "item", "name": "auralis:resonant_star_core", "weight": 15},
                    ],
                }
            ]
        },
        "entities/gilded_sentinel": {
            "pools": [
                {
                    "rolls": 1,
                    "entries": [
                        {
                            "type": "item",
                            "name": "auralis:solarium_ingot",
                            "weight": 65,
                            "functions": [{"function": "set_count", "count": {"min": 1, "max": 3}}],
                        },
                        {"type": "item", "name": "auralis:resonant_star_core", "weight": 15},
                        {
                            "type": "item",
                            "name": "auralis:prism_shard",
                            "weight": 20,
                            "functions": [{"function": "set_count", "count": {"min": 2, "max": 4}}],
                        },
                    ],
                }
            ]
        },
        "entities/astral_seraph": {
            "pools": [
                {
                    "rolls": 1,
                    "entries": [{"type": "item", "name": "auralis:starblade"}],
                },
                {
                    "rolls": 1,
                    "entries": [{"type": "item", "name": "auralis:astral_lyre"}],
                },
                {
                    "rolls": 1,
                    "entries": [
                        {
                            "type": "item",
                            "name": "auralis:solarium_ingot",
                            "functions": [{"function": "set_count", "count": {"min": 6, "max": 12}}],
                        }
                    ],
                },
                {
                    "rolls": 1,
                    "entries": [
                        {
                            "type": "item",
                            "name": "auralis:celestial_nectar",
                            "functions": [{"function": "set_count", "count": {"min": 2, "max": 4}}],
                        }
                    ],
                },
            ]
        },
        "chests/bell_temple_treasure": {
            "pools": [
                {
                    "rolls": {"min": 3, "max": 5},
                    "entries": [
                        {
                            "type": "item",
                            "name": "auralis:solarium_ingot",
                            "weight": 25,
                            "functions": [{"function": "set_count", "count": {"min": 2, "max": 5}}],
                        },
                        {
                            "type": "item",
                            "name": "auralis:prism_shard",
                            "weight": 25,
                            "functions": [{"function": "set_count", "count": {"min": 3, "max": 8}}],
                        },
                        {
                            "type": "item",
                            "name": "auralis:prism_berry",
                            "weight": 20,
                            "functions": [{"function": "set_count", "count": {"min": 3, "max": 6}}],
                        },
                        {"type": "item", "name": "auralis:celestial_nectar", "weight": 15},
                        {"type": "item", "name": "auralis:tide_glider_charm", "weight": 8},
                        {"type": "item", "name": "auralis:resonant_star_core", "weight": 7},
                    ],
                }
            ]
        },
    }

    for rel, data in tables.items():
        write_json(BP / "loot_tables" / f"{rel}.json", data)
    return len(tables)


def main():
    nb = build_blocks()
    ni = build_items()
    nr = build_recipes()
    nl = build_loot_tables()
    print(f"Generated {nb} blocks, {ni} items, {nr} recipes, and {nl} loot tables!")


if __name__ == "__main__":
    main()
