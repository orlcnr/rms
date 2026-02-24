import { BaseEntity } from '@/modules/shared/types'
import { PaymentMethod, PaymentStatus } from '@/modules/orders/types'

export interface Payment extends BaseEntity {
    restaurant_id: string
    order_id: string
    amount: number
    method: PaymentMethod
    status: PaymentStatus
    transaction_id?: string
    notes?: string
}

export interface CreatePaymentInput {
    order_id: string
    amount: number
    method: PaymentMethod
    discount_amount?: number
    notes?: string
}
