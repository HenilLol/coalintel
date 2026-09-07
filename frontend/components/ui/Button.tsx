import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B1117] disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      primary:
        'bg-[#18B6B2] hover:bg-[#35D3CE] text-[#0B1117] font-bold shadow-sm focus:ring-[#18B6B2] active:scale-[0.98]',
      secondary:
        'bg-[#20313D] hover:bg-[#2C3D49] text-[#F1F5F7] border border-[#2C3D49] focus:ring-[#18B6B2] active:scale-[0.98]',
      outline:
        'bg-transparent hover:bg-[#18B6B2]/15 text-[#35D3CE] hover:text-[#35D3CE] border border-[#18B6B2] focus:ring-[#18B6B2] active:scale-[0.98]',
      ghost:
        'bg-transparent hover:bg-[#20313D] text-[#9EADB7] hover:text-[#F1F5F7] focus:ring-[#2C3D49] active:scale-[0.98]',
      danger:
        'bg-[#F05B5B] hover:bg-[#F57878] text-[#0B1117] font-semibold shadow-sm focus:ring-[#F05B5B] active:scale-[0.98]',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-2.5 gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
