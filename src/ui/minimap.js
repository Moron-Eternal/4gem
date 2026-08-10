export class Minimap {
  constructor(canvasId, dungeon) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.dungeon = dungeon;
  }

  render(playerPos, currentRoom) {
    if (!this.canvas || !this.ctx || !this.dungeon) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear background
    this.ctx.fillStyle = '#050609';
    this.ctx.fillRect(0, 0, w, h);

    const gx = this.dungeon.gridSizeX;
    const gz = this.dungeon.gridSizeZ;
    const cellSize = Math.min(w / gx, h / gz) * 0.9;
    const offsetX = (w - gx * cellSize) / 2;
    const offsetY = (h - gz * cellSize) / 2;

    // Render Grid Rooms
    this.dungeon.roomsList.forEach(room => {
      const rx = room.gridX;
      const rz = room.gridZ;

      const px = offsetX + rx * cellSize;
      const py = offsetY + rz * cellSize;

      // Visibility check
      const isCurrent = (currentRoom === room);
      const isVisited = room.visited;

      // Check if adjacent to a visited room (reveal on fog of war)
      let isAdjacentToVisited = false;
      const neighbors = [
        [rx, rz - 1], [rx, rz + 1], [rx - 1, rz], [rx + 1, rz]
      ];
      neighbors.forEach(([nx, nz]) => {
        const nr = this.dungeon.getRoomAtWorldPos({ x: nx * 24, z: nz * 24 });
        if (nr && nr.visited) isAdjacentToVisited = true;
      });

      if (!isVisited && !isAdjacentToVisited) {
        return; // Hidden in fog of war
      }

      // Fill style
      if (isCurrent) {
        this.ctx.fillStyle = '#00f0ff';
      } else if (room.cleared) {
        this.ctx.fillStyle = '#1e283d';
      } else {
        this.ctx.fillStyle = '#0e121d';
      }

      this.ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

      // Border stroke
      this.ctx.strokeStyle = isVisited ? '#3a4b70' : '#1b2336';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4);

      // Room Type Icons
      if (room.type === 'item' && (isVisited || isAdjacentToVisited)) {
        this.ctx.fillStyle = '#ffb700';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('★', px + cellSize / 2, py + cellSize / 2);
      } else if (room.type === 'boss' && (isVisited || isAdjacentToVisited)) {
        this.ctx.fillStyle = '#ff2a4b';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('💀', px + cellSize / 2, py + cellSize / 2);
      }

      // Player Position Dot
      if (isCurrent) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(px + cellSize / 2, py + cellSize / 2, 3, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }
}
