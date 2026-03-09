'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/modules/shared/components/Button'
import { Modal } from '@/modules/shared/components/Modal'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { paymentService } from '../services/payment.service'
import type { Payment } from '../types'
import { getPaymentErrorMessage } from '../utils/get-payment-error-message'
import { getPaymentMethodLabel, PaymentMethod } from '@/modules/orders/types'
import { formatPaymentDateTime } from '../utils/format-payment-datetime'

interface RefundConfirmModalProps {
  payment: Payment | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (paymentId: string) => Promise<void> | void
}

const REFUND_METHOD_OPTIONS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
  PaymentMethod.DIGITAL_WALLET,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.MEAL_VOUCHER,
]

export function RefundConfirmModal({
  payment,
  isOpen,
  onClose,
  onSuccess,
}: RefundConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCashLink, setShowCashLink] = useState(false)
  const [reason, setReason] = useState('MANUEL İADE')
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>(PaymentMethod.CASH)

  const isOpenAccountOriginal = payment?.payment_method === PaymentMethod.OPEN_ACCOUNT
  const isDifferentMethod = payment && refundMethod !== payment.payment_method

  useEffect(() => {
    if (payment) {
      setRefundMethod(payment.payment_method)
      setReason('MANUEL İADE')
    }
  }, [payment])

  const handleConfirm = async () => {
    if (!payment) return
    setIsSubmitting(true)
    setShowCashLink(false)
    try {
      await paymentService.revertPayment({
        payment_id: payment.id,
        reason: reason.trim() || 'MANUEL İADE',
        refund_method: refundMethod,
      })
      toast.success('Ödeme iade edildi')
      await onSuccess(payment.id)
      onClose()
    } catch (error: any) {
      const codeOrMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.message
      const message = getPaymentErrorMessage(codeOrMessage)
      if (codeOrMessage === 'CASH_NO_ACTIVE_SESSION') {
        setShowCashLink(true)
      }
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="İADE ONAYI" maxWidth="max-w-md">
      {!payment ? null : (
        <div className="space-y-4">
          <div className="rounded-sm border border-border-light bg-bg-app p-3 text-xs space-y-1">
            <p className="font-black text-text-primary">
              Sipariş: {payment.order_number || `#${payment.order_id.slice(0, 8)}`}
            </p>
            <p className="font-bold text-text-secondary">Masa: {payment.table_name || '-'}</p>
            <p className="font-bold text-text-secondary">
              Tutar: {formatCurrency(payment.final_amount)}
            </p>
            <p className="font-bold text-text-secondary">
              Orijinal Yöntem: {getPaymentMethodLabel(payment.payment_method)}
            </p>
            <p className="font-bold text-text-secondary">
              Tarih: {formatPaymentDateTime(payment.created_at)}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
              İade Yöntemi
            </label>
            <select
              value={refundMethod}
              onChange={(event) => setRefundMethod(event.target.value as PaymentMethod)}
              className="h-11 w-full border border-border-light rounded-sm bg-bg-surface px-3 text-[11px] font-black uppercase tracking-wider text-text-primary"
            >
              {REFUND_METHOD_OPTIONS.map((method) => (
                <option key={method} value={method}>
                  {getPaymentMethodLabel(method)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
              İade Notu
            </label>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-11 w-full border border-border-light rounded-sm bg-bg-surface px-3 text-[11px] font-bold text-text-primary"
              placeholder="İade nedeni yazın"
            />
          </div>

          {isOpenAccountOriginal && isDifferentMethod ? (
            <div className="rounded-sm border border-info-main/30 bg-info-main/5 p-3 text-xs text-info-main font-bold">
              Açık hesap ödemesi farklı yöntemle iade edilecek. Müşteri borcu düşürülecektir.
            </div>
          ) : null}

          {showCashLink ? (
            <div className="rounded-sm border border-warning-main/30 bg-warning-subtle/20 p-3 text-xs text-warning-main font-bold">
              İade için açık kasa oturumu gerekli.
              <Link href="/cash" className="ml-1 underline">
                Kasa ekranına git
              </Link>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              VAZGEÇ
            </Button>
            <Button variant="danger" onClick={handleConfirm} isLoading={isSubmitting}>
              İADE ET
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
