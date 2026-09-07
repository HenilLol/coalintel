import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'amber' | 'teal' | 'secondary';
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
    default: 'bg-[#20313D] text-[#F1F5F7] border-[#2C3D49]',
    secondary: 'bg-[#20313D] text-[#9EADB7] border-[#2C3D49]',
    success: 'bg-[#39B978]/15 text-[#39B978] border-[#39B978]/30 font-semibold',
    warning: 'bg-[#F08A24]/15 text-[#F08A24] border-[#F08A24]/35 font-semibold',
    danger: 'bg-[#F05B5B]/15 text-[#F05B5B] border-[#F05B5B]/35 font-semibold',
    info: 'bg-[#18B6B2]/15 text-[#35D3CE] border-[#18B6B2]/35 font-semibold',
    gold: 'bg-[#3A2C0A] text-[#F2A900] border-[#F2A900]/40 font-semibold',
    amber: 'bg-[#3A2C0A] text-[#F2A900] border-[#F2A900]/40 font-semibold',
    teal: 'bg-[#123C43] text-[#35D3CE] border-[#18B6B2]/40 font-semibold',
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
