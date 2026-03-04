import { ImageOff, Minus, Plus, Soup } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'
import type { GuestCatalogItem } from '../types'
import { formatCurrency } from './guest-view-utils'

interface GuestProductCardProps {
  item: GuestCatalogItem
  quantity: number
  isAnimating: boolean
  isSessionEnded: boolean
  isPopular?: boolean
  wasOrderedBefore?: boolean
  onIncrement: (item: GuestCatalogItem) => void
  onDecrement: (item: GuestCatalogItem) => void
}

function ProductPreview({ item }: { item: GuestCatalogItem }) {
  const watermark = item.name.slice(0, 1).toUpperCase()

  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-border-light bg-bg-muted">
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt={item.name}
          className="h-full w-full object-contain p-2"
          loading="lazy"
        />
      ) : (
        <div className="relative flex h-full items-center justify-center">
          <span className="absolute inset-0 flex items-center justify-center text-6xl font-black text-slate-300/20">
            {watermark}
          </span>
          <span className="absolute right-3 top-3 text-slate-300/80">
            <ImageOff className="h-4 w-4" strokeWidth={1.7} />
          </span>
          <Soup className="h-8 w-8 text-slate-400" strokeWidth={1.6} />
        </div>
      )}
    </div>
  )
}

export function GuestProductCard({
  item,
  quantity,
  isAnimating,
  isSessionEnded,
  isPopular = false,
  wasOrderedBefore = false,
  onIncrement,
  onDecrement,
}: GuestProductCardProps) {
  return (
    <article
      className={cn(
        'relative flex min-w-0 flex-col rounded-xl border border-border-light bg-bg-surface p-3 shadow-sm transition duration-200',
        isAnimating && 'scale-[1.015]',
      )}
    >
      <div className="absolute left-5 top-5 z-10 flex max-w-[calc(100%-2.5rem)] flex-col items-start gap-1.5">
        {quantity > 0 ? (
          <span
            className={cn(
              'inline-flex min-w-5 items-center justify-center rounded-full bg-primary-main px-1.5 py-0.5 text-[10px] font-black text-text-inverse',
              isAnimating && 'animate-pulse',
            )}
          >
            {quantity}
          </span>
        ) : null}

        {isPopular ? (
          <span className="inline-flex items-center rounded-full bg-primary-main px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-text-inverse">
            Popüler
          </span>
        ) : null}
      </div>

      <ProductPreview item={item} />

      <div className="flex flex-1 flex-col pt-3">
        {wasOrderedBefore ? (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-main/80">
            Daha once siparis edildi
          </p>
        ) : null}
        <p className="min-h-10 text-sm font-black leading-5 text-text-primary">
          {item.name}
        </p>
        <p className="mt-1 min-h-8 text-[11px] font-medium leading-4 text-text-secondary">
          {item.description || 'Masa servisine uygun, mutfaktan taze hazırlanır.'}
        </p>
        <p className="mt-3 text-sm font-black tabular-nums text-text-primary">
          {formatCurrency(item.price)}
        </p>

        <div className="mt-3">
          {quantity === 0 ? (
            <button
              type="button"
              onClick={() => onIncrement(item)}
              disabled={isSessionEnded}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-primary-main px-3 text-[10px] font-black uppercase tracking-[0.16em] text-text-inverse transition hover:bg-primary-hover disabled:opacity-40"
            >
              Sepete Ekle
            </button>
          ) : (
            <div className="rounded-xl border border-border-light bg-bg-muted p-1">
              <div className="grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-2">
                <button
                  type="button"
                  onClick={() => onDecrement(item)}
                  disabled={isSessionEnded || quantity === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-surface text-text-primary shadow-sm transition hover:bg-bg-hover disabled:opacity-40"
                  aria-label={`${item.name} azalt`}
                >
                  <Minus className="h-4 w-4" strokeWidth={1.8} />
                </button>

                <div className="flex h-9 min-w-0 items-center justify-center rounded-lg border border-primary-main/20 bg-primary-subtle px-2 text-xs font-black uppercase tracking-[0.14em] text-primary-main">
                  <span className="truncate tabular-nums">{quantity}</span>
                </div>

                <button
                  type="button"
                  onClick={() => onIncrement(item)}
                  disabled={isSessionEnded}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-main text-text-inverse shadow-sm transition hover:bg-primary-hover disabled:opacity-40"
                  aria-label={`${item.name} artır`}
                >
                  <Plus className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
