import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { Torch } from './torch.js';

export class Room {
  constructor(scene, renderer, gridX, gridY, gridZ, type = 'combat') {
    this.scene = scene;
    this.renderer = renderer;

    this.gridX = gridX;
    this.gridY = gridY;
    this.gridZ = gridZ;
    this.type = type; // 'start', 'combat', 'item', 'boss'
    this.cleared = (type === 'start' || type === 'item');
    this.visited = false;

    // Room World Dimensions
    this.roomSize = 24;
    this.wallHeight = 7;
    this.worldPos = new THREE.Vector3(gridX * this.roomSize, gridY * 8, gridZ * this.roomSize);

    this.group = new THREE.Group();
    this.group.position.copy(this.worldPos);

    this.doors = { N: false, S: false, E: false, W: false };
    this.gateMeshes = {};
    this.torches = [];
    this.wallColliders = [];
    this.doorColliders = [];

    this.enemies = [];
    this.items = [];
  }

  buildRoom(connections) {
    this.doors = connections; // { N: boolean, S: boolean, E: boolean, W: boolean }

    const half = this.roomSize / 2;
    const h = this.wallHeight;
    const tex = this.renderer.textures;

    // Floor Mesh
    const floorGeo = new THREE.PlaneGeometry(this.roomSize, this.roomSize);
    tex.metalFloor.repeat.set(6, 6);
    const floorMat = new THREE.MeshStandardMaterial({ map: tex.metalFloor, roughness: 0.8, metalness: 0.4 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Ceiling Mesh
    const ceilingMat = new THREE.MeshStandardMaterial({ map: tex.stoneWall, roughness: 0.9 });
    const ceiling = new THREE.Mesh(floorGeo, ceilingMat);
    ceiling.position.y = h;
    ceiling.rotation.x = Math.PI / 2;
    this.group.add(ceiling);

    // Build 4 Walls with optional door openings
    tex.stoneWall.repeat.set(4, 2);
    const wallMat = new THREE.MeshStandardMaterial({ map: tex.stoneWall, roughness: 0.85 });

    const createWallSegment = (dir, isDoor) => {
      const wallGroup = new THREE.Group();
      if (!isDoor) {
        // Solid Wall
        const geo = new THREE.BoxGeometry(this.roomSize, h, 0.6);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.y = h / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        wallGroup.add(mesh);

        // Add Wall Torch
        const torchPos = new THREE.Vector3(0, 2.5, 0.4);
        const torch = new Torch(wallGroup, this.renderer, torchPos, 0);
        this.torches.push(torch);
      } else {
        // Wall with Door Archway
        const sideW = (this.roomSize - 6) / 2;
        const leftGeo = new THREE.BoxGeometry(sideW, h, 0.6);
        const leftMesh = new THREE.Mesh(leftGeo, wallMat);
        leftMesh.position.set(-sideW / 2 - 3, h / 2, 0);
        wallGroup.add(leftMesh);

        const rightMesh = new THREE.Mesh(leftGeo, wallMat);
        rightMesh.position.set(sideW / 2 + 3, h / 2, 0);
        wallGroup.add(rightMesh);

        const topGeo = new THREE.BoxGeometry(6, h - 4.5, 0.6);
        const topMesh = new THREE.Mesh(topGeo, wallMat);
        topMesh.position.set(0, h - (h - 4.5) / 2, 0);
        wallGroup.add(topMesh);

        // Lockable Metal Gate Mesh
        const gateGeo = new THREE.BoxGeometry(5.8, 4.5, 0.2);
        const gateMat = new THREE.MeshStandardMaterial({ map: tex.gateMetal, roughness: 0.5, metalness: 0.8 });
        const gate = new THREE.Mesh(gateGeo, gateMat);
        gate.position.set(0, 2.25, 0);
        gate.visible = !this.cleared; // Hidden if cleared
        wallGroup.add(gate);
        this.gateMeshes[dir] = gate;

        // Torches on sides of doorway
        const torch1 = new Torch(wallGroup, this.renderer, new THREE.Vector3(-3.4, 2.5, 0.4), 0);
        const torch2 = new Torch(wallGroup, this.renderer, new THREE.Vector3(3.4, 2.5, 0.4), 0);
        this.torches.push(torch1, torch2);
      }

      return wallGroup;
    };

    // North Wall
    const nWall = createWallSegment('N', this.doors.N);
    nWall.position.set(0, 0, -half);
    this.group.add(nWall);

    // South Wall
    const sWall = createWallSegment('S', this.doors.S);
    sWall.position.set(0, 0, half);
    sWall.rotation.y = Math.PI;
    this.group.add(sWall);

    // East Wall
    const eWall = createWallSegment('E', this.doors.E);
    eWall.position.set(half, 0, 0);
    eWall.rotation.y = -Math.PI / 2;
    this.group.add(eWall);

    // West Wall
    const wWall = createWallSegment('W', this.doors.W);
    wWall.position.set(-half, 0, 0);
    wWall.rotation.y = Math.PI / 2;
    this.group.add(wWall);

    // Add Central Decorative Pillars for larger room feel
    if (this.type === 'boss' || this.type === 'combat') {
      const pillarGeo = new THREE.BoxGeometry(1.6, h, 1.6);
      const pillarMat = new THREE.MeshStandardMaterial({ map: tex.stoneWall, roughness: 0.8 });
      const offsets = [[-5, -5], [5, -5], [-5, 5], [5, 5]];
      offsets.forEach(([px, pz]) => {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(px, h / 2, pz);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        this.group.add(pillar);
      });
    }

    this.scene.add(this.group);
  }

  setGatesLocked(locked) {
    Object.values(this.gateMeshes).forEach(gate => {
      if (gate) gate.visible = locked;
    });
  }

  update(time) {
    this.torches.forEach(t => t.update(time));
  }
}
