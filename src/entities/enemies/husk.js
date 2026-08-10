import * as THREE from '../../vendor/three.module.js';
import { Enemy } from '../enemy.js';

export class Husk extends Enemy {
  constructor(scene, position, player) {
    super(scene, position, player, 45);
    this.speed = 7.0;
    this.damage = 12;
    this.buildCharacterMesh();
  }

  buildCharacterMesh() {
    const group = new THREE.Group();

    // Use MeshBasicMaterial so enemies are ALWAYS visible regardless of lighting
    const skinMat = new THREE.MeshBasicMaterial({ color: 0x882020 });
    const darkMat = new THREE.MeshBasicMaterial({ color: 0x3a1010 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), skinMat);
    torso.position.y = 1.1;
    group.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.4), skinMat);
    head.position.set(0, 1.75, 0);
    group.add(head);

    // Glowing visor eyes
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.05), eyeMat);
    eyes.position.set(0, 1.78, 0.23);
    group.add(eyes);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.65, 0.22);
    const leftLeg = new THREE.Mesh(legGeo, darkMat);
    leftLeg.position.set(-0.2, 0.33, 0);
    const rightLeg = new THREE.Mesh(legGeo, darkMat);
    rightLeg.position.set(0.2, 0.33, 0);
    group.add(leftLeg, rightLeg);

    // Claws
    const armGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.52, 1.0, 0.15);
    leftArm.rotation.x = -0.6;
    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.52, 1.0, 0.15);
    rightArm.rotation.x = -0.6;
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
        this.attackCooldown = 1.2;
      }
    }
  }
}
