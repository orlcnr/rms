'use client';

import React from 'react';
import { cn } from '../utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: {
    container: 'p-8',
    icon: 'w-8 h-8',
    title: 'text-xs',
    description: 'text-[10px]',
  },
  md: {
    container: 'p-12',
    icon: 'w-12 h-12',
    title: 'text-sm',
    description: 'text-xs',
  },
  lg: {
    container: 'p-20',
    icon: 'w-16 h-16',
    title: 'text-base',
    description: 'text-sm',
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizeConfig = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeConfig.container,
        className
      )}
    >
      {icon && (
        <div className={cn('mb-4 opacity-40', sizeConfig.icon)}>
          {icon}
        </div>
      )}
      <h3 className={cn('font-bold text-text-primary mb-1 uppercase tracking-widest', sizeConfig.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-text-muted font-bold uppercase tracking-tight', sizeConfig.description)}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Predefined empty states for common use cases
export function EmptyListState({
  entityName,
  action,
  className,
}: {
  entityName: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <EmptyState
      title={`${entityName} Bulunamadı`}
      description={`Herhangi bir ${entityName.toLowerCase()} kaydedilmemiş.`}
      action={action}
      className={className}
    />
  );
}

export function EmptySearchState({
  searchTerm,
  onClear,
  className,
}: {
  searchTerm: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      title="Sonuç Bulunamadı"
      description={`"${searchTerm}" için sonuç yok.`}
      action={
        onClear && (
          <button
            onClick={onClear}
            className="text-[10px] font-bold text-primary-main underline underline-offset-4 uppercase tracking-[0.2em]"
          >
            Aramayı Temizle
          </button>
        )
      }
      className={className}
    />
  );
}

export function EmptyFilterState({
  filters,
  onReset,
  className,
}: {
  filters: string;
  onReset?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      title="Filtre Sonucu Yok"
      description={`${filters} için sonuç bulunamadı.`}
      action={
        onReset && (
          <button
            onClick={onReset}
            className="text-[10px] font-bold text-primary-main underline underline-offset-4 uppercase tracking-[0.2em]"
          >
            Filtreleri Temizle
          </button>
        )
      }
      className={className}
    />
  );
}
