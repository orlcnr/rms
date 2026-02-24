import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { productsApi } from '@/modules/products/services/products.service'
import { ProductsClient } from '@/modules/products/components/ProductsClient'

export default async function ProductsPage() {
    const { restaurantId } = await getRestaurantContext()

    // Fetch initial data in parallel from backend
    const [categories, productsResponse] = await Promise.all([
        productsApi.getCategories(restaurantId ?? ''),
        productsApi.getProducts(restaurantId ?? '', { page: 1, limit: 12 })
    ])

    return (
        <ProductsClient
            restaurantId={restaurantId || ''}
            initialCategories={categories}
            initialProductsResponse={productsResponse}
        />
    )
}
