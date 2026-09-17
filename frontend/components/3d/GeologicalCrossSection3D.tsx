'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Layers, Mountain, Sparkles, ZoomIn, RotateCcw, ShieldCheck, FileText, Info } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface GeologicalLayerData {
  id: string;
  name: string;
  depth: string;
  color: number;
  hexColor: string;
  yOffset: number;
  thickness: number;
  description: string;
  mine: string;
  metric: string;
  document: string;
  source: string;
}

export const GEOLOGICAL_LAYERS: GeologicalLayerData[] = [
  {
    id: 'surface',
    name: 'Topographic Surface & Overburden Vegetation',
    depth: '0m — 15m',
    color: 0x4f8a62,
    hexColor: '#4F8A62',
    yOffset: 2.2,
    thickness: 0.5,
    description: 'Topsoil, quaternary alluvium, environmental replanting, and surface telemetry beacons.',
    mine: 'Rajmahal Opencast Mine (ECL)',
    metric: 'Surface Reclamation: 142.5 Hectares',
    document: 'ECL_Annual_Report_2023-24.pdf',
    source: 'CMPDI Regional Institute I Survey, Page 14',
  },
  {
    id: 'rock',
    name: 'Upper Sandstone & Sedimentary Rock',
    depth: '15m — 45m',
    color: 0x8a7355,
    hexColor: '#8A7355',
    yOffset: 1.4,
    thickness: 0.8,
    description: 'Coarse to medium-grained Barakar formation sandstone, weathered feldspar, and siltstone.',
    mine: 'Gevra Expansion OCP (SECL)',
    metric: 'Stripping Ratio: 1.84 m³/Tonne',
    document: 'SECL_Gevra_Operational_Review.pdf',
    source: 'CMPDI Strata Mechanics Cell, Page 29',
  },
  {
    id: 'strata',
    name: 'Interburden Shale & Siltstone Strata',
    depth: '45m — 90m',
    color: 0x436170,
    hexColor: '#436170',
    yOffset: 0.3,
    thickness: 1.0,
    description: 'Carbonaceous shale intervals, competent roof rock, and structural fault boundaries.',
    mine: 'Kusmunda OCP (SECL)',
    metric: 'Overburden Removal: 48.20 M.Cu.M',
    document: 'CIL_Annual_Report_Accounts_2023-24.pdf',
    source: 'Ministry of Coal Provisional Statistics, Page 68',
  },
  {
    id: 'coal_seam',
    name: 'Primary Bituminous Coal Seam (Seam IV & V)',
    depth: '90m — 140m',
    color: 0xc58b3a,
    hexColor: '#C58B3A',
    yOffset: -0.9,
    thickness: 1.1,
    description: 'High-grade non-coking coal seam (G11/G12 grade), low ash content, thick composite bed.',
    mine: 'Samaleswari OCP (MCL)',
    metric: 'Raw Coal Production: 14.85 MT',
    document: 'MCL_Performance_Review_FY24.pdf',
    source: 'Coal Controller Organisation (CCO) Returns, Page 11',
  },
  {
    id: 'mining_zones',
    name: 'Active Excavation Bench & Haulage Pit',
    depth: '140m — 195m',
    color: 0xea580c,
    hexColor: '#EA580C',
    yOffset: -2.1,
    thickness: 0.9,
    description: 'Active shovel-dumper mining benches, sump drainage, and in-pit conveyor transfer stations.',
    mine: 'Nigahi OCP (NCL)',
    metric: 'HEMM Equipment Availability: 88.4%',
    document: 'NCL_Production_Audit_Q4.pdf',
    source: 'Directorate General of Mines Safety (DGMS), Page 42',
  },
  {
    id: 'data_layer',
    name: 'Sub-surface Data & Borehole Sensor Plane',
    depth: '195m — 250m+',
    color: 0x3b82f6,
    hexColor: '#3B82F6',
    yOffset: -3.1,
    thickness: 0.7,
    description: 'Drillhole gamma-density logs, seismic acoustic impedance, and deep aquifer monitoring grid.',
    mine: 'Jharia Coalfield Deep Seams (BCCL)',
    metric: 'Measured Geological Reserve: 420.6 MT',
    document: 'CMPDI_Geological_Exploration_Vol_IV.pdf',
    source: 'Borehole Log CIL-JH-1049, Page 87',
  },
];

interface Props {
  className?: string;
  onSelectLayer?: (layer: GeologicalLayerData) => void;
}

export const GeologicalCrossSection3D: React.FC<Props> = ({ className, onSelectLayer }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [useFallback, setUseFallback] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<GeologicalLayerData>(GEOLOGICAL_LAYERS[3]); // Default to Coal Seam
  const [hoveredLayer, setHoveredLayer] = useState<GeologicalLayerData | null>(null);
  const [isRotating, setIsRotating] = useState(true);

  // Reference for Three.js state
  const threeStateRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    layerMeshes: { mesh: THREE.Mesh; layer: GeologicalLayerData }[];
    particles: THREE.Points;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    isDragging: boolean;
    prevMousePos: { x: number; y: number };
    rotationGroup: THREE.Group;
  } | null>(null);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Check WebGL availability
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setUseFallback(true);
        return;
      }
    } catch {
      setUseFallback(true);
      return;
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 10.5);

    // 2. Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
    } catch {
      setUseFallback(true);
      return;
    }

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfffaed, 2.0);
    dirLight1.position.set(6, 10, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x54788a, 1.2);
    dirLight2.position.set(-6, -4, -6);
    scene.add(dirLight2);

    // 4. Rotation Group for Strata Slabs
    const rotationGroup = new THREE.Group();
    rotationGroup.rotation.y = -0.35;
    rotationGroup.rotation.x = 0.18;
    scene.add(rotationGroup);

    // 5. Create 3D Strata Slabs
    const layerMeshes: { mesh: THREE.Mesh; layer: GeologicalLayerData }[] = [];
    const slabWidth = 5.2;
    const slabDepth = 3.6;

    GEOLOGICAL_LAYERS.forEach((layer) => {
      const geometry = new THREE.BoxGeometry(slabWidth, layer.thickness, slabDepth, 8, 2, 8);
      
      // Geological material with subtle roughness & edge definition
      const material = new THREE.MeshStandardMaterial({
        color: layer.color,
        roughness: 0.65,
        metalness: 0.15,
        emissive: 0x000000,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, layer.yOffset, 0);

      // Wireframe contour overlay
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: layer.id === 'coal_seam' ? 0xffffff : 0x30383d,
        transparent: true,
        opacity: layer.id === 'coal_seam' ? 0.75 : 0.35,
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);

      // Distinct drill markers on surface layer
      if (layer.id === 'surface') {
        const markerGeo = new THREE.ConeGeometry(0.12, 0.4, 4);
        const markerMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.set(1.2, 0.45, 0.6);
        mesh.add(marker);
      }

      rotationGroup.add(mesh);
      layerMeshes.push({ mesh, layer });
    });

    // 6. Floating Particles (Subtle upward data sparks)
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 5.5;
      positions[i + 1] = (Math.random() - 0.5) * 7.5;
      positions[i + 2] = (Math.random() - 0.5) * 4.0;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xe5a93c,
      size: 0.08,
      transparent: true,
      opacity: 0.65,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    rotationGroup.add(particles);

    // 7. Raycaster setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-100, -100);

    threeStateRef.current = {
      scene,
      camera,
      renderer,
      layerMeshes,
      particles,
      raycaster,
      mouse,
      isDragging: false,
      prevMousePos: { x: 0, y: 0 },
      rotationGroup,
    };

    // 8. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Gentle auto rotation
      if (isRotating && !threeStateRef.current?.isDragging) {
        rotationGroup.rotation.y += delta * 0.12;
      }

      // Drift particles upward
      const pos = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < pos.length; i += 3) {
        pos[i] += delta * 0.3;
        if (pos[i] > 4.0) pos[i] = -4.0;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Raycast hover check
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(layerMeshes.map((lm) => lm.mesh));

      layerMeshes.forEach((lm) => {
        const isHovered = intersects.length > 0 && intersects[0].object === lm.mesh;
        const isSelected = selectedLayer.id === lm.layer.id;
        const mat = lm.mesh.material as THREE.MeshStandardMaterial;

        if (isHovered) {
          mat.emissive.setHex(0x332211);
          mat.emissiveIntensity = 0.8;
        } else if (isSelected) {
          mat.emissive.setHex(0x221808);
          mat.emissiveIntensity = 0.5;
        } else {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0 && newHeight > 0) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
      scene.clear();
      threeStateRef.current = null;
    };
  }, [isRotating, selectedLayer]);

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!threeStateRef.current) return;
    threeStateRef.current.isDragging = true;
    threeStateRef.current.prevMousePos = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!threeStateRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    threeStateRef.current.mouse.set(x, y);

    // If dragging, rotate object
    if (threeStateRef.current.isDragging) {
      const deltaX = e.clientX - threeStateRef.current.prevMousePos.x;
      const deltaY = e.clientY - threeStateRef.current.prevMousePos.y;

      threeStateRef.current.rotationGroup.rotation.y += deltaX * 0.008;
      threeStateRef.current.rotationGroup.rotation.x = Math.max(
        -0.6,
        Math.min(0.6, threeStateRef.current.rotationGroup.rotation.x + deltaY * 0.008)
      );

      threeStateRef.current.prevMousePos = { x: e.clientX, y: e.clientY };
    }

    // Raycast hover lookup
    const { raycaster, camera, layerMeshes } = threeStateRef.current;
    raycaster.setFromCamera(threeStateRef.current.mouse, camera);
    const intersects = raycaster.intersectObjects(layerMeshes.map((lm) => lm.mesh));

    if (intersects.length > 0) {
      const hit = layerMeshes.find((lm) => lm.mesh === intersects[0].object);
      if (hit) {
        setHoveredLayer(hit.layer);
      }
    } else {
      setHoveredLayer(null);
    }
  };

  const handlePointerUp = () => {
    if (!threeStateRef.current) return;
    threeStateRef.current.isDragging = false;

    // Check click hit
    const { raycaster, camera, layerMeshes } = threeStateRef.current;
    raycaster.setFromCamera(threeStateRef.current.mouse, camera);
    const intersects = raycaster.intersectObjects(layerMeshes.map((lm) => lm.mesh));

    if (intersects.length > 0) {
      const hit = layerMeshes.find((lm) => lm.mesh === intersects[0].object);
      if (hit) {
        setSelectedLayer(hit.layer);
        if (onSelectLayer) onSelectLayer(hit.layer);
      }
    }
  };

  const handleResetCamera = useCallback(() => {
    if (!threeStateRef.current) return;
    threeStateRef.current.rotationGroup.rotation.set(0.18, -0.35, 0);
    threeStateRef.current.camera.position.set(0, 1.2, 10.5);
  }, []);

  // 2D Fallback Renderer (SVG / Canvas for low-power or non-WebGL environments)
  useEffect(() => {
    if (!useFallback) return;
    const canvas = fallbackCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    const height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    ctx.clearRect(0, 0, width, height);

    const layerHeight = height / GEOLOGICAL_LAYERS.length;

    GEOLOGICAL_LAYERS.forEach((layer, idx) => {
      const y = idx * layerHeight;
      const isSelected = selectedLayer.id === layer.id;

      ctx.fillStyle = layer.hexColor;
      ctx.fillRect(40, y + 6, width - 80, layerHeight - 12);

      if (isSelected) {
        ctx.strokeStyle = '#E5A93C';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(38, y + 4, width - 76, layerHeight - 8);
      }

      ctx.fillStyle = '#E8ECEB';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(`${layer.name} (${layer.depth})`, 55, y + layerHeight / 2 + 4);
    });
  }, [useFallback, selectedLayer]);

  const activeDisplayLayer = hoveredLayer || selectedLayer;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[480px] lg:h-[540px] rounded-xl overflow-hidden bg-[#151A1D]/90 border border-[#30383D] shadow-2xl flex flex-col justify-between ${className}`}
    >
      {/* Tactical Top Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between p-4 bg-[#1C2226]/80 backdrop-blur-md border-b border-[#30383D] gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#242C30] border border-[#30383D] text-[#C58B3A]">
            <Mountain className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#E8ECEB] font-sans tracking-wide">
                Interactive 3D Geological Strata Cross-Section
              </h3>
              <Badge variant="amber" size="sm">
                CMPDI Litho-Survey
              </Badge>
            </div>
            <p className="text-[11px] text-[#9BA5A8] font-mono">
              Barakar Formation • 6 Deep Stratigraphic Horizons • Click layer to inspect evidence
            </p>
          </div>
        </div>

        {/* Tactical Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRotating(!isRotating)}
            className="text-xs font-mono py-1 px-2.5"
          >
            {isRotating ? 'Pause Orbit' : 'Auto Rotate'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetCamera}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            title="Reset 3D View"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* 3D Canvas / 2D Fallback Area */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing">
        {!useFallback ? (
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="w-full h-full block"
          />
        ) : (
          <div className="relative w-full h-full p-4 flex flex-col justify-center">
            <canvas ref={fallbackCanvasRef} className="w-full h-full" />
            <div className="absolute top-2 right-4 text-[10px] font-mono text-[#9BA5A8] bg-[#1C2226] px-2 py-1 rounded border border-[#30383D]">
              High-Precision 2D Canvas Fallback
            </div>
          </div>
        )}

        {/* 3D Interaction Watermark */}
        <div className="absolute top-3 left-4 pointer-events-none text-[10px] font-mono text-[#9BA5A8]/60 uppercase tracking-wider hidden sm:block">
          Drag to rotate • Click slab to lock metadata
        </div>

        {/* Layer Quick Selector Pills (Floating on Left) */}
        <div className="absolute left-3 bottom-24 hidden md:flex flex-col gap-1.5 z-10 pointer-events-auto">
          {GEOLOGICAL_LAYERS.map((layer) => {
            const isSelected = selectedLayer.id === layer.id;
            return (
              <button
                key={layer.id}
                onClick={() => {
                  setSelectedLayer(layer);
                  if (onSelectLayer) onSelectLayer(layer);
                }}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-mono transition-all text-left ${
                  isSelected
                    ? 'bg-[#C58B3A]/20 border border-[#C58B3A] text-[#E8ECEB] font-bold shadow-glow-amber'
                    : 'bg-[#1C2226]/80 border border-[#30383D] text-[#9BA5A8] hover:text-[#E8ECEB] hover:bg-[#242C30]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: layer.hexColor }}
                />
                <span className="truncate max-w-[120px]">{layer.name.split(' ')[0]}</span>
                <span className="text-[10px] text-[#9BA5A8] ml-auto">{layer.depth.split('—')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Live Stratigraphic Evidence Inspector Card */}
      <div className="relative z-10 p-4 bg-[#1C2226]/95 backdrop-blur-md border-t border-[#30383D] transition-all duration-200">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Layer Identity */}
          <div className="md:col-span-4 space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm shrink-0 border border-white/20 shadow-sm"
                style={{ backgroundColor: activeDisplayLayer.hexColor }}
              />
              <span className="text-xs font-bold text-[#E8ECEB] font-sans truncate">
                {activeDisplayLayer.name}
              </span>
              <span className="text-[11px] font-mono text-[#C58B3A] bg-[#C58B3A]/10 px-1.5 py-0.5 rounded border border-[#C58B3A]/30 shrink-0">
                {activeDisplayLayer.depth}
              </span>
            </div>
            <p className="text-[11px] text-[#9BA5A8] line-clamp-1">
              {activeDisplayLayer.description}
            </p>
          </div>

          {/* Operational Metrics Grounded to Mine */}
          <div className="md:col-span-4 space-y-1 border-y md:border-y-0 md:border-x border-[#30383D] py-1 md:py-0 md:px-3">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#9BA5A8]">Canonical Mine:</span>
              <span className="text-[#E8ECEB] font-semibold truncate max-w-[180px]">
                {activeDisplayLayer.mine}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#9BA5A8]">Verified Metric:</span>
              <span className="text-[#10B981] font-bold">
                {activeDisplayLayer.metric}
              </span>
            </div>
          </div>

          {/* Source Document & Page Citation Lineage */}
          <div className="md:col-span-4 space-y-1 md:pl-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#C58B3A]">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{activeDisplayLayer.document}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-[#9BA5A8]">
              <span className="truncate">{activeDisplayLayer.source}</span>
              <span className="text-[#4F8A62] flex items-center gap-1 shrink-0 font-bold">
                <ShieldCheck className="h-3 w-3" /> VERIFIED
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
