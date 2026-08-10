import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { sound } from '../engine/audio.js';

export class WeaponPedestal {
  constructor(scene, position, weaponSlotIndex, weaponName, weaponManager, player, hud) {
    this.scene = scene;
    this.position = position.clone();
    this.weaponSlotIndex = weaponSlotIndex; // 1 = Shotgun, 2 = Nailgun, 3 = Railcannon
    this.weaponName = weaponName;
    this.weaponManager = weaponManager;
    this.player = player;
    this.hud = hud;
    this.collected = false;

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.buildPedestal();
    this.scene.add(this.group);
  }

  buildPedestal() {
    // Stone Alter Base
    const baseGeo = new THREE.BoxGeometry(1.4, 1.0, 1.4);
    const baseMat = new THREE.MeshBasicMaterial({ color: 0x222a3a });
    const alter = new THREE.Mesh(baseGeo, baseMat);
    alter.position.y = 0.5;
    this.group.add(alter);

    // Floating Gun Model Preview
    const gunMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const previewGeo = new THREE.BoxGeometry(0.3, 0.3, 0.9);
    this.gunPreview = new THREE.Mesh(previewGeo, gunMat);
    this.gunPreview.position.y = 1.6;
    this.group.add(this.gunPreview);
  }

  update(time, playerPos) {
    if (this.collected) return;

    this.gunPreview.rotation.y = time * 2;
    this.gunPreview.position.y = 1.6 + Math.sin(time * 3) * 0.1;

    // Proximity check for interaction prompt
    const dist = this.group.position.distanceTo(playerPos);
    if (dist < 2.5) {
      if (this.hud) {
        this.hud.showInteractionPrompt(`PRESS [E] TO EQUIP ${this.weaponName}`);
      }
      if (this.player.keys.e) {
        this.collect();
      }
    }
  }

  collect() {
    if (this.collected) return;
    this.collected = true;
    sound.playItemPickup();

    // Unlock weapon in inventory & auto-select it
    this.weaponManager.unlockWeapon(this.weaponSlotIndex);
    this.weaponManager.selectWeapon(this.weaponSlotIndex);

    if (this.hud) {
      this.hud.hideInteractionPrompt();
      this.hud.showRoomBanner('NEW WEAPON ACQUIRED', `${this.weaponName} UNLOCKED`);
    }

    this.scene.remove(this.group);
  }
}
