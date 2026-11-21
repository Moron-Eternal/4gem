#!/usr/bin/env python3
"""
Comprehensive Static & Runtime Validator for Auralis: The Prism-Tide Firmament.
Verifies JSON syntax, UUID uniqueness, dimension bounds, biome/Vibrant Visuals
cross-references, PBR texture set channel compliance, 3D geometries, entities,
particles, recipes, loot tables, Ogg Vorbis audio via ffprobe, and ES module JS syntax.
"""

import json
import re
import subprocess
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BP = ROOT / "packs" / "BP"
RP = ROOT / "packs" / "RP"

errors = []
warnings = []


def err(msg):
    errors.append(msg)
    print(f"  [ERROR] {msg}")


def warn(msg):
    warnings.append(msg)
    print(f"  [WARN]  {msg}")


def ok(msg):
    print(f"  [OK]    {msg}")


def load_json(path: Path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        err(f"Invalid JSON in {path.relative_to(ROOT)}: {e}")
        return None


def main():
    print("=== Auralis Add-On Comprehensive Validation ===")

    # 1. Validate EVERY JSON file in packs/
    all_json_files = sorted(list(BP.rglob("*.json")) + list(RP.rglob("*.json")))
    parsed = {}
    for p in all_json_files:
        data = load_json(p)
        if data is not None:
            parsed[p] = data
    ok(f"Parsed {len(parsed)}/{len(all_json_files)} JSON files cleanly")

    # 2. Manifests, UUIDs & Pack Icons
    bp_man = parsed.get(BP / "manifest.json", {})
    rp_man = parsed.get(RP / "manifest.json", {})
    uuids = []
    for label, man in [("BP", bp_man), ("RP", rp_man)]:
        h_uuid = man.get("header", {}).get("uuid")
        if not h_uuid:
            err(f"{label} manifest missing header.uuid")
        uuids.append(h_uuid)
        for m in man.get("modules", []):
            uuids.append(m.get("uuid"))
        icon = (BP if label == "BP" else RP) / "pack_icon.png"
        if not icon.exists():
            err(f"{label} missing pack_icon.png")
        else:
            im = Image.open(icon)
            if im.size[0] != im.size[1] or im.size[0] < 64:
                err(f"{label} pack_icon.png invalid size {im.size}")

    if len(set(uuids)) != len(uuids):
        err(f"Duplicate UUIDs detected across manifests: {uuids}")
    else:
        ok(f"All {len(uuids)} manifest UUIDs are unique")

    rp_dep = [d for d in bp_man.get("dependencies", []) if d.get("uuid") == rp_man.get("header", {}).get("uuid")]
    if not rp_dep:
        err("BP manifest does not depend on RP header UUID")
    else:
        ok("BP -> RP UUID dependency linked properly")

    entry = next((m.get("entry") for m in bp_man.get("modules", []) if m.get("type") == "script"), None)
    if not entry or not (BP / entry).exists():
        err(f"BP script entry missing: {entry}")
    else:
        ok(f"BP script entry verified: {entry}")

    # 3. Dimension & Biome + Vibrant Visuals Cross-References
    dim_data = parsed.get(BP / "dimensions/firmament.json", {}).get("minecraft:dimension", {})
    dim_comp = dim_data.get("components", {})
    dh = dim_comp.get("minecraft:dimension_height", {})
    min_y, h_range = dh.get("min_y", -64), dh.get("height_range", 384)
    if min_y % 16 != 0 or h_range % 16 != 0 or min_y < -512 or (min_y + h_range) > 512:
        err(f"Invalid dimension_height: min_y={min_y}, height_range={h_range}")
    else:
        ok(f"Dimension bounds valid: Y=[{min_y}, {min_y + h_range - 1}], clouds at Y={dim_comp.get('minecraft:clouds', {}).get('height')}")

    def_biome = dim_comp.get("minecraft:default_biome", {}).get("biome")
    bp_biome_id = parsed.get(BP / "biomes/firmament.biome.json", {}).get("minecraft:biome", {}).get("description", {}).get("identifier")
    rp_biome_doc = parsed.get(RP / "biomes/firmament.client_biome.json", {}).get("minecraft:client_biome", {})
    rp_biome_id = rp_biome_doc.get("description", {}).get("identifier")
    if not (def_biome == bp_biome_id == rp_biome_id):
        err(f"Biome ID mismatch: dim={def_biome}, BP={bp_biome_id}, RP={rp_biome_id}")
    else:
        ok(f"Dimension & BP/RP biome identifier synced: {def_biome}")

    rb_c = rp_biome_doc.get("components", {})
    vv_checks = [
        ("fog_appearance", "fog_identifier", RP / "fogs/firmament_fog.json", "minecraft:fog_settings"),
        ("atmosphere_identifier", "atmosphere_identifier", RP / "atmospherics/firmament_atmosphere.json", "minecraft:atmosphere_settings"),
        ("lighting_identifier", "lighting_identifier", RP / "lighting/firmament_lighting.json", "minecraft:lighting_settings"),
        ("color_grading_identifier", "color_grading_identifier", RP / "color_grading/firmament_color_grading.json", "minecraft:color_grading_settings"),
        ("water_identifier", "water_identifier", RP / "water/firmament_water.json", "minecraft:water_settings"),
    ]
    for comp_key, field, path, root_key in vv_checks:
        want = rb_c.get(f"minecraft:{comp_key}", {}).get(field)
        got = parsed.get(path, {}).get(root_key, {}).get("description", {}).get("identifier")
        if want != got or not want:
            err(f"Vibrant Visuals mismatch for {comp_key}: client_biome={want} vs file={got}")
    ok("All 5 Fog & Vibrant Visuals biome identifiers verified")

    # 4. Textures, PBR Texture Sets, Blocks, Items & Geometries
    terrain_tex = parsed.get(RP / "textures/terrain_texture.json", {}).get("texture_data", {})
    item_tex = parsed.get(RP / "textures/item_texture.json", {}).get("texture_data", {})

    # Verify all texture_set.json PBR channel rules!
    ts_files = list(RP.rglob("*.texture_set.json"))
    for tsf in ts_files:
        ts = parsed[tsf].get("minecraft:texture_set", {})
        folder = tsf.parent
        c_name = ts.get("color")
        if not c_name or not (folder / f"{c_name}.png").exists():
            err(f"Texture set {tsf.name} missing color PNG: {c_name}")
        mer_name = ts.get("metalness_emissive_roughness")
        if isinstance(mer_name, str):
            mp = folder / f"{mer_name}.png"
            if not mp.exists():
                err(f"Texture set {tsf.name} missing MER PNG: {mer_name}")
            else:
                mode = Image.open(mp).mode
                if mode not in ("RGB", "RGBA"):
                    err(f"MER image {mp.name} has invalid mode {mode} (must be RGB/RGBA)")
        h_name = ts.get("heightmap")
        if isinstance(h_name, str):
            hp = folder / f"{h_name}.png"
            if not hp.exists():
                err(f"Texture set {tsf.name} missing heightmap PNG: {h_name}")
            else:
                mode = Image.open(hp).mode
                if mode != "L":
                    err(f"Heightmap {hp.name} must be single-channel 'L', got '{mode}'")
    ok(f"All {len(ts_files)} PBR *.texture_set.json files pass channel & file checks")

    # Collect all block & entity geometry identifiers
    geo_ids = set()
    for gp in (RP / "models").rglob("*.geo.json"):
        for g in parsed[gp].get("minecraft:geometry", []):
            geo_ids.add(g.get("description", {}).get("identifier"))

    # Read script custom component registrations
    items_js = (BP / "scripts/items.js").read_text(encoding="utf-8")
    registered_comps = set(re.findall(r'registerCustomComponent\(["\'](auralis:[^"\']+)["\']', items_js))

    block_ids = set()
    for bp_blk in sorted((BP / "blocks").glob("*.json")):
        b = parsed[bp_blk].get("minecraft:block", {})
        bid = b.get("description", {}).get("identifier")
        block_ids.add(bid)
        comps = b.get("components", {})
        geo = comps.get("minecraft:geometry")
        if isinstance(geo, str) and geo != "minecraft:geometry.full_block" and geo not in geo_ids:
            err(f"Block {bid} references unknown geometry: {geo}")
        for face, mat in comps.get("minecraft:material_instances", {}).items():
            tkey = mat.get("texture")
            if tkey not in terrain_tex:
                err(f"Block {bid} texture key '{tkey}' missing in terrain_texture.json")
            else:
                rel = terrain_tex[tkey]["textures"]
                if not (RP / f"{rel}.png").exists():
                    err(f"Block {bid} texture PNG missing: {rel}.png")
        loot = comps.get("minecraft:loot")
        if loot and not (BP / loot).exists():
            err(f"Block {bid} loot table missing: {loot}")
        for ck in comps:
            if ck.startswith("auralis:") and ck not in registered_comps:
                err(f"Block {bid} uses unregistered custom component: {ck}")
    ok(f"All {len(block_ids)} custom blocks verified (geometries, textures, loot, V2 custom components)")

    item_ids = set()
    for bp_it in sorted((BP / "items").glob("*.json")):
        it = parsed[bp_it].get("minecraft:item", {})
        iid = it.get("description", {}).get("identifier")
        item_ids.add(iid)
        comps = it.get("components", {})
        icon = comps.get("minecraft:icon", {})
        tkey = icon.get("textures", {}).get("default") if isinstance(icon, dict) else icon
        if tkey not in item_tex:
            err(f"Item {iid} icon key '{tkey}' missing in item_texture.json")
        else:
            rel = item_tex[tkey]["textures"]
            if not (RP / f"{rel}.png").exists():
                err(f"Item {iid} icon PNG missing: {rel}.png")
        for ck in comps:
            if ck.startswith("auralis:") and ck not in registered_comps:
                err(f"Item {iid} uses unregistered custom component: {ck}")
    ok(f"All {len(item_ids)} custom items verified (icons & V2 custom components)")

    # 5. Recipes
    all_custom_ids = block_ids | item_ids
    recipe_count = 0
    for rp_rec in sorted((BP / "recipes").glob("*.json")):
        rec = parsed[rp_rec]
        recipe_count += 1
        for kind in ("minecraft:recipe_shaped", "minecraft:recipe_shapeless", "minecraft:recipe_furnace"):
            if kind in rec:
                body = rec[kind]
                res = body.get("result") or body.get("output")
                res_id = res.get("item") if isinstance(res, dict) else res
                if res_id and res_id.startswith("auralis:") and res_id not in all_custom_ids:
                    err(f"Recipe {rp_rec.name} outputs unknown auralis item: {res_id}")
    ok(f"All {recipe_count} crafting & smelting recipes verified")

    # 6. Entities (BP <-> RP <-> Models <-> Animations <-> Textures <-> Loot)
    anim_ids = set()
    for ap in (RP / "animations").glob("*.json"):
        anim_ids.update(parsed[ap].get("animations", {}).keys())
    ac_ids = set()
    for acp in (RP / "animation_controllers").glob("*.json"):
        ac_ids.update(parsed[acp].get("animation_controllers", {}).keys())
    rc_ids = set()
    for rcp in (RP / "render_controllers").glob("*.json"):
        rc_ids.update(parsed[rcp].get("render_controllers", {}).keys())

    entity_count = 0
    for ep in sorted((BP / "entities").glob("*.json")):
        ent = parsed[ep].get("minecraft:entity", {})
        eid = ent.get("description", {}).get("identifier")
        entity_count += 1
        loot = ent.get("components", {}).get("minecraft:loot", {}).get("table")
        if loot and not (BP / loot).exists():
            err(f"Entity {eid} missing loot table: {loot}")
        rp_ep = RP / "entity" / f"{ep.stem}.entity.json"
        if not rp_ep.exists():
            err(f"Entity {eid} missing RP client entity: {rp_ep.name}")
            continue
        desc = parsed[rp_ep].get("minecraft:client_entity", {}).get("description", {})
        for g in desc.get("geometry", {}).values():
            if g not in geo_ids:
                err(f"Entity {eid} unknown geometry: {g}")
        for t in desc.get("textures", {}).values():
            if not (RP / f"{t}.png").exists():
                err(f"Entity {eid} missing texture PNG: {t}.png")
        for a in desc.get("animations", {}).values():
            if a not in anim_ids and a not in ac_ids:
                err(f"Entity {eid} unknown animation/controller: {a}")
        for rc in desc.get("render_controllers", []):
            if rc not in rc_ids:
                err(f"Entity {eid} unknown render controller: {rc}")
    ok(f"All {entity_count} custom entities fully verified across BP, RP, models, animations & loot")

    # 7. Particles & Constants Cross-Check
    particle_ids = set()
    for pp in sorted((RP / "particles").glob("*.particle.json")):
        pe = parsed[pp].get("minecraft:particle_effect", {})
        pid = pe.get("description", {}).get("identifier")
        particle_ids.add(pid)
        tex = pe.get("description", {}).get("basic_render_parameters", {}).get("texture")
        if not tex or not (RP / f"{tex}.png").exists():
            err(f"Particle {pid} missing texture PNG: {tex}")
    ok(f"All {len(particle_ids)} custom particle VFX JSONs verified")

    # 8. Audio & OST Verification via ffprobe
    sound_defs = parsed.get(RP / "sounds/sound_definitions.json", {}).get("sound_definitions", {})
    ogg_checked = set()
    for s_id, s_obj in sound_defs.items():
        for entry_s in s_obj.get("sounds", []):
            rel = entry_s["name"] if isinstance(entry_s, dict) else entry_s
            ogg = RP / f"{rel}.ogg"
            if not ogg.exists():
                err(f"Sound '{s_id}' missing audio file: {ogg.relative_to(ROOT)}")
            elif ogg not in ogg_checked:
                ogg_checked.add(ogg)
                proc = subprocess.run(
                    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(ogg)],
                    capture_output=True, text=True,
                )
                try:
                    dur = float(proc.stdout.strip())
                    if proc.returncode != 0 or dur <= 0.05:
                        err(f"Invalid Ogg Vorbis audio {ogg.name}: rc={proc.returncode}, dur={proc.stdout}")
                except ValueError:
                    err(f"ffprobe failed on {ogg.name}: {proc.stderr}")
    ok(f"All {len(sound_defs)} sound/music definitions & {len(ogg_checked)} .ogg Vorbis files verified via ffprobe")

    # Verify constants.js sound, music, and particle strings resolve cleanly!
    const_js = (BP / "scripts/constants.js").read_text(encoding="utf-8")
    for s_ref in re.findall(r'["\']((?:auralis|music\.auralis)\.[a-z0-9_.]+)["\']', const_js):
        if s_ref not in sound_defs:
            err(f"constants.js references undefined sound/music ID: {s_ref}")
    for p_ref in re.findall(r':\s*["\'](auralis:[a-z0-9_]+)["\']', const_js):
        if p_ref in particle_ids or p_ref in all_custom_ids or p_ref == "auralis:firmament":
            continue
        # Entities are also valid
        ent_ids = {f"auralis:{ep.stem}" for ep in (BP / "entities").glob("*.json")}
        if p_ref not in ent_ids:
            err(f"constants.js references unknown auralis ID: {p_ref}")
    ok("All constants.js sound, music, particle, block, item & entity IDs match pack definitions")

    # 9. JavaScript ES Module Syntax Check via Node.js
    js_files = sorted((BP / "scripts").glob("*.js"))
    for jsf in js_files:
        proc = subprocess.run(["node", "--check", str(jsf)], capture_output=True, text=True)
        if proc.returncode != 0:
            err(f"JS syntax error in {jsf.name}: {proc.stderr}")
    ok(f"All {len(js_files)} ES module scripts pass Node.js syntax check")

    # 10. Runtime Unit Test on noise.js (deterministic biome distribution & citadel placement!)
    test_code = """
import { getZoneAt, getNearestCitadel } from './packs/BP/scripts/noise.js';
const originZone = getZoneAt(0, 0);
if (originZone !== 'sanctuary') throw new Error('Expected sanctuary at (0,0), got ' + originZone);
const cit = getNearestCitadel(0, -112);
if (cit.distance !== 0 || getZoneAt(0, -112) !== 'astral_citadel') throw new Error('Expected Astral Citadel at (0,-112)');
const counts = {};
for (let x = -600; x <= 600; x += 32) {
  for (let z = -600; z <= 600; z += 32) {
    const zname = getZoneAt(x, z);
    counts[zname] = (counts[zname] || 0) + 1;
  }
}
for (const req of ['pearl_atolls', 'spire_gardens', 'bell_reefs', 'astral_citadel', 'sanctuary']) {
  if (!counts[req]) throw new Error('Missing procedural zone in sample grid: ' + req);
}
console.log('Zone distribution verified:', JSON.stringify(counts));
"""
    proc = subprocess.run(["node", "--input-type=module", "-e", test_code], cwd=ROOT, capture_output=True, text=True)
    if proc.returncode != 0:
        err(f"noise.js runtime test failed: {proc.stderr}")
    else:
        ok(proc.stdout.strip())

    print("\n===============================================")
    if errors:
        print(f"VALIDATION FAILED with {len(errors)} error(s) and {len(warnings)} warning(s).")
        sys.exit(1)
    else:
        print(f"ALL CHECKS PASSED! 0 errors, {len(warnings)} warnings.")


if __name__ == "__main__":
    main()
