'use client';

import React, { RefObject } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '../utils/cn';

// ============================================
// TYPES
// ============================================

type InputType = 'text' | 'number' | 'email' | 'password' | 'tel';

type FontSize = 'base' | 'lg' | 'xl';
type TextAlign = 'left' | 'right';

interface FormInputProps {
  // Core
  id: string;
  name: string;
  type?: InputType;
  value?: string | number;
  onChange?: (value: string) => void;

  // Label & Display
  label?: string;
  placeholder?: string;
  required?: boolean;

  // Styling Variants
  inputMode?: 'text' | 'decimal' | 'numeric';
  textAlign?: TextAlign;
  fontSize?: FontSize;

  // Validation
  error?: string;

  // Select Specific
  options?: Array<{ value: string; label: string }>;
  isSelect?: boolean;

  // Textarea Specific
  isTextarea?: boolean;
  rows?: number;

  // File Input
  isFile?: boolean;
  accept?: string;
  fileRef?: RefObject<HTMLInputElement>;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove?: () => void;
  previewUrl?: string | null;

  // ClassName override
  className?: string;

  // Disabled
  disabled?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const fontSizeClasses: Record<FontSize, string> = {
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const textAlignClasses: Record<TextAlign, string> = {
  left: 'text-left',
  right: 'text-right',
};

// ============================================
// COMPONENT
// ============================================

export function FormInput({
  id,
  name,
  type = 'text',
  value,
  onChange,
  label,
  placeholder,
  required,
  inputMode,
  textAlign = 'left',
  fontSize = 'base',
  error,
  options,
  isSelect,
  isTextarea,
  rows = 3,
  isFile,
  accept,
  fileRef,
  onFileChange,
  onFileRemove,
  previewUrl,
  className,
  disabled,
}: FormInputProps) {
  // ==================== FILE INPUT ====================
  if (isFile) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <label className="text-[10px] font-semibold text-text-primary uppercase tracking-widest ml-0.5">
            {label}
            {required && <span className="text-danger-main ml-0.5">*</span>}
          </label>
        )}
        <div
          className={cn(
            'relative aspect-[4/3] rounded-sm border border-border-light bg-bg-app overflow-hidden group cursor-pointer hover:border-primary-main/50 transition-all shadow-sm flex flex-col items-center justify-center p-2',
            error && 'border-danger-main'
          )}
          onClick={() => !previewUrl && fileRef?.current?.click()}
        >
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-text-primary/10 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-bg-surface text-text-primary text-[9px] font-black uppercase tracking-widest rounded-sm border border-border-light shadow-lg hover:bg-primary-main hover:text-text-inverse hover:border-primary-main transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileRef?.current?.click();
                  }}
                >
                  Değiştir
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-bg-surface text-danger-main text-[9px] font-black uppercase tracking-widest rounded-sm border border-border-light shadow-lg hover:bg-danger-main hover:text-text-inverse hover:border-danger-main transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemove?.();
                  }}
                >
                  Sil
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-text-muted/40 group-hover:text-primary-main/60 transition-colors">
              <ImagePlus size={32} />
              <span className="text-[9px] font-black uppercase tracking-[0.25em]">Görsel Yükle</span>
            </div>
          )}
        </div>
        <input
          type="file"
          ref={fileRef}
          onChange={onFileChange}
          accept={accept || 'image/*'}
          className="hidden"
        />
        {error && (
          <p className="text-[10px] font-bold uppercase tracking-tight text-danger-main ml-0.5">
            {error}
          </p>
        )}
      </div>
    );
  }

  // ==================== SELECT INPUT ====================
  if (isSelect) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <label className="text-[10px] font-semibold text-text-primary uppercase tracking-widest ml-0.5">
            {label}
            {required && <span className="text-danger-main ml-0.5">*</span>}
          </label>
        )}
        <select
          id={id}
          name={name}
          required={required}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full bg-bg-app border border-border-light px-4 py-3 text-base font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-1 rounded-sm transition-all appearance-none cursor-pointer',
            error && 'border-danger-main focus-visible:ring-danger-main',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <option value="" disabled>
            {placeholder || 'SEÇİNİZ'}
          </option>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-[10px] font-bold uppercase tracking-tight text-danger-main ml-0.5">
            {error}
          </p>
        )}
      </div>
    );
  }

  // ==================== TEXTAREA INPUT ====================
  if (isTextarea) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <label className="text-[10px] font-semibold text-text-primary uppercase tracking-widest ml-0.5">
            {label}
            {required && <span className="text-danger-main ml-0.5">*</span>}
          </label>
        )}
        <textarea
          id={id}
          name={name}
          required={required}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={cn(
            'w-full bg-bg-app border border-border-light px-4 py-3 text-base font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-1 rounded-sm transition-all min-h-[80px] resize-none leading-relaxed placeholder:text-text-muted/40',
            error && 'border-danger-main focus-visible:ring-danger-main',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        {error && (
          <p className="text-[10px] font-bold uppercase tracking-tight text-danger-main ml-0.5">
            {error}
          </p>
        )}
      </div>
    );
  }

  // ==================== STANDARD INPUT ====================
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-[10px] font-semibold text-text-primary uppercase tracking-widest ml-0.5">
          {label}
          {required && <span className="text-danger-main ml-0.5">*</span>}
        </label>
      )}
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        inputMode={inputMode}
        className={cn(
          'w-full bg-bg-app border border-border-light px-4 py-3 font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:ring-offset-1 rounded-sm transition-all placeholder:text-text-muted/40',
          fontSizeClasses[fontSize],
          textAlignClasses[textAlign],
          error && 'border-danger-main focus-visible:ring-danger-main',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />
      {error && (
        <p className="text-[10px] font-bold uppercase tracking-tight text-danger-main ml-0.5">
          {error}
        </p>
      )}
    </div>
  );
}
