import React from 'react'
import type { GuestCatalogCategory, GuestCatalogItem } from '../types'
import {
  ALL_TAB_KEY,
  GuestCategoryTabs,
  POPULAR_TAB_KEY,
} from './GuestCategoryTabs'
import { GuestProductCard } from './GuestProductCard'

const ITEMS_PER_PAGE = 8

interface GuestMenuViewProps {
  categories: GuestCatalogCategory[]
  popularItems: GuestCatalogItem[]
  selectedCategoryId: string | null
  onSelectCategory: (id: string) => void
  onIncrementItem: (item: GuestCatalogItem) => void
  onDecrementItem: (item: GuestCatalogItem) => void
  quantitiesByItemId: Record<string, number>
  animatedItemId: string | null
  isSessionEnded: boolean
  categoryRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>
  orderedMenuItemIds: Set<string>
}

export function GuestMenuView({
  categories,
  popularItems,
  selectedCategoryId,
  onSelectCategory,
  onIncrementItem,
  onDecrementItem,
  quantitiesByItemId,
  animatedItemId,
  isSessionEnded,
  categoryRefs,
  orderedMenuItemIds,
}: GuestMenuViewProps) {
  const [visibleCount, setVisibleCount] = React.useState(ITEMS_PER_PAGE)
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null)

  const allItems = React.useMemo(
    () =>
      categories.flatMap((category) =>
        category.items.filter((item) => item.is_available),
      ),
    [categories],
  )

  const selectedView = React.useMemo(() => {
    if (selectedCategoryId === POPULAR_TAB_KEY) {
      return {
        key: POPULAR_TAB_KEY,
        label: 'Popüler Ürünler',
        subtitle: 'En çok tercih edilenler',
        items: popularItems,
      }
    }

    if (!selectedCategoryId || selectedCategoryId === ALL_TAB_KEY) {
      return {
        key: ALL_TAB_KEY,
        label: 'Tüm Ürünler',
        subtitle: 'Menüdeki tüm servis edilebilir ürünler',
        items: allItems,
      }
    }

    const category = categories.find((entry) => entry.id === selectedCategoryId)

    return {
      key: category?.id || ALL_TAB_KEY,
      label: category?.name || 'Tüm Ürünler',
      subtitle: 'Seçili kategori',
      items: (category?.items || []).filter((item) => item.is_available),
    }
  }, [allItems, categories, popularItems, selectedCategoryId])

  React.useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE)
  }, [selectedView.key])

  React.useEffect(() => {
    const node = loadMoreRef.current

    if (!node || visibleCount >= selectedView.items.length) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]

        if (!entry?.isIntersecting) {
          return
        }

        setVisibleCount((current) =>
          Math.min(current + ITEMS_PER_PAGE, selectedView.items.length),
        )
      },
      {
        rootMargin: '180px 0px',
      },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [selectedView.items.length, visibleCount])

  const visibleItems = selectedView.items.slice(0, visibleCount)

  return (
    <>
      <GuestCategoryTabs
        categories={categories}
        showPopular={popularItems.length > 0}
        selectedCategoryId={selectedCategoryId}
        onSelect={onSelectCategory}
        categoryRefs={categoryRefs}
      />

      <section className="space-y-5 px-4 pb-2 pt-4">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                Menü
              </p>
              <h2 className="mt-1 text-base font-black text-text-primary">
                {selectedView.label}
              </h2>
              <p className="mt-1 text-xs font-medium text-text-secondary">
                {selectedView.subtitle}
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
              {selectedView.items.length} ürün
            </span>
          </div>

          {visibleItems.length ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {visibleItems.map((item) => (
                  <GuestProductCard
                    key={`${selectedView.key}-${item.id}`}
                    item={item}
                    quantity={quantitiesByItemId[item.id] || 0}
                    isAnimating={animatedItemId === item.id}
                    isSessionEnded={isSessionEnded}
                    onIncrement={onIncrementItem}
                    onDecrement={onDecrementItem}
                    isPopular={selectedView.key === POPULAR_TAB_KEY}
                    wasOrderedBefore={orderedMenuItemIds.has(item.id)}
                  />
                ))}
              </div>

              {visibleCount < selectedView.items.length ? (
                <div
                  ref={loadMoreRef}
                  className="h-10 rounded-xl border border-dashed border-border-light bg-bg-surface/60"
                />
              ) : null}
            </>
          ) : (
            <div className="rounded-xl border border-border-light bg-bg-surface px-4 py-5 text-sm font-medium text-text-secondary shadow-sm">
              Bu bölümde şu anda servis edilebilen ürün bulunmuyor.
            </div>
          )}
        </div>
      </section>
    </>
  )
}
