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
  icon = <FolderOpen className="h-10 w-10 text-[#9EADB7]" />,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl bg-[#17232D] border border-[#2C3D49] border-dashed shadow-lg',
        className
      )}
    >
      <div className="p-3 rounded-full bg-[#20313D] mb-3 border border-[#2C3D49]">{icon}</div>
      <h4 className="text-base font-bold text-[#F1F5F7]">{title}</h4>
      <p className="text-xs text-[#9EADB7] max-w-sm mt-1 mb-4">{description}</p>
      {action}
    </div>
  );
};
