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

// Socket & Hybrid
import { useSocketStore } from '@/modules/shared/api/socket'
import { usePendingQueue } from '@/modules/shared/hooks/usePendingQueue'
import { useSocketRevalidation } from '@/modules/shared/hooks/useSocketRevalidation'

// Types
import { MenuItem } from '@/modules/products/types'
import { Table } from '@/modules/tables/types'
import { Order, OrderStatus, OrderType } from '../types'

// Utils
import {
  groupOrderItemsByMenuItem,
  groupedItemsToArray,
  hasMorePages,
  getNextPage,
} from '../utils/order-filters'
import { resolveDisplayPrice } from '@/modules/shared/utils/pricing'
import { extractOrderErrorCode, getOrderErrorMessage } from '../utils/order-errors'

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

type ComparableMenuItemSnapshot = {
  id: string
  name: string
  is_available: boolean
  price: number | null
  base_price: number | null
  effective_price: number | null
}

function normalizeNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toComparableSnapshot(item: MenuItem): ComparableMenuItemSnapshot {
  return {
    id: item.id,
    name: item.name,
    is_available: Boolean(item.is_available),
    price: normalizeNumber(item.price),
    base_price: normalizeNumber(item.base_price),
    effective_price: normalizeNumber(item.effective_price),
  }
}

function hasInitialMenuItemsChanged(previous: MenuItem[], next: MenuItem[]): boolean {
  if (previous.length !== next.length) {
    return true
  }

  const previousById = new Map(
    previous.map((item) => [item.id, toComparableSnapshot(item)]),
  )

  for (const item of next) {
    const nextSnapshot = toComparableSnapshot(item)
    const previousSnapshot = previousById.get(item.id)

    if (!previousSnapshot) {
      return true
    }

    if (
      previousSnapshot.name !== nextSnapshot.name ||
      previousSnapshot.is_available !== nextSnapshot.is_available ||
      previousSnapshot.price !== nextSnapshot.price ||
      previousSnapshot.base_price !== nextSnapshot.base_price ||
      previousSnapshot.effective_price !== nextSnapshot.effective_price
    ) {
      return true
    }
  }

  return false
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
  paginationMeta: initialPaginationMeta,
}: UseOrdersLogicProps) {
  // ============ HYDRATION GUARD ============
  const [mounted, setMounted] = useState(false)

  // ============ LOCAL STATE ============
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [isBasketOpen, setIsBasketOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [allItems, setAllItems] = useState<MenuItem[]>(initialMenuItems)
  const [totalPages, setTotalPages] = useState(initialPaginationMeta?.totalPages || 1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

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
  const hasMore = hasMorePages(page, totalPages)

  // ============ HYBRID REFS ============
  const suppressedTransactionIds = useRef<Set<string>>(new Set())
  const pendingQueue = usePendingQueue()

  // ============ FILTERED ITEMS ============
  const filteredItems = allItems

  // ============ EFFECTS ============

  // Debounce Search Query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Initial mount
  useEffect(() => {
    setMounted(true)
    if (initialTable) {
      setSelectedTable(initialTable)
      setOrderType(OrderType.DINE_IN)
    }
  }, [initialTable, setSelectedTable, setOrderType])

  // Reset items when initialMenuItems changes (including same id + changed price cases).
  useEffect(() => {
    const prevItems = prevInitialMenuItemsRef.current
    const hasChanges = hasInitialMenuItemsChanged(prevItems, initialMenuItems)

    if (hasChanges) {
      setAllItems(initialMenuItems)
      setPage(1)
      setTotalPages(initialPaginationMeta?.totalPages || 1)
      prevInitialMenuItemsRef.current = initialMenuItems
    }
  }, [initialMenuItems, initialPaginationMeta])

  // Category or Search Change -> Reset and Fetch Page 1
  useEffect(() => {
    if (!mounted) return

    const fetchFirstPage = async () => {
      setIsLoadingMore(true)
      try {
        const response = await productsApi.getProducts(restaurantId, {
          page: 1,
          limit: 20,
          categoryId: activeCategoryId || undefined,
          search: debouncedSearchQuery || undefined,
          posMode: true
        })

        setAllItems(response.items)
        setPage(1)
        setTotalPages(response.meta.totalPages)
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setIsLoadingMore(false)
      }
    }

    fetchFirstPage()
  }, [activeCategoryId, debouncedSearchQuery, restaurantId, mounted])

  // Load existing order items into basket
  useEffect(() => {
    // Only load active orders! (Pending, Preparing, Ready, Served)
    // Avoid loading 'paid' or 'cancelled' orders into the POS basket.
    const activeStatuses = ['pending', 'preparing', 'ready', 'served']

    if (
      existingOrder &&
      activeStatuses.includes(existingOrder.status) &&
      existingOrder.items &&
      existingOrder.items.length > 0 &&
      selectedTable
    ) {
      const itemsMap = groupOrderItemsByMenuItem(existingOrder.items)
      const basketItems = groupedItemsToArray(itemsMap)
      setBasketForTable(selectedTable.id, basketItems, {
        strategy: 'server',
        serverOrderStatus: existingOrder.status,
        serverOrderUpdatedAt:
          (existingOrder as unknown as { updated_at?: string }).updated_at ||
          existingOrder.updatedAt ||
          existingOrder.createdAt,
      })
    }
  }, [existingOrder, selectedTable, setBasketForTable])

  // Active Monitoring: Periyodik olarak süresi dolan sepetleri temizle
  useEffect(() => {
    if (!mounted) return

    // Her 1 dakikada bir kontrol et
    const interval = setInterval(() => {
      usePosStore.getState().checkAndExpireBaskets()
    }, 60 * 1000)

    return () => clearInterval(interval)
  }, [mounted])

  // Socket connection
  const { connect, disconnect, on, off, isConnected } = useSocketStore()

  // Silent revalidation on reconnect
  useSocketRevalidation({
    isConnected,
    onRevalidate: () => {
      setPage(1)
      productsApi.getProducts(restaurantId, {
        page: 1,
        limit: 20,
        categoryId: activeCategoryId || undefined,
        search: debouncedSearchQuery || undefined,
        posMode: true
      }).then((response) => {
        setAllItems(response.items)
        setTotalPages(response.meta.totalPages)
      })
    },
  })

  useEffect(() => {
    if (!restaurantId) return
    connect(restaurantId)

    const handleOrderUpdate = (event: any) => {
      if (event.transaction_id && suppressedTransactionIds.current.has(event.transaction_id)) {
        suppressedTransactionIds.current.delete(event.transaction_id)
        return
      }

      const updatedOrder = event.data || event
      if (!selectedTable || (updatedOrder.table_id !== selectedTable.id && updatedOrder.tableId !== selectedTable.id)) {
        return
      }

      // Only handle active order updates
      const activeStatuses = ['pending', 'preparing', 'ready', 'served']
      const status = updatedOrder.status?.toLowerCase()

      if (!activeStatuses.includes(status)) {
        // Eğer sipariş kapandıysa (ödendi/iptal) sepeti temizle
        if (status === 'paid' || status === 'cancelled') {
          clearBasket()
        }
        return
      }

      if (updatedOrder.items && updatedOrder.items.length > 0) {
        const itemsMap = groupOrderItemsByMenuItem(updatedOrder.items)
        const basketItems = groupedItemsToArray(itemsMap)
        setBasketForTable(selectedTable.id, basketItems, {
          strategy: 'server',
          serverOrderStatus: updatedOrder.status as OrderStatus,
          serverOrderUpdatedAt: updatedOrder.updatedAt || updatedOrder.updated_at || updatedOrder.createdAt || updatedOrder.created_at,
        })
      } else {
        ordersApi.getOrderById(updatedOrder.id).then((order) => {
          if (order.items && order.items.length > 0) {
            const itemsMap = groupOrderItemsByMenuItem(order.items)
            const basketItems = groupedItemsToArray(itemsMap)
            setBasketForTable(selectedTable.id, basketItems, {
              strategy: 'server',
              serverOrderStatus: order.status,
              serverOrderUpdatedAt:
                (order as unknown as { updated_at?: string }).updated_at ||
                order.updatedAt ||
                order.createdAt,
            })
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
  }, [restaurantId, selectedTable, connect, disconnect, on, off, clearBasket, setBasketForTable])

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
        search: debouncedSearchQuery || undefined,
        posMode: true
      })

      if (response.items.length > 0) {
        setAllItems((prev) => [...prev, ...response.items])
        setPage(nextPageNum)
        setTotalPages(response.meta.totalPages)
      } else {
        setTotalPages(page)
      }
    } catch (error) {
      console.error('Error loading more products:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [restaurantId, page, hasMore, isLoadingMore, activeCategoryId, debouncedSearchQuery])

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
      // In branch context, basket unit price must always come from effective price
      // (override ?? base). This value is later locked as order item unitPrice.
      const effectiveUnitPrice = resolveDisplayPrice(product, { branchContext: true })

      addToBasket({
        menuItemId: product.id,
        name: product.name,
        price: effectiveUnitPrice,
        image_url: product.image_url,
      })
      toast.success(`${product.name} eklendi`)
    },
    [addToBasket]
  )

  const handleSubmitOrder = useCallback(async (existingOrderOverride?: Order | null) => {
    if (!selectedTable || basket.length === 0) return null

    setIsSubmitting(true)
    const transactionId = crypto.randomUUID()
    suppressedTransactionIds.current.add(transactionId)

    const currentOrder = existingOrderOverride ||
      existingOrder ||
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
        const itemsMap = groupOrderItemsByMenuItem(updatedOrder.items)
        const basketItems = groupedItemsToArray(itemsMap)
        setBasketForTable(selectedTable.id, basketItems, {
          strategy: 'server',
          serverOrderStatus: updatedOrder.status,
          serverOrderUpdatedAt:
            (updatedOrder as unknown as { updated_at?: string }).updated_at ||
            updatedOrder.updatedAt ||
            updatedOrder.createdAt,
        })
        return updatedOrder
      } else {
        const newOrder = await ordersApi.createOrder({
          ...payload,
          table_id: selectedTable.id,
          type: orderType,
        })

        setOrders([newOrder, ...orders])
        toast.success('Sipariş oluşturuldu')
        const itemsMap = groupOrderItemsByMenuItem(newOrder.items)
        const basketItems = groupedItemsToArray(itemsMap)
        setBasketForTable(selectedTable.id, basketItems, {
          strategy: 'server',
          serverOrderStatus: newOrder.status,
          serverOrderUpdatedAt:
            (newOrder as unknown as { updated_at?: string }).updated_at ||
            newOrder.updatedAt ||
            newOrder.createdAt,
        })
        return newOrder
      }
    } catch (e: any) {
      suppressedTransactionIds.current.delete(transactionId)
      toast.error(getOrderErrorMessage(extractOrderErrorCode(e)))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedTable, basket, orders, orderType, existingOrder, setIsSubmitting, setOrders, setBasketForTable])

  // ============ RETURN ============
  return {
    mounted,
    activeCategoryId,
    searchQuery,
    isBasketOpen,
    page,
    isLoadingMore,
    hasMore,
    loadMoreRef,
    filteredItems,
    categories,
    basket,
    basketSummary,
    selectedTable,
    orderType,
    existingOrder,
    isSubmitting,
    isConnected,
    setActiveCategoryId,
    setSearchQuery,
    setIsBasketOpen,
    handleAddToBasket,
    handleSubmitOrder,
    incrementItem,
    decrementItem,
    removeFromBasket,
    clearBasket,
  }
}
