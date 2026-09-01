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
          <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </label>
        )}

        <select
          id={selectId}
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg bg-navy-950/90 border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 shadow-sm transition-all duration-150',
            'focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-navy-900',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-navy-900 text-slate-100 py-1">
              {opt.label}
            </option>
          ))}
        </select>

        {error && <p className="text-xs font-medium text-red-400 mt-1">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
