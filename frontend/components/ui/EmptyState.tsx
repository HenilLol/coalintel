import React from 'react';
import { FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = <FolderOpen className="h-10 w-10 text-slate-500" />,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl bg-white border border-steel border-dashed shadow-card-light',
        className
      )}
    >
      <div className="p-3 rounded-full bg-ash mb-3 border border-steel">{icon}</div>
      <h4 className="text-base font-bold text-ink">{title}</h4>
      <p className="text-xs text-slateText max-w-sm mt-1 mb-4">{description}</p>
      {action}
    </div>
  );
};
