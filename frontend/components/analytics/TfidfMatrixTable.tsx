'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Hash, BarChart3 } from 'lucide-react';
import { WordCloudTopicItem } from '@/lib/api/analyticsApi';

interface TfidfMatrixTableProps {
  topics: WordCloudTopicItem[];
}

export const TfidfMatrixTable: React.FC<TfidfMatrixTableProps> = ({ topics }) => {
  return (
    <Card className="border-steel shadow-card-light bg-white">
      <CardHeader className="py-3.5 px-4 bg-ash border-b border-steel">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-ink flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            <span>TF-IDF Term Frequency Extraction Matrix</span>
          </CardTitle>
          <Badge variant="gold" size="sm">
            {topics.length} Key Topics
          </Badge>
        </div>
        <CardDescription className="text-xs text-slateText">
          Statistical Term Frequency-Inverse Document Frequency (TF-IDF) scores extracted across ingested mining documents.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-steel bg-ash text-[11px] font-mono text-slateText uppercase tracking-wider">
                <th className="py-3 px-4">Mining Term / Keyword</th>
                <th className="py-3 px-4">Operational Category</th>
                <th className="py-3 px-4">Occurrences</th>
                <th className="py-3 px-4 text-right">TF-IDF Score</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-steel/60 text-xs font-mono">
              {topics.map((t, idx) => {
                const tfidfScore = (t.weight / 500).toFixed(3);

                return (
                  <tr key={idx} className="hover:bg-ash/50 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-bold text-ink">
                      {t.word}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-ash border border-steel text-teal-700 font-semibold">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slateText">
                      {t.weight} Count
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-green-600">
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
