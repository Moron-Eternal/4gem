import { CreatureInstance, SimNode, SimJointLimit, TerrainType } from '../types/creature';

export interface TerrainSample {
  y: number;
  nx: number;
  ny: number;
}

export const BASE_GROUND_Y = 500;

export function getTerrain(x: number, type: TerrainType): TerrainSample {
  if (x < 150) {
    return { y: BASE_GROUND_Y, nx: 0, ny: -1 };
  }

  const dx = x - 150;

  switch (type) {
    case 'hills': {
      const h = Math.sin(dx * 0.004) * 60 + Math.sin(dx * 0.01) * 25;
      const slope = 0.004 * 60 * Math.cos(dx * 0.004) + 0.01 * 25 * Math.cos(dx * 0.01);
      const len = Math.hypot(slope, -1);
      return {
        y: BASE_GROUND_Y - h,
        nx: slope / len,
        ny: -1 / len,
      };
    }
    case 'hurdles': {
      const hurdleSpacing = 350;
      const hurdleWidth = 50;
      const hurdleHeight = 45;
      const mod = dx % hurdleSpacing;
      if (mod > hurdleSpacing - hurdleWidth) {
        const progress = (mod - (hurdleSpacing - hurdleWidth)) / hurdleWidth;
        const arch = Math.sin(progress * Math.PI) * hurdleHeight;
        return { y: BASE_GROUND_Y - arch, nx: 0, ny: -1 };
      }
      return { y: BASE_GROUND_Y, nx: 0, ny: -1 };
    }
    case 'stairs': {
      const stepWidth = 160;
      const stepHeight = 22;
      const stepNum = Math.floor(dx / stepWidth);
      const y = BASE_GROUND_Y - stepNum * stepHeight;
      return { y, nx: 0, ny: -1 };
    }
    case 'flat':
    default:
      return { y: BASE_GROUND_Y, nx: 0, ny: -1 };
  }
}

export class PhysicsWorld {
  gravity: number = 850; // px/s^2
  groundFriction: number = 0.95;
  airDrag: number = 0.02; // linear air drag
  quadraticDrag: number = 0.002; // aerodynamic velocity dampening
  solverIterations: number = 18; // High stiffness for bones & anti-crumple
  terrainType: TerrainType = 'flat';

  updateCreature(creature: CreatureInstance, dt: number, simTime: number): void {
    const nodes = creature.nodes;
    const bones = creature.bones;
    const muscles = creature.muscles;
    const jointLimits = creature.jointLimits;

    if (nodes.length === 0) return;

    // 1. Calculate Center of Mass, Torso Height, Foot Contacts
    let comX = 0;
    let comY = 0;
    let totalMass = 0;
    let groundContactCount = 0;
    let torsoNode: SimNode | null = null;
    let headNode: SimNode | null = null;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      comX += n.x * n.mass;
      comY += n.y * n.mass;
      totalMass += n.mass;
      if (n.role === 'torso') torsoNode = n;
      if (n.role === 'head' || n.hasEye) headNode = n;
      if (n.isTouchingGround) groundContactCount++;
    }

    if (totalMass > 0) {
      comX /= totalMass;
      comY /= totalMass;
    }

    const groundSampleAtCom = getTerrain(comX, this.terrainType);
    const comHeightAboveGround = groundSampleAtCom.y - comY;

    // 2. Gather Rich Sensory Inputs for Deep Brain
    const inputs: number[] = [];

    // 2a. Muscle Strains & Activation Velocities
    for (let i = 0; i < muscles.length; i++) {
      const m = muscles[i];
      const strain = (m.currentLength - m.restLength) / (m.restLength || 1);
      inputs.push(Math.max(-1.5, Math.min(1.5, strain)));
      inputs.push(Math.max(-1.5, Math.min(1.5, m.activation)));
    }

    // 2b. Node Proprioception: Ground Touch & Normalized Height
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      inputs.push(n.isTouchingGround ? 1.0 : 0.0);
      const groundY = getTerrain(n.x, this.terrainType).y;
      const heightOffGround = (groundY - n.y) / 100.0;
      inputs.push(Math.max(-0.5, Math.min(2.0, heightOffGround)));
    }

    // 2c. Center of Mass Dynamics
    let comVx = 0;
    let comVy = 0;
    for (let i = 0; i < nodes.length; i++) {
      comVx += nodes[i].vx * nodes[i].mass;
      comVy += nodes[i].vy * nodes[i].mass;
    }
    if (totalMass > 0) {
      comVx /= totalMass;
      comVy /= totalMass;
    }
    inputs.push(Math.max(-2, Math.min(2, comVx / 150)));
    inputs.push(Math.max(-2, Math.min(2, comVy / 150)));
    inputs.push(Math.max(-1, Math.min(2, comHeightAboveGround / 100)));

    // 2d. Torso Pitch & Angular Tilt
    if (headNode && torsoNode) {
      const angle = Math.atan2(headNode.y - torsoNode.y, headNode.x - torsoNode.x);
      inputs.push(Math.sin(angle));
      inputs.push(Math.cos(angle));
      creature.isUpsideDown = (headNode.y > torsoNode.y + 15);
    } else if (nodes.length >= 2) {
      const angle = Math.atan2(nodes[1].y - nodes[0].y, nodes[1].x - nodes[0].x);
      inputs.push(Math.sin(angle));
      inputs.push(Math.cos(angle));
    } else {
      inputs.push(0);
      inputs.push(1);
    }

    // 2e. Joint Angles Relative to Limits
    for (let j = 0; j < jointLimits.length; j++) {
      const jl = jointLimits[j];
      const range = Math.max(0.1, jl.maxAngleRad - jl.minAngleRad);
      const normAngle = ((jl.currentAngleDeg * Math.PI / 180) - jl.minAngleRad) / range;
      inputs.push(Math.max(-1, Math.min(1, normAngle * 2 - 1)));
    }

    // 2f. Multi-Harmonic Central Pattern Generator (CPG Clocks)
    const rhythmFreq = 1.1; // 1.1 Hz natural walking stride
    const phase = simTime * rhythmFreq * 2 * Math.PI;
    inputs.push(Math.sin(phase));                    // Fundamental CPG
    inputs.push(Math.cos(phase));
    inputs.push(Math.sin(phase * 2));                // Harmonic CPG (double cadence)
    inputs.push(Math.cos(phase * 2));
    inputs.push(Math.sin(phase + Math.PI));          // Contralateral phase (inverted for opposite leg)

    // 3. Deep Brain Inference
    if (creature.brain) {
      const motorCommands = creature.brain.forward(inputs, creature.isLeader);

      for (let i = 0; i < muscles.length; i++) {
        if (i < motorCommands.length) {
          const m = muscles[i];
          const targetAct = Math.max(-1, Math.min(1, motorCommands[i]));

          // Smooth motor activation rate
          const maxActDelta = 3.5 * dt;
          const actDelta = Math.max(-maxActDelta, Math.min(maxActDelta, targetAct - m.activation));
          m.activation += actDelta;

          // Compute target length from activation
          let targetLen: number;
          if (m.activation < 0) {
            targetLen = m.restLength * (1 + m.activation * (1 - m.contractRatio));
          } else {
            targetLen = m.restLength * (1 + m.activation * (m.extendRatio - 1));
          }

          // Limit contraction rate (Hill force-velocity property)
          const maxLenDelta = m.maxSpeed * m.restLength * dt;
          const diff = targetLen - m.targetLength;
          m.targetLength += Math.max(-maxLenDelta, Math.min(maxLenDelta, diff));
        }
      }
    }

    // 4. Position-Based Dynamics (PBD) - Phase 1: Unconstrained Motion
    const dtSq = dt * dt;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      // Explicit velocity damping & aerodynamic drag
      n.vx *= (1 - this.airDrag * dt);
      n.vy *= (1 - this.airDrag * dt);

      const speed = Math.hypot(n.vx, n.vy);
      if (speed > 1.0) {
        const dragFactor = Math.max(0.75, 1 - this.quadraticDrag * speed);
        n.vx *= dragFactor;
        n.vy *= dragFactor;
      }

      // Save previous position
      n.px = n.x;
      n.py = n.y;

      // Predict position
      n.x += n.vx * dt;
      n.y += n.vy * dt + this.gravity * dtSq;

      n.isTouchingGround = false;
    }

    // 5. Phase 2: High-Stiffness Constraint Solver Loop
    for (let iter = 0; iter < this.solverIterations; iter++) {
      // 5a. Stiff Rigid Bones (Zero-Stretch Distance Constraints)
      for (let i = 0; i < bones.length; i++) {
        const b = bones[i];
        const nA = nodes[b.nodeAIndex];
        const nB = nodes[b.nodeBIndex];
        if (!nA || !nB) continue;

        const dx = nB.x - nA.x;
        const dy = nB.y - nA.y;
        const dist = Math.hypot(dx, dy) || 0.0001;

        const diff = (dist - b.length) / dist;
        const totalInvMass = nA.invMass + nB.invMass;
        if (totalInvMass === 0) continue;

        // Fully stiff projection (factor = 1.0)
        const moveX = dx * diff;
        const moveY = dy * diff;

        nA.x += moveX * (nA.invMass / totalInvMass);
        nA.y += moveY * (nA.invMass / totalInvMass);
        nB.x -= moveX * (nB.invMass / totalInvMass);
        nB.y -= moveY * (nB.invMass / totalInvMass);
      }

      // 5b. Dynamic Contractile Muscles (Momentum Conserving)
      for (let i = 0; i < muscles.length; i++) {
        const m = muscles[i];
        const nA = nodes[m.nodeAIndex];
        const nB = nodes[m.nodeBIndex];
        if (!nA || !nB) continue;

        const dx = nB.x - nA.x;
        const dy = nB.y - nA.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        m.currentLength = dist;

        const target = m.targetLength || m.restLength;
        const strainDiff = dist - target;

        const totalInvMass = nA.invMass + nB.invMass;
        if (totalInvMass === 0) continue;

        // Elastic muscle spring with viscous damping
        const k = m.stiffness * 600 * m.strength;
        const relVx = (nB.x - nB.px) - (nA.x - nA.px);
        const relVy = (nB.y - nB.py) - (nA.y - nA.py);
        const relVel = (relVx * dx + relVy * dy) / dist;

        let force = k * strainDiff + m.damping * 35 * relVel;
        const maxF = m.maxForce * 10;
        force = Math.max(-maxF, Math.min(maxF, force));

        const displacement = (force * dtSq / (totalMass || 1)) / dist;
        const moveX = dx * displacement;
        const moveY = dy * displacement;

        // Momentum conserving: mA * deltaA + mB * deltaB = 0
        nA.x += moveX * (nA.invMass / totalInvMass);
        nA.y += moveY * (nA.invMass / totalInvMass);
        nB.x -= moveX * (nB.invMass / totalInvMass);
        nB.y -= moveY * (nB.invMass / totalInvMass);
      }

      // 5c. Angular Joint Limits (Momentum Conserving: Zero Translation of CoM)
      for (let j = 0; j < jointLimits.length; j++) {
        const jl = jointLimits[j];
        const nA = nodes[jl.nodeAIndex];
        const nC = nodes[jl.centerIndex];
        const nB = nodes[jl.nodeBIndex];
        if (!nA || !nC || !nB) continue;

        const vAx = nA.x - nC.x;
        const vAy = nA.y - nC.y;
        const vBx = nB.x - nC.x;
        const vBy = nB.y - nC.y;

        const lenA = Math.hypot(vAx, vAy) || 0.001;
        const lenB = Math.hypot(vBx, vBy) || 0.001;

        const dot = (vAx * vBx + vAy * vBy) / (lenA * lenB);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        jl.currentAngleDeg = Math.round(angle * 180 / Math.PI);

        let correctionAngle = 0;
        if (angle < jl.minAngleRad) {
          correctionAngle = (jl.minAngleRad - angle);
        } else if (angle > jl.maxAngleRad) {
          correctionAngle = (jl.maxAngleRad - angle);
        }

        if (Math.abs(correctionAngle) > 0.005) {
          const cross = vAx * vBy - vAy * vBx;
          const sign = cross >= 0 ? 1 : -1;
          const halfCorr = (correctionAngle * 0.4 * jl.stiffness) * sign;

          const cosA = Math.cos(-halfCorr);
          const sinA = Math.sin(-halfCorr);
          const newAx = nC.x + (vAx * cosA - vAy * sinA);
          const newAy = nC.y + (vAx * sinA + vAy * cosA);

          const cosB = Math.cos(halfCorr);
          const sinB = Math.sin(halfCorr);
          const newBx = nC.x + (vBx * cosB - vBy * sinB);
          const newBy = nC.y + (vBx * sinB + vBy * cosB);

          // Calculate displacement of A and B
          const dAx = (newAx - nA.x) * 0.4;
          const dAy = (newAy - nA.y) * 0.4;
          const dBx = (newBx - nB.x) * 0.4;
          const dBy = (newBy - nB.y) * 0.4;

          // Center of mass translation correction (cancel out any net linear push)
          const netMoveX = (dAx * nA.mass + dBx * nB.mass) / (nA.mass + nB.mass + nC.mass);
          const netMoveY = (dAy * nA.mass + dBy * nB.mass) / (nA.mass + nB.mass + nC.mass);

          nA.x += dAx - netMoveX;
          nA.y += dAy - netMoveY;
          nB.x += dBx - netMoveX;
          nB.y += dBy - netMoveY;
          nC.x -= netMoveX;
          nC.y -= netMoveY;
        }
      }

      // 5d. Anti-Crumple Stance Extensor Support (When feet are grounded, support body weight)
      if (groundContactCount > 0 && torsoNode) {
        for (let i = 0; i < nodes.length; i++) {
          const foot = nodes[i];
          if (foot.role === 'foot' && foot.isTouchingGround) {
            const dy = foot.y - torsoNode.y;
            // If torso is sagging below minimum height (e.g. 70px above foot), push torso up
            const minStanceHeight = 65;
            if (dy < minStanceHeight) {
              const liftDeficit = minStanceHeight - dy;
              torsoNode.y -= liftDeficit * 0.15; // Anti-gravity stance spring
            }
          }
        }
      }

      // 5e. Ground Contact (Strict Inelastic Collision & Coulomb Friction)
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const terrain = getTerrain(n.x, this.terrainType);
        const contactLimit = terrain.y - n.radius;

        if (n.y > contactLimit) {
          n.isTouchingGround = true;
          const penetration = n.y - contactLimit;

          n.x += terrain.nx * penetration;
          n.y = contactLimit;

          // Inelastic contact: absorb downward kinetic energy
          if (n.y < n.py) {
            n.py = n.y;
          }

          // Coulomb Friction
          const effectiveFriction = (n.role === 'foot' ? 0.98 : n.friction) * this.groundFriction;
          const vx = (n.x - n.px);
          n.px = n.x - vx * (1 - effectiveFriction);
        }
      }
    }

    // 6. Phase 3: Post-Solve Velocities & STRICT ANTI-FLIGHT GUARANTEE
    let newComVy = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.vx = (n.x - n.px) / dt;
      n.vy = (n.y - n.py) / dt;

      // Absolute biological velocity clamp (prevents any physics explosion)
      const maxSpeed = 500; // px/sec
      n.vx = Math.max(-maxSpeed, Math.min(maxSpeed, n.vx));
      n.vy = Math.max(-maxSpeed, Math.min(maxSpeed, n.vy));

      newComVy += n.vy * n.mass;
    }
    newComVy /= (totalMass || 1);

    // ANTI-FLIGHT HARD WALL:
    // If creature has NO ground contact, it CANNOT accelerate upward!
    if (groundContactCount === 0) {
      creature.timeAirborne += dt;

      // If creature is moving upward without ground contact, clamp upward velocity to maximum natural jump limit
      if (newComVy < -150) {
        for (let i = 0; i < nodes.length; i++) {
          nodes[i].vy = Math.max(-150, nodes[i].vy);
          nodes[i].py = nodes[i].y - nodes[i].vy * dt;
        }
      }

      // If creature height exceeds natural limit (180px above ground), pull it down immediately
      if (comHeightAboveGround > 180) {
        const pullDown = (comHeightAboveGround - 180) * 0.2;
        for (let i = 0; i < nodes.length; i++) {
          nodes[i].y += pullDown;
          nodes[i].py = nodes[i].y;
          nodes[i].vy = Math.max(0, nodes[i].vy);
        }
        creature.isFlyingDisqualified = true;
      }
    } else {
      creature.timeAirborne = Math.max(0, creature.timeAirborne - dt * 3.0);
      creature.footContactCount++;
    }

    // 7. Locomotion Fitness Evaluation
    let currComX = 0;
    for (let i = 0; i < nodes.length; i++) {
      currComX += nodes[i].x;
    }
    currComX /= nodes.length;

    creature.currentDistance = currComX - creature.startX;
    if (creature.currentDistance > creature.maxDistance) {
      creature.maxDistance = creature.currentDistance;
    }

    // Fitness favors:
    // 1. Forward progression along ground
    // 2. Maintained torso height (anti-crumple posture reward)
    // 3. Cadence (regular foot contact)
    let score = Math.max(0, creature.maxDistance);

    // Anti-crumple bonus: reward keeping torso elevated off the ground
    if (torsoNode) {
      const torsoHeight = getTerrain(torsoNode.x, this.terrainType).y - torsoNode.y;
      if (torsoHeight > 50) {
        score += Math.min(50, torsoHeight * 0.4);
      }
    }

    // Flight penalty
    if (creature.isFlyingDisqualified || creature.timeAirborne > 1.0) {
      score *= 0.05;
    }

    // Upside-down tumble penalty
    if (creature.isUpsideDown) {
      score *= 0.4;
    }

    creature.fitness = Math.max(0, score);
  }
}
