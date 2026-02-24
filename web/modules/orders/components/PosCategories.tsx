// ============================================
// POS CATEGORIES - Sol Dikey Sidebar
// Desktop: w-24 dikey sütun, Mobile: horizontal scroll
// Her kategori: aspect-square kare buton, ikon + metin
// ============================================

'use client'

import React from 'react'
import { cn } from '@/modules/shared/utils/cn'
import { Package } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface PosCategoriesProps {
  categories: Category[]
  activeCategoryId: string | null
  onCategoryChange: (id: string | null) => void
}

/**
 * POS Categories - Sol Dikey Sidebar
 * - Desktop: w-24 flex-col dikey
 * - Mobile: horizontal scroll
 * - Her kategori: aspect-square kare buton
 * - Aktif: border-r-4 border-primary-main
 */
export function PosCategories({
  categories,
  activeCategoryId,
  onCategoryChange,
}: PosCategoriesProps) {
  return (
    <>
      {/* Desktop: Sol Dikey Sidebar */}
      <div className="hidden lg:flex lg:w-24 lg:flex-col lg:border-r lg:border-border-light lg:bg-bg-surface shrink-0">
        {/* Tüm Ürünler */}
        <button
          onClick={() => onCategoryChange(null)}
          className={cn(
            'aspect-square flex flex-col items-center justify-center gap-1 border-b border-border-light transition-all rounded-sm',
            activeCategoryId === null
              ? 'bg-primary-main'
              : 'bg-bg-surface hover:bg-bg-hover'
          )}
        >
          <Package size={18} className={activeCategoryId === null ? 'text-text-inverse' : 'text-text-muted'} />
          <span className={cn(
            'text-[9px] font-bold uppercase tracking-wider text-center',
            activeCategoryId === null ? 'text-text-inverse' : 'text-text-muted'
          )}>
            TÜMÜ
          </span>
        </button>

        {/* Kategoriler */}
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'aspect-square flex flex-col items-center justify-center gap-1 border-b border-border-light transition-all rounded-sm',
              activeCategoryId === category.id
                ? 'bg-primary-main'
                : 'bg-bg-surface hover:bg-bg-hover'
            )}
          >
            <span className={cn(
              'text-[9px] font-bold uppercase tracking-wider text-center px-1',
              activeCategoryId === category.id ? 'text-text-inverse' : 'text-text-muted'
            )}>
              {category.name}
            </span>
          </button>
        ))}
      </div>

      {/* Mobile: Horizontal Scroll */}
      <div className="lg:hidden border-b border-border-light bg-bg-surface">
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
          {/* Tüm Ürünler */}
          <button
            onClick={() => onCategoryChange(null)}
            className={cn(
              'px-5 py-2 rounded-sm text-[10px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap border',
              activeCategoryId === null
                ? 'bg-primary-main text-text-inverse border-primary-main shadow-sm'
                : 'bg-bg-app text-text-muted border-border-light hover:border-primary-main/50 hover:text-text-primary'
            )}
          >
            TÜMÜ
          </button>

          {/* Kategoriler */}
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
        </div>
      </div>
    </>
  )
}
