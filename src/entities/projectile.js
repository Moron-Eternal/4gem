import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class EnemyProjectile {
  constructor(scene, startPos, direction, damage, player, speed = 16.0) {
    this.scene = scene;
    this.direction = direction.clone().normalize();
    this.damage = damage;
    this.player = player;
    this.speed = speed;
    this.isDestroyed = false;
    this.life = 0;
    this.hasHit = false;

    // Glowing 3D Sphere Fireball
    const geo = new THREE.SphereGeometry(0.3, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(startPos);
    this.scene.add(this.mesh);
  }

  update(delta) {
    if (this.isDestroyed) return;

    this.life += delta;

    // Move projectile forward along direction vector
    this.mesh.position.x += this.direction.x * this.speed * delta;
    this.mesh.position.y += this.direction.y * this.speed * delta;
    this.mesh.position.z += this.direction.z * this.speed * delta;

    // Player impact collision check
    if (!this.hasHit && this.player && !this.player.isDead) {
      const distToPlayer = this.mesh.position.distanceTo(this.player.camera.position);
      if (distToPlayer < 1.0) {
        this.hasHit = true;
        this.player.takeDamage(this.damage);
        this.destroy();
        return;
      }
    }

    // Auto despawn after 4 seconds or falling below ground
    if (this.life > 4.0 || this.mesh.position.y < -2.0) {
      this.destroy();
    }
  }

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.scene.remove(this.mesh);
  }
}
