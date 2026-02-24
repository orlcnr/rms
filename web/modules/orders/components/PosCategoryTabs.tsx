// ============================================
// POS CATEGORY TABS - Yatay Kategori Badge'leri
// Search bar'ın altında horizontal scrollable olarak gösterilir
// Products sayfasındaki CategoryTabs benzeri
// ============================================

'use client'

import React from 'react'
import { cn } from '@/modules/shared/utils/cn'

interface Category {
  id: string
  name: string
}

interface PosCategoryTabsProps {
  categories: Category[]
  activeCategoryId: string | null
  onCategoryChange: (id: string | null) => void
}

/**
 * PosCategoryTabs - POS için yatay kategori badge'leri
 * Search bar'ın altında gösterilir
 */
export function PosCategoryTabs({
  categories,
  activeCategoryId,
  onCategoryChange,
}: PosCategoryTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {/* All Category Button */}
      <button
        onClick={() => onCategoryChange(null)}
        className={cn(
          "px-5 py-2 rounded-sm text-[10px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap border",
          activeCategoryId === null
            ? "bg-primary-main text-text-inverse border-primary-main shadow-sm"
            : "bg-bg-surface text-text-secondary border-border-light hover:border-primary-main/50 hover:text-text-primary"
        )}
      >
        TÜM ÜRÜNLER
      </button>

      {/* Category Buttons */}
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            "px-5 py-2 rounded-sm text-[10px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap border",
            activeCategoryId === category.id
              ? "bg-primary-main text-text-inverse border-primary-main shadow-sm"
              : "bg-bg-surface text-text-secondary border-border-light hover:border-primary-main/50 hover:text-text-primary"
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
