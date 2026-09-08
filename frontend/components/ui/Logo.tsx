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
    sm: 'h-7 w-7 p-1.5',
    md: 'h-8.5 w-8.5 p-1.5',
    lg: 'h-11 w-11 p-2',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-[16px] sm:text-[17px]',
    lg: 'text-xl sm:text-2xl',
  };

  const versionSizes = {
    sm: 'text-[8px] px-1 py-0.5',
    md: 'text-[9px] px-1.5 py-0.5',
    lg: 'text-[10px] px-2 py-0.5',
  };

  const subtitleSizes = {
    sm: 'text-[8px] tracking-tight',
    md: 'text-[9px] sm:text-[9.5px] tracking-tight',
    lg: 'text-xs tracking-normal',
  };

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none min-w-0', className)}>
      {/* COALINTEL Mining & Intelligence Vector Symbol */}
      <div className={cn('relative flex items-center justify-center rounded-lg bg-[#1C2226] border border-[#30383D] shadow-sm shrink-0', iconSizes[size])}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
          aria-hidden="true"
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
        <div className="flex flex-col min-w-0 justify-center">
          {/* Main Branding Title + v2 Version Tag */}
          <div className="flex items-center gap-1.5 whitespace-nowrap leading-none">
            <span className={cn('font-bold tracking-tight font-sans flex items-center', textSizes[size])}>
              <span className="text-[#E8ECEB]">COAL</span>
              <span className="text-[#C58B3A] font-extrabold ml-1">INTEL</span>
            </span>
            <span
              className={cn(
                'inline-flex items-center justify-center font-mono font-bold uppercase rounded bg-[#C58B3A]/15 text-[#C58B3A] border border-[#C58B3A]/30 leading-none select-none shrink-0 self-center',
                versionSizes[size]
              )}
            >
              v2
            </span>
          </div>

          {/* Subtitle: Mining Intelligence & Analytics */}
          <span
            className={cn(
              'font-sans font-medium text-[#9BA5A8] select-none leading-tight mt-0.5 whitespace-nowrap',
              subtitleSizes[size]
            )}
            title="Mining Intelligence & Analytics"
          >
            Mining Intelligence &amp; Analytics
          </span>
        </div>
      )}
    </div>
  );
};
