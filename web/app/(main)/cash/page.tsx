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

  // Get session summary if there's an active session
  let summary = null
  if (activeSessions.length > 0) {
    try {
      summary = await cashApi.getSessionSummary(activeSessions[0].session.id)
    } catch {
      // Session might have been closed
      summary = null
    }
  }

  return (
    <CashClient
      restaurantId={restaurantId}
      initialRegisters={registersWithStatus}
      initialSessions={activeSessions}
      initialSummary={summary}
    />
  )
}
