import { PaymentStatus } from '@/modules/orders/types'

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'Beklemede',
  [PaymentStatus.COMPLETED]: 'Ödendi',
  [PaymentStatus.FAILED]: 'Başarısız',
  [PaymentStatus.REFUNDED]: 'İade',
  [PaymentStatus.CANCELLED]: 'İptal',
}

export function getPaymentStatusLabel(status: PaymentStatus | string): string {
  return PAYMENT_STATUS_LABELS[status as PaymentStatus] || status
}

