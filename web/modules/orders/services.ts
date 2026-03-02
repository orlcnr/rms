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
} from './types'

export interface GetOrdersQueryParams extends GetOrdersParams {
  restaurantId: string
}

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

export const ordersApi = {
  /**
   * Get all orders with optional filters
   * GET /orders
   */
  getOrders: async (
    params: GetOrdersQueryParams,
    options?: GetOrdersOptions,
  ) => {
    const { restaurantId, ...queryParams } = params
    return http.get<PaginatedOrdersResponse>(`/orders`, {
      params: {
        restaurantId,
        ...queryParams,
      },
      ...options,
    })
  },

  /**
   * Get single order by ID
   * GET /orders/:id
   */
  getOrderById: async (id: string) => {
    return http.get<Order>(`/orders/${id}`)
  },

  /**
   * Create new order
   * POST /orders
   */
  createOrder: async (data: CreateOrderInput) => {
    return http.post<Order>('/orders', data)
  },

  /**
   * Update order status
   * PATCH /orders/:id/status
   */
  updateOrderStatus: async (id: string, data: UpdateOrderStatusInput) => {
    return http.patch<Order>(`/orders/${id}/status`, data)
  },

  /**
   * Batch update order statuses — single request for multiple orders (avoids N requests)
   * PATCH /orders/batch-status
   */
  batchUpdateOrderStatus: async (orderIds: string[], status: string, transactionId?: string) => {
    return http.patch<Order[]>('/orders/batch-status', {
      order_ids: orderIds,
      status,
      transaction_id: transactionId
    })
  },


  /**
   * Update order items
   * PATCH /orders/:id/items
   */
  updateOrderItems: async (id: string, data: UpdateOrderItemsInput) => {
    return http.patch<Order>(`/orders/${id}/items`, data)
  },

  /**
   * Move order to different table
   * PATCH /orders/:id/move-to-table
   */
  moveOrderToTable: async (id: string, tableId: string) => {
    return http.patch<Order>(`/orders/${id}/move-to-table`, { tableId })
  },

  /**
   * Cancel order
   * PATCH /orders/:id/status (status: cancelled)
   */
  cancelOrder: async (id: string) => {
    return http.patch<Order>(`/orders/${id}/status`, {
      status: OrderStatus.CANCELLED,
    })
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
