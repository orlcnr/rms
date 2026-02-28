// ============================================
// USE ORDERS LOGIC - Business Logic Hook
// OrdersClient.tsx'ten çıkarılan tüm iş mantığı
// Test edilebilir, bağımsız
// ============================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// Store & Hooks
import { usePosStore } from './usePosStore'

// Services
import { ordersApi } from '../services'
import { productsApi } from '@/modules/products/services/products.service'

// Socket & Hybrid
import { useSocketStore } from '@/modules/shared/api/socket'
import { usePendingQueue } from '@/modules/shared/hooks/usePendingQueue'
import { useSocketRevalidation } from '@/modules/shared/hooks/useSocketRevalidation'

// Types
import { MenuItem } from '@/modules/products/types'
import { Table } from '@/modules/tables/types'
import { Order, OrderType, CreateOrderInput } from '../types'

// Utils
import {
  filterMenuItems,
  groupOrderItemsByMenuItem,
  groupedItemsToArray,
  hasMorePages,
  getNextPage,
} from '../utils/order-filters'

// ============================================
// PROPS
// ============================================

export interface UseOrdersLogicProps {
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
// HOOK
// ============================================

export function useOrdersLogic({
  restaurantId,
  initialTable,
  existingOrder,
  initialMenuItems = [],
  initialCategories = [],
  paginationMeta,
}: UseOrdersLogicProps) {
  // ============ HYDRATION GUARD ============
  const [mounted, setMounted] = useState(false)

  // ============ LOCAL STATE ============
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isBasketOpen, setIsBasketOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [allItems, setAllItems] = useState<MenuItem[]>(initialMenuItems)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Router for refreshing server components
  const router = useRouter()

  // Track previous initialMenuItems to prevent unnecessary resets
  const prevInitialMenuItemsRef = useRef<MenuItem[]>(initialMenuItems)

  // ============ STORE ============
  const {
    getCurrentBasket,
    selectedTable,
    setSelectedTable,
    orderType,
    setOrderType,
    orders,
    setOrders,
    addToBasket,
    incrementItem,
    decrementItem,
    removeFromBasket,
    clearBasket,
    getBasketSummary,
    isSubmitting,
    setIsSubmitting,
    setBasketForTable,
  } = usePosStore()

  // ============ DERIVED VALUES ============
  const basket = getCurrentBasket()
  const basketSummary = getBasketSummary()
  const categories = initialCategories
  const hasMore = paginationMeta ? hasMorePages(page, paginationMeta.totalPages) : false

  // ============ HYBRID REFS ============
  const suppressedTransactionIds = useRef<Set<string>>(new Set())
  const pendingQueue = usePendingQueue()

  // ============ FILTERED ITEMS (MEMOIZED) ============
  const filteredItems = useMemo(() => {
    return filterMenuItems({
      items: allItems,
      categoryId: activeCategoryId,
      searchQuery: searchQuery,
    })
  }, [allItems, activeCategoryId, searchQuery])

  // ============ EFFECTS ============

  // Initial mount
  useEffect(() => {
    setMounted(true)
    if (initialTable) {
      setSelectedTable(initialTable)
      // Masadan geliniyorsa sipariş tipi daima DINE_IN olmalı
      setOrderType(OrderType.DINE_IN)
    }
  }, [initialTable, setSelectedTable, setOrderType])

  // Reset items when initialMenuItems actually changes (different content)
  useEffect(() => {
    // Compare items by checking if any item exists in both arrays
    const prevItems = prevInitialMenuItemsRef.current
    const hasNewItems = initialMenuItems.some(
      (item) => !prevItems.some((prev) => prev.id === item.id)
    )
    const hasRemovedItems = prevItems.some(
      (prev) => !initialMenuItems.some((item) => item.id === prev.id)
    )

    // Only reset if items actually changed
    if (hasNewItems || hasRemovedItems || initialMenuItems.length !== prevItems.length) {
      setAllItems(initialMenuItems)
      setPage(1)
      prevInitialMenuItemsRef.current = initialMenuItems
    }
  }, [initialMenuItems])

  // Load existing order items into basket
  useEffect(() => {
    if (existingOrder && existingOrder.items && existingOrder.items.length > 0 && selectedTable) {
      const itemsMap = groupOrderItemsByMenuItem(existingOrder.items)
      const basketItems = groupedItemsToArray(itemsMap)
      setBasketForTable(selectedTable.id, basketItems)
    }
  }, [existingOrder, selectedTable, setBasketForTable])

  // Socket connection
  const { connect, disconnect, on, off, isConnected } = useSocketStore()

  // Silent revalidation on reconnect
  useSocketRevalidation({
    isConnected,
    onRevalidate: () => {
      console.log('[OrdersLogic] Revalidating products on reconnect')
      setPage(1)
      productsApi.getProducts(restaurantId, { page: 1, limit: 20 }).then((response) => {
        if ('items' in response) {
          setAllItems(response.items)
        }
      })
    },
  })

  useEffect(() => {
    if (!restaurantId) return

    connect(restaurantId)

    const handleOrderUpdate = (event: any) => {
      console.log('[OrdersClient] Order update received:', event)

      // 1. Suppression Check
      if (event.transaction_id && suppressedTransactionIds.current.has(event.transaction_id)) {
        console.log('[OrdersClient] Suppressing event matching local transaction:', event.transaction_id)
        suppressedTransactionIds.current.delete(event.transaction_id)
        return
      }

      const updatedOrder = event.data || event

      // Only handle updates for the current table
      if (
        !selectedTable ||
        (updatedOrder.table_id !== selectedTable.id && updatedOrder.tableId !== selectedTable.id)
      ) {
        return
      }

      // If order items changed, reload basket
      if (updatedOrder.items && updatedOrder.items.length > 0) {
        const itemsMap = groupOrderItemsByMenuItem(updatedOrder.items)
        const basketItems = groupedItemsToArray(itemsMap)
        setBasketForTable(selectedTable.id, basketItems)
      } else {
        ordersApi.getOrderById(updatedOrder.id).then((order) => {
          if (order.items && order.items.length > 0) {
            const itemsMap = groupOrderItemsByMenuItem(order.items)
            const basketItems = groupedItemsToArray(itemsMap)
            setBasketForTable(selectedTable.id, basketItems)
          }
        })
      }
    }

    on('order_status_updated', handleOrderUpdate)
    on('new_order', handleOrderUpdate)

    return () => {
      off('order_status_updated', handleOrderUpdate as any)
      off('new_order', handleOrderUpdate as any)
      disconnect()
    }
  }, [restaurantId, selectedTable?.id, connect, disconnect, on, off, setBasketForTable])


  // ============ LOAD MORE (PAGINATION) ============
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const nextPageNum = getNextPage(page)
      const response = await productsApi.getProducts(restaurantId, {
        page: nextPageNum,
        limit: 20,
        categoryId: activeCategoryId || undefined,
      })

      if ('items' in response && response.items.length > 0) {
        setAllItems((prev) => [...prev, ...response.items])
        setPage(nextPageNum)
      }
    } catch (error) {
      console.error('Error loading more products:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [restaurantId, page, hasMore, isLoadingMore, activeCategoryId])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, loadMore])

  // ============ HANDLERS ============

  const handleAddToBasket = useCallback(
    (product: MenuItem) => {
      addToBasket({
        menuItemId: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
      })
      toast.success(`${product.name} eklendi`)
    },
    [addToBasket]
  )

  const handleSubmitOrder = useCallback(async () => {
    if (!selectedTable || basket.length === 0) return null

    setIsSubmitting(true)
    const transactionId = crypto.randomUUID()
    suppressedTransactionIds.current.add(transactionId)

    const currentOrder = existingOrder ||
      (orders as any[]).find(
        (o) =>
          (o.table_id === selectedTable.id || o.tableId === selectedTable.id) &&
          ['pending', 'preparing', 'ready', 'served'].includes(o.status)
      )

    const payload = {
      transaction_id: transactionId,
      items: basket.map((i) => ({ menu_item_id: i.menuItemId, quantity: i.quantity })),
    }

    try {
      if (currentOrder) {
        const updatedOrder = await ordersApi.updateOrderItems(currentOrder.id, payload)
        toast.success('Sipariş güncellendi')

        // Sync Basket with server state
        const itemsMap = groupOrderItemsByMenuItem(updatedOrder.items)
        const basketItems = groupedItemsToArray(itemsMap)
        setBasketForTable(selectedTable.id, basketItems)
        return updatedOrder
      } else {
        const newOrder = await ordersApi.createOrder({
          ...payload,
          restaurant_id: restaurantId,
          table_id: selectedTable.id,
          type: orderType,
        })

        setOrders([newOrder, ...orders])
        toast.success('Sipariş oluşturuldu')

        // Sync Basket with server state
        const itemsMap = groupOrderItemsByMenuItem(newOrder.items)
        const basketItems = groupedItemsToArray(itemsMap)
        setBasketForTable(selectedTable.id, basketItems)
        return newOrder
      }
    } catch (e: any) {
      suppressedTransactionIds.current.delete(transactionId)

      const isNetworkError = !e.response && e.message === 'Network Error'

      // Handle NestJS validation error format or simple message
      let errorMessage = 'Sipariş işlemi başarısız'
      const errorData = e?.response?.data

      if (errorData?.message) {
        if (Array.isArray(errorData.message)) {
          errorMessage = errorData.message
            .map((m: any) => typeof m === 'object' ? Object.values(m.constraints || {}).join(', ') : m)
            .join(' | ')
        } else if (typeof errorData.message === 'object') {
          errorMessage = Object.values((errorData.message as any).constraints || {}).join(', ') || 'Doğrulama hatası'
        } else {
          errorMessage = errorData.message
        }
      }

      if (isNetworkError) {
        pendingQueue.add({
          id: transactionId,
          module: 'orders',
          endpoint: currentOrder ? `/orders/${currentOrder.id}/items` : '/orders',
          method: currentOrder ? 'PATCH' : 'POST',
          payload: { ...payload, restaurant_id: restaurantId, table_id: selectedTable.id, type: orderType },
        })
        toast.error('Bağlantı hatası. İşlem kuyruğa alındı.')
      } else {
        toast.error(errorMessage)
      }
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedTable, basket, orders, restaurantId, orderType, existingOrder, setIsSubmitting, setOrders, clearBasket, pendingQueue])

  // ============ RETURN ============
  return {
    // State
    mounted,
    activeCategoryId,
    searchQuery,
    isBasketOpen,
    page,
    isLoadingMore,
    hasMore,
    loadMoreRef,

    // Data
    filteredItems,
    categories,
    basket,
    basketSummary,
    selectedTable,
    orderType,
    existingOrder,
    isSubmitting,
    isConnected,

    // Setters
    setActiveCategoryId,
    setSearchQuery,
    setIsBasketOpen,

    // Actions
    handleAddToBasket,
    handleSubmitOrder,

    // Store actions (for basket)
    incrementItem,
    decrementItem,
    removeFromBasket,
    clearBasket,
  }
}
