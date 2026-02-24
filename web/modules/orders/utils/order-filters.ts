// ===========================================-
// ORDER FILTERING HELPERS - Pure Functions
// Test edilebilir, yan etkisiz fonksiyonlar
// ============================================

import { MenuItem } from '@/modules/products/types'
import { BasketItem } from '../types'

// ============================================
// FILTER PARAMS
// ============================================

export interface FilterParams {
  items: MenuItem[]
  categoryId: string | null
  searchQuery: string
}

export interface OrderItemData {
  menuItemId: string
  name: string
  price: number
  image_url?: string
  quantity: number
}

// ============================================
// FILTER FUNCTIONS
// ============================================

/**
 * Filter menu items by category and search query
 * Pure function - easy to test
 */
export function filterMenuItems({ items, categoryId, searchQuery }: FilterParams): MenuItem[] {
  let filtered = items

  // Filter by category
  if (categoryId) {
    filtered = filtered.filter((item) => item.category_id === categoryId)
  }

  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    filtered = filtered.filter((item) => item.name.toLowerCase().includes(query))
  }

  // Only available items
  return filtered.filter((item) => item.is_available)
}

/**
 * Group order items by menuItemId
 * Used when loading existing orders into basket
 */
export function groupOrderItemsByMenuItem(items: any[]): Map<string, OrderItemData> {
  const itemsMap = new Map<string, OrderItemData>()

  items.forEach((item) => {
    const menuItemId = item.menuItem?.id || item.menuItemId
    if (itemsMap.has(menuItemId)) {
      const existing = itemsMap.get(menuItemId)!
      existing.quantity += item.quantity || 1
    } else {
      itemsMap.set(menuItemId, {
        menuItemId,
        name: item.menuItem?.name || item.name || 'Ürün',
        price: item.menuItem?.price || item.price || 0,
        image_url: item.menuItem?.image_url,
        quantity: item.quantity || 1,
      })
    }
  })

  return itemsMap
}

/**
 * Convert grouped items to array
 */
export function groupedItemsToArray(itemsMap: Map<string, OrderItemData>): BasketItem[] {
  return Array.from(itemsMap.values())
}

/**
 * Check if there are more pages available
 */
export function hasMorePages(currentPage: number, totalPages: number): boolean {
  return currentPage < totalPages
}

/**
 * Calculate next page number
 */
export function getNextPage(currentPage: number): number {
  return currentPage + 1
}
