import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle2, Hash, Calendar, Building2, Layers } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';

export const DocumentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const mockExtractedMetrics = [
    { id: 101, mine: 'Rajmahal OC', metric: 'Coal Production', rawVal: '42.50', rawUnit: 'Lakh Tonnes', normVal: '4.25', normUnit: 'MT', year: '2023-24', status: 'VALIDATED' },
    { id: 102, mine: 'Rajmahal OC', metric: 'Overburden Removal', rawVal: '120.40', rawUnit: 'M.Cu.M', normVal: '120.40', normUnit: 'M.Cu.M', year: '2023-24', status: 'VALIDATED' },
    { id: 103, mine: 'Sonalpur OC', metric: 'Despatch', rawVal: '38.20', rawUnit: 'Lakh Tonnes', normVal: '3.82', normUnit: 'MT', year: '2023-24', status: 'WARNING_ARITHMETIC' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/documents')}>
            Back to Library
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Document Lineage Inspector
            </h1>
            <p className="text-xs text-slate-400">Document ID #{id || 1} • Ingestion Traceability</p>
          </div>
        </div>
        <Badge status="PARSED" />
      </div>

      {/* Document Overview Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-xs text-slate-400 font-medium">Filename</div>
          <div className="text-sm font-semibold text-white mt-1 truncate">ECL_Annual_Report_2023-24.pdf</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-400 font-medium">Subsidiary / Year</div>
          <div className="text-sm font-semibold text-white mt-1">Eastern Coalfields (ECL) • 2023-24</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-400 font-medium">Page Count / Size</div>
          <div className="text-sm font-semibold text-white mt-1">84 Pages • 14.2 MB</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-400 font-medium">SHA-256 Digest</div>
          <div className="text-[10px] font-mono text-amber-400 mt-1 truncate">e3b0c44298fc1c149afbf4c8996fb924...</div>
        </Card>
      </div>

      {/* Extracted Metrics Table */}
      <Card title="Extracted Mining Metrics & Unit Normalization Lineage">
        <Table headers={['Mine Entity', 'Metric Name', 'Raw Extracted Value', 'Normalized Value (MT)', 'Fiscal Year', 'Validation Status']}>
          {mockExtractedMetrics.map((m) => (
            <tr key={m.id} className="hover:bg-slate-800/40">
              <td className="px-4 py-3 text-xs font-semibold text-white">{m.mine}</td>
              <td className="px-4 py-3 text-xs text-slate-300">{m.metric}</td>
              <td className="px-4 py-3 text-xs text-slate-400 font-mono">{m.rawVal} {m.rawUnit}</td>
              <td className="px-4 py-3 text-xs font-bold text-amber-400 font-mono">{m.normVal} {m.normUnit}</td>
              <td className="px-4 py-3 text-xs text-slate-300">{m.year}</td>
              <td className="px-4 py-3">
                <Badge status={m.status} size="xs" />
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
};
