import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { productsApi } from '@/modules/products/services/products.service'
import { CounterOrdersClient } from '@/modules/orders/components/CounterOrdersClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CounterOrdersPage() {
  const { restaurantId } = await getRestaurantContext()
  if (!restaurantId) {
    throw new Error('Restaurant not found')
  }

  const products = await productsApi.getProducts(restaurantId, {
    page: 1,
    limit: 200,
    posMode: true,
  })

  return (
    <CounterOrdersClient
      restaurantId={restaurantId}
      initialItems={products.items}
    />
  )
}

