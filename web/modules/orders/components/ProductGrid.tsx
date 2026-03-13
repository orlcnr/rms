'use client'

import { formatCurrency } from '@/modules/shared/utils/numeric'
import { MenuItem } from '@/modules/products/types'

interface ProductGridProps {
  items: MenuItem[]
  basketQuantities: Record<string, number>
  onAddItem: (item: MenuItem) => void
}

export function ProductGrid({ items, basketQuantities, onAddItem }: ProductGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-sm border border-border-light bg-bg-app text-sm text-text-muted">
        Ürün bulunamadı
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map((item) => {
        const quantity = basketQuantities[item.id] ?? 0
        const isInBasket = quantity > 0
        const price = Number(item.effective_price ?? item.price ?? 0)

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onAddItem(item)}
            className={`relative min-h-[100px] rounded-sm border p-4 text-left transition-transform active:scale-[0.97] ${
              isInBasket
                ? 'border-primary-main bg-primary-main/10'
                : 'border-border-light bg-bg-app'
            }`}
          >
            {isInBasket ? (
              <span className="absolute right-2 top-2 flex min-h-7 min-w-7 items-center justify-center rounded-full bg-primary-main px-1 text-xs font-black text-white">
                {quantity}
              </span>
            ) : null}
            <div className="pr-8 text-base font-bold leading-tight text-text-primary">
              {item.name}
            </div>
            <div className="mt-2 text-sm font-bold text-text-secondary">
              {formatCurrency(price)}
            </div>
          </button>
        )
      })}
    </div>
  )
}
