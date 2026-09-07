import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading operational data...',
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center space-y-3', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-[#18B6B2]" />
      <p className="text-xs font-mono text-[#9EADB7] uppercase tracking-widest">{label}</p>
    </div>
  );
};
