'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Cloud, Filter } from 'lucide-react';
import { WordCloudTopicItem } from '@/lib/api/analyticsApi';

interface WordCloudTagCloudProps {
  topics: WordCloudTopicItem[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Operational: 'text-amber-700 bg-amber-500/15 border-amber-500/30',
  Production: 'text-green-700 bg-green-500/15 border-green-500/30',
  Infrastructure: 'text-teal-700 bg-teal-500/15 border-teal-500/30',
  Metric: 'text-teal-800 bg-teal-500/10 border-teal-500/30',
  Regulatory: 'text-danger bg-danger/15 border-danger/30',
  Equipment: 'text-coal-800 bg-steel/20 border-steel',
  Logistics: 'text-teal-600 bg-teal-500/15 border-teal-500/30',
};

export const WordCloudTagCloud: React.FC<WordCloudTagCloudProps> = ({ topics }) => {
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = ['ALL', ...Array.from(new Set(topics.map((t) => t.category)))];

  const filteredTopics = topics.filter(
    (t) => selectedCategory === 'ALL' || t.category === selectedCategory
  );

  const maxWeight = Math.max(...topics.map((t) => t.weight), 1);
  const minWeight = Math.min(...topics.map((t) => t.weight), 1);

  const getFontSize = (weight: number) => {
    if (maxWeight === minWeight) return '16px';
    const minSize = 13;
    const maxSize = 28;
    const size = minSize + ((weight - minWeight) / (maxWeight - minWeight)) * (maxSize - minSize);
    return `${Math.round(size)}px`;
  };

  return (
    <Card className="border-steel shadow-card-light bg-white">
      <CardHeader className="py-3.5 px-4 bg-ash border-b border-steel">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-bold text-ink">TF-IDF Mining Word Cloud Visualization</CardTitle>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all whitespace-nowrap select-none ${
                  selectedCategory === cat
                    ? 'bg-amber-500/20 text-amber-700 border border-amber-500/40 font-bold'
                    : 'text-slateText hover:text-ink hover:bg-steel/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-8">
        <div className="flex flex-wrap items-center justify-center gap-4 min-h-[220px]">
          {filteredTopics.map((item, idx) => {
            const colorClass = CATEGORY_COLORS[item.category] || 'text-amber-600 bg-amber-500/10 border-amber-500/30';
            const fontSize = getFontSize(item.weight);

            return (
              <div
                key={idx}
                style={{ fontSize }}
                className={`px-3.5 py-1.5 rounded-xl border transition-all duration-200 hover:scale-105 cursor-pointer font-sans font-semibold shadow-sm ${colorClass}`}
                title={`Topic: ${item.word} | Category: ${item.category} | Weight: ${item.weight}`}
              >
                <span>{item.word}</span>
                <span className="ml-2 text-[10px] opacity-75 font-mono">({item.weight})</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
