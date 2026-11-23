import { MapDefinition } from '../../types/game';

/**
 * Hand-authored GBA Pokémon FireRed 16x16 pixel-art tileset compiler.
 * Renders rich shaded foliage trees, autotiled bordered roads, gabled shingled roofs,
 * detailed windows/doors, 3-frame animated tall grass, 4-frame shoreline water,
 * wildflowers, boulders, lab counters, and gym floors onto crisp pixel canvases.
 */

const TILE = 16;

function makeTile(draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    draw(ctx);
  }
  return c;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

class FireRedTilesetAtlas {
  private initialized = false;
  private grassVariants: HTMLCanvasElement[] = [];
  private pathBase!: HTMLCanvasElement;
  private treeTile!: HTMLCanvasElement;
  private tallGrassFrames: HTMLCanvasElement[] = [];
  private waterFrames: HTMLCanvasElement[] = [];
  private flowerFrames: HTMLCanvasElement[] = [];
  private roofRed!: HTMLCanvasElement;
  private roofBlue!: HTMLCanvasElement;
  private roofGym!: HTMLCanvasElement;
  private labWall!: HTMLCanvasElement;
  private labBookshelf!: HTMLCanvasElement;
  private labComputer!: HTMLCanvasElement;
  private gymRockWall!: HTMLCanvasElement;
  private gymWaterWall!: HTMLCanvasElement;
  private gymSandFloor!: HTMLCanvasElement;
  private gymPoolDeck!: HTMLCanvasElement;
  private wallWindow!: HTMLCanvasElement;
  private wallPlain!: HTMLCanvasElement;
  private doorTile!: HTMLCanvasElement;
  private woodFloor!: HTMLCanvasElement;
  private stoneFloor!: HTMLCanvasElement;
  private counterTile!: HTMLCanvasElement;
  private signTile!: HTMLCanvasElement;
  private bridgeTile!: HTMLCanvasElement;
  private matTile!: HTMLCanvasElement;
  private boulderTile!: HTMLCanvasElement;
  private pokeballItemTile!: HTMLCanvasElement;

  private ensureInit(): void {
    if (this.initialized || typeof document === 'undefined') return;
    this.initialized = true;

    // 1. FireRed Lush Meadow Grass (3 subtle variants so grass feels natural & organic)
    for (let v = 0; v < 3; v++) {
      this.grassVariants.push(
        makeTile((ctx) => {
          px(ctx, 0, 0, 16, 16, '#70c860');
          // Subtle checkerboard micro-texture
          px(ctx, 1, 2, 2, 1, '#60b650');
          px(ctx, 9, 6, 2, 1, '#60b650');
          px(ctx, 4, 12, 2, 1, '#60b650');
          px(ctx, 12, 13, 2, 1, '#60b650');
          // Sunlit blades
          px(ctx, 3 + v * 2, 3, 1, 2, '#88dd74');
          px(ctx, 10 - v, 10, 1, 2, '#88dd74');
          if (v === 1) {
            // Little FireRed grass tuft V-blade
            px(ctx, 6, 7, 1, 2, '#4ea042');
            px(ctx, 7, 8, 1, 2, '#4ea042');
            px(ctx, 8, 7, 1, 2, '#4ea042');
            px(ctx, 7, 7, 1, 1, '#98ec84');
          } else if (v === 2) {
            px(ctx, 11, 3, 1, 2, '#4ea042');
            px(ctx, 12, 4, 1, 1, '#4ea042');
            px(ctx, 2, 11, 1, 2, '#4ea042');
          }
        })
      );
    }

    // 2. Warm FireRed Sandy / Packed-Earth Road
    this.pathBase = makeTile((ctx) => {
      px(ctx, 0, 0, 16, 16, '#e6d39c');
      // Subtle pebbled texture
      px(ctx, 2, 3, 2, 1, '#d7be80');
      px(ctx, 10, 2, 2, 1, '#f3e5b8');
      px(ctx, 6, 8, 2, 1, '#d7be80');
      px(ctx, 12, 11, 2, 1, '#d7be80');
      px(ctx, 3, 13, 2, 1, '#f3e5b8');
      px(ctx, 9, 14, 1, 1, '#c4a668');
    });

    // 3. Layered GBA FireRed Forest Tree (rounded sunlit canopy, deep shaded leaf clusters, bark trunk)
    this.treeTile = makeTile((ctx) => {
      px(ctx, 0, 0, 16, 16, '#58a84b');
      // Ground shadow under trunk
      px(ctx, 3, 13, 10, 3, '#367434');
      // Textured trunk
      px(ctx, 5, 11, 6, 5, '#59371e');
      px(ctx, 6, 11, 4, 4, '#7d4e2a');
      px(ctx, 7, 11, 1, 4, '#9a6439');
      // Deep outer tree silhouette
      px(ctx, 2, 1, 12, 11, '#1a4229');
      px(ctx, 1, 3, 14, 8, '#1a4229');
      // Mid dark foliage canopy
      px(ctx, 2, 2, 12, 9, '#256137');
      px(ctx, 1, 4, 14, 6, '#256137');
      // Mid vibrant green leaf clusters
      px(ctx, 3, 2, 10, 7, '#3b8c47');
      px(ctx, 2, 4, 12, 5, '#3b8c47');
      // Bright sunlit top leaves (classic GBA dappled dome!)
      px(ctx, 4, 1, 8, 4, '#5eb857');
      px(ctx, 3, 3, 10, 3, '#5eb857');
      px(ctx, 5, 2, 5, 2, '#86d972');
      px(ctx, 4, 4, 3, 1, '#86d972');
      px(ctx, 10, 4, 2, 1, '#86d972');
      // Deep leaf crevices for pixel richness
      px(ctx, 4, 7, 2, 2, '#1e4f2f');
      px(ctx, 9, 6, 3, 2, '#1e4f2f');
      px(ctx, 7, 9, 2, 2, '#1a4229');
    });

    // 4. 3-Frame Animated FireRed Tall Wild Grass!
    for (let f = 0; f < 3; f++) {
      const sway = f === 1 ? 1 : f === 2 ? -1 : 0;
      this.tallGrassFrames.push(
        makeTile((ctx) => {
          px(ctx, 0, 0, 16, 16, '#50a644');
          // 2 layered rows of lush sculpted tall grass blades
          for (let row = 0; row < 2; row++) {
            const by = row === 0 ? 1 : 8;
            for (let col = 0; col < 3; col++) {
              const bx = 1 + col * 5;
              // Dark shadow base
              px(ctx, bx, by + 4, 4, 3, '#1f592a');
              // Mid curved stalks
              px(ctx, bx + sway, by + 1, 1, 4, '#2d7d39');
              px(ctx, bx + 2, by + 2, 1, 4, '#2d7d39');
              px(ctx, bx + 3 + sway, by + 1, 1, 4, '#2d7d39');
              // Bright emerald tips
              px(ctx, bx + sway, by, 1, 2, '#8ce66c');
              px(ctx, bx + 1 + sway, by + 1, 1, 2, '#5ec953');
              px(ctx, bx + 3 + sway, by, 1, 2, '#8ce66c');
              px(ctx, bx + 2, by + 1, 1, 2, '#5ec953');
            }
          }
        })
      );
    }

    // 5. 4-Frame Animated Sparkling FireRed Water
    for (let f = 0; f < 4; f++) {
      this.waterFrames.push(
        makeTile((ctx) => {
          px(ctx, 0, 0, 16, 16, '#3488d8');
          // Deeper ripple troughs
          px(ctx, 0, 4, 16, 2, '#2a75c2');
          px(ctx, 0, 11, 16, 2, '#2a75c2');
          // Drifting crisp white/sky-blue wave crests
          const ox1 = (f * 4) % 16;
          const ox2 = (f * 4 + 8) % 16;
          px(ctx, ox1, 3, 4, 1, '#78c8ff');
          px(ctx, (ox1 + 1) % 16, 2, 2, 1, '#c8ecff');
          px(ctx, ox2, 10, 5, 1, '#78c8ff');
          px(ctx, (ox2 + 1) % 16, 9, 2, 1, '#c8ecff');
        })
      );
    }

    // 6. 2-Frame Blooming GBA Wildflowers
    for (let f = 0; f < 2; f++) {
      this.flowerFrames.push(
        makeTile((ctx) => {
          ctx.drawImage(this.grassVariants[0], 0, 0);
          const drawBloom = (x: number, y: number, petal: string) => {
            px(ctx, x, y + 3, 2, 2, '#2d7d39'); // stem & leaf
            px(ctx, x - 1, y, 4, 3, petal);
            px(ctx, x, y - 1, 2, 4, petal);
            px(ctx, x, y + 1, 2, 1, '#fef08a'); // center
          };
          drawBloom(4, 4 + f, '#f43f5e');
          drawBloom(11, 10 - f, '#facc15');
        })
      );
    }

    // 7. Shingled Building Roofs (Red Pokémon Center/House, Blue Mart/Cerulean, Sandstone Gym/Lab)
    const makeRoof = (dark: string, mid: string, light: string, trim: string) =>
      makeTile((ctx) => {
        px(ctx, 0, 0, 16, 16, mid);
        // Top highlight ridge
        px(ctx, 0, 0, 16, 2, light);
        px(ctx, 0, 2, 16, 1, dark);
        // Alternating pixel roof shingles!
        for (let r = 3; r < 13; r += 3) {
          px(ctx, 0, r, 16, 2, mid);
          px(ctx, 0, r + 2, 16, 1, dark);
          const offset = (r % 6) === 0 ? 0 : 2;
          for (let x = offset; x < 16; x += 4) {
            px(ctx, x, r, 1, 2, dark);
            px(ctx, x + 1, r, 1, 1, light);
          }
        }
        // Eaves trim & underside shadow
        px(ctx, 0, 13, 16, 2, trim);
        px(ctx, 0, 15, 16, 1, '#1e2430');
      });

    this.roofRed = makeRoof('#8c201e', '#c93832', '#ef6358', '#f5ebd1');
    this.roofBlue = makeRoof('#1e3a8a', '#2b6cb0', '#60a5fa', '#e2e8f0');
    this.roofGym = makeRoof('#59422e', '#8c6a4a', '#b8926a', '#ded2b8');

    // 8. Detailed FireRed Clapboard Wall + Framed Glass Window + Shutters
    this.wallWindow = makeTile((ctx) => {
      px(ctx, 0, 0, 16, 16, '#efe9d5');
      // Subtle top eaves drop shadow
      px(ctx, 0, 0, 16, 2, '#c8bfa6');
      // Horizontal clapboard siding lines
      px(ctx, 0, 5, 16, 1, '#ded6be');
      px(ctx, 0, 10, 16, 1, '#ded6be');
      // Stone foundation strip at bottom
      px(ctx, 0, 13, 16, 3, '#94a3b8');
      px(ctx, 0, 13, 16, 1, '#64748b');
      px(ctx, 4, 14, 1, 2, '#64748b');
      px(ctx, 11, 14, 1, 2, '#64748b');
      // Wooden window frame & sky glass reflection
      px(ctx, 3, 3, 10, 8, '#3d2a1c');
      px(ctx, 4, 4, 8, 6, '#58b4eb');
      px(ctx, 4, 4, 8, 2, '#3b8ec8');
      px(ctx, 5, 5, 2, 2, '#d8f3ff'); // specular glint
      px(ctx, 7, 4, 1, 6, '#f8fafc'); // center mullion
      px(ctx, 4, 7, 8, 1, '#f8fafc');
      // Sill
      px(ctx, 2, 11, 12, 1, '#7c5534');
    });

    this.wallPlain = makeTile((ctx) => {
      px(ctx, 0, 0, 16, 16, '#efe9d5');
      px(ctx, 0, 0, 16, 2, '#c8bfa6');
      px(ctx, 0, 5, 16, 1, '#ded6be');
      px(ctx, 0, 10, 16, 1, '#ded6be');
      px(ctx, 0, 13, 16, 3, '#94a3b8');
      px(ctx, 0, 13, 16, 1, '#64748b');
    });

    // 9. Detailed Paneled Doorway with Threshold
    this.doorTile = makeTile((ctx) => {
      ctx.drawImage(this.wallPlain, 0, 0);
      px(ctx, 2, 1, 12, 15, '#2d1c10');
      px(ctx, 3, 2, 10, 13, '#7d4a26');
      px(ctx, 4, 3, 8, 4, '#5e3418');
      px(ctx, 4, 9, 8, 5, '#5e3418');
      px(ctx, 5, 4, 6, 2, '#7d4a26');
      px(ctx, 10, 8, 2, 2, '#facc15'); // brass doorknob
      px(ctx, 2, 15, 12, 1, '#cbd5e1'); // doorstep
    });

    // 10. Interior Lab / Center Floor
    this.woodFloor = makeTile((ctx) => {
      px(ctx, 0, 0, 16, 16, '#e5d4b3');
      px(ctx, 0, 7, 16, 1, '#cdb892');
      px(ctx, 0, 15, 16, 1, '#cdb892');
      px(ctx, 7, 0, 1, 7, '#cdb892');
      px(ctx, 15, 8, 1, 7, '#cdb892');
      px(ctx, 2, 2, 3, 1, '#f1e4c8');
      px(ctx, 10, 10, 3, 1, '#f1e4c8');
    });

    // 11. Polished Gym Stone Floor
    this.stoneFloor = makeTile((ctx) => {
      px(ctx, 0, 0, 16, 16, '#a8bec7');
      px(ctx, 0, 0, 15, 1, '#c5d7df');
      px(ctx, 0, 0, 1, 15, '#c5d7df');
      px(ctx, 0, 15, 16, 1, '#7e97a3');
      px(ctx, 15, 0, 1, 16, '#7e97a3');
      px(ctx, 4, 4, 8, 8, '#9eb5bf');
    });

    // 12. Oak Lab Table / Counter Desk
    this.counterTile = makeTile((ctx) => {
      ctx.drawImage(this.woodFloor, 0, 0);
      px(ctx, 0, 1, 16, 13, '#3b2212');
      px(ctx, 0, 2, 16, 8, '#c27b43');
      px(ctx, 0, 2, 16, 2, '#dfa067');
      px(ctx, 0, 10, 16, 3, '#7c4823');
      px(ctx, 1, 14, 14, 2, 'rgba(0,0,0,0.2)');
    });

    // 13. Carved Wooden Signpost
    this.signTile = makeTile((ctx) => {
      ctx.drawImage(this.grassVariants[0], 0, 0);
      px(ctx, 4, 13, 8, 2, '#3d7c36'); // ground shadow
      px(ctx, 6, 9, 4, 6, '#593319');
      px(ctx, 7, 9, 2, 5, '#854e27');
      px(ctx, 1, 2, 14, 8, '#3b2110');
      px(ctx, 2, 3, 12, 6, '#c98e4c');
      px(ctx, 2, 3, 12, 1, '#e5b372');
      px(ctx, 4, 5, 8, 1, '#4a2b14');
      px(ctx, 4, 7, 6, 1, '#4a2b14');
    });

    // 14. Wooden Nugget Bridge
    this.bridgeTile = makeTile((ctx) => {
      px(ctx, 0, 0, 16, 16, '#b87f44');
      for (let y = 0; y < 16; y += 4) {
        px(ctx, 0, y, 16, 1, '#d9a363');
        px(ctx, 0, y + 3, 16, 1, '#784c22');
      }
      // Side rails
      px(ctx, 0, 0, 2, 16, '#facc15');
      px(ctx, 14, 0, 2, 16, '#facc15');
      px(ctx, 1, 0, 1, 16, '#92400e');
      px(ctx, 14, 0, 1, 16, '#92400e');
    });

    // 15. Red Welcome Exit Mat
    this.matTile = makeTile((ctx) => {
      ctx.drawImage(this.woodFloor, 0, 0);
      px(ctx, 1, 3, 14, 10, '#7f1d1d');
      px(ctx, 2, 4, 12, 8, '#dc2626');
      px(ctx, 3, 5, 10, 1, '#fca5a5');
      px(ctx, 3, 10, 10, 1, '#991b1b');
    });

    // 16. Sculpted Mossy Boulder / Pewter Rock
    this.boulderTile = makeTile((ctx) => {
      px(ctx, 0, 0, 16, 16, '#b8a280');
      px(ctx, 2, 13, 12, 3, '#7d6b52');
      px(ctx, 2, 3, 12, 11, '#3b332b');
      px(ctx, 1, 5, 14, 8, '#3b332b');
      px(ctx, 3, 4, 10, 9, '#8c7a64');
      px(ctx, 2, 6, 12, 6, '#8c7a64');
      px(ctx, 4, 4, 6, 4, '#c4b49a');
      px(ctx, 5, 5, 3, 2, '#e2d7c5');
      px(ctx, 9, 9, 4, 3, '#635544');
    });

    // 17. Crisp Overworld Poké Ball Pickup
    this.pokeballItemTile = makeTile((ctx) => {
      px(ctx, 4, 11, 8, 3, 'rgba(0,0,0,0.32)');
      px(ctx, 4, 3, 8, 9, '#111827');
      px(ctx, 3, 4, 10, 7, '#111827');
      px(ctx, 4, 4, 8, 3, '#ef4444');
      px(ctx, 5, 4, 3, 1, '#fca5a5');
      px(ctx, 4, 8, 8, 3, '#f8fafc');
      px(ctx, 4, 10, 8, 1, '#cbd5e1');
      px(ctx, 4, 7, 8, 1, '#111827');
      px(ctx, 7, 6, 2, 3, '#111827');
      px(ctx, 7, 7, 2, 1, '#ffffff');
    });

    // 18. Oak's Lab Interior Wall Paneling (clean GBA cream-slate wainscoting)
    this.labWall = makeTile((ctx) => {
      px(ctx, 0, 0, 16, 16, '#dbe4ec');
      // Top dark slate crown molding
      px(ctx, 0, 0, 16, 2, '#2d3b4e');
      px(ctx, 0, 2, 16, 1, '#586d85');
      // Vertical laboratory panel seams + subtle highlight
      px(ctx, 0, 3, 1, 9, '#c0cedb');
      px(ctx, 8, 3, 1, 9, '#c0cedb');
      px(ctx, 1, 3, 1, 9, '#eff5fa');
      px(ctx, 9, 3, 1, 9, '#eff5fa');
      // Lower wainscot trim & shadow along floor
      px(ctx, 0, 11, 16, 1, '#8ca0b5');
      px(ctx, 0, 12, 16, 3, '#64798f');
      px(ctx, 0, 15, 16, 1, '#314154');
    });

    // 19. Oak's Lab Research Bookshelf (colorful Kanto field journals)
    this.labBookshelf = makeTile((ctx) => {
      // Wood frame
      px(ctx, 0, 0, 16, 16, '#5c381f');
      px(ctx, 0, 0, 16, 2, '#3a2110');
      px(ctx, 1, 1, 14, 1, '#8c5a34');
      // Upper shelf recess + colorful book spines
      px(ctx, 1, 2, 14, 5, '#2b180c');
      px(ctx, 2, 3, 2, 4, '#dc2626'); // red FireRed volume
      px(ctx, 4, 3, 2, 4, '#2563eb'); // blue journal
      px(ctx, 6, 4, 2, 3, '#eab308'); // yellow Pokédex guide
      px(ctx, 8, 3, 2, 4, '#16a34a'); // green LeafGreen volume
      px(ctx, 10, 3, 2, 4, '#f8fafc'); // white lab binder
      px(ctx, 12, 3, 2, 4, '#7c3aed');
      // Shelf divider
      px(ctx, 1, 7, 14, 2, '#9c663b');
      px(ctx, 1, 7, 14, 1, '#be8554');
      // Lower shelf recess + binders
      px(ctx, 1, 9, 14, 5, '#2b180c');
      px(ctx, 2, 10, 2, 4, '#0ea5e9');
      px(ctx, 4, 10, 2, 4, '#f97316');
      px(ctx, 6, 10, 2, 4, '#e11d48');
      px(ctx, 9, 11, 2, 3, '#10b981');
      px(ctx, 11, 10, 3, 4, '#e2e8f0');
      // Base kickboard
      px(ctx, 0, 14, 16, 2, '#3a2110');
    });

    // 20. Oak's Lab Research PC Monitor (glowing cyan Pokédex waveform)
    this.labComputer = makeTile((ctx) => {
      ctx.drawImage(this.labWall, 0, 0);
      // Monitor housing
      px(ctx, 2, 2, 12, 9, '#334155');
      px(ctx, 3, 3, 10, 7, '#0f172a');
      // Glowing cyan screen & live graph bar
      px(ctx, 4, 4, 8, 5, '#0ea5e9');
      px(ctx, 4, 4, 8, 2, '#0284c7');
      px(ctx, 5, 7, 2, 1, '#e0f2fe');
      px(ctx, 7, 6, 2, 2, '#bae6fd');
      px(ctx, 9, 5, 2, 3, '#fef08a');
      // Status LEDs + desk keyboard
      px(ctx, 3, 10, 2, 1, '#22c55e');
      px(ctx, 6, 10, 1, 1, '#ef4444');
      px(ctx, 1, 11, 14, 4, '#94a3b8');
      px(ctx, 2, 12, 12, 2, '#cbd5e1');
      px(ctx, 3, 12, 10, 1, '#475569');
      px(ctx, 1, 15, 14, 1, '#334155');
    });

    // 21. Pewter Gym Carved Sandstone Masonry Wall
    this.gymRockWall = makeTile((ctx) => {
      px(ctx, 0, 0, 16, 16, '#876d53');
      // Stone courses & recessed mortar
      px(ctx, 0, 0, 16, 2, '#4a3827');
      px(ctx, 0, 2, 16, 1, '#bfa384');
      px(ctx, 0, 7, 16, 1, '#4a3827');
      px(ctx, 0, 8, 16, 1, '#b5997b');
      px(ctx, 0, 13, 16, 1, '#4a3827');
      px(ctx, 0, 14, 16, 2, '#5c4734');
      // Staggered vertical stone joints
      px(ctx, 7, 2, 1, 5, '#4a3827');
      px(ctx, 8, 2, 1, 5, '#b5997b');
      px(ctx, 3, 8, 1, 5, '#4a3827');
      px(ctx, 4, 8, 1, 5, '#b5997b');
      px(ctx, 12, 8, 1, 5, '#4a3827');
      px(ctx, 13, 8, 1, 5, '#b5997b');
      // Chiseled pebble highlights
      px(ctx, 2, 4, 3, 1, '#a68b6d');
      px(ctx, 10, 5, 3, 1, '#705841');
      px(ctx, 6, 10, 4, 1, '#a68b6d');
    });

    // 22. Cerulean Gym Glazed Aquatic Ceramic Wall
    this.gymWaterWall = makeTile((ctx) => {
      px(ctx, 0, 0, 16, 16, '#2473b8');
      // Deep marine coping strip at top
      px(ctx, 0, 0, 16, 2, '#103b66');
      px(ctx, 0, 2, 16, 1, '#7cc6fa');
      // Glazed 8x6 ceramic tile grid
      px(ctx, 0, 8, 16, 1, '#174f82');
      px(ctx, 0, 9, 16, 1, '#63b4f0');
      px(ctx, 7, 2, 1, 12, '#174f82');
      px(ctx, 15, 2, 1, 12, '#174f82');
      // Specular glass reflections
      px(ctx, 1, 4, 3, 1, '#9cd8ff');
      px(ctx, 9, 4, 3, 1, '#9cd8ff');
      px(ctx, 1, 11, 3, 1, '#9cd8ff');
      px(ctx, 9, 11, 3, 1, '#9cd8ff');
      // Ceramic base plinth
      px(ctx, 0, 14, 16, 2, '#13406b');
    });

    // 23. Pewter Gym Packed-Sand Arena Floor
    this.gymSandFloor = makeTile((ctx) => {
      px(ctx, 0, 0, 16, 16, '#cbb389');
      px(ctx, 2, 3, 2, 1, '#dec9a4');
      px(ctx, 10, 4, 2, 1, '#b39a6f');
      px(ctx, 5, 9, 2, 1, '#b39a6f');
      px(ctx, 12, 12, 2, 1, '#dec9a4');
      px(ctx, 1, 13, 2, 1, '#a68c63');
    });

    // 24. Cerulean Gym Pale Aqua Pool Deck Floor
    this.gymPoolDeck = makeTile((ctx) => {
      px(ctx, 0, 0, 16, 16, '#cde8f6');
      px(ctx, 0, 0, 16, 1, '#e6f5fd');
      px(ctx, 0, 0, 1, 16, '#e6f5fd');
      px(ctx, 0, 15, 16, 1, '#9cc4dc');
      px(ctx, 15, 0, 1, 16, '#9cc4dc');
      px(ctx, 0, 7, 16, 1, '#b4d7eb');
      px(ctx, 7, 0, 1, 16, '#b4d7eb');
    });
  }

  public getPokeballTile(): HTMLCanvasElement {
    this.ensureInit();
    return this.pokeballItemTile;
  }

  /**
   * Draws an autotiled FireRed 16x16 map tile at (px, py) with context-aware edges!
   */
  public drawMapTile(
    ctx: CanvasRenderingContext2D,
    map: MapDefinition,
    tx: number,
    ty: number,
    pxPos: number,
    pyPos: number,
    timeSec: number
  ): void {
    this.ensureInit();
    const ch = map.tiles[ty]?.[tx] ?? '#';
    const tileAt = (x: number, y: number) => map.tiles[y]?.[x] ?? '#';

    switch (ch) {
      case '.': {
        if (map.id === 'pewter_gym') {
          ctx.drawImage(this.gymSandFloor, pxPos, pyPos);
        } else if (map.id === 'cerulean_gym') {
          ctx.drawImage(this.gymPoolDeck, pxPos, pyPos);
        } else {
          const variant = (tx * 7 + ty * 13) % 3;
          ctx.drawImage(this.grassVariants[variant], pxPos, pyPos);
        }
        break;
      }
      case 'P': {
        ctx.drawImage(this.pathBase, pxPos, pyPos);
        // Autotile smooth grass/bevel borders where road meets grass!
        const isGrassLike = (c: string) => c === '.' || c === 'G' || c === 'f' || c === '#' || c === 'E';
        if (isGrassLike(tileAt(tx, ty - 1))) {
          px(ctx, pxPos, pyPos, 16, 2, '#b99c62');
          px(ctx, pxPos, pyPos, 16, 1, '#5ca84c');
        }
        if (isGrassLike(tileAt(tx, ty + 1))) {
          px(ctx, pxPos, pyPos + 14, 16, 2, '#b99c62');
          px(ctx, pxPos, pyPos + 15, 16, 1, '#5ca84c');
        }
        if (isGrassLike(tileAt(tx - 1, ty))) {
          px(ctx, pxPos, pyPos, 2, 16, '#b99c62');
          px(ctx, pxPos, pyPos, 1, 16, '#5ca84c');
        }
        if (isGrassLike(tileAt(tx + 1, ty))) {
          px(ctx, pxPos + 14, pyPos, 2, 16, '#b99c62');
          px(ctx, pxPos + 15, pyPos, 1, 16, '#5ca84c');
        }
        break;
      }
      case 'G': {
        const f = ((Math.floor(Math.max(0, timeSec) * 2.4 + (tx + ty) * 0.35) % 3) + 3) % 3;
        ctx.drawImage(this.tallGrassFrames[f], pxPos, pyPos);
        break;
      }
      case '#':
        ctx.drawImage(this.treeTile, pxPos, pyPos);
        break;
      case 'W': {
        const wf = ((Math.floor(Math.max(0, timeSec) * 3.0) % 4) + 4) % 4;
        ctx.drawImage(this.waterFrames[wf], pxPos, pyPos);
        // Sandy shoreline border along non-water edges (ceramic coping inside Cerulean Gym)
        const edgeColor = map.id === 'cerulean_gym' ? '#bfe4f8' : '#d8c28d';
        if (tileAt(tx, ty - 1) !== 'W') {
          px(ctx, pxPos, pyPos, 16, 2, edgeColor);
          px(ctx, pxPos, pyPos + 2, 16, 1, '#1e5ba0');
        }
        if (tileAt(tx, ty + 1) !== 'W') {
          px(ctx, pxPos, pyPos + 14, 16, 2, edgeColor);
        }
        if (tileAt(tx - 1, ty) !== 'W') {
          px(ctx, pxPos, pyPos, 2, 16, edgeColor);
        }
        if (tileAt(tx + 1, ty) !== 'W') {
          px(ctx, pxPos + 14, pyPos, 2, 16, edgeColor);
        }
        break;
      }
      case 'R':
        ctx.drawImage(this.roofRed, pxPos, pyPos);
        break;
      case 'B':
        ctx.drawImage(map.id === 'cerulean_gym' ? this.gymWaterWall : this.roofBlue, pxPos, pyPos);
        break;
      case 'Y': {
        if (map.id === 'oaks_lab') {
          if (ty === 0 && (tx === 1 || tx === 2 || tx === 8 || tx === 9 || tx === 10)) {
            ctx.drawImage(this.labBookshelf, pxPos, pyPos);
          } else if ((ty === 0 && (tx === 3 || tx === 4)) || (ty === 2 && tx === 10)) {
            ctx.drawImage(this.labComputer, pxPos, pyPos);
          } else {
            ctx.drawImage(this.labWall, pxPos, pyPos);
          }
        } else if (map.id === 'pewter_gym') {
          ctx.drawImage(this.gymRockWall, pxPos, pyPos);
        } else {
          ctx.drawImage(this.roofGym, pxPos, pyPos);
        }
        break;
      }
      case 'H': {
        // Alternate windowed walls and plain siding for authentic GBA buildings
        const useWin = (tx + ty) % 2 === 0;
        ctx.drawImage(useWin ? this.wallWindow : this.wallPlain, pxPos, pyPos);
        break;
      }
      case 'D':
        ctx.drawImage(this.doorTile, pxPos, pyPos);
        break;
      case 'F':
        ctx.drawImage(this.woodFloor, pxPos, pyPos);
        break;
      case 'S':
        ctx.drawImage(this.stoneFloor, pxPos, pyPos);
        break;
      case 'C':
        ctx.drawImage(this.counterTile, pxPos, pyPos);
        break;
      case 'f': {
        const ff = ((Math.floor(Math.max(0, timeSec) * 2.2) % 2) + 2) % 2;
        ctx.drawImage(this.flowerFrames[ff], pxPos, pyPos);
        break;
      }
      case 'E':
        ctx.drawImage(this.signTile, pxPos, pyPos);
        break;
      case '=':
        ctx.drawImage(this.bridgeTile, pxPos, pyPos);
        break;
      case 'M':
        ctx.drawImage(this.matTile, pxPos, pyPos);
        break;
      case 'K':
        ctx.drawImage(this.boulderTile, pxPos, pyPos);
        break;
      default:
        ctx.drawImage(this.grassVariants[0], pxPos, pyPos);
        break;
    }
  }
}

export const tilesetAtlas = new FireRedTilesetAtlas();
