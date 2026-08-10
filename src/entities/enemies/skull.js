import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { Enemy } from '../enemy.js';
import { EnemyProjectile } from '../projectile.js';

export class MaliciousSkull extends Enemy {
  constructor(scene, position, player, projectilesList) {
    super(scene, position, player, 80); // 80 HP
    this.projectilesList = projectilesList;

    this.speed = 4.2;
    this.damage = 18;
    this.shootCooldown = 2.5;

    this.buildCharacterMesh();
  }

  buildCharacterMesh() {
    const group = new THREE.Group();

    const boneMat = new THREE.MeshStandardMaterial({ color: 0x801020, roughness: 0.5, metalness: 0.5 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    // Low-poly demonic skull body
    const skullGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const skull = new THREE.Mesh(skullGeo, boneMat);
    skull.position.y = 2.8;
    group.add(skull);

    // Jawbone
    const jawGeo = new THREE.BoxGeometry(0.7, 0.35, 0.7);
    const jaw = new THREE.Mesh(jawGeo, boneMat);
    jaw.position.set(0, 2.3, 0.1);
    group.add(jaw);

    // Hollow eye sockets
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), eyeMat);
    leftEye.position.set(-0.24, 2.9, 0.46);
    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), eyeMat);
    rightEye.position.set(0.24, 2.9, 0.46);
    group.add(leftEye, rightEye);

    // Glowing core light
    const coreLight = new THREE.PointLight(0xff4400, 2.0, 8);
    coreLight.position.y = 2.8;
    group.add(coreLight);

    this.setupHitbox(group);
  }

  update(delta, playerPos) {
    super.update(delta, playerPos);
    if (this.isDead || this.player.isDead) return;

    // Bobbing floating height
    const targetY = 2.8 + Math.sin(Date.now() * 0.003) * 0.5;
    this.group.position.y += (targetY - this.group.position.y) * delta * 2.0;

    const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
    const dist = dir.length();

    if (dist > 6.0) {
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * delta);
    }
    this.group.lookAt(playerPos);

    this.shootCooldown -= delta;
    if (this.shootCooldown <= 0 && dist < 30.0) {
      this.shootCooldown = 2.8;
      const spawnPos = this.group.position.clone();
      const baseDir = new THREE.Vector3().subVectors(playerPos, spawnPos).normalize();

      const offsets = [-0.15, 0, 0.15];
      offsets.forEach(off => {
        const spreadDir = baseDir.clone();
        spreadDir.x += off;
        spreadDir.normalize();
        const proj = new EnemyProjectile(this.scene, spawnPos, spreadDir, this.damage, this.player);
        this.projectilesList.push(proj);
      });
    }
  }
}
