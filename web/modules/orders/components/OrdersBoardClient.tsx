// ============================================
// ORDERS BOARD CLIENT COMPONENT
// Kanban component'i
// board'un ana client Bağlantı durumu göstergesi eklendi
// ============================================

'use client'

import { useState, useMemo, useCallback } from 'react'
import { useOrdersBoard } from '../hooks/useOrdersBoard'
import { useOrdersSocket } from '../hooks/useOrdersSocket'
import { useSocketStore } from '@/modules/shared/api/socket'
import { KanbanBoard } from './KanbanBoard'
import { BoardFilters } from './BoardFilters'
import { Archive } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'
import { SubHeaderSection, BodySection } from '@/modules/shared/components/layout'
import { OrderBoardToolbar } from './OrderBoardToolbar'
import { OrderDetailDrawer } from './OrderDetailDrawer'
import { OrdersByStatus, OrderType, OrderStatus, OrderGroup } from '../types'

interface OrdersBoardClientProps {
  restaurantId: string
  userId: string
  initialOrdersByStatus: OrdersByStatus
}

export function OrdersBoardClient({
  restaurantId,
  userId,
  initialOrdersByStatus,
}: OrdersBoardClientProps) {
  const {
    ordersByStatus,
    allOrdersByStatus,
    filters,
    selectedOrderGroup,
    isDetailOpen,
    isLoading,
    isSyncing,
    updateStatus,
    refetch,
    handleSocketEvent,
    updateFilters,
    clearFilters,
    selectOrderGroup,
    closeDetail,
  } = useOrdersBoard({
    restaurantId,
    userId,
    initialOrdersByStatus,
  })

  // Get socket store for connection status
  const { isConnected, connect, disconnect } = useSocketStore()

  // Local state for archive (closed orders) modal
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)

  // Socket connection with sound enabled
  const handleOrderCreated = useCallback((order: Parameters<NonNullable<Parameters<typeof useOrdersSocket>[1]['onOrderCreated']>>[0]) => {
    if (order && order.type && order.type !== OrderType.DINE_IN) return
    handleSocketEvent({ type: 'order_created', order })
  }, [handleSocketEvent])

  const handleOrderUpdated = useCallback((order: Parameters<NonNullable<Parameters<typeof useOrdersSocket>[1]['onOrderUpdated']>>[0]) => {
    if (order && order.type && order.type !== OrderType.DINE_IN) return
    handleSocketEvent({ type: 'order_updated', order })
  }, [handleSocketEvent])

  const handleOrderStatusChanged = useCallback((data: Parameters<NonNullable<Parameters<typeof useOrdersSocket>[1]['onOrderStatusChanged']>>[0]) => {
    if (data?.order && data.order.type && data.order.type !== OrderType.DINE_IN) return
    handleSocketEvent({
      type: 'order_status_changed',
      order: data.order,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus as OrderStatus,
    })
  }, [handleSocketEvent])

  const handleOrderItemAdded = useCallback(() => {
    refetch()
  }, [refetch])

  const { isConnected: socketConnected } = useOrdersSocket(restaurantId, {
    onOrderCreated: handleOrderCreated,
    onOrderUpdated: handleOrderUpdated,
    onOrderStatusChanged: handleOrderStatusChanged,
    onOrderItemAdded: handleOrderItemAdded,
    enableSound: true,
  })

  const handleStatusChange = async (orderId: string | string[], newStatus: Parameters<typeof updateStatus>[1]) => {
    await updateStatus(orderId, newStatus)
  }

  const handleOrderClick = (orderGroup: Parameters<typeof selectOrderGroup>[0]) => {
    selectOrderGroup(orderGroup)
  }

  // Handle reconnect
  const handleReconnect = () => {
    disconnect()
    setTimeout(() => {
      connect(restaurantId)
    }, 100)
  }

  // Calculate Stats
  const stats = useMemo(() => {
    const active = allOrdersByStatus // This is the unfiltered base from the hook
    const counts = {
      total: 0,
      pending: 0,
      preparing: 0,
      ready: 0,
      tables: 0
    }

    Object.entries(active).forEach(([status, groups]) => {
      const isArchive = status === OrderStatus.PAID || status === OrderStatus.CANCELLED
      if (!isArchive) {
        counts.tables += groups.length
        groups.forEach((g: OrderGroup) => {
          counts.total += g.orders.length
          if (status === OrderStatus.PENDING) counts.pending += g.orders.length
          if (status === OrderStatus.PREPARING) counts.preparing += g.orders.length
          if (status === OrderStatus.READY) counts.ready += g.orders.length
        })
      }
    })

    return counts
  }, [allOrdersByStatus])

  // Format date for summary
  const summaryDate = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col min-h-screen bg-bg-app">
      {/* Sub Header */}
      <SubHeaderSection
        title="SİPARİŞ YÖNETİMİ"
        description='Canlı sipariş takibi ve yönetimi, kartları bord üzerinde yönetin'
        isConnected={socketConnected}
        isSyncing={isSyncing}
        onRefresh={handleReconnect}
        moduleColor="bg-success-main"
        actions={
          <button
            onClick={() => setIsArchiveOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-sm text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-95 bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
          >
            <Archive size={16} />
            <span>KAPANAN SİPARİŞLER</span>
          </button>
        }
      />

      <main className="flex flex-col flex-1 min-h-0 pb-6">
        {/* Filters & Summary Toolbar */}
        <OrderBoardToolbar
          filters={filters}
          onFilterChange={updateFilters}
          onClearFilters={clearFilters}
          stats={stats}
          summaryDate={summaryDate}
          socketConnected={socketConnected || false}
        />

        {/* Kanban Board */}
        <BodySection noPadding>
          <KanbanBoard
            ordersByStatus={ordersByStatus}
            allOrdersByStatus={allOrdersByStatus}
            onStatusChange={handleStatusChange}
            onOrderClick={handleOrderClick}
            isLoading={isLoading}
            showArchive={isArchiveOpen}
            onCloseArchive={() => setIsArchiveOpen(false)}
            isConnected={socketConnected}
          />
        </BodySection>
      </main>

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        isOpen={isDetailOpen}
        onClose={closeDetail}
        orderGroup={selectedOrderGroup}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
