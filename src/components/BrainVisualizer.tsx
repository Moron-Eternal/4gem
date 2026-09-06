import React, { useRef, useEffect } from 'react';
import { CreatureInstance } from '../types/creature';
import { DeepBrainActivationState } from '../ai/NeuralNetwork';
import { Cpu, Brain } from 'lucide-react';

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
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Initializing Deep Neural Brain...', width / 2, height / 2);
        animId = requestAnimationFrame(render);
        return;
      }

      const state: DeepBrainActivationState = creature.brain.lastState;
      const inputs = state.inputs;
      const hidden1 = state.hidden1;
      const hidden2 = state.hidden2;
      const outputs = state.outputs;

      // 4 Layers: Input -> Hidden1 -> Hidden2 -> Output
      const layerX = [25, width * 0.35, width * 0.65, width - 25];

      const maxDrawNodes = 9;
      const displayIn = inputs.slice(0, maxDrawNodes);
      const displayH1 = hidden1.slice(0, maxDrawNodes);
      const displayH2 = hidden2.slice(0, maxDrawNodes);
      const displayOut = outputs.slice(0, maxDrawNodes);

      const getYPositions = (count: number) => {
        const spacing = (height - 30) / Math.max(1, count - 1 || 1);
        return Array.from({ length: count }, (_, i) => 15 + i * spacing);
      };

      const inY = getYPositions(displayIn.length);
      const h1Y = getYPositions(displayH1.length);
      const h2Y = getYPositions(displayH2.length);
      const outY = getYPositions(displayOut.length);

      // 1. Synapses: Input -> Hidden 1
      if (state.weightsIH1) {
        for (let h = 0; h < displayH1.length; h++) {
          for (let i = 0; i < displayIn.length; i++) {
            const w = state.weightsIH1[h]?.[i] || 0;
            if (Math.abs(w) > 0.2) {
              ctx.beginPath();
              ctx.moveTo(layerX[0], inY[i]);
              ctx.lineTo(layerX[1], h1Y[h]);
              ctx.strokeStyle = w > 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(244, 63, 94, 0.2)';
              ctx.lineWidth = Math.min(2, Math.abs(w) * 1.2);
              ctx.stroke();
            }
          }
        }
      }

      // 2. Synapses: Hidden 1 -> Hidden 2
      if (state.weightsH1H2) {
        for (let h2 = 0; h2 < displayH2.length; h2++) {
          for (let h1 = 0; h1 < displayH1.length; h1++) {
            const w = state.weightsH1H2[h2]?.[h1] || 0;
            if (Math.abs(w) > 0.2) {
              ctx.beginPath();
              ctx.moveTo(layerX[1], h1Y[h1]);
              ctx.lineTo(layerX[2], h2Y[h2]);
              ctx.strokeStyle = w > 0 ? 'rgba(168, 85, 247, 0.2)' : 'rgba(245, 158, 11, 0.2)';
              ctx.lineWidth = Math.min(2, Math.abs(w) * 1.2);
              ctx.stroke();
            }
          }
        }
      }

      // 3. Synapses: Hidden 2 -> Output
      if (state.weightsH2O) {
        for (let o = 0; o < displayOut.length; o++) {
          for (let h2 = 0; h2 < displayH2.length; h2++) {
            const w = state.weightsH2O[o]?.[h2] || 0;
            if (Math.abs(w) > 0.2) {
              ctx.beginPath();
              ctx.moveTo(layerX[2], h2Y[h2]);
              ctx.lineTo(layerX[3], outY[o]);
              ctx.strokeStyle = w > 0 ? 'rgba(6, 182, 212, 0.25)' : 'rgba(239, 68, 68, 0.25)';
              ctx.lineWidth = Math.min(2, Math.abs(w) * 1.2);
              ctx.stroke();
            }
          }
        }
      }

      // 4. Input Nodes
      for (let i = 0; i < displayIn.length; i++) {
        const val = displayIn[i];
        const intensity = Math.min(1, Math.abs(val));
        ctx.beginPath();
        ctx.arc(layerX[0], inY[i], 4, 0, Math.PI * 2);
        ctx.fillStyle = val >= 0 ? `rgba(16, 185, 129, ${0.4 + intensity * 0.6})` : `rgba(244, 63, 94, ${0.4 + intensity * 0.6})`;
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 5. Hidden Layer 1 Nodes (LeakyReLU)
      for (let h1 = 0; h1 < displayH1.length; h1++) {
        const val = displayH1[h1];
        const intensity = Math.min(1, Math.abs(val));
        ctx.beginPath();
        ctx.arc(layerX[1], h1Y[h1], 5, 0, Math.PI * 2);
        ctx.fillStyle = val > 0 ? `rgba(56, 189, 248, ${0.4 + intensity * 0.6})` : `rgba(100, 116, 139, 0.4)`;
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 6. Hidden Layer 2 Nodes (Tanh)
      for (let h2 = 0; h2 < displayH2.length; h2++) {
        const val = displayH2[h2];
        const intensity = Math.min(1, Math.abs(val));
        ctx.beginPath();
        ctx.arc(layerX[2], h2Y[h2], 5, 0, Math.PI * 2);
        ctx.fillStyle = val >= 0 ? `rgba(168, 85, 247, ${0.4 + intensity * 0.6})` : `rgba(245, 158, 11, ${0.4 + intensity * 0.6})`;
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 7. Output Nodes (Motor commands)
      for (let o = 0; o < displayOut.length; o++) {
        const val = displayOut[o];
        const intensity = Math.min(1, Math.abs(val));
        ctx.beginPath();
        ctx.arc(layerX[3], outY[o], 6, 0, Math.PI * 2);
        ctx.fillStyle = val >= 0 ? `rgba(6, 182, 212, ${0.5 + intensity * 0.5})` : `rgba(239, 68, 68, ${0.5 + intensity * 0.5})`;
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
          <Brain size={14} className="text-cyan-400" /> Deep Neural Brain (2 Layers + Memory)
        </span>
        <span className="text-[10px] text-cyan-400 font-mono">
          {creature ? creature.name : 'Leader'}
        </span>
      </div>

      <div className="relative flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={280}
          height={130}
          className="rounded-lg bg-[#0a0f1d] border border-slate-800/80"
        />
      </div>

      <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1.5 px-1">
        <span>In ({creature?.brain?.inputSize || 0})</span>
        <span className="text-cyan-400">H1 (32)</span>
        <span className="text-purple-400">H2 (24)</span>
        <span>Out ({creature?.brain?.outputSize || 0})</span>
      </div>
    </div>
  );
};
