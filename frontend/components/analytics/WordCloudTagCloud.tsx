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
  Operational: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  Production: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  Infrastructure: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  Metric: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  Regulatory: 'text-red-400 bg-red-500/10 border-red-500/30',
  Equipment: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  Logistics: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
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
    <Card className="border-slate-800/90 shadow-card-dark">
      <CardHeader className="py-3.5 px-4 bg-navy-950/80 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-gold-400" />
            <CardTitle className="text-sm font-semibold">TF-IDF Mining Word Cloud Visualization</CardTitle>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all whitespace-nowrap select-none ${
                  selectedCategory === cat
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-900'
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
            const colorClass = CATEGORY_COLORS[item.category] || 'text-gold-400 bg-gold-500/10 border-gold-500/30';
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
