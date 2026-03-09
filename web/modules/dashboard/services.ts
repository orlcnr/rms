import { http } from '@/modules/shared/api/http'
import { Order } from '@/modules/orders/types'
import { Reservation } from '@/modules/reservations/types'
import { DailyOperations, DashboardKpi, RevenueTrend } from './types'
import { ordersApi } from '@/modules/orders/services'
import { reservationsApi } from '@/modules/reservations/services/reservations.service'

export const dashboardApi = {
  getKpi: () => http.get<DashboardKpi>('/dashboard/kpi'),
  getRecentOrders: async (): Promise<Order[]> => {
    const response = await ordersApi.getOrders({
      limit: 200,
      status: 'pending,preparing,ready,served,on_way',
    })
    return response.items
  },
  getReservations: async (): Promise<Reservation[]> => {
    const response = await reservationsApi.getAll({ date: 'today' })
    return response.items
  },
  getRevenueTrend: () => http.get<RevenueTrend[]>('/dashboard/revenue-trend', { params: { days: 7 } }),
  getDailyOperations: () => http.get<DailyOperations>('/dashboard/daily-operations', { params: { bucketMinutes: 30 } }),
}
