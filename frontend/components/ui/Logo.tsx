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

  const versionSizes = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-1.5 py-0.5',
    lg: 'text-xs px-2 py-0.5',
  };

  return (
    <div className={cn('inline-flex items-center gap-3 select-none', className)}>
      {/* COALINTEL Mining & Intelligence Vector Symbol */}
      <div className={cn('relative flex items-center justify-center rounded-lg bg-[#1C2226] p-2 border border-[#30383D] shadow-sm', iconSizes[size])}>
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
            stroke="#C58B3A"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Inner Data Node Network Matrix */}
          <path
            d="M20 8L30 14V26L20 32L10 26V14L20 8Z"
            stroke="#54788A"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          {/* Center Signal Amber Core Pivot */}
          <circle cx="20" cy="20" r="4.5" fill="#C58B3A" />
          {/* Intersecting Mining Vector Nodes */}
          <circle cx="20" cy="11" r="2" fill="#54788A" />
          {/* Radial Axis Lines */}
          <line x1="20" y1="13" x2="20" y2="15.5" stroke="#C58B3A" strokeWidth="1.5" />
          <line x1="20" y1="24.5" x2="20" y2="27" stroke="#C58B3A" strokeWidth="1.5" />

          <defs>
            <linearGradient id="coalGradient" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#242C30" />
              <stop offset="0.5" stopColor="#1C2226" />
              <stop offset="1" stopColor="#0E1113" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <div className={cn('font-bold tracking-wider font-sans leading-none flex items-center whitespace-nowrap', textSizes[size])}>
            <span className="text-[#E8ECEB]">COAL</span>
            <span className="text-[#C58B3A] font-extrabold ml-0.5">INTEL</span>
            <span
              className={cn(
                'ml-2 inline-flex items-center justify-center font-mono font-semibold uppercase tracking-wider rounded bg-[#C58B3A]/15 text-[#C58B3A] border border-[#C58B3A]/30 leading-none select-none shrink-0',
                versionSizes[size]
              )}
            >
              v2
            </span>
          </div>
          <span className="text-[10px] tracking-widest text-[#9BA5A8] font-mono uppercase mt-1 truncate">
            Mining Intelligence & Analytics
          </span>
        </div>
      )}
    </div>
  );
};
