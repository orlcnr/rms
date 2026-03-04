// ============================================
// ORDERS KANBAN BOARD PAGE
// Server Component - Data fetching ve server-side grouping
// ============================================

import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { guestStaffApi } from '@/modules/guest/service'
import { ordersApi } from '@/modules/orders/services'
import { groupOrdersByTableAndStatus } from '@/modules/orders/utils/order-group'
import { OrdersBoardClient } from '@/modules/orders/components'
import { OrderStatus, OrderType } from '@/modules/orders/types'

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
    status: [
      OrderStatus.PENDING,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.SERVED,
    ].join(',') as any,
  })

  // Backend might return Order[] or { items: [] } - handle both
  const allOrders = todayOrdersResponse?.items || todayOrdersResponse as any || []
  console.log('=== ACTIVE ORDERS:', allOrders.length)
  const ordersByStatus = groupOrdersByTableAndStatus(allOrders)
  let pendingGuestApprovalsCount = 0

  try {
    const pendingGuestApprovals =
      await guestStaffApi.getPendingApprovals(restaurantId)
    pendingGuestApprovalsCount = pendingGuestApprovals.length
  } catch (error) {
    console.error(
      '[OrdersPage] Failed to load pending guest approvals count:',
      error,
    )
  }

  return (
    <OrdersBoardClient
      restaurantId={restaurantId}
      userId={user.id}
      initialOrdersByStatus={ordersByStatus}
      initialPendingGuestApprovalsCount={pendingGuestApprovalsCount}
    />
  )
}
