'use client'

import { Button } from '@/modules/shared/components/Button'
import { getPaymentMethodLabel, PaymentStatus } from '@/modules/orders/types'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import type { Payment } from '../types'
import { formatPaymentDateTime } from '../utils/format-payment-datetime'
import { getPaymentStatusLabel } from '../utils/get-payment-status-label'

interface PaymentCardProps {
  payment: Payment | null
  onRefund: (payment: Payment) => void
}

export function PaymentCard({ payment, onRefund }: PaymentCardProps) {
  if (!payment) {
    return (
      <div className="h-full border border-border-light rounded-sm bg-bg-app/50 p-4 flex items-center justify-center text-xs font-bold text-text-muted uppercase tracking-wider">
        Ödeme detayı seçin
      </div>
    )
  }

  const isRefunded = payment.status === PaymentStatus.REFUNDED

  return (
    <div className="h-full border border-border-light rounded-sm bg-bg-surface p-4 flex flex-col gap-4">
      <div className="border-b border-border-light pb-3">
        <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">
          Sipariş #{payment.order_id.slice(0, 8)}
        </p>
        <p className="mt-1 text-sm font-black text-text-primary uppercase tracking-wide">
          {getPaymentMethodLabel(payment.payment_method)}
        </p>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-text-muted uppercase tracking-wider">Tutar</span>
          <span className="font-mono font-black text-text-primary">{formatCurrency(payment.final_amount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold text-text-muted uppercase tracking-wider">Tarih</span>
          <span className="font-bold text-text-primary">
            {formatPaymentDateTime(payment.created_at)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold text-text-muted uppercase tracking-wider">Durum</span>
          <span className="font-black text-text-primary uppercase tracking-wider">
            {getPaymentStatusLabel(payment.status)}
          </span>
        </div>
      </div>

      {payment.description ? (
        <div className="rounded-sm bg-bg-app border border-border-light p-3 text-xs text-text-secondary">
          {payment.description}
        </div>
      ) : null}

      <div className="mt-auto">
        <Button
          variant="danger"
          className="w-full"
          disabled={isRefunded}
          onClick={() => onRefund(payment)}
        >
          {isRefunded ? 'İADE EDİLDİ' : 'İADE ET'}
        </Button>
      </div>
    </div>
  )
}
