// ============================================
// POS STORE - Zustand
// Masa bazlı sepet yönetimi: Her masa için ayrı sepet saklanır
// localStorage persist: Sepetler masa ID'sine göre kaydedilir
// ============================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BasketItem, Order, OrderStatus, OrderType, calculateBasketSummary } from '../types'
import { Table, TableStatus } from '@/modules/tables/types'

// ============================================
// CONSTANTS
// ============================================

const EXPIRY_MS = 20 * 60 * 1000 // 20 minutes

interface BasketData {
  items: BasketItem[]
  updatedAt: number
}

function normalizeBasketData(raw: unknown): BasketData {
  if (Array.isArray(raw)) {
    return {
      items: raw as BasketItem[],
      updatedAt: Date.now(),
    }
  }

  if (
    raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as BasketData).items) &&
    typeof (raw as BasketData).updatedAt === 'number'
  ) {
    return raw as BasketData
  }

  if (
    raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as BasketData).items)
  ) {
    return {
      items: (raw as BasketData).items,
      updatedAt: Date.now(),
    }
  }

  return {
    items: [],
    updatedAt: Date.now(),
  }
}

export interface SyncContext {
  serverOrderStatus?: OrderStatus
  serverOrderUpdatedAt?: string
  strategy?: 'auto' | 'server' | 'merge'
}

interface PosState {
  // ============ SEPET (MASA BAZLI) ============
  basketsByTable: Record<string, BasketData>  // { tableId: { items, updatedAt } }
  selectedTable: Table | null
  setSelectedTable: (table: Table | null) => void  // Masa değişince otomatik sepet yükle + süre sıfırla
  getCurrentBasket: () => BasketItem[]  // Aktif masanın sepetini getir
  addToBasket: (item: Omit<BasketItem, 'quantity'>) => void
  incrementItem: (menuItemId: string) => void
  decrementItem: (menuItemId: string) => void
  removeFromBasket: (menuItemId: string) => void
  clearBasket: () => void  // Aktif masanın sepetini temizle
  clearTableBasket: (tableId: string) => void  // Belirli masanın sepetini temizle
  setBasketForTable: (tableId: string, items: BasketItem[], syncContext?: SyncContext) => void  // Masanın sepetini smart merge ile set et
  refreshBasketTimestamp: (tableId: string) => void // Süreyi sıfırla
  checkAndExpireBaskets: (includeSelectedTable?: boolean) => void // Süresi dolan sepetleri temizle
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
        const basketData = (basketsByTable as any)[selectedTable.id]
        if (!basketData) return []

        // Geriye dönük uyumluluk: Eğer sepet direkt array ise (eski format)
        if (Array.isArray(basketData)) {
          return basketData
        }

        // Expiry check (sadece burada okuma anında kontrol)
        if (Date.now() - basketData.updatedAt > EXPIRY_MS) {
          // Cleanup asynchronously to avoid state update during render
          setTimeout(() => get().clearTableBasket(selectedTable.id), 0)
          return []
        }

        return basketData.items || []
      },

      // Süreyi sıfırla
      refreshBasketTimestamp: (tableId) => {
        set((state) => {
          const rawBasket = state.basketsByTable[tableId]
          if (!rawBasket) return state
          const basketData = normalizeBasketData(rawBasket)
          return {
            basketsByTable: {
              ...state.basketsByTable,
              [tableId]: { ...basketData, updatedAt: Date.now() }
            }
          }
        })
      },

      // Süresi dolan sepetleri temizle
      checkAndExpireBaskets: (includeSelectedTable = false) => {
        const { basketsByTable, selectedTable } = get()
        const now = Date.now()
        const newBaskets: Record<string, BasketData> = { ...basketsByTable }
        let changed = false

        Object.entries(basketsByTable).forEach(([tableId, basket]) => {
          // Runtime'da aktif masa expire edilmez. Cold-start cleanup'ta includeSelectedTable=true ile bypass edilir.
          if (!includeSelectedTable && selectedTable?.id === tableId) return

          if (now - basket.updatedAt > EXPIRY_MS) {
            delete newBaskets[tableId]
            changed = true
          }
        })

        if (changed) {
          set({ basketsByTable: newBaskets })
        }
      },

      // Masa seçildiğinde o masaya ait sepeti otomatik yükle + süre sıfırla
      setSelectedTable: (table) => {
        const { basketsByTable } = get()

        // Seçili masa değiştiğinde (veya yeni masa seçildiğinde) süreyi sıfırla
        if (table) {
          get().refreshBasketTimestamp(table.id)
        }

        // Eğer aynı masa seçiliyse bir şey yapma
        if (table?.id === get().selectedTable?.id) {
          set({ selectedTable: table })
          return
        }

        set({ selectedTable: table })
      },

      addToBasket: (item) =>
        set((state) => {
          const tableId = state.selectedTable?.id
          if (!tableId) return state

          const basketData = normalizeBasketData(state.basketsByTable[tableId])
          const tableBasket = basketData.items
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
              [tableId]: { items: newTableBasket, updatedAt: Date.now() },
            },
          }
        }),

      incrementItem: (menuItemId) =>
        set((state) => {
          const tableId = state.selectedTable?.id
          if (!tableId) return state

          const rawBasket = state.basketsByTable[tableId]
          if (!rawBasket) return state
          const basketData = normalizeBasketData(rawBasket)

          return {
            basketsByTable: {
              ...state.basketsByTable,
              [tableId]: {
                items: basketData.items.map((b) =>
                  b.menuItemId === menuItemId ? { ...b, quantity: b.quantity + 1 } : b
                ),
                updatedAt: Date.now()
              },
            },
          }
        }),

      decrementItem: (menuItemId) =>
        set((state) => {
          const tableId = state.selectedTable?.id
          if (!tableId) return state

          const rawBasket = state.basketsByTable[tableId]
          if (!rawBasket) return state
          const basketData = normalizeBasketData(rawBasket)

          const tableBasket = basketData.items
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
              [tableId]: { items: newTableBasket, updatedAt: Date.now() },
            },
          }
        }),

      removeFromBasket: (menuItemId) =>
        set((state) => {
          const tableId = state.selectedTable?.id
          if (!tableId) return state

          const rawBasket = state.basketsByTable[tableId]
          if (!rawBasket) return state
          const basketData = normalizeBasketData(rawBasket)

          return {
            basketsByTable: {
              ...state.basketsByTable,
              [tableId]: {
                items: basketData.items.filter((b) => b.menuItemId !== menuItemId),
                updatedAt: Date.now()
              },
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

      // Sepeti set et (smart merge logic)
      setBasketForTable: (tableId, items, syncContext) =>
        set((state) => {
          const hasRawBasket = Object.prototype.hasOwnProperty.call(
            state.basketsByTable,
            tableId,
          )
          const existingBasket = hasRawBasket
            ? normalizeBasketData(state.basketsByTable[tableId])
            : undefined

          const buildServerState = () => ({
            basketsByTable: {
              ...state.basketsByTable,
              [tableId]: { items, updatedAt: Date.now() },
            },
          })

          const buildMergeState = () => {
            // Eğer yerelde hiç sepet yoksa direkt set et
            if (!existingBasket || existingBasket.items.length === 0) {
              return buildServerState()
            }

            // Smart Merge: Sunucudan gelen ürünleri (onaylı) al,
            // yerelde olup sunucuda olmayanları (henüz kaydedilmemiş) koru.
            const serverMenuItemIds = new Set(items.map((i) => i.menuItemId))
            const localOnlyItems = existingBasket.items.filter(
              (i) => !serverMenuItemIds.has(i.menuItemId),
            )
            const mergedItems = [...items, ...localOnlyItems]

            return {
              basketsByTable: {
                ...state.basketsByTable,
                [tableId]: { items: mergedItems, updatedAt: Date.now() },
              },
            }
          }

          // Geriye dönük uyumluluk: syncContext yoksa legacy merge davranışı korunur.
          if (!syncContext) {
            return buildMergeState()
          }

          const strategy = syncContext.strategy || 'auto'
          if (strategy === 'server') {
            return buildServerState()
          }
          if (strategy === 'merge') {
            return buildMergeState()
          }

          // Auto strategy
          if (
            syncContext.serverOrderStatus === OrderStatus.PAID ||
            syncContext.serverOrderStatus === OrderStatus.CANCELLED
          ) {
            const { [tableId]: _, ...rest } = state.basketsByTable
            return { basketsByTable: rest }
          }

          if (!existingBasket || existingBasket.items.length === 0) {
            return buildServerState()
          }

          const serverUpdatedAtMs = syncContext.serverOrderUpdatedAt
            ? Date.parse(syncContext.serverOrderUpdatedAt)
            : NaN
          const localAgeMs = Date.now() - existingBasket.updatedAt
          const localIsFresh = localAgeMs < EXPIRY_MS
          const localIsNewerThanServer =
            Number.isFinite(serverUpdatedAtMs) && existingBasket.updatedAt > serverUpdatedAtMs

          if (localIsFresh && localIsNewerThanServer) {
            // Local öncelikli: kullanıcı masada aktif çalışıyorsa taslak korunur.
            return state
          }

          return buildServerState()
        }),

      getBasketSummary: () => {
        const { basketsByTable, selectedTable } = get()
        if (!selectedTable) return { itemCount: 0, subtotal: 0, total: 0 }
        const basketData = (basketsByTable as any)[selectedTable.id]
        if (!basketData) return { itemCount: 0, subtotal: 0, total: 0 }

        // Geriye dönük uyumluluk: Eğer sepet direkt array ise (eski format)
        if (Array.isArray(basketData)) {
          return calculateBasketSummary(basketData)
        }

        const normalized = normalizeBasketData(basketData)
        return calculateBasketSummary(normalized.items || [])
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
        basketsByTable: state.basketsByTable,
        selectedTable: state.selectedTable,
        orderType: state.orderType,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Cold-start cleanup: selected table için skip uygulanmaz.
          state.checkAndExpireBaskets(true)
        }
      }
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
