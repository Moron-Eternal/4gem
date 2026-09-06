import React, { useRef, useEffect } from 'react';
import { CreatureInstance } from '../types/creature';
import { BrainActivationState } from '../ai/NeuralNetwork';
import { Cpu } from 'lucide-react';

interface BrainVisualizerProps {
  creature: CreatureInstance | null;
}

export const BrainVisualizer: React.FC<BrainVisualizerProps> = ({ creature }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (!creature || !creature.brain || !creature.brain.lastState) {
        ctx.fillStyle = '#64748b';
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for neural network activations...', width / 2, height / 2);
        animId = requestAnimationFrame(render);
        return;
      }

      const state: BrainActivationState = creature.brain.lastState;
      const inputs = state.inputs;
      const hidden = state.hidden;
      const outputs = state.outputs;

      const layerX = [35, width / 2, width - 35];

      // Limit max drawn nodes to keep display tidy
      const maxDrawNodes = 10;
      const displayInputs = inputs.slice(0, maxDrawNodes);
      const displayHidden = hidden.slice(0, maxDrawNodes);
      const displayOutputs = outputs.slice(0, maxDrawNodes);

      const getYPositions = (count: number) => {
        const spacing = (height - 40) / Math.max(1, count - 1 || 1);
        return Array.from({ length: count }, (_, i) => 20 + i * spacing);
      };

      const inY = getYPositions(displayInputs.length);
      const hidY = getYPositions(displayHidden.length);
      const outY = getYPositions(displayOutputs.length);

      // 1. Draw Synapses: Input -> Hidden
      if (state.weightsIH) {
        for (let h = 0; h < displayHidden.length; h++) {
          for (let i = 0; i < displayInputs.length; i++) {
            const w = state.weightsIH[h]?.[i] || 0;
            if (Math.abs(w) > 0.15) {
              ctx.beginPath();
              ctx.moveTo(layerX[0], inY[i]);
              ctx.lineTo(layerX[1], hidY[h]);
              ctx.strokeStyle = w > 0 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(244, 63, 94, 0.25)';
              ctx.lineWidth = Math.min(2.5, Math.abs(w) * 1.5);
              ctx.stroke();
            }
          }
        }
      }

      // 2. Draw Synapses: Hidden -> Output
      if (state.weightsHO) {
        for (let o = 0; o < displayOutputs.length; o++) {
          for (let h = 0; h < displayHidden.length; h++) {
            const w = state.weightsHO[o]?.[h] || 0;
            if (Math.abs(w) > 0.15) {
              ctx.beginPath();
              ctx.moveTo(layerX[1], hidY[h]);
              ctx.lineTo(layerX[2], outY[o]);
              ctx.strokeStyle = w > 0 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(244, 63, 94, 0.25)';
              ctx.lineWidth = Math.min(2.5, Math.abs(w) * 1.5);
              ctx.stroke();
            }
          }
        }
      }

      // 3. Draw Input Nodes
      for (let i = 0; i < displayInputs.length; i++) {
        const val = displayInputs[i];
        const intensity = Math.min(1, Math.abs(val));
        ctx.beginPath();
        ctx.arc(layerX[0], inY[i], 5, 0, Math.PI * 2);
        ctx.fillStyle = val >= 0 ? `rgba(16, 185, 129, ${0.4 + intensity * 0.6})` : `rgba(244, 63, 94, ${0.4 + intensity * 0.6})`;
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 4. Draw Hidden Nodes
      for (let h = 0; h < displayHidden.length; h++) {
        const val = displayHidden[h];
        const intensity = Math.min(1, Math.abs(val));
        ctx.beginPath();
        ctx.arc(layerX[1], hidY[h], 6, 0, Math.PI * 2);
        ctx.fillStyle = val >= 0 ? `rgba(56, 189, 248, ${0.4 + intensity * 0.6})` : `rgba(245, 158, 11, ${0.4 + intensity * 0.6})`;
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 5. Draw Output Nodes
      for (let o = 0; o < displayOutputs.length; o++) {
        const val = displayOutputs[o];
        const intensity = Math.min(1, Math.abs(val));
        ctx.beginPath();
        ctx.arc(layerX[2], outY[o], 7, 0, Math.PI * 2);
        ctx.fillStyle = val >= 0 ? `rgba(6, 182, 212, ${0.4 + intensity * 0.6})` : `rgba(239, 68, 68, ${0.4 + intensity * 0.6})`;
        ctx.fill();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [creature]);

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 flex flex-col shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
          <Cpu size={14} className="text-cyan-400" /> Neural Brain Live Firing
        </span>
        <span className="text-[10px] text-cyan-400 font-mono">
          {creature ? creature.name : 'Leader'}
        </span>
      </div>

      <div className="relative flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={250}
          height={130}
          className="rounded-lg bg-[#0a0f1d] border border-slate-800/80"
        />
      </div>

      <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1.5 px-2">
        <span>Sensors ({creature?.brain?.inputSize || 0})</span>
        <span>Hidden (Tanh)</span>
        <span>Motors ({creature?.brain?.outputSize || 0})</span>
      </div>
    </div>
  );
};
