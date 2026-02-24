// ============================================
// USE ORDERS LOGIC - Business Logic Hook
// OrdersClient.tsx'ten çıkarılan tüm iş mantığı
// Test edilebilir, bağımsız
// ============================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'

// Store & Hooks
import { usePosStore } from './usePosStore'

// Services
import { ordersApi } from '../services'
import { productsApi } from '@/modules/products/services/products.service'

// Socket
import { useSocketStore } from '@/modules/shared/api/socket'

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

  // ============ STORE ============
  const {
    getCurrentBasket,
    selectedTable,
    setSelectedTable,
    orderType,
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
    }
    // Reset items when initialMenuItems changes
    setAllItems(initialMenuItems)
    setPage(1)
  }, [initialTable, setSelectedTable, initialMenuItems])

  // Load existing order items into basket
  useEffect(() => {
    if (existingOrder && existingOrder.items && existingOrder.items.length > 0 && selectedTable) {
      const itemsMap = groupOrderItemsByMenuItem(existingOrder.items)
      const basketItems = groupedItemsToArray(itemsMap)
      setBasketForTable(selectedTable.id, basketItems)
    }
  }, [existingOrder, selectedTable, setBasketForTable])

  // Socket connection
  const { connect, disconnect, on, off } = useSocketStore()

  useEffect(() => {
    if (!restaurantId) return

    connect(restaurantId)

    const handleOrderUpdate = (updatedOrder: any) => {
      console.log('[OrdersClient] Order update received:', updatedOrder)

      // Only handle updates for the current table
      if (
        !selectedTable ||
        (updatedOrder.table_id !== selectedTable.id && updatedOrder.tableId !== selectedTable.id)
      ) {
        console.log('[OrdersClient] Skipping - order is for different table')
        return
      }

      // If order items changed, reload basket
      if (updatedOrder.items && updatedOrder.items.length > 0) {
        const itemsMap = groupOrderItemsByMenuItem(updatedOrder.items)
        const basketItems = groupedItemsToArray(itemsMap)
        setBasketForTable(selectedTable.id, basketItems)
      } else {
        // Items not in socket event - fetch the order directly to get items
        console.log('[OrdersClient] Fetching order to get items')
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
      off('order_status_updated')
      off('new_order')
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
    if (!selectedTable || basket.length === 0) return
    setIsSubmitting(true)

    // Find current order for this table - prefer existingOrder prop if passed
    const currentOrder = existingOrder ||
      (orders as any[]).find(
        (o) =>
          (o.table_id === selectedTable.id || o.tableId === selectedTable.id) &&
          ['pending', 'preparing', 'ready', 'served'].includes(o.status)
      )

    try {
      if (currentOrder) {
        // Update existing order
        await ordersApi.updateOrderItems(currentOrder.id, {
          items: basket.map((i) => ({ menu_item_id: i.menuItemId, quantity: i.quantity })),
        })
        toast.success('Sipariş güncellendi')
      } else {
        // Create new order
        const newOrder = await ordersApi.createOrder({
          restaurant_id: restaurantId,
          table_id: selectedTable.id,
          type: orderType,
          items: basket.map((i) => ({ menu_item_id: i.menuItemId, quantity: i.quantity })),
        })

        // Add new order to list
        setOrders([newOrder, ...orders])

        toast.success('Sipariş oluşturuldu - ürün eklemeye devam edebilirsiniz')
      }
    } catch (e: any) {
      // Show error from backend
      const errorMessage = e?.response?.data?.message || 'Sipariş işlemi başarısız'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedTable, basket, orders, restaurantId, orderType, existingOrder, setIsSubmitting, setOrders])

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
