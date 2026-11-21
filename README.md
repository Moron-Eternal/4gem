# ✦ Auralis: The Prism-Tide Firmament ✦

**A Minecraft: Bedrock Edition (1.26.50+) Custom Dimension Add-On**

*Step beyond the Overworld, the Nether, and the End — into an endless celestial twilight archipelago of pearl-alabaster atolls, glowing turquoise lagoons, floating golden astrolabe rings, weeping prism-coral canopies, and a buoyant sea of rose-gold clouds suspended beneath your feet.*

---

## ✨ What Makes Auralis Unique

Unlike the Overworld's sunlit earth, the Nether's crimson caverns, or the End's bleak black void, **Auralis (`auralis:firmament`)** is a luminous twilight sky-archipelago built on Minecraft Bedrock's **native 1.26.50 Custom Dimension JSON (`dimensions/firmament.json`)** paired with a **zero-lag procedural world generator**, **full Vibrant Visuals PBR support**, **4 original studio-synthesized soundtrack tracks**, **25 custom sound effects**, **13 custom particle VFX**, **17 custom blocks**, **12 relics & items**, and **5 custom-modeled animated mobs** culminating in a **3-phase boss encounter**.

### 🌟 Signature Features
- **Native Custom Dimension (`auralis:firmament`)** — Separate dimension space with a rose-gold cloud sea positioned **below the floating islands (`Y = 32`)**, volumetric lavender-peach twilight fog, custom Vibrant Visuals atmospheric scattering, painterly color grading, crystal-clear turquoise caustics water, and colored point lights — **no experimental Beta API toggles required!**
- **Buoyant Rose-Gold Cloud Sea** — Plunging off an island below `Y = 24` triggers a shimmering rose-gold updraft that buoys you back skyward with Slow Falling instead of instant void frustration.
- **Unique Entry Mechanic: The Harmonic Wellspring & Sky-Gaze Ascension** — No obsidian portal frames! Build a 3×3 reflecting mirror pool around a **Celestial Astrolabe Pedestal**, strike it with a **Starlight Tuning Fork** to watch a 4.5-second multi-stage harmonic convergence transform the water into **Starlight Veil**, then stand atop the awakened Astrolabe and **gaze straight up at the sky** (or crouch) to ascend through a rose-gold camera fade and float down onto the **Sanctuary Crown**.
- **Infinite Procedural Multi-Zone Archipelago**:
  - **Sanctuary Crown (`0, 84, 0`)** — Guaranteed pre-built arrival observatory framed by twin giant golden astrolabe rings, weeping Prism-Coral trees, and a cascading starlight waterfall pouring into the clouds.
  - **Pearl-Terrace Atolls** — Sweeping alabaster travertine & iridescent Tide-Moss islands veined with glowing Solarium Ore beneath their starstone roots.
  - **Gilded Spire Gardens** — Soaring cathedral-like alabaster & celestial brass pinnacles orbited by floating golden astrolabe rings.
  - **Sunken Bell-Reefs** — Luminous low-altitude turquoise lagoons housing ruined Alabaster Bell-Temples with treasure chests.
  - **Astral Citadels** *(first citadel sits ~112 blocks North of spawn!)* — Grand domed sky-palaces housing the **Vespera Sanctum Altar**.

---

## 🎵 Original Soundtrack (OST) & Custom Audio

All audio is originally composed and synthesized in stereo 44.1 kHz Ogg Vorbis with algorithmic hall reverb & octave shimmer delay (`tools/generate_audio.py`), driven both natively by `client_biome.json` (`minecraft:biome_music` + `minecraft:ambient_sounds`) and by an intelligent Script API **Dynamic OST Director** (`packs/BP/scripts/ambience.js`) plus a **Live Jukebox** inside the Chronicle of Auralis:

| Track | Key / Mood | Plays In |
| :--- | :--- | :--- |
| **`Glass Horizon`** (`glass_horizon.ogg`) | D Lydian · Concert Harp, Glass Celesta, Choir Pads & Cello | Sanctuary Crown & Pearl-Terrace Atolls |
| **`Drifting Atolls`** (`drifting_atolls.ogg`) | A Lydian · Spacious Cathedral Bells, Singing Bowls & Chimes | Gilded Spire Gardens & Astral Citadels |
| **`Sunken Chimes`** (`sunken_chimes.ogg`) | E Minor 9 · Rolling Harp Waves & Intimate Twilight Kalimba | Sunken Bell-Reefs |
| **`Crescendo of the Glass Tide`** (`seraph_crescendo.ogg`) | D Minor / Phrygian · Driving Taiko, Brass-Choir & Ostinato | **The Astral Seraph** Boss Battle |

Plus **25 custom sound effects**: tuning fork strikes, harmonic ritual swells, Lydian harp portal glissandos, seamless twilight breeze & wind-chimes, musical pentatonic Sea-Crystal & Chime-Reed steps, Gale-Prism wind bursts, Starblade crescent slashes, Astral Lyre chords, whale-like Lumina Ray calls, Choir Wisp melodies, Sentinel pulses, and Seraph boss fanfares!

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
3. **Strike the Astrolabe** with your **Starlight Tuning Fork**. Watch the harmonic rings pulse outward, corner star-pillars ignite, and the water turn into glowing **Starlight Veil**.
4. **Ascend!** Stand atop the Awakened Astrolabe and **Look Straight Up at the Sky** (or Sneak) for 1 second. You will lift gracefully into a rose-gold twilight veil and descend gently onto the **Sanctuary Crown**!
5. **Return Anytime:** Stand atop the Awakened Astrolabe at the heart of the Sanctuary Crown (or any shrine you build in Auralis) and look up at the sky again to return right to your exact Overworld shrine!

*(Tip: Every new explorer automatically receives the **Chronicle of Auralis** guidebook, or open it anytime with `/auralis:codex`!)*

---

## 🦋 Bestiary — 5 Custom 3D Animated Mobs (+ Boss)

| Creature | Role | Highlights |
| :--- | :--- | :--- |
| **Lumina Ray** (`auralis:lumina_ray`) | Passive Sky-Manta | Glides serenely between islands trailing stardust (`auralis:manta_trail`). Feed it a **Prism Berry** to hear its whale-song and receive **Slow Falling & Night Vision**! |
| **Choir Wisp** (`auralis:choir_wisp`) | Friendly Lantern-Spirit | Porcelain-and-gold bell spirit with orbiting crystal petals; drawn curiously to Tuning Forks, Solarium & the Astral Lyre. |
| **Tide-Glass Crab** (`auralis:glass_crab`) | Neutral Reef-Dweller | Carries a glowing sea-crystal cluster on its shell; peaceful until provoked. Drops **Prism Shards**. |
| **Gilded Sentinel** (`auralis:gilded_sentinel`) | Hostile Guardian | Floating alabaster-and-brass construct with a rotating golden halo firing **Astral Pulse Bolts**. Drops **Solarium Ingots** & **Resonant Star-Cores**. |
| **✦ The Astral Seraph ✦** (`auralis:astral_seraph`) | **3-Phase Boss** | Summoned by offering a **Resonant Star-Core** at a **Vespera Sanctum Altar** inside an Astral Citadel. Features 3 pairs of articulated luminous wings, twin counter-rotating astrolabe halos, custom boss OST, Harmonic Shockwaves, Guardian summons, and dodgeable Falling Star-Pillars! Drops the legendary **Sovereign's Starblade** & **Astral Lyre**. |

---

## 🧱 Custom Blocks & Relics

- **17 Custom Blocks (all with PBR MER + Heightmap Texture Sets & Vibrant Visuals Local Lights):**
  `Auralite Travertine`, `Twilight Starstone`, `Tide-Moss Auralite`, `Gilded Travertine`, `Solarium Ore`, `Block of Solarium`, `Prism-Coral Log` (rotatable!), `Prism-Coral Planks`, `Prism-Coral Canopy`, `Starlight Etched Glass`, `Auralis Sea-Crystal` *(3D cluster)*, `Lantern Bloom` *(3D lantern)*, `Singing Chime-Reed` *(3D musical wind-chimes)*, `Celestial Gilded Brass`, `Celestial Astrolabe Pedestal` *(3D armillary gateway)*, `Starlight Mirror Veil`, and `Vespera Sanctum Altar` *(3D boss dais)*.
- **12 Custom Items & Relics:**
  `Starlight Tuning Fork` *(ritual igniter + harmonic landmark compass in Auralis!)*, `Auralis Gale-Prism` *(rose-gold sky-dash + Slow Falling)*, `Sovereign's Starblade` *(unleashes a sweeping Crescent Starlight Wave!)*, `Astral Lyre` *(plays rolled harp chords & heals nearby players/Rays)*, `Solarium Pickaxe`, `Resonant Star-Core`, `Celestial Nectar`, `Prism Berry`, `Prism Shard`, `Raw Solarium`, `Solarium Ingot`, and `Chronicle of Auralis` *(interactive UI guidebook & OST Jukebox)*.

---

## 📦 Installation

### Option 1: One-Click `.mcaddon` Install (Easiest!)
1. Download **`dist/Auralis_Firmament.mcaddon`**.
2. Double-click (or open with Minecraft) on Windows, macOS, iOS, or Android to import both **Auralis BP** and **Auralis RP**.
3. Create a new world (or edit an existing world) in **Minecraft: Bedrock Edition 1.26.50+**:
   - Activate **Auralis: The Prism-Tide Firmament** under **Behavior Packs** (this pairs the Resource Pack automatically; verify it is also active under **Resource Packs**).
   - Enable **Vibrant Visuals** in Video Settings for the full PBR, volumetric twilight fog, glowing emissive crystals, and turquoise water caustics experience *(also looks gorgeous in Classic/Fancy graphics!)*.

### Option 2: Manual / Development Pack Install
Copy `packs/BP` into `com.mojang/development_behavior_packs/Auralis_BP` and `packs/RP` into `com.mojang/development_resource_packs/Auralis_RP`.

### Helpful Commands
- `/auralis:codex` — Open the **Chronicle of Auralis** guidebook & Live OST Jukebox (available to all players, no cheats required).
- `/auralis:kit` — Grant a starter **Harmonic Wellspring Kit** *(Operator / Cheats)*.
- `/auralis:ascend` — Directly ascend to Auralis or return to the Overworld *(Operator / Cheats)*.

---

## 🛠️ Rebuilding & Validation (For Developers)

Every texture, PBR map, OST track, SFX, JSON definition, and `.mcaddon` package can be rebuilt and verified reproducibly:

```bash
python3 tools/generate_textures.py      # Regenerate 16x16 pixel art, PBR MER+heightmaps, mob skins & particle atlas
python3 tools/generate_audio.py         # Re-synthesize all 4 stereo OST tracks & 25 custom SFX -> .ogg Vorbis
python3 tools/build_blocks_items.py     # Rebuild BP blocks, items, recipes & loot tables
python3 tools/build_entities.py         # Rebuild BP/RP entities, 3D geometries, animations & controllers
python3 tools/build_particles_lang.py   # Rebuild 13 particle VFX JSONs & en_US.lang
python3 tools/validate_addon.py         # Run full static, PBR, ffprobe audio, JS syntax & noise tests
python3 tools/build_mcaddon.py          # Bundle dist/Auralis_Firmament.mcaddon
```
