'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';
import { cn } from '../utils/cn';

export type MovementType = 'IN' | 'OUT' | 'ADJUST';

interface MovementTypeBadgeProps {
  type: MovementType;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

const typeConfig = {
  IN: {
    label: 'GİRİŞ',
    colorClass: 'text-success-main',
    bgClass: 'bg-success-bg',
    icon: ArrowUpRight,
  },
  OUT: {
    label: 'ÇIKIŞ',
    colorClass: 'text-danger-main',
    bgClass: 'bg-danger-bg',
    icon: ArrowDownRight,
  },
  ADJUST: {
    label: 'DÜZELTME',
    colorClass: 'text-primary-main',
    bgClass: 'bg-primary-subtle',
    icon: RefreshCcw,
  },
};

const sizeClasses = {
  sm: {
    badge: 'px-1.5 py-0.5 text-[8px]',
    icon: 'w-3 h-3',
  },
  md: {
    badge: 'px-2 py-1 text-[9px]',
    icon: 'w-3.5 h-3.5',
  },
};

export function MovementTypeBadge({
  type,
  size = 'sm',
  showIcon = true,
  className,
}: MovementTypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  const sizeConfig = sizeClasses[size];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded font-bold uppercase tracking-tight',
        config.bgClass,
        config.colorClass,
        sizeConfig.badge,
        className
      )}
    >
      {showIcon && <Icon size={parseInt(sizeConfig.icon) || 10} />}
      <span>{config.label}</span>
    </span>
  );
}

// Compact version for tables
interface MovementTypeIndicatorProps {
  type: MovementType;
  className?: string;
}

export function MovementTypeIndicator({
  type,
  className,
}: MovementTypeIndicatorProps) {
  return (
    <div className={cn('flex justify-center', className)}>
      <MovementTypeBadge type={type} size="sm" />
    </div>
  );
}

// Text version showing + or - prefix
interface MovementQuantityProps {
  type: MovementType;
  quantity: number;
  unit?: string;
  className?: string;
}

export function MovementQuantity({
  type,
  quantity,
  unit,
  className,
}: MovementQuantityProps) {
  const config = typeConfig[type];
  const isOut = type === 'OUT';

  return (
    <span className={cn('text-xs font-bold tabular-nums', config.colorClass, className)}>
      {isOut ? '-' : '+'}{quantity.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
      {unit && <span className="ml-1 text-[9px] opacity-60 font-bold uppercase">{unit}</span>}
    </span>
  );
}
