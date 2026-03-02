import { http } from '@/modules/shared/api/http'
import { Order } from '@/modules/orders/types'
import { Reservation } from '@/modules/reservations/types'
import { DailyOperations, DashboardKpi, RevenueTrend } from './types'

export const dashboardApi = {
  getKpi: () => http.get<DashboardKpi>('/dashboard/kpi'),
  getRecentOrders: () =>
    http.get<Order[]>('/orders', {
      params: {
        limit: 200,
        status: 'pending,preparing,ready,served,on_way',
      },
    }),
  getReservations: () => http.get<Reservation[]>('/reservations', { params: { date: 'today' } }),
  getRevenueTrend: () => http.get<RevenueTrend[]>('/dashboard/revenue-trend', { params: { days: 7 } }),
  getDailyOperations: () => http.get<DailyOperations>('/dashboard/daily-operations', { params: { bucketMinutes: 30 } }),
}
