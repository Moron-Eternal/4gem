#!/usr/bin/env python3
"""
Generates all 12 Custom Particle VFX JSONs (RP/particles/*.particle.json)
and Localization files (RP/texts/languages.json & RP/texts/en_US.lang)
for Auralis: The Prism-Tide Firmament.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RP = ROOT / "packs" / "RP"


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def make_particle(
    identifier,
    uv_col,
    uv_row,
    material="particles_add",
    emitter_rate=None,
    emitter_lifetime=None,
    emitter_shape=None,
    lifetime="1.5",
    speed=0.8,
    accel=(0, 0.2, 0),
    drag=0.5,
    size=(0.18, 0.18),
    facing="rotate_xyz",
    gradient=None,
    spin=None,
):
    comps = {
        "minecraft:emitter_rate_instant": emitter_rate or {"num_particles": 18},
        "minecraft:emitter_lifetime_once": emitter_lifetime or {"active_time": 0.2},
        "minecraft:emitter_shape_point": emitter_shape or {"offset": [0, 0, 0]},
        "minecraft:particle_lifetime_expression": {"max_lifetime": lifetime},
        "minecraft:particle_initial_speed": speed,
        "minecraft:particle_motion_dynamic": {
            "linear_acceleration": list(accel),
            "linear_drag_coefficient": drag,
        },
        "minecraft:particle_appearance_billboard": {
            "size": list(size),
            "facing_camera_mode": facing,
            "uv": {
                "texture_width": 128,
                "texture_height": 128,
                "uv": [uv_col * 32, uv_row * 32],
                "uv_size": [32, 32],
            },
        },
        "minecraft:particle_appearance_tinting": {
            "color": {
                "interpolant": "v.particle_age / v.particle_lifetime",
                "gradient": gradient
                or {
                    "0.0": "#008CF5F2",
                    "0.2": "#FF8CF5F2",
                    "0.7": "#FFFFC8A2",
                    "1.0": "#00FFC8A2",
                },
            }
        },
    }
    if spin:
        comps["minecraft:particle_initial_spin"] = spin

    return {
        "format_version": "1.10.0",
        "minecraft:particle_effect": {
            "description": {
                "identifier": f"auralis:{identifier}",
                "basic_render_parameters": {
                    "material": material,
                    "texture": "textures/particle/auralis_particles",
                },
            },
            "components": comps,
        },
    }


def build_particles():
    # 1. ambient_motes: Drifting rose-gold & aquamarine starlight dust
    p = make_particle(
        "ambient_motes", 0, 0,
        emitter_rate={"num_particles": 12},
        lifetime="math.random(3.5, 6.0)",
        speed="math.random(0.15, 0.45)",
        accel=("math.sin(v.particle_age * 2) * 0.15", 0.12, "math.cos(v.particle_age * 2) * 0.15"),
        drag=0.6,
        size=("0.10 + 0.08 * math.sin(v.particle_age * 3.14)", "0.10 + 0.08 * math.sin(v.particle_age * 3.14)"),
        gradient={
            "0.0": "#007EF5EE",
            "0.25": "#E68AF5EE",
            "0.65": "#E6FFD4A6",
            "1.0": "#00FFA8C8",
        },
    )
    del p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_point"]
    p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_sphere"] = {
        "radius": 14.0,
        "surface_only": False,
        "direction": [0, 1, 0],
    }
    write_json(RP / "particles/ambient_motes.particle.json", p)

    # 2. aurora_ribbons: High-altitude gossamer twilight aurora curtains!
    p = make_particle(
        "aurora_ribbons", 3, 0,
        material="particles_add",
        emitter_rate={"num_particles": 6},
        lifetime="math.random(5.5, 8.5)",
        speed=0.25,
        accel=(0.08, 0.04, 0.04),
        drag=0.3,
        size=(1.1, 4.2),
        facing="rotate_y",
        gradient={
            "0.0": "#0064F2E8",
            "0.25": "#586CF2E8",
            "0.60": "#52E898D8",
            "0.85": "#38FFD09E",
            "1.0": "#00FFD09E",
        },
    )
    del p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_point"]
    p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_box"] = {
        "half_dimensions": [18.0, 2.0, 18.0],
        "direction": [0.2, 0.05, 0.1],
    }
    write_json(RP / "particles/aurora_ribbons.particle.json", p)

    # 3. harmonic_ring: Expanding golden horizontal resonance ring when striking the Astrolabe!
    p = make_particle(
        "harmonic_ring", 2, 0,
        emitter_rate={"num_particles": 1},
        lifetime="1.6",
        speed=0.0,
        accel=(0, 0.08, 0),
        drag=0.0,
        size=("0.5 + (v.particle_age / v.particle_lifetime) * 4.2", "0.5 + (v.particle_age / v.particle_lifetime) * 4.2"),
        facing="emitter_transform_xz",
        gradient={
            "0.0": "#FFFFE694",
            "0.45": "#E68AF5F2",
            "0.80": "#88F4A4D8",
            "1.0": "#00F4A4D8",
        },
    )
    write_json(RP / "particles/harmonic_ring.particle.json", p)

    # 4. veil_vortex: Swirling vertical column of golden stars & lavender mist above awakened Astrolabe!
    p = make_particle(
        "veil_vortex", 0, 1,
        emitter_rate={"num_particles": 10},
        lifetime="math.random(1.8, 2.8)",
        speed="math.random(0.8, 1.5)",
        accel=("math.cos(v.particle_age * 5.0) * 1.4", 1.2, "math.sin(v.particle_age * 5.0) * 1.4"),
        drag=0.8,
        size=("0.24 * (1.0 - v.particle_age / v.particle_lifetime * 0.5)", "0.24 * (1.0 - v.particle_age / v.particle_lifetime * 0.5)"),
        gradient={
            "0.0": "#0094F8F4",
            "0.2": "#FF94F8F4",
            "0.6": "#FFFFD98A",
            "1.0": "#00F49EE0",
        },
        spin={"initial_rotation": "math.random(0, 360)", "rotation_rate": 120},
    )
    del p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_point"]
    p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_disc"] = {
        "radius": 1.35,
        "plane_normal": "y",
        "surface_only": False,
        "direction": [0, 1, 0],
    }
    write_json(RP / "particles/veil_vortex.particle.json", p)

    # 5. starlight_burst: Radiant dimensional transit & altar awakening nova burst!
    p = make_particle(
        "starlight_burst", 0, 1,
        emitter_rate={"num_particles": 48},
        lifetime="math.random(1.0, 2.0)",
        speed="math.random(2.2, 6.2)",
        accel=(0, -0.5, 0),
        drag=1.6,
        size=("0.34 * (1.0 - v.particle_age / v.particle_lifetime)", "0.34 * (1.0 - v.particle_age / v.particle_lifetime)"),
        gradient={
            "0.0": "#FFFFFFFF",
            "0.25": "#FFFFDE8A",
            "0.65": "#CC7AF4F0",
            "1.0": "#00D696FF",
        },
        spin={"initial_rotation": "math.random(0, 360)", "rotation_rate": 180},
    )
    del p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_point"]
    p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_sphere"] = {
        "radius": 0.4,
        "surface_only": True,
        "direction": "outwards",
    }
    write_json(RP / "particles/starlight_burst.particle.json", p)

    # 6. manta_trail: Sparkling cyan-gold stardust ribbon behind gliding Lumina Rays
    p = make_particle(
        "manta_trail", 1, 2,
        emitter_rate={"num_particles": 6},
        lifetime="math.random(1.4, 2.4)",
        speed="math.random(0.1, 0.35)",
        accel=(0, -0.05, 0),
        drag=1.2,
        size=("0.22 * (1.0 - v.particle_age / v.particle_lifetime * 0.6)", "0.22 * (1.0 - v.particle_age / v.particle_lifetime * 0.6)"),
        gradient={
            "0.0": "#FF8AF8F4",
            "0.5": "#CCFFE094",
            "1.0": "#008AF8F4",
        },
    )
    del p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_point"]
    p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_sphere"] = {
        "radius": 0.7,
        "surface_only": False,
        "direction": "outwards",
    }
    write_json(RP / "particles/manta_trail.particle.json", p)

    # 7. wisp_notes: Glowing musical chime notes drifting from Choir Wisps & Astral Lyre!
    p = make_particle(
        "wisp_notes", 2, 1,
        emitter_rate={"num_particles": 5},
        lifetime="math.random(1.4, 2.2)",
        speed="math.random(0.4, 0.9)",
        accel=("math.sin(v.particle_age * 4) * 0.4", 0.55, 0),
        drag=0.7,
        size=(0.24, 0.24),
        gradient={
            "0.0": "#FFFFB4D4",
            "0.4": "#FFFFE29A",
            "0.8": "#CC86F5F2",
            "1.0": "#0086F5F2",
        },
    )
    del p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_point"]
    p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_sphere"] = {
        "radius": 0.6,
        "surface_only": False,
        "direction": [0, 1, 0],
    }
    write_json(RP / "particles/wisp_notes.particle.json", p)

    # 8. crystal_shimmer: Subtle diamond glints rising from Sea-Crystals & Chime-Reeds
    p = make_particle(
        "crystal_shimmer", 1, 1,
        emitter_rate={"num_particles": 8},
        lifetime="math.random(0.9, 1.5)",
        speed="math.random(0.3, 0.8)",
        accel=(0, 0.45, 0),
        drag=1.0,
        size=("0.18 * (1.0 - v.particle_age / v.particle_lifetime)", "0.18 * (1.0 - v.particle_age / v.particle_lifetime)"),
        gradient={
            "0.0": "#FFFFFFFF",
            "0.4": "#FF7CF5F2",
            "0.8": "#BBD6A8FF",
            "1.0": "#00D6A8FF",
        },
    )
    del p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_point"]
    p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_sphere"] = {
        "radius": 0.6,
        "surface_only": False,
        "direction": [0, 1, 0],
    }
    write_json(RP / "particles/crystal_shimmer.particle.json", p)

    # 9. gale_swirl: Rose-gold & cyan wind ribbons for Gale-Prism & Cloud Sea updraft!
    p = make_particle(
        "gale_swirl", 3, 1,
        emitter_rate={"num_particles": 24},
        lifetime="math.random(0.8, 1.4)",
        speed="math.random(2.0, 4.2)",
        accel=(0, 2.2, 0),
        drag=1.4,
        size=(0.35, 0.35),
        gradient={
            "0.0": "#FFFFD2A6",
            "0.35": "#FFF49EC4",
            "0.75": "#AA88F4F2",
            "1.0": "#0088F4F2",
        },
        spin={"initial_rotation": "math.random(0, 360)", "rotation_rate": 320},
    )
    del p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_point"]
    p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_disc"] = {
        "radius": 1.2,
        "plane_normal": "y",
        "surface_only": False,
        "direction": "outwards",
    }
    write_json(RP / "particles/gale_swirl.particle.json", p)

    # 10. starblade_arc: Blazing cyan-gold crescent energy slash for Sovereign's Starblade!
    p = make_particle(
        "starblade_arc", 0, 2,
        emitter_rate={"num_particles": 10},
        lifetime="0.65",
        speed="math.random(1.2, 2.4)",
        accel=(0, 0.1, 0),
        drag=1.5,
        size=("0.55 * (1.0 - v.particle_age / v.particle_lifetime * 0.4)", "0.55 * (1.0 - v.particle_age / v.particle_lifetime * 0.4)"),
        gradient={
            "0.0": "#FFFFFFFF",
            "0.3": "#FF7CF5F5",
            "0.7": "#CCFFD97A",
            "1.0": "#00D694FF",
        },
        spin={"initial_rotation": "math.random(-25, 25)", "rotation_rate": 45},
    )
    write_json(RP / "particles/starblade_arc.particle.json", p)

    # 11. sentinel_beam: Focused violet-cyan astral energy trail for Sentinel bolts!
    p = make_particle(
        "sentinel_beam", 1, 0,
        emitter_rate={"num_particles": 8},
        lifetime="0.55",
        speed="math.random(0.2, 0.6)",
        accel=(0, 0, 0),
        drag=1.8,
        size=("0.24 * (1.0 - v.particle_age / v.particle_lifetime)", "0.24 * (1.0 - v.particle_age / v.particle_lifetime)"),
        gradient={
            "0.0": "#FFFFFFFF",
            "0.35": "#FF98F6F8",
            "0.75": "#CCD88CFF",
            "1.0": "#00D88CFF",
        },
    )
    write_json(RP / "particles/sentinel_beam.particle.json", p)

    # 12. seraph_nova: Massive concentric golden-rose shockwave & pillar telegraph for Astral Seraph!
    p = make_particle(
        "seraph_nova", 2, 2,
        emitter_rate={"num_particles": 2},
        lifetime="1.5",
        speed=0.0,
        accel=(0, 0.05, 0),
        drag=0.0,
        size=("1.0 + (v.particle_age / v.particle_lifetime) * 7.5", "1.0 + (v.particle_age / v.particle_lifetime) * 7.5"),
        facing="emitter_transform_xz",
        gradient={
            "0.0": "#FFFFF2B8",
            "0.35": "#FFF49AC8",
            "0.75": "#AA98F2F6",
            "1.0": "#0098F2F6",
        },
    )
    write_json(RP / "particles/seraph_nova.particle.json", p)

    # 13. star_pillar: Vertical luminous sky-beam for Astral Seraph's Falling Star Pillars & Shrine beams!
    p = make_particle(
        "star_pillar", 0, 3,
        emitter_rate={"num_particles": 8},
        lifetime="1.3",
        speed=0.2,
        accel=(0, 1.8, 0),
        drag=0.2,
        size=(0.85, 3.8),
        facing="rotate_y",
        gradient={
            "0.0": "#00FFF0B4",
            "0.25": "#FFFFE29A",
            "0.70": "#CC88F4F4",
            "1.0": "#00E698FF",
        },
    )
    write_json(RP / "particles/star_pillar.particle.json", p)

    # 14. cloud_updraft: Silky rising pearl & rose-gold breeze columns above Cloud-Vents!
    p = make_particle(
        "cloud_updraft", 3, 1,
        emitter_rate={"num_particles": 10},
        lifetime="math.random(1.3, 2.2)",
        speed="math.random(1.2, 2.4)",
        accel=("math.cos(v.particle_age * 4.5) * 0.65", 2.4, "math.sin(v.particle_age * 4.5) * 0.65"),
        drag=0.6,
        size=("0.26 + 0.14 * (v.particle_age / v.particle_lifetime)", "0.26 + 0.14 * (v.particle_age / v.particle_lifetime)"),
        gradient={
            "0.0": "#00FFF4EC",
            "0.22": "#E0FFF0E4",
            "0.62": "#CCFFAEC6",
            "1.0": "#008AF4F2",
        },
        spin={"initial_rotation": "math.random(0, 360)", "rotation_rate": 180},
    )
    del p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_point"]
    p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_disc"] = {
        "radius": 0.9,
        "plane_normal": "y",
        "surface_only": False,
        "direction": [0, 1, 0],
    }
    write_json(RP / "particles/cloud_updraft.particle.json", p)

    # 15. seraph_charge: Converging golden-violet astrolabe aura telegraphing boss abilities!
    p = make_particle(
        "seraph_charge", 1, 3,
        emitter_rate={"num_particles": 14},
        lifetime="0.85",
        speed="math.random(-2.4, -1.2)",
        accel=(0, 0.2, 0),
        drag=0.5,
        size=("0.34 * (1.0 - v.particle_age / v.particle_lifetime * 0.5)", "0.34 * (1.0 - v.particle_age / v.particle_lifetime * 0.5)"),
        gradient={
            "0.0": "#00FFE296",
            "0.25": "#FFFFE296",
            "0.70": "#E6E498FF",
            "1.0": "#0098F4F6",
        },
        spin={"initial_rotation": "math.random(0, 360)", "rotation_rate": 240},
    )
    del p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_point"]
    p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_sphere"] = {
        "radius": 2.4,
        "surface_only": True,
        "direction": "outwards",
    }
    write_json(RP / "particles/seraph_charge.particle.json", p)

    # 16. lantern_motes: Delicate warm peach-gold candle embers drifting softly above Lantern Blooms!
    p = make_particle(
        "lantern_motes", 0, 0,
        emitter_rate={"num_particles": 4},
        lifetime="math.random(1.8, 3.0)",
        speed="math.random(0.12, 0.32)",
        accel=("math.sin(v.particle_age * 2.8) * 0.14", 0.24, "math.cos(v.particle_age * 2.8) * 0.14"),
        drag=0.7,
        size=("0.08 + 0.05 * math.sin(v.particle_age * 3.14)", "0.08 + 0.05 * math.sin(v.particle_age * 3.14)"),
        gradient={
            "0.0": "#00FFF0C8",
            "0.22": "#E6FFE0A4",
            "0.68": "#CCFFACBA",
            "1.0": "#00FFACBA",
        },
    )
    del p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_point"]
    p["minecraft:particle_effect"]["components"]["minecraft:emitter_shape_sphere"] = {
        "radius": 0.42,
        "surface_only": False,
        "direction": [0, 1, 0],
    }
    write_json(RP / "particles/lantern_motes.particle.json", p)


def build_lang():
    write_json(RP / "texts/languages.json", ["en_US"])

    lang_lines = [
        "pack.name=§e✦ §bAuralis: §dThe Prism-Tide Firmament §e✦",
        "pack.description=§7A celestial twilight floating-archipelago dimension with a unique Harmonic Resonance entry ritual, walkable Cloud-Shelf Plains, custom OST, gentle SFX, VFX, PBR blocks, 9 living mobs, and the Astral Seraph boss.",
        "",
        "## Dimension & Biome",
        "biome.auralis:firmament.name=Auralis Firmament",
        "",
        "## Custom Blocks",
        "tile.auralis:auralite_stone.name=Auralite Travertine",
        "tile.auralis:starstone.name=Twilight Starstone",
        "tile.auralis:tide_moss.name=Tide-Moss Auralite",
        "tile.auralis:gilded_travertine.name=Gilded Travertine",
        "tile.auralis:solarium_ore.name=Solarium Ore",
        "tile.auralis:solarium_block.name=Block of Solarium",
        "tile.auralis:prism_log.name=Prism-Coral Log",
        "tile.auralis:prism_planks.name=Prism-Coral Planks",
        "tile.auralis:prism_leaves.name=Prism-Coral Canopy",
        "tile.auralis:starlight_glass.name=Starlight Etched Glass",
        "tile.auralis:sea_crystal.name=Auralis Sea-Crystal",
        "tile.auralis:lantern_bloom.name=Lantern Bloom",
        "tile.auralis:chime_reed.name=Singing Chime-Reed",
        "tile.auralis:gilded_brass.name=Celestial Gilded Brass",
        "tile.auralis:cloudstone.name=Luminous Cloudstone",
        "tile.auralis:rose_cloud.name=Rose-Gold Cloud Bank",
        "tile.auralis:cloud_vent.name=§bUpdraft Cloud-Vent",
        "tile.auralis:astrolabe_pedestal.name=§eCelestial Astrolabe Pedestal",
        "tile.auralis:starlight_veil.name=§bStarlight Mirror Veil",
        "tile.auralis:vespera_altar.name=§dVespera Sanctum Altar",
        "",
        "## Custom Items & Relics",
        "item.auralis:tuning_fork.name=§eStarlight Tuning Fork",
        "item.auralis:raw_solarium.name=Raw Solarium",
        "item.auralis:solarium_ingot.name=§6Solarium Ingot",
        "item.auralis:prism_shard.name=§bPrism Shard",
        "item.auralis:prism_berry.name=§dPrism Berry",
        "item.auralis:celestial_nectar.name=§eCelestial Nectar",
        "item.auralis:resonant_star_core.name=§dResonant Star-Core",
        "item.auralis:solarium_pickaxe.name=§6Solarium Pickaxe",
        "item.auralis:starblade.name=§bSovereign's Starblade",
        "item.auralis:tide_glider_charm.name=§bAuralis Gale-Prism",
        "item.auralis:astral_lyre.name=§eAstral Lyre",
        "item.auralis:chronicle_of_auralis.name=§dChronicle of Auralis",
        "",
        "## Custom Mobs & Spawn Eggs",
        "entity.auralis:lumina_ray.name=Lumina Ray",
        "entity.auralis:choir_wisp.name=Choir Wisp",
        "entity.auralis:glass_crab.name=Tide-Glass Crab",
        "entity.auralis:nimbus_stag.name=Nimbus Stag",
        "entity.auralis:tide_jelly.name=Aurelia Cloud-Jelly",
        "entity.auralis:shard_stalker.name=Shard Stalker",
        "entity.auralis:astral_weaver.name=Astral Weaver",
        "entity.auralis:gilded_sentinel.name=Gilded Sentinel",
        "entity.auralis:astral_seraph.name=The Astral Seraph",
        "entity.auralis:astral_bolt.name=Astral Pulse Bolt",
        "item.spawn_egg.entity.auralis:lumina_ray.name=Spawn Lumina Ray",
        "item.spawn_egg.entity.auralis:choir_wisp.name=Spawn Choir Wisp",
        "item.spawn_egg.entity.auralis:glass_crab.name=Spawn Tide-Glass Crab",
        "item.spawn_egg.entity.auralis:nimbus_stag.name=Spawn Nimbus Stag",
        "item.spawn_egg.entity.auralis:tide_jelly.name=Spawn Aurelia Cloud-Jelly",
        "item.spawn_egg.entity.auralis:shard_stalker.name=Spawn Shard Stalker",
        "item.spawn_egg.entity.auralis:astral_weaver.name=Spawn Astral Weaver",
        "item.spawn_egg.entity.auralis:gilded_sentinel.name=Spawn Gilded Sentinel",
        "item.spawn_egg.entity.auralis:astral_seraph.name=Spawn The Astral Seraph",
    ]
    (RP / "texts/en_US.lang").write_text("\n".join(lang_lines) + "\n", encoding="utf-8")


def main():
    build_particles()
    build_lang()
    print("Generated 16 custom particle VFX JSONs and en_US.lang localization!")


if __name__ == "__main__":
    main()
