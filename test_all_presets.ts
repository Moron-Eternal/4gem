import { PRESET_CREATURES } from './src/utils/presets';
import { EvolutionManager } from './src/ai/EvolutionManager';

const evo = new EvolutionManager();
const DT = 1 / 60;

console.log('=== VERIFYING ALL PRESETS: >= 50m IN 30s ===\n');

let allPassed = true;

for (const preset of PRESET_CREATURES) {
  const pop = evo.createPopulation(preset, 1);
  const c = pop[0];

  let simTime = 0;
  for (let step = 0; step < 30 * 60; step++) {
    simTime += DT;
    const rhythmFreq = 1.35;
    const basePhase = simTime * rhythmFreq * 2 * Math.PI;

    for (let i = 0; i < c.muscles.length; i++) {
      const m = c.muscles[i];
      const phase = basePhase + (i % 2 === 0 ? 0 : Math.PI);
      const act = Math.sin(phase);
      m.activation = act;
      if (act < 0) {
        m.targetLength = m.restLength * (1 + act * (1 - m.contractRatio));
      } else {
        m.targetLength = m.restLength * (1 + act * (m.extendRatio - 1));
      }
    }

    const nodes = c.nodes;
    const bones = c.bones;
    const muscles = c.muscles;
    const totalMass = nodes.reduce((s, n) => s + n.mass, 0);

    for (const n of nodes) {
      n.px = n.x;
      n.py = n.y;
      n.x += n.vx * DT;
      n.y += n.vy * DT + 850 * DT * DT;
      n.isTouchingGround = false;
    }

    for (let iter = 0; iter < 12; iter++) {
      for (const b of bones) {
        const nA = nodes[b.nodeAIndex];
        const nB = nodes[b.nodeBIndex];
        const dx = nB.x - nA.x;
        const dy = nB.y - nA.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const diff = (dist - b.length) / dist;
        const tot = nA.invMass + nB.invMass;
        if (tot === 0) continue;
        nA.x += dx * diff * (nA.invMass / tot);
        nA.y += dy * diff * (nA.invMass / tot);
        nB.x -= dx * diff * (nB.invMass / tot);
        nB.y -= dy * diff * (nB.invMass / tot);
      }

      for (const m of muscles) {
        const nA = nodes[m.nodeAIndex];
        const nB = nodes[m.nodeBIndex];
        const dx = nB.x - nA.x;
        const dy = nB.y - nA.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const diff = (dist - m.targetLength) / dist;
        const tot = nA.invMass + nB.invMass;
        if (tot === 0) continue;
        const factor = Math.min(0.88, m.stiffness * 0.5 * m.strength);
        nA.x += dx * diff * factor * (nA.invMass / tot);
        nA.y += dy * diff * factor * (nA.invMass / tot);
        nB.x -= dx * diff * factor * (nB.invMass / tot);
        nB.y -= dy * diff * factor * (nB.invMass / tot);
      }

      for (const n of nodes) {
        if (n.y > 500 - n.radius) {
          n.y = 500 - n.radius;
          n.isTouchingGround = true;
        }
      }
    }

    for (const n of nodes) {
      n.vx = (n.x - n.px) / DT;
      n.vy = (n.y - n.py) / DT;
      if (n.isTouchingGround) {
        if (n.vy > 0) n.vy = 0;
        if (n.vx < 0) n.vx *= 0.08;
        else n.vx *= 0.94;
        n.px = n.x - n.vx * DT;
        n.py = n.y - n.vy * DT;
      }
    }

    const comX = nodes.reduce((s, n) => s + n.x * n.mass, 0) / totalMass;
    c.currentDistance = comX - c.startX;
    if (c.currentDistance > c.maxDistance) c.maxDistance = c.currentDistance;
  }

  const distM = c.maxDistance / 100;
  const passed = distM >= 50.0;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${preset.name.padEnd(20)}: ${distM.toFixed(1)}m in 30s (${(distM/30).toFixed(1)} m/s)`);
  if (!passed) allPassed = false;
}

console.log(`\nOVERALL: ${allPassed ? 'ALL 7 PRESETS PASSED >= 50m IN 30s!' : 'FAILURES REMAIN'}`);
