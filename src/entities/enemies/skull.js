import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { Enemy } from '../enemy.js';
import { EnemyProjectile } from '../projectile.js';

export class MaliciousSkull extends Enemy {
  constructor(scene, position, player, projectilesList) {
    super(scene, position, player, 80); // 80 HP
    this.projectilesList = projectilesList;

    this.speed = 4.0;
    this.damage = 18;
    this.shootCooldown = 2.5;

    this.buildMesh();
  }

  buildMesh() {
    const geo = new THREE.DodecahedronGeometry(0.7, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4400, wireframe: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 3.0; // Floating aerial height
    mesh.castShadow = true;
    this.setupHitbox(mesh);

    // Glowing core light
    const coreLight = new THREE.PointLight(0xff4400, 1.5, 6);
    coreLight.position.y = 3.0;
    this.group.add(coreLight);
  }

  update(delta, playerPos) {
    super.update(delta, playerPos);
    if (this.isDead || this.player.isDead) return;

    // Bobbing aerial movement
    const targetY = 3.0 + Math.sin(Date.now() * 0.003) * 0.6;
    this.group.position.y += (targetY - this.group.position.y) * delta * 2.0;

    const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
    const dist = dir.length();

    if (dist > 6.0) {
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * delta);
    }
    this.group.lookAt(playerPos);

    // Triple Fireball Spread
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
