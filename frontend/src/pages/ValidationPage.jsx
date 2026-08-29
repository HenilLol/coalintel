import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';

export const ValidationPage = () => {
  const validationItems = [
    { id: 1, mine: 'Rajmahal OpenCast', metric: 'Coal Production', issue: 'Cross-document discrepancy > 1% detected between Annual Report and RTI disclosure.', status: 'CONFLICT_DETECTED', year: '2023-24' },
    { id: 2, mine: 'Gevra OC', metric: 'Overburden Removal', issue: 'Child mine sum total discrepancy exceeds 5% threshold.', status: 'WARNING_ARITHMETIC', year: '2023-24' },
    { id: 3, mine: 'Dipka OC', metric: 'Despatch MT', issue: 'Deterministic unit conversion (Lakh Tonnes -> MT) verified cleanly.', status: 'VALIDATED', year: '2023-24' },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          Data Quality & Validation Feed
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Deterministic arithmetic consistency checks (&gt;5%) and unit normalization validation
        </p>
      </div>

      <Card title="Active Validation Warning Log">
        <Table headers={['Mine Name', 'Metric', 'Fiscal Year', 'Validation Check Message', 'Status']}>
          {validationItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-800/40">
              <td className="px-4 py-3 text-xs font-semibold text-white">{item.mine}</td>
              <td className="px-4 py-3 text-xs text-slate-300">{item.metric}</td>
              <td className="px-4 py-3 text-xs text-slate-400">{item.year}</td>
              <td className="px-4 py-3 text-xs text-slate-300">{item.issue}</td>
              <td className="px-4 py-3">
                <Badge status={item.status} size="xs" />
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
};
