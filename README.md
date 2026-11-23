# Pokémon FireRed — Elemental Physics Battle Simulator

A playable turn-based **Pokémon FireRed RPG** & **real-time 2D pixel-physics battle simulator** built with Vite, TypeScript, Vanilla CSS, HTML5 Canvas, and Web Audio API.

## Features

- **Stat-, Level-, and Evolution-Scaled Pixel Physics**:
  - Every move's physical scale, wave/flame width, fluid momentum, foam/ember particle count, blast radius, screen shake, and audio bass weight dynamically grow with `Sp. Atk` / `Attack`, Level (`1–100`), and Evolution Stage.
  - Watch **Squirtle Lv. 1 → Wartortle Lv. 40 → Blastoise Lv. 100** turn `SURF` from a small crescent ripple into an arena-flooding tidal wave, or **Charmander → Charmeleon → Charizard** grow `FLAMETHROWER` into a roaring inferno!
- **Persistent, Tactical Environmental Destruction**:
  - **Burning Ground**: Fire moves scorch tiles and ignite tall grass / forest floor / sprouted vines, dealing end-of-turn burn-hazard chip damage to grounded non-Fire Pokémon.
  - **Flooded Puddles**: Water moves leave shimmering puddles that amplify Water attacks and weaken Fire.
  - **Electrified Water (Chain Reaction)**: Electric attacks conducted into water puddles fork branching lightning arcs across connected wet tiles for **+35% damage**, guaranteed hits, and bonus paralysis chance.
  - **Steam Clouds**: Colliding Fire and Water triggers boiling Steam clouds that extinguish flames and temporarily veil accuracy (cleared by Flying/Wind moves!).
  - **Frozen Ice Sheets**: Ice moves flash-freeze puddles into glossy ice sheets that lower grounded foes' Speed.
  - **Craters & Overgrown Flora**: Rock/Ground moves carve persistent fissures boosting seismic attacks; Grass moves sprout living vines that heal Grass-types and act as fresh fuel for Fire attacks.
- **Playable Kanto FireRed Story Campaign**:
  - Explore 10 interconnected pixel-art maps: **Pallet Town**, **Prof. Oak's Lab** (choose Bulbasaur, Charmander, or Squirtle), **Route 1**, **Viridian City** (Pokémon Center & Poké Mart), **Viridian Forest**, **Pewter City & Brock's Gym** (Boulder Badge), **Route 3**, **Cerulean City & Misty's Gym** (Cascade Badge), and the **Nugget Bridge Rival Blue Finale**.
  - Catch wild Pokémon with animated Poké Ball physics, level up, learn moves, evolve, track your Pokédex, and save progress to `localStorage`.
- **Battle Lab & 3-Panel Split-Screen Scaling Showcase**:
  - Launch directly from the Title Screen or Pause Menu to run **3 synchronized arenas side-by-side** (Lv. 1 vs. Lv. 40 vs. Lv. 100) for `SURF`, `FLAMETHROWER`, `THUNDERBOLT`, `RAZOR LEAF`, `EARTHQUAKE`, and `ICE BEAM`, or experiment freely in the Custom Physics Sandbox!

## Controls

- **Move**: `WASD` or Arrow Keys (plus on-screen touch D-pad on mobile)
- **Interact / Confirm**: `Space`, `Enter`, or `Z`
- **Party / Menu**: `X` or `Esc`

## Development

```bash
npm install
npm run dev      # Start dev server on http://localhost:3000
npm test         # Run Vitest suite
npm run build    # Type-check and build production bundle
```
