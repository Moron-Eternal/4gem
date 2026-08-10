import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { Enemy } from '../enemy.js';

export class Husk extends Enemy {
  constructor(scene, position, player) {
    super(scene, position, player, 45); // 45 HP

    this.speed = 7.5; // Fast melee sprinter
    this.damage = 12;

    this.buildMesh();
  }

  buildMesh() {
    const geo = new THREE.CylinderGeometry(0.4, 0.2, 1.8, 6);
    const mat = new THREE.MeshStandardMaterial({ color: 0x882222, roughness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.9;
    mesh.castShadow = true;
    this.setupHitbox(mesh);
  }

  update(delta, playerPos) {
    super.update(delta, playerPos);
    if (this.isDead || this.player.isDead) return;

    // Direct movement toward player
    const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist > 1.2) {
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * delta);
      this.group.lookAt(playerPos.x, this.group.position.y, playerPos.z);
    } else {
      // Melee attack range
      if (this.attackCooldown <= 0) {
        this.player.takeDamage(this.damage);
        this.attackCooldown = 1.0;
      }
    }
  }
}
