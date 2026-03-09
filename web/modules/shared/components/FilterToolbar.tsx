'use client';

import React from 'react';
import { Filter, Search, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface FilterToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onSearchSubmit?: () => void;
  onToggleFilters: () => void;
  isFiltersOpen: boolean;
  activeFilterCount?: number;
  filterLabel?: string;
  rightContent?: React.ReactNode;
  panel?: React.ReactNode;
  className?: string;
}

export function FilterToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'ARA...',
  onSearchSubmit,
  onToggleFilters,
  isFiltersOpen,
  activeFilterCount = 0,
  filterLabel = 'FİLTRELE',
  rightContent,
  panel,
  className,
}: FilterToolbarProps) {
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 flex-1 w-full">
          <div className="relative w-[400px] max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && onSearchSubmit) {
                  onSearchSubmit();
                }
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2.5 text-[11px] font-black uppercase tracking-wider border border-border-light bg-bg-app rounded-sm focus:outline-none focus:border-primary-main placeholder:text-text-muted transition-all shadow-sm"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={onToggleFilters}
              className={cn(
                'flex items-center justify-center gap-2 px-6 py-3 border rounded-sm text-[10px] font-black uppercase tracking-widest transition-all',
                isFiltersOpen || hasActiveFilters
                  ? 'bg-primary-subtle border-primary-main text-primary-main'
                  : 'bg-bg-app border-border-light text-text-secondary hover:border-primary-main hover:text-primary-main',
              )}
            >
              <Filter size={14} />
              <span>{filterLabel}</span>
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 bg-primary-main text-text-inverse text-[8px] rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {rightContent}
      </div>

      {isFiltersOpen ? panel : null}
    </div>
  );
}
