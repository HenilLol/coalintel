'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Mountain, Network, ShieldCheck, ExternalLink, Activity, Info } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface MineNodeItem {
  id: string | number;
  name: string;
  subsidiary: string;
  state: string;
  status: string;
  type: string;
  production: number; // in MT
  reportingPeriod: string;
}

// Canonical government mine baseline nodes (used when backend list is passed or loading)
export const DEFAULT_MINE_NODES: MineNodeItem[] = [
  { id: '1', name: 'Gevra Expansion OCP', subsidiary: 'SECL', state: 'Chhattisgarh', status: 'OPERATIONAL', type: 'OPENCAST', production: 52.5, reportingPeriod: '2023-24' },
  { id: '2', name: 'Kusmunda OCP', subsidiary: 'SECL', state: 'Chhattisgarh', status: 'OPERATIONAL', type: 'OPENCAST', production: 43.2, reportingPeriod: '2023-24' },
  { id: '3', name: 'Rajmahal OCP', subsidiary: 'ECL', state: 'Jharkhand', status: 'OPERATIONAL', type: 'OPENCAST', production: 17.8, reportingPeriod: '2023-24' },
  { id: '4', name: 'Sonepur Bazari OCP', subsidiary: 'ECL', state: 'West Bengal', status: 'OPERATIONAL', type: 'OPENCAST', production: 12.4, reportingPeriod: '2023-24' },
  { id: '5', name: 'Samaleswari OCP', subsidiary: 'MCL', state: 'Odisha', status: 'OPERATIONAL', type: 'OPENCAST', production: 14.85, reportingPeriod: '2023-24' },
  { id: '6', name: 'Lakhanpur OCP', subsidiary: 'MCL', state: 'Odisha', status: 'OPERATIONAL', type: 'OPENCAST', production: 21.0, reportingPeriod: '2023-24' },
  { id: '7', name: 'Nigahi OCP', subsidiary: 'NCL', state: 'Madhya Pradesh', status: 'OPERATIONAL', type: 'OPENCAST', production: 20.5, reportingPeriod: '2023-24' },
  { id: '8', name: 'Jayant OCP', subsidiary: 'NCL', state: 'Madhya Pradesh', status: 'OPERATIONAL', type: 'OPENCAST', production: 22.1, reportingPeriod: '2023-24' },
  { id: '9', name: 'Moonidih UG Mine', subsidiary: 'BCCL', state: 'Jharkhand', status: 'OPERATIONAL', type: 'UNDERGROUND', production: 1.2, reportingPeriod: '2023-24' },
  { id: '10', name: 'Block II OCP', subsidiary: 'BCCL', state: 'Jharkhand', status: 'OPERATIONAL', type: 'OPENCAST', production: 4.8, reportingPeriod: '2023-24' },
  { id: '11', name: 'North Urimari OCP', subsidiary: 'CCL', state: 'Jharkhand', status: 'OPERATIONAL', type: 'OPENCAST', production: 6.5, reportingPeriod: '2023-24' },
  { id: '12', name: 'Amrapali OCP', subsidiary: 'CCL', state: 'Jharkhand', status: 'OPERATIONAL', type: 'OPENCAST', production: 15.2, reportingPeriod: '2023-24' },
  { id: '13', name: 'Penganga OCP', subsidiary: 'WCL', state: 'Maharashtra', status: 'OPERATIONAL', type: 'OPENCAST', production: 5.4, reportingPeriod: '2023-24' },
  { id: '14', name: 'Durgapur OCP', subsidiary: 'WCL', state: 'Maharashtra', status: 'OPERATIONAL', type: 'OPENCAST', production: 3.8, reportingPeriod: '2023-24' },
  { id: '15', name: 'CMPDI Regional Institute I', subsidiary: 'CMPDI', state: 'West Bengal', status: 'EXPLORATION', type: 'EXPLORATION', production: 0, reportingPeriod: '2023-24' },
];

const SUBSIDIARY_COLORS: Record<string, number> = {
  SECL: 0x14b8a6, // Terrain Teal
  ECL: 0xc58b3a,  // Geological Amber
  MCL: 0x3b82f6,  // Intelligence Blue
  NCL: 0xea580c,  // Earth Orange
  BCCL: 0x8b5cf6, // Geological Purple
  CCL: 0x10b981,  // Verified Green
  WCL: 0xd97706,  // Warm Amber
  CMPDI: 0x64748b,// Slate
};

interface Props {
  mines?: MineNodeItem[];
  onSelectMine?: (mine: MineNodeItem) => void;
  className?: string;
}

export const MineNodes3D: React.FC<Props> = ({
  mines = DEFAULT_MINE_NODES,
  onSelectMine,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoveredMine, setHoveredMine] = useState<MineNodeItem | null>(null);
  const [selectedMine, setSelectedMine] = useState<MineNodeItem | null>(mines[0] || null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 14);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch {
      return;
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xc58b3a, 2.5, 50);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    const group = new THREE.Group();
    scene.add(group);

    // Central CIL Hub Node
    const centerGeo = new THREE.SphereGeometry(0.75, 24, 24);
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0xc58b3a,
      emissive: 0x442e12,
      metalness: 0.5,
      roughness: 0.2,
    });
    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    group.add(centerMesh);

    // Wireframe halo around central hub
    const haloGeo = new THREE.RingGeometry(1.2, 1.25, 32);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xc58b3a, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    group.add(halo);

    // Subsidiary Clusters and Mine Nodes
    const nodeMeshes: { mesh: THREE.Mesh; mine: MineNodeItem }[] = [];
    const linesMaterial = new THREE.LineBasicMaterial({
      color: 0x30383d,
      transparent: true,
      opacity: 0.45,
    });

    const subsidiaries = Array.from(new Set(mines.map((m) => m.subsidiary)));
    const subRadius = 5.5;

    subsidiaries.forEach((sub, subIdx) => {
      const angle = (subIdx / subsidiaries.length) * Math.PI * 2;
      const subX = Math.cos(angle) * subRadius;
      const subY = Math.sin(angle) * (subRadius * 0.7);
      const subZ = (Math.sin(subIdx) * 1.5);

      // Line from CIL hub to Subsidiary
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(subX, subY, subZ),
      ]);
      const line = new THREE.Line(lineGeo, linesMaterial);
      group.add(line);

      // Mines belonging to this subsidiary
      const subMines = mines.filter((m) => m.subsidiary === sub);
      subMines.forEach((mine, mIdx) => {
        const mAngle = (mIdx / Math.max(subMines.length, 1)) * Math.PI * 2 + angle;
        const mRadius = 1.2;
        const x = subX + Math.cos(mAngle) * mRadius;
        const y = subY + Math.sin(mAngle) * mRadius;
        const z = subZ + (Math.cos(mIdx) * 0.8);

        const nodeColor = SUBSIDIARY_COLORS[mine.subsidiary] || 0xc58b3a;
        const radius = Math.max(0.18, Math.min(0.45, 0.18 + (mine.production / 55) * 0.25));

        const sphereGeo = new THREE.SphereGeometry(radius, 16, 16);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: nodeColor,
          emissive: nodeColor,
          emissiveIntensity: 0.3,
          roughness: 0.4,
        });

        const mesh = new THREE.Mesh(sphereGeo, sphereMat);
        mesh.position.set(x, y, z);
        group.add(mesh);

        // Branch line from subsidiary position to mine
        const branchLineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(subX, subY, subZ),
          new THREE.Vector3(x, y, z),
        ]);
        const branchLine = new THREE.Line(branchLineGeo, linesMaterial);
        group.add(branchLine);

        nodeMeshes.push({ mesh, mine });
      });
    });

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-100, -100);

    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const onPointerDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - prevMouse.x;
        const deltaY = e.clientY - prevMouse.y;
        group.rotation.y += deltaX * 0.005;
        group.rotation.x += deltaY * 0.005;
        prevMouse = { x: e.clientX, y: e.clientY };
      }

      // Check hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes.map((nm) => nm.mesh));

      if (intersects.length > 0) {
        const hit = nodeMeshes.find((nm) => nm.mesh === intersects[0].object);
        if (hit) setHoveredMine(hit.mine);
      } else {
        setHoveredMine(null);
      }
    };

    const onPointerUp = () => {
      isDragging = false;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes.map((nm) => nm.mesh));
      if (intersects.length > 0) {
        const hit = nodeMeshes.find((nm) => nm.mesh === intersects[0].object);
        if (hit) {
          setSelectedMine(hit.mine);
          if (onSelectMine) onSelectMine(hit.mine);
        }
      }
    };

    canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isDragging) {
        group.rotation.y += 0.0025;
      }

      halo.rotation.z += 0.005;

      renderer.render(scene, camera);
    };

    animate();

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      renderer.dispose();
      scene.clear();
    };
  }, [mines, onSelectMine]);

  const activeMine = hoveredMine || selectedMine;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[450px] lg:h-[500px] rounded-xl overflow-hidden bg-[#151A1D] border border-[#30383D] shadow-xl flex flex-col justify-between ${className}`}
    >
      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between p-3.5 bg-[#1C2226]/80 backdrop-blur-md border-b border-[#30383D]">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-[#C58B3A]" />
          <span className="text-xs font-bold text-[#E8ECEB] font-sans">
            3D Spatial Mine Cluster Topology
          </span>
          <Badge variant="amber" size="sm">
            {mines.length} Active Nodes
          </Badge>
        </div>
        <div className="text-[10px] font-mono text-[#9BA5A8]">
          Orbit drag enabled • Sphere size ∝ Production (MT)
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Floating Active Mine Badge Card */}
      {activeMine && (
        <div className="relative z-10 p-3 bg-[#1C2226]/95 backdrop-blur-md border-t border-[#30383D]">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="font-bold text-[#E8ECEB]">{activeMine.name}</span>
              <span className="text-[#C58B3A]">[{activeMine.subsidiary}]</span>
              <span className="text-[#9BA5A8]">• {activeMine.state}</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[#9BA5A8]">
                Type: <span className="text-[#E8ECEB] font-semibold">{activeMine.type}</span>
              </span>
              <span className="text-[#9BA5A8]">
                Output: <span className="text-[#10B981] font-bold">{activeMine.production} MT</span>
              </span>
              <span className="text-[#9BA5A8]">
                FY: <span className="text-[#C58B3A]">{activeMine.reportingPeriod}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
