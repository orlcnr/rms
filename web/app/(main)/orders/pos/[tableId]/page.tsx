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
import type { MenuItem } from '@/modules/products/types'
import type { PaginatedResponse } from '@/modules/shared/types'

export const metadata = {
  title: 'POS - Sipariş | Restaurant App',
  description: 'Sipariş Oluşturma',
}

interface PageProps {
  params: Promise<{ tableId: string }>
  searchParams: Promise<{ orderId?: string }>
}

function getEmptyProductsResponse(
  page: number,
  limit: number,
): PaginatedResponse<MenuItem> {
  return {
    items: [],
    meta: {
      totalItems: 0,
      itemCount: 0,
      itemsPerPage: limit,
      totalPages: 0,
      currentPage: page,
    },
  }
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
  const activeStatuses = [
    OrderStatus.PENDING,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.SERVED,
  ]

  if (orderIdFromQuery) {
    existingOrder = await ordersApi.getOrderById(orderIdFromQuery).catch(() => null)
  } else {
    const activeOrdersResponse = await ordersApi.getOrders({
      tableId,
      status: activeStatuses,
    }).catch(() => ({ items: [], meta: { totalItems: 0, itemCount: 0, itemsPerPage: 20, totalPages: 0, currentPage: 1 } }))

    existingOrder = activeOrdersResponse.items[0] || null
  }

  const [menuItemsResponse, categories] = await Promise.all([
    productsApi.getProducts(restaurantId, { page: 1, limit: 20, posMode: true }).catch(() => getEmptyProductsResponse(1, 20)),
    productsApi.getCategories(restaurantId).catch(() => []),
  ])

  const initialMenuItems = menuItemsResponse.items

  const paginationMeta = {
    totalItems: menuItemsResponse.meta.totalItems,
    totalPages: menuItemsResponse.meta.totalPages,
    itemsPerPage: menuItemsResponse.meta.itemsPerPage,
  }

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
