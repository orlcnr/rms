// ============================================
// USE ORDERS BOARD HOOK
// Kanban board state yönetimi
// ============================================

'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { revalidateTag } from 'next/cache'
import { toast } from 'sonner'
import {
  OrderGroup,
  OrdersByStatus,
  OrderStatus,
  BoardFilters,
  OrderType,
  Order,
} from '../types'
import { ordersApi, ORDERS_CACHE_TAGS, parseOrderDto } from '../services'
import { usePendingQueue } from '@/modules/shared/hooks/usePendingQueue'
import { useRef } from 'react'
import {
  filterOrdersByType,
  filterOrdersByTable,
  filterOrdersByDateRange,
  searchOrders,
  groupOrdersByTableAndStatus,
  recalculateGroupFields,
} from '../utils/order-group'
import { ensureISO, getNow } from '@/modules/shared/utils/date'

interface UseOrdersBoardProps {
  restaurantId: string
  userId: string
  initialOrdersByStatus: OrdersByStatus
}

const ACTIVE_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
]

function getIstanbulTodayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
  }).format(date)
}

function filterOrdersByIstanbulToday(orders: Order[]): Order[] {
  const todayKey = getIstanbulTodayKey(getNow())
  return orders.filter((order) => {
    // Archive list should reflect "closed today", not "created today".
    // Closed orders are updated when status becomes paid/cancelled, so we use
    // updated_at as primary timestamp and fallback to created_at.
    const rawClosedAt =
      (order as unknown as { updated_at?: string }).updated_at ||
      order.updatedAt ||
      (order as unknown as { created_at?: string }).created_at ||
      order.createdAt
    if (!rawClosedAt) return false
    const key = getIstanbulTodayKey(new Date(ensureISO(rawClosedAt)))
    return key === todayKey
  })
}

function getOrderVersionTime(order: Order | null | undefined): number {
  if (!order) return 0
  const raw =
    (order as unknown as { updated_at?: string }).updated_at ||
    order.updatedAt ||
    (order as unknown as { created_at?: string }).created_at ||
    order.createdAt
  if (!raw) return 0
  const parsed = new Date(ensureISO(raw)).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function shouldUpdateItemForTransition(itemStatus: OrderStatus, targetOrderStatus: OrderStatus): boolean {
  if (
    itemStatus === OrderStatus.SERVED ||
    itemStatus === OrderStatus.DELIVERED ||
    itemStatus === OrderStatus.PAID ||
    itemStatus === OrderStatus.CANCELLED
  ) {
    return false
  }

  if (targetOrderStatus === OrderStatus.PENDING) {
    return false
  }

  if (targetOrderStatus === OrderStatus.PREPARING) {
    return itemStatus === OrderStatus.PENDING
  }

  if (targetOrderStatus === OrderStatus.READY) {
    return itemStatus === OrderStatus.PREPARING
  }

  if (targetOrderStatus === OrderStatus.SERVED) {
    return (
      itemStatus === OrderStatus.PENDING ||
      itemStatus === OrderStatus.PREPARING ||
      itemStatus === OrderStatus.READY
    )
  }

  if (targetOrderStatus === OrderStatus.PAID) {
    return (
      itemStatus === OrderStatus.PENDING ||
      itemStatus === OrderStatus.PREPARING ||
      itemStatus === OrderStatus.READY
    )
  }

  if (targetOrderStatus === OrderStatus.CANCELLED) {
    return (
      itemStatus === OrderStatus.PENDING ||
      itemStatus === OrderStatus.PREPARING ||
      itemStatus === OrderStatus.READY
    )
  }

  return false
}

function getOrderStatusKey(status: OrderStatus): keyof OrdersByStatus {
  return status as keyof OrdersByStatus
}

function getOrderTableId(order: Order): string {
  return order.tableId || `no-table-${order.id}`
}

function createOrderGroupFromOrder(order: Order): OrderGroup {
  return recalculateGroupFields({
    tableId: getOrderTableId(order),
    tableName: order.table?.name || 'Sipariş',
    orders: [order],
    totalItems: 0,
    totalAmount: 0,
    firstOrderTime: order.createdAt || (order as any).created_at,
    lastOrderTime: order.createdAt || (order as any).created_at,
    activeWaveTime: order.createdAt || (order as any).created_at,
    customerName: order.customer?.name,
    orderType: order.type,
    status: order.status,
    activeItems: [],
    activeWaveItems: [],
    previousItems: [],
    servedItems: [],
  })
}

function removeOrderEverywhere(state: OrdersByStatus, orderId: string) {
  const statusKeys = Object.keys(state) as Array<keyof OrdersByStatus>

  statusKeys.forEach((statusKey) => {
    const groups = state[statusKey] || []
    const nextGroups: OrderGroup[] = []

    groups.forEach((group) => {
      const filteredOrders = group.orders.filter((order) => order.id !== orderId)
      if (filteredOrders.length === 0) {
        return
      }
      nextGroups.push(
        recalculateGroupFields({
          ...group,
          orders: filteredOrders,
        }),
      )
    })

    state[statusKey] = nextGroups
  })
}

function insertOrderIntoStatusGroup(
  state: OrdersByStatus,
  order: Order,
  status: OrderStatus,
) {
  const statusKey = getOrderStatusKey(status)
  const tableId = getOrderTableId(order)
  const groups = state[statusKey] || []
  const groupIndex = groups.findIndex((group) => group.tableId === tableId)

  if (groupIndex === -1) {
    state[statusKey] = [...groups, createOrderGroupFromOrder(order)]
    return
  }

  const group = groups[groupIndex]
  const withoutSameOrder = group.orders.filter((existing) => existing.id !== order.id)
  const mergedGroup = recalculateGroupFields({
    ...group,
    orders: [...withoutSameOrder, order],
  })

  state[statusKey] = groups.map((currentGroup, index) =>
    index === groupIndex ? mergedGroup : currentGroup,
  )
}

function upsertOrder(
  state: OrdersByStatus,
  order: Order,
  targetStatus: OrderStatus,
) {
  removeOrderEverywhere(state, order.id)

  if (targetStatus === OrderStatus.PAID || targetStatus === OrderStatus.CANCELLED) {
    return
  }

  insertOrderIntoStatusGroup(state, { ...order, status: targetStatus }, targetStatus)
}

function findOrderInState(
  state: OrdersByStatus,
  orderId: string,
): Order | undefined {
  const statusKeys = Object.keys(state) as Array<keyof OrdersByStatus>
  for (const statusKey of statusKeys) {
    const found = (state[statusKey] || [])
      .flatMap((group) => group.orders)
      .find((order) => order.id === orderId)
    if (found) return found
  }
  return undefined
}

function assertNoDuplicateOrdersDev(state: OrdersByStatus, source: string) {
  if (process.env.NODE_ENV === 'production') return

  const idCounts = new Map<string, number>()
  ;(Object.keys(state) as Array<keyof OrdersByStatus>).forEach((statusKey) => {
    ;(state[statusKey] || []).forEach((group) => {
      group.orders.forEach((order) => {
        idCounts.set(order.id, (idCounts.get(order.id) || 0) + 1)
      })
    })
  })

  const duplicates = Array.from(idCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([id]) => id)

  if (duplicates.length > 0) {
    console.warn(`[useOrdersBoard] Duplicate order ids after ${source}:`, duplicates)
  }
}

export function useOrdersBoard({
  restaurantId,
  userId,
  initialOrdersByStatus,
}: UseOrdersBoardProps) {
  void restaurantId
  void userId
  // State
  const [ordersByStatus, setOrdersByStatus] = useState<OrdersByStatus>(initialOrdersByStatus)
  const [filters, setFilters] = useState<BoardFilters>({})
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<OrderGroup | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [archiveOrders, setArchiveOrders] = useState<OrderGroup[]>([])
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [archiveLastFetchedAt, setArchiveLastFetchedAt] = useState<number | null>(null)
  const archiveLastFetchedAtRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)
  const refetchRequestIdRef = useRef(0)
  const archiveRequestIdRef = useRef(0)

  const pendingQueue = usePendingQueue()
  const suppressedTransactionIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Tüm siparişleri birleştir (filtreleme için)
  const allOrders = useMemo(() => {
    const orders: Order[] = []
    const statusKeys = Object.keys(ordersByStatus) as Array<keyof OrdersByStatus>
    statusKeys.forEach(status => {
      const groups = ordersByStatus[status]
      groups.forEach((group: OrderGroup) => {
        orders.push(...group.orders)
      })
    })
    return orders
  }, [ordersByStatus])

  // Filtrelenmiş siparişleri getir
  const filteredOrdersByStatus = useMemo(() => {
    let filtered = allOrders

    // Tarih aralığı filtresi
    if (filters.dateRange) {
      filtered = filterOrdersByDateRange(
        filtered,
        filters.dateRange.start,
        filters.dateRange.end
      )
    }

    // Sipariş tipi filtresi
    if (filters.orderType) {
      filtered = filterOrdersByType(filtered, filters.orderType)
    }

    // Masa filtresi
    if (filters.tableId) {
      filtered = filterOrdersByTable(filtered, filters.tableId)
    }

    // Arama filtresi
    if (filters.search) {
      filtered = searchOrders(filtered, filters.search)
    }

    // Tekrar grupla
    return groupOrdersByTableAndStatus(filtered)
  }, [allOrders, filters])

  // Siparişleri yeniden fetch et
  const refetch = useCallback(async (withLoader = true) => {
    const requestId = ++refetchRequestIdRef.current
    if (withLoader) setIsLoading(true)
    try {
      try { revalidateTag(ORDERS_CACHE_TAGS.BOARD) } catch (e) { }

      const response = await ordersApi.getOrders({
        limit: 100,
        type: OrderType.DINE_IN,
        status: ACTIVE_STATUSES,
      })
      if (!isMountedRef.current || requestId !== refetchRequestIdRef.current) {
        return
      }
      const freshOrders = response.items || []

      const grouped = groupOrdersByTableAndStatus(freshOrders)
      setOrdersByStatus(grouped)
    } catch (error) {
      console.error('Refetch failed:', error)
    } finally {
      if (withLoader && isMountedRef.current && requestId === refetchRequestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const fetchArchiveOrders = useCallback(
    async (force = false) => {
      const requestId = ++archiveRequestIdRef.current
      const isFresh =
        archiveLastFetchedAtRef.current !== null &&
        Date.now() - archiveLastFetchedAtRef.current < 60 * 1000
      if (!force && isFresh) return

      setArchiveLoading(true)
      setArchiveError(null)

      try {
        const response = await ordersApi.getOrders({
          limit: 200,
          type: OrderType.DINE_IN,
          status: [OrderStatus.PAID, OrderStatus.CANCELLED],
        })
        if (!isMountedRef.current || requestId !== archiveRequestIdRef.current) {
          return
        }
        const fetchedOrders = response.items as Order[]
        const todayOrders = filterOrdersByIstanbulToday(fetchedOrders)
        const grouped = groupOrdersByTableAndStatus(todayOrders)

        setArchiveOrders([...(grouped.paid || []), ...(grouped.cancelled || [])])
        const fetchedAt = Date.now()
        archiveLastFetchedAtRef.current = fetchedAt
        setArchiveLastFetchedAt(fetchedAt)
      } catch (error) {
        console.error('Archive fetch failed:', error)
        if (isMountedRef.current && requestId === archiveRequestIdRef.current) {
          setArchiveError('Arşiv siparişleri alınamadı')
        }
      } finally {
        if (isMountedRef.current && requestId === archiveRequestIdRef.current) {
          setArchiveLoading(false)
        }
      }
    },
    [],
  )

  // Sipariş durumunu güncelle
  const updateStatus = useCallback(
    async (orderIdOrIds: string | string[], newStatus: OrderStatus) => {
      const rawOrderIds = Array.isArray(orderIdOrIds) ? orderIdOrIds : [orderIdOrIds]
      const orderIds = [...new Set(rawOrderIds)]
      if (orderIds.length === 0) return

      const txId = crypto.randomUUID()
      setIsSyncing(true)
      let previousStateSnapshot: OrdersByStatus | null = null

      // ========= 1. Optimistic Update (Group-Aware) =========
      setOrdersByStatus(prev => {
        previousStateSnapshot = JSON.parse(JSON.stringify(prev)) as OrdersByStatus
        // Deep clone to avoid mutation
        const nextState: OrdersByStatus = JSON.parse(JSON.stringify(prev))
        // For each orderId, find current snapshot and upsert with transition matrix
        for (const orderId of orderIds) {
          const foundOrder = findOrderInState(nextState, orderId)
          if (!foundOrder) continue
          const updatedOrder: Order = {
            ...foundOrder,
            status: newStatus,
            items: foundOrder.items?.map(item => ({
              ...item,
              status: shouldUpdateItemForTransition(item.status, newStatus)
                ? newStatus
                : item.status,
            }))
          }
          upsertOrder(nextState, updatedOrder, newStatus)
        }

        assertNoDuplicateOrdersDev(nextState, 'optimistic_status_update')
        return nextState
      })

      // ========= 2. Backend API Call — Single batch request =========
      try {
        suppressedTransactionIds.current.add(txId)

        if (orderIds.length === 1) {
          // Single order: use regular endpoint
          await ordersApi.updateOrderStatus(orderIds[0], {
            status: newStatus,
            transaction_id: txId
          })
        } else {
          // Multiple orders: use batch endpoint (avoids N requests → 429)
          const batchResult = await ordersApi.batchUpdateOrderStatus(
            orderIds,
            newStatus,
            txId,
          )
          if (batchResult.isPartial || batchResult.failed.length > 0) {
            if (previousStateSnapshot) {
              setOrdersByStatus(previousStateSnapshot)
            }
            await refetch(false)
            toast.warning(
              `Bazı siparişler güncellenemedi (${batchResult.failed.length}/${orderIds.length}).`,
            )
            return
          }
        }

        // İşlem başarılıysa cache'leri invalidate et
        try { revalidateTag(ORDERS_CACHE_TAGS.BOARD) } catch (e) { }
        try { revalidateTag(ORDERS_CACHE_TAGS.BY_STATUS(newStatus)) } catch (e) { }

        // Eğer seçili sipariş(ler) güncellendiyse drawer'ı kapat
        if (selectedOrderGroup?.orders.some(o => orderIds.includes(o.id))) {
          setIsDetailOpen(false)
          setSelectedOrderGroup(null)
        }
      } catch (error: any) {
        // Hata alınırsa Refetch (Rollback) yaparak UI ile sunucuyu eşitler
        suppressedTransactionIds.current.delete(txId)
        console.error('Status update failed, reverting optimistic update:', error)
        if (previousStateSnapshot) {
          setOrdersByStatus(previousStateSnapshot)
        }

        // Network hatası ise kuyruğa ekle
        if (error.code === 'ERR_NETWORK' || !error.response) {
          pendingQueue.add({
            id: txId,
            module: 'orders',
            endpoint: orderIds.length === 1 ? `/orders/${orderIds[0]}/status` : '/orders/batch-status',
            method: 'PATCH',
            payload: { orderIds, status: newStatus }
          })
        }

        await refetch(false)
        throw error
      } finally {
        setIsSyncing(false)
      }
    },
    [selectedOrderGroup, refetch, pendingQueue]
  )

  // Socket event'ini işle
  const handleSocketEvent = useCallback((event: {
    type: 'order_created' | 'order_updated' | 'order_status_changed'
    order: Order
    oldStatus?: OrderStatus
    newStatus?: OrderStatus
    transaction_id?: string
  }) => {
    if (!event.order) return

    // Suppression Check
    if (event.transaction_id && suppressedTransactionIds.current.has(event.transaction_id)) {
      console.log('[useOrdersBoard] Suppressing duplicate status update:', event.transaction_id);
      suppressedTransactionIds.current.delete(event.transaction_id);
      return;
    }

    setOrdersByStatus(prev => {
      const newState = JSON.parse(JSON.stringify(prev)) as OrdersByStatus
      const incomingOrder = parseOrderDto(event.order as any)
      const localOrder = findOrderInState(newState, incomingOrder.id)

      if (localOrder) {
        const incomingVersion = getOrderVersionTime(incomingOrder)
        const localVersion = getOrderVersionTime(localOrder)
        if (incomingVersion > 0 && localVersion > incomingVersion) {
          return newState
        }
      }

      switch (event.type) {
        case 'order_created': {
          upsertOrder(newState, incomingOrder, incomingOrder.status as OrderStatus)
          break
        }

        case 'order_updated': {
          upsertOrder(newState, incomingOrder, incomingOrder.status as OrderStatus)
          break
        }

        case 'order_status_changed': {
          const targetStatus = (event.newStatus || incomingOrder.status) as OrderStatus
          const destinationOrder: Order = targetStatus === incomingOrder.status
            ? incomingOrder
            : {
              ...incomingOrder,
              status: targetStatus,
              items: incomingOrder.items?.map((item) => ({
                ...item,
                status: shouldUpdateItemForTransition(item.status, targetStatus)
                  ? targetStatus
                  : item.status,
              })),
            }

          upsertOrder(newState, destinationOrder, targetStatus)
          break
        }
      }

      assertNoDuplicateOrdersDev(newState, `socket_${event.type}`)
      return newState
    })
  }, [])

  // Filter fonksiyonları
  const updateFilters = useCallback((newFilters: Partial<BoardFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  // Sipariş seçimi
  const selectOrderGroup = useCallback((group: OrderGroup) => {
    setSelectedOrderGroup(group)
    setIsDetailOpen(true)
  }, [])

  const closeDetail = useCallback(() => {
    setIsDetailOpen(false)
    setSelectedOrderGroup(null)
  }, [])

  return {
    // State
    ordersByStatus: filteredOrdersByStatus,
    allOrdersByStatus: ordersByStatus, // Unfiltered - used for drag source lookup
    filters,
    selectedOrderGroup,
    isDetailOpen,
    isLoading,
    isSyncing,
    archiveOrders,
    archiveLoading,
    archiveError,
    archiveLastFetchedAt,

    // Actions
    updateStatus,
    refetch,
    fetchArchiveOrders,
    handleSocketEvent,
    updateFilters,
    clearFilters,
    selectOrderGroup,
    closeDetail,
  }
}
