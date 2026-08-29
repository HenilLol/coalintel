import React, { useState } from 'react';
import { AlertTriangle, Check, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

export const ConflictResolverPage = () => {
  const { addToast } = useToast();
  const [selectedConflict, setSelectedConflict] = useState(null);

  const sampleConflicts = [
    {
      id: 1,
      mine: 'Rajmahal OpenCast',
      metric: 'Coal Production (FY 2023-24)',
      docA: { id: 101, name: 'ECL_Annual_Report_2023-24.pdf', value: '42.50 MT', raw: '42.50 MT' },
      docB: { id: 102, name: 'RTI_Disclosure_ECL_Q4.pdf', value: '41.80 MT', raw: '418.00 Lakh Tonnes' },
      discrepancy: '1.67%',
      status: 'OPEN'
    },
    {
      id: 2,
      mine: 'Gevra OpenCast',
      metric: 'Overburden Removal (FY 2023-24)',
      docA: { id: 201, name: 'SECL_Production_Audit.pdf', value: '310.50 M.Cu.M', raw: '310.50 M.Cu.M' },
      docB: { id: 202, name: 'CMPDI_Geological_Survey.pdf', value: '305.00 M.Cu.M', raw: '305.00 M.Cu.M' },
      discrepancy: '1.80%',
      status: 'OPEN'
    }
  ];

  const handleResolve = (action) => {
    addToast(`Conflict #${selectedConflict.id} resolved via action '${action}'. Audit log entry created.`, 'success');
    setSelectedConflict(null);
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          Cross-Document Conflict Resolver
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Side-by-side verification and manual override for discrepancies exceeding 1.0% threshold
        </p>
      </div>

      <div className="space-y-4">
        {sampleConflicts.map((c) => (
          <Card key={c.id} className="border-l-4 border-l-rose-500">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">{c.mine}</span>
                  <Badge status="CONFLICT_DETECTED" size="xs" />
                  <span className="text-xs text-rose-400 font-mono font-bold">Discrepancy: {c.discrepancy}</span>
                </div>
                <p className="text-xs text-slate-400 font-medium">{c.metric}</p>
              </div>

              {/* Side by side value preview */}
              <div className="grid grid-cols-2 gap-4 bg-slate-900/80 p-3 rounded-lg border border-slate-700/80 text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Source Document A</div>
                  <div className="font-semibold text-white truncate max-w-[140px]">{c.docA.name}</div>
                  <div className="text-amber-400 font-mono font-bold mt-0.5">{c.docA.value}</div>
                </div>
                <div className="border-l border-slate-700/80 pl-4">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Source Document B</div>
                  <div className="font-semibold text-white truncate max-w-[140px]">{c.docB.name}</div>
                  <div className="text-amber-400 font-mono font-bold mt-0.5">{c.docB.value}</div>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={Check}
                onClick={() => setSelectedConflict(c)}
              >
                Resolve Conflict
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* RESOLUTION MODAL */}
      {selectedConflict && (
        <Modal
          isOpen={!!selectedConflict}
          onClose={() => setSelectedConflict(null)}
          title={`Resolve Conflict — ${selectedConflict.mine}`}
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setSelectedConflict(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => handleResolve('SELECT_DOC_A')}>
                Accept Doc A ({selectedConflict.docA.value})
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleResolve('SELECT_DOC_B')}>
                Accept Doc B ({selectedConflict.docB.value})
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Select which verified value should be marked as authoritative in <code className="text-amber-400">extracted_metrics</code>:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg space-y-2">
                <div className="font-semibold text-white">{selectedConflict.docA.name}</div>
                <div className="text-lg font-bold text-amber-400">{selectedConflict.docA.value}</div>
                <div className="text-[10px] text-slate-400">Raw: {selectedConflict.docA.raw}</div>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg space-y-2">
                <div className="font-semibold text-white">{selectedConflict.docB.name}</div>
                <div className="text-lg font-bold text-amber-400">{selectedConflict.docB.value}</div>
                <div className="text-[10px] text-slate-400">Raw: {selectedConflict.docB.raw}</div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
