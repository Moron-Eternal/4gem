import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { Enemy } from '../enemy.js';
import { EnemyProjectile } from '../projectile.js';

export class Stray extends Enemy {
  constructor(scene, position, player, projectilesList) {
    super(scene, position, player, 60); // 60 HP
    this.projectilesList = projectilesList;

    this.speed = 3.5;
    this.damage = 15;
    this.shootCooldown = 2.0;

    this.buildMesh();
  }

  buildMesh() {
    const geo = new THREE.BoxGeometry(0.8, 2.0, 0.8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 1.0;
    mesh.castShadow = true;
    this.setupHitbox(mesh);
  }

  update(delta, playerPos) {
    super.update(delta, playerPos);
    if (this.isDead || this.player.isDead) return;

    const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist > 8.0) {
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * delta);
    }
    this.group.lookAt(playerPos.x, this.group.position.y, playerPos.z);

    // Ranged fireball attack
    this.shootCooldown -= delta;
    if (this.shootCooldown <= 0 && dist < 25.0) {
      this.shootCooldown = 2.2;
      const spawnPos = this.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      const targetDir = new THREE.Vector3().subVectors(playerPos, spawnPos).normalize();
      const proj = new EnemyProjectile(this.scene, spawnPos, targetDir, this.damage, this.player);
      this.projectilesList.push(proj);
    }
  }
}
