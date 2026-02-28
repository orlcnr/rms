// ============================================
// POS PRODUCT GRID - Terminal Tuş Hissi
// Orta panel bg-bg-app, kartlar beyaz, rounded-sm
// Products modülündeki tasarıma benzer
// ============================================

'use client'

import React from 'react'
import { Package } from 'lucide-react'
import { MenuItem } from '@/modules/products/types'
import { cn } from '@/modules/shared/utils/cn'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { BasketItem } from '../types'

interface PosProductGridProps {
  items: MenuItem[]
  onAddToBasket: (product: MenuItem) => void
  basketItems?: BasketItem[]  // Sepetteki ürünler için sayaç
  disabled?: boolean
  className?: string
}

/**
 * POS Product Grid - Terminal Tuş Hissi
 * - Orta panel: bg-bg-app (hafif gri)
 * - Kartlar: bg-bg-surface, rounded-sm
 * - Sepetteki ürün için sayaç badge (+1, x2)
 */
export function PosProductGrid({
  items,
  onAddToBasket,
  basketItems = [],
  disabled = false,
  className,
}: PosProductGridProps) {
  // Sepetteki ürün adetlerini hesapla
  const basketCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    basketItems.forEach(item => {
      counts[item.menuItemId] = (counts[item.menuItemId] || 0) + item.quantity
    })
    return counts
  }, [basketItems])

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 bg-bg-muted rounded-full flex items-center justify-center mb-4">
          <Package size={32} className="text-text-muted" />
        </div>
        <p className="text-sm font-medium text-text-muted">
          Ürün bulunamadı
        </p>
        <p className="text-xs text-text-muted mt-1">
          Farklı bir kategori veya arama terimi deneyin
        </p>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            product={item}
            onAddToBasket={onAddToBasket}
            quantityInBasket={basketCounts[item.id] || 0}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}

interface ProductCardProps {
  product: MenuItem
  onAddToBasket: (product: MenuItem) => void
  quantityInBasket: number
  disabled?: boolean
}

function ProductCard({ product, onAddToBasket, quantityInBasket, disabled = false }: ProductCardProps) {
  const isAvailable = product.is_available && !disabled

  return (
    <button
      onClick={() => isAvailable && onAddToBasket(product)}
      disabled={!isAvailable}
      className={cn(
        'bg-bg-surface border border-border-light rounded-sm p-2 group transition-all flex flex-col h-full min-h-[200px] relative',
        isAvailable && 'hover:border-border-medium hover:shadow-md cursor-pointer',
        !isAvailable && 'opacity-50 cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-1'
      )}
    >
      {/* Sepet Sayacı Badge */}
      {quantityInBasket > 0 && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-primary-main rounded-full flex items-center justify-center z-10">
          <span className="text-[10px] font-black text-text-inverse">
            {quantityInBasket > 9 ? '9+' : quantityInBasket}
          </span>
        </div>
      )}

      {/* Product Icon Area - 48x48px, gray background */}
      <div className="w-full h-12 rounded-sm mb-3 bg-bg-muted flex items-center justify-center group-hover:bg-bg-hover transition-colors">
        <Package size={24} className="text-text-secondary" />
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 mb-2 min-h-[40px]">
        {/* Status Badge + Product Name */}
        <div className="relative mb-2">
          {/* Badge at top-right */}
          <div className="absolute top-0 right-0">
            {product.is_available ? (
              <span className="bg-success-main text-text-inverse text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm">
                SATIŞTA
              </span>
            ) : (
              <span className="bg-danger-main text-text-inverse text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm">
                KAPALI
              </span>
            )}
          </div>
          {/* Product name */}
          <h3 className="text-base font-semibold text-text-primary uppercase tracking-tight text-left pr-16">
            {product.name}
          </h3>
        </div>
        {/* Description */}
        <p className="text-xs text-text-muted font-medium line-clamp-2 leading-relaxed text-left">
          {product.description || 'Açıklama belirtilmemiş.'}
        </p>
      </div>

      {/* Price Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border-light/50">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">BİRİM FİYAT</span>
          <span className="text-lg font-bold text-text-primary tabular-nums tracking-tight">
            {formatCurrency(product.price)}
          </span>
        </div>
      </div>
    </button>
  )
}
