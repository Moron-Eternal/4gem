import { CreatureInstance, GoalCheckpoint, SimNode, SimJointLimit, TerrainType } from '../types/creature';

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
  airDrag: number = 0.02;
  quadraticDrag: number = 0.002;
  solverIterations: number = 10;
  terrainType: TerrainType = 'flat';

  updateCreature(
    creature: CreatureInstance, 
    dt: number, 
    simTime: number, 
    checkpoints: GoalCheckpoint[] = [],
    minSpeedThreshold: number = 0.4
  ): void {
    const nodes = creature.nodes;
    const bones = creature.bones;
    const muscles = creature.muscles;
    const jointLimits = creature.jointLimits;

    if (nodes.length === 0) return;

    // 1. Calculate Center of Mass, Torso Height, and Foot Contacts
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

    // Running distance & speed (100px = 1 meter)
    creature.currentDistance = comX - creature.startX;
    if (creature.currentDistance > creature.maxDistance) {
      creature.maxDistance = creature.currentDistance;
    }
    const currentMeters = Math.max(0, creature.currentDistance / 100);
    creature.averageSpeed = currentMeters / Math.max(0.1, simTime);

    // 2. Gather Sensory Inputs for Deep Brain
    const inputs: number[] = [];

    // 2a. Muscle Strains & Motor Activations
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

    // 2d. Torso Pitch & Stability
    let tiltSin = 0;
    if (headNode && torsoNode) {
      const angle = Math.atan2(headNode.y - torsoNode.y, headNode.x - torsoNode.x);
      tiltSin = Math.sin(angle);
      inputs.push(tiltSin);
      inputs.push(Math.cos(angle));
      creature.isUpsideDown = (headNode.y > torsoNode.y + 15);
    } else if (nodes.length >= 2) {
      const angle = Math.atan2(nodes[1].y - nodes[0].y, nodes[1].x - nodes[0].x);
      tiltSin = Math.sin(angle);
      inputs.push(tiltSin);
      inputs.push(Math.cos(angle));
    } else {
      inputs.push(0);
      inputs.push(1);
    }

    // Stability Score: penalizes horizontal wobble / head tilting
    creature.stabilityScore = Math.max(0.15, 1.0 - Math.abs(tiltSin) * 0.4);

    // 2e. Joint Angles Relative to Limits
    for (let j = 0; j < jointLimits.length; j++) {
      const jl = jointLimits[j];
      const range = Math.max(0.1, jl.maxAngleRad - jl.minAngleRad);
      const normAngle = ((jl.currentAngleDeg * Math.PI / 180) - jl.minAngleRad) / range;
      inputs.push(Math.max(-1, Math.min(1, normAngle * 2 - 1)));
    }

    // 2f. Multi-Harmonic Central Pattern Generator (CPG Clocks)
    const rhythmFreq = 1.35;
    const basePhase = simTime * rhythmFreq * 2 * Math.PI;
    inputs.push(Math.sin(basePhase));
    inputs.push(Math.cos(basePhase));
    inputs.push(Math.sin(basePhase * 2));
    inputs.push(Math.cos(basePhase * 2));
    inputs.push(Math.sin(basePhase + Math.PI));

    // 3. Deep Brain Inference with Spinal Locomotion Circuit
    if (creature.brain) {
      const motorCommands = creature.brain.forward(inputs, creature.isLeader);

      for (let i = 0; i < muscles.length; i++) {
        if (i < motorCommands.length) {
          const m = muscles[i];
          // Spinal Central Pattern Generator provides natural walking cadence
          const cpgAct = Math.sin(basePhase + (i % 2 === 0 ? 0 : Math.PI));
          // Cerebral cortex modulates stride rhythm, balance, and obstacle clearance
          m.activation = Math.max(-1, Math.min(1, cpgAct + motorCommands[i] * 0.5));

          if (m.activation < 0) {
            m.targetLength = m.restLength * (1 + m.activation * (1 - m.contractRatio));
          } else {
            m.targetLength = m.restLength * (1 + m.activation * (m.extendRatio - 1));
          }
        }
      }
    }

    // 4. Position-Based Dynamics (PBD) - Unconstrained Motion
    const dtSq = dt * dt;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      n.vx *= 0.998;
      n.vy *= 0.998;

      const speed = Math.hypot(n.vx, n.vy);
      if (speed > 1000) {
        const dragFactor = Math.max(0.9, 1 - 0.0005 * (speed - 1000));
        n.vx *= dragFactor;
        n.vy *= dragFactor;
      }

      n.px = n.x;
      n.py = n.y;

      n.x += n.vx * dt;
      n.y += n.vy * dt + this.gravity * dtSq;

      n.isTouchingGround = false;
    }

    // 5. Stiff Constraint Solver Loop
    for (let iter = 0; iter < this.solverIterations; iter++) {
      // 5a. Stiff Rigid Bones
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
        const diff = (dist - target) / dist;

        const totalInvMass = nA.invMass + nB.invMass;
        if (totalInvMass === 0) continue;

        // Position-based muscle contraction scaled by stiffness and strength
        const factor = Math.min(0.85, m.stiffness * 0.5 * m.strength);
        const moveX = dx * diff * factor;
        const moveY = dy * diff * factor;

        // Strictly momentum conserving: mA * deltaA + mB * deltaB = 0
        nA.x += moveX * (nA.invMass / totalInvMass);
        nA.y += moveY * (nA.invMass / totalInvMass);
        nB.x -= moveX * (nB.invMass / totalInvMass);
        nB.y -= moveY * (nB.invMass / totalInvMass);
      }

      // 5c. Angular Joint Limits (Zero Translation of CoM)
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

          const dAx = (newAx - nA.x) * 0.4;
          const dAy = (newAy - nA.y) * 0.4;
          const dBx = (newBx - nB.x) * 0.4;
          const dBy = (newBy - nB.y) * 0.4;

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

      // 5d. Anti-Crumple Stance Support (handled via joint limits and bones)

      // 5e. Ground Contact Penetration Projection
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const terrain = getTerrain(n.x, this.terrainType);
        const contactLimit = terrain.y - n.radius;

        if (n.y > contactLimit) {
          n.isTouchingGround = true;
          const penetration = n.y - contactLimit;
          n.x += terrain.nx * penetration;
          n.y = contactLimit;
        }
      }
    }

    // 6. Post-Solve Velocities & Realistic Ground Traction
    let newComVy = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.vx = (n.x - n.px) / dt;
      n.vy = (n.y - n.py) / dt;

      if (n.isTouchingGround) {
        if (n.vy > 0) n.vy = 0;
        // High directional foot traction:
        // Pushing backwards gives high grip against ground to launch forward
        // Moving forwards maintains kinetic momentum
        if (n.vx < 0) {
          n.vx *= 0.08;
        } else {
          n.vx *= 0.94;
        }
        n.px = n.x - n.vx * dt;
        n.py = n.y - n.vy * dt;
      }

      const maxSpeed = 2500;
      n.vx = Math.max(-maxSpeed, Math.min(maxSpeed, n.vx));
      n.vy = Math.max(-maxSpeed, Math.min(maxSpeed, n.vy));

      newComVy += n.vy * n.mass;
    }
    let currentGroundContacts = 0;
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].isTouchingGround) currentGroundContacts++;
    }

    if (currentGroundContacts === 0) {
      creature.timeAirborne += dt;

      // Anti-flight hard wall: prevent glitching through the stratosphere
      if (comHeightAboveGround > 190) {
        const pullDown = (comHeightAboveGround - 190) * 0.2;
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

    // 7. CHECKPOINT PROGRESS & TIMED EVALUATION
    if (checkpoints && checkpoints.length > 0) {
      for (const cp of checkpoints) {
        // Did creature cross this checkpoint?
        if (currentMeters >= cp.distanceMeters) {
          if (!creature.checkpointsReached.includes(cp.id)) {
            creature.checkpointsReached.push(cp.id);
          }
        } else {
          // Has the allotted time for this checkpoint expired?
          if (simTime > cp.allottedTime && !creature.checkpointsReached.includes(cp.id)) {
            creature.isCheckpointTimedOut = true;
            creature.eliminated = true;
            creature.disqualificationReason = `TIMED OUT (${cp.distanceMeters}m)`;
          }
        }
      }
    }

    // 8. HARSH SLOWNESS PENALTY & CULLING
    // If after 3.0s the creature has failed to maintain minimum average speed:
    if (simTime > 3.0 && !creature.eliminated) {
      if (creature.averageSpeed < minSpeedThreshold) {
        creature.isSlowDisqualified = true;
        creature.eliminated = true;
        creature.disqualificationReason = 'TOO SLOW';
      }
    }

    // 9. HIGH-SPEED + STABILITY FITNESS EVALUATION
    // Base distance
    let score = Math.max(0, creature.maxDistance);

    // Speed Multiplier: Going faster grants huge bonus rewards!
    const speedMultiplier = 1.0 + Math.min(3.5, creature.averageSpeed * 1.5);
    score *= speedMultiplier;

    // Stability Factor: Stable, upright posture increases score
    score *= creature.stabilityScore;

    // Torso clearance bonus
    if (torsoNode) {
      const torsoHeight = getTerrain(torsoNode.x, this.terrainType).y - torsoNode.y;
      if (torsoHeight > 45) {
        score += Math.min(60, torsoHeight * 0.5);
      }
    }

    // Major Bonus for Crossing Timed Checkpoints! (+1000 per checkpoint)
    score += creature.checkpointsReached.length * 1000;

    // HARSH PENALTY FOR SLOWNESS OR DISQUALIFICATIONS:
    if (creature.eliminated || creature.isSlowDisqualified || creature.isCheckpointTimedOut) {
      score *= 0.05; // 95% harsh punishment!
    }

    // Flying penalty
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
