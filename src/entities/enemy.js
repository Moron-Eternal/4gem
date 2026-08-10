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

    this.scene.add(this.group);
  }

  setupHitbox(meshOrGroup) {
    this.mesh = meshOrGroup;
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.ancestorEnemy = this;
      }
    });
    this.group.add(this.mesh);
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.hp -= amount;

    // Flash hit white/red tint on all child meshes
    if (this.mesh) {
      this.mesh.traverse(child => {
        if (child.isMesh && child.material) {
          const origColor = child.material.color.getHex();
          child.material.color.setHex(0xffffff);
          setTimeout(() => {
            if (child.material) child.material.color.setHex(origColor);
          }, 80);
        }
      });
    }

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;

    if (this.player.statMultipliers.bloodFuel) {
      this.player.heal(15);
    }

    this.spawnBloodParticles();
    this.scene.remove(this.group);
  }

  spawnBloodParticles() {
    const particleCount = 10;
    const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xcc0011 });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(this.group.position);
      p.position.y += 1.0;
      this.scene.add(p);

      const vel = new THREE.Vector3(
        (Math.random() * 2 - 1) * 4,
        Math.random() * 3 + 2,
        (Math.random() * 2 - 1) * 4
      );

      let life = 0;
      const animateP = () => {
        life += 0.04;
        p.position.addScaledVector(vel, 0.04);
        vel.y -= 9.8 * 0.04;
        if (life < 0.4) {
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
