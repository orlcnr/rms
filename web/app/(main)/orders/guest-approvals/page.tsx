import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { GuestApprovalsClient } from '@/modules/guest/components/GuestApprovalsClient'
import { guestStaffApi } from '@/modules/guest/service'
import { PendingGuestApprovalItem } from '@/modules/guest/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GuestApprovalsPage() {
  const { restaurantId } = await getRestaurantContext()

  if (!restaurantId) {
    return null
  }

  let initialItems: PendingGuestApprovalItem[] = []

  try {
    initialItems = await guestStaffApi.getPendingApprovals(restaurantId)
  } catch (error) {
    console.error('[GuestApprovalsPage] Failed to load pending approvals:', error)
  }

  return (
    <GuestApprovalsClient
      restaurantId={restaurantId}
      initialItems={initialItems}
    />
  )
}
