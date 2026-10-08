'use client';

import React from 'react';
import {
  Search,
  Cpu,
  Database,
  GitMerge,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface Props {
  isLoading: boolean;
  hasResponse: boolean;
  citationCount?: number;
}

const RAG_STEPS = [
  { id: 'query', label: 'Query Embed', icon: Search, color: '#9BA5A8' },
  { id: 'retrieval', label: 'ChromaDB Vector', icon: Database, color: '#3B82F6' },
  { id: 'matching', label: 'Doc Matching', icon: GitMerge, color: '#14B8A6' },
  { id: 'ranking', label: 'RRF Reranking', icon: Cpu, color: '#6366F1' },
  { id: 'validation', label: 'Arithmetic Check', icon: ShieldCheck, color: '#10B981' },
  { id: 'answer', label: 'Structured Insight', icon: Sparkles, color: '#C58B3A' },
];

export const RagPipelineVisualizer: React.FC<Props> = ({
  isLoading,
  hasResponse,
  citationCount = 0,
}) => {
  return (
    <div className="p-4 rounded-xl bg-[#151A1D] border border-[#30383D] space-y-3 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30383D] pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#C58B3A]" />
          <span className="text-xs font-bold text-[#E8ECEB]">
            RAG Evidence Retrieval & Verification Pipeline
          </span>
        </div>

        {isLoading ? (
          <Badge variant="amber" size="sm" className="animate-pulse">
            Processing Query Vectors...
          </Badge>
        ) : hasResponse ? (
          <Badge variant="success" size="sm" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> INSIGHT GENERATED ({citationCount} Citations)
          </Badge>
        ) : (
          <Badge variant="default" size="sm">
            Ready for Inquiry
          </Badge>
        )}
      </div>

      {/* Pipeline Stepper Nodes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
        {RAG_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = isLoading;
          const isDone = hasResponse;

          return (
            <div
              key={step.id}
              className={`p-2.5 rounded-lg border flex flex-col items-center text-center space-y-1 transition-all ${
                isDone
                  ? 'bg-[#1C2226] border-[#10B981]/50 shadow-sm'
                  : isActive
                  ? 'bg-[#242C30] border-[#C58B3A] animate-pulse'
                  : 'bg-[#151A1D] border-[#30383D] opacity-75'
              }`}
            >
              <div
                className="p-1.5 rounded-md"
                style={{ backgroundColor: `${step.color}20` }}
              >
                <Icon className="h-4 w-4" style={{ color: step.color }} />
              </div>
              <span className="text-[10px] font-bold text-[#E8ECEB]">
                {step.label}
              </span>
              <span className="text-[9px] text-[#9BA5A8]">
                {isDone ? 'Verified' : isActive ? 'Active' : 'Standby'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
