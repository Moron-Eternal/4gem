#!/usr/bin/env python3
"""
Comprehensive Static, Audio-Softness, Animation-Molang & Worldgen-Math Validator for:
    AURALIS: The Prism-Tide Firmament (v2 Overhaul)

Verifies:
  1. JSON syntax across every BP & RP file
  2. Manifest UUID uniqueness, version sync, script entrypoint, pack icons
  3. Native Custom Dimension bounds & all 5 Vibrant Visuals biome links
  4. PBR texture set channel rules (MER RGB/RGBA, Heightmap single-channel L)
  5. Blocks, items, recipes, loot tables, geometries & V2 custom component bindings
  6. Strict 1.8.0 animation Molang (ZERO `q.` shorthand!), bone-existence checks,
     and BP client_sync Entity Property <-> RP query.property cross-verification
  7. Anti-erratic-flight AI guard (no float_wander + movement.hover collisions)
  8. ffprobe Ogg Vorbis validation + ffmpeg PCM peak/RMS audio-softness regression gate
  9. Node.js ES module syntax checks across all BP/scripts/*.js
 10. 10,000-cell Worldgen 2.0 mathematical non-overlap & biome-coverage proof test!
"""

import json
import re
import subprocess
import sys
from pathlib import Path
import numpy as np
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


def collect_strings(obj):
    out = []
    if isinstance(obj, str):
        out.append(obj)
    elif isinstance(obj, list):
        for item in obj:
            out.extend(collect_strings(item))
    elif isinstance(obj, dict):
        for v in obj.values():
            out.extend(collect_strings(v))
    return out


def main():
    print("=== Auralis v2 Add-On Comprehensive Validation ===")

    # 1. Validate EVERY JSON file in packs/
    all_json_files = sorted(list(BP.rglob("*.json")) + list(RP.rglob("*.json")))
    parsed = {}
    for p in all_json_files:
        data = load_json(p)
        if data is not None:
            parsed[p] = data
    ok(f"Parsed {len(parsed)}/{len(all_json_files)} JSON files cleanly")

    # 2. Manifests, UUIDs, Version Sync & Pack Icons
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

    rp_uuid = rp_man.get("header", {}).get("uuid")
    rp_ver = rp_man.get("header", {}).get("version")
    rp_dep = [d for d in bp_man.get("dependencies", []) if d.get("uuid") == rp_uuid]
    if not rp_dep or rp_dep[0].get("version") != rp_ver:
        err(f"BP -> RP UUID/version dependency mismatch: dep={rp_dep}, rp_ver={rp_ver}")
    else:
        ok(f"BP -> RP UUID & version ({rp_ver}) dependency linked properly")

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

    # Collect geometry identifiers AND their bone names for strict animation verification!
    geo_bones = {}
    for gp in (RP / "models").rglob("*.geo.json"):
        for g in parsed[gp].get("minecraft:geometry", []):
            gid = g.get("description", {}).get("identifier")
            if gid:
                geo_bones[gid] = {b.get("name") for b in g.get("bones", []) if b.get("name")}
    geo_ids = set(geo_bones.keys())

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

    # 6. Entities + Strict 1.8.0 Molang Guard + Bone Verification + Property Client Sync + AI Flight Guard!
    anim_map = {}
    for ap in (RP / "animations").glob("*.json"):
        doc = parsed[ap]
        fv = doc.get("format_version", "")
        for s in collect_strings(doc.get("animations", {})):
            if re.search(r"\bq\.[a-z_]", s):
                err(f"Shorthand 'q.' Molang found in {ap.name} (format_version={fv}): {s}")
        anim_map.update(doc.get("animations", {}))
    anim_ids = set(anim_map.keys())

    ac_map = {}
    for acp in (RP / "animation_controllers").glob("*.json"):
        doc = parsed[acp]
        for s in collect_strings(doc.get("animation_controllers", {})):
            if re.search(r"\bq\.[a-z_]", s):
                err(f"Shorthand 'q.' Molang found in {acp.name}: {s}")
        ac_map.update(doc.get("animation_controllers", {}))
    ac_ids = set(ac_map.keys())

    rc_ids = set()
    for rcp in (RP / "render_controllers").glob("*.json"):
        rc_ids.update(parsed[rcp].get("render_controllers", {}).keys())

    entity_count = 0
    for ep in sorted((BP / "entities").glob("*.json")):
        ent = parsed[ep].get("minecraft:entity", {})
        bp_desc = ent.get("description", {})
        eid = bp_desc.get("identifier")
        comps = ent.get("components", {})
        bp_props = bp_desc.get("properties", {})
        entity_count += 1

        # Anti-erratic-flight regression check!
        if "minecraft:behavior.float_wander" in comps and "minecraft:movement.hover" in comps:
            err(f"Entity {eid} combines erratic float_wander with movement.hover!")
        if eid == "auralis:astral_seraph":
            if "minecraft:follow_range" not in comps:
                err("Boss auralis:astral_seraph missing minecraft:follow_range!")
            if "minecraft:behavior.look_at_target" not in comps:
                err("Boss auralis:astral_seraph missing minecraft:behavior.look_at_target!")

        loot = comps.get("minecraft:loot", {}).get("table")
        if loot and not (BP / loot).exists():
            err(f"Entity {eid} missing loot table: {loot}")
        rp_ep = RP / "entity" / f"{ep.stem}.entity.json"
        if not rp_ep.exists():
            err(f"Entity {eid} missing RP client entity: {rp_ep.name}")
            continue
        desc = parsed[rp_ep].get("minecraft:client_entity", {}).get("description", {})
        ent_bones = set()
        for g in desc.get("geometry", {}).values():
            if g not in geo_ids:
                err(f"Entity {eid} unknown geometry: {g}")
            else:
                ent_bones.update(geo_bones[g])
        for t in desc.get("textures", {}).values():
            if not (RP / f"{t}.png").exists():
                err(f"Entity {eid} missing texture PNG: {t}.png")

        # Verify every animation's bones exist in geometry & every query.property() is client_synced!
        used_props = set()
        for short_name, full_ref in desc.get("animations", {}).items():
            if full_ref not in anim_ids and full_ref not in ac_ids:
                err(f"Entity {eid} unknown animation/controller: {full_ref}")
                continue
            if full_ref in anim_map:
                anim_def = anim_map[full_ref]
                for bname in anim_def.get("bones", {}).keys():
                    if bname not in ent_bones:
                        err(f"Entity {eid} animation '{full_ref}' targets missing bone '{bname}'!")
                for s in collect_strings(anim_def):
                    used_props.update(re.findall(r"query\.property\(['\"]([^'\"]+)['\"]\)", s))
            if full_ref in ac_map:
                for s in collect_strings(ac_map[full_ref]):
                    used_props.update(re.findall(r"query\.property\(['\"]([^'\"]+)['\"]\)", s))

        for prop_id in used_props:
            pdef = bp_props.get(prop_id)
            if not pdef or pdef.get("client_sync") is not True:
                err(f"Entity {eid} RP queries property '{prop_id}' which is missing or not client_sync:true in BP!")

        for rc in desc.get("render_controllers", []):
            if rc not in rc_ids:
                err(f"Entity {eid} unknown render controller: {rc}")

    ok(f"All {entity_count} custom entities verified (zero 'q.' Molang, 100% bone match, client_sync properties, smooth flight AI)")

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

    # 8. Audio & OST Verification via ffprobe + PCM Softness / Headroom Gate!
    sound_defs = parsed.get(RP / "sounds/sound_definitions.json", {}).get("sound_definitions", {})
    ogg_checked = set()
    max_sfx_peak = 0.0
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

                # Decode SFX files to PCM float32 and enforce gentle peak headroom (ZERO harsh brickwalled SFX!)
                if ogg.parent.name == "auralis" and ogg.parent.parent.name == "sounds":
                    dec = subprocess.run(
                        ["ffmpeg", "-v", "error", "-i", str(ogg), "-f", "f32le", "-ac", "2", "-"],
                        capture_output=True,
                    )
                    if dec.returncode != 0 or len(dec.stdout) < 64:
                        err(f"ffmpeg PCM decode failed on SFX {ogg.name}")
                    else:
                        pcm = np.frombuffer(dec.stdout, dtype=np.float32)
                        if not np.all(np.isfinite(pcm)):
                            err(f"Non-finite audio samples in SFX {ogg.name}")
                        pk = float(np.max(np.abs(pcm)))
                        max_sfx_peak = max(max_sfx_peak, pk)
                        if pk < 0.05:
                            err(f"SFX {ogg.name} is nearly silent (peak={pk:.3f})")
                        if pk > 0.68:
                            err(f"SFX {ogg.name} exceeds gentle loudness ceiling (peak={pk:.3f} > 0.68)!")
    ok(f"All {len(sound_defs)} sound/music definitions & {len(ogg_checked)} .ogg files verified (max SFX peak={max_sfx_peak:.3f} <= 0.68 gentle cap!)")

    const_js = (BP / "scripts/constants.js").read_text(encoding="utf-8")
    for s_ref in re.findall(r'["\']((?:auralis|music\.auralis)\.[a-z0-9_.]+)["\']', const_js):
        if s_ref not in sound_defs:
            err(f"constants.js references undefined sound/music ID: {s_ref}")
    ent_ids = {f"auralis:{ep.stem}" for ep in (BP / "entities").glob("*.json")}
    for p_ref in re.findall(r':\s*["\'](auralis:[a-z0-9_]+)["\']', const_js):
        if p_ref in particle_ids or p_ref in all_custom_ids or p_ref in ent_ids or p_ref == "auralis:firmament":
            continue
        err(f"constants.js references unknown auralis ID: {p_ref}")
    ok("All constants.js sound, music, particle, block, item & entity IDs match pack definitions")

    # 9. JavaScript ES Module Syntax Check via Node.js
    js_files = sorted((BP / "scripts").glob("*.js"))
    for jsf in js_files:
        proc = subprocess.run(["node", "--check", str(jsf)], capture_output=True, text=True)
        if proc.returncode != 0:
            err(f"JS syntax error in {jsf.name}: {proc.stderr}")
    ok(f"All {len(js_files)} ES module scripts pass Node.js syntax check")

    # 10. 10,000-Cell Worldgen 2.0 Mathematical Non-Overlap & Archetype Coverage Proof Test!
    test_code = """
import { CELL_SIZE, CELL_SAFE_SPAN, getCellLayout, getZoneAt, getNearestCitadel } from './packs/BP/scripts/noise.js';

const origin = getCellLayout(0, 0);
if (origin.kind !== 'sanctuary') throw new Error('Expected sanctuary at cell (0,0), got ' + origin.kind);
const prom = getCellLayout(0, -1);
if (prom.kind !== 'cloud_plains') throw new Error('Expected cloud_plains promenade at (0,-1), got ' + prom.kind);
const cit = getCellLayout(0, -2);
if (cit.kind !== 'astral_citadel' || cit.cx !== 0 || cit.cz !== -160) {
  throw new Error('Expected First Citadel at (0, -160), got ' + JSON.stringify(cit));
}
const nearest = getNearestCitadel(0, -160);
if (nearest.distance !== 0) throw new Error('getNearestCitadel mismatch at (0, -160)');

const counts = {};
let minGap = Infinity;
for (let gx = -50; gx < 50; gx++) {
  for (let gz = -50; gz < 50; gz++) {
    const a = getCellLayout(gx, gz);
    counts[a.kind] = (counts[a.kind] || 0) + 1;
    // Verify island circle fits strictly inside safe bounding box!
    if (a.radius > 0) {
      if (a.cx - a.radius < a.minX || a.cx + a.radius > a.maxX || a.cz - a.radius < a.minZ || a.cz + a.radius > a.maxZ) {
        throw new Error(`Cell (${gx},${gz}) island breaches safe bounds: ${JSON.stringify(a)}`);
      }
    }
    // Verify East & South neighbors have >= 10 blocks guaranteed sky separation!
    const east = getCellLayout(gx + 1, gz);
    const south = getCellLayout(gx, gz + 1);
    const gapX = east.minX - a.maxX;
    const gapZ = south.minZ - a.maxZ;
    minGap = Math.min(minGap, gapX, gapZ);
    if (gapX < 10 || gapZ < 10) {
      throw new Error(`Cell overlap risk between (${gx},${gz}) and neighbor! gapX=${gapX}, gapZ=${gapZ}`);
    }
  }
}
for (const req of ['sanctuary', 'cloud_plains', 'pearl_atolls', 'bell_reefs', 'spire_gardens', 'astral_citadel']) {
  if (!counts[req]) throw new Error('Missing macro-cell archetype in 10,000-cell grid: ' + req);
}
console.log(`10,000-cell non-overlap proof PASSED (min sky gap=${minGap} blocks): ${JSON.stringify(counts)}`);
"""
    proc = subprocess.run(["node", "--input-type=module", "-e", test_code], cwd=ROOT, capture_output=True, text=True)
    if proc.returncode != 0:
        err(f"Worldgen 2.0 10,000-cell proof failed: {proc.stderr}")
    else:
        ok(proc.stdout.strip())

    # 11. Custom 3D Block Geometry UV Bounds & Texture Dimension Alignment Check!
    block_geo_checked = 0
    for gp in sorted((RP / "models/blocks").glob("*.geo.json")):
        doc = parsed[gp]
        for g in doc.get("minecraft:geometry", []):
            desc = g.get("description", {})
            gid = desc.get("identifier", gp.stem)
            tw = desc.get("texture_width", 16)
            th = desc.get("texture_height", 16)
            # Cross-check against matching block texture PNG size
            tex_p = RP / "textures/blocks" / f"{gp.stem}.png"
            if tex_p.exists():
                iw, ih = Image.open(tex_p).size
                if (iw, ih) != (tw, th):
                    err(f"Block model {gp.name} declares texture ({tw}x{th}) but {tex_p.name} is ({iw}x{ih})!")
            for b in g.get("bones", []):
                for ci, cube in enumerate(b.get("cubes", [])):
                    uv = cube.get("uv")
                    if isinstance(uv, dict):
                        for fname, fuv in uv.items():
                            u0, v0 = fuv.get("uv", [0, 0])
                            du, dv = fuv.get("uv_size", [0, 0])
                            u1, v1 = u0 + du, v0 + dv
                            if min(u0, u1) < 0 or max(u0, u1) > tw or min(v0, v1) < 0 or max(v0, v1) > th:
                                err(f"Block model {gid} bone '{b.get('name')}' cube {ci} face '{fname}' UV [{u0},{v0}]+[{du},{dv}] overflows {tw}x{th}!")
                    elif isinstance(uv, list):
                        u0, v0 = uv
                        sx, sy, sz = cube.get("size", [0, 0, 0])
                        if u0 < 0 or v0 < 0 or (u0 + 2 * (sx + sz)) > tw or (v0 + sz + sy) > th:
                            err(f"Block model {gid} bone '{b.get('name')}' cube {ci} box-UV [{u0},{v0}] overflows {tw}x{th}!")
            block_geo_checked += 1
    ok(f"All {block_geo_checked} custom 3D block models pass strict UV bounds & atlas size checks")

    # 12. Simulated-Bedrock Simulation-Distance-4 25-Cell Runtime Worldgen Streaming Proof Test!
    sim_test_code = r"""
import { registerHooks } from 'node:module';

const SIM_DIST = 4;
const MAX_TICKING_CHUNKS = 100;
const activeAreas = new Map();
const blocks = new Map();
const dynProps = new Map();
const playerPos = { x: 0.5, y: 92, z: 5.5 };
let missedWrites = 0;
let currentTick = 0;
const jobs = [];
const timeouts = [];

const bkey = (x, y, z) => `${x},${y},${z}`;
const chunkOf = (v) => Math.floor(v / 16);

function isChunkLoaded(cx, cz) {
  const pcx = chunkOf(playerPos.x);
  const pcz = chunkOf(playerPos.z);
  if (Math.abs(cx - pcx) + Math.abs(cz - pcz) <= SIM_DIST) return true;
  for (const a of activeAreas.values()) {
    if (cx >= a.minCx && cx <= a.maxCx && cz >= a.minCz && cz <= a.maxCz) return true;
  }
  return false;
}

function areaChunkCount(from, to) {
  return (chunkOf(Math.max(from.x, to.x)) - chunkOf(Math.min(from.x, to.x)) + 1) *
         (chunkOf(Math.max(from.z, to.z)) - chunkOf(Math.min(from.z, to.z)) + 1);
}

function totalTickingChunks() {
  let s = 0;
  for (const a of activeAreas.values()) s += a.chunks;
  return s;
}

const mockDim = {
  id: 'auralis:firmament',
  getPlayers: () => [{ isValid: true, location: { ...playerPos } }],
  getBlock(loc) {
    const x = Math.floor(loc.x), y = Math.floor(loc.y), z = Math.floor(loc.z);
    if (!isChunkLoaded(chunkOf(x), chunkOf(z))) return undefined;
    const k = bkey(x, y, z);
    return {
      get typeId() { return blocks.get(k) || 'minecraft:air'; },
      get isAir() { return this.typeId === 'minecraft:air'; },
      get isLiquid() { return this.typeId === 'minecraft:water'; },
      setType(id) { blocks.set(k, id); },
      setPermutation(perm) { blocks.set(k, perm.typeId); },
      getComponent(cid) {
        if (cid === 'minecraft:inventory') return { container: { setItem() {} } };
        return undefined;
      },
    };
  },
  setBlockType(loc, id) {
    const x = Math.floor(loc.x), y = Math.floor(loc.y), z = Math.floor(loc.z);
    if (!isChunkLoaded(chunkOf(x), chunkOf(z))) { missedWrites++; throw new Error('Unloaded chunk write'); }
    blocks.set(bkey(x, y, z), id);
  },
  spawnEntity() { return { isValid: true }; },
  runCommand() {},
};

const mockServer = {
  world: {
    getDimension: () => mockDim,
    getDynamicProperty: (k) => dynProps.get(k),
    setDynamicProperty: (k, v) => dynProps.set(k, v),
    tickingAreaManager: {
      maxChunkCount: MAX_TICKING_CHUNKS,
      get chunkCount() { return totalTickingChunks(); },
      hasTickingArea: (id) => activeAreas.has(id),
      getAllTickingAreas: () => [...activeAreas.values()].map(a => ({ identifier: a.id })),
      hasCapacity(opts) {
        return totalTickingChunks() + areaChunkCount(opts.from, opts.to) <= MAX_TICKING_CHUNKS;
      },
      async createTickingArea(id, opts) {
        const chunks = areaChunkCount(opts.from, opts.to);
        if (totalTickingChunks() + chunks > MAX_TICKING_CHUNKS) throw new Error('Ticking area capacity exceeded');
        activeAreas.set(id, {
          id, chunks,
          minCx: chunkOf(Math.min(opts.from.x, opts.to.x)),
          maxCx: chunkOf(Math.max(opts.from.x, opts.to.x)),
          minCz: chunkOf(Math.min(opts.from.z, opts.to.z)),
          maxCz: chunkOf(Math.max(opts.from.z, opts.to.z)),
        });
      },
      removeTickingArea(id) { activeAreas.delete(id); },
      removeAllTickingAreas() { activeAreas.clear(); },
    },
  },
  system: {
    get currentTick() { return currentTick; },
    runJob(gen) { jobs.push(gen); return jobs.length; },
    waitTicks(n) { return new Promise((resolve) => timeouts.push({ at: currentTick + n, fn: resolve })); },
    runTimeout(fn, n) { timeouts.push({ at: currentTick + n, fn }); },
  },
  BlockPermutation: {
    resolve: (typeId, states) => ({ typeId, states: states || {} }),
  },
  ItemStack: class ItemStack { constructor(id, count = 1) { this.typeId = id; this.amount = count; } },
};

globalThis.__MOCK_MC_SERVER = mockServer;
registerHooks({
  resolve(specifier, ctx, next) {
    if (specifier === '@minecraft/server') return { shortCircuit: true, url: 'mock:mc-server' };
    return next(specifier, ctx);
  },
  load(url, ctx, next) {
    if (url === 'mock:mc-server') {
      return {
        shortCircuit: true,
        format: 'module',
        source: 'const m = globalThis.__MOCK_MC_SERVER; export const { world, system, BlockPermutation, ItemStack } = m;',
      };
    }
    return next(url, ctx);
  },
});

const wg = await import('./packs/BP/scripts/worldgen.js');
const { getCellLayout, CELL_SIZE } = await import('./packs/BP/scripts/noise.js');

async function pump(maxTicks = 600) {
  for (let i = 0; i < maxTicks; i++) {
    currentTick++;
    for (let j = jobs.length - 1; j >= 0; j--) {
      for (let s = 0; s < 5000; s++) {
        if (jobs[j].next().done) { jobs.splice(j, 1); break; }
      }
    }
    for (let t = timeouts.length - 1; t >= 0; t--) {
      if (timeouts[t].at <= currentTick) {
        const fn = timeouts.splice(t, 1)[0].fn;
        fn();
      }
    }
    await Promise.resolve();
    await Promise.resolve();
  }
}

wg.ensureSanctuaryReady();
await pump(30);
for (let round = 0; round < 35; round++) {
  wg.tickWorldGen();
  await pump(25);
  const st = wg.getWorldGenStatus();
  if (st.chartedCount >= 25 && !st.activeCell) break;
}
await pump(20);

const st = wg.getWorldGenStatus();
const counts = {};
let gapViolations = 0;
let crystalViolations = 0;
for (const [k, id] of blocks.entries()) {
  if (id === 'minecraft:air') continue;
  counts[id] = (counts[id] || 0) + 1;
  const [x, y, z] = k.split(',').map(Number);
  const gx = Math.round(x / CELL_SIZE);
  const gz = Math.round(z / CELL_SIZE);
  const lay = getCellLayout(gx, gz);
  if (x < lay.minX || x > lay.maxX || z < lay.minZ || z > lay.maxZ) gapViolations++;
  if (id === 'auralis:sea_crystal') {
    const below = blocks.get(bkey(x, y - 1, z)) || 'minecraft:air';
    if (below === 'minecraft:air' || below === 'minecraft:water') crystalViolations++;
  }
}

if (typeof st.chartedCount !== 'number' || st.chartedCount < 25) {
  throw new Error(`Expected >=25 streamed cells at SimDist 4, got ${st.chartedCount}`);
}
if (st.activeCell) throw new Error(`Worldgen left active cell unfinished: ${JSON.stringify(st.activeCell)}`);
if (missedWrites !== 0) throw new Error(`Detected ${missedWrites} writes to unloaded chunks!`);
if (mockServer.world.tickingAreaManager.chunkCount !== 0) throw new Error(`Leaked ${mockServer.world.tickingAreaManager.chunkCount} ticking chunks!`);
if (gapViolations !== 0) throw new Error(`Detected ${gapViolations} sky-gap boundary violations!`);
if (crystalViolations !== 0) throw new Error(`Detected ${crystalViolations} ungrounded/underwater sea_crystals!`);
if ((counts['auralis:vespera_altar'] || 0) < 1) throw new Error('Expected >=1 Vespera Altar generated!');
if ((counts['auralis:lantern_bloom'] || 0) < 100) throw new Error('Expected >=100 Lantern Blooms generated!');
if ((counts['auralis:cloud_vent'] || 0) < 10) throw new Error('Expected >=10 Cloud Vents generated!');
console.log(
  `Sim-Dist-4 runtime proof PASSED: ${st.chartedCount}/25 cells, ${blocks.size} blocks, ` +
  `0 missed writes, 0 leaked chunks, 0 gap violations, 0 bad crystals ` +
  `(altars=${counts['auralis:vespera_altar']}, vents=${counts['auralis:cloud_vent']}, ` +
  `lanterns=${counts['auralis:lantern_bloom']}, chests=${counts['minecraft:chest'] || 0})`
);
"""
    proc2 = subprocess.run(["node", "--input-type=module", "-e", sim_test_code], cwd=ROOT, capture_output=True, text=True)
    if proc2.returncode != 0:
        err(f"Sim-Dist-4 runtime worldgen proof failed: {proc2.stderr or proc2.stdout}")
    else:
        ok(proc2.stdout.strip())

    print("\n===============================================")
    if errors:
        print(f"VALIDATION FAILED with {len(errors)} error(s) and {len(warnings)} warning(s).")
        sys.exit(1)
    else:
        print(f"ALL CHECKS PASSED! 0 errors, {len(warnings)} warnings.")


if __name__ == "__main__":
    main()
