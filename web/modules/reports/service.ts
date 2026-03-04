import { endOfDay, startOfDay, subDays } from 'date-fns'
import { getNow } from '@/modules/shared/utils/date'
import { http } from '@/modules/shared/api/http'
import {
  AuditLogFilters,
  CategorySalesItem,
  DailySalesPoint,
  DiscountStats,
  HourlySalesPoint,
  PaginatedAuditLogs,
  PaymentMethodStat,
  ProductSalesItem,
  ReportDateRangeFilters,
  StockMovementItem,
  StockStatusItem,
  WastageItem,
} from './types'

function formatDateBoundary(dateValue: string, mode: 'start' | 'end') {
  if (!dateValue) {
    return undefined
  }

  const parsedDate = new Date(dateValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return undefined
  }

  const boundaryDate =
    mode === 'start' ? startOfDay(parsedDate) : endOfDay(parsedDate)

  return boundaryDate.toISOString()
}

function buildAuditLogsQuery(filters: AuditLogFilters) {
  return {
    page: filters.page,
    limit: filters.limit,
    start_date: formatDateBoundary(filters.startDate, 'start'),
    end_date: formatDateBoundary(filters.endDate, 'end'),
    user_name: filters.userName || undefined,
    action: filters.action || undefined,
    resource: filters.resource || undefined,
    payload_text: filters.payloadText || undefined,
  }
}

function buildAuditLogsExportQuery(filters: AuditLogFilters) {
  return {
    start_date: formatDateBoundary(filters.startDate, 'start'),
    end_date: formatDateBoundary(filters.endDate, 'end'),
    user_name: filters.userName || undefined,
    action: filters.action || undefined,
    resource: filters.resource || undefined,
    payload_text: filters.payloadText || undefined,
  }
}

function buildDateRangeQuery(filters: ReportDateRangeFilters) {
  return {
    start_date: formatDateBoundary(filters.startDate, 'start'),
    end_date: formatDateBoundary(filters.endDate, 'end'),
  }
}

function buildSingleDateQuery(date?: string) {
  return {
    date: formatDateBoundary(date || '', 'start'),
  }
}

export function getDefaultAuditLogFilters(): AuditLogFilters {
  const now = getNow()
  const startDate = subDays(now, 7)

  return {
    startDate: startDate.toLocaleDateString('sv-SE'),
    endDate: now.toLocaleDateString('sv-SE'),
    userName: '',
    action: '',
    resource: '',
    payloadText: '',
    page: 1,
    limit: 25,
  }
}

export function getDefaultReportDateRange(days = 30): ReportDateRangeFilters {
  const now = getNow()
  const startDate = subDays(now, days)

  return {
    startDate: startDate.toLocaleDateString('sv-SE'),
    endDate: now.toLocaleDateString('sv-SE'),
  }
}

export function createEmptyAuditLogsResponse(
  limit = 25,
): PaginatedAuditLogs {
  return {
    items: [],
    meta: {
      totalItems: 0,
      itemCount: 0,
      itemsPerPage: limit,
      totalPages: 0,
      currentPage: 1,
    },
  }
}

export const reportsService = {
  async getSalesDaily(filters: ReportDateRangeFilters) {
    return http.get<DailySalesPoint[]>('/reports/sales/daily', {
      params: buildDateRangeQuery(filters),
    })
  },

  async getSalesByProduct(filters: ReportDateRangeFilters) {
    return http.get<ProductSalesItem[]>('/reports/sales/by-product', {
      params: buildDateRangeQuery(filters),
    })
  },

  async getSalesByCategory(filters: ReportDateRangeFilters) {
    return http.get<CategorySalesItem[]>('/reports/sales/by-category', {
      params: buildDateRangeQuery(filters),
    })
  },

  async getSalesHourly(date?: string) {
    return http.get<HourlySalesPoint[]>('/reports/sales/hourly', {
      params: buildSingleDateQuery(date),
    })
  },

  async getFinancePayments(filters: ReportDateRangeFilters) {
    return http.get<PaymentMethodStat[]>('/reports/finance/payments', {
      params: buildDateRangeQuery(filters),
    })
  },

  async getFinanceDiscounts(filters: ReportDateRangeFilters) {
    return http.get<DiscountStats>('/reports/finance/discounts', {
      params: buildDateRangeQuery(filters),
    })
  },

  async getInventoryStatus() {
    return http.get<StockStatusItem[]>('/reports/inventory/status')
  },

  async getInventoryMovements(filters: ReportDateRangeFilters) {
    return http.get<StockMovementItem[]>('/reports/inventory/movements', {
      params: buildDateRangeQuery(filters),
    })
  },

  async getInventoryWastage(filters: ReportDateRangeFilters) {
    return http.get<WastageItem[]>('/reports/inventory/wastage', {
      params: buildDateRangeQuery(filters),
    })
  },

  async getAuditLogs(filters: AuditLogFilters) {
    return http.get<PaginatedAuditLogs>('/reports/audit-logs', {
      params: buildAuditLogsQuery(filters),
    })
  },

  async exportAuditLogsCsv(filters: AuditLogFilters) {
    return http.download('/reports/audit-logs/export', {
      params: buildAuditLogsExportQuery(filters),
    })
  },
}
