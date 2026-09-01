'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Repository & Digitization"
        description="Upload, parse, and inspect geological, mining annual reports, RTI disclosures, and production audit documents."
        breadcrumbs={[{ label: 'Document Library' }]}
        badge={<Badge variant="gold">Phase 2 Ready</Badge>}
        actions={
          <Button variant="primary" leftIcon={<Upload className="h-4 w-4" />}>
            Upload Document
          </Button>
        }
      />

      <EmptyState
        title="Document Hub & Visual PDF Canvas"
        description="Multi-format text extraction (PDF, DOCX, CSV, XLSX), SHA-256 hash deduplication, and page-level provenance tracking."
        icon={<FileText className="h-10 w-10 text-gold-400" />}
      />
    </div>
  );
}
