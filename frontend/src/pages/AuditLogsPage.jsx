import React from 'react';
import { ShieldCheck, User, Clock, Activity } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Table } from '../components/common/Table';

export const AuditLogsPage = () => {
  const auditEntries = [
    { id: 1, user: 'admin', action: 'LOGIN', details: 'User authenticated cleanly via OAuth2 JWT bearer token.', ip: '192.168.1.10', timestamp: '2026-08-28 16:30:12' },
    { id: 2, user: 'analyst', action: 'DOCUMENT_UPLOAD', details: 'Uploaded document ECL_Annual_Report_2023-24.pdf (SHA-256 verified).', ip: '192.168.1.24', timestamp: '2026-08-28 16:15:00' },
    { id: 3, user: 'reviewer', action: 'CONFLICT_RESOLVE', details: 'Resolved cross-document discrepancy for Rajmahal OC (Accepted Doc A).', ip: '192.168.1.45', timestamp: '2026-08-28 15:45:22' },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          System Security Audit Trail & Event Ledger
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Immutable audit log tracking all authentication, document ingestion, conflict resolution, and report approval events
        </p>
      </div>

      <Card title="Audit Event Ledger">
        <Table headers={['Timestamp', 'User', 'Action Event', 'Details', 'IP Address']}>
          {auditEntries.map((log) => (
            <tr key={log.id} className="hover:bg-slate-800/40 font-mono text-xs">
              <td className="px-4 py-3 text-slate-400">{log.timestamp}</td>
              <td className="px-4 py-3 font-semibold text-amber-400">{log.user}</td>
              <td className="px-4 py-3 text-emerald-400 font-bold">{log.action}</td>
              <td className="px-4 py-3 text-slate-300 font-sans">{log.details}</td>
              <td className="px-4 py-3 text-slate-500">{log.ip}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
};
