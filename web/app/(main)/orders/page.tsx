import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { ordersApi } from '@/modules/orders/services'
import {
  DeliveryStatus,
  OrderStatus,
  OrderType,
} from '@/modules/orders/types'
import { reportsService } from '@/modules/reports/service'
import { OrdersLauncherClient } from '@/modules/orders/components/OrdersLauncherClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getTodayInIstanbul() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
  }).format(new Date())
}

export default async function OrdersLauncherPage() {
  const { restaurantId } = await getRestaurantContext()

  if (!restaurantId) {
    throw new Error('Restaurant not found')
  }

  const today = getTodayInIstanbul()

  const [dineInResponse, deliveryResponse, salesDaily] = await Promise.all([
    ordersApi.getOrders({
      page: 1,
      limit: 100,
      type: OrderType.DINE_IN,
      status: [
        OrderStatus.PENDING,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.SERVED,
      ],
    }),
    ordersApi.getOrders({
      page: 1,
      limit: 100,
      type: OrderType.DELIVERY,
      status: [
        OrderStatus.PENDING,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.ON_WAY,
      ],
    }),
    reportsService.getSalesDaily({
      startDate: today,
      endDate: today,
    }),
  ])

  const deliveryActiveCount = deliveryResponse.items.filter((order) => {
    const deliveryStatus = order.delivery_status
    return (
      deliveryStatus !== DeliveryStatus.DELIVERED &&
      deliveryStatus !== DeliveryStatus.CANCELLED
    )
  }).length

  const activeTableCount = new Set(
    dineInResponse.items
      .map((order) => order.tableId || order.table?.id || order.table?.name || null)
      .filter((value): value is string => Boolean(value)),
  ).size

  const todayOrderCount = salesDaily.reduce(
    (sum, item) => sum + Number(item.order_count || 0),
    0,
  )
  const todayRevenue = salesDaily.reduce(
    (sum, item) => sum + Number(item.total_revenue || 0),
    0,
  )

  const summaryDateLabel = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  })

  return (
    <OrdersLauncherClient
      restaurantId={restaurantId}
      summaryDateLabel={summaryDateLabel}
      tableActiveCount={activeTableCount}
      deliveryActiveCount={deliveryActiveCount}
      todayOrderCount={todayOrderCount}
      todayRevenue={todayRevenue}
    />
  )
}
