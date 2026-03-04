import React from 'react'
import { cn } from '@/modules/shared/utils/cn'
import type { GuestCatalogCategory } from '../types'

const POPULAR_TAB_KEY = '__popular__'
const ALL_TAB_KEY = '__all__'

interface GuestCategoryTabsProps {
  categories: GuestCatalogCategory[]
  showPopular: boolean
  selectedCategoryId: string | null
  onSelect: (id: string) => void
  categoryRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>
}

export function GuestCategoryTabs({
  categories,
  showPopular,
  selectedCategoryId,
  onSelect,
  categoryRefs,
}: GuestCategoryTabsProps) {
  const tabs = [
    ...(showPopular
      ? [{ id: POPULAR_TAB_KEY, name: 'Popüler Ürünler' }]
      : []),
    { id: ALL_TAB_KEY, name: 'Tüm Ürünler' },
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
    })),
  ]

  if (!tabs.length) {
    return null
  }

  return (
    <div className="-mt-px sticky top-0 z-20 border-b border-border-light bg-white px-4 py-0 md:px-5">
      <div className="flex gap-5 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = selectedCategoryId === tab.id

          return (
            <button
              key={tab.id}
              ref={(node) => {
                categoryRefs.current[tab.id] = node
              }}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={cn(
                'shrink-0 border-b-2 pb-3 pt-3',
                isActive ? 'border-primary-main' : 'border-transparent',
              )}
            >
              <span
                className={cn(
                  'whitespace-nowrap text-[11px] font-black uppercase tracking-[0.16em] transition-colors',
                  isActive ? 'text-primary-main' : 'text-text-muted',
                )}
              >
                {tab.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { ALL_TAB_KEY, POPULAR_TAB_KEY }
