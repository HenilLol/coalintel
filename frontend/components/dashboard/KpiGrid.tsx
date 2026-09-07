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
      <StatCard
        title="Coal Production"
        value={kpis?.total_production_mt ?? (isApiConnected ? '0.00' : '773.60')}
        unit="MT"
        icon={<Pickaxe className="h-5 w-5 text-[#F2A900]" />}
        subtitle={isApiConnected ? 'Verified Extracted Value' : 'Preview Data'}
        loading={loading}
      />

      <StatCard
        title="Overburden Removal"
        value={kpis?.total_obr_mcum ?? (isApiConnected ? '0.00' : '1,650.40')}
        unit="M.Cu.M"
        icon={<Layers className="h-5 w-5 text-[#F2A900]" />}
        subtitle={isApiConnected ? 'Normalized Stripping Volume' : 'Preview Data'}
        loading={loading}
      />

      <StatCard
        title="Ingested Documents"
        value={kpis?.total_documents ?? (isApiConnected ? 0 : 142)}
        unit="Docs"
        icon={<FileText className="h-5 w-5 text-[#18B6B2]" />}
        subtitle="Parsed & Chunked PDF/XLSX"
        loading={loading}
      />

      <StatCard
        title="Active Conflicts"
        value={kpis?.active_conflicts ?? (isApiConnected ? 0 : 5)}
        unit="Open"
        icon={<AlertTriangle className="h-5 w-5 text-[#F05B5B]" />}
        subtitle="Discrepancy > 1% Flagged"
        trend={{ value: 'Requires Review', isPositive: false }}
        loading={loading}
      />

      <StatCard
        title="Entity Accuracy"
        value={kpis?.entity_accuracy_rate ?? '98.5%'}
        icon={<CheckCircle2 className="h-5 w-5 text-[#39B978]" />}
        subtitle="Regex & ML Entity Normalization"
        loading={loading}
      />

      <StatCard
        title="Citation Coverage"
        value={kpis?.citation_coverage_rate ?? '100%'}
        icon={<ShieldCheck className="h-5 w-5 text-[#18B6B2]" />}
        subtitle="RAG Grounding Verification"
        loading={loading}
      />
    </div>
  );
};
