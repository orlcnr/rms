import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { productsApi } from '@/modules/products/services/products.service'
import { ordersApi } from '@/modules/orders/services'
import { OrderType } from '@/modules/orders/types'
import { DeliveryOrdersClient } from '@/modules/orders/components/DeliveryOrdersClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DeliveryOrdersPage() {
  const { restaurantId } = await getRestaurantContext()
  if (!restaurantId) {
    throw new Error('Restaurant not found')
  }

  const [products, deliveryOrders] = await Promise.all([
    productsApi.getProducts(restaurantId, {
      page: 1,
      limit: 200,
      posMode: true,
    }),
    ordersApi.getOrders({
      page: 1,
      limit: 100,
      type: OrderType.DELIVERY,
    }),
  ])

  return (
    <DeliveryOrdersClient
      restaurantId={restaurantId}
      initialItems={products.items}
      initialOrders={deliveryOrders.items}
    />
  )
}
