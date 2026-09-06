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
  contractRatio: number;
  extendRatio: number;
  strength: number;
  stiffness: number;
  maxForce?: number;
  maxSpeed?: number;
  damping?: number;
  color?: string;
}

export interface JointLimitDef {
  id: string;
  nodeAId: string;
  centerNodeId: string;
  nodeBId: string;
  minAngle: number;
  maxAngle: number;
  stiffness?: number;
}

export interface GoalCheckpoint {
  id: string;
  distanceMeters: number;
  allottedTime: number;
}

export interface CreatureBlueprint {
  id: string;
  name: string;
  category?: string;
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
  averageSpeed: number;
  stabilityScore: number;
  fitness: number;
  rank: number;
  isLeader: boolean;
  timeAirborne: number;
  isFlyingDisqualified: boolean;
  isUpsideDown: boolean;
  isSlowDisqualified: boolean;
  isCheckpointTimedOut: boolean;
  eliminated: boolean;
  disqualificationReason?: string;
  checkpointsReached: string[];
  metabolicCost: number;
  footContactCount: number;
}

export type TerrainType = 'flat' | 'hills' | 'hurdles' | 'stairs';

export interface SimulationConfig {
  populationSize: number;
  generationDuration: number; // 10 to 60 seconds
  autoSyncCheckpointTime: boolean; // automatically extend generation duration to match longest checkpoint
  simSpeed: number;
  gravity: number;
  groundFriction: number;
  airResistance: number;
  mutationRate: number;
  mutationAmount: number;
  terrainType: TerrainType;
  ghostMode: boolean;
  followMode: 'leader' | 'free' | 'selected';
  checkpoints: GoalCheckpoint[];
  minSpeedThreshold: number;
  soundEnabled: boolean;
}

export interface GenerationRecord {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  bestDistance: number;
  bestSpeed: number;
  checkpointsPassed: number;
  championName: string;
}
