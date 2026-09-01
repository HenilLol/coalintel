'use client';

import React from 'react';
import { X, ShieldCheck, Bookmark, ArrowRight, Sparkles, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex justify-end bg-navy-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-full bg-navy-900 border-l border-slate-800 p-6 flex flex-col justify-between space-y-6 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-gold-500/10 text-gold-400 border border-gold-500/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Metric Evidence & Lineage</h3>
                <p className="text-xs text-slate-400">Provenanced Extraction Traceability</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-navy-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mine & Metric Entity Header Card */}
          <div className="p-4 rounded-xl bg-navy-950/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gold-400 uppercase font-semibold">
                {metric.mine_name}
              </span>
              <Badge variant="success" size="sm">
                Page {metric.page_number || 1}
              </Badge>
            </div>
            <h4 className="text-lg font-extrabold text-slate-100 font-sans">
              {metric.metric_name}
            </h4>
          </div>

          {/* Unit Normalization Traceability Card */}
          <div className="p-4 rounded-xl bg-navy-950/60 border border-slate-800/90 space-y-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Deterministic Unit Normalization
            </span>

            <div className="flex items-center justify-between p-3 rounded-lg bg-navy-900 border border-slate-800 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Raw Extracted</span>
                <span className="text-slate-200 font-bold">
                  {metric.numeric_value} {metric.unit}
                </span>
              </div>

              <ArrowRight className="h-4 w-4 text-gold-400 shrink-0" />

              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Standardized</span>
                <span className="text-gold-400 font-bold">
                  {metric.standard_value} {metric.standard_unit || 'MT'}
                </span>
              </div>
            </div>

            {isLakhTonnes && (
              <p className="text-[11px] font-mono text-slate-400 bg-gold-500/5 p-2 rounded border border-gold-500/20">
                Formula applied: <span className="text-gold-300 font-semibold">Lakh Tonnes × 0.1 = Million Tonnes (MT)</span>
              </p>
            )}
          </div>

          {/* Raw Evidence Text Snippet */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Bookmark className="h-3.5 w-3.5 text-gold-400" />
              Raw Source Text Snippet
            </span>

            <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 text-xs font-sans text-slate-300 leading-relaxed max-h-48 overflow-y-auto selection:bg-gold-500/30">
              {metric.raw_snippet ? (
                <mark className="bg-gold-500/20 text-gold-200 p-1 rounded font-mono border border-gold-500/30 block">
                  &quot;{metric.raw_snippet}&quot;
                </mark>
              ) : (
                <span className="italic text-slate-500">No raw snippet text available for this metric.</span>
              )}
            </div>
          </div>

          {/* Validation & Confidence Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Confidence Score</span>
              <span className="text-base font-bold font-mono text-emerald-400">{conf.toFixed(3)}</span>
            </div>

            <div className="p-3 rounded-xl bg-navy-950 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Validation Status</span>
              <span className="text-xs font-bold font-mono text-slate-200">{metric.validation_status || 'VALIDATED'}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
          <Button variant="ghost" size="md" onClick={onClose} className="w-full">
            Close
          </Button>

          {onJumpToPage && metric.page_number && (
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                onJumpToPage(metric.page_number || 1);
                onClose();
              }}
              rightIcon={<ExternalLink className="h-4 w-4" />}
              className="w-full"
            >
              Jump to Page {metric.page_number}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
