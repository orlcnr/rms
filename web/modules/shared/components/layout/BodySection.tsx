'use client';

import React from 'react';
import { cn } from '../../utils/cn';

interface BodySectionProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function BodySection({ children, className, noPadding = false }: BodySectionProps) {
  return (
    <div className={cn(
      "bg-bg-surface border border-border-light rounded-b-sm flex-1 flex flex-col min-h-0",
      !noPadding && "p-6",
      className
    )}>
      {children}
    </div>
  );
}
