import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class Torch {
  constructor(scene, renderer, position, rotationY = 0) {
    this.scene = scene;
    this.renderer = renderer;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.y = rotationY;

    this.buildTorch();
    this.scene.add(this.group);
  }

  buildTorch() {
    // Torch Iron Bracket & Sconce
    const bracketGeo = new THREE.BoxGeometry(0.15, 0.6, 0.4);
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2430, roughness: 0.8, metalness: 0.5 });
    const bracket = new THREE.Mesh(bracketGeo, ironMat);
    bracket.position.set(0, 0, -0.2);
    this.group.add(bracket);

    // Wood Torch Stick
    const stickGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.8, 6);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2417, roughness: 0.9 });
    const stick = new THREE.Mesh(stickGeo, woodMat);
    stick.rotation.x = Math.PI / 6;
    stick.position.set(0, 0.1, 0.1);
    this.group.add(stick);

    // Flame Core Mesh
    const flameGeo = new THREE.ConeGeometry(0.12, 0.35, 5);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: false });
    this.flame = new THREE.Mesh(flameGeo, flameMat);
    this.flame.position.set(0, 0.45, 0.3);
    this.group.add(this.flame);

    // Dynamic Warm Point Light
    this.light = new THREE.PointLight(0xff8822, 1.8, 14);
    this.light.position.set(0, 0.55, 0.35);
    this.light.castShadow = true;
    this.light.shadow.mapSize.width = 512;
    this.light.shadow.mapSize.height = 512;
    this.group.add(this.light);

    // Register light with renderer for flickering
    this.renderer.registerTorch(this.light, this.group.position);
  }

  update(time) {
    if (this.flame) {
      this.flame.scale.set(
        1 + Math.sin(time * 15) * 0.1,
        1 + Math.cos(time * 20) * 0.15,
        1 + Math.sin(time * 18) * 0.1
      );
    }
  }
}
