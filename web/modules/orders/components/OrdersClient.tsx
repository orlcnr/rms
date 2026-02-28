'use client'

import React, { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useOrdersLogic } from '../hooks/useOrdersLogic'
import { PosCategoryTabs } from './PosCategoryTabs'
import { PosProductGrid } from './PosProductGrid'
import { PosBasket } from './PosBasket'
import { MobileBasketDrawer } from './MobileBasketDrawer'
import { PaymentModal } from './PaymentModal'
import { Button } from '@/modules/shared/components/Button'
import { MenuItem } from '@/modules/products/types'
import { Table } from '@/modules/tables/types'
import { Order } from '../types'
import { SubHeaderSection, FilterSection, BodySection } from '@/modules/shared/components/layout'
import { useSocketStore } from '@/modules/shared/api/socket'

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
  const { isConnected } = useSocketStore()

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

  // Wrapper for handleSubmitOrder to update local state
  const handleOrderSubmit = async () => {
    const result = await hook.handleSubmitOrder()
    if (result) {
      setLocalExistingOrder(result)
    }
  }

  if (!hook.mounted) return null

  return (
    <div className="flex flex-col h-screen bg-bg-app overflow-hidden">
      {/* HEADER SECTION */}
      <SubHeaderSection
        title="POS TERMİNALİ"
        description="Masa siparişlerini yönetin ve yeni sipariş oluşturun"
        isConnected={isConnected}
        isSyncing={hook.isSubmitting}
        moduleColor="bg-success-main"
        className="px-4 sm:px-8 lg:px-12"
        actions={
          hook.selectedTable && (
            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-bg-surface border border-border-light rounded-sm">
                <span className="w-2 h-2 rounded-full bg-success-main" />
                <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">
                  MASA: {hook.selectedTable.name}
                </span>
              </span>
            </div>
          )
        }
      />

      <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-8 lg:px-12 pb-8">
        {/* FILTER SECTION */}
        <FilterSection className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="ÜRÜN ARA..."
              value={hook.searchQuery}
              onChange={(e) => hook.setSearchQuery(e.target.value)}
              className="w-full bg-bg-app border border-border-light rounded-sm py-2.5 pl-12 pr-4 text-xs font-bold uppercase outline-none focus:border-primary-main transition-colors"
            />
          </div>
          <div className="w-full sm:w-auto overflow-x-auto">
            <PosCategoryTabs
              categories={hook.categories}
              activeCategoryId={hook.activeCategoryId}
              onCategoryChange={hook.setActiveCategoryId}
            />
          </div>
        </FilterSection>

        {/* BODY SECTION */}
        <BodySection noPadding className="flex-row gap-0 overflow-hidden">
          {/* Ürün Grid */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border-light bg-bg-app overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
              <PosProductGrid
                items={hook.filteredItems}
                onAddToBasket={hook.handleAddToBasket}
                basketItems={hook.basket}
                disabled={hook.isSubmitting}
              />
              <div ref={hook.loadMoreRef} className="h-4" />
              {hook.isLoadingMore && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-primary-main border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          </div>

          {/* Adisyon Paneli */}
          <div className="w-[380px] shrink-0 flex flex-col bg-bg-surface overflow-hidden">
            <PosBasket
              items={hook.basket}
              selectedTable={hook.selectedTable}
              orderType={hook.orderType}
              existingOrder={localExistingOrder}
              onIncrement={hook.incrementItem}
              onDecrement={hook.decrementItem}
              onRemove={hook.removeFromBasket}
              onClear={hook.clearBasket}
              onSubmit={handleOrderSubmit}
              onPay={() => setIsPaymentOpen(true)}
              isLoading={hook.isSubmitting}
              disabled={hook.isSubmitting}
              className="h-full"
            />
          </div>
        </BodySection>
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
        onSubmit={handleOrderSubmit}
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