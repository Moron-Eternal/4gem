import * as THREE from '../vendor/three.module.js';

export class Torch {
  constructor(parentGroup, renderer, position, rotationY = 0) {
    this.parentGroup = parentGroup;
    this.renderer = renderer;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.y = rotationY;

    this.buildTorch();
    this.parentGroup.add(this.group);
  }

  buildTorch() {
    // Sconce Wall Bracket
    const plateGeo = new THREE.BoxGeometry(0.25, 0.6, 0.4);
    const ironMat = new THREE.MeshBasicMaterial({ color: 0x2a3040 });
    const bracket = new THREE.Mesh(plateGeo, ironMat);
    bracket.position.set(0, 0, -0.15);
    this.group.add(bracket);

    // Wood Torch Stick
    const stickGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.8, 6);
    const woodMat = new THREE.MeshBasicMaterial({ color: 0x5a3820 });
    const stick = new THREE.Mesh(stickGeo, woodMat);
    stick.rotation.x = Math.PI / 5;
    stick.position.set(0, 0.1, 0.12);
    this.group.add(stick);

    // Flame - bright orange cone
    const flameGeo = new THREE.ConeGeometry(0.14, 0.40, 5);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.flame = new THREE.Mesh(flameGeo, flameMat);
    this.flame.position.set(0, 0.50, 0.30);
    this.group.add(this.flame);

    // Inner flame core
    const innerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.25, 4),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    innerFlame.position.set(0, 0.48, 0.30);
    this.group.add(innerFlame);

    // VERY bright warm point light to actually illuminate the room
    this.light = new THREE.PointLight(0xffaa44, 6.0, 35);
    this.light.position.set(0, 0.55, 0.35);
    this.light.castShadow = false; // Disable shadow for performance
    this.group.add(this.light);

    this.renderer.registerTorch(this.light);
  }

  update(time) {
    if (this.flame) {
      this.flame.scale.set(
        1 + Math.sin(time * 15) * 0.15,
        1 + Math.cos(time * 20) * 0.2,
        1 + Math.sin(time * 18) * 0.15
      );
    }
  }
}
