'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { AuditLogsTable } from '@/components/audit/AuditLogsTable';
import { auditApi } from '@/lib/api/auditApi';
import { History, ShieldAlert } from 'lucide-react';

export default function AuditPage() {
  const {
    data: logs = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditApi.getAuditLogs(),
    staleTime: 60000,
  });

  const isForbidden = (error as any)?.response?.status === 403;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="System Security & Audit Trail Ledger"
        description="Immutable audit trail tracking user authentication events, document ingestions, conflict resolutions, and report approvals."
        breadcrumbs={[{ label: 'Audit Logs' }]}
        badge={<Badge variant="amber">Restricted: Admin</Badge>}
      />

      {/* 403 Forbidden RBAC Notice */}
      {isForbidden ? (
        <div className="p-8 rounded-2xl bg-[#17232D] border border-[#2C3D49] shadow-card-dark text-center space-y-3 max-w-xl mx-auto my-8">
          <div className="p-3 rounded-full bg-[#3A2C0A] text-[#F2A900] border border-[#F2A900]/40 w-fit mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-[#F1F5F7]">RBAC Authorization Notice</h3>
          <p className="text-xs text-[#9EADB7]">
            System security audit logs are restricted to users with <code className="text-[#35D3CE] font-semibold">Admin</code> role authorization.
          </p>
        </div>
      ) : isError ? (
        <ErrorState message={error instanceof Error ? error.message : 'Failed to fetch audit log ledger.'} />
      ) : (
        /* Main Audit Logs Data Table */
        <AuditLogsTable logs={logs} loading={isLoading} />
      )}
    </div>
  );
}
