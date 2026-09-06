import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Move, 
  Play, 
  RotateCcw, 
  Dices, 
  Sparkles, 
  Grid, 
  Eye, 
  Activity, 
  Link as LinkIcon, 
  Download, 
  Upload,
  Info,
  Compass,
  ShieldAlert,
  Sliders,
  Scale
} from 'lucide-react';
import { BoneDef, CreatureBlueprint, JointLimitDef, MuscleDef, NodeDef, NodeRole } from '../types/creature';
import { PRESET_CREATURES } from '../utils/presets';
import { BASE_GROUND_Y } from '../physics/VerletEngine';

interface CreatureDesignerProps {
  blueprint: CreatureBlueprint;
  onChangeBlueprint: (blueprint: CreatureBlueprint) => void;
  onLaunchArena: () => void;
}

type EditorTool = 'node' | 'bone' | 'muscle' | 'limit' | 'select' | 'delete' | 'eye';

const FUN_NAMES = [
  'ApexStrider', 'VelociCheetah', 'BioRaptor', 'StrideHound', 'CyberPogo', 
  'TitanCrawler', 'KangarooMech', 'BioBiped', 'ChronoCheetah', 'AeroCrawler'
];

export const CreatureDesigner: React.FC<CreatureDesignerProps> = ({
  blueprint,
  onChangeBlueprint,
  onLaunchArena,
}) => {
  const [currentTool, setCurrentTool] = useState<EditorTool>('node');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedMuscleId, setSelectedMuscleId] = useState<string | null>(null);
  const [selectedLimitId, setSelectedLimitId] = useState<string | null>(null);
  const [connectingNodeA, setConnectingNodeA] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [testPhysics, setTestPhysics] = useState<boolean>(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Physics test preview nodes in designer
  const previewNodesRef = useRef<{ [id: string]: { x: number; y: number; px: number; py: number } }>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync test preview nodes when blueprint changes
  useEffect(() => {
    const map: { [id: string]: { x: number; y: number; px: number; py: number } } = {};
    blueprint.nodes.forEach(n => {
      map[n.id] = { x: n.x, y: n.y, px: n.x, py: n.y };
    });
    previewNodesRef.current = map;
  }, [blueprint.nodes]);

  const snap = useCallback((val: number, step = 20) => {
    return snapToGrid ? Math.round(val / step) * step : val;
  }, [snapToGrid]);

  // Center of mass calculation
  const getCenterOfMass = useCallback(() => {
    let totalMass = 0;
    let sumX = 0;
    let sumY = 0;
    blueprint.nodes.forEach(n => {
      totalMass += n.mass;
      sumX += n.x * n.mass;
      sumY += n.y * n.mass;
    });
    if (totalMass === 0) return { x: 0, y: 0, totalMass: 0 };
    return { x: sumX / totalMass, y: sumY / totalMass, totalMass };
  }, [blueprint.nodes]);

  // Random name generator
  const randomizeName = () => {
    const randomName = FUN_NAMES[Math.floor(Math.random() * FUN_NAMES.length)];
    const randomNum = Math.floor(Math.random() * 900 + 100);
    onChangeBlueprint({
      ...blueprint,
      name: `${randomName}-${randomNum}`,
    });
  };

  // Load preset
  const loadPreset = (presetId: string) => {
    const found = PRESET_CREATURES.find(p => p.id === presetId);
    if (found) {
      const cloned: CreatureBlueprint = JSON.parse(JSON.stringify(found));
      cloned.createdAt = Date.now();
      onChangeBlueprint(cloned);
      setConnectingNodeA(null);
      setSelectedNodeId(null);
      setSelectedMuscleId(null);
      setSelectedLimitId(null);
    }
  };

  // Clear creature
  const clearCreature = () => {
    if (window.confirm('Clear all nodes and limbs?')) {
      onChangeBlueprint({
        ...blueprint,
        nodes: [],
        bones: [],
        muscles: [],
        jointLimits: [],
      });
      setConnectingNodeA(null);
      setSelectedNodeId(null);
      setSelectedMuscleId(null);
      setSelectedLimitId(null);
    }
  };

  // Export JSON
  const exportBlueprint = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(blueprint, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${blueprint.name.toLowerCase().replace(/\s+/g, '_')}_blueprint.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const importBlueprint = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as CreatureBlueprint;
        if (imported.nodes && imported.bones && imported.muscles) {
          onChangeBlueprint(imported);
        } else {
          alert('Invalid creature file format.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Auto-detect joints suitable for angle limits (any node connected to 2 bones)
  const getCandidateJoints = useCallback(() => {
    const candidates: { centerId: string; nodeAId: string; nodeBId: string }[] = [];
    blueprint.nodes.forEach(center => {
      const connectedBones = blueprint.bones.filter(b => b.nodeAId === center.id || b.nodeBId === center.id);
      if (connectedBones.length >= 2) {
        for (let i = 0; i < connectedBones.length; i++) {
          for (let j = i + 1; j < connectedBones.length; j++) {
            const b1 = connectedBones[i];
            const b2 = connectedBones[j];
            const nA = b1.nodeAId === center.id ? b1.nodeBId : b1.nodeAId;
            const nB = b2.nodeAId === center.id ? b2.nodeBId : b2.nodeAId;
            if (nA !== nB) {
              candidates.push({ centerId: center.id, nodeAId: nA, nodeBId: nB });
            }
          }
        }
      }
    });
    return candidates;
  }, [blueprint.nodes, blueprint.bones]);

  // Handle canvas mouse interaction
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const clickedNode = blueprint.nodes.find(
      n => Math.hypot(n.x - mouseX, n.y - mouseY) <= (n.radius + 6)
    );

    if (testPhysics) {
      if (clickedNode) setDraggedNodeId(clickedNode.id);
      return;
    }

    if (currentTool === 'node') {
      if (!clickedNode) {
        const newNodeId = `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const isFirst = blueprint.nodes.length === 0;
        const newNode: NodeDef = {
          id: newNodeId,
          x: snap(mouseX),
          y: Math.min(BASE_GROUND_Y - 12, snap(mouseY)),
          mass: isFirst ? 2.5 : 1.2,
          friction: 0.8,
          radius: isFirst ? 14 : 11,
          role: isFirst ? 'torso' : 'joint',
          color: isFirst ? '#f59e0b' : (blueprint.colorTheme || '#38bdf8'),
          hasEye: isFirst,
        };
        onChangeBlueprint({
          ...blueprint,
          nodes: [...blueprint.nodes, newNode],
        });
        setSelectedNodeId(newNodeId);
        setSelectedMuscleId(null);
        setSelectedLimitId(null);
      } else {
        setSelectedNodeId(clickedNode.id);
      }
    } else if (currentTool === 'bone' || currentTool === 'muscle') {
      if (clickedNode) {
        if (!connectingNodeA) {
          setConnectingNodeA(clickedNode.id);
        } else if (connectingNodeA !== clickedNode.id) {
          if (currentTool === 'bone') {
            const exists = blueprint.bones.some(
              b => (b.nodeAId === connectingNodeA && b.nodeBId === clickedNode.id) ||
                   (b.nodeAId === clickedNode.id && b.nodeBId === connectingNodeA)
            );
            if (!exists) {
              const newBone: BoneDef = {
                id: `bone_${Date.now()}`,
                nodeAId: connectingNodeA,
                nodeBId: clickedNode.id,
                thickness: 6,
              };
              onChangeBlueprint({
                ...blueprint,
                bones: [...blueprint.bones, newBone],
              });
            }
          } else {
            const exists = blueprint.muscles.some(
              m => (m.nodeAId === connectingNodeA && m.nodeBId === clickedNode.id) ||
                   (m.nodeAId === clickedNode.id && m.nodeBId === connectingNodeA)
            );
            if (!exists) {
              const nA = blueprint.nodes.find(n => n.id === connectingNodeA)!;
              const nB = clickedNode;
              const dist = Math.hypot(nB.x - nA.x, nB.y - nA.y);
              const newMuscle: MuscleDef = {
                id: `muscle_${Date.now()}`,
                nodeAId: connectingNodeA,
                nodeBId: clickedNode.id,
                restLength: Math.round(dist),
                contractRatio: 0.7,
                extendRatio: 1.3,
                strength: 1.2,
                stiffness: 0.9,
                maxForce: 200,
                maxSpeed: 3.5,
                damping: 0.25,
              };
              onChangeBlueprint({
                ...blueprint,
                muscles: [...blueprint.muscles, newMuscle],
              });
              setSelectedMuscleId(newMuscle.id);
            }
          }
          setConnectingNodeA(null);
        }
      } else {
        setConnectingNodeA(null);
      }
    } else if (currentTool === 'limit') {
      if (clickedNode) {
        // Find if this node already has joint limits or can form one
        const candidates = getCandidateJoints().filter(c => c.centerId === clickedNode.id);
        if (candidates.length > 0) {
          const candidate = candidates[0];
          const existing = blueprint.jointLimits?.find(
            jl => jl.centerNodeId === clickedNode.id
          );
          if (existing) {
            setSelectedLimitId(existing.id);
          } else {
            // Create new joint limit
            const newLimit: JointLimitDef = {
              id: `limit_${Date.now()}`,
              nodeAId: candidate.nodeAId,
              centerNodeId: candidate.centerId,
              nodeBId: candidate.nodeBId,
              minAngle: 35,
              maxAngle: 155,
              stiffness: 0.9,
            };
            onChangeBlueprint({
              ...blueprint,
              jointLimits: [...(blueprint.jointLimits || []), newLimit],
            });
            setSelectedLimitId(newLimit.id);
          }
          setSelectedNodeId(clickedNode.id);
        } else {
          alert('To add an angle limit, the joint node must connect at least 2 rigid bones!');
        }
      }
    } else if (currentTool === 'eye') {
      if (clickedNode) {
        onChangeBlueprint({
          ...blueprint,
          nodes: blueprint.nodes.map(n => 
            n.id === clickedNode.id ? { ...n, hasEye: !n.hasEye } : n
          ),
        });
      }
    } else if (currentTool === 'select') {
      if (clickedNode) {
        setSelectedNodeId(clickedNode.id);
        setDraggedNodeId(clickedNode.id);
        setSelectedMuscleId(null);
      } else {
        setSelectedNodeId(null);
      }
    } else if (currentTool === 'delete') {
      if (clickedNode) {
        onChangeBlueprint({
          ...blueprint,
          nodes: blueprint.nodes.filter(n => n.id !== clickedNode.id),
          bones: blueprint.bones.filter(b => b.nodeAId !== clickedNode.id && b.nodeBId !== clickedNode.id),
          muscles: blueprint.muscles.filter(m => m.nodeAId !== clickedNode.id && m.nodeBId !== clickedNode.id),
          jointLimits: (blueprint.jointLimits || []).filter(
            jl => jl.nodeAId !== clickedNode.id && jl.centerNodeId !== clickedNode.id && jl.nodeBId !== clickedNode.id
          ),
        });
        if (selectedNodeId === clickedNode.id) setSelectedNodeId(null);
        if (connectingNodeA === clickedNode.id) setConnectingNodeA(null);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggedNodeId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (testPhysics) {
      const pNode = previewNodesRef.current[draggedNodeId];
      if (pNode) {
        pNode.x = mouseX;
        pNode.y = mouseY;
        pNode.px = mouseX;
        pNode.py = mouseY;
      }
    } else {
      onChangeBlueprint({
        ...blueprint,
        nodes: blueprint.nodes.map(n => 
          n.id === draggedNodeId 
            ? { ...n, x: snap(mouseX), y: Math.min(BASE_GROUND_Y - n.radius, snap(mouseY)) } 
            : n
        ),
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggedNodeId(null);
  };

  // Test Physics Sandbox with Realistic Limits in Designer
  useEffect(() => {
    if (!testPhysics) return;
    let animId: number;

    const loop = () => {
      const pNodes = previewNodesRef.current;
      const dt = 1 / 60;
      const gravity = 880;

      for (const id in pNodes) {
        if (id === draggedNodeId) continue;
        const n = pNodes[id];
        const vx = (n.x - n.px) * 0.98;
        const vy = (n.y - n.py) * 0.98;
        n.px = n.x;
        n.py = n.y;
        n.x += vx;
        n.y += vy + gravity * dt * dt;

        if (n.y > BASE_GROUND_Y - 12) {
          n.y = BASE_GROUND_Y - 12;
          n.py = n.y; // zero vertical bounce
          const cvx = n.x - n.px;
          n.px = n.x - cvx * 0.3;
        }
      }

      for (let iter = 0; iter < 10; iter++) {
        // Bones
        for (const b of blueprint.bones) {
          const nA = pNodes[b.nodeAId];
          const nB = pNodes[b.nodeBId];
          if (!nA || !nB) continue;
          const dx = nB.x - nA.x;
          const dy = nB.y - nA.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          const origA = blueprint.nodes.find(n => n.id === b.nodeAId)!;
          const origB = blueprint.nodes.find(n => n.id === b.nodeBId)!;
          const target = Math.hypot(origB.x - origA.x, origB.y - origA.y);
          const diff = (dist - target) / dist;

          if (b.nodeAId !== draggedNodeId) {
            nA.x += dx * diff * 0.5;
            nA.y += dy * diff * 0.5;
          }
          if (b.nodeBId !== draggedNodeId) {
            nB.x -= dx * diff * 0.5;
            nB.y -= dy * diff * 0.5;
          }
        }

        // Joint limits in preview!
        if (blueprint.jointLimits) {
          for (const jl of blueprint.jointLimits) {
            const nA = pNodes[jl.nodeAId];
            const nC = pNodes[jl.centerNodeId];
            const nB = pNodes[jl.nodeBId];
            if (!nA || !nC || !nB) continue;

            const vAx = nA.x - nC.x;
            const vAy = nA.y - nC.y;
            const vBx = nB.x - nC.x;
            const vBy = nB.y - nC.y;

            const lenA = Math.hypot(vAx, vAy) || 0.001;
            const lenB = Math.hypot(vBx, vBy) || 0.001;

            const dot = (vAx * vBx + vAy * vBy) / (lenA * lenB);
            const clampedDot = Math.max(-1, Math.min(1, dot));
            const angle = Math.acos(clampedDot);

            const minRad = (jl.minAngle * Math.PI) / 180;
            const maxRad = (jl.maxAngle * Math.PI) / 180;

            let correctionAngle = 0;
            if (angle < minRad) correctionAngle = minRad - angle;
            else if (angle > maxRad) correctionAngle = maxRad - angle;

            if (Math.abs(correctionAngle) > 0.005) {
              const cross = vAx * vBy - vAy * vBx;
              const sign = cross >= 0 ? 1 : -1;
              const halfCorr = (correctionAngle * 0.45 * (jl.stiffness || 0.85)) * sign;

              const cosA = Math.cos(-halfCorr);
              const sinA = Math.sin(-halfCorr);
              const newAx = nC.x + (vAx * cosA - vAy * sinA);
              const newAy = nC.y + (vAx * sinA + vAy * cosA);

              const cosB = Math.cos(halfCorr);
              const sinB = Math.sin(halfCorr);
              const newBx = nC.x + (vBx * cosB - vBy * sinB);
              const newBy = nC.y + (vBx * sinB + vBy * cosB);

              if (jl.nodeAId !== draggedNodeId) {
                nA.x += (newAx - nA.x) * 0.5;
                nA.y += (newAy - nA.y) * 0.5;
              }
              if (jl.nodeBId !== draggedNodeId) {
                nB.x += (newBx - nB.x) * 0.5;
                nB.y += (newBy - nB.y) * 0.5;
              }
            }
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [testPhysics, blueprint, draggedNodeId]);

  // Main Canvas Rendering for Designer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // 1. Grid
      ctx.strokeStyle = '#151d2c';
      ctx.lineWidth = 1;
      const gridSize = 20;

      ctx.beginPath();
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Major grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= width; x += gridSize * 5) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += gridSize * 5) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 2. Ground Line
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, BASE_GROUND_Y);
      ctx.lineTo(width, BASE_GROUND_Y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(0, BASE_GROUND_Y, width, height - BASE_GROUND_Y);

      ctx.fillStyle = '#10b981';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('GROUND SURFACE (INELASTIC CONTACT)', 20, BASE_GROUND_Y + 20);

      const getNodePos = (id: string) => {
        if (testPhysics && previewNodesRef.current[id]) {
          return previewNodesRef.current[id];
        }
        const found = blueprint.nodes.find(n => n.id === id);
        return found ? { x: found.x, y: found.y } : { x: 0, y: 0 };
      };

      // 3. Draw Joint Angle Limit Arcs (Ligaments)
      if (blueprint.jointLimits) {
        blueprint.jointLimits.forEach(jl => {
          const pA = getNodePos(jl.nodeAId);
          const pC = getNodePos(jl.centerNodeId);
          const pB = getNodePos(jl.nodeBId);

          const isSelected = selectedLimitId === jl.id;

          const angleA = Math.atan2(pA.y - pC.y, pA.x - pC.x);
          const angleB = Math.atan2(pB.y - pC.y, pB.x - pC.x);

          // Draw limit arc wedge around joint
          ctx.save();
          ctx.beginPath();
          ctx.arc(pC.x, pC.y, 28, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected ? '#a855f7' : 'rgba(168, 85, 247, 0.4)';
          ctx.lineWidth = isSelected ? 3 : 1.5;
          ctx.stroke();

          // Limit label
          ctx.fillStyle = isSelected ? '#c084fc' : '#a855f7';
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${jl.minAngle}°–${jl.maxAngle}°`, pC.x, pC.y - 32);
          ctx.restore();
        });
      }

      // 4. Draw Muscles (Contractile Springs)
      blueprint.muscles.forEach(m => {
        const pA = getNodePos(m.nodeAId);
        const pB = getNodePos(m.nodeBId);
        const isSelected = selectedMuscleId === m.id;

        ctx.save();
        ctx.strokeStyle = isSelected ? '#f43f5e' : '#ec4899';
        ctx.lineWidth = isSelected ? 5 : 3.5;
        ctx.lineCap = 'round';
        ctx.setLineDash([7, 4]);

        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
        ctx.restore();

        // Muscle force label
        const midX = (pA.x + pB.x) / 2;
        const midY = (pA.y + pB.y) / 2;
        ctx.fillStyle = '#f472b6';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${m.maxForce || 200}N`, midX, midY - 6);
      });

      // 5. Draw Rigid Bones
      blueprint.bones.forEach(b => {
        const pA = getNodePos(b.nodeAId);
        const pB = getNodePos(b.nodeBId);

        ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = (b.thickness || 6) + 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = b.thickness || 6;
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
      });

      // 6. Draw Nodes
      blueprint.nodes.forEach(n => {
        const pos = getNodePos(n.id);
        const isSelected = selectedNodeId === n.id;
        const isConnecting = connectingNodeA === n.id;

        // Selection halo
        if (isSelected || isConnecting) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, n.radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = isConnecting ? 'rgba(236, 72, 153, 0.35)' : 'rgba(56, 189, 248, 0.35)';
          ctx.fill();
        }

        // Node fill
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, n.radius, 0, Math.PI * 2);
        let nodeColor = n.color || '#38bdf8';
        if (n.role === 'head') nodeColor = '#f43f5e';
        else if (n.role === 'torso') nodeColor = '#f59e0b';
        else if (n.role === 'foot') nodeColor = '#10b981';

        ctx.fillStyle = nodeColor;
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Eye
        if (n.hasEye) {
          ctx.beginPath();
          ctx.arc(pos.x + 3, pos.y - 2, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(pos.x + 4.5, pos.y - 2, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#0f172a';
          ctx.fill();
        }

        // Foot rubber grip pad badge
        if (n.role === 'foot') {
          ctx.fillStyle = '#047857';
          ctx.fillRect(pos.x - 7, pos.y + n.radius - 2, 14, 3);
        }

        // Role & ID badge
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(n.role ? n.role.toUpperCase() : n.id.split('_')[0], pos.x, pos.y + n.radius + 12);
      });

      // 7. Draw Center of Mass (CoM) Crosshair and Plumb Line
      const com = getCenterOfMass();
      if (com.totalMass > 0) {
        // Vertical plumb line down to ground
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(com.x, com.y);
        ctx.lineTo(com.x, BASE_GROUND_Y);
        ctx.stroke();
        ctx.restore();

        // CoM Circle Crosshair
        ctx.beginPath();
        ctx.arc(com.x, com.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crosshair lines
        ctx.beginPath();
        ctx.moveTo(com.x - 12, com.y);
        ctx.lineTo(com.x + 12, com.y);
        ctx.moveTo(com.x, com.y - 12);
        ctx.lineTo(com.x, com.y + 12);
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`CoM (${com.totalMass.toFixed(1)}kg)`, com.x + 14, com.y + 3);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [blueprint, selectedNodeId, selectedMuscleId, selectedLimitId, connectingNodeA, currentTool, testPhysics, getCenterOfMass]);

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] text-slate-100 select-none">
      {/* Top Banner Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#0e1422] gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={blueprint.name}
              onChange={(e) => onChangeBlueprint({ ...blueprint, name: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-bold text-slate-100 text-sm focus:border-cyan-500 focus:outline-none w-48 shadow-inner"
              placeholder="Name your creature..."
            />
            <button
              onClick={randomizeName}
              title="Generate random name"
              className="absolute right-2 text-slate-400 hover:text-cyan-400 p-1"
            >
              <Dices size={15} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Presets:</span>
            <select
              onChange={(e) => loadPreset(e.target.value)}
              defaultValue=""
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="" disabled>Load anatomical preset...</option>
              {PRESET_CREATURES.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Anatomy Stats */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <div>Nodes: <span className="text-cyan-400 font-bold">{blueprint.nodes.length}</span></div>
          <div>Bones: <span className="text-slate-200 font-bold">{blueprint.bones.length}</span></div>
          <div>Muscles: <span className="text-pink-400 font-bold">{blueprint.muscles.length}</span></div>
          <div>Joint Limits: <span className="text-purple-400 font-bold">{blueprint.jointLimits?.length || 0}</span></div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button onClick={exportBlueprint} title="Export creature JSON" className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition">
            <Download size={16} />
          </button>
          <label title="Import creature JSON" className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition">
            <Upload size={16} />
            <input type="file" accept=".json" onChange={importBlueprint} className="hidden" />
          </label>
          <button onClick={clearCreature} title="Clear canvas" className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 rounded-lg transition">
            <RotateCcw size={16} />
          </button>

          <button
            onClick={() => setTestPhysics(!testPhysics)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              testPhysics 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Activity size={14} />
            {testPhysics ? 'Release Test' : 'Test Physics'}
          </button>

          <button
            onClick={onLaunchArena}
            disabled={blueprint.nodes.length < 2 || blueprint.muscles.length === 0}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-lg ${
              blueprint.nodes.length >= 2 && blueprint.muscles.length > 0
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 hover:shadow-cyan-500/25 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Play size={14} fill="currentColor" />
            Enter Evolution Arena
          </button>
        </div>
      </div>

      {/* Main Designer Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbox */}
        <div className="w-16 bg-[#0e1422] border-r border-slate-800 flex flex-col items-center py-4 gap-2.5 z-10">
          <button
            onClick={() => { setCurrentTool('node'); setConnectingNodeA(null); setTestPhysics(false); }}
            title="Add Joint Node"
            className={`p-2 rounded-xl transition flex flex-col items-center gap-1 ${
              currentTool === 'node' && !testPhysics ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Plus size={17} />
            <span className="text-[9px] font-medium">Node</span>
          </button>

          <button
            onClick={() => { setCurrentTool('bone'); setConnectingNodeA(null); setTestPhysics(false); }}
            title="Add Rigid Bone"
            className={`p-2 rounded-xl transition flex flex-col items-center gap-1 ${
              currentTool === 'bone' && !testPhysics ? 'bg-slate-200 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <LinkIcon size={17} />
            <span className="text-[9px] font-medium">Bone</span>
          </button>

          <button
            onClick={() => { setCurrentTool('muscle'); setConnectingNodeA(null); setTestPhysics(false); }}
            title="Add Muscle (Contractile Spring)"
            className={`p-2 rounded-xl transition flex flex-col items-center gap-1 ${
              currentTool === 'muscle' && !testPhysics ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Activity size={17} />
            <span className="text-[9px] font-medium">Muscle</span>
          </button>

          <button
            onClick={() => { setCurrentTool('limit'); setConnectingNodeA(null); setTestPhysics(false); }}
            title="Joint Angle Limit (Stops Flipping & Hyperextension)"
            className={`p-2 rounded-xl transition flex flex-col items-center gap-1 ${
              currentTool === 'limit' && !testPhysics ? 'bg-purple-500 text-white shadow-md' : 'text-purple-400 hover:bg-slate-800'
            }`}
          >
            <Compass size={17} />
            <span className="text-[9px] font-medium">Limit</span>
          </button>

          <button
            onClick={() => { setCurrentTool('eye'); setConnectingNodeA(null); setTestPhysics(false); }}
            title="Toggle Sensory Eye"
            className={`p-2 rounded-xl transition flex flex-col items-center gap-1 ${
              currentTool === 'eye' && !testPhysics ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Eye size={17} />
            <span className="text-[9px] font-medium">Eye</span>
          </button>

          <button
            onClick={() => { setCurrentTool('select'); setConnectingNodeA(null); }}
            title="Select & Move"
            className={`p-2 rounded-xl transition flex flex-col items-center gap-1 ${
              currentTool === 'select' && !testPhysics ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Move size={17} />
            <span className="text-[9px] font-medium">Move</span>
          </button>

          <button
            onClick={() => { setCurrentTool('delete'); setConnectingNodeA(null); setTestPhysics(false); }}
            title="Erase"
            className={`p-2 rounded-xl transition flex flex-col items-center gap-1 ${
              currentTool === 'delete' && !testPhysics ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Trash2 size={17} />
            <span className="text-[9px] font-medium">Erase</span>
          </button>

          <div className="w-8 h-[1px] bg-slate-800 my-1" />

          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            title={`Snap to Grid: ${snapToGrid ? 'ON' : 'OFF'}`}
            className={`p-2 rounded-lg transition ${
              snapToGrid ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/40' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Grid size={16} />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-[#090d16] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={920}
            height={600}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="cursor-crosshair border border-slate-800/60 rounded-xl shadow-2xl bg-[#090d16]"
          />

          {/* Hint Overlay */}
          <div className="absolute top-4 left-6 pointer-events-none bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-300 shadow-lg flex items-center gap-2">
            <Info size={14} className="text-cyan-400" />
            {testPhysics ? (
              <span>Physics Sandbox Active: Drag nodes to test realistic bone limits and gravity!</span>
            ) : currentTool === 'limit' ? (
              <span>Click any joint node that connects 2 bones to configure its Min/Max bend angle!</span>
            ) : currentTool === 'node' ? (
              <span>Click on the grid to place new creature joints.</span>
            ) : currentTool === 'bone' ? (
              <span>{connectingNodeA ? 'Click a second node to connect a rigid bone.' : 'Click a first node to start bone link.'}</span>
            ) : currentTool === 'muscle' ? (
              <span>{connectingNodeA ? 'Click a second node to connect a contractile muscle.' : 'Click a first node to start muscle.'}</span>
            ) : (
              <span>Click and drag nodes to adjust proportions. CoM crosshair shows balance!</span>
            )}
          </div>
        </div>

        {/* Right Inspector Sidebar */}
        <div className="w-80 bg-[#0e1422] border-l border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
            <Sliders size={14} className="text-cyan-400" /> Biomechanical Inspector
          </h3>

          {/* Joint Limit Inspector */}
          {selectedLimitId && (() => {
            const limit = (blueprint.jointLimits || []).find(l => l.id === selectedLimitId);
            if (!limit) return null;
            return (
              <div className="bg-slate-900 rounded-lg p-3 border border-purple-800/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
                    <Compass size={13} /> Joint Angle Limit
                  </span>
                  <button
                    onClick={() => {
                      onChangeBlueprint({
                        ...blueprint,
                        jointLimits: (blueprint.jointLimits || []).filter(l => l.id !== limit.id),
                      });
                      setSelectedLimitId(null);
                    }}
                    className="text-rose-400 hover:text-rose-300 text-xs"
                  >
                    Remove
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Min Bend Angle:</span>
                    <span className="text-purple-300 font-bold">{limit.minAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="120"
                    step="5"
                    value={limit.minAngle}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      onChangeBlueprint({
                        ...blueprint,
                        jointLimits: (blueprint.jointLimits || []).map(l => l.id === limit.id ? { ...l, minAngle: val } : l),
                      });
                    }}
                    className="w-full accent-purple-500 mt-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Max Extension Angle:</span>
                    <span className="text-purple-300 font-bold">{limit.maxAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="180"
                    step="5"
                    value={limit.maxAngle}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      onChangeBlueprint({
                        ...blueprint,
                        jointLimits: (blueprint.jointLimits || []).map(l => l.id === limit.id ? { ...l, maxAngle: val } : l),
                      });
                    }}
                    className="w-full accent-purple-500 mt-1"
                  />
                </div>
              </div>
            );
          })()}

          {/* Selected Node Inspector */}
          {selectedNodeId && (() => {
            const node = blueprint.nodes.find(n => n.id === selectedNodeId);
            if (!node) return null;
            return (
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400">Node: {node.id}</span>
                  <button 
                    onClick={() => {
                      onChangeBlueprint({
                        ...blueprint,
                        nodes: blueprint.nodes.filter(n => n.id !== node.id),
                        bones: blueprint.bones.filter(b => b.nodeAId !== node.id && b.nodeBId !== node.id),
                        muscles: blueprint.muscles.filter(m => m.nodeAId !== node.id && m.nodeBId !== node.id),
                        jointLimits: (blueprint.jointLimits || []).filter(l => l.centerNodeId !== node.id && l.nodeAId !== node.id && l.nodeBId !== node.id),
                      });
                      setSelectedNodeId(null);
                    }}
                    className="text-rose-400 hover:text-rose-300 text-xs"
                  >
                    Delete
                  </button>
                </div>

                {/* Node Role Selector */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Anatomical Role:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['head', 'torso', 'joint', 'foot'] as NodeRole[]).map(role => (
                      <button
                        key={role}
                        onClick={() => {
                          onChangeBlueprint({
                            ...blueprint,
                            nodes: blueprint.nodes.map(n => n.id === node.id ? { ...n, role } : n),
                          });
                        }}
                        className={`px-2 py-1 text-xs rounded font-medium capitalize border transition ${
                          node.role === role 
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-300' 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 flex justify-between">
                    Mass: <span className="font-bold">{node.mass.toFixed(1)}kg</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.2"
                    value={node.mass}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onChangeBlueprint({
                        ...blueprint,
                        nodes: blueprint.nodes.map(n => n.id === node.id ? { ...n, mass: val } : n),
                      });
                    }}
                    className="w-full accent-cyan-400 mt-1"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 flex justify-between">
                    Surface Friction: <span className="font-bold">{Math.round(node.friction * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={node.friction}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onChangeBlueprint({
                        ...blueprint,
                        nodes: blueprint.nodes.map(n => n.id === node.id ? { ...n, friction: val } : n),
                      });
                    }}
                    className="w-full accent-cyan-400 mt-1"
                  />
                </div>
              </div>
            );
          })()}

          {/* Selected Muscle Inspector */}
          {selectedMuscleId && (() => {
            const muscle = blueprint.muscles.find(m => m.id === selectedMuscleId);
            if (!muscle) return null;
            return (
              <div className="bg-slate-900 rounded-lg p-3 border border-pink-800/60 flex flex-col gap-3">
                <span className="text-xs font-bold text-pink-400 flex items-center gap-1">
                  <Activity size={13} /> Muscle Biomechanics
                </span>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Peak Force (Newtons):</span>
                    <span className="text-pink-300 font-bold">{muscle.maxForce || 200}N</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="400"
                    step="10"
                    value={muscle.maxForce || 200}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      onChangeBlueprint({
                        ...blueprint,
                        muscles: blueprint.muscles.map(m => m.id === muscle.id ? { ...m, maxForce: val } : m),
                      });
                    }}
                    className="w-full accent-pink-500 mt-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Contraction Speed (Vmax):</span>
                    <span className="text-pink-300 font-bold">{(muscle.maxSpeed || 3.5).toFixed(1)}x/s</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="6.0"
                    step="0.5"
                    value={muscle.maxSpeed || 3.5}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onChangeBlueprint({
                        ...blueprint,
                        muscles: blueprint.muscles.map(m => m.id === muscle.id ? { ...m, maxSpeed: val } : m),
                      });
                    }}
                    className="w-full accent-pink-500 mt-1"
                  />
                </div>
              </div>
            );
          })()}

          {/* Biomechanics Help Box */}
          <div className="bg-slate-900/90 rounded-lg p-3 text-xs text-slate-300 border border-slate-800 flex flex-col gap-2">
            <div className="font-semibold text-emerald-400 flex items-center gap-1">
              <ShieldAlert size={14} /> Anti-Glitch Physics Rules:
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li><strong>Joint Limits</strong> stop limbs from snapping backwards or spinning.</li>
              <li><strong>Hill Muscles</strong> enforce maximum Newtons so creatures can't fly.</li>
              <li><strong>Ground Restitution</strong> is zero (no rubber rocket bouncing).</li>
              <li>Airborne flight &gt;1.5s is penalized to reward genuine stepping!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
