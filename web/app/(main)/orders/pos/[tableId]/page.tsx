// ============================================
// ORDERS POS PAGE - Server Component
// /orders/pos/[tableId] - Masa üzerinden sipariş oluşturma/düzenleme
// Query: ?orderId=xxx (opsiyonel, mevcut sipariş varsa)
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
  // Restaurant context'i al
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

  // 1. Masayı getir
  const table = await tablesApi.getTable(tableId).catch(() => null)

  if (!table) {
    notFound()
  }

  // Masayı seç
  const initialTable = table

  // 2. Aktif siparişi kontrol et
  // Eğer query'de orderId varsa onu kullan, yoksa masadaki aktif siparişi bul
  let existingOrder = null

  // Backend'in kullandığı aktif durumlar: PENDING, PREPARING, READY, SERVED
  // Backend comma-separated string olarak destekliyor
  const activeStatusQuery = `${OrderStatus.PENDING},${OrderStatus.PREPARING},${OrderStatus.READY},${OrderStatus.SERVED}`

  if (orderIdFromQuery) {
    // Query'den gelen orderId'yi kullan
    existingOrder = await ordersApi.getOrderById(orderIdFromQuery).catch(() => null)
  } else {
    // Masadaki aktif siparişi bul (tüm aktif durumları kontrol et)
    const activeOrdersResponse = await ordersApi.getOrders({
      restaurantId,
      tableId,
      status: activeStatusQuery as any, // Backend comma-separated string olarak kabul ediyor
    }).catch(() => ({ items: [], total: 0 }))

    const activeOrders = 'items' in activeOrdersResponse 
      ? activeOrdersResponse.items 
      : activeOrdersResponse
    
    existingOrder = activeOrders?.[0] || null
  }

  // 3. Menu verilerini getir (limit 20, pagination ile)
  const [menuItemsResponse, categories] = await Promise.all([
    productsApi.getProducts(restaurantId, { page: 1, limit: 20 }).catch(() => ({ items: [], total: 0 })),
    productsApi.getCategories(restaurantId).catch(() => []),
  ])

  const initialMenuItems = 'items' in menuItemsResponse 
    ? menuItemsResponse.items 
    : menuItemsResponse

  // Extract pagination meta
  const paginationMeta = 'meta' in menuItemsResponse ? {
    totalItems: menuItemsResponse.meta.totalItems,
    totalPages: menuItemsResponse.meta.totalPages,
    itemsPerPage: menuItemsResponse.meta.itemsPerPage,
  } : undefined

  return (
    <main className="h-screen overflow-hidden bg-bg-app">
      <OrdersClient
        restaurantId={restaurantId}
        initialTable={initialTable}
        existingOrder={existingOrder}
        initialMenuItems={initialMenuItems}
        initialCategories={categories}
        paginationMeta={paginationMeta}
      />
    </main>
  )
}
