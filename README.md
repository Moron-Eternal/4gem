# ✦ Auralis: The Prism-Tide Firmament (v2.0) ✦

**A Minecraft: Bedrock Edition (1.26.50+) Custom Dimension Add-On**

*Step beyond the Overworld, the Nether, and the End — into an endless celestial twilight archipelago of vast pearl-alabaster continents, walkable rose-gold cloud plains, glowing updraft vents, soaring bell-towers, wayfarer sky-pavilions, weeping prism-coral groves, 9 bespoke animated creatures, and The Astral Seraph boss.*

---

## ✨ What Makes Auralis Unique

Built natively on Minecraft Bedrock's **stable 1.26.50 Custom Dimension JSON (`dimensions/firmament.json`)** (zero experimental Beta API toggles required!), **Auralis (`auralis:firmament`)** combines a **zero-overlap, zero-cutoff 80×80 Macro-Cell Worldgen 2.0 engine**, **full Vibrant Visuals PBR materials & colored local lighting**, **4 original studio-synthesized soundtrack tracks**, **31 gentle remastered sound effects**, **15 custom particle VFX**, **20 custom blocks**, **12 relics & items**, and **9 custom-modeled multi-state animated creatures** culminating in a **sculpted 24-bone 3-phase boss fight**.

### 🌟 Signature Features
- **Native Custom Dimension (`auralis:firmament`)** — Separate dimension space with a rose-gold cloud sea positioned **below the floating islands (`Y = 32`)**, volumetric lavender-peach twilight fog, Vibrant Visuals atmospheric scattering, painterly color grading, crystal-clear turquoise caustics water, and colored point lights.
- **Unique Entry Mechanic: The Harmonic Wellspring & Sky-Gaze Ascension** — No obsidian portal frames! Build a 3×3 reflecting mirror pool around a **Celestial Astrolabe Pedestal**, strike it with a **Starlight Tuning Fork** to watch a 4.5-second harmonic convergence transform the water into **Starlight Veil**, then stand atop the awakened Astrolabe and **gaze straight up at the sky** (or crouch) to ascend through a rose-gold veil onto **Sanctuary Crown 2.0**.
- **Worldgen 2.0 — Huge Non-Overlapping Islands, Walkable Cloud Plains & 6 Architectural Landmarks**:
  - **Zero Cutoffs & Zero Clipping:** Full bounding-box chunk-load gating guarantees islands never slice off mid-chunk, while strict `80×80` macro-cell margins mathematically prevent neighboring islands from merging or clipping into each other.
  - **Sanctuary Crown 2.0 (`0, 84, 0`, 56 blocks wide)** — Arrival observatory plateau with the Mirrored Astrolabe Dais, a Prism-Wood & Alabaster **Wayfarer Gazebo**, twin starlight waterfalls, grounded rocky crystal outcrops, and **4 Cardinal Cloud-Vent Launch Piers**.
  - **Rose-Gold Cloud Plains & Cloud-Harbor Shrines** — Sprawling walkable `Luminous Cloudstone` & `Rose-Gold Cloud Bank` meadows (`52–64` blocks wide!) featuring timber sky-docks, cozy harbor shelters, and glowing **Updraft Cloud-Vents** that lift you effortlessly up to elevated islands!
  - **Pearl-Terrace Atolls** — Vast `46–56`-block Tide-Moss plateaus crowned by ornate domed **Wayfarer Sky-Pavilions** with crafting tables, lanterns, supply chests, and Prism-Coral groves.
  - **Sunken Bell-Reefs** — Tranquil reflecting lagoons bridged by Prism-Wood boardwalks surrounding **22-block climbable Alabaster & Brass Bell-Towers** with interior spiral staircases and belfry treasure.
  - **Gilded Spire Gardens** — Broad terraced marble amphitheaters hosting shattered **Celestial Observatory Ruins** beneath hovering golden armillary rings.
  - **Grand Astral Citadels** *(first citadel sits at `0, 100, -160`, connected via a scenic Cloud Promenade!)* — Wide, unobstructed 52-block circular boss arenas housing the **Vespera Sanctum Altar**.
- **Buoyant Rose-Gold Cloud Sea** — Plunging below `Y = 24` triggers a gentle rose-gold updraft that lifts you safely skyward with Slow Falling instead of instant void loss.

---

## 🎵 Original Soundtrack (OST) & Gentle Remastered SFX

All audio is originally composed and synthesized in stereo 44.1 kHz Ogg Vorbis (`tools/generate_audio.py`) with warm, ear-friendly linear headroom and soft acoustic/felt-mallet voicing:

| Track | Key / Mood | Plays In |
| :--- | :--- | :--- |
| **`Glass Horizon`** (`glass_horizon.ogg`) | D Lydian · Concert Harp, Felt Celesta, Choir Pads & Cello | Sanctuary Crown & Pearl-Terrace Atolls |
| **`Drifting Atolls`** (`drifting_atolls.ogg`) | A Lydian · Spacious Cathedral Bells, Singing Bowls & Chimes | Gilded Spire Gardens & Astral Citadels |
| **`Sunken Chimes`** (`sunken_chimes.ogg`) | E Minor 9 · Rolling Harp Waves & Warm Twilight Kalimba | Sunken Bell-Reefs & Rose-Gold Cloud Plains |
| **`Crescendo of the Glass Tide`** (`seraph_crescendo.ogg`) | D Minor / Phrygian · Timpani, Warm Brass-Choir & Ostinato | **The Astral Seraph** Boss Battle |

Plus **31 gentle remastered SFX**: singing-bowl ritual chimes, Lydian harp portal glissandos, velvety cloud footsteps & updraft breezes, warm marimba crystal chimes, Gale-Prism whooshes, Starblade sweeps, Astral Lyre chords, and bespoke calls for all 9 creatures!

---

## 🌀 How to Enter Auralis (The Harmonic Wellspring Ritual)

1. **Craft the two instruments** (recipes unlock automatically when holding Amethyst Shards, Gold Ingots, or Ender Pearls):
   - **Starlight Tuning Fork** (`auralis:tuning_fork`): Amethyst Shards + Gold Ingots + Copper Ingot
   - **Celestial Astrolabe Pedestal** (`auralis:astrolabe_pedestal`): Gold Ingots + Amethyst Shard + Quartz Blocks + Ender Pearl
2. **Build a 3×3 Reflecting Mirror Pool** under the open sky:
   ```text
   [C]  [W]  [C]
   [W]  [A]  [W]
   [C]  [W]  [C]
   ```
   - **`[A]`** = Celestial Astrolabe Pedestal
   - **`[W]`** = Still Water
   - **`[C]`** = Amethyst Block, Prismarine, Gold Block, Quartz Block, Gilded Brass, Gilded Travertine, or Solarium Block
3. **Strike the Astrolabe** with your **Starlight Tuning Fork** to transform the pool into glowing **Starlight Veil**.
4. **Ascend!** Stand atop the Awakened Astrolabe and **Look Straight Up at the Sky** (or Sneak) for 1 second.
5. **Return Anytime:** Stand atop the Awakened Astrolabe at the heart of the Sanctuary Crown (or any shrine you build in Auralis) and look up at the sky again to return right to your exact Overworld shrine!

*(Every new explorer automatically receives the **Chronicle of Auralis** guidebook, or open it anytime with `/auralis:codex`!)*

---

## 🦋 Bestiary — 9 Custom 3D Animated Creatures (+ Boss)

| Creature | Role | Highlights |
| :--- | :--- | :--- |
| **Lumina Ray** (`auralis:lumina_ray`) | Passive Sky-Manta | Cruises in serene sweeping sky arcs trailing stardust. Feed a **Prism Berry** for **Slow Falling & Night Vision**! |
| **Nimbus Stag** (`auralis:nimbus_stag`) | Passive Cloud-Deer *(New!)* | Graceful antlered deer roaming Tide-Moss plateaus & Cloud Plains in herds. Feed a **Prism Berry** for **Speed & Jump Boost**! |
| **Aurelia Cloud-Jelly** (`auralis:tide_jelly`) | Passive Sky-Jellyfish *(New!)* | Calm bioluminescent jellyfish pulsing rhythmically with 6 flowing tentacles above Bell-Reefs & Cloud Plains. |
| **Choir Wisp** (`auralis:choir_wisp`) | Friendly Lantern-Spirit | Smooth-hovering porcelain bell spirit drawn curiously to Tuning Forks, Solarium & the Astral Lyre. |
| **Tide-Glass Crab** (`auralis:glass_crab`) | Neutral Reef-Dweller | Crystal-shelled lagoon crustacean; peaceful until provoked. Drops **Prism Shards**. |
| **Shard Stalker** (`auralis:shard_stalker`) | Aggressive Lynx *(New!)* | Agile twilight feline predator with glowing crystal dorsal spines stalking island ruins with leaping melee ambushes. |
| **Astral Weaver** (`auralis:astral_weaver`) | Aggressive Caster *(New!)* | Cloaked hovering ruin mage with crescent-moon mask, orbiting sigil & animated dual-orb spellcasting. |
| **Gilded Sentinel** (`auralis:gilded_sentinel`) | Aggressive Guardian | Controlled hovering temple construct with rotating halo firing **Astral Pulse Bolts**. |
| **✦ The Astral Seraph ✦** (`auralis:astral_seraph`) | **3-Phase Boss (v2.0)** | Sculpted 24-bone winged celestial sovereign wielding a radiant **Astral Halberd** with 5 synced combat animations, smooth target-facing rotation, arena-tethered flight, and 4 telegraphed attacks (**Bolt Volley**, **Radiant Swoop Slash**, **Harmonic Nova**, **Falling Star-Pillars**). Drops **Sovereign's Starblade** & **Astral Lyre**! |

---

## 🧱 Custom Blocks & Relics

- **20 Custom Blocks (all with PBR MER + Heightmap Texture Sets & Vibrant Visuals Local Lights):**
  `Auralite Travertine`, `Twilight Starstone`, `Tide-Moss Auralite`, `Gilded Travertine`, `Solarium Ore`, `Block of Solarium`, `Prism-Coral Log` *(centered concentric rings & organic bark)*, `Prism-Coral Planks`, `Prism-Coral Canopy`, `Starlight Etched Glass`, `Auralis Sea-Crystal` *(faceted 3D geode cluster)*, `Lantern Bloom`, `Singing Chime-Reed`, `Celestial Gilded Brass`, `Luminous Cloudstone` *(walkable cloud plains!)*, `Rose-Gold Cloud Bank`, `Updraft Cloud-Vent` *(vertical wind launcher!)*, `Celestial Astrolabe Pedestal`, `Starlight Mirror Veil`, and `Vespera Sanctum Altar`.
- **12 Custom Items & Relics:**
  `Starlight Tuning Fork`, `Auralis Gale-Prism`, `Sovereign's Starblade`, `Astral Lyre`, `Solarium Pickaxe`, `Resonant Star-Core`, `Celestial Nectar`, `Prism Berry`, `Prism Shard`, `Raw Solarium`, `Solarium Ingot`, and `Chronicle of Auralis`.

---

## 📦 Installation

### Option 1: One-Click `.mcaddon` Install
1. Download **`dist/Auralis_Firmament.mcaddon`**.
2. Double-click (or open with Minecraft) on Windows, macOS, iOS, or Android to import **Auralis BP v2.0** and **Auralis RP v2.0**.
3. Create a **new world** in **Minecraft: Bedrock Edition 1.26.50+** *(recommended so Worldgen 2.0's clean `80×80` macro-cell islands and cloud plains generate fresh)*:
   - Activate **Auralis: The Prism-Tide Firmament** under **Behavior Packs** (and verify **Resource Packs** is paired).
   - Enable **Vibrant Visuals** in Video Settings for full PBR lighting, volumetric twilight fog, and turquoise water caustics *(also works cleanly in Classic/Fancy graphics!)*.

### Helpful Commands
- `/auralis:codex` — Open the **Chronicle of Auralis** guidebook & Live OST Jukebox (available to all players, no cheats required).
- `/auralis:kit` — Grant a starter **Harmonic Wellspring Kit** *(Operator / Cheats)*.
- `/auralis:ascend` — Directly ascend to Auralis or return to the Overworld *(Operator / Cheats)*.

---

## 🛠️ Rebuilding & Validation (For Developers)

```bash
python3 tools/generate_textures.py      # Regenerate 23 PBR block sets, 12 items, 10 PBR entity skins & particle atlas
python3 tools/generate_audio.py         # Re-synthesize 4 stereo OST tracks & 31 gentle remastered SFX -> .ogg Vorbis
python3 tools/build_blocks_items.py     # Rebuild 20 BP blocks, 12 items, 19 recipes & 13 loot tables
python3 tools/build_entities.py         # Rebuild 10 BP/RP entities, 3D geometries, query.* animations & controllers
python3 tools/build_particles_lang.py   # Rebuild 15 particle VFX JSONs & en_US.lang
python3 tools/validate_addon.py         # Run full static, PBR, Molang/bone, audio softness & 10,000-cell worldgen tests
python3 tools/build_mcaddon.py          # Bundle dist/Auralis_Firmament.mcaddon
```
