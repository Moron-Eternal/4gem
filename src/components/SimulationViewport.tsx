import React, { useRef, useEffect } from 'react';
import { CreatureInstance, SimulationConfig } from '../types/creature';
import { getTerrain } from '../physics/VerletEngine';
import { Eye, Crosshair, ZoomIn, ZoomOut, AlertTriangle } from 'lucide-react';

interface SimulationViewportProps {
  population: CreatureInstance[];
  config: SimulationConfig;
  selectedCreatureId: number | null;
  onSelectCreature: (id: number | null) => void;
  onConfigChange: (config: SimulationConfig) => void;
}

export const SimulationViewport: React.FC<SimulationViewportProps> = ({
  population,
  config,
  selectedCreatureId,
  onSelectCreature,
  onConfigChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cameraRef = useRef<{ x: number; y: number; zoom: number; targetX: number; targetY: number }>({
    x: 200,
    y: 400,
    zoom: 0.9,
    targetX: 200,
    targetY: 400,
  });

  const isDraggingCamRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (config.followMode === 'free') return;

    let targetCreature: CreatureInstance | undefined;
    if (config.followMode === 'selected' && selectedCreatureId) {
      targetCreature = population.find(c => c.id === selectedCreatureId);
    } else {
      targetCreature = population.find(c => c.isLeader) || population[0];
    }

    if (targetCreature && targetCreature.nodes.length > 0) {
      let sumX = 0;
      let sumY = 0;
      targetCreature.nodes.forEach(n => {
        sumX += n.x;
        sumY += n.y;
      });
      cameraRef.current.targetX = sumX / targetCreature.nodes.length;
      cameraRef.current.targetY = sumY / targetCreature.nodes.length;
    }
  }, [population, config.followMode, selectedCreatureId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cam = cameraRef.current;

      if (config.followMode !== 'free') {
        cam.x += (cam.targetX - cam.x) * 0.1;
        cam.y += (cam.targetY - cam.y) * 0.1;
      }

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      const screenOffsetX = width * 0.35;
      const screenOffsetY = height * 0.65;

      ctx.translate(screenOffsetX, screenOffsetY);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      const visibleLeft = cam.x - screenOffsetX / cam.zoom - 100;
      const visibleRight = cam.x + (width - screenOffsetX) / cam.zoom + 100;

      // 1. Distance Markers
      const markerInterval = 100;
      const startMarker = Math.floor(visibleLeft / markerInterval) * markerInterval;

      ctx.font = 'bold 12px JetBrains Mono, monospace';
      ctx.textAlign = 'center';

      for (let mx = Math.max(0, startMarker); mx <= visibleRight; mx += markerInterval) {
        const terrain = getTerrain(mx, config.terrainType);
        const meters = Math.round(mx / 100);

        ctx.strokeStyle = meters % 5 === 0 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(148, 163, 184, 0.15)';
        ctx.lineWidth = meters % 5 === 0 ? 2 : 1;
        ctx.setLineDash(meters % 5 === 0 ? [] : [4, 4]);

        ctx.beginPath();
        ctx.moveTo(mx, terrain.y);
        ctx.lineTo(mx, terrain.y - (meters % 5 === 0 ? 90 : 40));
        ctx.stroke();
        ctx.setLineDash([]);

        if (meters % 5 === 0) {
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(`${meters}m`, mx, terrain.y - 100);

          ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
          ctx.beginPath();
          ctx.moveTo(mx, terrain.y - 90);
          ctx.lineTo(mx + 18, terrain.y - 82);
          ctx.lineTo(mx, terrain.y - 74);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = '#64748b';
          ctx.fillText(`${meters}m`, mx, terrain.y - 45);
        }
      }

      // 2. Terrain Surface
      ctx.beginPath();
      const step = 8;
      const startSampleX = Math.floor(visibleLeft / step) * step;
      ctx.moveTo(startSampleX, getTerrain(startSampleX, config.terrainType).y);

      for (let x = startSampleX + step; x <= visibleRight; x += step) {
        ctx.lineTo(x, getTerrain(x, config.terrainType).y);
      }

      ctx.lineTo(visibleRight, cam.y + 1000);
      ctx.lineTo(startSampleX, cam.y + 1000);
      ctx.closePath();

      const groundGrad = ctx.createLinearGradient(0, 480, 0, 1000);
      groundGrad.addColorStop(0, '#0f172a');
      groundGrad.addColorStop(0.05, '#090d16');
      groundGrad.addColorStop(1, '#030712');
      ctx.fillStyle = groundGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(startSampleX, getTerrain(startSampleX, config.terrainType).y);
      for (let x = startSampleX + step; x <= visibleRight; x += step) {
        ctx.lineTo(x, getTerrain(x, config.terrainType).y);
      }
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.stroke();

      // 3. Render Creatures
      const sortedToRender = [...population].sort((a, b) => {
        if (a.isLeader) return 1;
        if (b.isLeader) return -1;
        if (a.id === selectedCreatureId) return 1;
        if (b.id === selectedCreatureId) return -1;
        return a.fitness - b.fitness;
      });

      for (const creature of sortedToRender) {
        const isLeader = creature.isLeader;
        const isSelected = creature.id === selectedCreatureId;
        const opacity = config.ghostMode && !isLeader && !isSelected ? 0.35 : 1.0;

        ctx.globalAlpha = opacity;

        // Draw Muscles
        for (const m of creature.muscles) {
          const nA = creature.nodes[m.nodeAIndex];
          const nB = creature.nodes[m.nodeBIndex];
          if (!nA || !nB) continue;

          const act = m.activation;
          let muscleColor: string;
          if (act < -0.1) {
            const intensity = Math.min(1, Math.abs(act));
            muscleColor = `rgba(239, 68, 68, ${0.7 + intensity * 0.3})`;
          } else if (act > 0.1) {
            const intensity = Math.min(1, act);
            muscleColor = `rgba(6, 182, 212, ${0.7 + intensity * 0.3})`;
          } else {
            muscleColor = 'rgba(236, 72, 153, 0.7)';
          }

          ctx.strokeStyle = muscleColor;
          ctx.lineWidth = isLeader ? 6 : 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(nA.x, nA.y);
          ctx.lineTo(nB.x, nB.y);
          ctx.stroke();
        }

        // Draw Bones
        for (const b of creature.bones) {
          const nA = creature.nodes[b.nodeAIndex];
          const nB = creature.nodes[b.nodeBIndex];
          if (!nA || !nB) continue;

          ctx.strokeStyle = isLeader ? '#f8fafc' : '#94a3b8';
          ctx.lineWidth = isLeader ? b.thickness + 1 : b.thickness;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(nA.x, nA.y);
          ctx.lineTo(nB.x, nB.y);
          ctx.stroke();
        }

        // Draw Nodes
        for (const n of creature.nodes) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, isLeader ? n.radius + 1 : n.radius, 0, Math.PI * 2);

          let nodeColor = creature.color;
          if (isLeader) nodeColor = '#facc15';
          else if (n.role === 'head') nodeColor = '#f43f5e';
          else if (n.role === 'torso') nodeColor = '#f59e0b';
          else if (n.role === 'foot') nodeColor = '#10b981';

          ctx.fillStyle = nodeColor;
          ctx.fill();

          ctx.strokeStyle = '#090d16';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Eye
          if (n.hasEye) {
            const lookAngle = Math.atan2(n.vy, Math.max(1, n.vx));
            const eyeOffsetX = Math.cos(lookAngle) * 3;
            const eyeOffsetY = Math.sin(lookAngle) * 2;

            ctx.beginPath();
            ctx.arc(n.x + 2, n.y - 2, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(n.x + 2 + eyeOffsetX, n.y - 2 + eyeOffsetY, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#0f172a';
            ctx.fill();
          }

          // Foot grip pad
          if (n.role === 'foot') {
            ctx.fillStyle = '#047857';
            ctx.fillRect(n.x - 6, n.y + n.radius - 2, 12, 3);
          }
        }

        // Leader Crown 👑 or Status Warnings
        if (creature.nodes.length > 0) {
          let highestY = Infinity;
          let headX = 0;
          for (const n of creature.nodes) {
            if (n.y < highestY) {
              highestY = n.y;
              headX = n.x;
            }
          }

          if (isLeader) {
            ctx.beginPath();
            ctx.arc(headX, highestY - 20, 16, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
            ctx.fill();

            ctx.font = '16px serif';
            ctx.textAlign = 'center';
            ctx.fillText('👑', headX, highestY - 14);

            ctx.font = 'bold 11px JetBrains Mono, monospace';
            ctx.fillStyle = '#fef08a';
            ctx.fillText(`${creature.name} (${Math.round(creature.fitness / 10)}m)`, headX, highestY - 32);
          }

          // Show airborne warning if creature tried flying
          if (creature.isFlyingDisqualified && (isLeader || isSelected)) {
            ctx.fillStyle = '#f43f5e';
            ctx.font = 'bold 9px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ AIRBORNE PENALTY', headX, highestY - (isLeader ? 46 : 20));
          } else if (creature.isUpsideDown && (isLeader || isSelected)) {
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 9px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🔄 INVERTED', headX, highestY - (isLeader ? 46 : 20));
          }
        }
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [population, config, selectedCreatureId]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingCamRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingCamRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    if (config.followMode !== 'free') {
      onConfigChange({ ...config, followMode: 'free' });
    }

    cameraRef.current.x -= dx / cameraRef.current.zoom;
    cameraRef.current.y -= dy / cameraRef.current.zoom;
  };

  const handleMouseUp = () => {
    isDraggingCamRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 1.1 : 0.9;
    cameraRef.current.zoom = Math.max(0.3, Math.min(2.0, cameraRef.current.zoom * zoomDelta));
  };

  return (
    <div className="relative w-full h-full bg-[#080c16] overflow-hidden">
      <canvas
        ref={canvasRef}
        width={1400}
        height={800}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      />

      <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 flex items-center gap-1 shadow-xl">
        <button
          onClick={() => onConfigChange({ ...config, followMode: 'leader' })}
          title="Follow Pack Leader"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            config.followMode === 'leader'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Crosshair size={14} />
          Follow Leader
        </button>

        <button
          onClick={() => onConfigChange({ ...config, followMode: 'free' })}
          title="Free Pan Camera"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            config.followMode === 'free'
              ? 'bg-purple-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Eye size={14} />
          Free Cam
        </button>

        <div className="w-[1px] h-4 bg-slate-800 mx-1" />

        <button
          onClick={() => { cameraRef.current.zoom = Math.min(2.0, cameraRef.current.zoom * 1.2); }}
          title="Zoom In"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={() => { cameraRef.current.zoom = Math.max(0.3, cameraRef.current.zoom * 0.8); }}
          title="Zoom Out"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
        >
          <ZoomOut size={15} />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-4 text-xs font-mono shadow-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-rose-300">Contracting</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-300">Extending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
          <span className="text-pink-300">Resting</span>
        </div>
        <div className="flex items-center gap-1.5 text-purple-300 border-l border-slate-800 pl-3">
          <span>Angular Ligaments Active</span>
        </div>
      </div>
    </div>
  );
};
