import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { tablesApi } from '@/modules/tables/services/tables.service'
import { TablesClient } from '@/modules/tables/components/TablesClient'

export default async function TablesPage() {
    const { restaurantId } = await getRestaurantContext()

    if (!restaurantId) {
        return null
    }

    // Fetch initial data in parallel from backend
    const [areas, tables] = await Promise.all([
        tablesApi.getAreas(restaurantId),
        tablesApi.getTables(restaurantId)
    ])

    return (
        <TablesClient
            restaurantId={restaurantId || ''}
            initialAreas={areas}
            initialTables={tables}
        />
    )
}
