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

    // Store original colors per material to prevent the white-flash bug
    this._originalColors = new Map();

    this.scene.add(this.group);
  }

  setupHitbox(meshOrGroup) {
    this.mesh = meshOrGroup;
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.ancestorEnemy = this;
        // Store original color per material instance
        if (child.material && !this._originalColors.has(child.material)) {
          this._originalColors.set(child.material, child.material.color.getHex());
        }
      }
    });
    this.group.add(this.mesh);
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.hp -= amount;

    // Flash white using stored original colors (prevents permanent white bug)
    if (this.mesh) {
      const materialsFlashed = new Set();
      this.mesh.traverse(child => {
        if (child.isMesh && child.material && !materialsFlashed.has(child.material)) {
          materialsFlashed.add(child.material);
          child.material.color.setHex(0xffffff);
        }
      });

      // Restore from stored originals after delay
      setTimeout(() => {
        materialsFlashed.forEach(mat => {
          const orig = this._originalColors.get(mat);
          if (orig !== undefined) {
            mat.color.setHex(orig);
          }
        });
      }, 80);
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

    this.scene.remove(this.group);
  }

  update(delta, playerPos) {
    if (this.isDead || this.player.isDead) return;
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
  }
}
