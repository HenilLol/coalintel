'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Mining Word Cloud"
        description="Mining keyword frequency identification, topic clustering, and historical production trend analysis."
        breadcrumbs={[{ label: 'Analytics' }]}
        badge={<Badge variant="gold">Topic Engine</Badge>}
      />

      <EmptyState
        title="Mining Analytics & Keyword Frequency Module"
        description="Automated Word Cloud and Topic Identification Module for operational, regulatory, and production keywords."
        icon={<BarChart3 className="h-10 w-10 text-sky-400" />}
      />
    </div>
  );
}
