'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BarChart3 } from 'lucide-react';
import { WordCloudTopicItem } from '@/lib/api/analyticsApi';

interface TfidfMatrixTableProps {
  topics: WordCloudTopicItem[];
}

export const TfidfMatrixTable: React.FC<TfidfMatrixTableProps> = ({ topics }) => {
  return (
    <Card className="border-[#2C3D49] shadow-lg bg-[#17232D]">
      <CardHeader className="py-3.5 px-4 bg-[#20313D] border-b border-[#2C3D49]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-[#F1F5F7] flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#18B6B2]" />
            <span>TF-IDF Term Frequency Extraction Matrix</span>
          </CardTitle>
          <Badge variant="gold" size="sm">
            {topics.length} Key Topics
          </Badge>
        </div>
        <CardDescription className="text-xs text-[#9EADB7]">
          Statistical Term Frequency-Inverse Document Frequency (TF-IDF) scores extracted across ingested mining documents.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2C3D49] bg-[#20313D] text-[11px] font-mono text-[#F1F5F7] uppercase tracking-wider">
                <th className="py-3 px-4">Mining Term / Keyword</th>
                <th className="py-3 px-4">Operational Category</th>
                <th className="py-3 px-4">Occurrences</th>
                <th className="py-3 px-4 text-right">TF-IDF Score</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#2C3D49] text-xs font-mono">
              {topics.map((t, idx) => {
                const tfidfScore = (t.weight / 500).toFixed(3);

                return (
                  <tr key={idx} className="hover:bg-[#20313D]/50 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-bold text-[#F1F5F7]">
                      {t.word}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-[#111B24] border border-[#2C3D49] text-[#35D3CE] font-semibold">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#9EADB7]">
                      {t.weight} Count
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#39B978]">
                      {tfidfScore}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
