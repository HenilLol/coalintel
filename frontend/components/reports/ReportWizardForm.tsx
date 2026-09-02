'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Sparkles, FileSpreadsheet } from 'lucide-react';
import { CIL_SUBSIDIARIES, FISCAL_YEARS } from '@/lib/constants';

interface ReportWizardFormProps {
  onGenerate: (payload: { report_type: string; fiscal_year: string; subsidiary: string; title: string }) => void;
  isLoading: boolean;
}

const REPORT_TEMPLATES = [
  { value: 'PARLIAMENTARY_REPLY', label: 'Parliamentary Inquiry Reply (Lok Sabha / Rajya Sabha)' },
  { value: 'ANNUAL_SUMMARY', label: 'Annual Operational & Mining Summary' },
  { value: 'SUBSIDIARY_COMPARISON', label: 'Cross-Subsidiary Performance Matrix' },
  { value: 'PRODUCTION_AUDIT', label: 'Mine-Level Production & OBR Audit' },
];

export const ReportWizardForm: React.FC<ReportWizardFormProps> = ({
  onGenerate,
  isLoading,
}) => {
  const [template, setTemplate] = useState('PARLIAMENTARY_REPLY');
  const [fiscalYear, setFiscalYear] = useState('2023-24');
  const [subsidiary, setSubsidiary] = useState('ECL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const templateLabel = REPORT_TEMPLATES.find((t) => t.value === template)?.label.split('(')[0].trim() || 'Report';
    const title = `Official ${templateLabel} — ${subsidiary} (${fiscalYear})`;
    onGenerate({
      report_type: template,
      fiscal_year: fiscalYear,
      subsidiary,
      title,
    });
  };

  return (
    <Card className="border-slate-800/90 shadow-card-dark">
      <CardHeader className="py-3.5 px-4 bg-navy-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-gold-400" />
          <CardTitle className="text-sm font-semibold">Report Assembly Configuration</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Select template, fiscal year, and target subsidiary to trigger ReportLab PDF assembly.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Report Template Type"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            options={REPORT_TEMPLATES}
          />

          <Select
            label="Fiscal Year Scope"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            options={FISCAL_YEARS}
          />

          <Select
            label="Target Subsidiary"
            value={subsidiary}
            onChange={(e) => setSubsidiary(e.target.value)}
            options={CIL_SUBSIDIARIES.filter((s) => s.value !== 'ALL')}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isLoading}
            leftIcon={<Sparkles className="h-4 w-4" />}
          >
            Assemble Report Draft
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
