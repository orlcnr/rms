import {
  paymentsApi as canonicalPaymentsApi,
} from '@/modules/orders/services/payments.service'
import {
  PaymentMethod,
  PaymentStatus,
  type SplitPaymentRequest,
  type RevertPaymentRequest,
} from '@/modules/orders/types'
import type {
  Payment,
  PaymentListFilters,
  PaymentsPaginatedResponse,
} from '../types'

type LocalSplitPaymentResponse = {
  payments: Payment[]
  change: number
}

function toPayment(row: any): Payment {
  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    restaurant_id: row.restaurant_id,
    order_id: row.order_id,
    order_number: row.order_number ?? null,
    table_name: row.table_name ?? null,
    customer_id: row.customer_id ?? null,
    amount: Number(row.amount || 0),
    final_amount: Number(row.final_amount || 0),
    payment_method: row.payment_method as PaymentMethod,
    status: row.status as PaymentStatus,
    transaction_id: row.transaction_id ?? null,
    description: row.description ?? null,
    discount_type: row.discount_type ?? null,
    discount_amount: Number(row.discount_amount || 0),
    tip_amount: row.tip_amount != null ? Number(row.tip_amount) : null,
    commission_rate:
      row.commission_rate != null ? Number(row.commission_rate) : null,
    net_tip_amount:
      row.net_tip_amount != null ? Number(row.net_tip_amount) : null,
  }
}

export const paymentService = {
  getByOrderId: async (orderId: string): Promise<Payment[]> => {
    const rows = await canonicalPaymentsApi.getByOrder(orderId)
    return rows.map(toPayment)
  },

  create: async (data: {
    order_id: string
    amount: number
    payment_method: PaymentMethod
    transaction_id?: string
    discount_amount?: number
    discount_type?: string
    description?: string
  }): Promise<Payment> => {
    const row = await canonicalPaymentsApi.create(data)
    return toPayment(row)
  },

  createSplitPayment: async (
    data: SplitPaymentRequest,
  ): Promise<LocalSplitPaymentResponse> => {
    const result = await canonicalPaymentsApi.createSplitPayment(data)
    return {
      payments: result.payments.map(toPayment),
      change: result.change,
    }
  },

  revertPayment: async (data: RevertPaymentRequest): Promise<Payment> => {
    const row = await canonicalPaymentsApi.revertPayment(data)
    return toPayment(row)
  },

  getAll: async (
    filters?: PaymentListFilters,
  ): Promise<PaymentsPaginatedResponse> => {
    const response = await canonicalPaymentsApi.getAll(filters)
    return {
      items: response.items.map(toPayment),
      meta: {
        totalItems: response.meta.totalItems,
        itemCount: response.meta.itemCount,
        itemsPerPage: response.meta.limit,
        totalPages: response.meta.totalPages,
        currentPage: response.meta.page,
      },
    }
  },
}
