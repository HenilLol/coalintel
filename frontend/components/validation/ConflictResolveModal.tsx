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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coal-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl p-6 rounded-2xl bg-white border border-steel shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-steel pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">Cross-Document Conflict Resolution</h3>
              <p className="text-xs text-slateText">
                {conflict.mine_name} • {conflict.metric_name} ({conflict.fiscal_year})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slateText hover:text-ink hover:bg-ash transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Side-by-Side Document Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Document A */}
          <div className="p-4 rounded-xl bg-ash border border-steel space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slateText">
              <span className="font-bold text-teal-700">DOCUMENT A</span>
              <span>ID #{conflict.document_a_id}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-ink truncate">
              <FileText className="h-4 w-4 text-teal-600 shrink-0" />
              <span className="truncate" title={conflict.document_a_filename}>{conflict.document_a_filename}</span>
            </div>
            <div className="pt-2 border-t border-steel flex items-baseline justify-between font-mono">
              <span className="text-xs text-slateText">Reported Metric:</span>
              <span className="text-base font-bold text-ink">
                {conflict.document_a_value} {conflict.document_a_unit}
              </span>
            </div>
          </div>

          {/* Document B */}
          <div className="p-4 rounded-xl bg-ash border border-steel space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slateText">
              <span className="font-bold text-warning">DOCUMENT B</span>
              <span>ID #{conflict.document_b_id}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-ink truncate">
              <FileText className="h-4 w-4 text-danger shrink-0" />
              <span className="truncate" title={conflict.document_b_filename}>{conflict.document_b_filename}</span>
            </div>
            <div className="pt-2 border-t border-steel flex items-baseline justify-between font-mono">
              <span className="text-xs text-slateText">Reported Metric:</span>
              <span className="text-base font-bold text-ink">
                {conflict.document_b_value} {conflict.document_b_unit}
              </span>
            </div>
          </div>
        </div>

        {/* Discrepancy Banner */}
        <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs flex items-center justify-between font-semibold">
          <span>Calculated Discrepancy Percentage:</span>
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
            <label className="text-xs font-semibold text-ink">Resolution Auditor Notes</label>
            <textarea
              rows={3}
              placeholder="Provide technical justification or audit rationale for conflict resolution..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl bg-white border border-steel p-3 text-xs text-ink focus:outline-none focus:border-amber-500 font-sans shadow-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-steel">
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
