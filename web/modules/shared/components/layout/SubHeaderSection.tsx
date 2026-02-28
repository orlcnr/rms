'use client';

import React from 'react';
import { ConnectionStatus } from './ConnectionStatus';
import { cn } from '../../utils/cn';

interface SubHeaderSectionProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  isConnected?: boolean;
  isSyncing?: boolean;
  onRefresh?: () => void;
  className?: string;
  moduleColor?: string; // Tailwind bg class, e.g., 'bg-orange-500'
}

export function SubHeaderSection({
  title,
  description,
  actions,
  isConnected = true,
  isSyncing = false,
  onRefresh,
  className,
  moduleColor = 'bg-primary-main'
}: SubHeaderSectionProps) {
  return (
    <div className={cn("bg-transparent py-8 flex items-center justify-between", className)}>
      <div className="flex items-start gap-4">
        {/* Module Brand Line */}
        <div className={cn("w-1.5 h-10 rounded-full mt-1 shrink-0", moduleColor)} />

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-text-muted text-sm font-bold">
              {description}
            </p>
          )}
          <ConnectionStatus
            isConnected={isConnected}
            isSyncing={isSyncing}
            onRefresh={onRefresh}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {actions}
      </div>
    </div>
  );
}
