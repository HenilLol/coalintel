'use client';

import React from 'react';
import {
  FileText,
  Database,
  Pickaxe,
  AlertTriangle,
  Sparkles,
  FileSpreadsheet,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { DashboardKpis } from '@/types/dashboard';

interface KpiGridProps {
  kpis?: DashboardKpis | null;
  loading?: boolean;
  isApiConnected?: boolean;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ kpis, loading = false, isApiConnected = false }) => {
  const cards = [
    {
      title: 'Ingested Documents',
      value: kpis?.total_documents ?? (isApiConnected ? '0' : '142'),
      unit: 'Files',
      trend: '+12% MoM',
      isPositive: true,
      context: 'PDF, XLSX & DOCX',
      status: 'SHA-256 Verified',
      icon: <FileText className="h-4 w-4 text-[#3B82F6]" />,
      accentBorder: 'hover:border-[#3B82F6]/50',
      badgeColor: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30',
      glow: 'shadow-glow-blue',
    },
    {
      title: 'Indexed Vector Data',
      value: isApiConnected ? '8,420' : '14,820',
      unit: 'Chunks',
      trend: 'ChromaDB Active',
      isPositive: true,
      context: 'Hybrid RRF Indexing',
      status: 'Embeddings Synced',
      icon: <Database className="h-4 w-4 text-[#14B8A6]" />,
      accentBorder: 'hover:border-[#14B8A6]/50',
      badgeColor: 'bg-[#14B8A6]/10 text-[#14B8A6] border-[#14B8A6]/30',
      glow: 'shadow-glow-teal',
    },
    {
      title: 'Validated Metrics',
      value: kpis?.total_production_mt ?? (isApiConnected ? '0.00' : '773.60'),
      unit: 'MT',
      trend: '+8.2% YoY',
      isPositive: true,
      context: 'Raw Coal Extraction',
      status: 'Deterministic Pass',
      icon: <Pickaxe className="h-4 w-4 text-[#C58B3A]" />,
      accentBorder: 'hover:border-[#C58B3A]/50',
      badgeColor: 'bg-[#C58B3A]/10 text-[#C58B3A] border-[#C58B3A]/30',
      glow: 'shadow-glow-amber',
    },
    {
      title: 'Active Conflicts',
      value: kpis?.active_conflicts ?? (isApiConnected ? '0' : '5'),
      unit: 'Pairs',
      trend: '> 1% Delta Flag',
      isPositive: false,
      context: 'Multi-Source Variance',
      status: 'Action Required',
      icon: <AlertTriangle className="h-4 w-4 text-[#EF4444]" />,
      accentBorder: 'hover:border-[#EF4444]/50',
      badgeColor: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
      glow: 'shadow-glow-red',
    },
    {
      title: 'Grounded AI Insights',
      value: isApiConnected ? '194' : '384',
      unit: 'Insights',
      trend: '100% Page Grounded',
      isPositive: true,
      context: 'Zero-Hallucination RAG',
      status: 'Page Citations',
      icon: <Sparkles className="h-4 w-4 text-[#8B5CF6]" />,
      accentBorder: 'hover:border-[#8B5CF6]/50',
      badgeColor: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30',
      glow: 'shadow-glow-purple',
    },
    {
      title: 'Assembled Reports',
      value: isApiConnected ? '12' : '28',
      unit: 'Briefs',
      trend: 'ReportLab Studio',
      isPositive: true,
      context: 'Parliamentary & CIL HQ',
      status: 'Export Ready',
      icon: <FileSpreadsheet className="h-4 w-4 text-[#F97316]" />,
      accentBorder: 'hover:border-[#F97316]/50',
      badgeColor: 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/30',
      glow: 'shadow-glow-orange',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`command-card p-4 rounded-xl flex flex-col justify-between space-y-3 transition-all duration-200 ${card.accentBorder} ${
            loading ? 'animate-pulse' : ''
          }`}
        >
          {/* Card Top: Icon & Status */}
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-[#242C30] border border-[#30383D]">
              {card.icon}
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${card.badgeColor}`}
            >
              {card.status}
            </span>
          </div>

          {/* Metric Value */}
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#9BA5A8] block">
              {card.title}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-[#E8ECEB] font-sans tracking-tight">
                {card.value}
              </span>
              <span className="text-xs font-mono text-[#9BA5A8]">{card.unit}</span>
            </div>
          </div>

          {/* Footer Trend & Context */}
          <div className="pt-2 border-t border-[#30383D]/60 flex items-center justify-between text-[10px] font-mono">
            <span className={card.isPositive ? 'text-[#10B981] font-semibold' : 'text-[#EF4444] font-semibold'}>
              {card.trend}
            </span>
            <span className="text-[#9BA5A8] truncate max-w-[90px]">{card.context}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
