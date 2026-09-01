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
    <Card className={cn('relative overflow-hidden group hover:border-slate-700 transition-all duration-200', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded bg-navy-800 my-1" />
          ) : (
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl lg:text-3xl font-extrabold text-slate-100 tracking-tight font-sans">
                {value}
              </span>
              {unit && <span className="text-xs font-semibold text-gold-400 uppercase font-mono">{unit}</span>}
            </div>
          )}
        </div>

        <div className="p-2.5 rounded-lg bg-navy-800/90 border border-slate-700/60 text-gold-400 group-hover:scale-110 transition-transform duration-200">
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-400">{subtitle}</span>}
          {trend && (
            <span
              className={cn(
                'font-semibold px-1.5 py-0.5 rounded font-mono text-[11px]',
                trend.isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
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
