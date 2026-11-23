import { isTileWalkable, KANTO_MAPS } from '../../data/maps/kantoMaps';
import { Direction, MapDefinition, NpcEntity, SaveState, WarpPoint, WildEncounterEntry } from '../../types/game';
import { getOverworldCharacterSprite } from './characterSprites';
import { tilesetAtlas } from './tilesetAtlas';

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

function oppositeDir(dir: Direction): Direction {
  switch (dir) {
    case 'up': return 'down';
    case 'down': return 'up';
    case 'left': return 'right';
    case 'right': return 'left';
  }
}

/**
 * Crisp 16x16 GBA FireRed-style tilemap overworld engine using hand-authored
 * pixel-art tiles (tilesetAtlas) and 16x22 multi-frame animated character sprites.
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
  private walkToggle = false;
  private time = 0;

  private heldDirs: Direction[] = [];
  public paused = false;
  private stepCooldown = 0;
  public alertNpcId: string | null = null;
  private alertTimer = 0;
  /** Runtime facing overrides so NPCs turn naturally toward the player during dialogue */
  private npcFacingOverrides = new Map<string, Direction>();

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
      // Only ground Poké Ball pickups disappear once collected — human NPCs (trainers & item_givers) NEVER vanish!
      if (
        npc.role === 'item_pickup' &&
        npc.spriteStyle === 'pokeball' &&
        this.save.collectedItems.includes(npc.id)
      ) {
        return false;
      }
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
      if (npc.spriteStyle !== 'pokeball') {
        this.npcFacingOverrides.set(npc.id, oppositeDir(this.save.playerDir));
      }
      this.callbacks.onInteractNpc(npc);
      return;
    }

    // Check across counter ('C') for Nurse Joy / Oak / Mart Clerk
    if (map.tiles[ty]?.[tx] === 'C') {
      const acrossNpc = npcs.find((n) => n.x === tx + dx && n.y === ty + dy);
      if (acrossNpc) {
        if (acrossNpc.spriteStyle !== 'pokeball') {
          this.npcFacingOverrides.set(acrossNpc.id, oppositeDir(this.save.playerDir));
        }
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
    const clampedDt = Math.max(0, Math.min(0.05, dt));
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
      const moveSpeed = 5.4;
      this.moveProgress += clampedDt * moveSpeed;
      if (this.moveProgress >= 1) {
        this.moving = false;
        this.moveProgress = 0;
        this.save.playerX = this.moveToX;
        this.save.playerY = this.moveToY;
        this.walkToggle = !this.walkToggle;
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

    const warp = map.warps.find((w) => w.x === nx && w.y === ny);
    if (warp && warp.requiredFlag && !this.save.flags[warp.requiredFlag]) {
      this.stepCooldown = 0.25;
      this.callbacks.onWarpBlocked(warp.blockedMessage ?? 'You cannot go this way yet.');
      return;
    }

    if (!isTileWalkable(map, nx, ny)) return;

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

    // 1. Warp tile
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
      this.npcFacingOverrides.clear();
      this.stepCooldown = 0.16;
      this.callbacks.onMapChanged(this.getCurrentMap());
      return;
    }

    // 2. Undefeated Trainer Line-of-Sight
    if (this.save.party.some((m) => m.hp > 0)) {
      const spotted = this.findSpottingTrainer(map, px, py);
      if (spotted) {
        this.alertNpcId = spotted.id;
        this.alertTimer = 0.52;
        this.clearInputs();
        return;
      }
    }

    // 3. Tall Grass wild encounter
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
   * Renders the crisp GBA FireRed 240x160 tilemap with depth-sorted 16x22 pixel characters.
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
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-Math.round(camX), -Math.round(camY));

    // 1. Render Hand-Authored FireRed 16x16 Tiles
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        tilesetAtlas.drawMapTile(ctx, map, x, y, x * TILE_SIZE, y * TILE_SIZE, this.time);
      }
    }

    // 2. Depth-sort NPCs & Player by Y coordinate (so 16x22 tall sprites overlap naturally!)
    const npcs = this.getVisibleNpcs(map);
    type DrawEntity = { sortY: number; draw: () => void };
    const entities: DrawEntity[] = [];

    for (const npc of npcs) {
      const defeated = npc.trainerId ? this.save.defeatedTrainers.includes(npc.trainerId) : false;
      entities.push({
        sortY: npc.y,
        draw: () => this.drawNpc(ctx, npc, defeated),
      });
    }

    const playerStepFrame = this.moving
      ? this.moveProgress > 0.15 && this.moveProgress < 0.85
        ? this.walkToggle
          ? 1
          : 2
        : 0
      : 0;

    entities.push({
      sortY: interpY,
      draw: () => {
        const px = Math.round(interpX * TILE_SIZE);
        const py = Math.round(interpY * TILE_SIZE);
        // Grounded oval shadow
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(px + 3, py + 13, 10, 3);
        const sp = getOverworldCharacterSprite('red', this.save.playerDir, playerStepFrame);
        ctx.drawImage(sp, px, py - 6);
      },
    });

    entities.sort((a, b) => a.sortY - b.sortY);
    for (const e of entities) e.draw();

    // 3. Draw Trainer '!' Alert Bubble
    if (this.alertNpcId) {
      const alertNpc = npcs.find((n) => n.id === this.alertNpcId);
      if (alertNpc) {
        const ax = alertNpc.x * TILE_SIZE + 2;
        const ay = alertNpc.y * TILE_SIZE - 19;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(ax - 1, ay - 1, 13, 13);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ax, ay, 11, 11);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(ax + 4, ay + 1, 3, 5);
        ctx.fillRect(ax + 4, ay + 7, 3, 2);
      }
    }

    ctx.restore();
  }

  private drawNpc(ctx: CanvasRenderingContext2D, npc: NpcEntity, defeated: boolean): void {
    const px = npc.x * TILE_SIZE;
    const py = npc.y * TILE_SIZE;

    if (npc.spriteStyle === 'pokeball') {
      ctx.drawImage(tilesetAtlas.getPokeballTile(), px, py);
      return;
    }

    const dir = this.npcFacingOverrides.get(npc.id) ?? npc.dir;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(px + 3, py + 13, 10, 3);
    const sp = getOverworldCharacterSprite(npc.spriteStyle, dir, 0);
    ctx.drawImage(sp, px, py - 6);

    // Subtle RPG role marker floating gently above healers / undefeated trainers
    const bob = Math.round(Math.sin(this.time * 4) * 1);
    if (npc.role === 'trainer' && !defeated) {
      ctx.fillStyle = '#111827';
      ctx.fillRect(px + 6, py - 11 + bob, 4, 4);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(px + 7, py - 10 + bob, 2, 2);
    } else if (npc.role === 'heal') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px + 5, py - 12 + bob, 6, 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(px + 7, py - 11 + bob, 2, 4);
      ctx.fillRect(px + 6, py - 10 + bob, 4, 2);
    }
  }
}
