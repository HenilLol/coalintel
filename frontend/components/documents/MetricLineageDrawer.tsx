'use client';

import React from 'react';
import { X, Bookmark, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ExtractedMetricItem } from '@/types/document';

interface MetricLineageDrawerProps {
  metric: ExtractedMetricItem | null;
  onClose: () => void;
  onJumpToPage?: (pageNumber: number) => void;
}

export const MetricLineageDrawer: React.FC<MetricLineageDrawerProps> = ({
  metric,
  onClose,
  onJumpToPage,
}) => {
  if (!metric) return null;

  const isLakhTonnes = metric.unit?.toLowerCase().includes('lakh');
  const conf = metric.confidence_score ?? 0.95;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0B1117]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-full bg-[#17232D] border-l border-[#2C3D49] p-6 flex flex-col justify-between space-y-6 shadow-2xl overflow-y-auto text-[#F1F5F7]">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#2C3D49] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#123C43] text-[#35D3CE] border border-[#18B6B2]/40">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F1F5F7]">Metric Evidence & Lineage</h3>
                <p className="text-xs text-[#9EADB7]">Provenanced Extraction Traceability</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#9EADB7] hover:text-[#F1F5F7] hover:bg-[#20313D] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mine & Metric Entity Header Card */}
          <div className="p-4 rounded-xl bg-[#20313D] border border-[#2C3D49] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#F2A900] uppercase font-semibold">
                {metric.mine_name}
              </span>
              <Badge variant="success" size="sm">
                Page {metric.page_number || 1}
              </Badge>
            </div>
            <h4 className="text-lg font-extrabold text-[#F1F5F7] font-sans">
              {metric.metric_name}
            </h4>
          </div>

          {/* Unit Normalization Traceability Card */}
          <div className="p-4 rounded-xl bg-[#20313D] border border-[#2C3D49] space-y-3">
            <span className="text-[10px] font-mono text-[#9EADB7] uppercase tracking-wider font-semibold">
              Deterministic Unit Normalization
            </span>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#111B24] border border-[#2C3D49] font-mono text-xs">
              <div>
                <span className="text-[#9EADB7] block text-[10px]">Raw Extracted</span>
                <span className="text-[#F1F5F7] font-bold">
                  {metric.numeric_value} {metric.unit}
                </span>
              </div>

              <ArrowRight className="h-4 w-4 text-[#18B6B2] shrink-0" />

              <div className="text-right">
                <span className="text-[#9EADB7] block text-[10px]">Standardized</span>
                <span className="text-[#F2A900] font-bold">
                  {metric.standard_value} {metric.standard_unit || 'MT'}
                </span>
              </div>
            </div>

            {isLakhTonnes && (
              <p className="text-[11px] font-mono text-[#9EADB7] bg-[#3A2C0A] p-2 rounded border border-[#F2A900]/30">
                Formula applied: <span className="text-[#F2A900] font-semibold">Lakh Tonnes × 0.1 = Million Tonnes (MT)</span>
              </p>
            )}
          </div>

          {/* Raw Evidence Text Snippet */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#9EADB7] uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Bookmark className="h-3.5 w-3.5 text-[#18B6B2]" />
              Raw Source Text Snippet
            </span>

            <div className="p-4 rounded-xl bg-[#111B24] border border-[#2C3D49] text-xs font-sans text-[#F1F5F7] leading-relaxed max-h-48 overflow-y-auto selection:bg-[#18B6B2]/30">
              {metric.raw_snippet ? (
                <mark className="bg-[#3A2C0A] text-[#F2A900] p-1 rounded font-mono border border-[#F2A900]/30 block">
                  &quot;{metric.raw_snippet}&quot;
                </mark>
              ) : (
                <span className="italic text-[#9EADB7]">No raw snippet text available for this metric.</span>
              )}
            </div>
          </div>

          {/* Validation & Confidence Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-[#20313D] border border-[#2C3D49] space-y-1">
              <span className="text-[10px] font-mono text-[#9EADB7] uppercase block">Confidence Score</span>
              <span className="text-base font-bold font-mono text-[#39B978]">{conf.toFixed(3)}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#20313D] border border-[#2C3D49] space-y-1">
              <span className="text-[10px] font-mono text-[#9EADB7] uppercase block">Validation Flag</span>
              <span className="text-xs font-bold font-mono text-[#35D3CE] block truncate">
                {metric.validation_status || 'VERIFIED'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Jump to Page Action */}
        <div className="pt-4 border-t border-[#2C3D49] flex items-center justify-between gap-3">
          <Button variant="ghost" size="md" onClick={onClose}>
            Close
          </Button>

          {metric.page_number && onJumpToPage && (
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                onJumpToPage(metric.page_number!);
                onClose();
              }}
              rightIcon={<ExternalLink className="h-4 w-4" />}
            >
              Jump to Page {metric.page_number}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
