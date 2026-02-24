'use client';

import React from 'react';
import { cn } from '../utils/cn';

interface FilterSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seçiniz',
  className,
}: FilterSelectProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
          {label}
        </span>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full bg-bg-app border border-border-light rounded-sm px-3 py-2 text-xs font-bold uppercase appearance-none cursor-pointer',
            'text-text-primary outline-none focus:border-primary-main focus:ring-1 focus:ring-primary-main/20 transition-all',
            !value && 'text-text-muted'
          )}
        >
          <option value="all" disabled={!!value}>
            {placeholder.toUpperCase()}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label.toUpperCase()}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
