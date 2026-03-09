import { OrderStatus } from '@/modules/orders/types'
import { ReservationStatus } from '@/modules/reservations/types'

export interface DashboardKpi {
  dailyNetSales: number
  dailySalesChange: number
  activeOrders: number
  activeOrdersPending: number
  tableOccupancyRate: number
  totalTables: number
  occupiedTables: number
  criticalStockCount: number
}

export interface RecentOrder {
  id: string
  displayId: string
  customerName: string
  tableCode: string
  time: string
  amount: number
  status: OrderStatus
}

export interface ReservationItem {
  id: string
  guestName: string
  guestCount: number
  tableCode: string
  time: string
  status: ReservationStatus
}

export interface RevenueTrend {
  date: string
  amount: number
}

export type PaymentBreakdownSparse = Record<string, number>

export interface DailyOperationsBucket {
  time: string
  paidOrders: number
  salesAmount: number
  paymentBreakdown: PaymentBreakdownSparse
}

export interface DailyOperations {
  date: string
  currentOpenTables: number
  closedPaidOrdersToday: number
  dailySalesAmount: number
  openOrdersAmount: number
  paymentTotals: PaymentBreakdownSparse
  series: DailyOperationsBucket[]
}

export interface DashboardPanelLoading {
  kpi: boolean
  orders: boolean
  reservations: boolean
  revenue: boolean
  operations: boolean
}

export interface DashboardPanelError {
  kpi: string | null
  orders: string | null
  reservations: string | null
  revenue: string | null
  operations: string | null
}
