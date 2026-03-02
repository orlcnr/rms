'use client'

import { create } from 'zustand'
import { dashboardApi } from '../services'
import {
  DailyOperations,
  DashboardKpi,
  DashboardPanelError,
  DashboardPanelLoading,
  RecentOrder,
  ReservationItem,
  RevenueTrend,
} from '../types'
import { Order, OrderStatus } from '@/modules/orders/types'
import { Reservation } from '@/modules/reservations/types'

export type DashboardPanel = 'kpi' | 'orders' | 'reservations' | 'revenue' | 'operations'

interface DashboardStore {
  kpi: DashboardKpi | null
  recentOrders: RecentOrder[]
  reservations: ReservationItem[]
  revenueTrend: RevenueTrend[]
  dailyOperations: DailyOperations | null
  isSocketConnected: boolean
  isLoading: boolean
  panelLoading: DashboardPanelLoading
  panelError: DashboardPanelError
  loadAll: () => Promise<void>
  reloadPanel: (panel: DashboardPanel) => Promise<void>
  patchKpi: (updates: Partial<DashboardKpi>) => void
  setConnectionStatus: (isConnected: boolean) => void
  upsertRecentOrderFromSocket: (order: Partial<Order> & { id: string }) => void
  updateRecentOrderStatus: (orderId: string, status: Order['status']) => void
}

const initialPanelLoading: DashboardPanelLoading = {
  kpi: false,
  orders: false,
  reservations: false,
  revenue: false,
  operations: false,
}

const initialPanelError: DashboardPanelError = {
  kpi: null,
  orders: null,
  reservations: null,
  revenue: null,
  operations: null,
}

const ACTIVE_RECENT_ORDER_STATUSES: Array<Order['status']> = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
  OrderStatus.ON_WAY,
]

function isActiveRecentOrderStatus(status?: Order['status']): boolean {
  return Boolean(status && ACTIVE_RECENT_ORDER_STATUSES.includes(status))
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function mapRecentOrders(orders: Order[]): RecentOrder[] {
  return orders
    .filter((order) => isActiveRecentOrderStatus(order.status))
    .map((order) => ({
    id: order.id,
    displayId: order.orderNumber || order.id,
    customerName:
      order.customer?.first_name && order.customer?.last_name
        ? `${order.customer.first_name} ${order.customer.last_name}`
        : order.customer?.name || '-',
    tableCode: order.table?.name || 'ONLINE',
    time: formatTime(String((order as unknown as { createdAt?: string; created_at?: string }).createdAt || (order as unknown as { created_at?: string }).created_at || '')),
    amount: Number(order.totalAmount || 0),
    status: order.status,
    }))
}

function mapReservations(reservations: Reservation[]): ReservationItem[] {
  return reservations.slice(0, 8).map((reservation) => ({
    id: reservation.id,
    guestName: `${reservation.customer?.first_name || ''} ${reservation.customer?.last_name || ''}`.trim() || '-',
    guestCount: reservation.guest_count,
    time: formatTime(reservation.reservation_time),
    status: reservation.status,
  }))
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  kpi: null,
  recentOrders: [],
  reservations: [],
  revenueTrend: [],
  dailyOperations: null,
  isSocketConnected: false,
  isLoading: false,
  panelLoading: initialPanelLoading,
  panelError: initialPanelError,

  loadAll: async () => {
    set({
      isLoading: true,
      panelLoading: {
        kpi: true,
        orders: true,
        reservations: true,
        revenue: true,
        operations: true,
      },
      panelError: initialPanelError,
    })

    const [kpiResult, ordersResult, reservationsResult, revenueResult, operationsResult] =
      await Promise.allSettled([
        dashboardApi.getKpi(),
        dashboardApi.getRecentOrders(),
        dashboardApi.getReservations(),
        dashboardApi.getRevenueTrend(),
        dashboardApi.getDailyOperations(),
      ])

    set((state) => ({
      kpi: kpiResult.status === 'fulfilled' ? kpiResult.value : state.kpi,
      recentOrders:
        ordersResult.status === 'fulfilled'
          ? mapRecentOrders(ordersResult.value)
          : state.recentOrders,
      reservations:
        reservationsResult.status === 'fulfilled'
          ? mapReservations(reservationsResult.value)
          : state.reservations,
      revenueTrend:
        revenueResult.status === 'fulfilled'
          ? revenueResult.value
          : state.revenueTrend,
      dailyOperations:
        operationsResult.status === 'fulfilled'
          ? operationsResult.value
          : state.dailyOperations,
      panelError: {
        kpi: kpiResult.status === 'rejected' ? 'KPI verisi alınamadı' : null,
        orders:
          ordersResult.status === 'rejected' ? 'Sipariş verisi alınamadı' : null,
        reservations:
          reservationsResult.status === 'rejected'
            ? 'Rezervasyon verisi alınamadı'
            : null,
        revenue:
          revenueResult.status === 'rejected' ? 'Gelir trendi alınamadı' : null,
        operations:
          operationsResult.status === 'rejected' ? 'Operasyon verisi alınamadı' : null,
      },
      panelLoading: initialPanelLoading,
      isLoading: false,
    }))
  },

  reloadPanel: async (panel) => {
    set((state) => ({
      panelLoading: { ...state.panelLoading, [panel]: true },
      panelError: { ...state.panelError, [panel]: null },
    }))

    try {
      if (panel === 'kpi') {
        const kpi = await dashboardApi.getKpi()
        set((state) => ({
          kpi,
          panelLoading: { ...state.panelLoading, kpi: false },
        }))
        return
      }

      if (panel === 'orders') {
        const orders = await dashboardApi.getRecentOrders()
        set((state) => ({
          recentOrders: mapRecentOrders(orders),
          panelLoading: { ...state.panelLoading, orders: false },
        }))
        return
      }

      if (panel === 'reservations') {
        const reservations = await dashboardApi.getReservations()
        set((state) => ({
          reservations: mapReservations(reservations),
          panelLoading: { ...state.panelLoading, reservations: false },
        }))
        return
      }

      if (panel === 'operations') {
        const dailyOperations = await dashboardApi.getDailyOperations()
        set((state) => ({
          dailyOperations,
          panelLoading: { ...state.panelLoading, operations: false },
        }))
        return
      }

      const revenueTrend = await dashboardApi.getRevenueTrend()
      set((state) => ({
        revenueTrend,
        panelLoading: { ...state.panelLoading, revenue: false },
      }))
    } catch {
      set((state) => ({
        panelError: {
          ...state.panelError,
          [panel]:
            panel === 'kpi'
              ? 'KPI verisi alınamadı'
              : panel === 'orders'
                ? 'Sipariş verisi alınamadı'
                : panel === 'reservations'
                  ? 'Rezervasyon verisi alınamadı'
                  : panel === 'operations'
                    ? 'Operasyon verisi alınamadı'
                  : 'Gelir trendi alınamadı',
        },
        panelLoading: { ...state.panelLoading, [panel]: false },
      }))
    }
  },

  patchKpi: (updates) => {
    set((state) => ({
      kpi: state.kpi ? { ...state.kpi, ...updates } : state.kpi,
    }))
  },

  setConnectionStatus: (isConnected) => {
    set({ isSocketConnected: isConnected })
  },

  upsertRecentOrderFromSocket: (order) => {
    set((state) => {
      if (!isActiveRecentOrderStatus(order.status as Order['status'])) {
        return {
          recentOrders: state.recentOrders.filter((item) => item.id !== order.id),
        }
      }

      const mappedOrder = mapRecentOrders([order as Order])[0]
      if (!mappedOrder) {
        return state
      }

      const existingIndex = state.recentOrders.findIndex((item) => item.id === mappedOrder.id)
      if (existingIndex === -1) {
        return {
          recentOrders: [mappedOrder, ...state.recentOrders],
        }
      }

      return {
        recentOrders: state.recentOrders.map((item) =>
          item.id === mappedOrder.id ? mappedOrder : item,
        ),
      }
    })
  },

  updateRecentOrderStatus: (orderId, status) => {
    if (!isActiveRecentOrderStatus(status)) {
      set((state) => ({
        recentOrders: state.recentOrders.filter((item) => item.id !== orderId),
      }))
      return
    }

    set((state) => ({
      recentOrders: state.recentOrders.map((item) =>
        item.id === orderId ? { ...item, status } : item,
      ),
    }))
  },
}))
