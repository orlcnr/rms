import React from 'react';
import { cn } from '../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={id}
            className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary ml-0.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full bg-bg-surface border border-border-light px-3 py-2 text-xs font-semibold text-text-primary outline-none transition-all duration-200 rounded-sm',
            'placeholder:text-text-muted/50 focus:border-primary-main focus:ring-1 focus:ring-primary-main/20',
            error && 'border-danger-main focus:border-danger-main focus:ring-danger-main/20',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        />
        {error && (
          <p className="text-[10px] font-bold uppercase tracking-tight text-danger-main ml-0.5 mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
