'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { GitCompare } from 'lucide-react';

export default function ConflictsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cross-Document Conflict Resolver"
        description="Detects and resolves metric discrepancies (>1%) across distinct ingested document sources."
        breadcrumbs={[{ label: 'Conflict Resolver' }]}
        badge={<Badge variant="gold">Restricted: Admin / Reviewer</Badge>}
      />

      <EmptyState
        title="Cross-Document Conflict Resolution Interface"
        description="Side-by-side document metric comparison, resolution notes, and audit log generation."
        icon={<GitCompare className="h-10 w-10 text-amber-400" />}
      />
    </div>
  );
}
