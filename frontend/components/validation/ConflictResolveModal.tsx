'use client';

import React, { useState } from 'react';
import { X, GitCompare, CheckCircle2, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ConflictItem, ResolveConflictPayload } from '@/lib/api/validationApi';

interface ConflictResolveModalProps {
  conflict: ConflictItem | null;
  onClose: () => void;
  onResolve: (id: number, payload: ResolveConflictPayload) => void;
  isLoading?: boolean;
}

export const ConflictResolveModal: React.FC<ConflictResolveModalProps> = ({
  conflict,
  onClose,
  onResolve,
  isLoading = false,
}) => {
  const [action, setAction] = useState('ACCEPT_DOC_A');
  const [overrideValue, setOverrideValue] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!conflict) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onResolve(conflict.id, {
      resolution_action: action,
      override_value: action === 'OVERRIDE' && overrideValue ? parseFloat(overrideValue) : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl p-6 rounded-2xl bg-navy-900 border border-slate-800 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Cross-Document Conflict Resolution</h3>
              <p className="text-xs text-slate-400">
                {conflict.mine_name} • {conflict.metric_name} ({conflict.fiscal_year})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-navy-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Side-by-Side Document Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Document A */}
          <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="font-semibold text-gold-400">DOCUMENT A</span>
              <span>ID #{conflict.document_a_id}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 truncate">
              <FileText className="h-4 w-4 text-sky-400 shrink-0" />
              <span className="truncate" title={conflict.document_a_filename}>{conflict.document_a_filename}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between font-mono">
              <span className="text-xs text-slate-400">Reported Metric:</span>
              <span className="text-base font-bold text-slate-100">
                {conflict.document_a_value} {conflict.document_a_unit}
              </span>
            </div>
          </div>

          {/* Document B */}
          <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="font-semibold text-amber-400">DOCUMENT B</span>
              <span>ID #{conflict.document_b_id}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 truncate">
              <FileText className="h-4 w-4 text-red-400 shrink-0" />
              <span className="truncate" title={conflict.document_b_filename}>{conflict.document_b_filename}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between font-mono">
              <span className="text-xs text-slate-400">Reported Metric:</span>
              <span className="text-base font-bold text-slate-100">
                {conflict.document_b_value} {conflict.document_b_unit}
              </span>
            </div>
          </div>
        </div>

        {/* Discrepancy Banner */}
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between">
          <span className="font-semibold">Calculated Discrepancy Percentage:</span>
          <Badge variant="danger" size="md">
            {conflict.discrepancy_percentage?.toFixed(2)}% Discrepancy
          </Badge>
        </div>

        {/* Resolution Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Resolution Action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            options={[
              { value: 'ACCEPT_DOC_A', label: `Accept Document A Value (${conflict.document_a_value} ${conflict.document_a_unit})` },
              { value: 'ACCEPT_DOC_B', label: `Accept Document B Value (${conflict.document_b_value} ${conflict.document_b_unit})` },
              { value: 'OVERRIDE', label: 'Manual Custom Override Value' },
              { value: 'FLAG_UNRESOLVED', label: 'Flag for Auditor Investigation' },
            ]}
          />

          {action === 'OVERRIDE' && (
            <Input
              label="Custom Override Metric Value"
              type="number"
              step="0.01"
              placeholder="Enter authoritative metric value"
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
              required
            />
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Resolution Auditor Notes</label>
            <textarea
              rows={3}
              placeholder="Provide technical justification or audit rationale for conflict resolution..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl bg-navy-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:border-gold-500 font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" size="md" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Resolve & Update Audit Ledger
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
