'use client';

import React from 'react';
import { cn } from '../utils/cn';

// ============================================
// TYPES
// ============================================

type SwitchTheme = 'success' | 'info' | 'warning' | 'danger' | 'primary';
type SwitchSize = 'sm' | 'md' | 'lg';

interface RmsSwitchProps {
  // Core
  checked: boolean;
  onChange: (checked: boolean) => void;

  // Display
  label?: string;
  labelOn?: string;
  labelOff?: string;

  // Styling
  theme?: SwitchTheme;
  size?: SwitchSize;

  // Behavior
  disabled?: boolean;
  readOnly?: boolean;

  // Container
  containerClassName?: string;
}

// ============================================
// CONSTANTS
// ============================================

const sizeClasses = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3 translate-x-4',
    container: 'py-1 px-2',
  },
  md: {
    track: 'w-10 h-5',
    thumb: 'w-3 h-3 translate-x-5',
    container: 'py-2 px-3',
  },
  lg: {
    track: 'w-12 h-6',
    thumb: 'w-4 h-4 translate-x-6',
    container: 'py-2 px-4',
  },
};

const themeClasses = {
  success: {
    active: 'bg-success-main',
    inactive: 'bg-bg-muted',
    labelActive: 'bg-success-main text-text-inverse',
    labelInactive: 'bg-bg-muted text-text-muted',
  },
  info: {
    active: 'bg-info-main',
    inactive: 'bg-bg-muted',
    labelActive: 'bg-info-main text-text-inverse',
    labelInactive: 'bg-bg-muted text-text-muted',
  },
  warning: {
    active: 'bg-warning-main',
    inactive: 'bg-bg-muted',
    labelActive: 'bg-warning-main text-text-inverse',
    labelInactive: 'bg-bg-muted text-text-muted',
  },
  danger: {
    active: 'bg-danger-main',
    inactive: 'bg-bg-muted',
    labelActive: 'bg-danger-main text-text-inverse',
    labelInactive: 'bg-bg-muted text-text-muted',
  },
  primary: {
    active: 'bg-primary-main',
    inactive: 'bg-bg-muted',
    labelActive: 'bg-primary-main text-text-inverse',
    labelInactive: 'bg-bg-muted text-text-muted',
  },
};

// ============================================
// COMPONENT
// ============================================

export function RmsSwitch({
  checked,
  onChange,
  label,
  labelOn = 'AKTİF',
  labelOff = 'PASİF',
  theme = 'success',
  size = 'md',
  disabled = false,
  readOnly = false,
  containerClassName,
}: RmsSwitchProps) {
  const handleClick = () => {
    if (!disabled && !readOnly) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && !readOnly) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange(!checked);
      }
    }
  };

  const currentSize = sizeClasses[size];
  const currentTheme = themeClasses[theme];

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 bg-bg-app border border-border-light rounded-sm group cursor-pointer hover:border-primary-main/40 transition-all',
        disabled && 'opacity-50 cursor-not-allowed',
        containerClassName
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
    >
      {/* Label Section */}
      <div className="flex items-center gap-3">
        {label && (
          <span className="text-[10px] font-semibold text-text-primary uppercase tracking-widest">
            {label}
          </span>
        )}
        {(labelOn || labelOff) && (
          <span
            className={cn(
              'text-[9px] font-black px-2 py-0.5 rounded-sm transition-all',
              checked ? currentTheme.labelActive : currentTheme.labelInactive
            )}
          >
            {checked ? labelOn : labelOff}
          </span>
        )}
      </div>

      {/* Switch Track */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={cn(
          'rounded-full relative transition-all duration-300',
          currentSize.track,
          checked ? currentTheme.active : currentTheme.inactive,
          disabled && 'cursor-not-allowed'
        )}
      >
        <div
          className={cn(
            'bg-white rounded-full transition-transform absolute top-0.5 left-0.5',
            currentSize.thumb,
            checked && 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}
