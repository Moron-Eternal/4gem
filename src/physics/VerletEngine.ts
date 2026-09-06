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
  gravity: number = 880; // px/s^2 (realistic gravity scale)
  groundFriction: number = 0.9;
  airResistance: number = 0.992;
  quadraticDrag: number = 0.0015; // Realistic aerodynamic damping to eliminate runaway velocities
  solverIterations: number = 10;
  terrainType: TerrainType = 'flat';

  updateCreature(creature: CreatureInstance, dt: number, simTime: number): void {
    const nodes = creature.nodes;
    const bones = creature.bones;
    const muscles = creature.muscles;
    const jointLimits = creature.jointLimits;

    if (nodes.length === 0) return;

    // 1. Calculate Center of Mass, Torso Orientation, and Feet Positions
    let comX = 0;
    let comY = 0;
    let comVx = 0;
    let comVy = 0;
    let totalMass = 0;

    let headNode: SimNode | null = null;
    let minFootY = -Infinity;
    let footContactInFrame = false;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      comX += n.x * n.mass;
      comY += n.y * n.mass;
      const vx = n.x - n.px;
      const vy = n.y - n.py;
      n.vx = vx / dt;
      n.vy = vy / dt;
      comVx += vx * n.mass;
      comVy += vy * n.mass;
      totalMass += n.mass;

      if (n.role === 'head' || n.hasEye) {
        headNode = n;
      }
      if (n.role === 'foot') {
        if (n.y > minFootY) minFootY = n.y;
        if (n.isTouchingGround) footContactInFrame = true;
      }
    }

    if (totalMass > 0) {
      comX /= totalMass;
      comY /= totalMass;
      comVx /= totalMass;
      comVy /= totalMass;
    }

    // Biomechanical check: Is creature upside-down?
    if (headNode && minFootY > -Infinity) {
      // If head is lower than the feet by a margin, creature is upside down
      creature.isUpsideDown = headNode.y > minFootY - 15;
    }

    // 2. Gather NN Sensory Inputs
    const inputs: number[] = [];

    // Muscle strains and velocities
    for (let i = 0; i < muscles.length; i++) {
      const m = muscles[i];
      const strain = (m.currentLength - m.restLength) / (m.restLength || 1);
      inputs.push(Math.max(-1.5, Math.min(1.5, strain)));
    }

    // Node ground contacts
    for (let i = 0; i < nodes.length; i++) {
      inputs.push(nodes[i].isTouchingGround ? 1.0 : 0.0);
    }

    // Center of mass normalized velocities
    inputs.push(Math.max(-2, Math.min(2, comVx * 0.05)));
    inputs.push(Math.max(-2, Math.min(2, comVy * 0.05)));

    // Torso tilt angle relative to horizon
    if (nodes.length >= 2) {
      const angle = Math.atan2(nodes[1].y - nodes[0].y, nodes[1].x - nodes[0].x);
      inputs.push(Math.sin(angle));
      inputs.push(Math.cos(angle));
    } else {
      inputs.push(0);
      inputs.push(1);
    }

    // Joint current angles relative to limit range
    for (let j = 0; j < jointLimits.length; j++) {
      const jl = jointLimits[j];
      const range = Math.max(0.1, jl.maxAngleRad - jl.minAngleRad);
      const normalizedAngle = ((jl.currentAngleDeg * Math.PI / 180) - jl.minAngleRad) / range;
      inputs.push(Math.max(-1, Math.min(1, normalizedAngle * 2 - 1)));
    }

    // Central Pattern Generator (Cadence clock)
    const rhythmFreq = 1.2; // 1.2 Hz walking stride frequency
    inputs.push(Math.sin(simTime * rhythmFreq * 2 * Math.PI));
    inputs.push(Math.cos(simTime * rhythmFreq * 2 * Math.PI));

    // 3. Brain Inference with Rate Limiting (Hill-type dynamic motor control)
    if (creature.brain) {
      const rawActivations = creature.brain.forward(inputs, creature.isLeader);

      for (let i = 0; i < muscles.length; i++) {
        if (i < rawActivations.length) {
          const m = muscles[i];
          const targetAct = Math.max(-1, Math.min(1, rawActivations[i]));

          // Rate-limit activation change (prevents high-frequency muscle twitching / explosive energy injection)
          const maxActivationDelta = 4.0 * dt; // max change per second
          const actDelta = Math.max(-maxActivationDelta, Math.min(maxActivationDelta, targetAct - m.activation));
          m.activation += actDelta;

          // Calculate desired target length based on activation
          let desiredLen: number;
          if (m.activation < 0) {
            desiredLen = m.restLength * (1 + m.activation * (1 - m.contractRatio));
          } else {
            desiredLen = m.restLength * (1 + m.activation * (m.extendRatio - 1));
          }

          // Rate limit target length change according to max muscle shortening velocity (v_max)
          const maxLenChange = m.maxSpeed * m.restLength * dt;
          const lenDiff = desiredLen - m.targetLength;
          m.targetLength += Math.max(-maxLenChange, Math.min(maxLenChange, lenDiff));
        }
      }
    }

    // 4. Verlet Integration with Quadratic Aerodynamic Drag
    const dtSq = dt * dt;
    let anyContactInStep = false;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      let vx = (n.x - n.px) * this.airResistance;
      let vy = (n.y - n.py) * this.airResistance;

      // Realistic quadratic drag: F_drag = -c * |v| * v
      const speed = Math.hypot(vx, vy);
      if (speed > 0.001) {
        const dragFactor = Math.max(0.7, 1 - this.quadraticDrag * speed);
        vx *= dragFactor;
        vy *= dragFactor;
      }

      // Clamp max node velocity to physically plausible biological speed (prevents physics explosions)
      const maxVelocityPerStep = 25.0; // max px per frame
      if (Math.abs(vx) > maxVelocityPerStep) vx = Math.sign(vx) * maxVelocityPerStep;
      if (Math.abs(vy) > maxVelocityPerStep) vy = Math.sign(vy) * maxVelocityPerStep;

      n.px = n.x;
      n.py = n.y;

      n.x += vx;
      n.y += vy + this.gravity * dtSq;

      // Track if node touched ground
      if (n.isTouchingGround) {
        anyContactInStep = true;
        n.groundContactDuration += dt;
      } else {
        n.groundContactDuration = 0;
      }
      n.isTouchingGround = false;
    }

    // 5. Relaxation Constraint Solving (Rigid Bones, Dynamic Muscles, Joint Limits, Ground)
    for (let iter = 0; iter < this.solverIterations; iter++) {
      // 5a. Dynamic Muscles with Hill-type Force Limits and Damping
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

        // Relative velocity along muscle axis for internal viscous damping
        const relVx = (nB.x - nB.px) - (nA.x - nA.px);
        const relVy = (nB.y - nB.py) - (nA.y - nA.py);
        const relVelAlongMuscle = (relVx * dx + relVy * dy) / dist;

        // Spring force + Damping force
        const k = m.stiffness * 800 * m.strength;
        const c = m.damping * 40;
        let force = k * strainDiff + c * relVelAlongMuscle;

        // Clamp peak muscle force (Newtons) to prevent explosive launch glitches!
        const maxF = m.maxForce * 12;
        force = Math.max(-maxF, Math.min(maxF, force));

        // Metabolic cost tracking (energy expenditure = |force * contraction|)
        creature.metabolicCost += Math.abs(force * strainDiff) * 0.00001;

        // Apply displacement
        const displacement = (force * dtSq / (totalMass || 1)) / dist;
        const moveX = dx * displacement;
        const moveY = dy * displacement;

        nA.x += moveX * (nA.invMass / totalInvMass);
        nA.y += moveY * (nA.invMass / totalInvMass);
        nB.x -= moveX * (nB.invMass / totalInvMass);
        nB.y -= moveY * (nB.invMass / totalInvMass);
      }

      // 5b. Rigid Bones (Fixed Distance Constraints)
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

      // 5c. Angular Joint Limits (Ligament / Bone Stop Constraints)
      for (let j = 0; j < jointLimits.length; j++) {
        const jl = jointLimits[j];
        const nA = nodes[jl.nodeAIndex];
        const nC = nodes[jl.centerIndex]; // joint pivot
        const nB = nodes[jl.nodeBIndex];
        if (!nA || !nC || !nB) continue;

        const vAx = nA.x - nC.x;
        const vAy = nA.y - nC.y;
        const vBx = nB.x - nC.x;
        const vBy = nB.y - nC.y;

        const lenA = Math.hypot(vAx, vAy) || 0.001;
        const lenB = Math.hypot(vBx, vBy) || 0.001;

        // Interior angle between bones around center joint
        const dot = (vAx * vBx + vAy * vBy) / (lenA * lenB);
        const clampedDot = Math.max(-1, Math.min(1, dot));
        const angle = Math.acos(clampedDot); // angle in [0, PI]
        jl.currentAngleDeg = Math.round(angle * 180 / Math.PI);

        // Check if joint exceeds limit
        let correctionAngle = 0;
        if (angle < jl.minAngleRad) {
          correctionAngle = (jl.minAngleRad - angle); // needs to open up
        } else if (angle > jl.maxAngleRad) {
          correctionAngle = (jl.maxAngleRad - angle); // needs to close
        }

        if (Math.abs(correctionAngle) > 0.005) {
          // Cross product determines relative direction of rotation
          const cross = vAx * vBy - vAy * vBx;
          const sign = cross >= 0 ? 1 : -1;

          // Restorative angular impulse
          const halfCorr = (correctionAngle * 0.45 * jl.stiffness) * sign;

          // Rotate vector A
          const cosA = Math.cos(-halfCorr);
          const sinA = Math.sin(-halfCorr);
          const newAx = nC.x + (vAx * cosA - vAy * sinA);
          const newAy = nC.y + (vAx * sinA + vAy * cosA);

          // Rotate vector B
          const cosB = Math.cos(halfCorr);
          const sinB = Math.sin(halfCorr);
          const newBx = nC.x + (vBx * cosB - vBy * sinB);
          const newBy = nC.y + (vBx * sinB + vBy * cosB);

          nA.x += (newAx - nA.x) * 0.5;
          nA.y += (newAy - nA.y) * 0.5;
          nB.x += (newBx - nB.x) * 0.5;
          nB.y += (newBy - nB.y) * 0.5;
        }
      }

      // 5d. Inelastic Ground Collision & Coulomb Friction
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const terrain = getTerrain(n.x, this.terrainType);
        const contactLimit = terrain.y - n.radius;

        if (n.y > contactLimit) {
          n.isTouchingGround = true;
          const penetration = n.y - contactLimit;

          // Position projection out of ground
          n.x += terrain.nx * penetration;
          n.y = contactLimit;

          // Completely Inelastic Collision: zero out downward velocity into ground
          // (Stops the rocket-bounce glitch where vertical penetration shoots creature into sky!)
          const vy = n.y - n.py;
          if (vy > 0) {
            n.py = n.y; // zero vertical restitution
          }

          // Coulomb Friction: damp tangential velocity
          const vx = n.x - n.px;
          const effectiveFriction = (n.role === 'foot' ? 0.96 : n.friction) * this.groundFriction;
          n.px = n.x - vx * (1 - effectiveFriction);
        }
      }
    }

    // 6. Airborne / Flying Detection
    if (!anyContactInStep) {
      creature.timeAirborne += dt;
      // If creature flies without ground contact for > 1.2 seconds, disqualify flying!
      if (creature.timeAirborne > 1.2) {
        creature.isFlyingDisqualified = true;
      }
    } else {
      creature.timeAirborne = Math.max(0, creature.timeAirborne - dt * 2.0);
      creature.footContactCount++;
    }

    // 7. Biological Fitness Scoring (Rewarding realistic locomotion, penalizing glitches)
    let currComX = 0;
    for (let i = 0; i < nodes.length; i++) {
      currComX += nodes[i].x;
    }
    currComX /= nodes.length;

    creature.currentDistance = currComX - creature.startX;
    if (creature.currentDistance > creature.maxDistance) {
      creature.maxDistance = creature.currentDistance;
    }

    // Base score is forward distance
    let rawScore = Math.max(0, creature.maxDistance);

    // Exploit Penalty 1: Flying / Glitch Launch Disqualification
    if (creature.isFlyingDisqualified) {
      rawScore *= 0.05; // 95% penalty for flying
    }

    // Exploit Penalty 2: Upside Down / Inverted Tumbling
    if (creature.isUpsideDown) {
      rawScore *= 0.5; // 50% penalty for tumbling head-over-heels
    }

    // Exploit Penalty 3: Excessive Flailing / Spastic Jerk (Metabolic penalty)
    const metabolicPenalty = Math.min(0.4, creature.metabolicCost * 0.02);
    rawScore *= (1.0 - metabolicPenalty);

    creature.fitness = Math.max(0, rawScore);
  }
}
