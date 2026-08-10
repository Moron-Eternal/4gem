import { Room } from './room.js';

export class DungeonGenerator {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.gridSizeX = Math.floor(Math.random() * 11) + 10; // 10 to 20
    this.gridSizeZ = Math.floor(Math.random() * 11) + 10; // 10 to 20
    this.gridSizeY = 1; // 2D grid plane for roguelike rooms

    this.roomsMap = new Map(); // Key: "x,y,z" => Room object
    this.roomsList = [];

    this.startRoom = null;
    this.bossRoom = null;
    this.itemRooms = [];

    this.generateDungeon();
  }

  getKey(x, y, z) {
    return `${x},${y},${z}`;
  }

  generateDungeon() {
    const targetRoomCount = Math.floor(Math.random() * 6) + 10; // 10 to 15 connected rooms
    const startX = Math.floor(this.gridSizeX / 2);
    const startZ = Math.floor(this.gridSizeZ / 2);

    const occupiedCoords = new Set();
    const queue = [[startX, 0, startZ]];
    occupiedCoords.add(this.getKey(startX, 0, startZ));

    const coordsList = [[startX, 0, startZ]];
    const dirs = [
      { x: 0, z: -1, name: 'N' },
      { x: 0, z: 1, name: 'S' },
      { x: 1, z: 0, name: 'E' },
      { x: -1, z: 0, name: 'W' }
    ];

    while (queue.length > 0 && coordsList.length < targetRoomCount) {
      const [currX, currY, currZ] = queue.shift();

      // Shuffle directions
      const shuffledDirs = [...dirs].sort(() => Math.random() - 0.5);

      for (const d of shuffledDirs) {
        const nx = currX + d.x;
        const nz = currZ + d.z;
        const key = this.getKey(nx, currY, nz);

        if (nx >= 0 && nx < this.gridSizeX && nz >= 0 && nz < this.gridSizeZ && !occupiedCoords.has(key)) {
          // Check neighbor limit to keep room tree clean like Isaac
          let neighborCount = 0;
          for (const checkD of dirs) {
            if (occupiedCoords.has(this.getKey(nx + checkD.x, currY, nz + checkD.z))) {
              neighborCount++;
            }
          }

          if (neighborCount <= 2 || Math.random() < 0.25) {
            occupiedCoords.add(key);
            coordsList.push([nx, currY, nz]);
            queue.push([nx, currY, nz]);

            if (coordsList.length >= targetRoomCount) break;
          }
        }
      }
    }

    // Determine Room Types based on distance from start
    let maxDist = -1;
    let furthestCoord = coordsList[0];

    coordsList.forEach(([x, y, z]) => {
      const dist = Math.abs(x - startX) + Math.abs(z - startZ);
      if (dist > maxDist) {
        maxDist = dist;
        furthestCoord = [x, y, z];
      }
    });

    // Pick 1-2 Item rooms (dead ends preferred)
    const deadEnds = coordsList.filter(([x, y, z]) => {
      if (x === startX && z === startZ) return false;
      if (x === furthestCoord[0] && z === furthestCoord[2]) return false;
      let count = 0;
      for (const d of dirs) {
        if (occupiedCoords.has(this.getKey(x + d.x, y, z + d.z))) count++;
      }
      return count === 1;
    });

    const itemCoords = deadEnds.slice(0, 2);

    // Build Room Objects
    coordsList.forEach(([x, y, z]) => {
      const key = this.getKey(x, y, z);
      let type = 'combat';

      if (x === startX && z === startZ) {
        type = 'start';
      } else if (x === furthestCoord[0] && z === furthestCoord[2]) {
        type = 'boss';
      } else if (itemCoords.some(c => c[0] === x && c[2] === z)) {
        type = 'item';
      }

      const room = new Room(this.scene, this.renderer, x, y, z, type);

      // Determine door connections
      const connections = {
        N: occupiedCoords.has(this.getKey(x, y, z - 1)),
        S: occupiedCoords.has(this.getKey(x, y, z + 1)),
        E: occupiedCoords.has(this.getKey(x + 1, y, z)),
        W: occupiedCoords.has(this.getKey(x - 1, y, z))
      };

      room.buildRoom(connections);

      if (type === 'start') {
        this.startRoom = room;
        room.visited = true;
      } else if (type === 'boss') {
        this.bossRoom = room;
      } else if (type === 'item') {
        this.itemRooms.push(room);
      }

      this.roomsMap.set(key, room);
      this.roomsList.push(room);
    });
  }

  getRoomAtWorldPos(pos) {
    const roomSize = 24;
    const gridX = Math.round(pos.x / roomSize);
    const gridZ = Math.round(pos.z / roomSize);
    const key = this.getKey(gridX, 0, gridZ);
    return this.roomsMap.get(key) || null;
  }
}
