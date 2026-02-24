'use client';

import React from 'react';
import { RotateCcw, Filter } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './Button';

interface FilterPanelProps {
  children: React.ReactNode;
  onReset?: () => void;
  showReset?: boolean;
  className?: string;
}

export function FilterPanel({
  children,
  onReset,
  showReset = false,
  className,
}: FilterPanelProps) {
  const hasActiveFilters = React.Children.toArray(children).some((child) => {
    if (React.isValidElement(child)) {
      // Check if any filter has a value
      const props = child.props as { value?: string };
      return props.value && props.value !== 'all';
    }
    return false;
  });

  const shouldShowReset = showReset && (hasActiveFilters || onReset);

  return (
    <div className={cn('bg-bg-surface border border-border-light rounded-sm p-4 shadow-sm', className)}>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex-1 w-full">
          {children}
        </div>
        
        {shouldShowReset && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="gap-2 text-text-muted hover:text-text-primary shrink-0"
          >
            <RotateCcw size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">TEMİZLE</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// Filter row helper component
interface FilterRowProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterRow({ children, className }: FilterRowProps) {
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {children}
    </div>
  );
}

// Filter group helper
interface FilterGroupProps {
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterGroup({ label, children, className }: FilterGroupProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
