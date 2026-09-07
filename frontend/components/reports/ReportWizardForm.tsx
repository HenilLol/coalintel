'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Sparkles, FileSpreadsheet } from 'lucide-react';
import { REPORT_TEMPLATES, FISCAL_YEARS, CIL_SUBSIDIARIES } from '@/lib/constants';

interface ReportWizardFormProps {
  onGenerate: (params: {
    report_type: string;
    fiscal_year: string;
    subsidiary: string;
    title: string;
  }) => void;
  isLoading?: boolean;
}

export const ReportWizardForm: React.FC<ReportWizardFormProps> = ({
  onGenerate,
  isLoading = false,
}) => {
  const [template, setTemplate] = useState('PARLIAMENTARY_REPLY');
  const [fiscalYear, setFiscalYear] = useState('2023-24');
  const [subsidiary, setSubsidiary] = useState('ECL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const templateObj = REPORT_TEMPLATES.find((t) => t.value === template);
    const title = `${subsidiary} ${templateObj?.label || 'Mining Report'} (${fiscalYear})`;

    onGenerate({
      report_type: template,
      fiscal_year: fiscalYear,
      subsidiary,
      title,
    });
  };

  return (
    <Card className="border-[#2C3D49] shadow-lg bg-[#17232D]">
      <CardHeader className="py-3.5 px-4 bg-[#20313D] border-b border-[#2C3D49]">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[#18B6B2]" />
          <CardTitle className="text-sm font-semibold text-[#F1F5F7]">Report Assembly Configuration</CardTitle>
        </div>
        <CardDescription className="text-xs text-[#9EADB7]">
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
