import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { inventoryApi } from '@/modules/inventory/services/inventory.service'
import { InventoryClient } from '@/modules/inventory/components/InventoryClient'

export default async function InventoryPage() {
    const { restaurantId } = await getRestaurantContext()

    if (!restaurantId) {
        return null // Metadata/Redirect handling usually happens via middleware but this satisfies TSC
    }

    // Initial fetch for ingredients with stock
    const ingredientsResponse = await inventoryApi.getIngredients({
        page: 1,
        limit: 20
    })

    return (
        <InventoryClient
            restaurantId={restaurantId}
            initialIngredientsResponse={ingredientsResponse}
        />
    )
}
