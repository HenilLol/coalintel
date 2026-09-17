'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { ErrorState } from '@/components/ui/ErrorState';
import { ValidationFeedTable } from '@/components/validation/ValidationFeedTable';
import { ValidationFormulaVisualizer } from '@/components/validation/ValidationFormulaVisualizer';
import { validationApi } from '@/lib/api/validationApi';
import { CIL_SUBSIDIARIES } from '@/lib/constants';
import { ShieldCheck } from 'lucide-react';

export default function ValidationPage() {
  const [selectedSubsidiary, setSelectedSubsidiary] = useState('ALL');

  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['validation-feed', selectedSubsidiary],
    queryFn: () => validationApi.getValidationFeed(selectedSubsidiary),
    staleTime: 30000,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Arithmetic Validation Center"
        description="Deterministic unit normalization (Lakh Tonnes → MT) and automated stock reconciliation: Opening Stock + Production − Dispatch = Closing Stock."
        breadcrumbs={[{ label: 'Validation Center' }]}
        badge={<Badge variant="amber">Deterministic Engine</Badge>}
        actions={
          <Select
            value={selectedSubsidiary}
            onChange={(e) => setSelectedSubsidiary(e.target.value)}
            options={CIL_SUBSIDIARIES}
            className="w-48 text-xs py-1.5"
          />
        }
      />

      {/* Signature Animated Arithmetic Visualizer */}
      <ValidationFormulaVisualizer />

      {/* Error Alert */}
      {isError && <ErrorState message={error instanceof Error ? error.message : 'Failed to fetch validation feed.'} />}

      {/* Main Validation Feed Data Table */}
      <ValidationFeedTable items={items} loading={isLoading} />
    </div>
  );
}
