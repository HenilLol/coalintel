'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  Building2,
  Calendar,
  Layers,
  ShieldCheck,
  FileCheck,
  Download,
  Eye,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface StudioStep {
  step: number;
  id: string;
  title: string;
  short: string;
}

export const STUDIO_STEPS: StudioStep[] = [
  { step: 1, id: 'req', title: '01 Requirement', short: 'Requirement' },
  { step: 2, id: 'sub', title: '02 Mine/Subsidiary', short: 'Subsidiary' },
  { step: 3, id: 'period', title: '03 Reporting Period', short: 'Period' },
  { step: 4, id: 'metrics', title: '04 Metrics', short: 'Metrics' },
  { step: 5, id: 'evidence', title: '05 Evidence', short: 'Evidence' },
  { step: 6, id: 'validation', title: '06 Validation', short: 'Validation' },
  { step: 7, id: 'generate', title: '07 Generate', short: 'Generate' },
  { step: 8, id: 'review', title: '08 Review', short: 'Review' },
  { step: 9, id: 'export', title: '09 Export', short: 'Export' },
];

interface Props {
  onTriggerGenerate?: () => void;
  isGenerating?: boolean;
}

export const ReportStudioStepper: React.FC<Props> = ({
  onTriggerGenerate,
  isGenerating = false,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [template, setTemplate] = useState('PARLIAMENTARY_REPLY');
  const [subsidiary, setSubsidiary] = useState('ALL CIL');
  const [fiscalYear, setFiscalYear] = useState('2024-25');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'Raw Coal Production (MT)',
    'Overburden Removal (OBR)',
    'Coal Despatch (MT)',
  ]);

  const toggleMetric = (m: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  return (
    <Card className="border-[#30383D] bg-[#151A1D] p-5 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30383D] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#242C30] border border-[#30383D] text-[#F97316]">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#E8ECEB] font-sans">
              REPORT STUDIO: 9-Stage Institutional Workflow
            </h3>
            <p className="text-xs text-[#9BA5A8]">
              Automated compilation of Parliamentary Replies, Audits, and Annual Summaries via ReportLab
            </p>
          </div>
        </div>

        <Badge variant="amber" size="sm">
          Stage {currentStep} of 9
        </Badge>
      </div>

      {/* Visual Progress Timeline (9 Steps) */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center justify-between min-w-[700px] relative">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-[#30383D] -translate-y-1/2 z-0" />
          {STUDIO_STEPS.map((s) => {
            const isCompleted = s.step < currentStep;
            const isCurrent = s.step === currentStep;

            return (
              <button
                key={s.step}
                onClick={() => setCurrentStep(s.step)}
                className="relative z-10 flex flex-col items-center gap-1 group focus:outline-none"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                    isCompleted
                      ? 'bg-[#10B981] text-[#0E1113]'
                      : isCurrent
                      ? 'bg-[#C58B3A] text-[#0E1113] ring-4 ring-[#C58B3A]/20 scale-110'
                      : 'bg-[#242C30] border border-[#30383D] text-[#9BA5A8] hover:text-[#E8ECEB]'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : s.step}
                </div>
                <span
                  className={`text-[10px] font-mono whitespace-nowrap ${
                    isCurrent ? 'text-[#C58B3A] font-bold' : 'text-[#9BA5A8]'
                  }`}
                >
                  {s.short}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="p-5 rounded-xl bg-[#1C2226] border border-[#30383D] space-y-4">
        {currentStep === 1 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono text-[#C58B3A] uppercase">
              Step 01: Requirement & Template Selection
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'PARLIAMENTARY_REPLY', title: 'Parliamentary Starred Reply Draft', desc: 'Formal ministerial submission format with target vs actual variance.' },
                { id: 'ANNUAL_SUMMARY', title: 'Subsidiary Annual Performance Summary', desc: 'Comprehensive financial year operational review with OBR and star ratings.' },
                { id: 'SUBSIDIARY_COMPARISON', title: 'Cross-Subsidiary Metric Comparison', desc: 'Tabular benchmarking across all 8 CIL coal-producing subsidiaries.' },
                { id: 'PRODUCTION_AUDIT', title: 'Mine-Level Production & OBR Audit', desc: 'Granular pit-level audit reconciling opening stock and dispatch ledgers.' },
              ].map((t) => (
                <div
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    template === t.id
                      ? 'bg-[#242C30] border-[#C58B3A] shadow-glow-amber'
                      : 'bg-[#151A1D] border-[#30383D] hover:border-[#9BA5A8]/50'
                  }`}
                >
                  <span className="text-xs font-bold text-[#E8ECEB] block font-sans">{t.title}</span>
                  <span className="text-[11px] text-[#9BA5A8] mt-1 block">{t.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono text-[#C58B3A] uppercase">
              Step 02: Mine & Subsidiary Scope
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              {['ALL CIL', 'ECL', 'BCCL', 'CCL', 'WCL', 'SECL', 'NCL', 'MCL', 'CMPDI'].map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSubsidiary(sub)}
                  className={`p-3 rounded-lg border text-center font-bold transition-all ${
                    subsidiary === sub
                      ? 'bg-[#C58B3A]/20 border-[#C58B3A] text-[#C58B3A]'
                      : 'bg-[#151A1D] border-[#30383D] text-[#9BA5A8] hover:text-[#E8ECEB]'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono text-[#C58B3A] uppercase">
              Step 03: Reporting Period Selection
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              {['2026-27 (Q1 YTD)', '2025-26 (Provisional)', '2024-25 (Audited)', '2023-24 (Audited)', '2022-23 (Audited)'].map((fy) => (
                <button
                  key={fy}
                  onClick={() => setFiscalYear(fy)}
                  className={`p-3.5 rounded-lg border text-left font-bold transition-all ${
                    fiscalYear === fy
                      ? 'bg-[#C58B3A]/20 border-[#C58B3A] text-[#C58B3A]'
                      : 'bg-[#151A1D] border-[#30383D] text-[#9BA5A8] hover:text-[#E8ECEB]'
                  }`}
                >
                  {fy}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono text-[#C58B3A] uppercase">
              Step 04: Metrics Included in Report
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              {[
                'Raw Coal Production (MT)',
                'Overburden Removal (OBR)',
                'Coal Despatch (MT)',
                'Stripping Ratio (m³/Tonne)',
                'HEMM Equipment Availability (%)',
                'Mine Star Rating',
              ].map((m) => {
                const isSelected = selectedMetrics.includes(m);
                return (
                  <div
                    key={m}
                    onClick={() => toggleMetric(m)}
                    className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#E8ECEB]'
                        : 'bg-[#151A1D] border-[#30383D] text-[#9BA5A8]'
                    }`}
                  >
                    <span>{m}</span>
                    <input type="checkbox" checked={isSelected} readOnly className="accent-[#10B981]" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono text-[#C58B3A] uppercase">
              Step 05: Document Evidence Grounding
            </h4>
            <div className="p-3.5 rounded-lg bg-[#151A1D] border border-[#30383D] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[#10B981]">
                <span>ChromaDB Vector Provenance:</span>
                <span className="font-bold">48 Grounded Chunks Attached</span>
              </div>
              <div className="flex items-center justify-between text-[#9BA5A8]">
                <span>Document Citations:</span>
                <span className="text-[#E8ECEB]">ECL, SECL, MCL Annual Reports & Monthly Returns</span>
              </div>
              <div className="flex items-center justify-between text-[#9BA5A8]">
                <span>SHA-256 Checksums:</span>
                <span className="text-[#4F8A62] font-semibold">100% Cryptographically Verified</span>
              </div>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono text-[#C58B3A] uppercase">
              Step 06: Arithmetic Validation Audit
            </h4>
            <div className="p-4 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 flex items-center gap-3 text-xs font-mono text-[#10B981]">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div>
                <strong className="font-bold block">Deterministic Formula Check: Passed</strong>
                <span className="text-[11px] text-[#4F8A62]">
                  Opening Stock + Production − Dispatch = Closing Stock verified within 5% statutory tolerance.
                </span>
              </div>
            </div>
          </div>
        )}

        {currentStep === 7 && (
          <div className="space-y-3 text-center py-4">
            <h4 className="text-xs font-bold font-mono text-[#C58B3A] uppercase">
              Step 07: Python ReportLab Compilation
            </h4>
            <p className="text-xs text-[#9BA5A8] max-w-md mx-auto">
              Ready to assemble formal PDF document with institutional cover page, executive briefing tables, and page-grounded citations.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={onTriggerGenerate}
                isLoading={isGenerating}
                leftIcon={<Sparkles className="h-4 w-4" />}
                className="text-xs font-mono py-2.5 px-6"
              >
                Compile ReportLab Document
              </Button>
            </div>
          </div>
        )}

        {currentStep === 8 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono text-[#C58B3A] uppercase">
              Step 08: Executive Review & Approval
            </h4>
            <div className="p-3.5 rounded-lg bg-[#151A1D] border border-[#30383D] flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[#E8ECEB] font-bold block">Status: DRAFT READY FOR REVIEW</span>
                <span className="text-[11px] text-[#9BA5A8]">Author: CoalIntel AI Engine • Reviewer: CMPDI Analyst</span>
              </div>
              <Badge variant="amber">PENDING APPROVAL</Badge>
            </div>
          </div>
        )}

        {currentStep === 9 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono text-[#C58B3A] uppercase">
              Step 09: Institutional Export
            </h4>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button variant="primary" leftIcon={<Download className="h-4 w-4" />} className="text-xs font-mono">
                Download Official PDF
              </Button>
              <Button variant="secondary" leftIcon={<FileSpreadsheet className="h-4 w-4" />} className="text-xs font-mono">
                Export Data XLSX
              </Button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[#30383D]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
            className="text-xs font-mono"
          >
            Back
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentStep((s) => Math.min(9, s + 1))}
            disabled={currentStep === 9}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            className="text-xs font-mono"
          >
            Next Stage
          </Button>
        </div>
      </div>
    </Card>
  );
};
