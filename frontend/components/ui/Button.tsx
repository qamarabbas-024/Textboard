'use client';

import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent-outline';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    // Base styles
    const baseClasses =
      'inline-flex items-center justify-center font-semibold font-mono transition-all duration-150 select-none ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent focus-visible:ring-offset-1 focus-visible:ring-offset-theme-base ' +
      'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer';

    // Variant mapping
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-theme-accent text-black hover:opacity-95 shadow-theme-glow border border-theme-accent',
      secondary:
        'bg-theme-surface hover:bg-theme-raised border border-theme-border text-theme-text hover:border-theme-border-hi',
      ghost:
        'bg-transparent hover:bg-theme-surface text-theme-muted hover:text-theme-text border border-transparent',
      danger:
        'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-500/50',
      'accent-outline':
        'bg-transparent border border-theme-accent text-theme-accent hover:bg-theme-accent/10',
    };

    // Size mapping
    const sizeClasses: Record<ButtonSize, string> = {
      xs: 'px-2 py-1 text-[10px] sm:text-[11px] rounded-md gap-1',
      sm: 'px-2.5 py-1.5 text-xs rounded-md gap-1.5',
      md: 'px-3.5 py-2 text-xs sm:text-sm rounded-lg gap-2',
      lg: 'px-4.5 py-2.5 text-sm sm:text-base rounded-lg gap-2.5',
      icon: 'p-2 rounded-lg text-xs aspect-square',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-3.5 w-3.5 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
