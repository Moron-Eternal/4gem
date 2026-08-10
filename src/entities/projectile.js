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

    const geo = new THREE.SphereGeometry(0.2, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(startPos);
    this.scene.add(this.mesh);

    // Trail glow
    this.glow = new THREE.PointLight(0xff4400, 1.5, 4);
    this.mesh.add(this.glow);
  }

  update(delta) {
    if (this.isDestroyed) return;

    this.life += delta;
    this.mesh.position.addScaledVector(this.direction, this.speed * delta);

    // Collision with player - tight radius, one-shot damage
    if (!this.hasHit) {
      const distToPlayer = this.mesh.position.distanceTo(this.player.camera.position);
      if (distToPlayer < 0.9) {
        this.hasHit = true;
        this.player.takeDamage(this.damage);
        this.destroy();
        return;
      }
    }

    // Auto despawn after 3s or hitting floor
    if (this.life > 3.0 || this.mesh.position.y < -1) {
      this.destroy();
    }
  }

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.scene.remove(this.mesh);
  }
}
