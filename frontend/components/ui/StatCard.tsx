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
    <Card className={cn('relative overflow-hidden group hover:border-[#C58B3A]/40 transition-colors duration-150 bg-[#1C2226] border border-[#30383D] shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#9BA5A8] uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded bg-[#242C30] my-1" />
          ) : (
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl lg:text-3xl font-extrabold text-[#E8ECEB] tracking-tight font-sans">
                {value}
              </span>
              {unit && <span className="text-xs font-bold text-[#C58B3A] uppercase font-mono">{unit}</span>}
            </div>
          )}
        </div>

        <div className="p-2.5 rounded-lg bg-[#151A1D] border border-[#30383D] text-[#C58B3A]">
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-[#30383D] flex items-center justify-between text-xs">
          {subtitle && <span className="text-[#9BA5A8]">{subtitle}</span>}
          {trend && (
            <span
              className={cn(
                'font-semibold px-1.5 py-0.5 rounded font-mono text-[11px]',
                trend.isPositive ? 'text-[#4F8A62] bg-[#4F8A62]/15 border border-[#4F8A62]/30' : 'text-[#D6A23A] bg-[#D6A23A]/15 border border-[#D6A23A]/30'
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
