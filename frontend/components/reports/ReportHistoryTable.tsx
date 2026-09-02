'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FileText, Download, CheckCircle2, History } from 'lucide-react';
import { ReportItem, reportApi } from '@/lib/api/reportApi';

interface ReportHistoryTableProps {
  reports: ReportItem[];
  loading?: boolean;
  onSelectReport?: (report: ReportItem) => void;
}

export const ReportHistoryTable: React.FC<ReportHistoryTableProps> = ({
  reports,
  loading = false,
  onSelectReport,
}) => {
  const [downloadingId, setDownloadingId] = React.useState<number | null>(null);

  const handleDownload = async (id: number, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(id);
    try {
      const titleClean = title ? title.replace(/[^a-zA-Z0-9_-]/g, '_') : `Report_${id}`;
      await reportApi.downloadReport(id, `${titleClean}.pdf`);
    } catch (err) {
      console.error('Failed to download report PDF:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Card className="border-slate-800/90 shadow-card-dark">
      <CardHeader className="py-3.5 px-4 bg-navy-950/80 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-gold-400" />
            <span>Institutional Report History Ledger</span>
          </CardTitle>
          <Badge variant="gold" size="sm">
            {reports.length} Generated Reports
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Historical record of ReportLab compiled PDF reports, parliamentary replies, and annual summaries.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/90 bg-navy-950/40 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Report Title / Type</th>
                <th className="py-3 px-4">Subsidiary / FY</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Compiled Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 w-48 bg-navy-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-navy-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-16 bg-navy-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-navy-800 rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-6 w-20 bg-navy-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No generated institutional reports found in system ledger.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onSelectReport && onSelectReport(r)}
                    className="hover:bg-navy-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-200">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-gold-400 shrink-0" />
                        <div>
                          <span className="block">{r.title}</span>
                          <span className="text-[11px] font-mono text-slate-500 font-normal">
                            Template: {r.report_type}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="font-semibold block text-slate-200">{r.subsidiary || 'ECL'}</span>
                      <span className="text-[11px] text-gold-400">{r.fiscal_year || '2023-24'}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant={r.approval_status === 'APPROVED' ? 'success' : 'warning'}>
                        {r.approval_status || 'DRAFT'}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-sans">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleDownload(r.id, r.title, e)}
                        isLoading={downloadingId === r.id}
                        leftIcon={<Download className="h-3.5 w-3.5" />}
                      >
                        Download PDF
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
  );
};
