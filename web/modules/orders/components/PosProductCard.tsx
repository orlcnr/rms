// ============================================
// POS PRODUCT CARD COMPONENT
// POS terminal için ürün kartı - tıklanınca sepete ekle
// Design Tokens kullanımı zorunlu
// Products modülü kart yapısı ile eşleşen
// ============================================

'use client'

import React from 'react'
import { Plus, Package } from 'lucide-react'
import { MenuItem } from '@/modules/products/types'
import { cn } from '@/modules/shared/utils/cn'
import { formatCurrency } from '@/modules/shared/utils/numeric'

interface PosProductCardProps {
  product: MenuItem
  onAddToBasket: (product: MenuItem) => void
  disabled?: boolean
  className?: string
}

/**
 * POS Ürün Kartı - Products modülü kart yapısı ile eşleşen
 * - Tıklanınca sepete ekle
 * - Status badge (SATIŞTA/KAPALI)
 * - "BİRİM FİYAT" etiketi ile fiyat
 */
export function PosProductCard({
  product,
  onAddToBasket,
  disabled = false,
  className,
}: PosProductCardProps) {
  const isAvailable = product.is_available

  return (
    <button
      onClick={() => !disabled && isAvailable && onAddToBasket(product)}
      disabled={disabled || !isAvailable}
      className={cn(
        'group relative flex flex-col items-start justify-center',
        'bg-bg-surface border border-border-light rounded-sm p-4',
        'min-h-[180px] max-h-[180px]',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-1',
        // Hover state
        !disabled && isAvailable && 'hover:border-primary-main hover:shadow-md cursor-pointer',
        // Disabled state
        (disabled || !isAvailable) && 'opacity-50 cursor-not-allowed',
        'flex flex-col h-full',
        className
      )}
    >
      {/* Product Icon - Standart boyut (Products modülü ile eşleşen) */}
      <div className="w-full h-12 rounded-sm mb-2 bg-bg-muted flex items-center justify-center group-hover:bg-bg-hover transition-colors">
        <Package size={24} className="text-text-secondary" />
      </div>

      {/* Content Area - Products modülü yapısı ile eşleşen */}
      <div className="flex-1 min-w-0 mb-2 w-full min-h-[40px]">
        {/* Status Badge + Product Name */}
        <div className="relative">
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
          {/* Product name without inline badge */}
          <h3 className="text-base font-bold text-text-primary uppercase tracking-tight text-left pr-16">
            {product.name}
          </h3>
        </div>
      </div>

      {/* Price Footer - Products modülü ile eşleşen */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-light/50 w-full">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">BİRİM FİYAT</span>
          <span className="text-sm font-semibold text-text-primary tabular-nums tracking-tighter">
            {formatCurrency(product.price)}
          </span>
        </div>

        {/* Add indicator on hover (desktop only) */}
        {!disabled && isAvailable && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 bg-primary-main rounded-full flex items-center justify-center">
              <Plus size={16} className="text-text-inverse" />
            </div>
          </div>
        )}
      </div>
    </button>
  )
}

// ============================================
// COMPACT POS PRODUCT CARD (Grid için)
// Products modülü kart yapısının kompakt versiyonu
// ============================================

interface CompactPosProductCardProps {
  product: MenuItem
  onAddToBasket: (product: MenuItem) => void
  disabled?: boolean
  className?: string
}

/**
 * Kompakt POS Ürün Kartı - daha küçük grid için
 * Products modülü yapısı ile eşleşen
 */
export function CompactPosProductCard({
  product,
  onAddToBasket,
  disabled = false,
  className,
}: CompactPosProductCardProps) {
  const isAvailable = product.is_available

  return (
    <button
      onClick={() => !disabled && isAvailable && onAddToBasket(product)}
      disabled={disabled || !isAvailable}
      className={cn(
        'group flex flex-col',
        'bg-bg-surface border border-border-light rounded-sm p-4',
        'min-h-[160px] max-h-[160px]',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-1',
        !disabled && isAvailable && 'hover:border-primary-main cursor-pointer',
        (disabled || !isAvailable) && 'opacity-50 cursor-not-allowed',
        'flex flex-col h-full',
        className
      )}
    >
      {/* Product Icon - Kompakt boyut */}
      <div className="w-full h-8 rounded-sm mb-1 bg-bg-muted flex items-center justify-center group-hover:bg-bg-hover transition-colors">
        <Package size={16} className="text-text-secondary" />
      </div>

      {/* Content - Kompakt */}
      <div className="flex-1 min-w-0 mb-1 w-full min-h-[32px]">
        <div className="flex justify-between items-start gap-1">
          <h3 className="text-[10px] font-bold text-text-primary uppercase tracking-tight text-left">
            {product.name}
          </h3>
          <div className="flex gap-0.5 shrink-0">
            {product.is_available ? (
              <span className="bg-success-main text-text-inverse text-[6px] font-black uppercase px-1 py-0.5 rounded-sm">
                SATIŞTA
              </span>
            ) : (
              <span className="bg-danger-main text-text-inverse text-[6px] font-black uppercase px-1 py-0.5 rounded-sm">
                KAPALI
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Price - Kompakt footer */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-border-light/50 w-full">
        <div className="flex flex-col">
          <span className="text-[6px] font-black text-text-muted uppercase tracking-widest">BİRİM</span>
          <span className="text-xs font-black text-text-primary tabular-nums tracking-tighter">
            {formatCurrency(product.price)}
          </span>
        </div>
      </div>
    </button>
  )
}
