'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/modules/shared/components/Button'
import { Order } from '../types'
import { PaymentModal } from './PaymentModal'

interface OrderPaymentClientProps {
  order: Order
  closePath: string
  isTerminal: boolean
}

export function OrderPaymentClient({
  order,
  closePath,
  isTerminal,
}: OrderPaymentClientProps) {
  const router = useRouter()

  if (isTerminal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-app p-6">
        <div className="w-full max-w-md rounded-sm border border-border-light bg-bg-surface p-6">
          <h1 className="text-lg font-black text-text-primary">
            Bu sipariş için ödeme kapalı
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Sipariş durumu: <span className="font-bold">{order.status}</span>
          </p>
          <Button
            className="mt-4 w-full"
            variant="primary"
            onClick={() => router.push(closePath)}
          >
            Geri Dön
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-app">
      <PaymentModal
        isOpen
        onClose={() => router.push(closePath)}
        orderId={order.id}
        orderTotal={order.totalAmount}
        restaurantId={order.restaurantId}
        successRedirectPath={closePath}
      />
    </div>
  )
}
