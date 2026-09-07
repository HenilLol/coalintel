'use client';

import React from 'react';
import { Send, Sparkles, Filter, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CIL_SUBSIDIARIES } from '@/lib/constants';

interface QueryInputProps {
  prompt: string;
  onPromptChange: (val: string) => void;
  onSubmit: (queryText?: string) => void;
  isLoading: boolean;
  selectedSubsidiary: string;
  onSubsidiaryChange: (sub: string) => void;
}

const SAMPLE_QUERIES = [
  'What was the total coal production for ECL in FY 2023-24?',
  'Compare overburden removal between Rajmahal OC and Gevra OC.',
  'List all active cross-document discrepancies in CCL reports.',
  'What are the primary operational metrics reported for BCCL?',
];

export const QueryInput: React.FC<QueryInputProps> = ({
  prompt,
  onPromptChange,
  onSubmit,
  isLoading,
  selectedSubsidiary,
  onSubsidiaryChange,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Card className="border-steel shadow-card-light bg-white">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Top Controls: Input Bar & Subsidiary Filter */}
        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          <div className="flex-1">
            <Input
              placeholder="Ask any natural-language geological, production, OBR, or parliamentary query..."
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              leftIcon={<Sparkles className="h-4 w-4 text-amber-500" />}
              className="bg-white text-sm py-2.5"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={selectedSubsidiary}
              onChange={(e) => onSubsidiaryChange(e.target.value)}
              options={CIL_SUBSIDIARIES}
              className="bg-white text-xs py-2.5 w-48"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!prompt.trim() || isLoading}
              isLoading={isLoading}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Ask Assistant
            </Button>
          </div>
        </div>

        {/* Sample Query Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-steel/60">
          <span className="text-[10px] font-mono text-slateText uppercase tracking-widest font-semibold shrink-0">
            Sample Queries:
          </span>
          {SAMPLE_QUERIES.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onPromptChange(sq);
                onSubmit(sq);
              }}
              className="px-3 py-1 rounded-full bg-ash border border-steel hover:border-amber-500/50 hover:bg-amber-500/10 text-ink text-xs transition-all text-left truncate max-w-xs"
            >
              {sq}
            </button>
          ))}
        </div>
      </form>
    </Card>
  );
};
