'use client';

import React from 'react';
import { cn } from '../utils/cn';

// ============================================
// TYPES
// ============================================

type SectionVariant = 'primary' | 'success' | 'info' | 'warning' | 'danger';

interface FormSectionProps {
  // Header
  title: string;
  variant?: SectionVariant;

  // Actions (optional buttons on right side)
  actions?: React.ReactNode;

  // Content
  children: React.ReactNode;

  // Layout
  className?: string;
  contentClassName?: string;
  gridClassName?: string;

  // Styling
  showDivider?: boolean;
  dividerClassName?: string;
}

// ============================================
// CONSTANTS
// ============================================

const variantClasses: Record<SectionVariant, string> = {
  primary: 'bg-primary-main',
  success: 'bg-success-main',
  info: 'bg-info-main',
  warning: 'bg-warning-main',
  danger: 'bg-danger-main',
};

// ============================================
// COMPONENT
// ============================================

export function FormSection({
  title,
  variant = 'primary',
  actions,
  children,
  className,
  contentClassName,
  gridClassName,
  showDivider = true,
  dividerClassName,
}: FormSectionProps) {
  return (
    <div className={cn(className)}>
      {/* Divider */}
      {showDivider && (
        <div className={cn('border-b border-border-light pb-8', dividerClassName)}>
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className={cn('w-1.5 h-4 rounded-full', variantClasses[variant])} />
              <h2 className="text-sm font-black text-text-primary uppercase tracking-[0.15em]">
                {title}
              </h2>
            </div>
            {actions && <div>{actions}</div>}
          </div>

          {/* Content */}
          {gridClassName ? (
            <div className={gridClassName}>{children}</div>
          ) : (
            <div className={contentClassName}>{children}</div>
          )}
        </div>
      )}

      {/* Without Divider */}
      {!showDivider && (
        <>
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className={cn('w-1.5 h-4 rounded-full', variantClasses[variant])} />
              <h2 className="text-sm font-black text-text-primary uppercase tracking-[0.15em]">
                {title}
              </h2>
            </div>
            {actions && <div>{actions}</div>}
          </div>

          {/* Content */}
          {gridClassName ? (
            <div className={gridClassName}>{children}</div>
          ) : (
            <div className={contentClassName}>{children}</div>
          )}
        </>
      )}
    </div>
  );
}
