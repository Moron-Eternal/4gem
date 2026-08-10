import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class Enemy {
  constructor(scene, position, player, maxHp = 50) {
    this.scene = scene;
    this.position = position.clone();
    this.player = player;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.isDead = false;

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.mesh = null;
    this.speed = 4.0;
    this.damage = 10;
    this.attackCooldown = 0;
    this.attackRate = 1.0; // seconds

    this.scene.add(this.group);
  }

  setupHitbox(mesh) {
    this.mesh = mesh;
    this.mesh.ancestorEnemy = this;
    this.group.add(this.mesh);
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.hp -= amount;

    // Flash hit red tint
    if (this.mesh && this.mesh.material) {
      const origColor = this.mesh.material.color.getHex();
      this.mesh.material.color.setHex(0xff0033);
      setTimeout(() => {
        if (this.mesh && this.mesh.material) this.mesh.material.color.setHex(origColor);
      }, 100);
    }

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;

    // Blood Fuel healing trigger
    if (this.player.statMultipliers.bloodFuel) {
      this.player.heal(15);
    }

    // Blood splatter particles
    this.spawnBloodParticles();
    this.scene.remove(this.group);
  }

  spawnBloodParticles() {
    const particleCount = 16;
    const pGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x990011 });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(this.group.position);
      p.position.y += 1.0;
      this.scene.add(p);

      const vel = new THREE.Vector3(
        (Math.random() * 2 - 1) * 6,
        Math.random() * 5 + 2,
        (Math.random() * 2 - 1) * 6
      );

      let life = 0;
      const animateP = () => {
        life += 0.03;
        p.position.addScaledVector(vel, 0.03);
        vel.y -= 9.8 * 0.03;
        if (life < 0.6) {
          requestAnimationFrame(animateP);
        } else {
          this.scene.remove(p);
        }
      };
      animateP();
    }
  }

  update(delta, playerPos) {
    if (this.isDead || this.player.isDead) return;

    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
  }
}
