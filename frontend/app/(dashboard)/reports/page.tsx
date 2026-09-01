'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileSpreadsheet } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Report Wizard"
        description="Automated report compilation and PDF generation for Ministry of Coal, CIL HQ, and Parliamentary replies."
        breadcrumbs={[{ label: 'Report Wizard' }]}
        badge={<Badge variant="gold">ReportLab Engine</Badge>}
      />

      <EmptyState
        title="Report Wizard & PDF Synthesis Console"
        description="Select report templates, target subsidiary, and fiscal year to generate institutional PDF disclosures."
        icon={<FileSpreadsheet className="h-10 w-10 text-gold-400" />}
      />
    </div>
  );
}
