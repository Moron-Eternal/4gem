import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { Enemy } from '../enemy.js';
import { EnemyProjectile } from '../projectile.js';
import { sound } from '../../engine/audio.js';

export class MaliciousTitanBoss extends Enemy {
  constructor(scene, position, player, projectilesList) {
    super(scene, position, player, 850);
    this.projectilesList = projectilesList;
    this.speed = 4.0;
    this.damage = 22;
    this.attackPhase = 1;
    this.actionTimer = 0;
    this.buildBossMesh();
    sound.playBossRoar();
  }

  buildBossMesh() {
    const group = new THREE.Group();

    this.bodyMat = new THREE.MeshBasicMaterial({ color: 0x440a14 });
    const steelMat = new THREE.MeshBasicMaterial({ color: 0x1a2030 });
    this.crownMat = new THREE.MeshBasicMaterial({ color: 0xff0044, wireframe: true });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

    // Massive torso
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.5, 5.0, 2.4), this.bodyMat);
    body.position.y = 3.0;
    group.add(body);

    // Legs
    const legGeo = new THREE.BoxGeometry(1.2, 2.5, 1.2);
    const leftLeg = new THREE.Mesh(legGeo, steelMat);
    leftLeg.position.set(-1.2, 1.25, 0);
    const rightLeg = new THREE.Mesh(legGeo, steelMat);
    rightLeg.position.set(1.2, 1.25, 0);
    group.add(leftLeg, rightLeg);

    // Shoulder cannons
    const turretGeo = new THREE.BoxGeometry(1.0, 1.0, 2.0);
    const leftTurret = new THREE.Mesh(turretGeo, steelMat);
    leftTurret.position.set(-2.4, 5.0, 0);
    const rightTurret = new THREE.Mesh(turretGeo, steelMat);
    rightTurret.position.set(2.4, 5.0, 0);
    group.add(leftTurret, rightTurret);

    // Glowing chest core
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), coreMat);
    core.position.set(0, 3.5, 1.3);
    group.add(core);

    // Crown
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), this.crownMat);
    crown.position.y = 6.5;
    group.add(crown);

    // Light
    this.bossLight = new THREE.PointLight(0xff0044, 5.0, 20);
    this.bossLight.position.set(0, 4.0, 1.4);
    group.add(this.bossLight);

    this.setupHitbox(group);
  }

  takeDamage(amount) {
    super.takeDamage(amount);
    if (this.hp <= 425 && this.attackPhase === 1) {
      this.attackPhase = 2;
      this.speed = 6.0;
      this.bodyMat.color.setHex(0x700018);
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

    this.actionTimer += delta;
    const attackInterval = this.attackPhase === 1 ? 2.5 : 1.6;

    if (this.actionTimer >= attackInterval) {
      this.actionTimer = 0;
      const spawnPos = this.group.position.clone();
      spawnPos.y += 4.5;
      const baseDir = new THREE.Vector3().subVectors(playerPos, spawnPos).normalize();

      if (Math.random() > 0.35) {
        [-0.3, -0.15, 0, 0.15, 0.3].forEach(ang => {
          const spreadDir = baseDir.clone();
          spreadDir.x += ang;
          spreadDir.normalize();
          const proj = new EnemyProjectile(this.scene, spawnPos.clone(), spreadDir, this.damage, this.player, 18.0);
          this.projectilesList.push(proj);
        });
      } else {
        if (dist < 12.0) {
          this.player.takeDamage(28);
          this.player.shakeCamera(0.5);
          sound.playDoorSlam();
        }
      }
    }
  }
}
