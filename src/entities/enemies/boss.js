import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { Enemy } from '../enemy.js';
import { EnemyProjectile } from '../projectile.js';
import { sound } from '../../engine/audio.js';

export class MaliciousTitanBoss extends Enemy {
  constructor(scene, position, player, projectilesList) {
    super(scene, position, player, 850); // 850 HP Boss
    this.projectilesList = projectilesList;

    this.speed = 4.5;
    this.damage = 25;
    this.attackPhase = 1;
    this.actionTimer = 0;

    this.buildBossMesh();
    sound.playBossRoar();
  }

  buildBossMesh() {
    const group = new THREE.Group();

    this.bossMat = new THREE.MeshStandardMaterial({ color: 0x330a14, roughness: 0.4, metalness: 0.85 });
    this.steelMat = new THREE.MeshStandardMaterial({ color: 0x141a28, roughness: 0.6, metalness: 0.9 });
    this.crownMat = new THREE.MeshBasicMaterial({ color: 0xff0044, wireframe: true });

    // Massive Colossus Torso
    const bodyGeo = new THREE.BoxGeometry(3.6, 5.5, 2.6);
    const body = new THREE.Mesh(bodyGeo, this.bossMat);
    body.position.y = 3.2;
    group.add(body);

    // Heavy Plated Legs
    const legGeo = new THREE.BoxGeometry(1.2, 2.5, 1.2);
    const leftLeg = new THREE.Mesh(legGeo, this.steelMat);
    leftLeg.position.set(-1.2, 1.25, 0);
    const rightLeg = new THREE.Mesh(legGeo, this.steelMat);
    rightLeg.position.set(1.2, 1.25, 0);
    group.add(leftLeg, rightLeg);

    // Shoulder Cannon Turrets
    const turretGeo = new THREE.BoxGeometry(1.0, 1.0, 2.0);
    const leftTurret = new THREE.Mesh(turretGeo, this.steelMat);
    leftTurret.position.set(-2.4, 5.2, 0);
    const rightTurret = new THREE.Mesh(turretGeo, this.steelMat);
    rightTurret.position.set(2.4, 5.2, 0);
    group.add(leftTurret, rightTurret);

    // Glowing Chest Core & Crown
    const crownGeo = new THREE.OctahedronGeometry(1.4, 0);
    const crown = new THREE.Mesh(crownGeo, this.crownMat);
    crown.position.y = 7.0;
    group.add(crown);

    this.bossLight = new THREE.PointLight(0xff0044, 4.5, 18);
    this.bossLight.position.set(0, 4.0, 1.4);
    group.add(this.bossLight);

    this.setupHitbox(group);
  }

  takeDamage(amount) {
    super.takeDamage(amount);

    if (this.hp <= 425 && this.attackPhase === 1) {
      this.attackPhase = 2;
      this.speed = 6.8;
      this.bossMat.color.setHex(0x700018);
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

    if (this.actionTimer >= (this.attackPhase === 1 ? 2.4 : 1.5)) {
      this.actionTimer = 0;

      const spawnPos = this.group.position.clone().add(new THREE.Vector3(0, 4.5, 0));
      const baseDir = new THREE.Vector3().subVectors(playerPos, spawnPos).normalize();

      if (Math.random() > 0.35) {
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
        if (dist < 14.0) {
          this.player.takeDamage(30);
          this.player.shakeCamera(0.6);
          sound.playDoorSlam();
        }
      }
    }
  }
}
