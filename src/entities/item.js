import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { sound } from '../engine/audio.js';

export const ITEM_DATABASE = [
  { id: 'blood_fuel', name: 'BLOOD FUEL', desc: 'Enemy kills siphon blood to restore +15 Health', icon: '❤️' },
  { id: 'furious_dash', name: 'FURIOUS DASH', desc: 'Dash recharge speed +50% & bonus charge', icon: '⚡' },
  { id: 'overclock', name: 'OVERCLOCK COILS', desc: 'Weapon fire rate and damage output +30%', icon: '🔥' },
  { id: 'steel_armor', name: 'STEEL ARMOR', desc: 'Fortified plating reduces all incoming damage by 25%', icon: '🛡️' },
  { id: 'siphon_core', name: 'SIPHON CORE', desc: 'Extends Max Health by +25 and fully restores HP', icon: '💎' }
];

export class ItemPedestal {
  constructor(scene, position, itemData, player, hud) {
    this.scene = scene;
    this.position = position;
    this.itemData = itemData;
    this.player = player;
    this.hud = hud;
    this.collected = false;

    this.group = new THREE.Group();
    this.group.position.copy(position);

    this.buildPedestal();
    this.scene.add(this.group);
  }

  buildPedestal() {
    // Stone Pedestal Base
    const pedGeo = new THREE.CylinderGeometry(0.8, 1.0, 1.2, 8);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x1f2638, roughness: 0.8 });
    const pedestal = new THREE.Mesh(pedGeo, pedMat);
    pedestal.position.y = 0.6;
    this.group.add(pedestal);

    // Floating Item Gem
    const gemGeo = new THREE.OctahedronGeometry(0.4, 0);
    const gemMat = new THREE.MeshBasicMaterial({ color: 0xffb700, wireframe: true });
    this.gem = new THREE.Mesh(gemGeo, gemMat);
    this.gem.position.y = 1.8;
    this.group.add(this.gem);

    // Gold Glow Light
    this.light = new THREE.PointLight(0xffb700, 1.5, 6);
    this.light.position.y = 1.8;
    this.group.add(this.light);
  }

  update(time, playerPos) {
    if (this.collected) return;

    // Rotate & bob floating item
    this.gem.rotation.y = time * 2;
    this.gem.position.y = 1.8 + Math.sin(time * 3) * 0.12;

    // Distance check to player
    const dist = this.group.position.distanceTo(playerPos);
    if (dist < 1.8) {
      this.collect();
    }
  }

  collect() {
    if (this.collected) return;
    this.collected = true;
    sound.playItemPickup();

    // Apply Stat Buffs
    if (this.itemData.id === 'blood_fuel') {
      this.player.statMultipliers.bloodFuel = true;
    } else if (this.itemData.id === 'furious_dash') {
      this.player.statMultipliers.cooldown *= 1.5;
      this.player.maxDashCharges += 1;
      this.player.dashCharges += 1;
    } else if (this.itemData.id === 'overclock') {
      this.player.statMultipliers.damage *= 1.3;
      this.player.statMultipliers.speed *= 1.15;
    } else if (this.itemData.id === 'steel_armor') {
      this.player.statMultipliers.steelArmor *= 0.75;
    } else if (this.itemData.id === 'siphon_core') {
      this.player.maxHealth += 25;
      this.player.heal(100);
    }

    // Register UI Item card on Left HUD Strip
    if (this.hud) {
      this.hud.addCollectedItem(this.itemData);
    }

    // Remove 3D Mesh
    this.scene.remove(this.group);
  }
}
