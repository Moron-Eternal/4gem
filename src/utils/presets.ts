import { CreatureBlueprint } from '../types/creature';

export const PRESET_CREATURES: CreatureBlueprint[] = [
  {
    id: 'biped_runner',
    name: 'Strider Biped',
    nodes: [
      // Head & Torso Frame
      { id: 'head', x: 200, y: 310, mass: 1.2, friction: 0.4, radius: 14, role: 'head', hasEye: true, color: '#f43f5e' },
      { id: 'torso', x: 200, y: 365, mass: 2.5, friction: 0.5, radius: 14, role: 'torso', color: '#fb923c' },
      { id: 'pelvis', x: 200, y: 410, mass: 2.0, friction: 0.5, radius: 12, role: 'torso', color: '#ea580c' },
      // Left Leg (Thigh, Knee, Shin, Foot)
      { id: 'knee_L', x: 180, y: 450, mass: 1.0, friction: 0.6, radius: 9, role: 'joint', color: '#38bdf8' },
      { id: 'foot_L', x: 170, y: 495, mass: 1.5, friction: 0.98, radius: 10, role: 'foot', color: '#0284c7' },
      // Right Leg (Thigh, Knee, Shin, Foot)
      { id: 'knee_R', x: 220, y: 450, mass: 1.0, friction: 0.6, radius: 9, role: 'joint', color: '#a855f7' },
      { id: 'foot_R', x: 230, y: 495, mass: 1.5, friction: 0.98, radius: 10, role: 'foot', color: '#7e22ce' },
    ],
    bones: [
      // Spine & Core (Triangulated rigid body)
      { id: 'b_neck', nodeAId: 'head', nodeBId: 'torso', thickness: 8 },
      { id: 'b_spine', nodeAId: 'torso', nodeBId: 'pelvis', thickness: 8 },
      // Left Leg Bones
      { id: 'b_thigh_L', nodeAId: 'pelvis', nodeBId: 'knee_L', thickness: 6 },
      { id: 'b_shin_L', nodeAId: 'knee_L', nodeBId: 'foot_L', thickness: 5 },
      // Right Leg Bones
      { id: 'b_thigh_R', nodeAId: 'pelvis', nodeBId: 'knee_R', thickness: 6 },
      { id: 'b_shin_R', nodeAId: 'knee_R', nodeBId: 'foot_R', thickness: 5 },
    ],
    muscles: [
      // Hip Flexors (Torso to Knees)
      { id: 'm_hip_L', nodeAId: 'torso', nodeBId: 'knee_L', restLength: 87, contractRatio: 0.72, extendRatio: 1.28, strength: 1.3, stiffness: 0.92, maxForce: 260, maxSpeed: 3.5 },
      { id: 'm_hip_R', nodeAId: 'torso', nodeBId: 'knee_R', restLength: 87, contractRatio: 0.72, extendRatio: 1.28, strength: 1.3, stiffness: 0.92, maxForce: 260, maxSpeed: 3.5 },
      // Knee Extensors (Pelvis to Feet) - Strong Stance Pushers!
      { id: 'm_ext_L', nodeAId: 'pelvis', nodeBId: 'foot_L', restLength: 90, contractRatio: 0.75, extendRatio: 1.25, strength: 1.5, stiffness: 0.94, maxForce: 300, maxSpeed: 3.5 },
      { id: 'm_ext_R', nodeAId: 'pelvis', nodeBId: 'foot_R', restLength: 90, contractRatio: 0.75, extendRatio: 1.25, strength: 1.5, stiffness: 0.94, maxForce: 300, maxSpeed: 3.5 },
      // Shin Stride Kickers (Knee to contralateral Knee)
      { id: 'm_stride', nodeAId: 'knee_L', nodeBId: 'knee_R', restLength: 40, contractRatio: 0.6, extendRatio: 1.5, strength: 1.1, stiffness: 0.85, maxForce: 200, maxSpeed: 3.0 },
    ],
    jointLimits: [
      // Left Knee hinge stop (bends between 30° and 160°, stopping backwards hyperextension)
      { id: 'jl_knee_L', nodeAId: 'pelvis', centerNodeId: 'knee_L', nodeBId: 'foot_L', minAngle: 35, maxAngle: 160, stiffness: 0.95 },
      // Right Knee hinge stop
      { id: 'jl_knee_R', nodeAId: 'pelvis', centerNodeId: 'knee_R', nodeBId: 'foot_R', minAngle: 35, maxAngle: 160, stiffness: 0.95 },
      // Torso to pelvis upright alignment
      { id: 'jl_spine', nodeAId: 'head', centerNodeId: 'torso', nodeBId: 'pelvis', minAngle: 160, maxAngle: 180, stiffness: 0.95 },
    ],
    colorTheme: '#38bdf8',
    createdAt: Date.now(),
  },
  {
    id: 'cheetah_quad',
    name: 'Cheetah Quad',
    nodes: [
      { id: 'head', x: 275, y: 375, mass: 1.1, friction: 0.4, radius: 12, role: 'head', hasEye: true, color: '#facc15' },
      { id: 'shoulder', x: 235, y: 395, mass: 2.2, friction: 0.5, radius: 13, role: 'torso', color: '#f59e0b' },
      { id: 'pelvis', x: 145, y: 400, mass: 2.2, friction: 0.5, radius: 13, role: 'torso', color: '#ea580c' },
      // Front Leg
      { id: 'knee_F', x: 245, y: 445, mass: 0.9, friction: 0.6, radius: 8, role: 'joint', color: '#10b981' },
      { id: 'paw_F', x: 250, y: 495, mass: 1.4, friction: 0.98, radius: 9, role: 'foot', color: '#059669' },
      // Back Leg
      { id: 'knee_B', x: 135, y: 445, mass: 0.9, friction: 0.6, radius: 8, role: 'joint', color: '#8b5cf6' },
      { id: 'paw_B', x: 125, y: 495, mass: 1.4, friction: 0.98, radius: 9, role: 'foot', color: '#6d28d9' },
    ],
    bones: [
      { id: 'b_neck', nodeAId: 'head', nodeBId: 'shoulder', thickness: 6 },
      { id: 'b_spine', nodeAId: 'shoulder', nodeBId: 'pelvis', thickness: 8 },
      { id: 'b_f_thigh', nodeAId: 'shoulder', nodeBId: 'knee_F', thickness: 5 },
      { id: 'b_f_shin', nodeAId: 'knee_F', nodeBId: 'paw_F', thickness: 4 },
      { id: 'b_b_thigh', nodeAId: 'pelvis', nodeBId: 'knee_B', thickness: 5 },
      { id: 'b_b_shin', nodeAId: 'knee_B', nodeBId: 'paw_B', thickness: 4 },
    ],
    muscles: [
      { id: 'm_spine', nodeAId: 'head', nodeBId: 'pelvis', restLength: 132, contractRatio: 0.75, extendRatio: 1.25, strength: 1.4, stiffness: 0.9, maxForce: 250, maxSpeed: 3.5 },
      { id: 'm_front_swing', nodeAId: 'head', nodeBId: 'knee_F', restLength: 76, contractRatio: 0.7, extendRatio: 1.3, strength: 1.2, stiffness: 0.88, maxForce: 220, maxSpeed: 3.5 },
      { id: 'm_front_push', nodeAId: 'pelvis', nodeBId: 'paw_F', restLength: 141, contractRatio: 0.72, extendRatio: 1.28, strength: 1.4, stiffness: 0.92, maxForce: 270, maxSpeed: 3.5 },
      { id: 'm_back_swing', nodeAId: 'shoulder', nodeBId: 'knee_B', restLength: 111, contractRatio: 0.7, extendRatio: 1.3, strength: 1.3, stiffness: 0.88, maxForce: 220, maxSpeed: 3.5 },
      { id: 'm_back_drive', nodeAId: 'pelvis', nodeBId: 'paw_B', restLength: 97, contractRatio: 0.7, extendRatio: 1.35, strength: 1.5, stiffness: 0.94, maxForce: 290, maxSpeed: 3.8 },
    ],
    jointLimits: [
      { id: 'jl_spine', nodeAId: 'head', centerNodeId: 'shoulder', nodeBId: 'pelvis', minAngle: 145, maxAngle: 178, stiffness: 0.92 },
      { id: 'jl_knee_F', nodeAId: 'shoulder', centerNodeId: 'knee_F', nodeBId: 'paw_F', minAngle: 40, maxAngle: 165, stiffness: 0.95 },
      { id: 'jl_knee_B', nodeAId: 'pelvis', centerNodeId: 'knee_B', nodeBId: 'paw_B', minAngle: 40, maxAngle: 165, stiffness: 0.95 },
    ],
    colorTheme: '#f59e0b',
    createdAt: Date.now(),
  },
  {
    id: 'lizard_crawler',
    name: 'Gecko Crawler',
    nodes: [
      { id: 'head', x: 260, y: 440, mass: 1.1, friction: 0.4, radius: 12, role: 'head', hasEye: true, color: '#10b981' },
      { id: 'mid_body', x: 200, y: 445, mass: 2.6, friction: 0.5, radius: 14, role: 'torso', color: '#34d399' },
      { id: 'tail_base', x: 140, y: 445, mass: 1.6, friction: 0.5, radius: 11, role: 'torso', color: '#059669' },
      { id: 'paw_F', x: 240, y: 495, mass: 1.4, friction: 0.98, radius: 9, role: 'foot', color: '#047857' },
      { id: 'paw_R', x: 150, y: 495, mass: 1.4, friction: 0.98, radius: 9, role: 'foot', color: '#065f46' },
    ],
    bones: [
      { id: 'b_front_spine', nodeAId: 'head', nodeBId: 'mid_body', thickness: 7 },
      { id: 'b_rear_spine', nodeAId: 'mid_body', nodeBId: 'tail_base', thickness: 7 },
      { id: 'b_f_leg', nodeAId: 'head', nodeBId: 'paw_F', thickness: 5 },
      { id: 'b_r_leg', nodeAId: 'tail_base', nodeBId: 'paw_R', thickness: 5 },
      { id: 'b_belly_truss', nodeAId: 'mid_body', nodeBId: 'paw_F', thickness: 4 },
    ],
    muscles: [
      { id: 'm_lateral_R', nodeAId: 'mid_body', nodeBId: 'paw_R', restLength: 70, contractRatio: 0.65, extendRatio: 1.35, strength: 1.3, stiffness: 0.9, maxForce: 230, maxSpeed: 3.5 },
      { id: 'm_crawl_stride', nodeAId: 'paw_F', nodeBId: 'paw_R', restLength: 90, contractRatio: 0.62, extendRatio: 1.42, strength: 1.4, stiffness: 0.92, maxForce: 250, maxSpeed: 3.5 },
      { id: 'm_spine_undulate', nodeAId: 'head', nodeBId: 'tail_base', restLength: 120, contractRatio: 0.75, extendRatio: 1.25, strength: 1.3, stiffness: 0.9, maxForce: 240, maxSpeed: 3.5 },
    ],
    jointLimits: [
      { id: 'jl_spine', nodeAId: 'head', centerNodeId: 'mid_body', nodeBId: 'tail_base', minAngle: 140, maxAngle: 180, stiffness: 0.95 },
    ],
    colorTheme: '#10b981',
    createdAt: Date.now(),
  },
  {
    id: 'kangaroo_hopper',
    name: 'Kangaroo Hopper',
    nodes: [
      { id: 'head', x: 225, y: 330, mass: 1.0, friction: 0.4, radius: 13, role: 'head', hasEye: true, color: '#ec4899' },
      { id: 'torso', x: 195, y: 385, mass: 2.8, friction: 0.5, radius: 15, role: 'torso', color: '#f472b6' },
      { id: 'knee', x: 175, y: 440, mass: 1.0, friction: 0.6, radius: 9, role: 'joint', color: '#db2777' },
      { id: 'paw', x: 215, y: 495, mass: 1.6, friction: 0.98, radius: 11, role: 'foot', color: '#be185d' },
      { id: 'tail', x: 125, y: 465, mass: 1.6, friction: 0.85, radius: 10, role: 'foot', color: '#f9a8d4' },
    ],
    bones: [
      { id: 'b_neck', nodeAId: 'head', nodeBId: 'torso', thickness: 7 },
      { id: 'b_thigh', nodeAId: 'torso', nodeBId: 'knee', thickness: 6 },
      { id: 'b_shin', nodeAId: 'knee', nodeBId: 'paw', thickness: 5 },
      { id: 'b_tail', nodeAId: 'torso', nodeBId: 'tail', thickness: 6 },
    ],
    muscles: [
      { id: 'm_tendon', nodeAId: 'torso', nodeBId: 'paw', restLength: 112, contractRatio: 0.72, extendRatio: 1.3, strength: 1.6, stiffness: 0.95, maxForce: 300, maxSpeed: 4.0 },
      { id: 'm_knee_flex', nodeAId: 'head', nodeBId: 'knee', restLength: 121, contractRatio: 0.72, extendRatio: 1.28, strength: 1.3, stiffness: 0.9, maxForce: 230, maxSpeed: 3.5 },
      { id: 'm_tail_lever', nodeAId: 'head', nodeBId: 'tail', restLength: 168, contractRatio: 0.76, extendRatio: 1.24, strength: 1.3, stiffness: 0.9, maxForce: 240, maxSpeed: 3.2 },
    ],
    jointLimits: [
      { id: 'jl_knee', nodeAId: 'torso', centerNodeId: 'knee', nodeBId: 'paw', minAngle: 35, maxAngle: 155, stiffness: 0.96 },
      { id: 'jl_tail', nodeAId: 'head', centerNodeId: 'torso', nodeBId: 'tail', minAngle: 95, maxAngle: 165, stiffness: 0.92 },
    ],
    colorTheme: '#ec4899',
    createdAt: Date.now(),
  }
];
