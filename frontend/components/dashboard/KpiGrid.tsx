'use client';

import React from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { Pickaxe, Layers, FileText, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { DashboardKpis } from '@/types/dashboard';

interface KpiGridProps {
  kpis?: DashboardKpis | null;
  loading?: boolean;
  isApiConnected?: boolean;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ kpis, loading = false, isApiConnected = false }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* Primary KPI: Coal Production */}
      <StatCard
        title="Coal Production"
        value={kpis?.total_production_mt ?? (isApiConnected ? '0.00' : '773.60')}
        unit="MT"
        icon={<Pickaxe className="h-4 w-4" />}
        subtitle={isApiConnected ? 'Verified Extracted Metric' : 'Annual Cumulative Plan'}
        variant="primary"
        loading={loading}
      />

      {/* Primary KPI: Overburden Removal */}
      <StatCard
        title="Overburden Removal"
        value={kpis?.total_obr_mcum ?? (isApiConnected ? '0.00' : '1,650.40')}
        unit="M.Cu.M"
        icon={<Layers className="h-4 w-4" />}
        subtitle={isApiConnected ? 'Normalized Stripping Volume' : 'Total Mine Volume'}
        variant="primary"
        loading={loading}
      />

      {/* Actionable Alert KPI: Active Conflicts */}
      <StatCard
        title="Active Conflicts"
        value={kpis?.active_conflicts ?? (isApiConnected ? 0 : 5)}
        unit="Open"
        icon={<AlertTriangle className="h-4 w-4" />}
        subtitle="Discrepancy > 1% Flagged"
        trend={{ value: 'Review Needed', isPositive: false }}
        variant="danger"
        loading={loading}
      />

      {/* Secondary Supporting Metric: Ingested Documents */}
      <StatCard
        title="Ingested Documents"
        value={kpis?.total_documents ?? (isApiConnected ? 0 : 142)}
        unit="Docs"
        icon={<FileText className="h-4 w-4 text-[#54788A]" />}
        subtitle="Parsed & Vector Chunked"
        variant="default"
        loading={loading}
      />

      {/* Secondary Supporting Metric: Entity Accuracy */}
      <StatCard
        title="Entity Accuracy"
        value={kpis?.entity_accuracy_rate ?? '98.5%'}
        icon={<CheckCircle2 className="h-4 w-4 text-[#4F8A62]" />}
        subtitle="Regex & NLP Normalization"
        variant="default"
        loading={loading}
      />

      {/* Secondary Supporting Metric: Citation Coverage */}
      <StatCard
        title="Citation Coverage"
        value={kpis?.citation_coverage_rate ?? '100%'}
        icon={<ShieldCheck className="h-4 w-4 text-[#4F8A62]" />}
        subtitle="RAG Grounding Verified"
        variant="default"
        loading={loading}
      />
    </div>
  );
};
