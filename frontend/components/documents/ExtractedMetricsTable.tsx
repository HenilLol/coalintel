'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Pickaxe, ShieldCheck, AlertTriangle, Layers, ExternalLink, ArrowRight } from 'lucide-react';
import { ExtractedMetricItem, MetricValidationStatus } from '@/types/document';
import { formatStandardValue } from '@/lib/utils/cn';

interface ExtractedMetricsTableProps {
  metrics: ExtractedMetricItem[];
  onSelectMetric?: (metric: ExtractedMetricItem) => void;
  loading?: boolean;
}

const getStatusBadge = (status: MetricValidationStatus) => {
  switch (status) {
    case 'VALIDATED':
      return <Badge variant="success">VALIDATED</Badge>;
    case 'WARNING_ARITHMETIC':
      return <Badge variant="warning">ARITHMETIC WARNING</Badge>;
    case 'CONFLICT_DETECTED':
      return <Badge variant="danger">CONFLICT DISCOVERED</Badge>;
    case 'UNVERIFIED':
    default:
      return <Badge variant="default">UNVERIFIED</Badge>;
  }
};

export const ExtractedMetricsTable: React.FC<ExtractedMetricsTableProps> = ({
  metrics,
  onSelectMetric,
  loading = false,
}) => {
  return (
    <Card className="border-[#2C3D49] bg-[#17232D] shadow-lg">
      <CardHeader className="py-3 px-4 bg-[#20313D] border-b border-[#2C3D49]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-[#F1F5F7]">
            <Pickaxe className="h-4 w-4 text-[#18B6B2]" />
            <span>Extracted Mining Metrics & Unit Normalization</span>
          </CardTitle>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#111B24] text-[#9EADB7] border border-[#2C3D49]">
            {metrics.length} Metrics Found
          </span>
        </div>
        <CardDescription className="text-xs text-[#9EADB7]">
          Structured extraction with unit normalization (MT / M.Cu.M) and evidence traceability.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2C3D49] bg-[#20313D] text-[11px] font-mono text-[#F1F5F7] uppercase tracking-wider">
                <th className="py-3 px-4">Mine Entity</th>
                <th className="py-3 px-4">Metric Type</th>
                <th className="py-3 px-4">Raw Extracted Value</th>
                <th className="py-3 px-4">Normalized Value</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Validation Status</th>
                <th className="py-3 px-4 text-right">Lineage</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#2C3D49] text-xs font-mono">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 w-28 bg-[#20313D] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-[#20313D] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-[#20313D] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-[#20313D] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-[#20313D] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-[#20313D] rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-6 w-16 bg-[#20313D] rounded ml-auto" /></td>
                  </tr>
                ))
              ) : metrics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#9EADB7] text-xs">
                    No structured metrics extracted from this document.
                  </td>
                </tr>
              ) : (
                metrics.map((m) => {
                  const conf = m.confidence_score ?? 0.95;
                  const isConverted = m.unit?.toLowerCase() !== m.standard_unit?.toLowerCase();

                  return (
                    <tr key={m.id} className="hover:bg-[#20313D]/50 transition-colors group">
                      {/* Mine Name */}
                      <td className="py-3.5 px-4 font-sans font-semibold text-[#F1F5F7]">
                        {m.mine_name}
                      </td>

                      {/* Metric Name */}
                      <td className="py-3.5 px-4 text-[#9EADB7]">
                        {m.metric_name}
                      </td>

                      {/* Raw Extracted Value & Unit */}
                      <td className="py-3.5 px-4 text-[#9EADB7]">
                        <span className="text-[#F1F5F7] font-semibold">{m.numeric_value}</span>{' '}
                        <span className="text-[11px] text-[#9EADB7]">{m.unit}</span>
                      </td>

                      {/* Standard Normalized Value */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#F2A900]">{formatStandardValue(m.standard_value)}</span>{' '}
                        <span className="text-[11px] text-[#F2A900] font-semibold">{m.standard_unit || 'MT'}</span>
                        {isConverted && (
                          <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-[#3A2C0A] text-[#F2A900] border border-[#F2A900]/30">
                            Converted
                          </span>
                        )}
                      </td>

                      {/* Confidence Score Bar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#9EADB7]">{conf.toFixed(3)}</span>
                          <div className="h-1.5 w-12 rounded-full bg-[#111B24] border border-[#2C3D49] overflow-hidden">
                            <div
                              className="h-full bg-[#39B978] rounded-full"
                              style={{ width: `${Math.min(100, conf * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Validation Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(m.validation_status)}
                      </td>

                      {/* Lineage Action */}
                      <td className="py-3.5 px-4 text-right font-sans">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectMetric && onSelectMetric(m)}
                          rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                          className="text-xs text-[#35D3CE] hover:text-[#18B6B2] hover:bg-[#18B6B2]/10"
                        >
                          Evidence
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
