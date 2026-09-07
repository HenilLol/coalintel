import React from 'react';
import { Card } from './Card';
import { cn } from '@/lib/utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon,
  subtitle,
  trend,
  className,
  loading = false,
}) => {
  return (
    <Card className={cn('relative overflow-hidden group hover:border-[#18B6B2]/50 transition-all duration-200 bg-[#17232D] border border-[#2C3D49] shadow-lg', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#9EADB7] uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded bg-[#20313D] my-1" />
          ) : (
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl lg:text-3xl font-extrabold text-[#F1F5F7] tracking-tight font-sans">
                {value}
              </span>
              {unit && <span className="text-xs font-bold text-[#F2A900] uppercase font-mono">{unit}</span>}
            </div>
          )}
        </div>

        <div className="p-2.5 rounded-lg bg-[#3A2C0A] border border-[#F2A900]/30 text-[#F2A900] group-hover:scale-110 transition-all duration-200 shadow-glow-amber">
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-[#2C3D49] flex items-center justify-between text-xs">
          {subtitle && <span className="text-[#9EADB7]">{subtitle}</span>}
          {trend && (
            <span
              className={cn(
                'font-semibold px-1.5 py-0.5 rounded font-mono text-[11px]',
                trend.isPositive ? 'text-[#39B978] bg-[#39B978]/15 border border-[#39B978]/30' : 'text-[#F08A24] bg-[#F08A24]/15 border border-[#F08A24]/30'
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
