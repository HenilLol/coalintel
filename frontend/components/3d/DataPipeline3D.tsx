'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  ScanText,
  ShieldCheck,
  Database,
  Search,
  GitCompare,
  AlertTriangle,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export interface PipelineStage {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  glowColor: string;
  icon: string;
  metric: string;
  description: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'document',
    name: 'DOCUMENT',
    subtitle: 'Ingestion & OCR',
    color: '#9BA5A8',
    glowColor: 'rgba(155, 165, 168, 0.4)',
    icon: 'FileText',
    metric: '100% Ingested',
    description: 'PDF, XLSX, DOCX annual accounts and provisional government statistics ingested with SHA-256 verification.',
  },
  {
    id: 'extract',
    name: 'EXTRACT',
    subtitle: 'Layout Parsing',
    color: '#C58B3A',
    glowColor: 'rgba(197, 139, 58, 0.4)',
    icon: 'ScanText',
    metric: '99.4% Parsing',
    description: 'Deep table extraction, footnote preservation, and bounding box line-level localization.',
  },
  {
    id: 'validate',
    name: 'VALIDATE',
    subtitle: 'Arithmetic Checks',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    icon: 'ShieldCheck',
    metric: '< 5% Tolerance',
    description: 'Opening Stock + Production - Dispatch = Closing Stock deterministic formula verification.',
  },
  {
    id: 'index',
    name: 'INDEX',
    subtitle: 'Vector Chunks',
    color: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    icon: 'Database',
    metric: 'ChromaDB',
    description: 'Embedding generation with text-embedding-004 into high-dimensional vector space.',
  },
  {
    id: 'retrieve',
    name: 'RETRIEVE',
    subtitle: 'Hybrid RRF',
    color: '#6366F1',
    glowColor: 'rgba(99, 102, 241, 0.4)',
    icon: 'Search',
    metric: 'Top-K Ranked',
    description: 'Reciprocal Rank Fusion uniting vector semantic similarity and exact term BM25 matching.',
  },
  {
    id: 'compare',
    name: 'COMPARE',
    subtitle: 'Cross-Doc Matrix',
    color: '#14B8A6',
    glowColor: 'rgba(20, 184, 166, 0.4)',
    icon: 'GitCompare',
    metric: 'Multi-Source',
    description: 'Alignment of matching production and geological figures across multiple reporting years.',
  },
  {
    id: 'detect',
    name: 'DETECT',
    subtitle: 'Discrepancy Audit',
    color: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    icon: 'AlertTriangle',
    metric: '> 1% Delta Flag',
    description: 'Automated notification and side-by-side modal flagging when documents contradict each other.',
  },
  {
    id: 'insight',
    name: 'INSIGHT',
    subtitle: 'AI Synthesis',
    color: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    icon: 'Sparkles',
    metric: 'Cited Grounding',
    description: 'Zero-hallucination synthesis enforcing strict [Document_Name.pdf, Page X] references.',
  },
  {
    id: 'report',
    name: 'REPORT',
    subtitle: 'Institutional PDF',
    color: '#F97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    icon: 'FileSpreadsheet',
    metric: 'ReportLab Studio',
    description: 'Official Parliamentary Starred Reply and Ministry briefing assembly ready for export.',
  },
];

const renderIcon = (iconName: string, color: string) => {
  const props = { className: 'h-4 w-4', style: { color } };
  switch (iconName) {
    case 'FileText': return <FileText {...props} />;
    case 'ScanText': return <ScanText {...props} />;
    case 'ShieldCheck': return <ShieldCheck {...props} />;
    case 'Database': return <Database {...props} />;
    case 'Search': return <Search {...props} />;
    case 'GitCompare': return <GitCompare {...props} />;
    case 'AlertTriangle': return <AlertTriangle {...props} />;
    case 'Sparkles': return <Sparkles {...props} />;
    case 'FileSpreadsheet': return <FileSpreadsheet {...props} />;
    default: return <Layers {...props} />;
  }
};

interface Props {
  className?: string;
  activeStageId?: string;
  onSelectStage?: (stage: PipelineStage) => void;
}

export const DataPipeline3D: React.FC<Props> = ({
  className,
  activeStageId,
  onSelectStage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredStage, setHoveredStage] = useState<PipelineStage | null>(null);
  const [selectedStage, setSelectedStage] = useState<PipelineStage>(PIPELINE_STAGES[0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = 100);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 100;
    };

    window.addEventListener('resize', handleResize);

    // Particle flow packets
    const PARTICLE_COUNT = 18;
    const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      progress: (i / PARTICLE_COUNT),
      speed: 0.0035 + Math.random() * 0.001,
      size: Math.random() * 2.5 + 1.5,
      hue: Math.random() > 0.5 ? '#C58B3A' : '#14B8A6',
    }));

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const y = height / 2;
      const startX = 40;
      const endX = width - 40;
      const stageSpacing = (endX - startX) / (PIPELINE_STAGES.length - 1);

      // 1. Draw glowing connecting bus line
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#30383D';
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();

      // 2. Draw active glowing data pulse overlay
      const gradient = ctx.createLinearGradient(startX, y, endX, y);
      gradient.addColorStop(0, 'rgba(197, 139, 58, 0.4)');
      gradient.addColorStop(0.5, 'rgba(20, 184, 166, 0.5)');
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0.4)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3. Move and draw particles flowing along the pipeline
      particles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;

        const px = startX + p.progress * (endX - startX);

        ctx.fillStyle = p.hue;
        ctx.shadowColor = p.hue;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // 4. Draw stage waypoint nodes
      PIPELINE_STAGES.forEach((st, idx) => {
        const nx = startX + idx * stageSpacing;
        const isSelected = selectedStage.id === st.id;
        const isHovered = hoveredStage?.id === st.id;

        // Outer halo
        if (isSelected || isHovered) {
          ctx.strokeStyle = st.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(nx, y, 14, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Inner node
        ctx.fillStyle = isSelected || isHovered ? st.color : '#1C2226';
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(nx, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedStage, hoveredStage]);

  const activeDisplay = hoveredStage || selectedStage;

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-xl bg-[#151A1D]/95 border border-[#30383D] p-5 shadow-xl space-y-4 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30383D] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#242C30] text-[#C58B3A] border border-[#30383D]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#E8ECEB] tracking-wide uppercase font-mono">
              3D Intelligence Flow Pipeline
            </h4>
            <p className="text-[11px] text-[#9BA5A8]">
              Automated deterministic verification & vector retrieval workflow
            </p>
          </div>
        </div>

        <Badge variant="amber" size="sm">
          9 Pipeline Gates Active
        </Badge>
      </div>

      {/* Particle Canvas Line */}
      <div className="relative w-full h-[64px] flex items-center">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Interactive 9-Stage Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {PIPELINE_STAGES.map((st, idx) => {
          const isSelected = selectedStage.id === st.id;
          return (
            <button
              key={st.id}
              onClick={() => {
                setSelectedStage(st);
                if (onSelectStage) onSelectStage(st);
              }}
              onMouseEnter={() => setHoveredStage(st)}
              onMouseLeave={() => setHoveredStage(null)}
              className={`group flex flex-col items-center text-center p-2.5 rounded-lg border transition-all duration-150 ${
                isSelected
                  ? 'bg-[#242C30] border-[#C58B3A] shadow-glow-amber scale-105'
                  : 'bg-[#1C2226] border-[#30383D] hover:border-[#9BA5A8]/50 hover:bg-[#242C30]/50'
              }`}
            >
              <div
                className="p-1.5 rounded-md transition-transform group-hover:scale-110 mb-1"
                style={{ backgroundColor: `${st.color}20` }}
              >
                {renderIcon(st.icon, st.color)}
              </div>
              <span className="text-[10px] font-bold text-[#E8ECEB] font-mono tracking-wider">
                {st.name}
              </span>
              <span className="text-[9px] text-[#9BA5A8] truncate w-full mt-0.5">
                {st.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Live Stage Detail Panel */}
      <div className="p-3 rounded-lg bg-[#1C2226] border border-[#30383D] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: activeDisplay.color }}
          />
          <div>
            <span className="text-[#E8ECEB] font-bold mr-2">
              Stage: {activeDisplay.name} ({activeDisplay.subtitle})
            </span>
            <span className="text-[#9BA5A8] font-sans text-[11px] block sm:inline">
              {activeDisplay.description}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[#9BA5A8]">Integrity Status:</span>
          <span className="text-[#10B981] font-bold bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/30 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> {activeDisplay.metric}
          </span>
        </div>
      </div>
    </div>
  );
};
