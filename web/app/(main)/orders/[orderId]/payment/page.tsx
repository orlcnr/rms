import { notFound } from 'next/navigation'
import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { ordersApi } from '@/modules/orders/services'
import { OrderStatus } from '@/modules/orders/types'
import { OrderPaymentClient } from '@/modules/orders/components/OrderPaymentClient'

interface PaymentPageProps {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ source?: string }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OrderPaymentPage({
  params,
  searchParams,
}: PaymentPageProps) {
  const { restaurantId } = await getRestaurantContext()
  const { orderId } = await params
  const { source } = await searchParams

  if (!restaurantId) {
    throw new Error('Restaurant not found')
  }

  const order = await ordersApi.getOrderById(orderId).catch(() => null)
  if (!order) {
    notFound()
  }

  const closePath =
    source === 'counter'
      ? '/orders/counter'
      : source === 'delivery'
        ? '/orders/delivery'
        : '/orders'
  const isTerminal =
    order.status === OrderStatus.PAID || order.status === OrderStatus.CANCELLED

  return (
    <OrderPaymentClient
      order={order}
      closePath={closePath}
      isTerminal={isTerminal}
    />
  )
}
