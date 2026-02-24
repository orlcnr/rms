// ============================================
// POS STORE - Zustand
// Masa bazlı sepet yönetimi: Her masa için ayrı sepet saklanır
// localStorage persist: Sepetler masa ID'sine göre kaydedilir
// ============================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BasketItem, Order, OrderType, calculateBasketSummary } from '../types'
import { Table, TableStatus } from '@/modules/tables/types'

interface PosState {
  // ============ SEPET (MASA BAZLI) ============
  basketsByTable: Record<string, BasketItem[]>  // { tableId: [BasketItem, ...] }
  selectedTable: Table | null
  setSelectedTable: (table: Table | null) => void  // Masa değişince otomatik sepet yükle
  getCurrentBasket: () => BasketItem[]  // Aktif masanın sepetini getir
  addToBasket: (item: Omit<BasketItem, 'quantity'>) => void
  incrementItem: (menuItemId: string) => void
  decrementItem: (menuItemId: string) => void
  removeFromBasket: (menuItemId: string) => void
  clearBasket: () => void  // Aktif masanın sepetini temizle
  clearTableBasket: (tableId: string) => void  // Belirli masanın sepetini temizle
  setBasketForTable: (tableId: string, items: BasketItem[]) => void  // Masanın sepetini doğrudan set et (sipariş yükleme için)
  getBasketSummary: () => { itemCount: number; subtotal: number; total: number }

  // ============ MASA ============
  orderType: OrderType
  setOrderType: (type: OrderType) => void

  // ============ SİPARİŞLER (Real-time) ============
  orders: Order[]
  setOrders: (orders: Order[]) => void
  addOrder: (order: Order) => void
  updateOrder: (order: Order) => void
  removeOrder: (orderId: string) => void

  // ============ MASALAR (Real-time) ============
  tables: Table[]
  setTables: (tables: Table[]) => void
  updateTable: (table: Table) => void

  // ============ DURUM ============
  isSubmitting: boolean
  setIsSubmitting: (isSubmitting: boolean) => void
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      // ============ SEPET (MASA BAZLI) ============
      basketsByTable: {},

      // Aktif masanın sepetini getir
      getCurrentBasket: () => {
        const { basketsByTable, selectedTable } = get()
        if (!selectedTable) return []
        return basketsByTable[selectedTable.id] || []
      },

      // Masa seçildiğinde o masaya ait sepeti otomatik yükle
      setSelectedTable: (table) => {
        const { basketsByTable } = get()
        
        // Eğer aynı masa seçiliyse bir şey yapma
        if (table?.id === get().selectedTable?.id) {
          set({ selectedTable: table })
          return
        }
        
        // Yeni masa seçildi - o masanın sepetini yükle (varsa)
        const tableBasket = table ? (basketsByTable[table.id] || []) : []
        
        set({ 
          selectedTable: table,
          // Not: basketsByTable'da saklanan sepet zaten korunuyor
          // Sadece selectedTable güncelleniyor
        })
      },

      addToBasket: (item) =>
        set((state) => {
          const tableId = state.selectedTable?.id
          if (!tableId) return state  // Masa seçili değilse sepete ekleme

          const tableBasket = state.basketsByTable[tableId] || []
          const existing = tableBasket.find((b) => b.menuItemId === item.menuItemId)

          let newTableBasket: BasketItem[]
          if (existing) {
            newTableBasket = tableBasket.map((b) =>
              b.menuItemId === item.menuItemId
                ? { ...b, quantity: b.quantity + 1 }
                : b
            )
          } else {
            newTableBasket = [...tableBasket, { ...item, quantity: 1 }]
          }

          return {
            basketsByTable: {
              ...state.basketsByTable,
              [tableId]: newTableBasket,
            },
          }
        }),

      incrementItem: (menuItemId) =>
        set((state) => {
          const tableId = state.selectedTable?.id
          if (!tableId) return state

          const tableBasket = state.basketsByTable[tableId] || []
          return {
            basketsByTable: {
              ...state.basketsByTable,
              [tableId]: tableBasket.map((b) =>
                b.menuItemId === menuItemId ? { ...b, quantity: b.quantity + 1 } : b
              ),
            },
          }
        }),

      decrementItem: (menuItemId) =>
        set((state) => {
          const tableId = state.selectedTable?.id
          if (!tableId) return state

          const tableBasket = state.basketsByTable[tableId] || []
          const existing = tableBasket.find((b) => b.menuItemId === menuItemId)
          if (!existing) return state

          let newTableBasket: BasketItem[]
          if (existing.quantity <= 1) {
            newTableBasket = tableBasket.filter((b) => b.menuItemId !== menuItemId)
          } else {
            newTableBasket = tableBasket.map((b) =>
              b.menuItemId === menuItemId ? { ...b, quantity: b.quantity - 1 } : b
            )
          }

          return {
            basketsByTable: {
              ...state.basketsByTable,
              [tableId]: newTableBasket,
            },
          }
        }),

      removeFromBasket: (menuItemId) =>
        set((state) => {
          const tableId = state.selectedTable?.id
          if (!tableId) return state

          const tableBasket = state.basketsByTable[tableId] || []
          return {
            basketsByTable: {
              ...state.basketsByTable,
              [tableId]: tableBasket.filter((b) => b.menuItemId !== menuItemId),
            },
          }
        }),

      // Aktif masanın sepetini temizle
      clearBasket: () =>
        set((state) => {
          const tableId = state.selectedTable?.id
          if (!tableId) return state

          const { [tableId]: _, ...rest } = state.basketsByTable
          return { basketsByTable: rest }
        }),

      // Belirli masanın sepetini temizle (Submit sonrası vs)
      clearTableBasket: (tableId) =>
        set((state) => {
          const { [tableId]: _, ...rest } = state.basketsByTable
          return { basketsByTable: rest }
        }),

      // Sepeti doğrudan set et (sipariş yükleme için)
      setBasketForTable: (tableId, items) =>
        set((state) => ({
          basketsByTable: {
            ...state.basketsByTable,
            [tableId]: items,
          },
        })),

      getBasketSummary: () => {
        const { basketsByTable, selectedTable } = get()
        if (!selectedTable) return { itemCount: 0, subtotal: 0, total: 0 }
        const basket = basketsByTable[selectedTable.id] || []
        return calculateBasketSummary(basket)
      },

      // ============ MASA ============
      selectedTable: null,

      orderType: OrderType.DINE_IN,
      setOrderType: (type) => set({ orderType: type }),

      // ============ SİPARİŞLER ============
      orders: [],
      setOrders: (orders) => set({ orders }),

      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders],
        })),

      updateOrder: (order) =>
        set((state) => ({
          orders: state.orders.map((o) => (o.id === order.id ? order : o)),
        })),

      removeOrder: (orderId) =>
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== orderId),
        })),

      // ============ MASALAR ============
      tables: [],
      setTables: (tables) => set({ tables }),

      updateTable: (table) =>
        set((state) => ({
          tables: state.tables.map((t) => (t.id === table.id ? table : t)),
        })),

      // ============ DURUM ============
      isSubmitting: false,
      setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
    }),
    {
      name: 'pos-store',
      partialize: (state) => ({
        // Masa bazlı sepetler ve seçili masa localStorage'a kaydedilir
        basketsByTable: state.basketsByTable,
        selectedTable: state.selectedTable,
        orderType: state.orderType,
      }),
    }
  )
)

// ============================================
// SELECTOR HELPER
// ============================================

/**
 * Mevcut siparişleri filtrele (sadece aktif siparişler)
 */
export function useActiveOrders() {
  return usePosStore((state) =>
    state.orders.filter((o) => !['cancelled', 'paid', 'delivered'].includes(o.status))
  )
}

/**
 * Dolu masaları getir
 */
export function useOccupiedTables() {
  return usePosStore((state) =>
    state.tables.filter((t) => t.status === TableStatus.OCCUPIED)
  )
}

/**
 * Boş masaları getir
 */
export function useAvailableTables() {
  return usePosStore((state) =>
    state.tables.filter((t) => t.status === TableStatus.AVAILABLE)
  )
}
