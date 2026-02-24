import React from 'react';
import { cn } from '../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-bold uppercase tracking-widest rounded-sm transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed text-[10px]';

  const variants = {
    primary: 'bg-primary-main text-text-inverse hover:bg-primary-hover focus:ring-primary-main',
    secondary: 'bg-bg-muted text-text-primary hover:bg-bg-hover border border-border-light focus:ring-primary-main/20',
    outline: 'bg-bg-surface border border-border-light text-text-secondary hover:bg-bg-hover hover:text-text-primary focus:ring-primary-main/20',
    ghost: 'bg-transparent text-text-muted hover:text-text-primary hover:bg-bg-hover focus:ring-primary-main/20',
    danger: 'bg-danger-main text-text-inverse hover:opacity-95 focus:ring-danger-main',
    success: 'bg-success-main text-text-inverse hover:opacity-95 focus:ring-success-main',
  };

  const sizes = {
    sm: 'px-3 py-1.5',
    md: 'px-6 py-2.5',
    lg: 'px-8 py-3.5',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}
