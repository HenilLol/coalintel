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
      <div className={cn('relative flex items-center justify-center rounded-xl bg-gradient-to-br from-coal-800 via-coal-900 to-coal-950 p-2 shadow-glow-amber border border-amber-500/30', iconSizes[size])}>
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
            stroke="#F2A900"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Inner Data Node Network Matrix */}
          <path
            d="M20 8L30 14V26L20 32L10 26V14L20 8Z"
            stroke="#008C95"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          {/* Center Signal Amber Core Pivot */}
          <circle cx="20" cy="20" r="4.5" fill="#F2A900" />
          {/* Intersecting Mining Vector Nodes */}
          <circle cx="20" cy="11" r="2" fill="#008C95" />
          {/* Radial Axis Lines */}
          <line x1="20" y1="13" x2="20" y2="15.5" stroke="#F2A900" strokeWidth="1.5" />
          <line x1="20" y1="24.5" x2="20" y2="27" stroke="#F2A900" strokeWidth="1.5" />

          <defs>
            <linearGradient id="coalGradient" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#27313A" />
              <stop offset="0.5" stopColor="#171A1F" />
              <stop offset="1" stopColor="#0F1216" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className={cn('font-bold tracking-wider font-sans leading-none flex items-center', textSizes[size])}>
            <span className={variant === 'dark' ? 'text-slate-100' : 'text-ink'}>COAL</span>
            <span className="text-amber-500 font-extrabold ml-0.5">INTEL</span>
            <span className="ml-1 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
              V2
            </span>
          </div>
          <span className="text-[10px] tracking-widest text-slateText font-mono uppercase mt-1">
            Mining Intelligence & Analytics
          </span>
        </div>
      )}
    </div>
  );
};
