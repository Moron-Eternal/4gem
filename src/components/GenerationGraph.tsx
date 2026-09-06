import React, { useRef, useEffect } from 'react';
import { GenerationRecord } from '../types/creature';
import { TrendingUp } from 'lucide-react';

interface GenerationGraphProps {
  history: GenerationRecord[];
  currentGen: number;
}

export const GenerationGraph: React.FC<GenerationGraphProps> = ({ history, currentGen }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (history.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Tracking fitness over generations...', width / 2, height / 2);
      return;
    }

    const padding = { top: 15, right: 15, bottom: 20, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Find max fitness
    let maxFit = 10;
    history.forEach(h => {
      if (h.bestFitness > maxFit) maxFit = h.bestFitness;
    });
    maxFit = Math.ceil(maxFit * 1.15); // headroom

    // Draw horizontal grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 3; i++) {
      const val = Math.round((maxFit / 3) * i);
      const y = padding.top + chartH - (i / 3) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      ctx.fillText(`${val}`, padding.left - 4, y + 3);
    }

    const getX = (idx: number) => {
      if (history.length <= 1) return padding.left + chartW / 2;
      return padding.left + (idx / (history.length - 1)) * chartW;
    };

    const getY = (val: number) => {
      return padding.top + chartH - (val / maxFit) * chartH;
    };

    // 1. Plot Average Fitness line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    history.forEach((h, i) => {
      const x = getX(i);
      const y = getY(h.avgFitness);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 2. Plot Best Fitness line (glowing cyan)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    history.forEach((h, i) => {
      const x = getX(i);
      const y = getY(h.bestFitness);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw dots for each generation on Best Fitness
    history.forEach((h, i) => {
      const x = getX(i);
      const y = getY(h.bestFitness);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
    });

    // X-axis generation labels
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Gen 1', padding.left, height - 5);
    ctx.fillText(`Gen ${currentGen}`, padding.left + chartW, height - 5);
  }, [history, currentGen]);

  const latest = history[history.length - 1];

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 flex flex-col shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
          <TrendingUp size={14} className="text-emerald-400" /> Fitness Progression
        </span>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="text-cyan-400 font-bold">Best: {latest ? Math.round(latest.bestFitness / 10) : 0}m</span>
          <span className="text-slate-400">Avg: {latest ? Math.round(latest.avgFitness / 10) : 0}m</span>
        </div>
      </div>

      <div className="flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={250}
          height={100}
          className="rounded-lg bg-[#0a0f1d] border border-slate-800/80"
        />
      </div>
    </div>
  );
};
