'use client'

import React, { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useOrdersLogic } from '../hooks/useOrdersLogic'
import { PosSubHeader } from './PosSubHeader'
import { PosCategoryTabs } from './PosCategoryTabs'
import { PosProductGrid } from './PosProductGrid'
import { PosBasket } from './PosBasket'
import { MobileBasketDrawer } from './MobileBasketDrawer'
import { PaymentModal } from './PaymentModal'
import { Button } from '@/modules/shared/components/Button'
import { MenuItem } from '@/modules/products/types'
import { Table } from '@/modules/tables/types'
import { Order } from '../types'

interface OrdersClientProps {
  restaurantId: string
  initialTable?: Table
  existingOrder?: Order | null
  initialMenuItems?: MenuItem[]
  initialCategories?: { id: string; name: string }[]
  paginationMeta?: {
    totalItems: number
    totalPages: number
    itemsPerPage: number
  }
}

export function OrdersClient({
  restaurantId,
  initialTable,
  existingOrder,
  initialMenuItems = [],
  initialCategories = [],
  paginationMeta,
}: OrdersClientProps) {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [localExistingOrder, setLocalExistingOrder] = useState<Order | null>(existingOrder || null)
  const router = useRouter()

  useEffect(() => {
    if (existingOrder) setLocalExistingOrder(existingOrder)
  }, [existingOrder])

  const hook = useOrdersLogic({
    restaurantId,
    initialTable,
    existingOrder,
    initialMenuItems,
    initialCategories,
    paginationMeta,
  })

  if (!hook.mounted) return null

    */
    <div
      className="flex flex-col bg-bg-surface overflow-hidden"
      style={{ height: 'calc(100vh - 96px)' }}
    >
      {/* SubHeader — Products sayfasıyla aynı yatay padding */}
      <div className="shrink-0 px-4 sm:px-8 lg:px-12 pt-8">
        <PosSubHeader selectedTable={hook.selectedTable} />
      </div>

      {/* İki Kolon İçerik */}
      <div className="flex-1 flex gap-6 px-4 sm:px-8 lg:px-12 py-6 overflow-hidden min-h-0">

        {/* SOL: Ürün Alanı */}
        <div className="flex-1 flex flex-col min-w-0 bg-bg-surface border border-border-light rounded-sm overflow-hidden">

          {/* Search + Categories */}
          <div className="shrink-0 px-6 py-4 border-b border-border-light">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="ÜRÜN ADI VEYA İÇERİK İLE ARA..."
                value={hook.searchQuery}
                onChange={(e) => hook.setSearchQuery(e.target.value)}
                className="w-full bg-bg-app border border-border-light rounded-sm py-3 pl-12 pr-4 text-xs font-black uppercase outline-none focus:border-primary-main"
              />
            </div>
            <PosCategoryTabs
              categories={hook.categories}
              activeCategoryId={hook.activeCategoryId}
              onCategoryChange={hook.setActiveCategoryId}
            />
          </div>

          {/* Ürün Grid */}
          <div className="flex-1 overflow-y-auto px-6 py-6 bg-bg-app">
            <PosProductGrid
              items={hook.filteredItems}
              onAddToBasket={hook.handleAddToBasket}
              basketItems={hook.basket}
            />
            <div ref={hook.loadMoreRef} className="h-4" />
            {hook.isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary-main border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* SAĞ: Adisyon */}
        <div className="w-[380px] shrink-0 flex flex-col bg-bg-surface border border-border-light rounded-sm overflow-hidden">
          <PosBasket
            items={hook.basket}
            selectedTable={hook.selectedTable}
            orderType={hook.orderType}
            existingOrder={localExistingOrder}
            onIncrement={hook.incrementItem}
            onDecrement={hook.decrementItem}
            onRemove={hook.removeFromBasket}
            onClear={hook.clearBasket}
            onSubmit={hook.handleSubmitOrder}
            onPay={() => setIsPaymentOpen(true)}
            isLoading={hook.isSubmitting}
            className="h-full"
          />
        </div>
      </div>

      {/* Mobile Basket Button */}
      <div className="lg:hidden shrink-0 p-4 bg-bg-surface border-t border-border-light">
        <Button variant="primary" className="w-full" onClick={() => hook.setIsBasketOpen(true)}>
          Sepeti Gör ({hook.basketSummary.itemCount})
        </Button>
      </div>

      <MobileBasketDrawer
        isOpen={hook.isBasketOpen}
        onClose={() => hook.setIsBasketOpen(false)}
        items={hook.basket}
        selectedTable={hook.selectedTable}
        orderType={hook.orderType}
        onIncrement={hook.incrementItem}
        onDecrement={hook.decrementItem}
        onRemove={hook.removeFromBasket}
        onClear={hook.clearBasket}
        onSubmit={hook.handleSubmitOrder}
        isLoading={hook.isSubmitting}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        orderId={hook.existingOrder?.id || localExistingOrder?.id || ''}
        orderTotal={hook.existingOrder?.totalAmount || localExistingOrder?.totalAmount || hook.basketSummary.total}
        restaurantId={restaurantId}
        onSuccess={() => {
          hook.clearBasket()
          setLocalExistingOrder(null)
        }}
      />
    </div>
  )
}