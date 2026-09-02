'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Download, CheckCircle2, FileText, Sparkles, ShieldCheck } from 'lucide-react';
import { ReportItem, reportApi } from '@/lib/api/reportApi';

interface ReportPreviewCardProps {
  report: ReportItem | null;
  onApprove: () => void;
  isApproving?: boolean;
}

export const ReportPreviewCard: React.FC<ReportPreviewCardProps> = ({
  report,
  onApprove,
  isApproving = false,
}) => {
  if (!report) {
    return (
      <Card className="h-full flex items-center justify-center p-12 text-center border-slate-800/90 shadow-card-dark">
        <div className="space-y-2 text-slate-500">
          <FileText className="h-10 w-10 mx-auto text-slate-600" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            No Active Report Draft Selected
          </h4>
          <p className="text-xs text-slate-500 max-w-xs">
            Configure report parameters on the left and click &quot;Assemble Report Draft&quot; to generate an institutional preview.
          </p>
        </div>
      </Card>
    );
  }

  const isApproved = report.approval_status === 'APPROVED';

  const handleDownload = () => {
    const downloadUrl = reportApi.getDownloadUrl(report.id);
    window.open(downloadUrl, '_blank');
  };

  return (
    <Card className="h-full border-slate-800/90 shadow-card-dark space-y-4">
      <CardHeader className="py-3.5 px-4 bg-navy-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold-400" />
          <CardTitle className="text-sm font-semibold">Reportlab Draft Assembly Preview</CardTitle>
        </div>
        <Badge variant={isApproved ? 'success' : 'warning'}>
          {report.approval_status || 'DRAFT'}
        </Badge>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        {/* Title & Metadata Card */}
        <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-base font-bold text-slate-100 font-sans leading-snug">
              {report.title}
            </h3>
            <Badge variant="gold" size="sm" className="shrink-0 font-mono">
              ID #{report.id}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400 pt-1 border-t border-slate-800/80">
            <span>Template: <code className="text-slate-200">{report.report_type}</code></span>
            <span>•</span>
            <span>Subsidiary: <span className="text-gold-400">{report.subsidiary || 'ECL'}</span></span>
            <span>•</span>
            <span>FY: <span className="text-gold-400">{report.fiscal_year || '2023-24'}</span></span>
          </div>

          <div className="text-[11px] font-mono text-slate-500 truncate" title={report.file_path}>
            PDF File: {report.file_path}
          </div>
        </div>

        {/* Verification Note */}
        <div className="p-3.5 rounded-xl bg-navy-950/60 border border-slate-800/90 text-xs text-slate-300 flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            Compiled using verified unit-normalized metrics from database <code className="text-gold-400 font-mono">extracted_metrics</code> and resolved conflicts.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {!isApproved && (
            <Button
              variant="primary"
              size="md"
              onClick={onApprove}
              isLoading={isApproving}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Approve Report
            </Button>
          )}

          <Button
            variant="outline"
            size="md"
            onClick={handleDownload}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Download PDF Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
