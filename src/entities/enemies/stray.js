import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { Enemy } from '../enemy.js';
import { EnemyProjectile } from '../projectile.js';

export class Stray extends Enemy {
  constructor(scene, position, player, projectilesList) {
    super(scene, position, player, 60);
    this.projectilesList = projectilesList;
    this.speed = 3.0;
    this.damage = 14;
    this.shootCooldown = 2.5;
    this.buildCharacterMesh();
  }

  buildCharacterMesh() {
    const group = new THREE.Group();

    const robeMat = new THREE.MeshBasicMaterial({ color: 0x2a3352 });
    const maskMat = new THREE.MeshBasicMaterial({ color: 0xc8d0e0 });
    const purpleGlow = new THREE.MeshBasicMaterial({ color: 0xaa30ff });

    // Robes body
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.0, 8), robeMat);
    body.position.y = 1.0;
    group.add(body);

    // Masked head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), maskMat);
    head.position.set(0, 2.0, 0);
    group.add(head);

    // Staff
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), new THREE.MeshBasicMaterial({ color: 0x5a3018 }));
    staff.position.set(0.55, 1.1, 0.2);
    group.add(staff);

    // Orb
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), purpleGlow);
    orb.position.set(0.55, 2.3, 0.2);
    group.add(orb);

    this.setupHitbox(group);
  }

  update(delta, playerPos) {
    super.update(delta, playerPos);
    if (this.isDead || this.player.isDead) return;

    const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
    dir.y = 0;
    const dist = dir.length();

    // Keep distance from player for ranged combat
    if (dist > 10.0) {
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * delta);
    } else if (dist < 5.0) {
      dir.normalize();
      this.group.position.addScaledVector(dir, -this.speed * 0.5 * delta);
    }
    this.group.lookAt(playerPos.x, this.group.position.y, playerPos.z);

    // Ranged fireball attack
    this.shootCooldown -= delta;
    if (this.shootCooldown <= 0 && dist < 28.0) {
      this.shootCooldown = 2.5;
      const spawnPos = this.group.position.clone();
      spawnPos.y += 1.8; // Staff height
      const targetDir = new THREE.Vector3().subVectors(playerPos, spawnPos).normalize();
      const proj = new EnemyProjectile(this.scene, spawnPos, targetDir, this.damage, this.player, 14.0);
      this.projectilesList.push(proj);
    }
  }
}
