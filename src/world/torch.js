import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

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
    // Sconce Wall Plate & Bracket
    const plateGeo = new THREE.BoxGeometry(0.25, 0.7, 0.45);
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2432, roughness: 0.8, metalness: 0.6 });
    const bracket = new THREE.Mesh(plateGeo, ironMat);
    bracket.position.set(0, 0, -0.2);
    this.group.add(bracket);

    // Carved Wood Torch Stick
    const stickGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.85, 8);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.9 });
    const stick = new THREE.Mesh(stickGeo, woodMat);
    stick.rotation.x = Math.PI / 5;
    stick.position.set(0, 0.1, 0.12);
    this.group.add(stick);

    // Glowing Flame Core Mesh
    const flameGeo = new THREE.ConeGeometry(0.16, 0.45, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.flame = new THREE.Mesh(flameGeo, flameMat);
    this.flame.position.set(0, 0.52, 0.32);
    this.group.add(this.flame);

    // Dynamic Warm Point Light
    this.light = new THREE.PointLight(0xff8822, 4.0, 30);
    this.light.position.set(0, 0.60, 0.38);
    this.light.castShadow = true;
    this.light.shadow.mapSize.width = 512;
    this.light.shadow.mapSize.height = 512;
    this.group.add(this.light);

    this.renderer.registerTorch(this.light, this.group.position);
  }

  update(time) {
    if (this.flame) {
      this.flame.scale.set(
        1 + Math.sin(time * 15) * 0.12,
        1 + Math.cos(time * 20) * 0.18,
        1 + Math.sin(time * 18) * 0.12
      );
    }
  }
}
