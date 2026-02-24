import { http } from '@/modules/shared/api/http'
import { Payment, CreatePaymentInput } from '../types'

export const paymentService = {
    /**
     * Yeni ödeme oluşturur
     */
    create: async (data: CreatePaymentInput): Promise<Payment> => {
        return http.post<Payment>('/payments', data)
    },

    /**
     * Siparişe ait ödemeleri getirir
     */
    getByOrderId: async (orderId: string): Promise<Payment[]> => {
        return http.get<Payment[]>(`/payments/orders/${orderId}`)
    }
}
