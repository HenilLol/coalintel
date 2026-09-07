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
  Operational: 'text-[#F2A900] bg-[#3A2C0A] border-[#F2A900]/40',
  Production: 'text-[#39B978] bg-[#39B978]/15 border-[#39B978]/40',
  Infrastructure: 'text-[#35D3CE] bg-[#123C43] border-[#18B6B2]/40',
  Metric: 'text-[#18B6B2] bg-[#18B6B2]/10 border-[#18B6B2]/30',
  Regulatory: 'text-[#F05B5B] bg-[#F05B5B]/15 border-[#F05B5B]/40',
  Equipment: 'text-[#9EADB7] bg-[#20313D] border-[#2C3D49]',
  Logistics: 'text-[#35D3CE] bg-[#123C43]/60 border-[#18B6B2]/30',
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
    <Card className="border-[#2C3D49] shadow-card-dark bg-[#17232D]">
      <CardHeader className="py-3.5 px-4 bg-[#20313D] border-b border-[#2C3D49]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-[#18B6B2]" />
            <CardTitle className="text-sm font-bold text-[#F1F5F7]">TF-IDF Mining Word Cloud Visualization</CardTitle>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all whitespace-nowrap select-none ${
                  selectedCategory === cat
                    ? 'bg-[#123C43] text-[#35D3CE] border border-[#18B6B2]/50 font-bold'
                    : 'text-[#9EADB7] hover:text-[#F1F5F7] hover:bg-[#111B24]'
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
            const colorClass = CATEGORY_COLORS[item.category] || 'text-[#18B6B2] bg-[#123C43]/50 border-[#18B6B2]/30';
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
