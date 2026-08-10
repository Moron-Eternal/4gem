import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { Enemy } from '../enemy.js';

export class Husk extends Enemy {
  constructor(scene, position, player) {
    super(scene, position, player, 45); // 45 HP

    this.speed = 7.0; // Fast melee sprinter
    this.damage = 12;

    this.buildCharacterMesh();
  }

  buildCharacterMesh() {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0x882020, roughness: 0.7, metalness: 0.2 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a0808, roughness: 0.9 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.4);
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.position.y = 1.1;
    group.add(torso);

    // Head with glowing visor eyes
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.75, 0.1);
    group.add(head);

    const eyesGeo = new THREE.BoxGeometry(0.3, 0.08, 0.05);
    const eyes = new THREE.Mesh(eyesGeo, eyeMat);
    eyes.position.set(0, 1.78, 0.31);
    group.add(eyes);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    const leftLeg = new THREE.Mesh(legGeo, darkMat);
    leftLeg.position.set(-0.2, 0.38, 0);
    const rightLeg = new THREE.Mesh(legGeo, darkMat);
    rightLeg.position.set(0.2, 0.38, 0);
    group.add(leftLeg, rightLeg);

    // Claws / Arms
    const armGeo = new THREE.BoxGeometry(0.18, 0.8, 0.18);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.48, 1.1, 0.2);
    leftArm.rotation.x = -Math.PI / 4;
    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.48, 1.1, 0.2);
    rightArm.rotation.x = -Math.PI / 4;
    group.add(leftArm, rightArm);

    this.setupHitbox(group);
  }

  update(delta, playerPos) {
    super.update(delta, playerPos);
    if (this.isDead || this.player.isDead) return;

    const dir = new THREE.Vector3().subVectors(playerPos, this.group.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist > 1.4) {
      dir.normalize();
      this.group.position.addScaledVector(dir, this.speed * delta);
      this.group.lookAt(playerPos.x, this.group.position.y, playerPos.z);
    } else {
      if (this.attackCooldown <= 0) {
        this.player.takeDamage(this.damage);
        this.attackCooldown = 1.0;
      }
    }
  }
}
