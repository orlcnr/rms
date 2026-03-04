import { ReportsHubClient } from '@/modules/reports/components/ReportsHubClient'
import { getRestaurantContext } from '@/modules/auth/server/getServerUser'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ReportsPage() {
  const { restaurantId } = await getRestaurantContext()

  if (!restaurantId) {
    return null
  }

  return <ReportsHubClient />
}
