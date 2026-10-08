'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { DocumentHeaderCard } from '@/components/documents/DocumentHeaderCard';
import { DocumentPageReader } from '@/components/documents/DocumentPageReader';
import { ExtractedMetricsTable } from '@/components/documents/ExtractedMetricsTable';
import { MetricLineageDrawer } from '@/components/documents/MetricLineageDrawer';
import { documentApi } from '@/lib/api/documentApi';
import { ExtractedMetricItem } from '@/types/document';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Sparkles,
  ShieldCheck,
  Search,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
  Hash,
} from 'lucide-react';

export default function DocumentDetailPage() {
  const params = useParams();
  const docId = Number(params?.id);

  const [activePage, setActivePage] = useState<number>(1);
  const [selectedMetric, setSelectedMetric] = useState<ExtractedMetricItem | null>(null);
  const [pageSearchQuery, setPageSearchQuery] = useState('');

  // Fetch document metadata with live polling while processing
  const {
    data: document,
    isLoading: isDocLoading,
    isError: isDocError,
    error: docError,
  } = useQuery({
    queryKey: ['document', docId],
    queryFn: () => documentApi.getDocumentById(docId),
    enabled: !isNaN(docId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PROCESSING' || status === 'PENDING' ? 3000 : false;
    },
  });

  const isDocumentProcessing = document?.status === 'PROCESSING' || document?.status === 'PENDING';

  // Fetch document page breakdown
  const {
    data: pagesData,
    isLoading: isPagesLoading,
  } = useQuery({
    queryKey: ['document-pages', docId],
    queryFn: () => documentApi.getDocumentPages(docId),
    enabled: !isNaN(docId) && !!document && document.status !== 'FAILED',
    refetchInterval: isDocumentProcessing ? 3000 : false,
  });

  // Fetch document metric lineage
  const {
    data: lineageData,
    isLoading: isLineageLoading,
  } = useQuery({
    queryKey: ['document-lineage', docId],
    queryFn: () => documentApi.getDocumentLineage(docId),
    enabled: !isNaN(docId) && !!document && document.status !== 'FAILED',
    refetchInterval: isDocumentProcessing ? 3000 : false,
  });

  if (isDocLoading) {
    return <LoadingState label="Retrieving Document Metadata & Intelligence Analysis..." />;
  }

  if (isDocError || !document) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto pt-8">
        <ErrorState message={docError instanceof Error ? docError.message : `Document #${docId} not found.`} />
        <Link href="/documents">
          <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Document Repository
          </Button>
        </Link>
      </div>
    );
  }

  const pages = pagesData?.pages || [];
  const metrics = lineageData?.metrics || [];
  const totalPages = document.total_pages || pages.length || 1;

  const handleSelectMetric = (metric: ExtractedMetricItem) => {
    setSelectedMetric(metric);
    if (metric.page_number) {
      setActivePage(metric.page_number);
    }
  };

  const handleJumpToPage = (pageNum: number) => {
    setActivePage(pageNum);
  };

  // Metrics on the currently active page
  const activePageMetrics = metrics.filter((m) => m.page_number === activePage);

  return (
    <div className="space-y-6">
      {/* Page Navigation Header */}
      <PageHeader
        title={document.filename}
        description="3-Column Document Intelligence Viewer: Provenanced Text Canvas, Deterministic Unit Normalization, and Line-Level Traceability."
        breadcrumbs={[
          { label: 'Document Repository', href: '/documents' },
          { label: document.filename },
        ]}
        badge={<Badge variant="amber">3-Column Command Viewer</Badge>}
        actions={
          <Link href="/documents">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Repository
            </Button>
          </Link>
        }
      />

      {/* Primary Header Card with Metadata & Pipeline Stepper */}
      <DocumentHeaderCard document={document} />

      {/* SIGNATURE 3-COLUMN DOCUMENT INTELLIGENCE VIEWER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLUMN 1 (LEFT - 3 COLS): Document Page Index & Navigation */}
        <div className="lg:col-span-3 space-y-3">
          <Card className="border-[#30383D] bg-[#1C2226]">
            <CardHeader className="py-3 px-3.5 bg-[#151A1D] border-b border-[#30383D]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-[#E8ECEB] flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-[#C58B3A]" />
                  <span>Page Directory</span>
                </CardTitle>
                <Badge variant="amber" size="sm" className="text-[10px]">
                  {totalPages} Pages
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-3 space-y-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-[#9BA5A8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter page number..."
                  value={pageSearchQuery}
                  onChange={(e) => setPageSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#151A1D] border border-[#30383D] text-xs text-[#E8ECEB] placeholder-[#9BA5A8] focus:outline-none focus:border-[#C58B3A]"
                />
              </div>

              {/* Scrollable Page Thumbnail / List */}
              <div className="max-h-[520px] overflow-y-auto space-y-1.5 pr-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => !pageSearchQuery || String(p).includes(pageSearchQuery))
                  .map((p) => {
                    const isActive = activePage === p;
                    const pageMetricsCount = metrics.filter((m) => m.page_number === p).length;

                    return (
                      <button
                        key={p}
                        onClick={() => setActivePage(p)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs font-mono ${
                          isActive
                            ? 'bg-[#C58B3A]/20 border-[#C58B3A] text-[#E8ECEB] font-bold shadow-glow-amber'
                            : 'bg-[#151A1D] border-[#30383D] text-[#9BA5A8] hover:text-[#E8ECEB] hover:bg-[#242C30]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-[#242C30] border border-[#30383D] flex items-center justify-center text-[11px] font-bold text-[#C58B3A]">
                            {p}
                          </span>
                          <span>Page {p}</span>
                        </div>

                        {pageMetricsCount > 0 ? (
                          <span className="text-[10px] bg-[#10B981]/15 text-[#10B981] px-1.5 py-0.5 rounded border border-[#10B981]/30 font-semibold">
                            {pageMetricsCount} Extracted
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#9BA5A8]/60">Text</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUMN 2 (CENTER - 5 COLS): Document Reader Canvas */}
        <div className="lg:col-span-5">
          <DocumentPageReader
            filename={document.filename}
            totalPages={totalPages}
            pages={pages}
            activePageNumber={activePage}
            onPageChange={setActivePage}
            loading={isPagesLoading}
          />
        </div>

        {/* COLUMN 3 (RIGHT - 4 COLS): Extracted Intelligence & Traceability Chain */}
        <div className="lg:col-span-4 space-y-4">
          {/* Visual Evidence Chain Card */}
          <Card className="border-[#30383D] bg-[#1C2226]">
            <CardHeader className="py-3 px-3.5 bg-[#151A1D] border-b border-[#30383D]">
              <CardTitle className="text-xs font-bold text-[#E8ECEB] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#14B8A6]" />
                <span>Evidence Traceability Chain</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-center p-2 rounded-lg bg-[#151A1D] border border-[#30383D]">
                <span className="text-[#C58B3A] font-bold">INSIGHT</span>
                <ArrowRight className="h-3 w-3 text-[#9BA5A8]" />
                <span className="text-[#14B8A6] font-bold">EVIDENCE</span>
                <ArrowRight className="h-3 w-3 text-[#9BA5A8]" />
                <span className="text-[#3B82F6] font-bold">DOCUMENT</span>
                <ArrowRight className="h-3 w-3 text-[#9BA5A8]" />
                <span className="text-[#10B981] font-bold">PAGE {activePage}</span>
                <ArrowRight className="h-3 w-3 text-[#9BA5A8]" />
                <span className="text-[#8B5CF6] font-bold">DATA</span>
              </div>
            </CardContent>
          </Card>

          {/* Active Page Metrics Card */}
          <Card className="border-[#30383D] bg-[#1C2226]">
            <CardHeader className="py-3 px-3.5 bg-[#151A1D] border-b border-[#30383D]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-[#E8ECEB] flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
                  <span>Metrics on Page {activePage}</span>
                </CardTitle>
                <Badge variant="success" size="sm">
                  {activePageMetrics.length} Verified
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-3 space-y-2">
              {activePageMetrics.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#9BA5A8] space-y-1">
                  <p>No discrete numeric metrics indexed on Page {activePage}.</p>
                  <p className="text-[11px]">Select another page from the directory on the left.</p>
                </div>
              ) : (
                activePageMetrics.map((m, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectMetric(m)}
                    className="p-3 rounded-lg bg-[#151A1D] border border-[#30383D] hover:border-[#C58B3A]/50 transition-all cursor-pointer space-y-1 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#E8ECEB] font-sans">{m.metric_name}</span>
                      <span className="text-[#10B981] font-bold">{m.standard_value} {m.standard_unit}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#9BA5A8]">
                      <span>Raw: {m.numeric_value} {m.unit}</span>
                      <span className="text-[#C58B3A]">{m.fiscal_year}</span>
                    </div>

                    {m.confidence_score && (
                      <div className="pt-1 flex items-center justify-between text-[10px] text-[#9BA5A8] border-t border-[#30383D]/50">
                        <span>Confidence: {(m.confidence_score * 100).toFixed(0)}%</span>
                        <span className="text-[#4F8A62] flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Audit Pass
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Full Extracted Metrics Table */}
          <ExtractedMetricsTable
            metrics={metrics}
            onSelectMetric={handleSelectMetric}
            loading={isLineageLoading}
          />
        </div>
      </div>

      {/* Metric Lineage Drawer for detailed modal breakdown */}
      <MetricLineageDrawer
        metric={selectedMetric}
        onClose={() => setSelectedMetric(null)}
        onJumpToPage={handleJumpToPage}
      />
    </div>
  );
}
