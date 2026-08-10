import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { GameRenderer } from './engine/renderer.js';
import { sound } from './engine/audio.js';
import { DungeonGenerator } from './world/dungeonGenerator.js';
import { Player } from './player/player.js';
import { WeaponManager } from './player/weaponManager.js';
import { ItemPedestal, ITEM_DATABASE } from './entities/item.js';
import { WeaponPedestal } from './entities/weaponPedestal.js';
import { Husk } from './entities/enemies/husk.js';
import { Stray } from './entities/enemies/stray.js';
import { MaliciousSkull } from './entities/enemies/skull.js';
import { MaliciousTitanBoss } from './entities/enemies/boss.js';
import { Minimap } from './ui/minimap.js';
import { HUDManager } from './ui/hud.js';

class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.hudOverlay = document.getElementById('hud-overlay');

    this.startScreen = document.getElementById('start-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.victoryScreen = document.getElementById('victory-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');

    this.state = 'START'; // 'START', 'PLAYING', 'PAUSED', 'VICTORY', 'GAMEOVER'
    this.lastTime = performance.now();

    this.projectiles = [];
    this.activeRoom = null;
    this.activeEnemies = [];
    this.pedestals = [];

    this.initUIEvents();
  }

  initUIEvents() {
    document.getElementById('btn-start').addEventListener('click', () => this.startGame());
    document.getElementById('btn-resume').addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-restart-win').addEventListener('click', () => this.startGame());
    document.getElementById('btn-restart-lose').addEventListener('click', () => this.startGame());

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.state === 'PLAYING') {
        this.pauseGame();
      }
    });
  }

  startGame() {
    sound.init();

    // Reset Containers
    this.container.innerHTML = '';
    this.projectiles = [];
    this.activeEnemies = [];
    this.pedestals = [];

    // Core Systems
    this.gameRenderer = new GameRenderer(this.container);
    this.scene = this.gameRenderer.scene;
    this.camera = this.gameRenderer.camera;

    this.dungeon = new DungeonGenerator(this.scene, this.gameRenderer);
    this.player = new Player(this.camera, document.body);
    this.weapons = new WeaponManager(this.camera, this.scene, this.player);
    this.hud = new HUDManager();
    this.minimap = new Minimap('minimap-canvas', this.dungeon);

    // Pass active enemies reference to WeaponManager for 0ms raycasting
    this.weapons.setActiveEnemiesRef(this.activeEnemies);

    // Initial HUD weapon status
    this.weapons.updateUI();

    // Place Player in Start Room
    const startWorldPos = this.dungeon.startRoom.worldPos.clone();
    startWorldPos.y = 1.8;
    this.player.camera.position.copy(startWorldPos);

    // Spawn Weapon Pedestals & Item Pedestals in Item Rooms
    const gunNames = [
      { slot: 1, name: 'SHOTGUN' },
      { slot: 2, name: 'NAILGUN' },
      { slot: 3, name: 'RAILCANNON' }
    ];

    this.dungeon.itemRooms.forEach((room, idx) => {
      if (idx < gunNames.length) {
        const gunInfo = gunNames[idx];
        const wPed = new WeaponPedestal(this.scene, room.worldPos, gunInfo.slot, gunInfo.name, this.weapons, this.player, this.hud);
        this.pedestals.push(wPed);
      } else {
        const itemData = ITEM_DATABASE[idx % ITEM_DATABASE.length];
        const iPed = new ItemPedestal(this.scene, room.worldPos, itemData, this.player, this.hud);
        this.pedestals.push(iPed);
      }
    });

    // Request Pointer Lock
    document.body.requestPointerLock();

    // UI state
    this.startScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.victoryScreen.classList.add('hidden');
    this.gameoverScreen.classList.add('hidden');
    this.hudOverlay.classList.remove('hidden');

    this.state = 'PLAYING';
    this.lastTime = performance.now();

    requestAnimationFrame((t) => this.loop(t));
  }

  pauseGame() {
    this.state = 'PAUSED';
    document.exitPointerLock();
    this.pauseScreen.classList.remove('hidden');
  }

  resumeGame() {
    this.state = 'PLAYING';
    this.pauseScreen.classList.add('hidden');
    document.body.requestPointerLock();
  }

  onRoomEntered(room) {
    this.activeRoom = room;
    room.visited = true;

    // Light Culling Optimization: Only enable lights in active room & adjacent rooms
    this.dungeon.roomsList.forEach(r => {
      const dist = Math.hypot(r.gridX - room.gridX, r.gridZ - room.gridZ);
      const isNearby = (dist <= 1.5);
      r.group.traverse(child => {
        if (child.isPointLight) {
          child.visible = isNearby;
        }
      });
    });

    if (!room.cleared) {
      room.setGatesLocked(true);
      sound.playDoorSlam();

      if (room.type === 'boss') {
        this.hud.showRoomBanner('MALICIOUS TITAN', 'THE FINAL TRIAL BEGINS');
        const boss = new MaliciousTitanBoss(this.scene, room.worldPos, this.player, this.projectiles);
        this.activeEnemies.push(boss);
      } else {
        this.hud.showRoomBanner('ROOM LOCKED', 'ELIMINATE HOSTILES TO PROCEED');
        this.spawnRoomEnemies(room);
      }
    }
  }

  spawnRoomEnemies(room) {
    const enemyCount = Math.floor(Math.random() * 3) + 3;
    const center = room.worldPos;

    for (let i = 0; i < enemyCount; i++) {
      const offset = new THREE.Vector3(
        (Math.random() * 2 - 1) * 7,
        0,
        (Math.random() * 2 - 1) * 7
      );
      const spawnPos = center.clone().add(offset);

      const roll = Math.random();
      let enemy;
      if (roll < 0.45) {
        enemy = new Husk(this.scene, spawnPos, this.player);
      } else if (roll < 0.8) {
        enemy = new Stray(this.scene, spawnPos, this.player, this.projectiles);
      } else {
        enemy = new MaliciousSkull(this.scene, spawnPos, this.player, this.projectiles);
      }
      this.activeEnemies.push(enemy);
    }
  }

  checkRoomClearing() {
    if (this.activeRoom && !this.activeRoom.cleared && this.activeEnemies.length > 0) {
      this.activeEnemies = this.activeEnemies.filter(e => !e.isDead);

      if (this.activeEnemies.length === 0) {
        this.activeRoom.cleared = true;
        this.activeRoom.setGatesLocked(false);
        sound.playItemPickup();

        if (this.activeRoom.type === 'boss') {
          this.triggerVictory();
        } else {
          this.hud.showRoomBanner('ROOM CLEARED', 'GATES UNLOCKED');
          const rewardData = ITEM_DATABASE[Math.floor(Math.random() * ITEM_DATABASE.length)];
          const iPed = new ItemPedestal(this.scene, this.activeRoom.worldPos, rewardData, this.player, this.hud);
          this.pedestals.push(iPed);
        }
      }
    }
  }

  triggerVictory() {
    this.state = 'VICTORY';
    document.exitPointerLock();
    this.victoryScreen.classList.remove('hidden');
    this.hudOverlay.classList.add('hidden');
  }

  triggerGameOver() {
    this.state = 'GAMEOVER';
    document.exitPointerLock();
    this.gameoverScreen.classList.remove('hidden');
    this.hudOverlay.classList.add('hidden');
  }

  loop(currentTime) {
    if (this.state !== 'PLAYING') return;

    const delta = Math.min(0.04, (currentTime - this.lastTime) / 1000.0);
    this.lastTime = currentTime;

    // Player Update
    this.player.update(delta);

    if (this.player.isDead) {
      this.triggerGameOver();
      return;
    }

    // Room Detection
    const currentRoom = this.dungeon.getRoomAtWorldPos(this.player.camera.position);
    if (currentRoom && currentRoom !== this.activeRoom) {
      this.onRoomEntered(currentRoom);
    }

    // Weapon Manager Update
    this.weapons.update(delta);

    // Update active room torches only
    if (this.activeRoom) {
      this.activeRoom.update(currentTime / 1000.0);
    }

    // Pedestals update
    let hasNearbyPedestal = false;
    for (let i = 0; i < this.pedestals.length; i++) {
      const p = this.pedestals[i];
      if (!p.collected) {
        p.update(currentTime / 1000.0, this.player.camera.position);
        if (p.group.position.distanceTo(this.player.camera.position) < 2.5) {
          hasNearbyPedestal = true;
        }
      }
    }
    if (!hasNearbyPedestal) {
      this.hud.hideInteractionPrompt();
    }

    // Active Enemies Update
    for (let i = 0; i < this.activeEnemies.length; i++) {
      this.activeEnemies[i].update(delta, this.player.camera.position);
    }
    this.checkRoomClearing();

    // Projectiles Update
    for (let i = 0; i < this.projectiles.length; i++) {
      this.projectiles[i].update(delta);
    }
    this.projectiles = this.projectiles.filter(p => !p.isDestroyed);

    // HUD & Dynamic Minimap Updates
    this.hud.updateHealth(this.player.health, this.player.maxHealth);
    this.hud.updateDashCharges(this.player.dashCharges, this.player.maxDashCharges);
    this.hud.updateWeaponCooldowns(this.weapons.weapons);
    this.minimap.render(this.player.camera.position, this.activeRoom, this.player.yaw);

    // Render Scene
    this.gameRenderer.render(currentTime / 1000.0);

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Global Game Instantiation
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
