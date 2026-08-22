'use client';

import React, { forwardRef } from 'react';
import { ButtonVariant } from './Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label: string; // Mandatory for accessibility
  icon: React.ReactNode;
  isLoading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const sizeClasses: Record<string, string> = {
      xs: 'p-1 text-xs rounded-md w-6 h-6',
      sm: 'p-1.5 text-xs rounded-md w-7 h-7',
      md: 'p-2 text-sm rounded-lg w-9 h-9',
      lg: 'p-2.5 text-base rounded-lg w-10 h-10',
    };

    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-theme-accent text-black hover:opacity-90 shadow-theme-glow border border-theme-accent',
      secondary:
        'bg-theme-surface hover:bg-theme-raised border border-theme-border text-theme-text hover:border-theme-border-hi',
      ghost:
        'bg-transparent hover:bg-theme-surface text-theme-muted hover:text-theme-text border border-transparent',
      danger:
        'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25',
      'accent-outline':
        'bg-transparent border border-theme-accent text-theme-accent hover:bg-theme-accent/10',
    };

    return (
      <button
        ref={ref}
        type={type}
        title={label}
        aria-label={label}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center transition-all duration-150 select-none active:scale-[0.95] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-3.5 w-3.5"
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
        ) : (
          icon
        )}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
