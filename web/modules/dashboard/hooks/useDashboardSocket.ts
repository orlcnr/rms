'use client'

import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useSocketStore } from '@/modules/shared/api/socket'
import { Order, OrderStatus } from '@/modules/orders/types'
import { useDashboardStore } from '../stores/dashboard.store'

interface UseDashboardSocketProps {
  restaurantId: string
}

type NewOrderEvent = {
  order: Partial<Order> & { id: string; status: Order['status'] }
  totalAmount?: number
}

type OrderStatusUpdatedEvent = {
  orderId: string
  status: Order['status']
  previousStatus?: Order['status']
}

type DashboardOpsRefreshEvent = {
  reason: 'order' | 'payment' | 'table'
  at: string
}

type PaymentCompletedEvent = {
  orderId?: string
  tableId?: string
  amount?: number
  at?: string
}

export function useDashboardSocket({ restaurantId }: UseDashboardSocketProps) {
  const socket = useSocketStore((state) => state.socket)
  const isConnected = useSocketStore((state) => state.isConnected)
  const connectSocket = useSocketStore((state) => state.connect)
  const disconnectSocket = useSocketStore((state) => state.disconnect)
  const onSocketEvent = useSocketStore((state) => state.on)
  const offSocketEvent = useSocketStore((state) => state.off)
  const setConnectionStatus = useDashboardStore((state) => state.setConnectionStatus)
  const reloadPanel = useDashboardStore((state) => state.reloadPanel)
  const upsertRecentOrderFromSocket = useDashboardStore(
    (state) => state.upsertRecentOrderFromSocket,
  )
  const updateRecentOrderStatus = useDashboardStore((state) => state.updateRecentOrderStatus)
  const patchKpi = useDashboardStore((state) => state.patchKpi)
  const opsRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const opsReloadInFlightRef = useRef(false)
  const kpiRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const kpiReloadInFlightRef = useRef(false)

  const connect = useCallback(() => {
    if (!restaurantId) return
    connectSocket(restaurantId)
  }, [connectSocket, restaurantId])

  const disconnect = useCallback(() => {
    disconnectSocket()
  }, [disconnectSocket])

  const scheduleKpiReload = useCallback(() => {
    if (kpiRefreshTimerRef.current) {
      clearTimeout(kpiRefreshTimerRef.current)
    }

    kpiRefreshTimerRef.current = setTimeout(async () => {
      if (kpiReloadInFlightRef.current) {
        return
      }
      kpiReloadInFlightRef.current = true
      try {
        await reloadPanel('kpi')
      } finally {
        kpiReloadInFlightRef.current = false
      }
    }, 3000)
  }, [reloadPanel])

  const handleNewOrder = useCallback(
    (data: NewOrderEvent) => {
      if (!data?.order?.id) return

      upsertRecentOrderFromSocket(data.order)

      const kpi = useDashboardStore.getState().kpi
      if (kpi) {
        patchKpi({
          activeOrders: kpi.activeOrders + 1,
          activeOrdersPending:
            data.order.status === 'pending'
              ? kpi.activeOrdersPending + 1
              : kpi.activeOrdersPending,
        })
      }

      scheduleKpiReload()
      toast.info('Yeni sipariş geldi')
    },
    [patchKpi, scheduleKpiReload, upsertRecentOrderFromSocket],
  )

  const handleOrderStatusUpdate = useCallback(
    (data: OrderStatusUpdatedEvent) => {
      if (!data?.orderId) return

      updateRecentOrderStatus(data.orderId, data.status)

      const kpi = useDashboardStore.getState().kpi
      if (!kpi) return

      let pending = kpi.activeOrdersPending
      if (data.previousStatus === 'pending' && data.status !== 'pending') {
        pending = Math.max(0, pending - 1)
      }
      if (data.previousStatus !== 'pending' && data.status === 'pending') {
        pending += 1
      }

      let active = kpi.activeOrders
      const closedStatuses: Array<Order['status']> = [
        OrderStatus.PAID,
        OrderStatus.CANCELLED,
        OrderStatus.DELIVERED,
      ]
      const previousStatus = data.previousStatus || OrderStatus.PENDING
      if (closedStatuses.includes(data.status) && !closedStatuses.includes(previousStatus)) {
        active = Math.max(0, active - 1)
      }

      patchKpi({
        activeOrders: active,
        activeOrdersPending: pending,
      })
    },
    [patchKpi, updateRecentOrderStatus],
  )

  const scheduleOperationsReload = useCallback(() => {
    if (opsRefreshTimerRef.current) {
      clearTimeout(opsRefreshTimerRef.current)
    }

    opsRefreshTimerRef.current = setTimeout(async () => {
      if (opsReloadInFlightRef.current) {
        return
      }
      opsReloadInFlightRef.current = true
      try {
        await reloadPanel('operations')
      } finally {
        opsReloadInFlightRef.current = false
      }
    }, 2500)
  }, [reloadPanel])

  const handleDashboardOpsRefresh = useCallback(
    (_payload: DashboardOpsRefreshEvent) => {
      scheduleOperationsReload()
    },
    [scheduleOperationsReload],
  )

  const handlePaymentCompleted = useCallback(
    (_payload: PaymentCompletedEvent) => {
      scheduleKpiReload()
    },
    [scheduleKpiReload],
  )

  useEffect(() => {
    if (!socket) return

    const onNewOrder = (data: unknown) => handleNewOrder(data as NewOrderEvent)
    const onOrderStatusUpdated = (data: unknown) =>
      handleOrderStatusUpdate(data as OrderStatusUpdatedEvent)
    const onDashboardOpsRefresh = (data: unknown) =>
      handleDashboardOpsRefresh(data as DashboardOpsRefreshEvent)
    const onPaymentCompleted = (data: unknown) =>
      handlePaymentCompleted(data as PaymentCompletedEvent)

    onSocketEvent('new_order', onNewOrder)
    onSocketEvent('order_status_updated', onOrderStatusUpdated)
    onSocketEvent('dashboard:ops_refresh', onDashboardOpsRefresh)
    onSocketEvent('payment.completed', onPaymentCompleted)

    return () => {
      offSocketEvent('new_order', onNewOrder)
      offSocketEvent('order_status_updated', onOrderStatusUpdated)
      offSocketEvent('dashboard:ops_refresh', onDashboardOpsRefresh)
      offSocketEvent('payment.completed', onPaymentCompleted)
      if (opsRefreshTimerRef.current) {
        clearTimeout(opsRefreshTimerRef.current)
      }
      if (kpiRefreshTimerRef.current) {
        clearTimeout(kpiRefreshTimerRef.current)
      }
    }
  }, [
    socket,
    handleDashboardOpsRefresh,
    handleNewOrder,
    handleOrderStatusUpdate,
    handlePaymentCompleted,
    scheduleKpiReload,
    scheduleOperationsReload,
    offSocketEvent,
    onSocketEvent,
  ])

  useEffect(() => {
    setConnectionStatus(isConnected)
  }, [isConnected, setConnectionStatus])

  useEffect(() => {
    if (!restaurantId) return
    connect()
    return () => disconnect()
  }, [restaurantId, connect, disconnect])

  return {
    isConnected,
    connect,
    disconnect,
  }
}
