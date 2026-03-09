// ============================================
// ORDERS MODULE SERVICE
// API Endpoints: backend/src/modules/orders/orders.controller.ts
// ============================================

import { http } from '@/modules/shared/api/http'
import {
  Order,
  OrderStatus,
  OrderType,
  CreateOrderInput,
  UpdateOrderStatusInput,
  UpdateOrderItemsInput,
  GetOrdersParams,
  PaginatedOrdersResponse,
  BatchUpdateOrderStatusResponse,
} from './types'

export interface GetOrdersOptions {
  cache?: RequestCache
  next?: NextFetchRequestConfig
}

export const ORDERS_CACHE_TAGS = {
  ALL: 'orders',
  BOARD: 'orders-board',
  BY_STATUS: (status: string) => `orders-${status}`,
  BY_TABLE: (tableId: string) => `orders-table-${tableId}`,
} as const

type RawOrderItemDto = {
  id?: string
  order_id?: string
  orderId?: string
  menu_item_id?: string
  menuItemId?: string
  menu_item?: {
    id?: string
    name?: string
    price?: number | string
    image_url?: string
    imageUrl?: string
  }
  menuItem?: {
    id?: string
    name?: string
    price?: number | string
    image_url?: string
    imageUrl?: string
  }
  menu_item_name?: string
  name?: string
  quantity?: number | string
  unit_price?: number | string
  unit_price_locked?: number | string | null
  unitPrice?: number | string
  subtotal?: number | string
  total_price?: number | string
  totalPrice?: number | string
  status?: OrderStatus
  notes?: string
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
}

type RawOrderDto = {
  id?: string
  restaurant_id?: string
  restaurantId?: string
  table_id?: string | null
  tableId?: string | null
  table?: { id?: string; name?: string; area?: string }
  user_id?: string | null
  userId?: string | null
  user?: { id?: string; name?: string }
  customer_id?: string | null
  customerId?: string | null
  customer?: {
    id?: string
    first_name?: string
    last_name?: string
    name?: string
    phone?: string
    total_debt?: number
    current_debt?: number
    credit_limit?: number
    credit_limit_enabled?: boolean
  }
  type?: OrderType
  source?: string
  status?: OrderStatus
  total_amount?: number | string
  totalAmount?: number | string
  order_number?: string | null
  orderNumber?: string | null
  notes?: string | null
  items?: RawOrderItemDto[]
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
}

type RawPaginatedOrderListDto = {
  items?: unknown
  meta?: Partial<PaginatedOrdersResponse['meta']>
}

type RawBatchUpdateStatusDto = {
  updated?: unknown
  failed?: Array<{ order_id?: string; code?: string; message?: string }>
  isPartial?: boolean
  is_partial?: boolean
}

const DEFAULT_META: PaginatedOrdersResponse['meta'] = {
  totalItems: 0,
  itemCount: 0,
  itemsPerPage: 20,
  totalPages: 0,
  currentPage: 1,
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function toCsvParam<T extends string>(value?: T | T[] | string): string | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(',')
  }
  return value
}

function parseOrderItemDto(
  raw: RawOrderItemDto,
  fallbackCreatedAt: string,
): Order['items'][number] {
  const createdAt = raw.created_at || raw.createdAt || fallbackCreatedAt
  const updatedAt = raw.updated_at || raw.updatedAt || createdAt
  const menuItem = raw.menu_item || raw.menuItem
  const resolvedMenuItemId = raw.menu_item_id || raw.menuItemId || menuItem?.id || ''
  const resolvedMenuItemName = menuItem?.name || raw.menu_item_name || raw.name || 'Ürün'
  const resolvedMenuItemPrice = toNumber(menuItem?.price)
  const quantity = toNumber(raw.quantity, 1) || 1
  const directUnitPrice = toNumber(
    raw.unit_price_locked ??
      raw.unit_price ??
      raw.unitPrice ??
      menuItem?.price ??
      0,
  )
  const resolvedTotalPrice = toNumber(
    raw.subtotal ?? raw.total_price ?? raw.totalPrice ?? directUnitPrice * quantity,
  )
  const resolvedUnitPrice =
    directUnitPrice > 0
      ? directUnitPrice
      : resolvedTotalPrice > 0
        ? resolvedTotalPrice / quantity
        : 0

  return {
    id: raw.id || '',
    orderId: raw.order_id || raw.orderId || '',
    menuItemId: resolvedMenuItemId,
    menuItem: {
      id: resolvedMenuItemId,
      name: resolvedMenuItemName,
      price: resolvedMenuItemPrice,
      image_url: menuItem?.image_url || menuItem?.imageUrl,
    },
    quantity,
    unitPrice: resolvedUnitPrice,
    totalPrice: resolvedTotalPrice,
    status: (raw.status || OrderStatus.PENDING) as OrderStatus,
    notes: raw.notes,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

export function parseOrderDto(raw: RawOrderDto): Order {
  const createdAt = raw.created_at || raw.createdAt || new Date().toISOString()
  const updatedAt = raw.updated_at || raw.updatedAt || createdAt

  return {
    id: raw.id || '',
    restaurantId: raw.restaurant_id || raw.restaurantId || '',
    tableId: raw.table_id ?? raw.tableId ?? null,
    table: raw.table
      ? {
          id: raw.table.id || '',
          name: raw.table.name || '',
          area: raw.table.area,
        }
      : undefined,
    userId: raw.user_id ?? raw.userId ?? null,
    user: raw.user
      ? {
          id: raw.user.id || '',
          name: raw.user.name || '',
        }
      : undefined,
    customerId: raw.customer_id ?? raw.customerId ?? null,
    customer: raw.customer
      ? {
          ...raw.customer,
          id: raw.customer.id || '',
        }
      : undefined,
    type: (raw.type || OrderType.DINE_IN) as OrderType,
    source: (raw.source || 'internal') as Order['source'],
    status: (raw.status || OrderStatus.PENDING) as OrderStatus,
    totalAmount: toNumber(raw.total_amount ?? raw.totalAmount),
    orderNumber: toOptionalString(raw.order_number ?? raw.orderNumber),
    notes: raw.notes ?? null,
    items: Array.isArray(raw.items)
      ? raw.items.map((item) => parseOrderItemDto(item, createdAt))
      : [],
    createdAt,
    updatedAt,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

export function parseOrderListDto(raw: RawPaginatedOrderListDto): PaginatedOrdersResponse {
  const items = Array.isArray(raw?.items)
    ? raw.items.map((item) => parseOrderDto(item as RawOrderDto))
    : []

  const rawMeta = raw?.meta
  const meta: PaginatedOrdersResponse['meta'] = rawMeta
    ? {
        totalItems: toNumber(rawMeta.totalItems, DEFAULT_META.totalItems),
        itemCount: toNumber(rawMeta.itemCount, items.length),
        itemsPerPage: toNumber(rawMeta.itemsPerPage, DEFAULT_META.itemsPerPage),
        totalPages: toNumber(rawMeta.totalPages, DEFAULT_META.totalPages),
        currentPage: toNumber(rawMeta.currentPage, DEFAULT_META.currentPage),
      }
    : {
        ...DEFAULT_META,
        itemCount: items.length,
      }

  return { items, meta }
}

export function parseBatchStatusDto(
  raw: RawBatchUpdateStatusDto,
): BatchUpdateOrderStatusResponse {
  const updated = Array.isArray(raw?.updated)
    ? raw.updated.map((item) => parseOrderDto(item as RawOrderDto))
    : []
  const failed = Array.isArray(raw?.failed)
    ? raw.failed.map((item) => ({
        order_id: item.order_id || '',
        code: item.code || 'ORDER_BAD_REQUEST',
        message: item.message || 'İşlem tamamlanamadı',
      }))
    : []

  const failedCount = failed.length
  const updatedCount = updated.length
  const normalizedIsPartial = failedCount > 0 && updatedCount > 0
  const originalIsPartial = Boolean(raw?.isPartial ?? raw?.is_partial ?? false)

  if (originalIsPartial !== normalizedIsPartial) {
    console.warn({
      event: 'orders.batch_status.partial_normalized',
      originalIsPartial,
      normalizedIsPartial,
      failedCount,
      updatedCount,
    })
  }

  return {
    updated,
    failed,
    isPartial: normalizedIsPartial,
  }
}

export const ordersApi = {
  /**
   * Get all orders with optional filters
   * GET /orders
   */
  getOrders: async (
    params: GetOrdersParams,
    options?: GetOrdersOptions,
  ) => {
    const { status, type, ...rest } = params
    const raw = await http.get<RawPaginatedOrderListDto>(`/orders`, {
      params: {
        ...rest,
        status: toCsvParam(status),
        type: toCsvParam(type),
      },
      ...options,
    })
    return parseOrderListDto(raw)
  },

  /**
   * Get single order by ID
   * GET /orders/:id
   */
  getOrderById: async (id: string) => {
    const raw = await http.get<RawOrderDto>(`/orders/${id}`)
    return parseOrderDto(raw)
  },

  /**
   * Create new order
   * POST /orders
   */
  createOrder: async (data: CreateOrderInput) => {
    const raw = await http.post<RawOrderDto>('/orders', data)
    return parseOrderDto(raw)
  },

  /**
   * Update order status
   * PATCH /orders/:id/status
   */
  updateOrderStatus: async (id: string, data: UpdateOrderStatusInput) => {
    const raw = await http.patch<RawOrderDto>(`/orders/${id}/status`, data)
    return parseOrderDto(raw)
  },

  /**
   * Batch update order statuses — single request for multiple orders (avoids N requests)
   * PATCH /orders/batch-status
   */
  batchUpdateOrderStatus: async (
    orderIds: string[],
    status: string,
    transactionId?: string,
  ) => {
    const raw = await http.patch<RawBatchUpdateStatusDto>('/orders/batch-status', {
      order_ids: orderIds,
      status,
      transaction_id: transactionId,
    })
    return parseBatchStatusDto(raw)
  },


  /**
   * Update order items
   * PATCH /orders/:id/items
   */
  updateOrderItems: async (id: string, data: UpdateOrderItemsInput) => {
    const raw = await http.patch<RawOrderDto>(`/orders/${id}/items`, data)
    return parseOrderDto(raw)
  },

  /**
   * Move order to different table
   * PATCH /orders/:id/move-to-table
   */
  moveOrderToTable: async (
    id: string,
    payload: {
      new_table_id: string
      on_target_occupied?: 'reject' | 'merge'
    },
  ) => {
    const raw = await http.patch<RawOrderDto>(`/orders/${id}/move-to-table`, payload)
    return parseOrderDto(raw)
  },

  /**
   * Cancel order
   * PATCH /orders/:id/status (status: cancelled)
   */
  cancelOrder: async (id: string) => {
    const raw = await http.patch<RawOrderDto>(`/orders/${id}/status`, {
      status: OrderStatus.CANCELLED,
    })
    return parseOrderDto(raw)
  },

  /**
   * Delete order (soft delete)
   * DELETE /orders/:id
   */
  deleteOrder: async (id: string) => {
    return http.delete<void>(`/orders/${id}`)
  },
}

// ============================================
// ORDER STATUS HELPERS
// ============================================

/**
 * Can change order status to given status
 */
export function canChangeStatus(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
  if (currentStatus === newStatus) return true
  if (
    currentStatus === OrderStatus.PAID ||
    currentStatus === OrderStatus.CANCELLED
  ) {
    return false
  }
  return true
}

/**
 * Get next possible status options
 */
export function getNextStatusOptions(currentStatus: OrderStatus): OrderStatus[] {
  if (
    currentStatus === OrderStatus.PAID ||
    currentStatus === OrderStatus.CANCELLED
  ) {
    return []
  }
  return Object.values(OrderStatus).filter((status) => status !== currentStatus)
}

/**
 * Is order editable
 */
export function isOrderEditable(status: OrderStatus): boolean {
  return [
    OrderStatus.PENDING,
    OrderStatus.PREPARING,
    OrderStatus.READY,
  ].includes(status)
}

/**
 * Is order cancellable
 */
export function isOrderCancellable(status: OrderStatus): boolean {
  return [
    OrderStatus.PENDING,
    OrderStatus.PREPARING,
    OrderStatus.READY,
  ].includes(status)
}
