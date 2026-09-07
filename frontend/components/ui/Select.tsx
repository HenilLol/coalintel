import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: readonly SelectOption[] | SelectOption[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, id, disabled, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-[#F1F5F7]">
            {label}
          </label>
        )}

        <select
          id={selectId}
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg bg-[#111B24] border border-[#2C3D49] px-3.5 py-2.5 text-sm text-[#F1F5F7] shadow-sm transition-all duration-150',
            'focus:outline-none focus:border-[#18B6B2] focus:ring-1 focus:ring-[#18B6B2]',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#0B1117]',
            error && 'border-[#F05B5B] focus:border-[#F05B5B] focus:ring-[#F05B5B]',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#111B24] text-[#F1F5F7] py-1">
              {opt.label}
            </option>
          ))}
        </select>

        {error && <p className="text-xs font-medium text-[#F05B5B] mt-1">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
