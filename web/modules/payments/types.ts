import { BaseEntity, PaginatedResponse } from '@/modules/shared/types'
import { PaymentMethod, PaymentStatus } from '@/modules/orders/types'

export interface Payment extends BaseEntity {
  restaurant_id: string
  order_id: string
  order_number: string | null
  table_name: string | null
  customer_id: string | null
  amount: number
  final_amount: number
  payment_method: PaymentMethod
  status: PaymentStatus
  transaction_id: string | null
  description: string | null
  discount_type: string | null
  discount_amount: number
  tip_amount: number | null
  commission_rate: number | null
  net_tip_amount: number | null
}

export interface PaymentListFilters {
  page?: number
  limit?: number
  search?: string
  method?: PaymentMethod
  status?: PaymentStatus
  startDate?: string
  endDate?: string
  orderId?: string
}

export interface RevertPaymentInput {
  payment_id: string
  reason: string
  refund_method?: PaymentMethod
}

export type PaymentsPaginatedResponse = PaginatedResponse<Payment>
