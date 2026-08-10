import * as THREE from '../../vendor/three.module.js';
import { Enemy } from '../enemy.js';
import { EnemyProjectile } from '../projectile.js';

export class MaliciousSkull extends Enemy {
  constructor(scene, position, player, projectilesList) {
    super(scene, position, player, 80);
    this.projectilesList = projectilesList;
    this.speed = 4.0;
    this.damage = 16;
    this.shootCooldown = 3.0;
    this.bobOffset = Math.random() * Math.PI * 2;
    this.roomCenter = position.clone(); // Store spawn room center for boundary clamping
    this.buildCharacterMesh();
  }

  buildCharacterMesh() {
    const group = new THREE.Group();

    const boneMat = new THREE.MeshBasicMaterial({ color: 0x992020 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });

    // Skull body
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.8), boneMat);
    group.add(skull);

    // Jawbone
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.6), boneMat);
    jaw.position.set(0, -0.5, 0.05);
    group.add(jaw);

    // Eyes
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.1), eyeMat);
    leftEye.position.set(-0.22, 0.1, 0.41);
    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.1), eyeMat);
    rightEye.position.set(0.22, 0.1, 0.41);
    group.add(leftEye, rightEye);

    // Position the whole model group elevated
    group.position.y = 3.0;

    this.setupHitbox(group);
  }

  update(delta, playerPos) {
    super.update(delta, playerPos);
    if (this.isDead || this.player.isDead) return;

    // Floating bob
    this.bobOffset += delta * 3;
    this.group.position.y = this.position.y + 3.0 + Math.sin(this.bobOffset) * 0.4;

    const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
    const dist = dir.length();

    if (dist > 7.0) {
      dir.normalize();
      this.group.position.x += dir.x * this.speed * delta;
      this.group.position.z += dir.z * this.speed * delta;
    }
    this.group.lookAt(playerPos);

    // Clamp to room boundaries so skull can't fly through walls
    const boundary = 10.0;
    this.group.position.x = Math.max(this.roomCenter.x - boundary, Math.min(this.roomCenter.x + boundary, this.group.position.x));
    this.group.position.z = Math.max(this.roomCenter.z - boundary, Math.min(this.roomCenter.z + boundary, this.group.position.z));

    // Triple fireball
    this.shootCooldown -= delta;
    if (this.shootCooldown <= 0 && dist < 30.0) {
      this.shootCooldown = 3.2;
      const spawnPos = this.group.position.clone();
      const baseDir = new THREE.Vector3().subVectors(playerPos, spawnPos).normalize();

      [-0.12, 0, 0.12].forEach(off => {
        const spreadDir = baseDir.clone();
        spreadDir.x += off;
        spreadDir.normalize();
        const proj = new EnemyProjectile(this.scene, spawnPos.clone(), spreadDir, this.damage, this.player, 14.0);
        this.projectilesList.push(proj);
      });
    }
  }
}
