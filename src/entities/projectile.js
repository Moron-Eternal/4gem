import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class EnemyProjectile {
  constructor(scene, startPos, direction, damage, player, speed = 18.0) {
    this.scene = scene;
    this.position = startPos.clone();
    this.direction = direction.clone().normalize();
    this.damage = damage;
    this.player = player;
    this.speed = speed;
    this.isDestroyed = false;
    this.life = 0;

    const geo = new THREE.SphereGeometry(0.3, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(delta) {
    if (this.isDestroyed) return;

    this.life += delta;
    this.mesh.position.addScaledVector(this.direction, this.speed * delta);

    // Collision with player
    const distToPlayer = this.mesh.position.distanceTo(this.player.camera.position);
    if (distToPlayer < 1.4) {
      this.player.takeDamage(this.damage);
      this.destroy();
      return;
    }

    // Auto despawn after 4s
    if (this.life > 4.0) {
      this.destroy();
    }
  }

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.scene.remove(this.mesh);
  }
}
