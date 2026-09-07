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
    <Card className={cn('relative overflow-hidden group hover:border-steel transition-all duration-200 bg-white border border-steel shadow-card-light', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slateText uppercase tracking-wider">{title}</p>
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded bg-ash my-1" />
          ) : (
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl lg:text-3xl font-extrabold text-ink tracking-tight font-sans">
                {value}
              </span>
              {unit && <span className="text-xs font-bold text-amber-600 uppercase font-mono">{unit}</span>}
            </div>
          )}
        </div>

        <div className="p-2.5 rounded-lg bg-ash border border-steel text-amber-500 group-hover:scale-110 group-hover:bg-amber-500/10 transition-all duration-200">
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-steel/60 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slateText">{subtitle}</span>}
          {trend && (
            <span
              className={cn(
                'font-semibold px-1.5 py-0.5 rounded font-mono text-[11px]',
                trend.isPositive ? 'text-green-600 bg-green-500/15' : 'text-warning bg-warning/15'
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
