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
export default async function ReservationsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const { restaurantId, user } = await getRestaurantContext()

  if (!restaurantId) {
    return null
  }

  const resolvedSearchParams = searchParams || {}
  const dateParamRaw = resolvedSearchParams.date
  const tableIdParamRaw = resolvedSearchParams.tableId
  const dateParam =
    typeof dateParamRaw === 'string' && dateParamRaw.trim().length > 0
      ? dateParamRaw
      : null
  const focusTableId =
    typeof tableIdParamRaw === 'string' && tableIdParamRaw.trim().length > 0
      ? tableIdParamRaw
      : null

  // Fetch initial reservations for today (Istanbul time)
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul'
  }).format(new Date());
  const initialDate = dateParam || today
  const initialReservationsResponse = await reservationsApi.getAll({
    date: initialDate,
  })

  return (
    <ReservationClient
      restaurantId={restaurantId}
      userId={user.id}
      initialReservations={initialReservationsResponse.items}
      initialDate={initialDate}
      focusTableId={focusTableId || undefined}
    />
  )
}
