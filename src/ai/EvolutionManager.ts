import { CreatureBlueprint, CreatureInstance, GenerationRecord, SimBone, SimJointLimit, SimMuscle, SimNode, SimulationConfig } from '../types/creature';
import { NeuralNetwork } from './NeuralNetwork';

export class EvolutionManager {
  generation: number = 1;
  history: GenerationRecord[] = [];
  champion: CreatureInstance | null = null;
  bestEverFitness: number = 0;

  getVibrantColor(index: number, total: number, baseTheme?: string): string {
    if (index === 0 && baseTheme) return baseTheme;
    const hue = (index * (360 / Math.max(1, total)) + 30) % 360;
    return `hsl(${hue}, 85%, 60%)`;
  }

  createPopulation(
    blueprint: CreatureBlueprint,
    count: number,
    inheritedBrains?: NeuralNetwork[]
  ): CreatureInstance[] {
    const population: CreatureInstance[] = [];

    const numJointLimits = blueprint.jointLimits ? blueprint.jointLimits.length : 0;
    const inputSize = blueprint.muscles.length * 3 + blueprint.nodes.length * 2 + numJointLimits + 10;
    const hidden1Size = 32;
    const hidden2Size = 24;
    const outputSize = blueprint.muscles.length;

    const nodeIndexMap = new Map<string, number>();
    blueprint.nodes.forEach((n, idx) => nodeIndexMap.set(n.id, idx));

    let minX = Infinity;
    blueprint.nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
    });
    const spawnOffsetX = 100 - minX;

    for (let i = 0; i < count; i++) {
      const simNodes: SimNode[] = blueprint.nodes.map(n => ({
        id: n.id,
        x: n.x + spawnOffsetX,
        y: n.y,
        px: n.x + spawnOffsetX,
        py: n.y,
        vx: 0,
        vy: 0,
        mass: n.mass,
        invMass: n.mass > 0 ? 1 / n.mass : 0,
        friction: n.friction,
        radius: n.radius,
        role: n.role || (n.hasEye ? 'head' : 'joint'),
        hasEye: n.hasEye,
        isTouchingGround: false,
        groundContactDuration: 0,
      }));

      const simBones: SimBone[] = [];
      for (const b of blueprint.bones) {
        const idxA = nodeIndexMap.get(b.nodeAId);
        const idxB = nodeIndexMap.get(b.nodeBId);
        if (idxA !== undefined && idxB !== undefined) {
          const nA = simNodes[idxA];
          const nB = simNodes[idxB];
          const len = Math.hypot(nB.x - nA.x, nB.y - nA.y);
          simBones.push({
            id: b.id,
            nodeAIndex: idxA,
            nodeBIndex: idxB,
            length: len,
            thickness: b.thickness || 6,
          });
        }
      }

      const simMuscles: SimMuscle[] = [];
      for (const m of blueprint.muscles) {
        const idxA = nodeIndexMap.get(m.nodeAId);
        const idxB = nodeIndexMap.get(m.nodeBId);
        if (idxA !== undefined && idxB !== undefined) {
          const nA = simNodes[idxA];
          const nB = simNodes[idxB];
          const len = m.restLength || Math.hypot(nB.x - nA.x, nB.y - nA.y);
          simMuscles.push({
            id: m.id,
            nodeAIndex: idxA,
            nodeBIndex: idxB,
            restLength: len,
            currentLength: len,
            targetLength: len,
            contractRatio: m.contractRatio || 0.7,
            extendRatio: m.extendRatio || 1.3,
            strength: m.strength || 1.2,
            stiffness: m.stiffness || 0.9,
            maxForce: m.maxForce || 220,
            maxSpeed: m.maxSpeed || 3.5,
            damping: m.damping || 0.25,
            activation: 0,
          });
        }
      }

      const simJointLimits: SimJointLimit[] = [];
      if (blueprint.jointLimits) {
        for (const jl of blueprint.jointLimits) {
          const idxA = nodeIndexMap.get(jl.nodeAId);
          const idxC = nodeIndexMap.get(jl.centerNodeId);
          const idxB = nodeIndexMap.get(jl.nodeBId);
          if (idxA !== undefined && idxC !== undefined && idxB !== undefined) {
            simJointLimits.push({
              id: jl.id,
              nodeAIndex: idxA,
              centerIndex: idxC,
              nodeBIndex: idxB,
              minAngleRad: (jl.minAngle * Math.PI) / 180,
              maxAngleRad: (jl.maxAngle * Math.PI) / 180,
              stiffness: jl.stiffness || 0.9,
              currentAngleDeg: jl.minAngle,
            });
          }
        }
      }

      let brain: NeuralNetwork;
      if (inheritedBrains && inheritedBrains[i]) {
        brain = inheritedBrains[i];
      } else {
        brain = new NeuralNetwork(inputSize, hidden1Size, hidden2Size, outputSize);
      }

      population.push({
        id: i + 1,
        name: `${blueprint.name} #${i + 1}`,
        color: this.getVibrantColor(i, count, blueprint.colorTheme),
        nodes: simNodes,
        bones: simBones,
        muscles: simMuscles,
        jointLimits: simJointLimits,
        brain,
        startX: 100,
        currentDistance: 0,
        maxDistance: 0,
        averageSpeed: 0,
        stabilityScore: 1.0,
        fitness: 0,
        rank: i + 1,
        isLeader: i === 0,
        timeAirborne: 0,
        isFlyingDisqualified: false,
        isUpsideDown: false,
        isSlowDisqualified: false,
        isCheckpointTimedOut: false,
        eliminated: false,
        checkpointsReached: [],
        metabolicCost: 0,
        footContactCount: 0,
      });
    }

    return population;
  }

  evolve(
    population: CreatureInstance[],
    blueprint: CreatureBlueprint,
    config: SimulationConfig
  ): CreatureInstance[] {
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);

    sorted.forEach((c, idx) => {
      c.rank = idx + 1;
      c.isLeader = idx === 0;
    });

    const currentBest = sorted[0];
    const totalFitness = sorted.reduce((sum, c) => sum + c.fitness, 0);
    const avgFitness = totalFitness / sorted.length;

    this.history.push({
      generation: this.generation,
      bestFitness: Math.round(currentBest.fitness),
      avgFitness: Math.round(avgFitness),
      bestDistance: Math.round(currentBest.maxDistance),
      bestSpeed: Math.round(currentBest.averageSpeed * 10) / 10,
      checkpointsPassed: currentBest.checkpointsReached.length,
      championName: currentBest.name,
    });

    if (currentBest.fitness > this.bestEverFitness) {
      this.bestEverFitness = currentBest.fitness;
      this.champion = currentBest;
    }

    this.generation++;

    const nextBrains: NeuralNetwork[] = [];

    // Filter parent pool to favor creatures that were not eliminated
    const nonEliminated = sorted.filter(c => !c.eliminated);
    const candidatePool = nonEliminated.length >= 2 ? nonEliminated : sorted;

    const poolSize = Math.max(2, Math.floor(candidatePool.length * 0.3));
    const elitePool = candidatePool.slice(0, poolSize);

    // Slot 0: Champion clone (Elitism)
    nextBrains.push(currentBest.brain.clone());

    // Slot 1: If population >= 4, keep #2 performer
    if (config.populationSize >= 4 && candidatePool[1]) {
      nextBrains.push(candidatePool[1].brain.clone());
    }

    while (nextBrains.length < config.populationSize) {
      const parentA = this.selectParent(elitePool);
      const parentB = this.selectParent(elitePool);

      let childBrain: NeuralNetwork;
      if (Math.random() < 0.75 && parentA !== parentB) {
        childBrain = parentA.brain.crossover(parentB.brain);
      } else {
        childBrain = parentA.brain.clone();
      }

      childBrain.mutate(config.mutationRate, config.mutationAmount);
      nextBrains.push(childBrain);
    }

    return this.createPopulation(blueprint, config.populationSize, nextBrains);
  }

  private selectParent(pool: CreatureInstance[]): CreatureInstance {
    const i1 = Math.floor(Math.random() * pool.length);
    const i2 = Math.floor(Math.random() * pool.length);
    const candidate1 = pool[i1];
    const candidate2 = pool[i2];
    return candidate1.fitness >= candidate2.fitness ? candidate1 : candidate2;
  }

  reset(): void {
    this.generation = 1;
    this.history = [];
    this.champion = null;
    this.bestEverFitness = 0;
  }
}
