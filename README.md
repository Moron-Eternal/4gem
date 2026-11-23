# Pokémon FireRed — Tactical Elemental Physics Battle Simulator

A playable GBA-style turn-based **Pokémon FireRed RPG**, **real-time 2D pixel-physics battle simulator**, and **2-Player Local Co-Op Versus Arena** built with Vite, TypeScript, Vanilla CSS, HTML5 Canvas, Web Audio API, and official **PokéAPI** sprites.

## Features

- **Official 1:1 Native PokéAPI Sprites & Hand-Authored GBA Overworld Art**:
  - Uses authentic official Pokémon FireRed/LeafGreen (Gen 3) and Platinum (Gen 4) sprites plus official PokéAPI item icons from [`PokeAPI/sprites`](https://github.com/PokeAPI/sprites), rendered razor-sharp at native `1:1` pixel resolution inside a `384×216` composite battle stage (2× crisp physics pixel layer).
  - Hand-authored 16×16 FireRed overworld tileset (dappled sunlit trees, autotiled bordered roads, shingled roofs, Oak's Lab bookshelves & CRT research monitors, Pewter sandstone masonry, Cerulean aquatic ceramic gym walls, 3-frame animated tall grass, 4-frame shimmering shoreline water) and 4-direction 3-frame animated character sprites.
- **Multi-Phase FireRed Opening Cinematic & GBA Battle Start Transitions**:
  - Classic GBA starfield presenter intro → cinema-bar live Charizard vs. Blastoise elemental clash → crimson-gold flash into an animated FireRed Title Screen with rising embers (skippable & replayable).
  - Authentic GBA encounter transitions: double strobe flash + Venetian shutter wipe (Wild) or spinning Poké Ball iris shutter (Trainer/Gym), followed by an arena Battle Intro where Trainers toss Poké Balls to summon their Pokémon.
- **2D Tactical Arena Positioning & Stat/Level/Evolution Move Ranges**:
  - Every Pokémon occupies live `(x, y)` coordinates with a Speed-scaled **Movement Budget** (click **STEP / MOVE** to click anywhere inside the cyan ring once per turn).
  - Every move computes a dynamic `effectiveRangePx` from Attack / Sp. Atk, Level, and Evolution Stage — creating rich range tradeoffs (e.g., `Scratch` is strong close-range melee at `42–64m`, while `Tackle` has longer natural lunge reach at `86–126m` despite lower power, and `Flamethrower`/`Surf`/`Thunderbolt` expand across the arena as your Pokémon levels up and evolves).
  - Hover any move to preview its live floor reach ring (`IN RANGE`, auto `DASH+HIT`, or `TOO FAR`).
- **Stat-, Level-, and Evolution-Scaled Pixel Physics & Functional Terrain**:
  - Watch **Squirtle Lv. 1 → Wartortle Lv. 40 → Blastoise Lv. 100** grow `SURF` from a small crescent ripple into an arena-flooding knockback tsunami, or **Charmander → Charmeleon → Charizard** turn `FLAMETHROWER` into a roaring wildfire!
  - **Destructible Stone Cover Pillars (`Rock Tomb`)**: Raises jagged granite spires that physically block narrow enemy projectiles until chipped down or shattered by `Earthquake`, `Hydro Pump`, `Fire Blast`, `Solar Beam`, or `Karate Chop`.
  - **Vine Whip Rooting**: Snares foes in visible green vines, halving their tactical movement budget for 2 turns while sprouting flammable overgrowth.
  - **Wind Gust Advection**: Physically blows active fires, extinguishes/clears Steam clouds, and pushes lightweight opponents back.
  - **Electrified Water, Steam, Ice & Knockback**: Conduct Thunderbolt across wet puddles for **+35% damage** & guaranteed hits; collide Fire & Water for Steam veils; freeze puddles into glossy Ice sheets; knock foes backward with heavy waves and blasts.
- **2-Player Local Co-Op Versus Mode (`2P LOCAL CO-OP VS`)**:
  - Full 2-player hot-seat Team Builder: pick 1–6 Pokémon per side from 27 Kanto species, configure Lv. 1–100, customize all 4 move slots, load curated presets, choose any arena biome, toggle optional Privacy Handoff screens, and battle locally with instant Rematch support.
- **Warm, Musical Audio Engine**:
  - Filtered multi-voice Web Audio synthesizer (warm lowpass filtering, subtle delay echo, dynamics compressor) with structured A/B themes, natural quiet rest phrases on overworld tracks so music never drones endlessly, and independent **BGM ON/OFF** and **SFX ON/OFF** toggles everywhere.
- **Playable Kanto FireRed Story Campaign & Battle Lab**:
  - Explore 10 interconnected maps from **Pallet Town** & **Prof. Oak's Lab** through **Route 1**, **Viridian City**, **Viridian Forest**, **Pewter City & Brock's Gym**, **Route 3**, **Cerulean City & Misty's Gym**, and **Nugget Bridge**.
  - Launch the **Battle Lab & 3-Panel Showcase** anytime to compare Lv. 1 / Lv. 40 / Lv. 100 scaling side-by-side or test combos in the Custom Physics Sandbox.

## Controls

- **Move**: `WASD` or Arrow Keys (plus on-screen touch D-pad on mobile)
- **Interact / Confirm**: `Space`, `Enter`, or `Z`
- **Party / Menu**: `X` or `Esc`
- **Tactical Reposition (Battle)**: Click **STEP / MOVE**, then click anywhere inside the cyan ring on the arena floor

## Development

```bash
npm install
npm run dev      # Start dev server on port 3000
npm test         # Run Vitest suite
npm run build    # Type-check and build production bundle
```
