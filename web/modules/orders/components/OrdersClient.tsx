'use client'

import React, { useState } from 'react'
import { Search } from 'lucide-react'

// Hooks
import { useOrdersLogic } from '../hooks/useOrdersLogic'

// Components
import { PosSubHeader } from './PosSubHeader'
import { PosCategoryTabs } from './PosCategoryTabs'
import { PosProductGrid } from './PosProductGrid'
import { PosBasket } from './PosBasket'
import { MobileBasketDrawer } from './MobileBasketDrawer'
import { PaymentModal } from './PaymentModal'

// Shared Components
import { Button } from '@/modules/shared/components/Button'

// Types
import { MenuItem } from '@/modules/products/types'
import { Table } from '@/modules/tables/types'
import { Order } from '../types'

// ============================================
// PROPS
// ============================================

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

// ============================================
// COMPONENT - ORCHESTRATOR
// ============================================

export function OrdersClient({
  restaurantId,
  initialTable,
  existingOrder,
  initialMenuItems = [],
  initialCategories = [],
  paginationMeta,
}: OrdersClientProps) {
  // Payment modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)

  // Use the business logic hook
  const hook = useOrdersLogic({
    restaurantId,
    initialTable,
    existingOrder,
    initialMenuItems,
    initialCategories,
    paginationMeta,
  })

  // Hydration guard
  if (!hook.mounted) return null

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-100px)] flex flex-col bg-bg-app overflow-hidden">
      {/* Header */}
      <PosSubHeader selectedTable={hook.selectedTable} />

      {/* Main Content - Two Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - Products */}
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          {/* Search & Categories */}
          <div className="bg-bg-surface border border-border-light rounded-sm p-6 shadow-sm mb-6">
            {/* Search Input */}
            <div className="relative group mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="ÜRÜN ADI VEYA İÇERİK İLE ARA..."
                value={hook.searchQuery}
                onChange={(e) => hook.setSearchQuery(e.target.value)}
                className="w-full bg-bg-app border border-border-light rounded-sm py-3 pl-12 pr-4 text-xs font-black uppercase outline-none focus:border-primary-main"
              />
            </div>

            {/* Category Tabs */}
            <PosCategoryTabs
              categories={hook.categories}
              activeCategoryId={hook.activeCategoryId}
              onCategoryChange={hook.setActiveCategoryId}
            />
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto">
            <PosProductGrid
              items={hook.filteredItems}
              onAddToBasket={hook.handleAddToBasket}
              basketItems={hook.basket}
            />

            {/* Load More Trigger */}
            <div ref={hook.loadMoreRef} className="h-4" />
            {hook.isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary-main border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Basket (Desktop) */}
        <div className="hidden lg:flex lg:w-[360px] flex-col bg-bg-surface border-l border-border-light shadow-xl mt-5">
          <PosBasket
            items={hook.basket}
            selectedTable={hook.selectedTable}
            orderType={hook.orderType}
            existingOrder={hook.existingOrder}
            onIncrement={hook.incrementItem}
            onDecrement={hook.decrementItem}
            onRemove={hook.removeFromBasket}
            onClear={hook.clearBasket}
            onSubmit={hook.handleSubmitOrder}
            onPay={() => setIsPaymentOpen(true)}
            isLoading={hook.isSubmitting}
          />
        </div>
      </div>

      {/* MOBILE BASKET BUTTON */}
      <div className="lg:hidden p-4 bg-bg-surface border-t border-border-light">
        <Button variant="primary" className="w-full" onClick={() => hook.setIsBasketOpen(true)}>
          Sepeti Gör ({hook.basketSummary.itemCount})
        </Button>
      </div>

      {/* MOBILE DRAWER */}
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

      {/* PAYMENT MODAL */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        orderId={hook.existingOrder?.id || ''}
        orderTotal={hook.existingOrder?.totalAmount || hook.basketSummary.total}
        restaurantId={restaurantId}
        onSuccess={() => {
          // Sipariş ödendi - sepeti temizle ve masayı yenile
          hook.clearBasket();
          // Socket event zaten hook tarafından yönetiliyor
        }}
      />
    </div>
  )
}
