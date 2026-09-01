'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { BarChart3 } from 'lucide-react';
import { ProductionSeriesItem } from '@/types/dashboard';

interface ProductionChartProps {
  data?: ProductionSeriesItem[];
  loading?: boolean;
  isApiConnected?: boolean;
}

const defaultData: ProductionSeriesItem[] = [
  { subsidiary: 'ECL', actual: 42.5, target: 45.0, obr: 120.4 },
  { subsidiary: 'BCCL', actual: 38.2, target: 40.0, obr: 98.6 },
  { subsidiary: 'CCL', actual: 76.8, target: 75.0, obr: 210.2 },
  { subsidiary: 'WCL', actual: 64.3, target: 65.0, obr: 185.0 },
  { subsidiary: 'SECL', actual: 167.0, target: 170.0, obr: 310.5 },
  { subsidiary: 'NCL', actual: 131.5, target: 130.0, obr: 290.1 },
  { subsidiary: 'MCL', actual: 193.3, target: 190.0, obr: 435.6 },
];

export const ProductionChart: React.FC<ProductionChartProps> = ({
  data = defaultData,
  loading = false,
  isApiConnected = false,
}) => {
  const chartSeries = data && data.length > 0 ? data : defaultData;

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            <BarChart3 className="h-5 w-5 text-gold-500" />
            <span>Subsidiary Coal Production vs Annual Target (MT)</span>
          </CardTitle>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-navy-800 text-slate-400 border border-slate-700">
            {isApiConnected ? 'Live API Data' : 'Preview Data'}
          </span>
        </div>
        <CardDescription>
          Comparison of extracted actual coal production figures against operational target plans across CIL subsidiaries.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="h-72 w-full animate-pulse rounded-lg bg-navy-950/60" />
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="subsidiary" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="actual" name="Actual Production (MT)" fill="#D97706" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Target Plan (MT)" fill="#0284C7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
