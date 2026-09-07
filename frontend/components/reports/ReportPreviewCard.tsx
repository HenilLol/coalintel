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
  const [isDownloading, setIsDownloading] = React.useState(false);

  if (!report) {
    return (
      <Card className="h-full flex items-center justify-center p-12 text-center border-steel shadow-card-light">
        <div className="space-y-2 text-slateText">
          <FileText className="h-10 w-10 mx-auto text-slateText/70" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slateText">
            No Active Report Draft Selected
          </h4>
          <p className="text-xs text-slateText max-w-xs">
            Configure report parameters on the left and click &quot;Assemble Report Draft&quot; to generate an institutional preview.
          </p>
        </div>
      </Card>
    );
  }

  const isApproved = report.approval_status === 'APPROVED';

  const handleDownload = async () => {
    if (!report?.id) return;
    setIsDownloading(true);
    try {
      const titleClean = report.title ? report.title.replace(/[^a-zA-Z0-9_-]/g, '_') : `Report_${report.id}`;
      await reportApi.downloadReport(report.id, `${titleClean}.pdf`);
    } catch (err) {
      console.error('Failed to download report PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="h-full border-steel shadow-card-light space-y-4">
      <CardHeader className="py-3.5 px-4 bg-ash border-b border-steel flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm font-semibold text-ink">Reportlab Draft Assembly Preview</CardTitle>
        </div>
        <Badge variant={isApproved ? 'success' : 'warning'}>
          {report.approval_status || 'DRAFT'}
        </Badge>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        {/* Title & Metadata Card */}
        <div className="p-4 rounded-xl bg-ash border border-steel space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-base font-bold text-ink font-sans leading-snug">
              {report.title}
            </h3>
            <Badge variant="gold" size="sm" className="shrink-0 font-mono">
              ID #{report.id}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slateText pt-1 border-t border-steel">
            <span>Template: <code className="text-ink font-semibold">{report.report_type}</code></span>
            <span>•</span>
            <span>Subsidiary: <span className="text-amber-600 font-semibold">{report.subsidiary || 'ECL'}</span></span>
            <span>•</span>
            <span>FY: <span className="text-amber-600 font-semibold">{report.fiscal_year || '2023-24'}</span></span>
          </div>

          <div className="text-[11px] font-mono text-slateText truncate" title={report.file_path}>
            PDF File: {report.file_path}
          </div>
        </div>

        {/* Verification Note */}
        <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-xs text-ink flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
          <span>
            Compiled using verified unit-normalized metrics from database <code className="text-amber-600 font-mono font-semibold">extracted_metrics</code> and resolved conflicts.
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
            isLoading={isDownloading}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Download PDF Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
