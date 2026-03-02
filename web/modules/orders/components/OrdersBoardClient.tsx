// ============================================
// ORDERS BOARD CLIENT COMPONENT
// Kanban component'i
// board'un ana client Bağlantı durumu göstergesi eklendi
// ============================================

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useOrdersBoard } from '../hooks/useOrdersBoard'
import { useOrdersSocket } from '../hooks/useOrdersSocket'
import { useSocketStore } from '@/modules/shared/api/socket'
import { KanbanBoard } from './KanbanBoard'
import { Archive, Printer } from 'lucide-react'
import { SubHeaderSection, BodySection } from '@/modules/shared/components/layout'
import { OrderBoardToolbar } from './OrderBoardToolbar'
import { OrderDetailDrawer } from './OrderDetailDrawer'
import { OrdersByStatus, OrderType, OrderStatus, OrderGroup } from '../types'
import { PrintFormatModal } from '@/modules/shared/printing/PrintFormatModal'
import { useOrderPrint } from '@/modules/shared/printing/useOrderPrint'
import { PrintFormat } from '@/modules/shared/printing/types'

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
  const router = useRouter()
  const { printOrder } = useOrderPrint()
  const {
    ordersByStatus,
    allOrdersByStatus,
    filters,
    selectedOrderGroup,
    isDetailOpen,
    isLoading,
    isSyncing,
    archiveOrders,
    archiveLoading,
    archiveError,
    archiveLastFetchedAt,
    updateStatus,
    refetch,
    fetchArchiveOrders,
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
  const { connect, disconnect } = useSocketStore()

  // Local state for archive (closed orders) modal
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [printTarget, setPrintTarget] = useState<OrderGroup | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  useEffect(() => {
    if (!isArchiveOpen) return
    void fetchArchiveOrders(true)
  }, [fetchArchiveOrders, isArchiveOpen])

  // Ensure fresh board state when entering page from sidebar/history
  // and when tab regains focus (covers missed socket events while page was closed).
  useEffect(() => {
    void refetch(false)

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void refetch(false)
      }
    }

    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [refetch])

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
    const payload: any = data as any
    const orderLike = payload?.order ?? payload
    if (!orderLike || !orderLike.id) return
    if (!orderLike.type || orderLike.type !== OrderType.DINE_IN) return
    if (!Object.values(OrderStatus).includes(orderLike.status as OrderStatus)) return

    const hasExplicitTransition =
      payload?.oldStatus && payload?.newStatus &&
      Object.values(OrderStatus).includes(payload.oldStatus as OrderStatus) &&
      Object.values(OrderStatus).includes(payload.newStatus as OrderStatus)

    handleSocketEvent({
      type: hasExplicitTransition ? 'order_status_changed' : 'order_updated',
      order: orderLike,
      oldStatus: hasExplicitTransition ? payload.oldStatus : undefined,
      newStatus: hasExplicitTransition ? payload.newStatus as OrderStatus : undefined,
      transaction_id: payload.transaction_id,
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

  const navigateToPosOrder = useCallback((orderGroup: OrderGroup) => {
    const latestOrder = orderGroup.orders[orderGroup.orders.length - 1]
    if (!latestOrder?.tableId) {
      toast.error('Bu siparişte masa olmadığı için POS yönlendirmesi yapılamıyor.')
      return
    }
    router.push(`/orders/pos/${latestOrder.tableId}?orderId=${latestOrder.id}`)
  }, [router])

  const handlePrintRequest = useCallback((orderGroup: OrderGroup | null) => {
    if (!orderGroup) {
      toast.error('Önce yazdırılacak bir sipariş seçin.')
      return
    }
    setPrintTarget(orderGroup)
    setIsPrintModalOpen(true)
  }, [])

  const handlePrintFormatSelect = useCallback((format: PrintFormat) => {
    if (!printTarget) return
    printOrder(printTarget, {
      format,
      meta: {
        printedAt: new Date().toISOString(),
      },
    })
    setIsPrintModalOpen(false)
    setPrintTarget(null)
  }, [printOrder, printTarget])

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
          actions={
            <button
              type="button"
              onClick={() => handlePrintRequest(selectedOrderGroup)}
              className="flex items-center justify-center gap-2 rounded-sm border border-border-light bg-bg-surface px-4 py-2 text-[10px] font-black uppercase tracking-wider text-text-primary transition-colors hover:bg-bg-muted"
            >
              <Printer size={14} />
              Yazdır
            </button>
          }
        />

        {/* Kanban Board */}
        <BodySection noPadding>
          <KanbanBoard
            ordersByStatus={ordersByStatus}
            allOrdersByStatus={allOrdersByStatus}
            archiveOrders={archiveOrders}
            archiveLoading={archiveLoading}
            archiveError={archiveError}
            archiveLastFetchedAt={archiveLastFetchedAt}
            onStatusChange={handleStatusChange}
            onOrderClick={handleOrderClick}
            onPrintOrder={handlePrintRequest}
            onEditOrder={navigateToPosOrder}
            onTakePayment={navigateToPosOrder}
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
        onPrint={handlePrintRequest}
        onEditOrder={navigateToPosOrder}
        onTakePayment={navigateToPosOrder}
      />

      <PrintFormatModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false)
          setPrintTarget(null)
        }}
        onSelect={handlePrintFormatSelect}
      />
    </div>
  )
}
