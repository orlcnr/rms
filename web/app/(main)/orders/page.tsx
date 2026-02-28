// ============================================
// ORDERS KANBAN BOARD PAGE
// Server Component - Data fetching ve server-side grouping
// ============================================

import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { ordersApi } from '@/modules/orders/services'
import { groupOrdersByTableAndStatus } from '@/modules/orders/utils/order-group'
import { OrdersBoardClient } from '@/modules/orders/components'
import { OrderType } from '@/modules/orders/types'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Orders Kanban Board Page
 */
export default async function OrdersPage() {
  console.log('=== ORDERS PAGE SERVER START ===')

  const { restaurantId, user } = await getRestaurantContext()

  console.log('=== RESTAURANT ID:', restaurantId, '===')

  if (!restaurantId) {
    throw new Error('Restaurant not found')
  }

  // Use ordersApi like other pages
  const todayOrdersResponse = await ordersApi.getOrders({
    restaurantId,
    limit: 100,
    type: OrderType.DINE_IN,
  })

  // Backend might return Order[] or { items: [] } - handle both
  const allOrders = todayOrdersResponse?.items || todayOrdersResponse as any || []

  // Filter: Support active orders from any time + completed orders from ONLY today
  const now = new Date()
  const todayStart = new Date(now.setHours(0, 0, 0, 0))

  const relevantOrders = allOrders.filter((order: any) => {
    const status = order.status
    const isCompleted = status === 'paid' || status === 'cancelled'

    if (!isCompleted) return true // Show all active orders

    // For completed matches, check if it's from today
    const createdAt = new Date(order.createdAt || order.created_at)
    return createdAt >= todayStart
  })

  console.log('=== RELEVANT ORDERS:', relevantOrders.length)

  const ordersByStatus = groupOrdersByTableAndStatus(relevantOrders)

  return (
    <OrdersBoardClient
      restaurantId={restaurantId}
      userId={user.id}
      initialOrdersByStatus={ordersByStatus}
    />
  )
}
