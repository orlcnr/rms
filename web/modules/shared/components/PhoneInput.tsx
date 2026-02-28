'use client';

import React from 'react';
import { Phone } from 'lucide-react';
import { cn } from '../utils/cn';
import { formatPhoneNumber } from '../utils/format';

interface PhoneInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function PhoneInput({
  id,
  name,
  value,
  onChange,
  label,
  placeholder = '0xxx xxx xx xx',
  required,
  error,
  disabled,
  className,
}: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-[10px] font-semibold text-text-primary uppercase tracking-widest ml-0.5 block">
          {label}
          {required && <span className="text-danger-main ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          required={required}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full pl-10 pr-4 py-3 bg-bg-app border border-border-light font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-1 rounded-sm transition-all placeholder:text-text-muted/40',
            error && 'border-danger-main focus-visible:ring-danger-main',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          maxLength={14} // 0xxx xxx xx xx = 4+1+3+1+2+1+2 = 14
        />
      </div>
      {error && (
        <p className="text-[10px] font-bold uppercase tracking-tight text-danger-main ml-0.5">
          {error}
        </p>
      )}
    </div>
  );
}
