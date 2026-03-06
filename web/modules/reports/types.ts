export interface AuditLogChanges {
  before?: unknown
  after?: unknown
  meta?: Record<string, unknown>
}

export interface AuditLogItem {
  id: string
  timestamp: string
  restaurant_id?: string
  user_id?: string
  user_name?: string
  action: string
  resource: string
  payload?: unknown
  changes?: AuditLogChanges
  ip_address?: string
  user_agent?: string
}

export interface PaginationMeta {
  totalItems: number
  itemCount: number
  itemsPerPage: number
  totalPages: number
  currentPage: number
}

export interface PaginatedAuditLogs {
  items: AuditLogItem[]
  meta: PaginationMeta
}

export interface AuditLogFilters {
  startDate: string
  endDate: string
  userName: string
  action: string
  resource: string
  payloadText: string
  page: number
  limit: number
}

export interface ReportDateRangeFilters {
  startDate: string
  endDate: string
}

export interface DailySalesPoint {
  date: string
  order_count: number
  total_revenue: number
  average_order_value: number
}

export interface ProductSalesItem {
  product_id: string
  product_name: string
  total_quantity: number
  total_revenue: number
}

export interface CategorySalesItem {
  category_id: string
  category_name: string
  total_quantity: number
  total_revenue: number
}

export interface HourlySalesPoint {
  hour: number
  order_count: number
  total_revenue: number
}

export interface PaymentMethodStat {
  method: string
  count: number
  total_amount: number
}

export interface DiscountStats {
  total_discount: number
  discounted_orders_count: number
}

export interface StockStatusItem {
  id: string
  name: string
  unit: string
  current_quantity: number
  critical_level: number
  is_critical: boolean
}

export interface StockMovementItem {
  ingredient_name: string
  type: string
  total_quantity: number
}

export interface WastageItem {
  ingredient_name: string
  unit: string
  total_wastage: number
  incident_count: number
}

export interface SalesReportBundle {
  dailySales: DailySalesPoint[]
  productSales: ProductSalesItem[]
  categorySales: CategorySalesItem[]
  hourlySales: HourlySalesPoint[]
}

export interface FinanceReportBundle {
  dailySales: DailySalesPoint[]
  paymentStats: PaymentMethodStat[]
  discountStats: DiscountStats
}

export interface InventoryReportBundle {
  stockStatus: StockStatusItem[]
  stockMovements: StockMovementItem[]
  wastage: WastageItem[]
}

export interface ReportCategoryPreviewItem {
  label: string
  value: string
}

export type ReportCategoryStatus = 'active' | 'planned'

export interface ReportKpiItem {
  label: string
  value: string
  accentClassName?: string
}

export const DEFAULT_AUDIT_PAGE_SIZE_OPTIONS = [25, 50, 100] as const

export const REPORT_STATUS_LABELS: Record<ReportCategoryStatus, string> = {
  active: 'Aktif',
  planned: 'Planlandı',
}
