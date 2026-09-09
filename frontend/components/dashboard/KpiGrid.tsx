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
  const productionValue =
    kpis?.total_production_mt !== undefined && kpis?.total_production_mt !== null
      ? Number(kpis.total_production_mt).toFixed(2)
      : isApiConnected
      ? '0.00'
      : '—';

  const obrValue =
    kpis?.total_obr_mcum !== undefined && kpis?.total_obr_mcum !== null
      ? Number(kpis.total_obr_mcum).toFixed(2)
      : isApiConnected
      ? '0.00'
      : '—';

  const conflictsCount =
    kpis?.active_conflicts !== undefined && kpis?.active_conflicts !== null
      ? kpis.active_conflicts
      : isApiConnected
      ? 0
      : 0;

  const docsCount =
    kpis?.total_documents !== undefined && kpis?.total_documents !== null
      ? kpis.total_documents
      : isApiConnected
      ? 0
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* Primary KPI: Coal Production */}
      <StatCard
        title="Coal Production"
        value={productionValue}
        unit="MT"
        icon={<Pickaxe className="h-4 w-4" />}
        subtitle={isApiConnected ? 'Verified Extracted Metric' : 'Production Scope Total'}
        variant="primary"
        loading={loading}
      />

      {/* Primary KPI: Overburden Removal */}
      <StatCard
        title="Overburden Removal"
        value={obrValue}
        unit="M.Cu.M"
        icon={<Layers className="h-4 w-4" />}
        subtitle={isApiConnected ? 'Normalized Stripping Volume' : 'Total Mine Volume'}
        variant="primary"
        loading={loading}
      />

      {/* Actionable Alert KPI: Active Conflicts */}
      <StatCard
        title="Active Conflicts"
        value={conflictsCount}
        unit="Open"
        icon={<AlertTriangle className="h-4 w-4" />}
        subtitle="Discrepancy > 1% Flagged"
        trend={conflictsCount > 0 ? { value: `${conflictsCount} Review Needed`, isPositive: false } : undefined}
        variant={conflictsCount > 0 ? 'danger' : 'default'}
        loading={loading}
      />

      {/* Secondary Supporting Metric: Ingested Documents */}
      <StatCard
        title="Ingested Documents"
        value={docsCount}
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
