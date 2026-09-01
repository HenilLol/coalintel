'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldCheck } from 'lucide-react';

export default function ValidationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Arithmetic Validation Feed"
        description="Deterministic unit normalization (Lakh Tonnes -> MT) and arithmetic discrepancy monitoring (>5% threshold)."
        breadcrumbs={[{ label: 'Validation Feed' }]}
        badge={<Badge variant="gold">Deterministic</Badge>}
      />

      <EmptyState
        title="Arithmetic Validation Feed"
        description="Scans extracted mining metrics for calculation discrepancies and unit conversions."
        icon={<ShieldCheck className="h-10 w-10 text-emerald-400" />}
      />
    </div>
  );
}
