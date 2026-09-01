import React from 'react';
import { cn } from '@/lib/utils/cn';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  className,
  size = 'md',
  showText = true,
  variant = 'dark',
}) => {
  const iconSizes = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={cn('inline-flex items-center gap-3 select-none', className)}>
      {/* COALINTEL Mining & Intelligence Vector Symbol */}
      <div className={cn('relative flex items-center justify-center rounded-xl bg-gradient-to-br from-navy-900 via-coal-900 to-navy-950 p-2 shadow-glow-gold border border-gold-600/30', iconSizes[size])}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          {/* Outer Octagonal Coal Crystal Shield */}
          <polygon
            points="12,4 28,4 36,12 36,28 28,36 12,36 4,28 4,12"
            fill="url(#coalGradient)"
            stroke="#D97706"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Inner Data Node Network Matrix */}
          <path
            d="M20 8L30 14V26L20 32L10 26V14L20 8Z"
            stroke="#0284C7"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          {/* Center Golden Core Pivot */}
          <circle cx="20" cy="20" r="4.5" fill="#F59E0B" />
          {/* Intersecting Mining Vector Nodes */}
          <circle cx="20" cy="11" r="2" fill="#38BDF8" />
          {/* Radial Axis Lines */}
          <line x1="20" y1="13" x2="20" y2="15.5" stroke="#F59E0B" strokeWidth="1.5" />
          <line x1="20" y1="24.5" x2="20" y2="27" stroke="#F59E0B" strokeWidth="1.5" />

          <defs>
            <linearGradient id="coalGradient" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1E293B" />
              <stop offset="0.5" stopColor="#0F172A" />
              <stop offset="1" stopColor="#0A0F1D" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className={cn('font-bold tracking-wider font-sans leading-none flex items-center', textSizes[size])}>
            <span className={variant === 'dark' ? 'text-slate-100' : 'text-slate-900'}>COAL</span>
            <span className="text-gold-500 font-extrabold ml-0.5">INTEL</span>
            <span className="ml-1 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/30">
              V2
            </span>
          </div>
          <span className="text-[10px] tracking-widest text-slate-400 font-mono uppercase mt-1">
            Mining Intelligence & Analytics
          </span>
        </div>
      )}
    </div>
  );
};
