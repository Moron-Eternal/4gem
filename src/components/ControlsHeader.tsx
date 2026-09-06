import React from 'react';
import { 
  Play, 
  Pause, 
  FastForward, 
  RotateCcw, 
  Users, 
  Dna, 
  Sliders, 
  Layers, 
  Compass, 
  Ghost,
  Sparkles
} from 'lucide-react';
import { SimulationConfig, TerrainType } from '../types/creature';

interface ControlsHeaderProps {
  currentTab: 'workshop' | 'arena';
  onChangeTab: (tab: 'workshop' | 'arena') => void;
  isRunning: boolean;
  onToggleRunning: () => void;
  generation: number;
  timeRemaining: number;
  config: SimulationConfig;
  onChangeConfig: (config: SimulationConfig) => void;
  onSkipGeneration: () => void;
  onResetEvolution: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10, 20];
const POPULATION_OPTIONS = [5, 10, 20, 50, 100];

export const ControlsHeader: React.FC<ControlsHeaderProps> = ({
  currentTab,
  onChangeTab,
  isRunning,
  onToggleRunning,
  generation,
  timeRemaining,
  config,
  onChangeConfig,
  onSkipGeneration,
  onResetEvolution,
}) => {
  const progressPercent = Math.max(0, Math.min(100, ((config.generationDuration - timeRemaining) / config.generationDuration) * 100));

  return (
    <header className="h-16 bg-[#0c101d] border-b border-slate-800 px-5 flex items-center justify-between select-none z-20">
      {/* Brand & Tab Navigation */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Dna size={20} className="text-slate-950 font-bold" />
          </div>
          <div>
            <div className="font-extrabold tracking-wide text-sm bg-gradient-to-r from-slate-100 via-cyan-200 to-emerald-300 bg-clip-text text-transparent">
              BioMorph
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
              Evolution Simulator
            </div>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onChangeTab('workshop')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentTab === 'workshop'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders size={14} />
            Creature Workshop
          </button>
          <button
            onClick={() => onChangeTab('arena')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentTab === 'arena'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dna size={14} />
            Evolution Arena
          </button>
        </div>
      </div>

      {/* Arena Simulation Controls */}
      {currentTab === 'arena' && (
        <div className="flex items-center gap-4">
          {/* Generation & Timer Bar */}
          <div className="flex flex-col gap-1 w-44 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-cyan-400 font-bold">Gen #{generation}</span>
              <span className="text-slate-400 text-[11px]">{timeRemaining.toFixed(1)}s</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-100 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Play/Pause & Skip */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={onToggleRunning}
              title={isRunning ? 'Pause' : 'Play'}
              className={`p-2 rounded-lg transition ${
                isRunning
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              }`}
            >
              {isRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>

            <button
              onClick={onSkipGeneration}
              title="Instantly Skip to Next Generation"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
            >
              <FastForward size={15} />
              <span>Next Gen</span>
            </button>

            <button
              onClick={onResetEvolution}
              title="Restart Evolution from Gen 1"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {SPEED_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => onChangeConfig({ ...config, simSpeed: s })}
                className={`px-2 py-1 text-[11px] font-mono font-bold rounded-lg transition ${
                  config.simSpeed === s
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Population Size Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400">
            <Users size={14} className="text-cyan-400" />
            <span className="text-[11px]">Pop:</span>
            <select
              value={config.populationSize}
              onChange={(e) => onChangeConfig({ ...config, populationSize: parseInt(e.target.value) })}
              className="bg-slate-800 text-slate-100 font-mono font-bold rounded px-1.5 py-0.5 text-xs focus:outline-none border border-slate-700"
            >
              {POPULATION_OPTIONS.map(num => (
                <option key={num} value={num}>{num} creatures</option>
              ))}
            </select>
          </div>

          {/* Terrain Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400">
            <Compass size={14} className="text-emerald-400" />
            <select
              value={config.terrainType}
              onChange={(e) => onChangeConfig({ ...config, terrainType: e.target.value as TerrainType })}
              className="bg-slate-800 text-slate-100 font-bold rounded px-1.5 py-0.5 text-xs focus:outline-none border border-slate-700 capitalize"
            >
              <option value="flat">Flat Track</option>
              <option value="hills">Rolling Hills</option>
              <option value="hurdles">Obstacle Hurdles</option>
              <option value="stairs">Stepped Stairs</option>
            </select>
          </div>

          {/* Ghost Mode Toggle */}
          <button
            onClick={() => onChangeConfig({ ...config, ghostMode: !config.ghostMode })}
            title={`Ghost Mode: ${config.ghostMode ? 'ON' : 'OFF'}`}
            className={`p-2 rounded-xl border transition ${
              config.ghostMode
                ? 'bg-purple-950/40 text-purple-300 border-purple-800/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Ghost size={16} />
          </button>
        </div>
      )}
    </header>
  );
};
