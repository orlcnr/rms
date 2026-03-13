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
export default async function OrdersBoardPage() {
  console.log('=== ORDERS BOARD PAGE SERVER START ===')

  const { restaurantId, user } = await getRestaurantContext()

  if (!restaurantId) {
    throw new Error('Restaurant not found')
  }

  const todayOrdersResponse = await ordersApi.getOrders({
    limit: 100,
    type: OrderType.DINE_IN,
    status: [
      OrderStatus.PENDING,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.SERVED,
    ],
  })

  const allOrders = todayOrdersResponse.items
  const ordersByStatus = groupOrdersByTableAndStatus(allOrders)
  let pendingGuestApprovalsCount = 0

  try {
    const pendingGuestApprovals =
      await guestStaffApi.getPendingApprovals(restaurantId)
    pendingGuestApprovalsCount = pendingGuestApprovals.length
  } catch (error) {
    console.error(
      '[OrdersBoardPage] Failed to load pending guest approvals count:',
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
