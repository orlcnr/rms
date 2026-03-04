// ============================================
// CASH MODULE - PAGE (Server Component)
// ============================================

import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { cashApi } from '@/modules/cash/services'
import CashClient from './_components/CashClient'

export default async function CashPage() {
  const { restaurantId } = await getRestaurantContext()

  if (!restaurantId) {
    throw new Error('Restaurant not found')
  }

  // Server-side data fetching
  const [registersWithStatus, activeSessions] = await Promise.all([
    cashApi.getRegistersWithStatus(),
    cashApi.getActiveSessions(),
  ])

  return (
    <CashClient
      restaurantId={restaurantId}
      initialRegisters={registersWithStatus}
      initialSessions={activeSessions}
    />
  )
}
