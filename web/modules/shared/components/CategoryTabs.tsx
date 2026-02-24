'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../utils/cn';

export interface Category {
  id: string;
  name: string;
}

interface CategoryTabsProps {
  categories: Category[];
  activeCategoryId: string | null;
  onCategoryChange: (id: string | null) => void;
  onAddCategory?: () => void;
  allLabel?: string;
  addLabel?: string;
}

export function CategoryTabs({
  categories,
  activeCategoryId,
  onCategoryChange,
  onAddCategory,
  allLabel = 'TÜMÜ',
  addLabel = 'EKLE',
}: CategoryTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {/* All Category Button */}
      <button
        onClick={() => onCategoryChange(null)}
        className={cn(
          'px-5 py-2 rounded-sm text-[10px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap border',
          activeCategoryId === null
            ? 'bg-primary-main text-text-inverse border-primary-main shadow-sm'
            : 'bg-bg-app text-text-muted border-border-light hover:border-primary-main/50 hover:text-text-primary'
        )}
      >
        {allLabel}
      </button>

      {/* Category Buttons */}
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            'px-5 py-2 rounded-sm text-[10px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap border',
            activeCategoryId === category.id
              ? 'bg-primary-main text-text-inverse border-primary-main shadow-sm'
              : 'bg-bg-app text-text-muted border-border-light hover:border-primary-main/50 hover:text-text-primary'
          )}
        >
          {category.name}
        </button>
      ))}

      {/* Add Category Trigger */}
      {onAddCategory && (
        <button
          onClick={onAddCategory}
          className="p-2 bg-bg-app text-text-muted border border-dashed border-border-light rounded-sm hover:border-primary-main hover:text-primary-main transition-all flex-shrink-0 flex items-center gap-2 px-4 group"
          title={`YENİ ${addLabel} TANIMLA`}
        >
          <Plus size={14} className="group-hover:rotate-90 transition-transform" />
          <span className="text-[9px] font-black uppercase tracking-[0.1em]">{addLabel}</span>
        </button>
      )}
    </div>
  );
}
