import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[#F1F5F7]">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[#9EADB7] pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full rounded-lg bg-[#111B24] border border-[#2C3D49] px-3.5 py-2.5 text-sm text-[#F1F5F7] placeholder:text-[#9EADB7]/70 shadow-sm transition-all duration-150',
              'focus:outline-none focus:border-[#18B6B2] focus:ring-1 focus:ring-[#18B6B2]',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#0B1117]',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-[#F05B5B] focus:border-[#F05B5B] focus:ring-[#F05B5B]',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 text-[#9EADB7] flex items-center">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-xs font-medium text-[#F05B5B] mt-1 flex items-center gap-1">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#9EADB7] mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
