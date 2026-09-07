'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConflictResolveModal } from '@/components/validation/ConflictResolveModal';
import { validationApi, ConflictItem, ResolveConflictPayload } from '@/lib/api/validationApi';
import { useScope } from '@/context/ScopeContext';
import { GitCompare, FileText, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

export default function ConflictsPage() {
  const { selectedSubsidiary } = useScope();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [activeConflict, setActiveConflict] = useState<ConflictItem | null>(null);

  const {
    data: conflicts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['conflicts', selectedStatus, selectedSubsidiary],
    queryFn: () => validationApi.getConflicts(selectedStatus, selectedSubsidiary),
    staleTime: 30000,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ResolveConflictPayload }) =>
      validationApi.resolveConflict(id, payload),
    onSuccess: () => {
      setActiveConflict(null);
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Cross-Document Conflict Resolver"
        description="Detects and resolves metric discrepancies (> 1% threshold) across distinct ingested document sources."
        breadcrumbs={[{ label: 'Conflict Resolver' }]}
        badge={<Badge variant="amber">Restricted: Admin / Reviewer</Badge>}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh Conflicts
          </Button>
        }
      />

      {/* Error Alert */}
      {isError && <ErrorState message={error instanceof Error ? error.message : 'Failed to fetch conflict list.'} />}

      {/* Main Conflicts Data Table Card */}
      <Card className="border-[#2C3D49] shadow-card-dark bg-[#17232D]">
        <CardHeader className="py-3.5 px-4 bg-[#20313D] border-b border-[#2C3D49]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[#F1F5F7] flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-[#18B6B2]" />
              <span>Cross-Document Metric Discrepancies</span>
            </CardTitle>
            <Badge variant="amber" size="sm">
              {conflicts.length} Discrepancy Pairs
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2C3D49] bg-[#20313D] text-[11px] font-mono text-[#F1F5F7] uppercase tracking-wider">
                  <th className="py-3 px-4">Mine & Metric Entity</th>
                  <th className="py-3 px-4">Document A Value</th>
                  <th className="py-3 px-4">Document B Value</th>
                  <th className="py-3 px-4">Discrepancy %</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#2C3D49] text-xs font-mono">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-3.5 px-4"><div className="h-4 w-36 bg-[#20313D] rounded" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-28 bg-[#20313D] rounded" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-28 bg-[#20313D] rounded" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-16 bg-[#20313D] rounded" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-20 bg-[#20313D] rounded" /></td>
                      <td className="py-3.5 px-4 text-right"><div className="h-6 w-20 bg-[#20313D] rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : conflicts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#9EADB7] text-xs">
                      No cross-document metric discrepancies detected.
                    </td>
                  </tr>
                ) : (
                  conflicts.map((c) => (
                    <tr key={c.id} className="hover:bg-[#20313D]/40 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-semibold text-[#F1F5F7]">
                        {c.mine_name}
                        <span className="block text-[11px] text-[#9EADB7] font-mono font-normal">
                          {c.metric_name} ({c.fiscal_year})
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#9EADB7]">
                        <span className="font-bold text-[#F1F5F7] block">
                          {c.document_a_value} {c.document_a_unit}
                        </span>
                        <span className="text-[10px] text-[#9EADB7] truncate block max-w-xs" title={c.document_a_filename}>
                          {c.document_a_filename}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#9EADB7]">
                        <span className="font-bold text-[#F1F5F7] block">
                          {c.document_b_value} {c.document_b_unit}
                        </span>
                        <span className="text-[10px] text-[#9EADB7] truncate block max-w-xs" title={c.document_b_filename}>
                          {c.document_b_filename}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#F08A24]">
                        {c.discrepancy_percentage?.toFixed(2)}%
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={c.status === 'OPEN' ? 'danger' : 'success'}>
                          {c.status || 'OPEN'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right font-sans">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveConflict(c)}
                        >
                          Resolve Conflict
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Resolution Modal */}
      <ConflictResolveModal
        conflict={activeConflict}
        onClose={() => setActiveConflict(null)}
        onResolve={(id, payload) => resolveMutation.mutate({ id, payload })}
        isLoading={resolveMutation.isPending}
      />
    </div>
  );
}
