// ============================================
// RESERVATIONS PAGE
// Server Component - Data fetching
// ============================================

import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { reservationsApi } from '@/modules/reservations/services/reservations.service'
import { ReservationClient } from '@/modules/reservations/components/ReservationClient'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Reservations Page
 * Server Component - Initial data fetching
 */
export default async function ReservationsPage() {
  const { restaurantId, user } = await getRestaurantContext()

  if (!restaurantId) {
    return null
  }

  // Fetch initial reservations for today (Istanbul time)
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul'
  }).format(new Date());
  const initialReservations = await reservationsApi.getAll({
    date: today,
  })

  return (
    <ReservationClient
      restaurantId={restaurantId}
      userId={user.id}
      initialReservations={initialReservations}
    />
  )
}
