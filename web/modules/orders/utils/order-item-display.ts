import { OrderItem } from '../types'
import { ensureISO } from '@/modules/shared/utils/date'

function buildItemGroupKey(item: OrderItem): string {
  const productKey =
    item.menuItemId || item.menuItem?.id || item.menuItem?.name || 'unknown'
  const noteKey = (item.notes || '').trim().toLowerCase()
  return `${productKey}::${item.status}::${noteKey}`
}

export function aggregateOrderItemsForDisplay(items: OrderItem[]): OrderItem[] {
  if (!items?.length) return []

  const grouped = new Map<string, OrderItem>()

  items.forEach((item) => {
    const key = buildItemGroupKey(item)
    const existing = grouped.get(key)

    if (!existing) {
      grouped.set(key, { ...item })
      return
    }

    existing.quantity = Number(existing.quantity || 0) + Number(item.quantity || 0)
    existing.totalPrice =
      Number(existing.totalPrice || 0) + Number(item.totalPrice || 0)

    const existingTime = new Date(ensureISO(existing.created_at)).getTime()
    const incomingTime = new Date(ensureISO(item.created_at)).getTime()
    if (incomingTime > existingTime) {
      existing.created_at = item.created_at
    }
  })

  return Array.from(grouped.values()).sort((a, b) => {
    const aTime = new Date(ensureISO(a.created_at)).getTime()
    const bTime = new Date(ensureISO(b.created_at)).getTime()
    return bTime - aTime
  })
}
