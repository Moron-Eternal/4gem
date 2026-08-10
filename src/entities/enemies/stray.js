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

    this.buildCharacterMesh();
  }

  buildCharacterMesh() {
    const group = new THREE.Group();

    const robeMat = new THREE.MeshStandardMaterial({ color: 0x1f283d, roughness: 0.8 });
    const maskMat = new THREE.MeshStandardMaterial({ color: 0xd0d8e8, roughness: 0.3 });
    const purpleGlow = new THREE.MeshBasicMaterial({ color: 0xa020f0 });

    // Cultist Robes Body
    const bodyGeo = new THREE.ConeGeometry(0.65, 2.0, 8);
    const body = new THREE.Mesh(bodyGeo, robeMat);
    body.position.y = 1.0;
    group.add(body);

    // Masked Head
    const headGeo = new THREE.SphereGeometry(0.32, 8, 8);
    const head = new THREE.Mesh(headGeo, maskMat);
    head.position.set(0, 1.9, 0);
    group.add(head);

    // Glowing Staff
    const staffGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6);
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x402010 });
    const staff = new THREE.Mesh(staffGeo, staffMat);
    staff.position.set(0.55, 1.1, 0.2);
    group.add(staff);

    const orbGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const orb = new THREE.Mesh(orbGeo, purpleGlow);
    orb.position.set(0.55, 2.2, 0.2);
    group.add(orb);

    this.setupHitbox(group);
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

    this.shootCooldown -= delta;
    if (this.shootCooldown <= 0 && dist < 28.0) {
      this.shootCooldown = 2.2;
      const spawnPos = this.group.position.clone().add(new THREE.Vector3(0, 1.8, 0));
      const targetDir = new THREE.Vector3().subVectors(playerPos, spawnPos).normalize();
      const proj = new EnemyProjectile(this.scene, spawnPos, targetDir, this.damage, this.player);
      this.projectilesList.push(proj);
    }
  }
}
