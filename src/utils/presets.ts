import { CreatureBlueprint } from '../types/creature';

export const PRESET_CREATURES: CreatureBlueprint[] = [
  {
    id: 'cheetah_sprinter',
    name: 'Apex Cheetah',
    category: 'Quadruped Sprinter',
    nodes: [
      { id: 'head', x: 285, y: 375, mass: 1.0, friction: 0.4, radius: 12, role: 'head', hasEye: true, color: '#facc15' },
      { id: 'shoulder', x: 240, y: 395, mass: 2.4, friction: 0.5, radius: 13, role: 'torso', color: '#f59e0b' },
      { id: 'pelvis', x: 145, y: 400, mass: 2.4, friction: 0.5, radius: 13, role: 'torso', color: '#ea580c' },
      // Front Leg (Thigh, Knee, Shin, Paw)
      { id: 'knee_F', x: 250, y: 445, mass: 0.8, friction: 0.6, radius: 8, role: 'joint', color: '#10b981' },
      { id: 'paw_F', x: 255, y: 495, mass: 1.5, friction: 0.98, radius: 9, role: 'foot', color: '#059669' },
      // Back Leg (Thigh, Knee, Shin, Paw)
      { id: 'knee_B', x: 135, y: 445, mass: 0.8, friction: 0.6, radius: 8, role: 'joint', color: '#8b5cf6' },
      { id: 'paw_B', x: 125, y: 495, mass: 1.5, friction: 0.98, radius: 9, role: 'foot', color: '#6d28d9' },
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
      { id: 'm_f_drive', nodeAId: 'shoulder', nodeBId: 'paw_F', restLength: 100, contractRatio: 0.65, extendRatio: 1.35, strength: 2.2, stiffness: 0.95, maxForce: 350, maxSpeed: 4.2 },
      { id: 'm_b_drive', nodeAId: 'pelvis', nodeBId: 'paw_B', restLength: 100, contractRatio: 0.65, extendRatio: 1.35, strength: 2.2, stiffness: 0.95, maxForce: 350, maxSpeed: 4.2 },
      { id: 'm_spine', nodeAId: 'shoulder', nodeBId: 'pelvis', restLength: 95, contractRatio: 0.75, extendRatio: 1.25, strength: 1.8, stiffness: 0.92, maxForce: 300, maxSpeed: 4.0 },
      { id: 'm_stride', nodeAId: 'paw_F', nodeBId: 'paw_B', restLength: 130, contractRatio: 0.6, extendRatio: 1.4, strength: 2.0, stiffness: 0.94, maxForce: 320, maxSpeed: 4.0 },
    ],
    jointLimits: [
      { id: 'jl_spine', nodeAId: 'head', centerNodeId: 'shoulder', nodeBId: 'pelvis', minAngle: 145, maxAngle: 178, stiffness: 0.94 },
      { id: 'jl_knee_F', nodeAId: 'shoulder', centerNodeId: 'knee_F', nodeBId: 'paw_F', minAngle: 40, maxAngle: 165, stiffness: 0.96 },
      { id: 'jl_knee_B', nodeAId: 'pelvis', centerNodeId: 'knee_B', nodeBId: 'paw_B', minAngle: 40, maxAngle: 165, stiffness: 0.96 },
    ],
    colorTheme: '#f59e0b',
    createdAt: Date.now(),
  },
  {
    id: 'raptor_biped',
    name: 'Veloci-Raptor',
    category: 'Digitigrade Biped',
    nodes: [
      { id: 'head', x: 225, y: 315, mass: 1.1, friction: 0.4, radius: 13, role: 'head', hasEye: true, color: '#f43f5e' },
      { id: 'torso', x: 195, y: 370, mass: 2.6, friction: 0.5, radius: 14, role: 'torso', color: '#fb923c' },
      { id: 'hip', x: 190, y: 415, mass: 2.0, friction: 0.5, radius: 12, role: 'torso', color: '#ea580c' },
      // Left Leg
      { id: 'knee_L', x: 170, y: 450, mass: 0.9, friction: 0.6, radius: 8, role: 'joint', color: '#38bdf8' },
      { id: 'foot_L', x: 160, y: 495, mass: 1.5, friction: 0.98, radius: 10, role: 'foot', color: '#0284c7' },
      // Right Leg
      { id: 'knee_R', x: 215, y: 450, mass: 0.9, friction: 0.6, radius: 8, role: 'joint', color: '#a855f7' },
      { id: 'foot_R', x: 225, y: 495, mass: 1.5, friction: 0.98, radius: 10, role: 'foot', color: '#7e22ce' },
      // Balance Counter-Tail
      { id: 'tail', x: 120, y: 415, mass: 1.2, friction: 0.6, radius: 9, role: 'joint', color: '#f97316' },
    ],
    bones: [
      { id: 'b_neck', nodeAId: 'head', nodeBId: 'torso', thickness: 7 },
      { id: 'b_spine', nodeAId: 'torso', nodeBId: 'hip', thickness: 8 },
      { id: 'b_tail', nodeAId: 'hip', nodeBId: 'tail', thickness: 5 },
      // Legs
      { id: 'b_thigh_L', nodeAId: 'hip', nodeBId: 'knee_L', thickness: 6 },
      { id: 'b_shin_L', nodeAId: 'knee_L', nodeBId: 'foot_L', thickness: 5 },
      { id: 'b_thigh_R', nodeAId: 'hip', nodeBId: 'knee_R', thickness: 6 },
      { id: 'b_shin_R', nodeAId: 'knee_R', nodeBId: 'foot_R', thickness: 5 },
    ],
    muscles: [
      { id: 'm_drive_L', nodeAId: 'torso', nodeBId: 'foot_L', restLength: 130, contractRatio: 0.6, extendRatio: 1.4, strength: 2.2, stiffness: 0.96, maxForce: 360, maxSpeed: 4.2 },
      { id: 'm_drive_R', nodeAId: 'torso', nodeBId: 'foot_R', restLength: 130, contractRatio: 0.6, extendRatio: 1.4, strength: 2.2, stiffness: 0.96, maxForce: 360, maxSpeed: 4.2 },
      { id: 'm_hip_L', nodeAId: 'hip', nodeBId: 'knee_L', restLength: 45, contractRatio: 0.65, extendRatio: 1.35, strength: 1.8, stiffness: 0.92, maxForce: 280, maxSpeed: 3.8 },
      { id: 'm_hip_R', nodeAId: 'hip', nodeBId: 'knee_R', restLength: 45, contractRatio: 0.65, extendRatio: 1.35, strength: 1.8, stiffness: 0.92, maxForce: 280, maxSpeed: 3.8 },
      { id: 'm_stride', nodeAId: 'foot_L', nodeBId: 'foot_R', restLength: 100, contractRatio: 0.55, extendRatio: 1.55, strength: 2.2, stiffness: 0.95, maxForce: 340, maxSpeed: 4.2 },
      { id: 'm_tail', nodeAId: 'head', nodeBId: 'tail', restLength: 145, contractRatio: 0.75, extendRatio: 1.25, strength: 1.5, stiffness: 0.9, maxForce: 240, maxSpeed: 3.2 },
    ],
    jointLimits: [
      { id: 'jl_knee_L', nodeAId: 'hip', centerNodeId: 'knee_L', nodeBId: 'foot_L', minAngle: 35, maxAngle: 160, stiffness: 0.96 },
      { id: 'jl_knee_R', nodeAId: 'hip', centerNodeId: 'knee_R', nodeBId: 'foot_R', minAngle: 35, maxAngle: 160, stiffness: 0.96 },
      { id: 'jl_spine', nodeAId: 'head', centerNodeId: 'torso', nodeBId: 'hip', minAngle: 155, maxAngle: 180, stiffness: 0.95 },
    ],
    colorTheme: '#f43f5e',
    createdAt: Date.now(),
  },
  {
    id: 'hexapod_dasher',
    name: 'Hexapod Dasher',
    category: '6-Legged Insectoid',
    nodes: [
      // 3 Torso Segments (Front, Mid, Rear)
      { id: 'torso_F', x: 260, y: 440, mass: 1.6, friction: 0.5, radius: 12, role: 'head', hasEye: true, color: '#06b6d4' },
      { id: 'torso_M', x: 200, y: 445, mass: 2.2, friction: 0.5, radius: 13, role: 'torso', color: '#0284c7' },
      { id: 'torso_R', x: 140, y: 445, mass: 1.6, friction: 0.5, radius: 12, role: 'torso', color: '#0369a1' },
      // 6 Feet (Front L/R, Mid L/R, Rear L/R)
      { id: 'foot_F1', x: 275, y: 495, mass: 1.2, friction: 0.98, radius: 8, role: 'foot', color: '#10b981' },
      { id: 'foot_F2', x: 245, y: 495, mass: 1.2, friction: 0.98, radius: 8, role: 'foot', color: '#059669' },
      { id: 'foot_M1', x: 215, y: 495, mass: 1.2, friction: 0.98, radius: 8, role: 'foot', color: '#10b981' },
      { id: 'foot_M2', x: 185, y: 495, mass: 1.2, friction: 0.98, radius: 8, role: 'foot', color: '#059669' },
      { id: 'foot_R1', x: 155, y: 495, mass: 1.2, friction: 0.98, radius: 8, role: 'foot', color: '#10b981' },
      { id: 'foot_R2', x: 125, y: 495, mass: 1.2, friction: 0.98, radius: 8, role: 'foot', color: '#059669' },
    ],
    bones: [
      { id: 'b_spine_1', nodeAId: 'torso_F', nodeBId: 'torso_M', thickness: 8 },
      { id: 'b_spine_2', nodeAId: 'torso_M', nodeBId: 'torso_R', thickness: 8 },
      // Rigid leg struts
      { id: 'b_leg_F1', nodeAId: 'torso_F', nodeBId: 'foot_F1', thickness: 5 },
      { id: 'b_leg_F2', nodeAId: 'torso_F', nodeBId: 'foot_F2', thickness: 5 },
      { id: 'b_leg_M1', nodeAId: 'torso_M', nodeBId: 'foot_M1', thickness: 5 },
      { id: 'b_leg_M2', nodeAId: 'torso_M', nodeBId: 'foot_M2', thickness: 5 },
      { id: 'b_leg_R1', nodeAId: 'torso_R', nodeBId: 'foot_R1', thickness: 5 },
      { id: 'b_leg_R2', nodeAId: 'torso_R', nodeBId: 'foot_R2', thickness: 5 },
    ],
    muscles: [
      { id: 'm_f_drive', nodeAId: 'torso_F', nodeBId: 'foot_F2', restLength: 60, contractRatio: 0.6, extendRatio: 1.4, strength: 2.2, stiffness: 0.96, maxForce: 350, maxSpeed: 4.2 },
      { id: 'm_f_pull', nodeAId: 'torso_M', nodeBId: 'foot_F1', restLength: 75, contractRatio: 0.6, extendRatio: 1.4, strength: 2.2, stiffness: 0.96, maxForce: 350, maxSpeed: 4.2 },
      { id: 'm_r_drive', nodeAId: 'torso_R', nodeBId: 'foot_R2', restLength: 60, contractRatio: 0.6, extendRatio: 1.4, strength: 2.2, stiffness: 0.96, maxForce: 350, maxSpeed: 4.2 },
      { id: 'm_r_push', nodeAId: 'torso_M', nodeBId: 'foot_R1', restLength: 75, contractRatio: 0.6, extendRatio: 1.4, strength: 2.2, stiffness: 0.96, maxForce: 350, maxSpeed: 4.2 },
      { id: 'm_long_stride', nodeAId: 'foot_F1', nodeBId: 'foot_R2', restLength: 150, contractRatio: 0.6, extendRatio: 1.45, strength: 2.4, stiffness: 0.96, maxForce: 380, maxSpeed: 4.5 },
      { id: 'm_long_stride2', nodeAId: 'foot_F2', nodeBId: 'foot_R1', restLength: 150, contractRatio: 0.6, extendRatio: 1.45, strength: 2.4, stiffness: 0.96, maxForce: 380, maxSpeed: 4.5 },
    ],
    jointLimits: [
      { id: 'jl_spine', nodeAId: 'torso_F', centerNodeId: 'torso_M', nodeBId: 'torso_R', minAngle: 155, maxAngle: 180, stiffness: 0.96 },
    ],
    colorTheme: '#06b6d4',
    createdAt: Date.now(),
  },
  {
    id: 'kangaroo_hopper',
    name: 'Kangaroo Pogo',
    category: 'Elastic Tendon Hopper',
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
      // Powerful Achilles spring tendon
      { id: 'm_tendon', nodeAId: 'torso', nodeBId: 'paw', restLength: 112, contractRatio: 0.72, extendRatio: 1.3, strength: 1.7, stiffness: 0.96, maxForce: 340, maxSpeed: 4.2 },
      { id: 'm_knee_flex', nodeAId: 'head', nodeBId: 'knee', restLength: 121, contractRatio: 0.72, extendRatio: 1.28, strength: 1.3, stiffness: 0.9, maxForce: 240, maxSpeed: 3.5 },
      { id: 'm_tail_lever', nodeAId: 'head', nodeBId: 'tail', restLength: 168, contractRatio: 0.76, extendRatio: 1.24, strength: 1.4, stiffness: 0.9, maxForce: 260, maxSpeed: 3.2 },
    ],
    jointLimits: [
      { id: 'jl_knee', nodeAId: 'torso', centerNodeId: 'knee', nodeBId: 'paw', minAngle: 35, maxAngle: 155, stiffness: 0.96 },
      { id: 'jl_tail', nodeAId: 'head', centerNodeId: 'torso', nodeBId: 'tail', minAngle: 95, maxAngle: 165, stiffness: 0.92 },
    ],
    colorTheme: '#ec4899',
    createdAt: Date.now(),
  },
  {
    id: 'tristride_walker',
    name: 'Tri-Stride Walker',
    category: 'Tripod Kinetic Runner',
    nodes: [
      { id: 'head', x: 255, y: 375, mass: 1.2, friction: 0.4, radius: 12, role: 'head', hasEye: true, color: '#a78bfa' },
      { id: 'core', x: 200, y: 400, mass: 2.4, friction: 0.5, radius: 14, role: 'torso', color: '#8b5cf6' },
      { id: 'foot_front', x: 260, y: 495, mass: 1.4, friction: 0.98, radius: 10, role: 'foot', color: '#c4b5fd' },
      { id: 'foot_mid', x: 200, y: 495, mass: 1.4, friction: 0.98, radius: 10, role: 'foot', color: '#7c3aed' },
      { id: 'foot_rear', x: 140, y: 495, mass: 1.4, friction: 0.98, radius: 10, role: 'foot', color: '#6d28d9' },
    ],
    bones: [
      { id: 'b_neck', nodeAId: 'head', nodeBId: 'core', thickness: 7 },
      { id: 'b_leg_f', nodeAId: 'head', nodeBId: 'foot_front', thickness: 6 },
      { id: 'b_leg_m', nodeAId: 'core', nodeBId: 'foot_mid', thickness: 6 },
      { id: 'b_leg_r', nodeAId: 'core', nodeBId: 'foot_rear', thickness: 6 },
    ],
    muscles: [
      { id: 'm_stride_fm', nodeAId: 'foot_front', nodeBId: 'foot_mid', restLength: 60, contractRatio: 0.62, extendRatio: 1.42, strength: 1.8, stiffness: 0.95, maxForce: 300, maxSpeed: 4.0 },
      { id: 'm_stride_mr', nodeAId: 'foot_mid', nodeBId: 'foot_rear', restLength: 60, contractRatio: 0.62, extendRatio: 1.42, strength: 1.8, stiffness: 0.95, maxForce: 300, maxSpeed: 4.0 },
      { id: 'm_stride_fr', nodeAId: 'foot_front', nodeBId: 'foot_rear', restLength: 120, contractRatio: 0.65, extendRatio: 1.4, strength: 2.0, stiffness: 0.95, maxForce: 320, maxSpeed: 4.2 },
    ],
    jointLimits: [
      { id: 'jl_spine', nodeAId: 'head', centerNodeId: 'core', nodeBId: 'foot_rear', minAngle: 90, maxAngle: 165, stiffness: 0.94 },
    ],
    colorTheme: '#8b5cf6',
    createdAt: Date.now(),
  },
  {
    id: 'dune_hopper',
    name: 'Dune Springer',
    category: 'Tripod Sprinter',
    nodes: [
      { id: 'head', x: 250, y: 380, mass: 1.2, friction: 0.4, radius: 12, role: 'head', hasEye: true, color: '#f97316' },
      { id: 'torso', x: 200, y: 400, mass: 2.4, friction: 0.5, radius: 14, role: 'torso', color: '#ea580c' },
      { id: 'foot_F', x: 260, y: 495, mass: 1.4, friction: 0.98, radius: 9, role: 'foot', color: '#fb923c' },
      { id: 'foot_M', x: 200, y: 495, mass: 1.4, friction: 0.98, radius: 9, role: 'foot', color: '#f97316' },
      { id: 'foot_R', x: 140, y: 495, mass: 1.4, friction: 0.98, radius: 9, role: 'foot', color: '#c2410c' },
    ],
    bones: [
      { id: 'b_neck', nodeAId: 'head', nodeBId: 'torso', thickness: 7 },
      { id: 'b_leg_f', nodeAId: 'head', nodeBId: 'foot_F', thickness: 6 },
      { id: 'b_leg_m', nodeAId: 'torso', nodeBId: 'foot_M', thickness: 6 },
      { id: 'b_leg_r', nodeAId: 'torso', nodeBId: 'foot_R', thickness: 6 },
    ],
    muscles: [
      { id: 'm_stride_fm', nodeAId: 'foot_F', nodeBId: 'foot_M', restLength: 60, contractRatio: 0.62, extendRatio: 1.42, strength: 1.8, stiffness: 0.95, maxForce: 300, maxSpeed: 4.0 },
      { id: 'm_stride_mr', nodeAId: 'foot_M', nodeBId: 'foot_R', restLength: 60, contractRatio: 0.62, extendRatio: 1.42, strength: 1.8, stiffness: 0.95, maxForce: 300, maxSpeed: 4.0 },
      { id: 'm_stride_fr', nodeAId: 'foot_F', nodeBId: 'foot_R', restLength: 120, contractRatio: 0.65, extendRatio: 1.4, strength: 2.0, stiffness: 0.95, maxForce: 320, maxSpeed: 4.2 },
    ],
    jointLimits: [
      { id: 'jl_spine', nodeAId: 'head', centerNodeId: 'torso', nodeBId: 'foot_R', minAngle: 90, maxAngle: 165, stiffness: 0.94 },
    ],
    colorTheme: '#f97316',
    createdAt: Date.now(),
  },
  {
    id: 'mantis_runner',
    name: 'Giant Mantis',
    category: 'Insectoid Puller',
    nodes: [
      { id: 'head', x: 270, y: 350, mass: 1.0, friction: 0.4, radius: 12, role: 'head', hasEye: true, color: '#10b981' },
      { id: 'thorax', x: 230, y: 390, mass: 2.2, friction: 0.5, radius: 13, role: 'torso', color: '#059669' },
      { id: 'abdomen', x: 150, y: 410, mass: 2.4, friction: 0.5, radius: 14, role: 'torso', color: '#047857' },
      // Front Scythe Claw (Reach & Pull)
      { id: 'claw_elbow', x: 280, y: 420, mass: 0.8, friction: 0.6, radius: 8, role: 'joint', color: '#34d399' },
      { id: 'claw_tip', x: 295, y: 495, mass: 1.4, friction: 0.98, radius: 9, role: 'foot', color: '#10b981' },
      // Rear Push Legs
      { id: 'knee_R', x: 140, y: 450, mass: 0.8, friction: 0.6, radius: 8, role: 'joint', color: '#34d399' },
      { id: 'paw_R', x: 130, y: 495, mass: 1.5, friction: 0.98, radius: 9, role: 'foot', color: '#059669' },
    ],
    bones: [
      { id: 'b_neck', nodeAId: 'head', nodeBId: 'thorax', thickness: 7 },
      { id: 'b_body', nodeAId: 'thorax', nodeBId: 'abdomen', thickness: 8 },
      // Front Scythe
      { id: 'b_arm', nodeAId: 'thorax', nodeBId: 'claw_elbow', thickness: 6 },
      { id: 'b_claw', nodeAId: 'claw_elbow', nodeBId: 'claw_tip', thickness: 5 },
      // Rear Leg
      { id: 'b_r_thigh', nodeAId: 'abdomen', nodeBId: 'knee_R', thickness: 5 },
      { id: 'b_r_shin', nodeAId: 'knee_R', nodeBId: 'paw_R', thickness: 5 },
    ],
    muscles: [
      // Powerful front claw pulling arm
      { id: 'm_pull_claw', nodeAId: 'abdomen', nodeBId: 'claw_tip', restLength: 168, contractRatio: 0.7, extendRatio: 1.35, strength: 1.6, stiffness: 0.95, maxForce: 320, maxSpeed: 4.0 },
      { id: 'm_reach_claw', nodeAId: 'head', nodeBId: 'claw_elbow', restLength: 71, contractRatio: 0.7, extendRatio: 1.35, strength: 1.3, stiffness: 0.9, maxForce: 240, maxSpeed: 3.8 },
      // Rear driving push
      { id: 'm_rear_drive', nodeAId: 'thorax', nodeBId: 'paw_R', restLength: 145, contractRatio: 0.72, extendRatio: 1.28, strength: 1.5, stiffness: 0.94, maxForce: 300, maxSpeed: 3.8 },
      { id: 'm_stride_link', nodeAId: 'claw_tip', nodeBId: 'paw_R', restLength: 165, contractRatio: 0.65, extendRatio: 1.45, strength: 1.3, stiffness: 0.9, maxForce: 250, maxSpeed: 3.5 },
    ],
    jointLimits: [
      { id: 'jl_spine', nodeAId: 'head', centerNodeId: 'thorax', nodeBId: 'abdomen', minAngle: 150, maxAngle: 180, stiffness: 0.95 },
      { id: 'jl_claw', nodeAId: 'thorax', centerNodeId: 'claw_elbow', nodeBId: 'claw_tip', minAngle: 30, maxAngle: 155, stiffness: 0.96 },
      { id: 'jl_rear', nodeAId: 'abdomen', centerNodeId: 'knee_R', nodeBId: 'paw_R', minAngle: 35, maxAngle: 160, stiffness: 0.96 },
    ],
    colorTheme: '#10b981',
    createdAt: Date.now(),
  }
];
