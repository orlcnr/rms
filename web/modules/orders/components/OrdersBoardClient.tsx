// ============================================
// ORDERS BOARD CLIENT COMPONENT
// Kanban component'i
// board'un ana client Bağlantı durumu göstergesi eklendi
// ============================================

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useOrdersBoard } from '../hooks/useOrdersBoard'
import { useOrdersSocket } from '../hooks/useOrdersSocket'
import { useSocketStore } from '@/modules/shared/api/socket'
import { guestStaffApi } from '@/modules/guest/service'
import { GuestApprovalsClient } from '@/modules/guest/components/GuestApprovalsClient'
import { KanbanBoard } from './KanbanBoard'
import { Archive, Printer } from 'lucide-react'
import { Modal } from '@/modules/shared/components/Modal'
import { SubHeaderSection, BodySection } from '@/modules/shared/components/layout'
import { OrderBoardToolbar } from './OrderBoardToolbar'
import { OrderModeSwitcher } from './OrderModeSwitcher'
import { OrderDetailDrawer } from './OrderDetailDrawer'
import { OrdersByStatus, OrderType, OrderStatus, OrderGroup } from '../types'
import { PrintFormatModal } from '@/modules/shared/printing/PrintFormatModal'
import { useOrderPrint } from '@/modules/shared/printing/useOrderPrint'
import { PrintFormat, PrinterProfilesSettingV1 } from '@/modules/shared/printing/types'
import {
  normalizePrinterProfilesSetting,
  resolvePrinterProfile,
} from '@/modules/shared/printing/printer-profile-resolver'
import { ordersApi } from '../services'
import { tablesApi } from '@/modules/tables/services/tables.service'
import { Table, TableStatus } from '@/modules/tables/types'
import { extractOrderErrorCode, getOrderErrorMessage } from '../utils/order-errors'
import { settingsService } from '@/modules/settings/services/settings.service'

interface OrdersBoardClientProps {
  restaurantId: string
  userId: string
  initialOrdersByStatus: OrdersByStatus
  initialPendingGuestApprovalsCount?: number
}

export function OrdersBoardClient({
  restaurantId,
  userId,
  initialOrdersByStatus,
  initialPendingGuestApprovalsCount = 0,
}: OrdersBoardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { printOrder } = useOrderPrint()
  const [pendingGuestApprovalsCount, setPendingGuestApprovalsCount] = useState(
    initialPendingGuestApprovalsCount,
  )
  const [isGuestApprovalsOpen, setIsGuestApprovalsOpen] = useState(false)
  const [guestApprovalsFocusOrderId, setGuestApprovalsFocusOrderId] = useState<string | null>(null)
  const [guestApprovalsNotificationId, setGuestApprovalsNotificationId] = useState<string | null>(null)
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
  const { connect, disconnect, on, off } = useSocketStore()

  // Local state for archive (closed orders) modal
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [printTarget, setPrintTarget] = useState<OrderGroup | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [printerProfiles, setPrinterProfiles] = useState<PrinterProfilesSettingV1>({
    version: 1,
    profiles: [],
  })
  const [recommendedPrintFormat, setRecommendedPrintFormat] =
    useState<PrintFormat>('receipt_80mm')
  const [printProfileName, setPrintProfileName] = useState<string | undefined>()
  const [printGuidance, setPrintGuidance] = useState<string | undefined>()
  const [isMoveTableModalOpen, setIsMoveTableModalOpen] = useState(false)
  const [moveOrderGroup, setMoveOrderGroup] = useState<OrderGroup | null>(null)
  const [moveTargetTable, setMoveTargetTable] = useState<Table | null>(null)
  const [availableTables, setAvailableTables] = useState<Table[]>([])
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [isMovingTable, setIsMovingTable] = useState(false)

  useEffect(() => {
    if (!isArchiveOpen) return
    void fetchArchiveOrders(true)
  }, [fetchArchiveOrders, isArchiveOpen])

  const fetchPrinterProfiles = useCallback(async () => {
    try {
      const settings = await settingsService.getSettingsByGroup(
        restaurantId,
        'general',
      )
      const printerProfilesSetting = normalizePrinterProfilesSetting(
        settings.printer_profiles?.value,
      )
      setPrinterProfiles(printerProfilesSetting)
    } catch (error) {
      console.error('[OrdersBoardClient] Failed to load printer profiles:', error)
      setPrinterProfiles({ version: 1, profiles: [] })
    }
  }, [restaurantId])

  useEffect(() => {
    void fetchPrinterProfiles()
  }, [fetchPrinterProfiles])

  const refreshPendingGuestApprovalsCount = useCallback(async () => {
    try {
      const items = await guestStaffApi.getPendingApprovals(restaurantId)
      setPendingGuestApprovalsCount(items.length)
    } catch (error) {
      console.error(
        '[OrdersBoardClient] Failed to refresh pending guest approvals count:',
        error,
      )
    }
  }, [restaurantId])

  // Ensure fresh board state when entering page from sidebar/history
  // and when tab regains focus (covers missed socket events while page was closed).
  useEffect(() => {
    void refetch(false)
    void refreshPendingGuestApprovalsCount()

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void refetch(false)
        void refreshPendingGuestApprovalsCount()
      }
    }

    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [refetch, refreshPendingGuestApprovalsCount])

  useEffect(() => {
    const handleGuestOrderSubmitted = () => {
      setPendingGuestApprovalsCount((current) => current + 1)
    }

    const handleGuestOrderProcessed = () => {
      setPendingGuestApprovalsCount((current) => Math.max(0, current - 1))
    }

    on('ops:guest_order_submitted', handleGuestOrderSubmitted)
    on('ops:guest_order_converted', handleGuestOrderProcessed)
    on('guest_order_processed', handleGuestOrderProcessed)

    return () => {
      off('ops:guest_order_submitted', handleGuestOrderSubmitted)
      off('ops:guest_order_converted', handleGuestOrderProcessed)
      off('guest_order_processed', handleGuestOrderProcessed)
    }
  }, [off, on])

  useEffect(() => {
    const openModal = searchParams.get('open')

    if (openModal !== 'guest-approvals') {
      return
    }

    setGuestApprovalsFocusOrderId(searchParams.get('focus'))
    setGuestApprovalsNotificationId(searchParams.get('notificationId'))
    setIsGuestApprovalsOpen(true)

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('open')
    nextParams.delete('focus')
    nextParams.delete('notificationId')
    const nextUrl = nextParams.toString() ? `/orders?${nextParams}` : '/orders'
    router.replace(nextUrl)
  }, [router, searchParams])

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
    try {
      await updateStatus(orderId, newStatus)
    } catch (error) {
      toast.error(getOrderErrorMessage(extractOrderErrorCode(error)))
    }
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

    const resolved = resolvePrinterProfile({
      restaurantId,
      purpose: 'adisyon',
      setting: printerProfiles,
    })
    setPrintTarget(orderGroup)
    setRecommendedPrintFormat(resolved.format)
    setPrintProfileName(resolved.profile?.name)
    setPrintGuidance(resolved.profile?.guidance)
    setIsPrintModalOpen(true)
  }, [printerProfiles, restaurantId])

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

  const handleOpenMoveTable = useCallback(async (orderGroup: OrderGroup) => {
    const latestOrder = orderGroup.orders[orderGroup.orders.length - 1]
    if (!latestOrder?.tableId) {
      toast.error('Bu sipariş masa bağlı olmadığı için taşınamaz.')
      return
    }

    setMoveOrderGroup(orderGroup)
    setIsMoveTableModalOpen(true)
    setIsLoadingTables(true)
    try {
      const tables = await tablesApi.getTables()
      setAvailableTables(tables)
    } catch (error) {
      console.error('[OrdersBoardClient] Failed to load tables for move:', error)
      toast.error('Masalar yüklenemedi.')
      setIsMoveTableModalOpen(false)
      setMoveOrderGroup(null)
      setMoveTargetTable(null)
    } finally {
      setIsLoadingTables(false)
    }
  }, [restaurantId])

  const executeMoveToTable = useCallback(async (targetTable: Table) => {
    if (!moveOrderGroup) return

    const latestOrder = moveOrderGroup.orders[moveOrderGroup.orders.length - 1]
    if (!latestOrder?.id || !latestOrder?.tableId) {
      toast.error('Taşınacak sipariş bilgisi eksik.')
      return
    }

    if (latestOrder.tableId === targetTable.id) {
      toast.error('Sipariş zaten bu masada.')
      return
    }

    const onTargetOccupied: 'merge' | undefined =
      targetTable.status === TableStatus.OCCUPIED ? 'merge' : undefined

    setIsMovingTable(true)
    try {
      await ordersApi.moveOrderToTable(latestOrder.id, {
        new_table_id: targetTable.id,
        ...(onTargetOccupied ? { on_target_occupied: onTargetOccupied } : {}),
      })
      toast.success('Masa transferi tamamlandı.')
      setIsMoveTableModalOpen(false)
      setMoveOrderGroup(null)
      setMoveTargetTable(null)
      closeDetail()
      await refetch(false)
    } catch (error) {
      console.error('[OrdersBoardClient] move order failed:', error)
      toast.error(getOrderErrorMessage(extractOrderErrorCode(error)))
    } finally {
      setIsMovingTable(false)
    }
  }, [moveOrderGroup, closeDetail, refetch])

  const handleSelectMoveTarget = useCallback((table: Table) => {
    setMoveTargetTable(table)
  }, [])

  const handleConfirmMoveTarget = useCallback(async () => {
    if (!moveTargetTable) return
    await executeMoveToTable(moveTargetTable)
  }, [executeMoveToTable, moveTargetTable])

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
          <div className="flex flex-wrap items-center gap-3">
            <OrderModeSwitcher />
            <button
              type="button"
              onClick={() => {
                setGuestApprovalsFocusOrderId(null)
                setGuestApprovalsNotificationId(null)
                setIsGuestApprovalsOpen(true)
              }}
              className="relative flex items-center justify-center gap-2 rounded-sm border border-amber-600 bg-amber-50 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-amber-800 transition-all hover:bg-amber-100"
            >
              <span>Misafir Onayları</span>
              {pendingGuestApprovalsCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                  {pendingGuestApprovalsCount}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setIsArchiveOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-sm text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-95 bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
            >
              <Archive size={16} />
              <span>KAPANAN SİPARİŞLER</span>
            </button>
          </div>
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
        onMoveTable={handleOpenMoveTable}
      />

      <PrintFormatModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false)
          setPrintTarget(null)
        }}
        onSelect={handlePrintFormatSelect}
        defaultFormat={recommendedPrintFormat}
        profileName={printProfileName}
        guidance={printGuidance}
      />

      <Modal
        isOpen={isGuestApprovalsOpen}
        onClose={() => {
          setIsGuestApprovalsOpen(false)
          setGuestApprovalsFocusOrderId(null)
          setGuestApprovalsNotificationId(null)
        }}
        title="Misafir Sipariş Onayları"
        maxWidth="max-w-5xl"
        className="max-h-[90vh]"
      >
        <GuestApprovalsClient
          restaurantId={restaurantId}
          initialItems={[]}
          mode="modal"
          focusOrderId={guestApprovalsFocusOrderId}
          notificationId={guestApprovalsNotificationId}
          onPendingCountChange={setPendingGuestApprovalsCount}
        />
      </Modal>

      <Modal
        isOpen={isMoveTableModalOpen}
        onClose={() => {
          if (isMovingTable) return
          setIsMoveTableModalOpen(false)
          setMoveOrderGroup(null)
          setMoveTargetTable(null)
        }}
        title="Masa Değiştir"
        maxWidth="max-w-2xl"
      >
        {isLoadingTables ? (
          <div className="text-sm text-text-muted">Masalar yükleniyor...</div>
        ) : moveTargetTable ? (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-text-primary">
              {moveTargetTable.name} masasına taşıma işlemini onaylıyor musunuz?
            </p>
            <div className="rounded-sm border border-border-light bg-bg-muted/40 p-3">
              <p className="text-xs font-semibold text-text-muted">
                Kaynak Masa:{' '}
                <span className="text-text-primary">
                  {moveOrderGroup?.orders[moveOrderGroup.orders.length - 1]?.table?.name || '-'}
                </span>
              </p>
              <p className="mt-1 text-xs font-semibold text-text-muted">
                Hedef Masa:{' '}
                <span className="text-text-primary">{moveTargetTable.name}</span>
              </p>
              {moveTargetTable.status === TableStatus.OCCUPIED ? (
                <p className="mt-2 text-xs font-bold text-warning-main">
                  Hedef masa dolu olduğu için siparişler birleştirilerek taşınacak.
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isMovingTable}
                onClick={() => setMoveTargetTable(null)}
                className="rounded-sm border border-border-light px-3 py-2 text-xs font-black uppercase tracking-wider text-text-muted hover:bg-bg-muted disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isMovingTable}
                onClick={() => void handleConfirmMoveTarget()}
                className="rounded-sm bg-primary-main px-3 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-primary-dark disabled:opacity-50"
              >
                {isMovingTable ? 'Taşınıyor...' : 'Onayla ve Taşı'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Hedef masa seçin. Seçim sonrası onay ekranı açılır.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableTables.map((table) => {
                const isCurrent =
                  table.id ===
                  moveOrderGroup?.orders[moveOrderGroup.orders.length - 1]?.tableId
                const isOutOfService = table.status === TableStatus.OUT_OF_SERVICE
                return (
                  <button
                    key={table.id}
                    type="button"
                    disabled={isCurrent || isOutOfService || isMovingTable}
                    onClick={() => handleSelectMoveTarget(table)}
                    className="flex items-center justify-between rounded-sm border border-border-light px-3 py-2 text-left hover:bg-bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-sm font-bold text-text-primary">{table.name}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                      {table.status}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
