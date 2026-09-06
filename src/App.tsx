import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CreatureBlueprint, CreatureInstance, GenerationRecord, SimulationConfig } from './types/creature';
import { PRESET_CREATURES } from './utils/presets';
import { PhysicsWorld } from './physics/VerletEngine';
import { EvolutionManager } from './ai/EvolutionManager';
import { CreatureDesigner } from './components/CreatureDesigner';
import { SimulationViewport } from './components/SimulationViewport';
import { ControlsHeader } from './components/ControlsHeader';
import { BrainVisualizer } from './components/BrainVisualizer';
import { GenerationGraph } from './components/GenerationGraph';
import { Leaderboard } from './components/Leaderboard';

import { sounds } from './utils/sound';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'workshop' | 'arena'>('workshop');
  const [blueprint, setBlueprint] = useState<CreatureBlueprint>(PRESET_CREATURES[0]);

  const [config, setConfig] = useState<SimulationConfig>({
    populationSize: 20,
    generationDuration: 30,
    autoSyncCheckpointTime: true,
    simSpeed: 1,
    gravity: 850,
    groundFriction: 0.95,
    airResistance: 0.995,
    mutationRate: 0.12,
    mutationAmount: 0.3,
    terrainType: 'flat',
    ghostMode: true,
    followMode: 'leader',
    checkpoints: [
      { id: 'cp_1', distanceMeters: 20, allottedTime: 8 },
      { id: 'cp_2', distanceMeters: 50, allottedTime: 18 },
    ],
    minSpeedThreshold: 0.4, // m/s
    soundEnabled: true,
  });

  const maxCheckpointTime = config.checkpoints.length > 0
    ? Math.max(...config.checkpoints.map(cp => cp.allottedTime))
    : 0;

  const effectiveDuration = (config.autoSyncCheckpointTime !== false && maxCheckpointTime > 0)
    ? Math.max(config.generationDuration, maxCheckpointTime + 3)
    : config.generationDuration;

  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [generation, setGeneration] = useState<number>(1);
  const [timeRemaining, setTimeRemaining] = useState<number>(effectiveDuration);
  const [population, setPopulation] = useState<CreatureInstance[]>([]);
  const [selectedCreatureId, setSelectedCreatureId] = useState<number | null>(null);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [simTime, setSimTime] = useState<number>(0);

  const physicsWorldRef = useRef<PhysicsWorld>(new PhysicsWorld());
  const evoManagerRef = useRef<EvolutionManager>(new EvolutionManager());
  const simTimeRef = useRef<number>(0);

  useEffect(() => {
    physicsWorldRef.current.terrainType = config.terrainType;
    physicsWorldRef.current.groundFriction = config.groundFriction;
    physicsWorldRef.current.gravity = config.gravity;
    sounds.enabled = config.soundEnabled !== false;
  }, [config.terrainType, config.groundFriction, config.gravity, config.soundEnabled]);

  const initPopulation = useCallback((bp: CreatureBlueprint, popSize: number) => {
    evoManagerRef.current.reset();
    const newPop = evoManagerRef.current.createPopulation(bp, popSize);
    setPopulation(newPop);
    setGeneration(1);
    setTimeRemaining(effectiveDuration);
    setHistory([]);
    setSelectedCreatureId(null);
    simTimeRef.current = 0;
    setSimTime(0);
  }, [effectiveDuration]);

  useEffect(() => {
    initPopulation(blueprint, config.populationSize);
  }, []);

  const handleConfigChange = (newConfig: SimulationConfig) => {
    if (newConfig.populationSize !== config.populationSize) {
      initPopulation(blueprint, newConfig.populationSize);
    }
    setConfig(newConfig);
  };

  const triggerEvolution = useCallback(() => {
    sounds.playNewGeneration();
    const nextPop = evoManagerRef.current.evolve(population, blueprint, config);
    setPopulation(nextPop);
    setGeneration(evoManagerRef.current.generation);
    setHistory([...evoManagerRef.current.history]);
    setTimeRemaining(effectiveDuration);
    simTimeRef.current = 0;
    setSimTime(0);
  }, [population, blueprint, config, effectiveDuration]);

  const handleSkipGeneration = useCallback(() => {
    const fixedDt = 1 / 60;
    const remainingSteps = Math.ceil(timeRemaining / fixedDt);
    const stepsToRun = Math.min(600, remainingSteps);

    for (let s = 0; s < stepsToRun; s++) {
      simTimeRef.current += fixedDt;
      for (let i = 0; i < population.length; i++) {
        physicsWorldRef.current.updateCreature(
          population[i], 
          fixedDt, 
          simTimeRef.current,
          config.checkpoints,
          config.minSpeedThreshold
        );
      }
    }

    triggerEvolution();
  }, [timeRemaining, population, config.checkpoints, config.minSpeedThreshold, triggerEvolution]);

  // Main Simulation Loop
  useEffect(() => {
    if (currentTab !== 'arena' || !isRunning || population.length === 0) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      lastTime = currentTime;

      const baseDt = 1 / 60;
      const subSteps = Math.min(20, Math.max(1, Math.round(config.simSpeed)));
      const stepDt = baseDt;

      for (let step = 0; step < subSteps; step++) {
        simTimeRef.current += stepDt;

        for (let i = 0; i < population.length; i++) {
          const c = population[i];
          const prevCpCount = c.checkpointsReached.length;

          physicsWorldRef.current.updateCreature(
            c, 
            stepDt, 
            simTimeRef.current,
            config.checkpoints,
            config.minSpeedThreshold
          );

          if (c.checkpointsReached.length > prevCpCount) {
            sounds.playCheckpointPassed();
          }
        }

        // Rank and crown leader
        let bestFit = -1;
        let leaderIdx = 0;
        for (let i = 0; i < population.length; i++) {
          if (population[i].fitness > bestFit) {
            bestFit = population[i].fitness;
            leaderIdx = i;
          }
        }
        for (let i = 0; i < population.length; i++) {
          population[i].isLeader = i === leaderIdx;
        }
      }

      setSimTime(simTimeRef.current);

      const timerDec = subSteps * baseDt;
      setTimeRemaining(prev => {
        const next = prev - timerDec;
        if (next <= 0) {
          triggerEvolution();
          return effectiveDuration;
        }
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [currentTab, isRunning, population, config.simSpeed, config.checkpoints, config.minSpeedThreshold, effectiveDuration, triggerEvolution]);

  const leaderCreature = population.find(c => c.isLeader) || population[0] || null;
  const focusedCreature = selectedCreatureId 
    ? (population.find(c => c.id === selectedCreatureId) || leaderCreature)
    : leaderCreature;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090d16] overflow-hidden">
      {/* Top Controls Header */}
      <ControlsHeader
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        isRunning={isRunning}
        onToggleRunning={() => setIsRunning(!isRunning)}
        generation={generation}
        timeRemaining={timeRemaining}
        simTime={simTime}
        config={config}
        onChangeConfig={handleConfigChange}
        onSkipGeneration={handleSkipGeneration}
        onResetEvolution={() => initPopulation(blueprint, config.populationSize)}
      />

      {/* Main View Area */}
      <div className="flex-1 relative overflow-hidden">
        {currentTab === 'workshop' ? (
          <CreatureDesigner
            blueprint={blueprint}
            onChangeBlueprint={setBlueprint}
            onLaunchArena={() => {
              initPopulation(blueprint, config.populationSize);
              setCurrentTab('arena');
              setIsRunning(true);
            }}
          />
        ) : (
          <div className="relative w-full h-full">
            {/* 2D Physics Viewport */}
            <SimulationViewport
              population={population}
              config={config}
              selectedCreatureId={selectedCreatureId}
              simTime={simTime}
              onSelectCreature={setSelectedCreatureId}
              onConfigChange={setConfig}
            />

            {/* Left Floating HUD: Generation Graph & Leaderboard */}
            <div className="absolute top-4 left-4 flex flex-col gap-3 pointer-events-auto w-64">
              <GenerationGraph history={history} currentGen={generation} />
              <Leaderboard
                population={population}
                selectedCreatureId={selectedCreatureId}
                onSelectCreature={setSelectedCreatureId}
              />
            </div>

            {/* Right Floating HUD: Live Deep Neural Brain Visualizer */}
            <div className="absolute bottom-4 right-4 pointer-events-auto">
              <BrainVisualizer creature={focusedCreature} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default App;
