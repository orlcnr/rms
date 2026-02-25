// ============================================
// ORDERS POS PAGE - Server Component
// /orders/pos/[tableId]
// ============================================

import { notFound } from 'next/navigation'
import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { ordersApi } from '@/modules/orders/services'
import { productsApi } from '@/modules/products/services/products.service'
import { tablesApi } from '@/modules/tables/services/tables.service'
import { OrdersClient } from '@/modules/orders/components/OrdersClient'
import { OrderStatus } from '@/modules/orders/types'

export const metadata = {
  title: 'POS - Sipariş | Restaurant App',
  description: 'Sipariş Oluşturma',
}

interface PageProps {
  params: Promise<{ tableId: string }>
  searchParams: Promise<{ orderId?: string }>
}

export default async function PosPage({ params, searchParams }: PageProps) {
  const context = await getRestaurantContext()
  const restaurantId = context.restaurantId
  const { tableId } = await params
  const { orderId: orderIdFromQuery } = await searchParams

  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-text-muted">Restaurant bulunamadı</p>
      </div>
    )
  }

  const table = await tablesApi.getTable(tableId).catch(() => null)
  if (!table) notFound()

  let existingOrder = null
  const activeStatusQuery = `${OrderStatus.PENDING},${OrderStatus.PREPARING},${OrderStatus.READY},${OrderStatus.SERVED}`

  if (orderIdFromQuery) {
    existingOrder = await ordersApi.getOrderById(orderIdFromQuery).catch(() => null)
  } else {
    const activeOrdersResponse = await ordersApi.getOrders({
      restaurantId,
      tableId,
      status: activeStatusQuery as any,
    }).catch(() => ({ items: [], total: 0 }))

    const activeOrders = 'items' in activeOrdersResponse
      ? activeOrdersResponse.items
      : activeOrdersResponse

    existingOrder = activeOrders?.[0] || null
  }

  const [menuItemsResponse, categories] = await Promise.all([
    productsApi.getProducts(restaurantId, { page: 1, limit: 20 }).catch(() => ({ items: [], total: 0 })),
    productsApi.getCategories(restaurantId).catch(() => []),
  ])

  const initialMenuItems = 'items' in menuItemsResponse
    ? menuItemsResponse.items
    : menuItemsResponse

  const paginationMeta = 'meta' in menuItemsResponse ? {
    totalItems: menuItemsResponse.meta.totalItems,
    totalPages: menuItemsResponse.meta.totalPages,
    itemsPerPage: menuItemsResponse.meta.itemsPerPage,
  } : undefined

  return (
    /*
      Layout <main> class'ları:
        px-4 sm:px-8 lg:px-12  → yandan padding   → -mx ile iptal
        pb-32                  → alt padding       → -mb ile iptal
        pt-24 sm:pt-28         → üst padding (gri) → -mt ile iptal, pt ile geri ekle
        
      -mt + pt kombinasyonu: layout padding'ini iptal edip kendi rengiyle yeniden uyguluyoruz.
      Bu sayede üstteki gri band bg-bg-surface ile örtülüyor, header offset korunuyor.
    */
    <div className="
      -mx-4 sm:-mx-8 lg:-mx-12
      -mt-24 sm:-mt-28
      -mb-32
      pt-24 sm:pt-28
      bg-bg-surface
    ">
      <OrdersClient
        restaurantId={restaurantId}
        initialTable={table}
        existingOrder={existingOrder}
        initialMenuItems={initialMenuItems}
        initialCategories={categories}
        paginationMeta={paginationMeta}
      />
    </div>
  )
}