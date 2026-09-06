import { PRESET_CREATURES } from './src/utils/presets';
import { PhysicsWorld } from './src/physics/VerletEngine';
import { EvolutionManager } from './src/ai/EvolutionManager';

console.log('=== RUNNING 50m IN 30s BENCHMARK FOR ALL 7 PRESETS ===\n');

const physics = new PhysicsWorld();
physics.terrainType = 'flat';
physics.solverIterations = 10;

const DURATION_SEC = 30;
const DT = 1 / 60;
const TOTAL_STEPS = Math.round(DURATION_SEC / DT);

let allPassed = true;

for (const preset of PRESET_CREATURES) {
  const evo = new EvolutionManager();
  // Create population of 10 creatures
  let pop = evo.createPopulation(preset, 10);

  // Train over 4 generations to let them develop gait coordination
  for (let gen = 0; gen < 4; gen++) {
    let simTime = 0;
    for (let step = 0; step < TOTAL_STEPS; step++) {
      simTime += DT;
      for (const creature of pop) {
        physics.updateCreature(creature, DT, simTime);
      }
    }
    if (gen < 3) {
      pop = evo.evolve(pop, preset, {
        populationSize: 10,
        generationDuration: DURATION_SEC,
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
        checkpoints: [],
        minSpeedThreshold: 0.3,
        soundEnabled: false
      });
    }
  }

  // Find best distance
  let maxDistMeters = 0;
  for (const c of pop) {
    const distM = c.maxDistance / 100;
    if (distM > maxDistMeters) maxDistMeters = distM;
  }

  const passed = maxDistMeters >= 50;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${preset.name.padEnd(20)}: ${maxDistMeters.toFixed(1)}m in 30s`);
  if (!passed) allPassed = false;
}

console.log(`\nOVERALL BENCHMARK RESULT: ${allPassed ? 'ALL PRESETS PASSED (>= 50m in 30s)' : 'SOME PRESETS BELOW 50m'}`);
