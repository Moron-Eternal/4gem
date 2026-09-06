import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  FastForward, 
  RotateCcw, 
  Users, 
  Dna, 
  Sliders, 
  Compass, 
  Ghost,
  Flag,
  Plus,
  Trash2,
  Zap,
  Clock,
  Gauge,
  Volume2,
  VolumeX,
  Check
} from 'lucide-react';
import { GoalCheckpoint, SimulationConfig, TerrainType } from '../types/creature';

interface ControlsHeaderProps {
  currentTab: 'workshop' | 'arena';
  onChangeTab: (tab: 'workshop' | 'arena') => void;
  isRunning: boolean;
  onToggleRunning: () => void;
  generation: number;
  timeRemaining: number;
  simTime: number;
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
  simTime,
  config,
  onChangeConfig,
  onSkipGeneration,
  onResetEvolution,
}) => {
  const [showCheckpointModal, setShowCheckpointModal] = useState<boolean>(false);
  const [showTimerModal, setShowTimerModal] = useState<boolean>(false);
  const [newCpDist, setNewCpDist] = useState<number>(25);
  const [newCpTime, setNewCpTime] = useState<number>(8);

  const maxCheckpointTime = config.checkpoints.length > 0
    ? Math.max(...config.checkpoints.map(cp => cp.allottedTime))
    : 0;
  const isAutoSynced = config.autoSyncCheckpointTime !== false && maxCheckpointTime > 0;
  const currentEffectiveDuration = isAutoSynced
    ? Math.max(config.generationDuration, maxCheckpointTime + 3)
    : config.generationDuration;

  const progressPercent = Math.max(0, Math.min(100, ((currentEffectiveDuration - timeRemaining) / currentEffectiveDuration) * 100));

  const addCheckpoint = () => {
    if (newCpDist <= 0 || newCpTime <= 0) return;
    const newCp: GoalCheckpoint = {
      id: `cp_${Date.now()}`,
      distanceMeters: newCpDist,
      allottedTime: newCpTime,
    };
    const updated = [...config.checkpoints, newCp].sort((a, b) => a.distanceMeters - b.distanceMeters);
    onChangeConfig({ ...config, checkpoints: updated });
  };

  const removeCheckpoint = (id: string) => {
    onChangeConfig({
      ...config,
      checkpoints: config.checkpoints.filter(cp => cp.id !== id),
    });
  };

  const loadPresetTrial = (preset: 'sprint' | 'gauntlet' | 'marathon' | 'none') => {
    if (preset === 'none') {
      onChangeConfig({ ...config, checkpoints: [] });
    } else if (preset === 'sprint') {
      onChangeConfig({
        ...config,
        checkpoints: [
          { id: 'cp_1', distanceMeters: 20, allottedTime: 7 },
        ],
      });
    } else if (preset === 'gauntlet') {
      onChangeConfig({
        ...config,
        checkpoints: [
          { id: 'cp_1', distanceMeters: 15, allottedTime: 5 },
          { id: 'cp_2', distanceMeters: 35, allottedTime: 10 },
          { id: 'cp_3', distanceMeters: 60, allottedTime: 16 },
        ],
      });
    } else if (preset === 'marathon') {
      onChangeConfig({
        ...config,
        checkpoints: [
          { id: 'cp_1', distanceMeters: 25, allottedTime: 8 },
          { id: 'cp_2', distanceMeters: 55, allottedTime: 17 },
          { id: 'cp_3', distanceMeters: 100, allottedTime: 28 },
        ],
      });
    }
    setShowCheckpointModal(false);
  };

  return (
    <header className="h-16 bg-[#0c101d] border-b border-slate-800 px-5 flex items-center justify-between select-none z-20 relative">
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
        <div className="flex items-center gap-3.5">
          {/* Generation & Timer Bar with Settings Popover */}
          <div className="relative">
            <button
              onClick={() => { setShowTimerModal(!showTimerModal); setShowCheckpointModal(false); }}
              title="Click to adjust Generation Duration and Auto-Sync"
              className="flex flex-col gap-1 w-48 bg-slate-900/90 hover:bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-800 text-left transition group cursor-pointer"
            >
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  Gen #{generation}
                  <Clock size={11} className="text-slate-500 group-hover:text-cyan-400 transition" />
                </span>
                <span className="text-slate-300 font-semibold text-[11px]">
                  {timeRemaining.toFixed(1)}s <span className="text-slate-500 font-normal">/ {currentEffectiveDuration}s</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-100 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </button>

            {/* Timer Popover */}
            {showTimerModal && (
              <div className="absolute left-0 top-12 w-72 bg-[#0e1422] border border-slate-700 rounded-xl p-4 shadow-2xl z-50 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Clock size={14} /> Generation Timer Settings
                  </span>
                  <button onClick={() => setShowTimerModal(false)} className="text-slate-400 hover:text-slate-200 text-xs">
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Duration:</span>
                    <span className="text-cyan-400 font-bold">{config.generationDuration}s</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={config.generationDuration}
                    onChange={(e) => onChangeConfig({ ...config, generationDuration: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between gap-1">
                    {[15, 25, 30, 45, 60].map(sec => (
                      <button
                        key={sec}
                        onClick={() => onChangeConfig({ ...config, generationDuration: sec })}
                        className={`flex-1 py-1 text-[10px] font-mono rounded border transition ${
                          config.generationDuration === sec
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-sync with checkpoints toggle */}
                <div className="border-t border-slate-800 pt-2.5 flex flex-col gap-1.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-slate-300 font-medium">Auto-Sync with Gates</span>
                    <input
                      type="checkbox"
                      checked={config.autoSyncCheckpointTime !== false}
                      onChange={(e) => onChangeConfig({ ...config, autoSyncCheckpointTime: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Automatically extends the generation timer so creatures have time to reach all active checkpoint gates before advancing.
                  </p>
                  {isAutoSynced && (
                    <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg px-2 py-1 text-[10px] font-mono text-amber-300">
                      ⚡ Active Duration: {currentEffectiveDuration}s (max gate: {maxCheckpointTime}s + 3s buffer)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Timed Checkpoints Button */}
          <div className="relative">
            <button
              onClick={() => setShowCheckpointModal(!showCheckpointModal)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                config.checkpoints.length > 0
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flag size={14} className={config.checkpoints.length > 0 ? 'text-amber-400 animate-bounce' : ''} />
              <span>Checkpoints ({config.checkpoints.length})</span>
            </button>

            {/* Checkpoint Setup Popover Modal */}
            {showCheckpointModal && (
              <div className="absolute right-0 top-12 w-80 bg-[#0e1422] border border-slate-700 rounded-xl p-4 shadow-2xl z-50 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Flag size={14} /> Timed Goal Checkpoints
                  </span>
                  <button onClick={() => setShowCheckpointModal(false)} className="text-slate-400 hover:text-slate-200 text-xs">
                    ✕
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-tight">
                  Creatures must reach each checkpoint before its allotted time runs out, or they will be harshly penalized and eliminated!
                </p>

                {/* Preset trials */}
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => loadPresetTrial('sprint')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 rounded font-mono">
                    Sprint (20m in 7s)
                  </button>
                  <button onClick={() => loadPresetTrial('gauntlet')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 rounded font-mono">
                    Gauntlet (3 Gates)
                  </button>
                  <button onClick={() => loadPresetTrial('marathon')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-purple-300 rounded font-mono">
                    Marathon (100m)
                  </button>
                  <button onClick={() => loadPresetTrial('none')} className="px-2 py-1 bg-slate-800 hover:bg-rose-900/40 text-[10px] text-rose-300 rounded font-mono">
                    Clear Gates
                  </button>
                </div>

                {/* Checkpoint list */}
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {config.checkpoints.length === 0 ? (
                    <div className="text-center py-2 text-xs text-slate-500">No checkpoints active. Add one below!</div>
                  ) : (
                    config.checkpoints.map((cp, idx) => (
                      <div key={cp.id} className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="text-slate-200">{cp.distanceMeters}m</span>
                          <span className="text-slate-400">within</span>
                          <span className="text-amber-400 font-bold">{cp.allottedTime}s</span>
                        </div>
                        <button onClick={() => removeCheckpoint(cp.id)} className="text-rose-400 hover:text-rose-300 p-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new checkpoint */}
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <label className="text-[10px] text-slate-400">Distance (m):</label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        step="5"
                        value={newCpDist}
                        onChange={(e) => setNewCpDist(Math.max(5, parseInt(e.target.value) || 5))}
                        className="w-full bg-slate-800 text-slate-100 rounded px-2 py-1 text-xs border border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Allotted Time (s):</label>
                      <input
                        type="number"
                        min="2"
                        max="60"
                        step="1"
                        value={newCpTime}
                        onChange={(e) => setNewCpTime(Math.max(2, parseInt(e.target.value) || 2))}
                        className="w-full bg-slate-800 text-slate-100 rounded px-2 py-1 text-xs border border-slate-700"
                      />
                    </div>
                  </div>
                  <button
                    onClick={addCheckpoint}
                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition"
                  >
                    <Plus size={14} /> Add Checkpoint Gate
                  </button>
                </div>

                {/* Slowness Cutoff Setting */}
                <div className="border-t border-slate-800 pt-2 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1"><Gauge size={12} className="text-rose-400" /> Min Speed Cutoff:</span>
                    <span className="text-rose-400 font-bold">{config.minSpeedThreshold.toFixed(1)} m/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.2"
                    step="0.1"
                    value={config.minSpeedThreshold}
                    onChange={(e) => onChangeConfig({ ...config, minSpeedThreshold: parseFloat(e.target.value) })}
                    className="w-full accent-rose-500"
                  />
                  <span className="text-[9px] text-slate-500">Creatures failing to reach this speed after 3s are culled.</span>
                </div>

                {/* Auto-Sync with Gates */}
                <div className="border-t border-slate-800 pt-2 flex flex-col gap-1">
                  <label className="flex items-center justify-between cursor-pointer text-xs">
                    <span className="text-slate-300 font-medium flex items-center gap-1">
                      <Clock size={12} className="text-amber-400" /> Auto-Sync Gen Timer
                    </span>
                    <input
                      type="checkbox"
                      checked={config.autoSyncCheckpointTime !== false}
                      onChange={(e) => onChangeConfig({ ...config, autoSyncCheckpointTime: e.target.checked })}
                      className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                    />
                  </label>
                  <span className="text-[9px] text-slate-500">
                    Auto-extends generation to {currentEffectiveDuration}s so creatures can complete all gates.
                  </span>
                </div>
              </div>
            )}
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

          {/* Population Size */}
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
            className={`p-2 rounded-xl border transition cursor-pointer ${
              config.ghostMode
                ? 'bg-purple-950/40 text-purple-300 border-purple-800/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Ghost size={16} />
          </button>

          {/* Sound Effects Toggle */}
          <button
            onClick={() => onChangeConfig({ ...config, soundEnabled: config.soundEnabled === false ? true : false })}
            title={`Sound Effects: ${config.soundEnabled !== false ? 'ON' : 'MUTED'}`}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              config.soundEnabled !== false
                ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40 hover:bg-cyan-900/40'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            {config.soundEnabled !== false ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      )}
    </header>
  );
};
