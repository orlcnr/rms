import { http } from '@/modules/shared/api/http';
import { PaymentMethod, DiscountType, Payment, SplitPaymentRequest, RevertPaymentRequest } from '../types';

// Type for the response from split payment
export interface SplitPaymentResponse {
  payments: Payment[];
  change: number;
}

// Type for order payment history
export interface OrderPaymentHistory {
  data: Payment[];
  total: number;
}

// API Service for Payments
export const paymentsApi = {
  /**
   * Get all payments for an order
   */
  getByOrder: async (orderId: string): Promise<Payment[]> => {
    return http.get(`/payments/orders/${orderId}`);
  },

  /**
   * Process a single payment
   */
  create: async (data: {
    order_id: string;
    amount: number;
    payment_method: PaymentMethod;
    transaction_id?: string;
    discount_amount?: number;
    discount_type?: string;
    description?: string;
  }): Promise<Payment> => {
    return http.post('/payments', data);
  },

  /**
   * Process split payment (multiple payment methods)
   * This is the main method for the new checkout flow
   */
  createSplitPayment: async (data: SplitPaymentRequest): Promise<SplitPaymentResponse> => {
    return http.post('/payments/split', data);
  },

  /**
   * Revert/refund a payment
   */
  revertPayment: async (data: RevertPaymentRequest): Promise<Payment> => {
    return http.post('/payments/revert', data);
  },

  /**
   * Get all payments (paginated)
   */
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: Payment[]; total: number; page: number; limit: number }> => {
    return http.get('/payments', { params });
  },
};
