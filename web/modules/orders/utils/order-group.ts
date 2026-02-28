// ============================================
// ORDER GROUPING UTILS
// Server-side gruplama fonksiyonları
// Kanban board için siparişleri masa/address bazında gruplar
// ============================================

import { Order, OrderGroup, OrdersByStatus, OrderStatus, OrderType } from '../types'
import { getNow, parseISO, ensureISO } from '@/modules/shared/utils/date'

// Helper to get createdAt from order (handles both camelCase and snake_case)
function getOrderCreatedAt(order: Order): string {
  if (!order) return ''
  const val = order.createdAt || (order as any).created_at || (order as any).createdAt
  return ensureISO(val)
}

/**
 * Masa/address bazında siparişleri grupla
 */
export function groupOrdersByTable(orders: Order[]): Record<string, OrderGroup> {
  if (!orders || orders.length === 0) {
    return {}
  }

  const groups = orders.reduce((acc, order) => {
    const createdAt = getOrderCreatedAt(order)

    // tableId yoksa 'no-table' kullan
    const tableId = order.tableId || `no-table-${order.id}`

    if (!acc[tableId]) {
      acc[tableId] = {
        tableId,
        tableName: order.table?.name || getDefaultTableName(order),
        orders: [],
        totalItems: 0,
        totalAmount: 0,
        firstOrderTime: createdAt, // Initial value, will be recalculated
        lastOrderTime: createdAt, // Initial value, will be recalculated
        activeWaveTime: createdAt, // Initial value, will be recalculated
        customerName: order.customer?.name || order.customer?.first_name,
        orderType: order.type,
        status: order.status, // Initial value, will be recalculated
        activeItems: [],
        activeWaveItems: [],
        previousItems: [],
        servedItems: [],
      }
    }

    // Siparişi gruba ekle
    acc[tableId].orders.push(order)
    return acc
  }, {} as Record<string, OrderGroup>)

  // Tüm grupları yeniden hesapla (consistency)
  Object.keys(groups).forEach(id => {
    groups[id] = recalculateGroupFields(groups[id])
  })

  return groups
}

/**
 * Tek bir grubun alanlarını (toplamlar, dalgalar, süreler) yeniden hesaplar
 */
export function recalculateGroupFields(group: OrderGroup): OrderGroup {
  const WAVE_THRESHOLD_MINUTES = 30 // Arşivleme süresi
  const WAVE_CLUSTER_MINUTES = 5    // Son dalga (Yeni) sayılma süresi
  const now = getNow().getTime()

  if (!group.orders || group.orders.length === 0) return group

  // Siparişleri yeniden zamana göre sırala (En yeni en üstte)
  const sortedOrders = [...group.orders].sort((a, b) =>
    parseISO(getOrderCreatedAt(b)).getTime() - parseISO(getOrderCreatedAt(a)).getTime()
  )

  const latestOrder = sortedOrders[0]
  const baseTime = getOrderCreatedAt(latestOrder)

  const updatedGroup: OrderGroup = {
    ...group,
    orders: sortedOrders,
    totalItems: 0,
    totalAmount: 0,
    activeItems: [],
    activeWaveItems: [],
    previousItems: [],
    servedItems: [],
    firstOrderTime: getOrderCreatedAt(sortedOrders[sortedOrders.length - 1]),
    lastOrderTime: baseTime,
    activeWaveTime: baseTime,
    status: latestOrder.status
  }

  // 1. Önce en son eklenen ürünün zamanını bul (Cluster referansı için)
  let maxItemTimeMs = parseISO(baseTime).getTime()
  sortedOrders.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        const itemCreatedISO = ensureISO(item.created_at || (item as any).createdAt)
        const itemTimeMs = parseISO(itemCreatedISO).getTime()
        if (itemTimeMs > maxItemTimeMs) maxItemTimeMs = itemTimeMs
      })
    }
  })

  // 2. Ürünleri grupla
  sortedOrders.forEach(order => {
    updatedGroup.totalItems += order.items?.length || 0
    updatedGroup.totalAmount += Number(order.totalAmount) || 0

    if (order.items) {
      order.items.forEach(item => {
        const itemCreatedISO = ensureISO(item.created_at || (item as any).createdAt)
        const itemCreatedTime = parseISO(itemCreatedISO).getTime()

        const isServed = item.status === OrderStatus.SERVED || item.status === OrderStatus.DELIVERED || item.status === OrderStatus.PAID
        const minutesSinceCreated = (now - itemCreatedTime) / (1000 * 60)

        // Bu ürün "yeni dalga"da mı? (En son üründen en fazla 5 dk önce eklenmişse)
        const isNewWave = (maxItemTimeMs - itemCreatedTime) <= (WAVE_CLUSTER_MINUTES * 60 * 1000)

        // AYIRMA MANTIĞI:
        // 1. Durum: Arşivlik Ürünler (>30 dk servis edilmişse ve "Yeni Dalga" değilse)
        if (isServed && minutesSinceCreated > WAVE_THRESHOLD_MINUTES && !isNewWave) {
          updatedGroup.servedItems.push(item)
          return
        }

        // 2. Durum: Son Dalga (Yeni Gelenler)
        if (isNewWave) {
          updatedGroup.activeWaveItems.push(item)
          updatedGroup.activeItems.push(item)
        } else {
          // 3. Durum: Önceki bekleyenler
          updatedGroup.previousItems.push(item)
          updatedGroup.activeItems.push(item)
        }
      })
    }
  })

  // Final wave time update (sayacın baz alacağı zaman)
  updatedGroup.activeWaveTime = new Date(maxItemTimeMs).toISOString()

  return updatedGroup
}

/**
 * Masa gruplarını status bazında dağıt
 */
export function groupOrdersByTableAndStatus(orders: Order[]): OrdersByStatus {
  if (!orders || orders.length === 0) {
    return {
      pending: [],
      preparing: [],
      ready: [],
      served: [],
      on_way: [],
      delivered: [],
      paid: [],
      cancelled: [],
    }
  }

  const tableGroups = groupOrdersByTable(orders)
  const tableOrderGroups = Object.values(tableGroups)

  const byStatus: OrdersByStatus = {
    pending: [],
    preparing: [],
    ready: [],
    served: [],
    on_way: [],
    delivered: [],
    paid: [],
    cancelled: [],
  }

  for (const group of tableOrderGroups) {
    const status = group.status as keyof OrdersByStatus
    if (status && byStatus[status]) {
      const sortedOrders = [...group.orders].sort(
        (a, b) => new Date(getOrderCreatedAt(b)).getTime() - new Date(getOrderCreatedAt(a)).getTime()
      )

      byStatus[status].push({
        ...group,
        orders: sortedOrders,
      })
    }
  }

  for (const status of Object.keys(byStatus) as Array<keyof OrdersByStatus>) {
    byStatus[status].sort(
      (a, b) => new Date(b.activeWaveTime).getTime() - new Date(a.activeWaveTime).getTime()
    )
  }

  return byStatus
}

/**
 * Aktif siparişleri filtrele (paid, cancelled hariç)
 */
export function getActiveOrders(orders: Order[]): Order[] {
  return orders.filter(
    order => order.status !== OrderStatus.PAID && order.status !== OrderStatus.CANCELLED
  )
}

/**
 * Tamamlanmış siparişleri filtrele (paid, cancelled)
 */
export function getCompletedOrders(orders: Order[]): Order[] {
  return orders.filter(
    order => order.status === OrderStatus.PAID || order.status === OrderStatus.CANCELLED
  )
}

/**
 * Sipariş tipine göre filtrele
 */
export function filterOrdersByType(orders: Order[], type: OrderType): Order[] {
  return orders.filter(order => order.type === type)
}

/**
 * Masa ID'sine göre filtrele
 */
export function filterOrdersByTable(orders: Order[], tableId: string): Order[] {
  return orders.filter(order => order.tableId === tableId)
}

/**
 * Tarih aralığına göre filtrele
 */
export function filterOrdersByDateRange(
  orders: Order[],
  startDate: string,
  endDate: string
): Order[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  return orders.filter(order => {
    const orderDate = new Date(getOrderCreatedAt(order))
    return orderDate >= start && orderDate <= end
  })
}

/**
 * Arama terimine göre filtrele
 */
export function searchOrders(orders: Order[], searchTerm: string): Order[] {
  const term = searchTerm.toLowerCase()

  return orders.filter(order => {
    if (order.orderNumber?.toLowerCase().includes(term)) return true
    const customerName = order.customer?.name ||
      `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`
    if (customerName.toLowerCase().includes(term)) return true
    if (order.table?.name?.toLowerCase().includes(term)) return true
    if (order.items?.some(item =>
      item.menuItem?.name?.toLowerCase().includes(term)
    )) return true

    return false
  })
}

/**
 * Bugünün siparişlerini getir
 */
export function getTodayOrders(orders: Order[]): Order[] {
  const today = getNow()
  today.setHours(0, 0, 0, 0)

  return orders.filter(order => {
    const orderDate = new Date(getOrderCreatedAt(order))
    return orderDate >= today
  })
}

/**
 * Varsayılan masa adı oluştur
 */
function getDefaultTableName(order: Order): string {
  if (order.type === OrderType.TAKEAWAY || order.type === OrderType.DELIVERY) {
    return order.customer?.name ||
      `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() ||
      'Paket Servis'
  }
  if (order.tableId) {
    return `Masa #${order.tableId.slice(0, 8)}`
  }
  return 'Bilinmeyen Masa'
}

/**
 * Sipariş grubunun özet bilgilerini getir
 */
export function getOrderGroupSummary(group: OrderGroup): {
  orderCount: number
  itemCount: number
  totalAmount: number
  timeElapsed: number
  statusLabel: string
} {
  const now = getNow()
  const lastOrder = new Date(group.lastOrderTime)
  const timeElapsed = Math.floor((now.getTime() - lastOrder.getTime()) / (1000 * 60))

  return {
    orderCount: group.orders.length,
    itemCount: group.totalItems,
    totalAmount: group.totalAmount,
    timeElapsed,
    statusLabel: getStatusLabel(group.status),
  }
}

/**
 * Status label'ı getir
 */
function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'Beklemede',
    [OrderStatus.PREPARING]: 'Hazırlanıyor',
    [OrderStatus.READY]: 'Hazır',
    [OrderStatus.SERVED]: 'Servis Edildi',
    [OrderStatus.PAID]: 'Ödendi',
    [OrderStatus.ON_WAY]: 'Yolda',
    [OrderStatus.DELIVERED]: 'Teslim Edildi',
    [OrderStatus.CANCELLED]: 'İptal Edildi',
  }
  return labels[status] || status
}
