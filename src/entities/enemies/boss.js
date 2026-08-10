import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { Enemy } from '../enemy.js';
import { EnemyProjectile } from '../projectile.js';
import { sound } from '../../engine/audio.js';

export class MaliciousTitanBoss extends Enemy {
  constructor(scene, position, player, projectilesList) {
    super(scene, position, player, 800); // 800 HP Boss
    this.projectilesList = projectilesList;

    this.speed = 4.5;
    this.damage = 25;
    this.attackPhase = 1;
    this.actionTimer = 0;

    this.buildBossMesh();
    sound.playBossRoar();
  }

  buildBossMesh() {
    // Massive Colossus Geometry
    const bodyGeo = new THREE.BoxGeometry(3.5, 6.0, 2.5);
    this.bossMat = new THREE.MeshStandardMaterial({ color: 0x1f0a0e, roughness: 0.5, metalness: 0.8 });
    const mesh = new THREE.Mesh(bodyGeo, this.bossMat);
    mesh.position.y = 3.0;
    mesh.castShadow = true;
    this.setupHitbox(mesh);

    // Glowing Core & Crown
    const crownGeo = new THREE.OctahedronGeometry(1.2, 0);
    this.crownMat = new THREE.MeshBasicMaterial({ color: 0xff0044, wireframe: true });
    const crown = new THREE.Mesh(crownGeo, this.crownMat);
    crown.position.y = 6.8;
    this.group.add(crown);

    this.bossLight = new THREE.PointLight(0xff0044, 4.0, 15);
    this.bossLight.position.y = 5.0;
    this.group.add(this.bossLight);
  }

  takeDamage(amount) {
    super.takeDamage(amount);

    // Enrage phase transition at 50% HP
    if (this.hp <= 400 && this.attackPhase === 1) {
      this.attackPhase = 2;
      this.speed = 6.5;
      this.bossMat.color.setHex(0x5a0010);
      this.crownMat.color.setHex(0xffaa00);
      this.bossLight.color.setHex(0xffaa00);
      sound.playBossRoar();
    }
  }

  update(delta, playerPos) {
    super.update(delta, playerPos);
    if (this.isDead || this.player.isDead) return;

    this.group.lookAt(playerPos.x, this.group.position.y, playerPos.z);

    const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist > 5.0) {
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * delta);
    }

    // Boss Attack Routines
    this.actionTimer += delta;

    if (this.actionTimer >= (this.attackPhase === 1 ? 2.5 : 1.6)) {
      this.actionTimer = 0;

      const spawnPos = this.group.position.clone().add(new THREE.Vector3(0, 4.5, 0));
      const baseDir = new THREE.Vector3().subVectors(playerPos, spawnPos).normalize();

      if (Math.random() > 0.4) {
        // Fireball Volley (5-way spread)
        const angles = [-0.3, -0.15, 0, 0.15, 0.3];
        angles.forEach(ang => {
          const spreadDir = baseDir.clone();
          spreadDir.x += ang;
          spreadDir.normalize();
          const proj = new EnemyProjectile(this.scene, spawnPos, spreadDir, this.damage, this.player, 22.0);
          this.projectilesList.push(proj);
        });
      } else {
        // Ground Shockwave
        if (dist < 12.0) {
          this.player.takeDamage(30);
          this.player.shakeCamera(0.6);
          sound.playDoorSlam();
        }
      }
    }
  }
}
