'use client';

import React from 'react';
import { cn } from '../../utils/cn';

interface FilterSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterSection({ children, className }: FilterSectionProps) {
  return (
    <div className={cn(
      "bg-bg-surface border-t border-x border-border-light rounded-t-sm p-4",
      className
    )}>
      {children}
    </div>
  );
}
