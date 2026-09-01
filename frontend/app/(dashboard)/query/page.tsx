'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sparkles } from 'lucide-react';

export default function QueryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ask COALINTEL — AI Mining Assistant"
        description="Evidence-grounded RAG retrieval, citation verification [Doc_Name.pdf, Page X], and entity-aware response synthesis."
        breadcrumbs={[{ label: 'Ask COALINTEL' }]}
        badge={<Badge variant="gold">RAG Engine</Badge>}
      />

      <EmptyState
        title="Evidence-Driven RAG Query Console"
        description="Ask natural language questions about mine production, OBR volumes, and CIL subsidiary metrics with mandatory citation badges."
        icon={<Sparkles className="h-10 w-10 text-gold-400" />}
      />
    </div>
  );
}
