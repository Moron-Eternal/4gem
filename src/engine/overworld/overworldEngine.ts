import { isTileWalkable, KANTO_MAPS } from '../../data/maps/kantoMaps';
import { Direction, MapDefinition, NpcEntity, SaveState, WarpPoint, WildEncounterEntry } from '../../types/game';

export const OVERWORLD_VIEW_W = 240;
export const OVERWORLD_VIEW_H = 160;
export const TILE_SIZE = 16;

export interface OverworldCallbacks {
  onWarpBlocked: (message: string) => void;
  onMapChanged: (map: MapDefinition) => void;
  onInteractNpc: (npc: NpcEntity) => void;
  onReadSign: (lines: string[]) => void;
  onWildEncounter: (speciesId: string, level: number, map: MapDefinition) => void;
  onTrainerSpotted: (npc: NpcEntity) => void;
}

/**
 * Crisp 16x16 GBA FireRed-style tilemap overworld engine with smooth grid movement,
 * animated grass/water/flowers, trainer line-of-sight alerts, and wild encounters.
 */
export class OverworldEngine {
  private save: SaveState;
  private callbacks: OverworldCallbacks;

  public moving = false;
  private moveFromX = 0;
  private moveFromY = 0;
  private moveToX = 0;
  private moveToY = 0;
  private moveProgress = 0;
  private walkFrame = 0;
  private time = 0;

  private heldDirs: Direction[] = [];
  public paused = false;
  private stepCooldown = 0;
  public alertNpcId: string | null = null;
  private alertTimer = 0;

  constructor(save: SaveState, callbacks: OverworldCallbacks) {
    this.save = save;
    this.callbacks = callbacks;
  }

  public getCurrentMap(): MapDefinition {
    return KANTO_MAPS[this.save.mapId] ?? KANTO_MAPS.pallet_town;
  }

  public setDirectionHeld(dir: Direction, held: boolean): void {
    const idx = this.heldDirs.indexOf(dir);
    if (held && idx === -1) {
      this.heldDirs.unshift(dir);
    } else if (!held && idx !== -1) {
      this.heldDirs.splice(idx, 1);
    }
  }

  public clearInputs(): void {
    this.heldDirs = [];
  }

  public getVisibleNpcs(map: MapDefinition): NpcEntity[] {
    return map.npcs.filter((npc) => {
      if (npc.requiredFlag && !this.save.flags[npc.requiredFlag]) return false;
      if (npc.hideIfFlag && this.save.flags[npc.hideIfFlag]) return false;
      if (npc.role === 'item_pickup' && this.save.collectedItems.includes(npc.id)) return false;
      return true;
    });
  }

  public interactFacing(): void {
    if (this.paused || this.moving) return;
    const map = this.getCurrentMap();
    const { dx, dy } = this.dirDelta(this.save.playerDir);
    const tx = this.save.playerX + dx;
    const ty = this.save.playerY + dy;

    const npcs = this.getVisibleNpcs(map);
    const npc = npcs.find((n) => n.x === tx && n.y === ty);
    if (npc) {
      this.callbacks.onInteractNpc(npc);
      return;
    }

    // Check across counter ('C') for Nurse Joy / Oak / Mart Clerk
    if (map.tiles[ty]?.[tx] === 'C') {
      const acrossNpc = npcs.find((n) => n.x === tx + dx && n.y === ty + dy);
      if (acrossNpc) {
        this.callbacks.onInteractNpc(acrossNpc);
        return;
      }
    }

    const sign = map.signs.find((s) => s.x === tx && s.y === ty);
    if (sign) {
      this.callbacks.onReadSign(sign.text);
    }
  }

  private dirDelta(dir: Direction): { dx: number; dy: number } {
    switch (dir) {
      case 'up': return { dx: 0, dy: -1 };
      case 'down': return { dx: 0, dy: 1 };
      case 'left': return { dx: -1, dy: 0 };
      case 'right': return { dx: 1, dy: 0 };
    }
  }

  public step(dt: number): void {
    const clampedDt = Math.min(0.05, dt);
    this.time += clampedDt;
    this.save.playTimeSec += clampedDt;

    if (this.alertTimer > 0) {
      this.alertTimer -= clampedDt;
      if (this.alertTimer <= 0) {
        const map = this.getCurrentMap();
        const npc = this.getVisibleNpcs(map).find((n) => n.id === this.alertNpcId);
        this.alertNpcId = null;
        if (npc) this.callbacks.onTrainerSpotted(npc);
      }
      return;
    }

    if (this.paused) return;

    if (this.stepCooldown > 0) {
      this.stepCooldown -= clampedDt;
    }

    if (this.moving) {
      const moveSpeed = 5.4; // tiles per second (snappy GBA walking speed!)
      this.moveProgress += clampedDt * moveSpeed;
      if (this.moveProgress >= 1) {
        this.moving = false;
        this.moveProgress = 0;
        this.save.playerX = this.moveToX;
        this.save.playerY = this.moveToY;
        this.walkFrame = (this.walkFrame + 1) % 4;
        this.onArrivedAtTile();
      }
      return;
    }

    if (this.heldDirs.length > 0 && this.stepCooldown <= 0) {
      const dir = this.heldDirs[0];
      this.tryStartMove(dir);
    }
  }

  private tryStartMove(dir: Direction): void {
    this.save.playerDir = dir;
    const map = this.getCurrentMap();
    const { dx, dy } = this.dirDelta(dir);
    const nx = this.save.playerX + dx;
    const ny = this.save.playerY + dy;

    // Check warp gate FIRST (for blocked message or edge transitions)
    const warp = map.warps.find((w) => w.x === nx && w.y === ny);
    if (warp && warp.requiredFlag && !this.save.flags[warp.requiredFlag]) {
      this.stepCooldown = 0.25;
      this.callbacks.onWarpBlocked(warp.blockedMessage ?? 'You cannot go this way yet.');
      return;
    }

    if (!isTileWalkable(map, nx, ny)) return;

    // Check NPC collision
    const blockingNpc = this.getVisibleNpcs(map).find((n) => n.x === nx && n.y === ny);
    if (blockingNpc) return;

    this.moving = true;
    this.moveFromX = this.save.playerX;
    this.moveFromY = this.save.playerY;
    this.moveToX = nx;
    this.moveToY = ny;
    this.moveProgress = 0;
  }

  private onArrivedAtTile(): void {
    const map = this.getCurrentMap();
    const px = this.save.playerX;
    const py = this.save.playerY;

    // 1. Check Warp tile
    const warp: WarpPoint | undefined = map.warps.find((w) => w.x === px && w.y === py);
    if (warp) {
      if (warp.requiredFlag && !this.save.flags[warp.requiredFlag]) {
        this.callbacks.onWarpBlocked(warp.blockedMessage ?? 'You cannot enter yet.');
        return;
      }
      this.save.mapId = warp.targetMapId;
      this.save.playerX = warp.targetX;
      this.save.playerY = warp.targetY;
      if (warp.targetDir) this.save.playerDir = warp.targetDir;
      this.stepCooldown = 0.16;
      const nextMap = this.getCurrentMap();
      this.callbacks.onMapChanged(nextMap);
      return;
    }

    // 2. Check undefeated Trainer Line-of-Sight!
    if (this.save.party.some((m) => m.hp > 0)) {
      const spotted = this.findSpottingTrainer(map, px, py);
      if (spotted) {
        this.alertNpcId = spotted.id;
        this.alertTimer = 0.52;
        this.clearInputs();
        return;
      }
    }

    // 3. Check Tall Grass wild encounter!
    const tile = map.tiles[py]?.[px];
    if (tile === 'G' && map.encounters.length > 0 && this.save.party.some((m) => m.hp > 0)) {
      if (Math.random() < 0.16) {
        const picked = this.rollWildEncounter(map.encounters);
        if (picked) {
          this.clearInputs();
          this.callbacks.onWildEncounter(picked.speciesId, picked.level, map);
        }
      }
    }
  }

  private findSpottingTrainer(map: MapDefinition, px: number, py: number): NpcEntity | null {
    const npcs = this.getVisibleNpcs(map);
    for (const npc of npcs) {
      if (npc.role !== 'trainer' || !npc.trainerId) continue;
      if (this.save.defeatedTrainers.includes(npc.trainerId)) continue;
      const range = npc.sightRange ?? 3;
      const { dx, dy } = this.dirDelta(npc.dir);

      for (let dist = 1; dist <= range; dist++) {
        const cx = npc.x + dx * dist;
        const cy = npc.y + dy * dist;
        if (!isTileWalkable(map, cx, cy)) break;
        if (cx === px && cy === py) {
          return npc;
        }
      }
    }
    return null;
  }

  private rollWildEncounter(table: WildEncounterEntry[]): { speciesId: string; level: number } | null {
    const total = table.reduce((acc, e) => acc + e.weight, 0);
    if (total <= 0) return null;
    let roll = Math.random() * total;
    for (const entry of table) {
      roll -= entry.weight;
      if (roll <= 0) {
        const level =
          entry.minLevel + Math.floor(Math.random() * (entry.maxLevel - entry.minLevel + 1));
        return { speciesId: entry.speciesId, level };
      }
    }
    const last = table[table.length - 1];
    return { speciesId: last.speciesId, level: last.minLevel };
  }

  /**
   * Renders the crisp 240x160 GBA FireRed tilemap & animated characters onto targetCanvas.
   */
  public render(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const map = this.getCurrentMap();
    const interpX = this.moving
      ? this.moveFromX + (this.moveToX - this.moveFromX) * this.moveProgress
      : this.save.playerX;
    const interpY = this.moving
      ? this.moveFromY + (this.moveToY - this.moveFromY) * this.moveProgress
      : this.save.playerY;

    const mapPxW = map.width * TILE_SIZE;
    const mapPxH = map.height * TILE_SIZE;

    let camX = interpX * TILE_SIZE + TILE_SIZE / 2 - OVERWORLD_VIEW_W / 2;
    let camY = interpY * TILE_SIZE + TILE_SIZE / 2 - OVERWORLD_VIEW_H / 2;
    if (mapPxW <= OVERWORLD_VIEW_W) {
      camX = -(OVERWORLD_VIEW_W - mapPxW) / 2;
    } else {
      camX = Math.max(0, Math.min(mapPxW - OVERWORLD_VIEW_W, camX));
    }
    if (mapPxH <= OVERWORLD_VIEW_H) {
      camY = -(OVERWORLD_VIEW_H - mapPxH) / 2;
    } else {
      camY = Math.max(0, Math.min(mapPxH - OVERWORLD_VIEW_H, camY));
    }

    const scaleX = canvas.width / OVERWORLD_VIEW_W;
    const scaleY = canvas.height / OVERWORLD_VIEW_H;

    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-Math.round(camX), -Math.round(camY));

    const waterPhase = Math.floor(this.time * 3) % 4;
    const flowerPhase = Math.floor(this.time * 2.5) % 2;

    // 1. Render Tiles
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const ch = map.tiles[y]?.[x] ?? '#';
        this.drawTile(ctx, ch, x * TILE_SIZE, y * TILE_SIZE, x, y, waterPhase, flowerPhase);
      }
    }

    // 2. Render Visible NPCs
    const npcs = this.getVisibleNpcs(map);
    for (const npc of npcs) {
      const defeated = npc.trainerId ? this.save.defeatedTrainers.includes(npc.trainerId) : false;
      this.drawNpc(ctx, npc, defeated);
    }

    // 3. Render Player Character (Red in iconic FireRed cap & jacket!)
    this.drawTrainerCharacter(
      ctx,
      Math.round(interpX * TILE_SIZE),
      Math.round(interpY * TILE_SIZE),
      this.save.playerDir,
      '#dc2626',
      '#ef4444',
      '#1e40af',
      this.moving ? (this.moveProgress < 0.5 ? 1 : 2) : 0
    );

    // 4. Draw Trainer '!' Exclamation Bubble when spotted
    if (this.alertNpcId) {
      const alertNpc = npcs.find((n) => n.id === this.alertNpcId);
      if (alertNpc) {
        const ax = alertNpc.x * TILE_SIZE + 2;
        const ay = alertNpc.y * TILE_SIZE - 14;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(ax - 1, ay - 1, 12, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ax, ay, 10, 10);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(ax + 4, ay + 1, 2, 5);
        ctx.fillRect(ax + 4, ay + 7, 2, 2);
      }
    }

    ctx.restore();
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    ch: string,
    px: number,
    py: number,
    tx: number,
    ty: number,
    waterPhase: number,
    flowerPhase: number
  ): void {
    const s = TILE_SIZE;
    switch (ch) {
      case '.':
        ctx.fillStyle = '#6ec25a';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#5eb24c';
        if (((tx + ty) & 1) === 0) {
          ctx.fillRect(px + 3, py + 4, 2, 1);
          ctx.fillRect(px + 10, py + 11, 2, 1);
        }
        break;
      case 'P':
        ctx.fillStyle = '#e5cf9c';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#d3ba84';
        ctx.fillRect(px + ((tx * 5) % 10) + 2, py + ((ty * 7) % 10) + 2, 2, 2);
        break;
      case 'G':
        // Rich FireRed Tall Wild Grass!
        ctx.fillStyle = '#4ea644';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#2d7a36';
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 4; c++) {
            const gx = px + 1 + c * 4;
            const gy = py + 2 + r * 5;
            ctx.fillRect(gx, gy, 2, 3);
            ctx.fillStyle = '#84e065';
            ctx.fillRect(gx + 1, gy - 1, 1, 2);
            ctx.fillStyle = '#2d7a36';
          }
        }
        break;
      case '#':
        // Lush layered pixel tree
        ctx.fillStyle = '#4ea644';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#1b4d2b';
        ctx.fillRect(px + 1, py + 2, 14, 12);
        ctx.fillStyle = '#2a6f3c';
        ctx.fillRect(px + 2, py + 1, 12, 10);
        ctx.fillStyle = '#41964f';
        ctx.fillRect(px + 3, py + 2, 10, 6);
        ctx.fillStyle = '#6b4226';
        ctx.fillRect(px + 6, py + 12, 4, 4);
        break;
      case 'W':
        ctx.fillStyle = '#2f82d6';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#60b2f7';
        ctx.fillRect(px + ((2 + waterPhase * 3) % 12), py + 4, 4, 1);
        ctx.fillRect(px + ((9 + waterPhase * 2) % 11), py + 11, 4, 1);
        break;
      case 'R':
        ctx.fillStyle = '#c93832';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#ef534b';
        ctx.fillRect(px, py + 2, s, 3);
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(px, py + 13, s, 3);
        break;
      case 'B':
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(px, py + 2, s, 3);
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(px, py + 13, s, 3);
        break;
      case 'Y':
        ctx.fillStyle = '#8d6c4d';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#b08b67';
        ctx.fillRect(px, py + 2, s, 3);
        ctx.fillStyle = '#5c432d';
        ctx.fillRect(px, py + 13, s, 3);
        break;
      case 'H':
        ctx.fillStyle = '#e7e2d3';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(px, py + 13, s, 3);
        // Cozy pixel window
        ctx.fillStyle = '#334155';
        ctx.fillRect(px + 4, py + 4, 8, 6);
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(px + 5, py + 5, 6, 4);
        break;
      case 'D':
        ctx.fillStyle = '#e7e2d3';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#3b2414';
        ctx.fillRect(px + 3, py + 2, 10, 14);
        ctx.fillStyle = '#6b4226';
        ctx.fillRect(px + 4, py + 3, 8, 13);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(px + 10, py + 9, 1, 2);
        break;
      case 'F':
        ctx.fillStyle = '#dfcfb4';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#cebc9d';
        ctx.fillRect(px, py + 7, s, 1);
        ctx.fillRect(px, py + 15, s, 1);
        break;
      case 'S':
        ctx.fillStyle = '#a8bcc4';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#92a8b2';
        ctx.fillRect(px, py + 15, s, 1);
        ctx.fillRect(px + 15, py, 1, s);
        break;
      case 'C':
        ctx.fillStyle = '#dfcfb4';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#854d27';
        ctx.fillRect(px, py + 2, s, 12);
        ctx.fillStyle = '#b46f3c';
        ctx.fillRect(px + 1, py + 3, s - 2, 8);
        break;
      case 'f':
        ctx.fillStyle = '#6ec25a';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = flowerPhase === 0 ? '#facc15' : '#f43f5e';
        ctx.fillRect(px + 3, py + 4, 3, 3);
        ctx.fillRect(px + 10, py + 10, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 4, py + 5, 1, 1);
        ctx.fillRect(px + 11, py + 11, 1, 1);
        break;
      case 'E':
        ctx.fillStyle = '#6ec25a';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#784421';
        ctx.fillRect(px + 6, py + 9, 4, 6);
        ctx.fillStyle = '#c58b4e';
        ctx.fillRect(px + 2, py + 3, 12, 7);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(px + 4, py + 5, 8, 1);
        ctx.fillRect(px + 4, py + 7, 6, 1);
        break;
      case '=':
        ctx.fillStyle = '#b8834b';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#8b5c2c';
        ctx.fillRect(px, py + 3, s, 1);
        ctx.fillRect(px, py + 11, s, 1);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(px, py, 1, s);
        ctx.fillRect(px + 15, py, 1, s);
        break;
      case 'M':
        ctx.fillStyle = '#dfcfb4';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(px + 2, py + 3, 12, 10);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(px + 3, py + 4, 10, 1);
        break;
      case 'K':
        ctx.fillStyle = '#b49e7e';
        ctx.fillRect(px, py, s, s);
        ctx.fillStyle = '#6b5c49';
        ctx.fillRect(px + 2, py + 3, 12, 11);
        ctx.fillStyle = '#99876e';
        ctx.fillRect(px + 3, py + 4, 10, 8);
        ctx.fillStyle = '#d6c7b2';
        ctx.fillRect(px + 4, py + 5, 5, 3);
        break;
    }
  }

  private drawNpc(ctx: CanvasRenderingContext2D, npc: NpcEntity, defeated: boolean): void {
    const px = npc.x * TILE_SIZE;
    const py = npc.y * TILE_SIZE;

    if (npc.spriteStyle === 'pokeball') {
      // Crisp overworld Poké Ball (starter table or ground item)
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(px + 4, py + 11, 8, 3);
      ctx.fillStyle = '#111827';
      ctx.fillRect(px + 4, py + 4, 8, 8);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(px + 5, py + 5, 6, 3);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(px + 5, py + 9, 6, 2);
      ctx.fillStyle = '#111827';
      ctx.fillRect(px + 5, py + 8, 6, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px + 7, py + 7, 2, 2);
      return;
    }

    const palettes: Record<string, { hair: string; shirt: string; pants: string }> = {
      oak: { hair: '#94a3b8', shirt: '#f8fafc', pants: '#78350f' },
      mom: { hair: '#7c2d12', shirt: '#f472b6', pants: '#9d174d' },
      nurse: { hair: '#f472b6', shirt: '#fdf2f8', pants: '#ec4899' },
      mart: { hair: '#1e3a8a', shirt: '#2563eb', pants: '#1e293b' },
      rival: { hair: '#a16207', shirt: '#7c3aed', pants: '#1e293b' },
      brock: { hair: '#1c1917', shirt: '#a16207', pants: '#3f6212' },
      misty: { hair: '#f97316', shirt: '#facc15', pants: '#2563eb' },
      bug_catcher: { hair: '#ca8a04', shirt: '#65a30d', pants: '#713f12' },
      picnicker: { hair: '#b45309', shirt: '#16a34a', pants: '#14532d' },
      camper: { hair: '#78350f', shirt: '#0d9488', pants: '#334155' },
      hiker: { hair: '#451a03', shirt: '#b45309', pants: '#44403c' },
      swimmer: { hair: '#0284c7', shirt: '#38bdf8', pants: '#1d4ed8' },
      youngster: { hair: '#1f2937', shirt: '#eab308', pants: '#1d4ed8' },
      villager: { hair: '#57534e', shirt: '#0ea5e9', pants: '#334155' },
    };
    const pal = palettes[npc.spriteStyle] ?? palettes.villager;
    this.drawTrainerCharacter(ctx, px, py, npc.dir, pal.hair, pal.shirt, pal.pants, 0);

    // Subtle visual indicator above undefeated trainers or healers/clerks
    if (npc.role === 'trainer' && !defeated) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(px + 7, py - 3, 2, 2);
    } else if (npc.role === 'heal') {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(px + 7, py - 4, 2, 4);
      ctx.fillRect(px + 6, py - 3, 4, 2);
    }
  }

  private drawTrainerCharacter(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    dir: Direction,
    hairColor: string,
    shirtColor: string,
    pantsColor: string,
    stepFrame: number
  ): void {
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(px + 3, py + 13, 10, 3);

    // Outline box head + torso
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px + 3, py + 1, 10, 7);
    ctx.fillRect(px + 3, py + 8, 10, 6);

    // Hair / Cap
    ctx.fillStyle = hairColor;
    ctx.fillRect(px + 4, py + 1, 8, 4);

    // Face
    ctx.fillStyle = '#fed7aa';
    if (dir === 'up') {
      ctx.fillStyle = hairColor;
      ctx.fillRect(px + 4, py + 2, 8, 5);
    } else {
      ctx.fillRect(px + 4, py + 4, 8, 3);
      ctx.fillStyle = '#111827';
      if (dir === 'down') {
        ctx.fillRect(px + 5, py + 5, 1, 2);
        ctx.fillRect(px + 10, py + 5, 1, 2);
      } else if (dir === 'left') {
        ctx.fillRect(px + 5, py + 5, 1, 2);
      } else {
        ctx.fillRect(px + 10, py + 5, 1, 2);
      }
    }

    // Jacket / Shirt
    ctx.fillStyle = shirtColor;
    ctx.fillRect(px + 4, py + 8, 8, 4);

    // Legs / Walking animation
    ctx.fillStyle = pantsColor;
    const leftY = stepFrame === 1 ? py + 11 : py + 12;
    const rightY = stepFrame === 2 ? py + 11 : py + 12;
    ctx.fillRect(px + 4, leftY, 3, 3);
    ctx.fillRect(px + 9, rightY, 3, 3);
  }
}
