'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Sparkles,
  Calculator,
  ArrowRight,
  Database,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface PresetMineCase {
  mineName: string;
  subsidiary: string;
  openingStock: number;
  production: number;
  dispatch: number;
  reportedClosingStock: number;
  expectedResult: 'VALID' | 'MISMATCH';
}

const PRESET_CASES: PresetMineCase[] = [
  {
    mineName: 'Rajmahal OCP (ECL)',
    subsidiary: 'ECL',
    openingStock: 4.20,
    production: 17.80,
    dispatch: 18.10,
    reportedClosingStock: 3.90, // 4.2 + 17.8 - 18.1 = 3.90 (0.0% variance -> VALID)
    expectedResult: 'VALID',
  },
  {
    mineName: 'Gevra Expansion OCP (SECL)',
    subsidiary: 'SECL',
    openingStock: 8.50,
    production: 52.50,
    dispatch: 51.80,
    reportedClosingStock: 9.20, // 8.5 + 52.5 - 51.8 = 9.20 (0.0% variance -> VALID)
    expectedResult: 'VALID',
  },
  {
    mineName: 'Moonidih UG Mine (BCCL)',
    subsidiary: 'BCCL',
    openingStock: 0.45,
    production: 1.20,
    dispatch: 1.10,
    reportedClosingStock: 0.85, // 0.45 + 1.20 - 1.10 = 0.55 != 0.85 (Variance: 54.5% -> MISMATCH)
    expectedResult: 'MISMATCH',
  },
  {
    mineName: 'Samaleswari OCP (MCL)',
    subsidiary: 'MCL',
    openingStock: 2.10,
    production: 14.85,
    dispatch: 14.20,
    reportedClosingStock: 2.75, // 2.10 + 14.85 - 14.20 = 2.75 (0.0% variance -> VALID)
    expectedResult: 'VALID',
  },
];

export const ValidationFormulaVisualizer: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<PresetMineCase>(PRESET_CASES[0]);
  const [openingStock, setOpeningStock] = useState<number>(PRESET_CASES[0].openingStock);
  const [production, setProduction] = useState<number>(PRESET_CASES[0].production);
  const [dispatch, setDispatch] = useState<number>(PRESET_CASES[0].dispatch);
  const [reportedClosingStock, setReportedClosingStock] = useState<number>(PRESET_CASES[0].reportedClosingStock);

  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationStage, setEvaluationStage] = useState<'idle' | 'sum' | 'subtract' | 'complete'>('idle');

  // Load preset
  const handleSelectPreset = (p: PresetMineCase) => {
    setSelectedCase(p);
    setOpeningStock(p.openingStock);
    setProduction(p.production);
    setDispatch(p.dispatch);
    setReportedClosingStock(p.reportedClosingStock);
    setEvaluationStage('idle');
  };

  // Run animated formula evaluation
  const handleRunEvaluation = () => {
    setIsEvaluating(true);
    setEvaluationStage('sum');

    setTimeout(() => {
      setEvaluationStage('subtract');
    }, 600);

    setTimeout(() => {
      setEvaluationStage('complete');
      setIsEvaluating(false);
    }, 1200);
  };

  const calculatedClosing = Number((openingStock + production - dispatch).toFixed(2));
  const varianceAbs = Math.abs(calculatedClosing - reportedClosingStock);
  const variancePct = reportedClosingStock > 0 ? (varianceAbs / reportedClosingStock) * 100 : 0;
  const isValid = variancePct <= 5.0; // 5% official threshold

  return (
    <Card className="border-[#30383D] bg-[#151A1D] p-5 space-y-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30383D] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#242C30] border border-[#30383D] text-[#10B981]">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#E8ECEB] font-sans">
                Deterministic Arithmetic Reconciliation Engine
              </h3>
              <Badge variant="amber" size="sm">
                5% Threshold
              </Badge>
            </div>
            <p className="text-xs text-[#9BA5A8]">
              Automated reconciliation: Opening Stock + Production − Dispatch = Closing Stock (MT)
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#9BA5A8] hidden sm:inline">Preset Mine Case:</span>
          <select
            value={selectedCase.mineName}
            onChange={(e) => {
              const found = PRESET_CASES.find((c) => c.mineName === e.target.value);
              if (found) handleSelectPreset(found);
            }}
            className="bg-[#1C2226] border border-[#30383D] text-xs font-mono text-[#E8ECEB] px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#C58B3A]"
          >
            {PRESET_CASES.map((c) => (
              <option key={c.mineName} value={c.mineName}>
                {c.mineName} ({c.expectedResult})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interactive Formula Visualizer Box */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-center font-mono">
        {/* Term 1: Opening Stock */}
        <div className="md:col-span-2 p-3 rounded-xl bg-[#1C2226] border border-[#30383D] space-y-1">
          <span className="text-[10px] text-[#9BA5A8] uppercase tracking-wider block">Opening Stock</span>
          <input
            type="number"
            step="0.01"
            value={openingStock}
            onChange={(e) => {
              setOpeningStock(parseFloat(e.target.value) || 0);
              setEvaluationStage('idle');
            }}
            className="w-full text-center bg-[#151A1D] border border-[#30383D] text-sm font-bold text-[#E8ECEB] rounded p-1 focus:outline-none focus:border-[#C58B3A]"
          />
          <span className="text-[10px] text-[#C58B3A]">Million Tonnes</span>
        </div>

        {/* Operator: + */}
        <div className="md:col-span-1 flex items-center justify-center">
          <span className="text-xl font-bold text-[#10B981] bg-[#242C30] w-8 h-8 rounded-full flex items-center justify-center border border-[#30383D]">
            +
          </span>
        </div>

        {/* Term 2: Production */}
        <div className="md:col-span-2 p-3 rounded-xl bg-[#1C2226] border border-[#30383D] space-y-1">
          <span className="text-[10px] text-[#9BA5A8] uppercase tracking-wider block">Production (Output)</span>
          <input
            type="number"
            step="0.01"
            value={production}
            onChange={(e) => {
              setProduction(parseFloat(e.target.value) || 0);
              setEvaluationStage('idle');
            }}
            className="w-full text-center bg-[#151A1D] border border-[#30383D] text-sm font-bold text-[#E8ECEB] rounded p-1 focus:outline-none focus:border-[#C58B3A]"
          />
          <span className="text-[10px] text-[#10B981]">Million Tonnes</span>
        </div>

        {/* Operator: - */}
        <div className="md:col-span-1 flex items-center justify-center">
          <span className="text-xl font-bold text-[#EF4444] bg-[#242C30] w-8 h-8 rounded-full flex items-center justify-center border border-[#30383D]">
            −
          </span>
        </div>

        {/* Term 3: Dispatch */}
        <div className="md:col-span-2 p-3 rounded-xl bg-[#1C2226] border border-[#30383D] space-y-1">
          <span className="text-[10px] text-[#9BA5A8] uppercase tracking-wider block">Coal Dispatch</span>
          <input
            type="number"
            step="0.01"
            value={dispatch}
            onChange={(e) => {
              setDispatch(parseFloat(e.target.value) || 0);
              setEvaluationStage('idle');
            }}
            className="w-full text-center bg-[#151A1D] border border-[#30383D] text-sm font-bold text-[#E8ECEB] rounded p-1 focus:outline-none focus:border-[#C58B3A]"
          />
          <span className="text-[10px] text-[#3B82F6]">Million Tonnes</span>
        </div>

        {/* Operator: = */}
        <div className="md:col-span-1 flex items-center justify-center">
          <span className="text-xl font-bold text-[#E8ECEB] bg-[#242C30] w-8 h-8 rounded-full flex items-center justify-center border border-[#30383D]">
            =
          </span>
        </div>

        {/* Calculated vs Reported Result Box */}
        <div className="md:col-span-3 p-3 rounded-xl bg-[#1C2226] border border-[#30383D] space-y-1">
          <span className="text-[10px] text-[#9BA5A8] uppercase tracking-wider block">Reported Closing Stock</span>
          <input
            type="number"
            step="0.01"
            value={reportedClosingStock}
            onChange={(e) => {
              setReportedClosingStock(parseFloat(e.target.value) || 0);
              setEvaluationStage('idle');
            }}
            className="w-full text-center bg-[#151A1D] border border-[#30383D] text-sm font-bold text-[#E8ECEB] rounded p-1 focus:outline-none focus:border-[#C58B3A]"
          />
          <span className="text-[10px] text-[#9BA5A8]">Calculated: <strong className="text-[#E8ECEB]">{calculatedClosing} MT</strong></span>
        </div>
      </div>

      {/* Action Button & Live Animated Evaluation Outcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#1C2226] border border-[#30383D]">
        <Button
          variant="primary"
          onClick={handleRunEvaluation}
          isLoading={isEvaluating}
          leftIcon={<Play className="h-4 w-4" />}
          className="text-xs font-mono py-2"
        >
          {isEvaluating ? 'Evaluating Arithmetic Chain...' : 'Animate Formula Evaluation'}
        </Button>

        {/* Evaluation Banner Outcome */}
        <div className="flex items-center gap-3">
          {evaluationStage === 'idle' ? (
            <div className="text-xs font-mono text-[#9BA5A8] flex items-center gap-1.5">
              <span>Ready for arithmetic verification</span>
            </div>
          ) : evaluationStage === 'sum' ? (
            <div className="text-xs font-mono text-[#10B981] flex items-center gap-1.5 animate-pulse">
              <span>Evaluating Sum: ({openingStock} + {production}) = {(openingStock + production).toFixed(2)} MT...</span>
            </div>
          ) : evaluationStage === 'subtract' ? (
            <div className="text-xs font-mono text-[#3B82F6] flex items-center gap-1.5 animate-pulse">
              <span>Subtracting Dispatch: - {dispatch} = {calculatedClosing} MT...</span>
            </div>
          ) : isValid ? (
            <div className="flex items-center gap-2 p-2 px-3 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-mono text-xs shadow-glow-emerald animate-fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <div>
                <strong className="font-bold">STATUS: VALID</strong>
                <span className="text-[11px] block text-[#4F8A62]">
                  Calculated: {calculatedClosing} MT • Reported: {reportedClosingStock} MT (Delta: {variancePct.toFixed(1)}% ≤ 5%)
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 px-3 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] font-mono text-xs shadow-glow-red animate-fade-in">
              <XCircle className="h-4 w-4 shrink-0" />
              <div>
                <strong className="font-bold">STATUS: ARITHMETIC MISMATCH</strong>
                <span className="text-[11px] block text-[#DC2626]">
                  Calculated: {calculatedClosing} MT • Reported: {reportedClosingStock} MT (Variance: {variancePct.toFixed(1)}% &gt; 5%)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
