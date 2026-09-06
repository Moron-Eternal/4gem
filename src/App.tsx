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

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'workshop' | 'arena'>('workshop');
  const [blueprint, setBlueprint] = useState<CreatureBlueprint>(PRESET_CREATURES[0]);

  const [config, setConfig] = useState<SimulationConfig>({
    populationSize: 20,
    generationDuration: 15, // seconds
    simSpeed: 1,
    gravity: 980,
    groundFriction: 0.85,
    airResistance: 0.995,
    mutationRate: 0.12,
    mutationAmount: 0.3,
    terrainType: 'flat',
    ghostMode: true,
    followMode: 'leader',
  });

  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [generation, setGeneration] = useState<number>(1);
  const [timeRemaining, setTimeRemaining] = useState<number>(config.generationDuration);
  const [population, setPopulation] = useState<CreatureInstance[]>([]);
  const [selectedCreatureId, setSelectedCreatureId] = useState<number | null>(null);
  const [history, setHistory] = useState<GenerationRecord[]>([]);

  // Physics and Evolution managers
  const physicsWorldRef = useRef<PhysicsWorld>(new PhysicsWorld());
  const evoManagerRef = useRef<EvolutionManager>(new EvolutionManager());
  const simTimeRef = useRef<number>(0);

  // Sync physics world terrain and params with config
  useEffect(() => {
    physicsWorldRef.current.terrainType = config.terrainType;
    physicsWorldRef.current.groundFriction = config.groundFriction;
    physicsWorldRef.current.gravity = config.gravity;
  }, [config.terrainType, config.groundFriction, config.gravity]);

  // Initialize or reset population whenever blueprint changes or user restarts
  const initPopulation = useCallback((bp: CreatureBlueprint, popSize: number) => {
    evoManagerRef.current.reset();
    const newPop = evoManagerRef.current.createPopulation(bp, popSize);
    setPopulation(newPop);
    setGeneration(1);
    setTimeRemaining(config.generationDuration);
    setHistory([]);
    setSelectedCreatureId(null);
    simTimeRef.current = 0;
  }, [config.generationDuration]);

  // Initial population setup on mount
  useEffect(() => {
    initPopulation(blueprint, config.populationSize);
  }, []);

  // Update population when population size config changes
  const handleConfigChange = (newConfig: SimulationConfig) => {
    if (newConfig.populationSize !== config.populationSize) {
      initPopulation(blueprint, newConfig.populationSize);
    }
    setConfig(newConfig);
  };

  // Evolve generation step
  const triggerEvolution = useCallback(() => {
    const nextPop = evoManagerRef.current.evolve(population, blueprint, config);
    setPopulation(nextPop);
    setGeneration(evoManagerRef.current.generation);
    setHistory([...evoManagerRef.current.history]);
    setTimeRemaining(config.generationDuration);
    simTimeRef.current = 0;
  }, [population, blueprint, config]);

  // Skip generation fast-forward
  const handleSkipGeneration = useCallback(() => {
    // Fast-forward physics synchronously for remaining time
    const fixedDt = 1 / 60;
    const remainingSteps = Math.ceil(timeRemaining / fixedDt);
    const stepsToRun = Math.min(600, remainingSteps); // run up to 10s of simulation instantly

    for (let s = 0; s < stepsToRun; s++) {
      simTimeRef.current += fixedDt;
      for (let i = 0; i < population.length; i++) {
        physicsWorldRef.current.updateCreature(population[i], fixedDt, simTimeRef.current);
      }
    }

    triggerEvolution();
  }, [timeRemaining, population, triggerEvolution]);

  // Main Simulation Loop
  useEffect(() => {
    if (currentTab !== 'arena' || !isRunning || population.length === 0) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const elapsedSec = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const baseDt = 1 / 60;
      // Calculate physics sub-steps according to speed
      const subSteps = Math.min(20, Math.max(1, Math.round(config.simSpeed)));
      const stepDt = baseDt;

      for (let step = 0; step < subSteps; step++) {
        simTimeRef.current += stepDt;

        for (let i = 0; i < population.length; i++) {
          physicsWorldRef.current.updateCreature(population[i], stepDt, simTimeRef.current);
        }

        // Check leader
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

      // Decrement generation timer
      const timerDec = subSteps * baseDt;
      setTimeRemaining(prev => {
        const next = prev - timerDec;
        if (next <= 0) {
          triggerEvolution();
          return config.generationDuration;
        }
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [currentTab, isRunning, population, config.simSpeed, config.generationDuration, triggerEvolution]);

  // Identify focused creature for HUD
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

            {/* Right Floating HUD: Live Neural Brain Visualizer */}
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
