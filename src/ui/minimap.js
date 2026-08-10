export class Minimap {
  constructor(canvasId, dungeon) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.dungeon = dungeon;
  }

  render(playerPos, currentRoom, playerYaw = 0) {
    if (!this.canvas || !this.ctx || !this.dungeon) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Clear canvas
    this.ctx.fillStyle = '#05060a';
    this.ctx.fillRect(0, 0, w, h);

    const roomSizeWorld = 24;
    const pGridX = currentRoom ? currentRoom.gridX : Math.round(playerPos.x / roomSizeWorld);
    const pGridZ = currentRoom ? currentRoom.gridZ : Math.round(playerPos.z / roomSizeWorld);

    const cardSize = 34; // Room box pixel dimension
    const gap = 14;      // Hallway corridor gap
    const step = cardSize + gap;

    // Draw Grid Rooms relative to Player Center
    this.dungeon.roomsList.forEach(room => {
      const dx = room.gridX - pGridX;
      const dz = room.gridZ - pGridZ;

      const px = cx + dx * step - cardSize / 2;
      const py = cy + dz * step - cardSize / 2;

      // Skip rooms rendered outside canvas view bounds
      if (px < -cardSize || px > w + cardSize || py < -cardSize || py > h + cardSize) return;

      const isCurrent = (currentRoom === room);
      const isVisited = room.visited;

      // Check if adjacent to visited room
      let isAdjacentToVisited = false;
      const neighbors = [[room.gridX, room.gridZ - 1], [room.gridX, room.gridZ + 1], [room.gridX - 1, room.gridZ], [room.gridX + 1, room.gridZ]];
      neighbors.forEach(([nx, nz]) => {
        const nr = this.dungeon.getRoomAtWorldPos({ x: nx * 24, z: nz * 24 });
        if (nr && nr.visited) isAdjacentToVisited = true;
      });

      if (!isVisited && !isAdjacentToVisited) return; // Hidden in fog of war

      // Draw Door Hallway Connectors
      this.ctx.strokeStyle = '#2c3a58';
      this.ctx.lineWidth = 4;
      if (room.doors.N) {
        this.ctx.beginPath(); this.ctx.moveTo(px + cardSize / 2, py); this.ctx.lineTo(px + cardSize / 2, py - gap); this.ctx.stroke();
      }
      if (room.doors.S) {
        this.ctx.beginPath(); this.ctx.moveTo(px + cardSize / 2, py + cardSize); this.ctx.lineTo(px + cardSize / 2, py + cardSize + gap); this.ctx.stroke();
      }
      if (room.doors.E) {
        this.ctx.beginPath(); this.ctx.moveTo(px + cardSize, py + cardSize / 2); this.ctx.lineTo(px + cardSize + gap, py + cardSize / 2); this.ctx.stroke();
      }
      if (room.doors.W) {
        this.ctx.beginPath(); this.ctx.moveTo(px, py + cardSize / 2); this.ctx.lineTo(px - gap, py + cardSize / 2); this.ctx.stroke();
      }

      // Fill style
      if (isCurrent) {
        this.ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
      } else if (room.cleared) {
        this.ctx.fillStyle = '#141c2e';
      } else {
        this.ctx.fillStyle = '#1c0f18';
      }

      this.ctx.fillRect(px, py, cardSize, cardSize);

      // Border style
      if (isCurrent) {
        this.ctx.strokeStyle = '#00f0ff';
        this.ctx.lineWidth = 2;
      } else if (!room.cleared && isVisited) {
        this.ctx.strokeStyle = '#ff2a4b';
        this.ctx.lineWidth = 2;
      } else {
        this.ctx.strokeStyle = isVisited ? '#3a4b70' : '#222d44';
        this.ctx.lineWidth = 1;
      }
      this.ctx.strokeRect(px, py, cardSize, cardSize);

      // Icons
      this.ctx.font = 'bold 12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      if (room.type === 'start') {
        this.ctx.fillStyle = '#00f0ff';
        this.ctx.fillText('S', px + cardSize / 2, py + cardSize / 2);
      } else if (room.type === 'item' && (isVisited || isAdjacentToVisited)) {
        this.ctx.fillStyle = '#ffb700';
        this.ctx.fillText('★', px + cardSize / 2, py + cardSize / 2);
      } else if (room.type === 'boss' && (isVisited || isAdjacentToVisited)) {
        this.ctx.fillStyle = '#ff2a4b';
        this.ctx.fillText('💀', px + cardSize / 2, py + cardSize / 2);
      }
    });

    // Draw Player Location Marker & Rotating Look Direction Arrow
    this.ctx.save();
    this.ctx.translate(cx, cy);

    // Cyan Player Circle
    this.ctx.fillStyle = '#00f0ff';
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.shadowBlur = 8;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
    this.ctx.fill();

    // Direction Triangle Arrow
    this.ctx.rotate(-playerYaw);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -9);
    this.ctx.lineTo(-4, 2);
    this.ctx.lineTo(4, 2);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }
}
