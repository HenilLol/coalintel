'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { ValidationItem } from '@/lib/api/validationApi';

interface ValidationFeedTableProps {
  items: ValidationItem[];
  loading?: boolean;
}

export const ValidationFeedTable: React.FC<ValidationFeedTableProps> = ({
  items,
  loading = false,
}) => {
  return (
    <Card className="border-[#2C3D49] shadow-lg bg-[#17232D]">
      <CardHeader className="py-3.5 px-4 bg-[#20313D] border-b border-[#2C3D49]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-[#F1F5F7] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#39B978]" />
            <span>Deterministic Arithmetic Validation Feed</span>
          </CardTitle>
          <Badge variant="gold" size="sm">
            {items.length} Validation Scans
          </Badge>
        </div>
        <CardDescription className="text-xs text-[#9EADB7]">
          Deterministic arithmetic checks detecting calculation discrepancies ($&gt; 5\%$) and unit conversion anomalies.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2C3D49] bg-[#20313D] text-[11px] font-mono text-[#F1F5F7] uppercase tracking-wider">
                <th className="py-3 px-4">Mine Entity</th>
                <th className="py-3 px-4">Metric Type</th>
                <th className="py-3 px-4">Discrepancy Details</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4 text-right">Validation Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#2C3D49] text-xs font-mono">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 w-32 bg-[#20313D] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-28 bg-[#20313D] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-48 bg-[#20313D] rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-[#20313D] rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-6 w-20 bg-[#20313D] rounded ml-auto" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#9EADB7] text-xs">
                    No arithmetic validation warnings detected across ingested document set.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#20313D]/50 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-bold text-[#F1F5F7]">
                      {item.mine_name}
                      <span className="block text-[10px] text-[#9EADB7] font-mono font-normal">
                        {item.subsidiary}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#F1F5F7]">
                      {item.metric_name}
                    </td>

                    <td className="py-3.5 px-4 text-[#F1F5F7] font-sans">
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#F08A24] font-mono block">
                          Discrepancy: {item.discrepancy}
                        </span>
                        <span className="text-[11px] text-[#9EADB7] block">{item.details}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#39B978] font-bold">
                      {(item.confidence || 0.95).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Badge variant={item.status === 'VALIDATED' ? 'success' : 'warning'}>
                        {item.status || 'WARNING'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
