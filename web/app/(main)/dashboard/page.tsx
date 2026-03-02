import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import DashboardClient from '@/modules/dashboard/components/DashboardClient'

export default async function DashboardPage() {
    const { restaurantId } = await getRestaurantContext()

    if (!restaurantId) {
        throw new Error('Restaurant not found')
    }

    return <DashboardClient restaurantId={restaurantId} />
}
