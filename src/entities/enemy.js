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
    this.attackRate = 1.0;

    this.scene.add(this.group);
  }

  setupHitbox(meshOrGroup) {
    this.mesh = meshOrGroup;
    // Tag ALL descendant meshes so raycaster can find ancestorEnemy
    if (meshOrGroup.isGroup || meshOrGroup.children) {
      meshOrGroup.traverse(child => {
        if (child.isMesh) {
          child.ancestorEnemy = this;
        }
      });
    }
    if (meshOrGroup.isMesh) {
      meshOrGroup.ancestorEnemy = this;
    }
    this.group.add(this.mesh);
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.hp -= amount;

    // Flash all child meshes white on hit
    if (this.mesh) {
      this.mesh.traverse(child => {
        if (child.isMesh && child.material) {
          const orig = child.material.color.getHex();
          child.material.color.setHex(0xffffff);
          setTimeout(() => {
            if (child.material) child.material.color.setHex(orig);
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
    const particleCount = 12;
    const pGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xcc0011 });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(this.group.position);
      p.position.y += 1.0;
      this.scene.add(p);

      const vel = new THREE.Vector3(
        (Math.random() * 2 - 1) * 5,
        Math.random() * 4 + 2,
        (Math.random() * 2 - 1) * 5
      );

      let life = 0;
      const animateP = () => {
        life += 0.03;
        p.position.addScaledVector(vel, 0.03);
        vel.y -= 9.8 * 0.03;
        if (life < 0.5) {
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
