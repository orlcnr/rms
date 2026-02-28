// ============================================
// USE ORDERS BOARD HOOK
// Kanban board state yönetimi
// ============================================

'use client'

import { useState, useCallback, useMemo } from 'react'
import { revalidateTag } from 'next/cache'
import {
  OrderGroup,
  OrdersByStatus,
  OrderStatus,
  BoardFilters,
  OrderType,
  Order,
} from '../types'
import { ordersApi, ORDERS_CACHE_TAGS } from '../services'
import { usePendingQueue } from '@/modules/shared/hooks/usePendingQueue'
import { useRef, useEffect } from 'react'
import {
  filterOrdersByType,
  filterOrdersByTable,
  filterOrdersByDateRange,
  searchOrders,
  groupOrdersByTableAndStatus,
  recalculateGroupFields,
} from '../utils/order-group'

interface UseOrdersBoardProps {
  restaurantId: string
  userId: string
  initialOrdersByStatus: OrdersByStatus
}

export function useOrdersBoard({
  restaurantId,
  userId,
  initialOrdersByStatus,
}: UseOrdersBoardProps) {
  // State
  const [ordersByStatus, setOrdersByStatus] = useState<OrdersByStatus>(initialOrdersByStatus)
  const [filters, setFilters] = useState<BoardFilters>({})
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<OrderGroup | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const pendingQueue = usePendingQueue()
  const suppressedTransactionIds = useRef<Set<string>>(new Set())

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
  const refetch = useCallback(async () => {
    setIsLoading(true)
    try {
      try { revalidateTag(ORDERS_CACHE_TAGS.BOARD) } catch (e) { }

      const response = await ordersApi.getOrders({
        restaurantId,
        limit: 100,
        type: OrderType.DINE_IN
      })
      const freshOrders = response.items || (response as any) || []

      // Filter: Active orders + today's completed orders
      const now = new Date()
      const todayStart = new Date(now.setHours(0, 0, 0, 0))
      const relevantOrders = freshOrders.filter((order: Order) => {
        const isCompleted = order.status === OrderStatus.PAID || order.status === OrderStatus.CANCELLED
        if (!isCompleted) return true
        const createdAt = new Date(order.createdAt || (order as any).created_at)
        return createdAt >= todayStart
      })

      const grouped = groupOrdersByTableAndStatus(relevantOrders)
      setOrdersByStatus(grouped)
    } catch (error) {
      console.error('Refetch failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [restaurantId])

  // Sipariş durumunu güncelle
  const updateStatus = useCallback(
    async (orderIdOrIds: string | string[], newStatus: OrderStatus) => {
      const orderIds = Array.isArray(orderIdOrIds) ? orderIdOrIds : [orderIdOrIds]
      if (orderIds.length === 0) return

      const txId = crypto.randomUUID()
      setIsSyncing(true)

      // ========= 1. Optimistic Update (Group-Aware) =========
      setOrdersByStatus(prev => {
        // Deep clone to avoid mutation
        const nextState: OrdersByStatus = JSON.parse(JSON.stringify(prev))
        const statusKeys = Object.keys(nextState) as Array<keyof OrdersByStatus>
        const newStatusKey = newStatus as keyof OrdersByStatus

        // Ensure destination status array exists
        if (!nextState[newStatusKey]) {
          nextState[newStatusKey] = []
        }

        // For each orderId, find its source group and move it
        for (const orderId of orderIds) {
          let foundOrder: Order | null = null
          let sourceStatusKey: keyof OrdersByStatus | null = null
          let sourceGroupTableId: string | null = null

          // Search for the order in all status groups
          for (const status of statusKeys) {
            const groups = nextState[status]
            for (const group of groups) {
              const orderIndex = group.orders.findIndex(o => o.id === orderId)
              if (orderIndex !== -1) {
                foundOrder = group.orders[orderIndex]
                sourceStatusKey = status
                sourceGroupTableId = group.tableId
                break
              }
            }
            if (foundOrder) break
          }

          if (!foundOrder || !sourceStatusKey || !sourceGroupTableId) continue

          // 1a. Remove from source group
          const sourceGroups = nextState[sourceStatusKey]
          const sourceGroupIndex = sourceGroups.findIndex(g => g.tableId === sourceGroupTableId)

          if (sourceGroupIndex !== -1) {
            const sourceGroup = sourceGroups[sourceGroupIndex]
            const remainingOrders = sourceGroup.orders.filter(o => o.id !== orderId)

            if (remainingOrders.length === 0) {
              // Remove the entire group from source status
              nextState[sourceStatusKey] = sourceGroups.filter((_, i) => i !== sourceGroupIndex)
            } else {
              // Update the source group with the remaining orders
              nextState[sourceStatusKey] = sourceGroups.map((g, i) =>
                i === sourceGroupIndex
                  ? recalculateGroupFields({
                    ...g,
                    orders: remainingOrders,
                  })
                  : g
              )
            }
          }

          // 1b. Add to destination status group
          const updatedOrder: Order = {
            ...foundOrder,
            status: newStatus,
            items: foundOrder.items?.map(item => {
              const isCompleted = item.status === OrderStatus.SERVED || item.status === OrderStatus.DELIVERED || item.status === OrderStatus.PAID || item.status === OrderStatus.CANCELLED;
              return { ...item, status: isCompleted ? item.status : newStatus };
            })
          }
          const tableId = updatedOrder.tableId || `no-table-${updatedOrder.id}`
          const destGroups = nextState[newStatusKey]
          const destGroupIndex = destGroups.findIndex(g => g.tableId === tableId)

          if (destGroupIndex !== -1) {
            // Destination group for this table already exists — merge
            const destGroup = destGroups[destGroupIndex]
            nextState[newStatusKey] = destGroups.map((g, i) =>
              i === destGroupIndex
                ? recalculateGroupFields({
                  ...destGroup,
                  orders: [...destGroup.orders, updatedOrder],
                })
                : g
            )
          } else {
            // Create a new group in the destination status
            const newGroup: OrderGroup = {
              tableId,
              tableName: updatedOrder.table?.name || 'Sipariş',
              orders: [updatedOrder],
              totalItems: 0,
              totalAmount: 0,
              firstOrderTime: updatedOrder.createdAt || (updatedOrder as any).created_at,
              lastOrderTime: updatedOrder.createdAt || (updatedOrder as any).created_at,
              activeWaveTime: updatedOrder.createdAt || (updatedOrder as any).created_at,
              customerName: updatedOrder.customer?.name,
              orderType: updatedOrder.type,
              status: newStatus,
              activeItems: [],
              activeWaveItems: [],
              previousItems: [],
              servedItems: [],
            }
            nextState[newStatusKey] = [
              ...destGroups,
              recalculateGroupFields(newGroup)
            ]
          }
        }

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
          await ordersApi.batchUpdateOrderStatus(orderIds, newStatus, txId)
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

        refetch()
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
      const newState = { ...prev }

      switch (event.type) {
        case 'order_created': {
          const tableId = event.order.tableId || `no-table-${event.order.id}`
          const status = event.order.status as keyof OrdersByStatus

          if (newState[status]) {
            const existingIndex = newState[status].findIndex(
              (g: OrderGroup) => g.tableId === tableId
            )

            if (existingIndex !== -1) {
              newState[status] = newState[status].map((g: OrderGroup, i: number) =>
                i === existingIndex
                  ? recalculateGroupFields({
                    ...g,
                    orders: [...g.orders, event.order],
                  })
                  : g
              )
            } else {
              const newGroup: OrderGroup = {
                tableId,
                tableName: event.order.table?.name || 'Yeni Sipariş',
                orders: [event.order],
                totalItems: 0,
                totalAmount: 0,
                firstOrderTime: event.order.createdAt || (event.order as any).created_at,
                lastOrderTime: event.order.createdAt || (event.order as any).created_at,
                activeWaveTime: event.order.createdAt || (event.order as any).created_at,
                customerName: event.order.customer?.name,
                orderType: event.order.type,
                status: event.order.status,
                activeItems: [],
                activeWaveItems: [],
                previousItems: [],
                servedItems: [],
              }
              newState[status] = [
                ...newState[status],
                recalculateGroupFields(newGroup)
              ]
            }
          }
          break
        }

        case 'order_updated': {
          const statusKeys = Object.keys(prev) as Array<keyof OrdersByStatus>
          let found = false
          let currentStatus: keyof OrdersByStatus | null = null
          const orderToUpdate = event.order

          for (const status of statusKeys) {
            const group = newState[status].find(g => g.orders.some(o => o.id === orderToUpdate.id))
            if (group) {
              found = true
              currentStatus = status
              break
            }
          }

          if (found && currentStatus) {
            const newStatus = orderToUpdate.status as keyof OrdersByStatus

            if (currentStatus === newStatus) {
              newState[currentStatus] = newState[currentStatus].map(group => {
                if (group.orders.some(o => o.id === orderToUpdate.id)) {
                  return recalculateGroupFields({
                    ...group,
                    orders: group.orders.map(o => o.id === orderToUpdate.id ? orderToUpdate : o)
                  })
                }
                return group
              })
            } else {
              let extractedGroup: OrderGroup | null = null
              newState[currentStatus] = newState[currentStatus].filter(group => {
                if (group.orders.some(o => o.id === orderToUpdate.id)) {
                  const updated = recalculateGroupFields({
                    ...group,
                    orders: group.orders.filter(o => o.id !== orderToUpdate.id)
                  })
                  if (updated.orders.length > 0) return true
                  extractedGroup = group
                  return false
                }
                return true
              })

              if (newState[newStatus]) {
                const tableId = orderToUpdate.tableId || `no-table-${orderToUpdate.id}`
                const existingIndex = newState[newStatus].findIndex(g => g.tableId === tableId)

                if (existingIndex !== -1) {
                  newState[newStatus] = newState[newStatus].map((g, i) =>
                    i === existingIndex
                      ? recalculateGroupFields({ ...g, orders: [...g.orders, orderToUpdate] })
                      : g
                  )
                } else {
                  const group = extractedGroup || {
                    tableId,
                    tableName: orderToUpdate.table?.name || 'Sipariş',
                    orders: [orderToUpdate],
                    totalItems: 0,
                    totalAmount: 0,
                    firstOrderTime: orderToUpdate.createdAt || (orderToUpdate as any).created_at,
                    lastOrderTime: orderToUpdate.createdAt || (orderToUpdate as any).created_at,
                    activeWaveTime: orderToUpdate.createdAt || (orderToUpdate as any).created_at,
                    customerName: orderToUpdate.customer?.name,
                    orderType: orderToUpdate.type,
                    status: orderToUpdate.status,
                    activeItems: [],
                    activeWaveItems: [],
                    previousItems: [],
                    servedItems: [],
                  }
                  newState[newStatus] = [...newState[newStatus], recalculateGroupFields(group)]
                }
              }
            }
          }
          break
        }

        case 'order_status_changed': {
          if (event.oldStatus && event.newStatus) {
            const oldStatusKey = event.oldStatus as keyof OrdersByStatus
            const newStatusKey = event.newStatus as keyof OrdersByStatus

            if (newState[oldStatusKey]) {
              let movedOrder: Order | undefined = undefined
              const updatedGroups: OrderGroup[] = []

              for (const group of newState[oldStatusKey]) {
                const orderIndex = group.orders.findIndex((o: Order) => o.id === event.order.id)
                if (orderIndex !== -1) {
                  movedOrder = group.orders[orderIndex]
                  const updatedGroup = recalculateGroupFields({
                    ...group,
                    orders: group.orders.filter((o: Order) => o.id !== event.order.id),
                  })
                  if (updatedGroup.orders.length > 0) updatedGroups.push(updatedGroup)
                } else {
                  updatedGroups.push(group)
                }
              }

              newState[oldStatusKey] = updatedGroups

              if (movedOrder && newState[newStatusKey]) {
                const tableId = movedOrder.tableId || `no-table-${movedOrder.id}`
                const existingIndex = newState[newStatusKey].findIndex(g => g.tableId === tableId)

                if (existingIndex !== -1) {
                  newState[newStatusKey] = newState[newStatusKey].map((g, i) =>
                    i === existingIndex
                      ? recalculateGroupFields({
                        ...g,
                        orders: [...g.orders, {
                          ...movedOrder!,
                          status: event.newStatus as OrderStatus,
                          items: movedOrder!.items?.map(item => {
                            const isCompleted = item.status === OrderStatus.SERVED || item.status === OrderStatus.DELIVERED || item.status === OrderStatus.PAID || item.status === OrderStatus.CANCELLED;
                            return { ...item, status: isCompleted ? item.status : event.newStatus as OrderStatus };
                          })
                        }],
                      })
                      : g
                  )
                } else {
                  const newGroup: OrderGroup = {
                    tableId,
                    tableName: movedOrder.table?.name || 'Sipariş',
                    orders: [{
                      ...movedOrder,
                      status: event.newStatus as OrderStatus,
                      items: movedOrder.items?.map(item => {
                        const isCompleted = item.status === OrderStatus.SERVED || item.status === OrderStatus.DELIVERED || item.status === OrderStatus.PAID || item.status === OrderStatus.CANCELLED;
                        return { ...item, status: isCompleted ? item.status : event.newStatus as OrderStatus };
                      })
                    }],
                    totalItems: 0,
                    totalAmount: 0,
                    firstOrderTime: movedOrder.createdAt || (movedOrder as any).created_at,
                    lastOrderTime: movedOrder.createdAt || (movedOrder as any).created_at,
                    activeWaveTime: movedOrder.createdAt || (movedOrder as any).created_at,
                    customerName: movedOrder.customer?.name,
                    orderType: movedOrder.type,
                    status: event.newStatus,
                    activeItems: [],
                    activeWaveItems: [],
                    previousItems: [],
                    servedItems: [],
                  }
                  newState[newStatusKey] = [...newState[newStatusKey], recalculateGroupFields(newGroup)]
                }
              }
            }
          }
          break
        }
      }

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

    // Actions
    updateStatus,
    refetch,
    handleSocketEvent,
    updateFilters,
    clearFilters,
    selectOrderGroup,
    closeDetail,
  }
}
