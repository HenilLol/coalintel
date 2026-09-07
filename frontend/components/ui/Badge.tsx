import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  children,
  variant = 'default',
  size = 'md',
  ...props
}) => {
  const variants = {
    default: 'bg-steel/20 text-ink border-steel',
    success: 'bg-green-500/15 text-green-600 border-green-500/30 font-semibold',
    warning: 'bg-warning/15 text-warning border-warning/35 font-semibold',
    danger: 'bg-danger/15 text-danger border-danger/35 font-semibold',
    info: 'bg-teal-500/15 text-teal-600 border-teal-500/35 font-semibold',
    gold: 'bg-amber-500/15 text-amber-700 border-amber-500/40 font-semibold',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md border tracking-wide uppercase font-mono select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
