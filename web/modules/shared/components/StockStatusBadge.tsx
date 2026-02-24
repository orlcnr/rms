'use client';

import React from 'react';
import { AlertCircle, Check, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';

export type StockStatus = 'in_stock' | 'critical' | 'out_of_stock';

interface StockStatusBadgeProps {
  status: StockStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  in_stock: {
    label: 'YETERLİ',
    bgClass: 'bg-success-main',
    textClass: 'text-success-main',
    icon: Check,
    borderClass: 'border-transparent',
  },
  critical: {
    label: 'KRİTİK',
    bgClass: 'bg-warning-main',
    textClass: 'text-warning-main',
    icon: AlertTriangle,
    borderClass: 'border-transparent',
  },
  out_of_stock: {
    label: 'STOK YOK',
    bgClass: 'bg-danger-main',
    textClass: 'text-danger-main',
    icon: AlertCircle,
    borderClass: 'border-transparent',
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

export function StockStatusBadge({
  status,
  showLabel = true,
  size = 'sm',
  showIcon = true,
  className,
}: StockStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const sizeConfig = sizeClasses[size];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm font-black uppercase tracking-widest',
        config.bgClass,
        'text-text-inverse',
        sizeConfig.badge,
        className
      )}
    >
      {showIcon && <Icon className={cn(sizeConfig.icon)} />}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

// Compact version for tables
interface StockStatusIndicatorProps {
  status: StockStatus;
  className?: string;
}

export function StockStatusIndicator({
  status,
  className,
}: StockStatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={cn('flex justify-center', className)}>
      <StockStatusBadge status={status} size="sm" />
    </div>
  );
}

// Text version for display
interface StockStatusTextProps {
  currentStock: number;
  criticalLevel: number;
  unit: string;
  className?: string;
}

export function StockStatusText({
  currentStock,
  criticalLevel,
  unit,
  className,
}: StockStatusTextProps) {
  const isOutOfStock = currentStock <= 0;
  const isCritical = currentStock <= criticalLevel && currentStock > 0;

  const status: StockStatus = isOutOfStock ? 'out_of_stock' : isCritical ? 'critical' : 'in_stock';

  return (
    <span
      className={cn(
        'text-sm font-black tabular-nums tracking-tighter',
        isOutOfStock && 'text-danger-main',
        isCritical && 'text-warning-main',
        !isOutOfStock && !isCritical && 'text-text-primary',
        className
      )}
    >
      {currentStock.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {unit}
    </span>
  );
}
