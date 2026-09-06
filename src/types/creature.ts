export type NodeRole = 'head' | 'torso' | 'joint' | 'foot';

export interface NodeDef {
  id: string;
  x: number;
  y: number;
  mass: number;
  friction: number;
  radius: number;
  role?: NodeRole;
  hasEye?: boolean;
  color?: string;
}

export interface BoneDef {
  id: string;
  nodeAId: string;
  nodeBId: string;
  thickness?: number;
  color?: string;
}

export interface MuscleDef {
  id: string;
  nodeAId: string;
  nodeBId: string;
  restLength: number;
  contractRatio: number; // e.g. 0.7 = can contract to 70% of rest length
  extendRatio: number;   // e.g. 1.3 = can extend to 130% of rest length
  strength: number;      // muscle force scale
  stiffness: number;     // spring stiffness (0.1 to 1.0)
  maxForce?: number;     // max force in Newtons (default ~200)
  maxSpeed?: number;     // max contraction speed in restLengths/sec (default ~3.5)
  damping?: number;      // internal muscle damping (default ~0.2)
  color?: string;
}

export interface JointLimitDef {
  id: string;
  nodeAId: string;     // first outer bone node
  centerNodeId: string;// joint pivot node
  nodeBId: string;     // second outer bone node
  minAngle: number;    // minimum allowable bend angle in degrees (e.g. 20°)
  maxAngle: number;    // maximum allowable bend angle in degrees (e.g. 150°)
  stiffness?: number;  // ligament stiffness (default 0.8)
}

export interface CreatureBlueprint {
  id: string;
  name: string;
  nodes: NodeDef[];
  bones: BoneDef[];
  muscles: MuscleDef[];
  jointLimits?: JointLimitDef[];
  colorTheme?: string;
  createdAt: number;
}

export interface SimNode {
  id: string;
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  mass: number;
  invMass: number;
  friction: number;
  radius: number;
  role: NodeRole;
  hasEye?: boolean;
  isTouchingGround: boolean;
  groundContactDuration: number;
}

export interface SimBone {
  id: string;
  nodeAIndex: number;
  nodeBIndex: number;
  length: number;
  thickness: number;
}

export interface SimMuscle {
  id: string;
  nodeAIndex: number;
  nodeBIndex: number;
  restLength: number;
  currentLength: number;
  targetLength: number;
  contractRatio: number;
  extendRatio: number;
  strength: number;
  stiffness: number;
  maxForce: number;
  maxSpeed: number;
  damping: number;
  activation: number;
}

export interface SimJointLimit {
  id: string;
  nodeAIndex: number;
  centerIndex: number;
  nodeBIndex: number;
  minAngleRad: number;
  maxAngleRad: number;
  stiffness: number;
  currentAngleDeg: number;
}

export interface CreatureInstance {
  id: number;
  name: string;
  color: string;
  nodes: SimNode[];
  bones: SimBone[];
  muscles: SimMuscle[];
  jointLimits: SimJointLimit[];
  brain: any;
  startX: number;
  currentDistance: number;
  maxDistance: number;
  fitness: number;
  rank: number;
  isLeader: boolean;
  // Biomechanical diagnostics
  timeAirborne: number;
  isFlyingDisqualified: boolean;
  isUpsideDown: boolean;
  metabolicCost: number;
  footContactCount: number;
}

export type TerrainType = 'flat' | 'hills' | 'hurdles' | 'stairs';

export interface SimulationConfig {
  populationSize: number;
  generationDuration: number;
  simSpeed: number;
  gravity: number;
  groundFriction: number;
  airResistance: number;
  mutationRate: number;
  mutationAmount: number;
  terrainType: TerrainType;
  ghostMode: boolean;
  followMode: 'leader' | 'free' | 'selected';
}

export interface GenerationRecord {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  bestDistance: number;
  championName: string;
}
