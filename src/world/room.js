import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { Torch } from './torch.js';

export class Room {
  constructor(scene, renderer, gridX, gridY, gridZ, type = 'combat') {
    this.scene = scene;
    this.renderer = renderer;

    this.gridX = gridX;
    this.gridY = gridY;
    this.gridZ = gridZ;
    this.type = type;
    this.cleared = (type === 'start' || type === 'item');
    this.visited = false;

    this.roomSize = 24;
    this.wallHeight = 7.5;
    this.worldPos = new THREE.Vector3(gridX * this.roomSize, gridY * 8, gridZ * this.roomSize);

    this.group = new THREE.Group();
    this.group.position.copy(this.worldPos);

    this.doors = { N: false, S: false, E: false, W: false };
    this.gateMeshes = {};
    this.torches = [];
  }

  buildRoom(connections) {
    this.doors = connections;

    const half = this.roomSize / 2;
    const h = this.wallHeight;
    const tex = this.renderer.textures;

    // Clone textures per room to avoid shared UV mutations
    const floorTex = this.renderer.getClonedTexture(tex.metalFloor, 6, 6);
    const wallTex = this.renderer.getClonedTexture(tex.stoneWall, 6, 3);
    const gateTex = this.renderer.getClonedTexture(tex.gateMetal, 1, 1);

    // Materials - using MeshLambertMaterial for good visibility with lights
    const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
    const ceilingMat = new THREE.MeshLambertMaterial({ map: wallTex });

    // Floor
    const floorGeo = new THREE.PlaneGeometry(this.roomSize, this.roomSize);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(this.roomSize, this.roomSize), ceilingMat);
    ceiling.position.y = h;
    ceiling.rotation.x = Math.PI / 2;
    this.group.add(ceiling);

    // Room center light for additional brightness
    const roomLight = new THREE.PointLight(0xffeedd, 3.0, 20);
    roomLight.position.set(0, h - 0.5, 0);
    this.group.add(roomLight);

    const createWallSegment = (dir, isDoor) => {
      const wallGroup = new THREE.Group();

      if (!isDoor) {
        // Solid Wall
        const geo = new THREE.BoxGeometry(this.roomSize, h, 0.6);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.y = h / 2;
        mesh.receiveShadow = true;
        wallGroup.add(mesh);

        // Center Wall Torch
        const torch = new Torch(wallGroup, this.renderer, new THREE.Vector3(0, 2.8, 0.45), 0);
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

        const topGeo = new THREE.BoxGeometry(6, h - 4.8, 0.6);
        const topMesh = new THREE.Mesh(topGeo, wallMat);
        topMesh.position.set(0, h - (h - 4.8) / 2, 0);
        wallGroup.add(topMesh);

        // Lockable Gate
        const gateGeo = new THREE.BoxGeometry(5.8, 4.8, 0.25);
        const gMat = new THREE.MeshBasicMaterial({ map: gateTex });
        const gate = new THREE.Mesh(gateGeo, gMat);
        gate.position.set(0, 2.4, 0);
        gate.visible = !this.cleared;
        wallGroup.add(gate);
        this.gateMeshes[dir] = gate;

        // Torches flanking doorway
        const torch1 = new Torch(wallGroup, this.renderer, new THREE.Vector3(-3.5, 2.8, 0.45), 0);
        const torch2 = new Torch(wallGroup, this.renderer, new THREE.Vector3(3.5, 2.8, 0.45), 0);
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

    // Decorative Pillars
    if (this.type === 'boss' || this.type === 'combat') {
      const pillarGeo = new THREE.BoxGeometry(1.6, h, 1.6);
      const pillarMat = new THREE.MeshLambertMaterial({ map: wallTex });
      const offsets = [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]];
      offsets.forEach(([px, pz]) => {
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(px, h / 2, pz);
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
