import React, { useRef, useEffect } from 'react';
import { CreatureInstance, GoalCheckpoint, SimulationConfig } from '../types/creature';
import { getTerrain } from '../physics/VerletEngine';
import { Eye, Crosshair, ZoomIn, ZoomOut, Flag, AlertOctagon } from 'lucide-react';

interface SimulationViewportProps {
  population: CreatureInstance[];
  config: SimulationConfig;
  selectedCreatureId: number | null;
  simTime: number;
  onSelectCreature: (id: number | null) => void;
  onConfigChange: (config: SimulationConfig) => void;
}

export const SimulationViewport: React.FC<SimulationViewportProps> = ({
  population,
  config,
  selectedCreatureId,
  simTime,
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

      // 1. Distance Ground Markers
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
        ctx.lineTo(mx, terrain.y - (meters % 5 === 0 ? 70 : 35));
        ctx.stroke();
        ctx.setLineDash([]);

        if (meters % 5 === 0) {
          ctx.fillStyle = '#64748b';
          ctx.fillText(`${meters}m`, mx, terrain.y - 80);
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

      // 3. Render TIMED GOAL CHECKPOINTS (Neon Holographic Laser Gates)
      if (config.checkpoints && config.checkpoints.length > 0) {
        config.checkpoints.forEach((cp, idx) => {
          const cpX = cp.distanceMeters * 100;
          const terrain = getTerrain(cpX, config.terrainType);
          const gateHeight = 180;
          const gateTopY = terrain.y - gateHeight;

          const timeLeft = Math.max(0, cp.allottedTime - simTime);
          const isExpired = timeLeft === 0;
          const isPassedByLeader = population.some(c => c.isLeader && c.checkpointsReached.includes(cp.id));

          // Gate Theme Color
          let gateColor = '#38bdf8'; // Cyan
          let gateGlow = 'rgba(56, 189, 248, 0.25)';
          if (isPassedByLeader) {
            gateColor = '#10b981'; // Emerald
            gateGlow = 'rgba(16, 185, 129, 0.35)';
          } else if (isExpired) {
            gateColor = '#ef4444'; // Red expired
            gateGlow = 'rgba(239, 68, 68, 0.25)';
          } else if (timeLeft < 3.0) {
            gateColor = '#f59e0b'; // Amber warning
            gateGlow = 'rgba(245, 158, 11, 0.35)';
          }

          // Laser Gate Pillars
          ctx.save();
          ctx.strokeStyle = gateColor;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(cpX - 12, terrain.y);
          ctx.lineTo(cpX - 12, gateTopY);
          ctx.moveTo(cpX + 12, terrain.y);
          ctx.lineTo(cpX + 12, gateTopY);
          ctx.stroke();

          // Top Arch Crossbar
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(cpX - 25, gateTopY);
          ctx.lineTo(cpX + 25, gateTopY);
          ctx.stroke();

          // Vertical Holographic Laser Beam Curtain
          ctx.fillStyle = gateGlow;
          ctx.fillRect(cpX - 10, gateTopY, 20, gateHeight);

          // Pulsing central laser line
          ctx.strokeStyle = gateColor;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(cpX, gateTopY);
          ctx.lineTo(cpX, terrain.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Holographic Gate Signboard
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(cpX - 65, gateTopY - 45, 130, 40);
          ctx.strokeStyle = gateColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(cpX - 65, gateTopY - 45, 130, 40);

          ctx.font = 'bold 11px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = gateColor;
          ctx.fillText(`GATE #${idx + 1} (${cp.distanceMeters}m)`, cpX, gateTopY - 28);

          ctx.font = 'bold 12px JetBrains Mono, monospace';
          if (isPassedByLeader) {
            ctx.fillStyle = '#10b981';
            ctx.fillText('✓ CLEARED', cpX, gateTopY - 12);
          } else if (isExpired) {
            ctx.fillStyle = '#ef4444';
            ctx.fillText('✕ EXPIRED', cpX, gateTopY - 12);
          } else {
            ctx.fillStyle = timeLeft < 3 ? '#f59e0b' : '#f8fafc';
            ctx.fillText(`⏱️ ${timeLeft.toFixed(1)}s`, cpX, gateTopY - 12);
          }
          ctx.restore();
        });
      }

      // 4. Render Creatures
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
        const isEliminated = creature.eliminated;
        const opacity = isEliminated ? 0.25 : (config.ghostMode && !isLeader && !isSelected ? 0.35 : 1.0);

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

          if (n.role === 'foot') {
            ctx.fillStyle = '#047857';
            ctx.fillRect(n.x - 6, n.y + n.radius - 2, 12, 3);
          }
        }

        // Leader Crown 👑 & Status Badges
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
            ctx.fillText(`${creature.name} (${Math.round(creature.fitness / 10)}m | ${creature.averageSpeed.toFixed(1)}m/s)`, headX, highestY - 32);
          }

          // Disqualification / Elimination Status
          if (creature.eliminated) {
            ctx.font = 'bold 10px JetBrains Mono, monospace';
            ctx.fillStyle = '#f43f5e';
            ctx.textAlign = 'center';
            ctx.fillText(`💀 ${creature.disqualificationReason || 'ELIMINATED'}`, headX, highestY - (isLeader ? 46 : 22));
          } else if (creature.checkpointsReached.length > 0) {
            ctx.font = 'bold 10px JetBrains Mono, monospace';
            ctx.fillStyle = '#10b981';
            ctx.textAlign = 'center';
            ctx.fillText(`🚩 GATE #${creature.checkpointsReached.length} CLEARED`, headX, highestY - (isLeader ? 46 : 22));
          }
        }
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [population, config, selectedCreatureId, simTime]);

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

      {/* Floating Camera Mode Buttons */}
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

      {/* Muscle Tension & Checkpoints Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-4 text-xs font-mono shadow-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-rose-300">Contracting</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-300">Extending</span>
        </div>
        {config.checkpoints.length > 0 && (
          <div className="flex items-center gap-1.5 text-amber-300 border-l border-slate-800 pl-3">
            <Flag size={12} className="text-amber-400" />
            <span>{config.checkpoints.length} Timed Gates Active</span>
          </div>
        )}
      </div>
    </div>
  );
};
