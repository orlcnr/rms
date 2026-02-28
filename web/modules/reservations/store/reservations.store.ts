// ============================================
// RESERVATIONS ZUSTAND STORE
// Global state management with optimistic updates
// ============================================

import { create } from 'zustand'
import { Reservation, ReservationStatus, PendingUpdate } from '../types'
import { getNow } from '@/modules/shared/utils/date'

// ============================================
// STORE INTERFACE
// ============================================

interface ReservationsState {
  // State
  reservations: Reservation[]
  selectedDate: string
  isLoading: boolean
  error: Error | null

  // Optimistic Updates için
  pendingUpdates: Map<string, PendingUpdate>

  // Actions
  setReservations: (reservations: Reservation[]) => void
  addReservation: (reservation: Reservation) => void
  updateReservation: (id: string, data: Partial<Reservation>) => void
  removeReservation: (id: string) => void
  setSelectedDate: (date: string) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: Error | null) => void

  // Optimistic Update Actions
  optimisticUpdate: (id: string, data: Partial<Reservation>) => void
  commitUpdate: (id: string) => void
  rollbackUpdate: (id: string) => void
  clearPendingUpdates: () => void

  // Selectors (store içinde computed - performans için)
  getReservationsByDate: (date: string) => Reservation[]
  getReservationsByTable: (tableId: string) => Reservation[]
  getActiveReservations: () => Reservation[]
  getUpcomingReservations: (minutes: number) => Reservation[]
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useReservationsStore = create<ReservationsState>((set, get) => ({
  // Initial State
  reservations: [],
  selectedDate: new Date().toLocaleDateString('sv-SE'),
  isLoading: false,
  error: null,
  pendingUpdates: new Map(),

  // ============================================
  // BASE ACTIONS
  // ============================================

  // Loop önleme: Aynı veri zaten mevcutsa güncelleme yapma
  setReservations: (reservations) =>
    set((state) => {
      // Aynı referans veya aynı içerik kontrolü
      if (state.reservations === reservations) return state

      // ID'leri karşılaştarak aynı veri olup olmadığını kontrol et
      const stateIds = new Set(state.reservations.map((r) => r.id))
      const newIds = new Set(reservations.map((r) => r.id))

      if (stateIds.size === newIds.size && [...stateIds].every((id) => newIds.has(id))) {
        return state
      }

      return { reservations }
    }),

  addReservation: (reservation) =>
    set((state) => ({
      reservations: [...state.reservations, reservation],
    })),

  updateReservation: (id, data) =>
    set((state) => ({
      reservations: state.reservations.map((res) =>
        res.id === id ? { ...res, ...data } : res
      ),
    })),

  removeReservation: (id) =>
    set((state) => ({
      reservations: state.reservations.filter((res) => res.id !== id),
    })),

  setSelectedDate: (date) => set({ selectedDate: date }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // ============================================
  // OPTIMISTIC UPDATE IMPLEMENTATION
  // ============================================

  optimisticUpdate: (id, data) =>
    set((state) => {
      const reservation = state.reservations.find((r) => r.id === id)
      if (!reservation) return state

      // Önceki durumu kaydet
      const newPendingUpdates = new Map(state.pendingUpdates)
      newPendingUpdates.set(id, {
        reservationId: id,
        previousState: { ...reservation },
        timestamp: Date.now(),
      })

      return {
        reservations: state.reservations.map((res) =>
          res.id === id ? { ...res, ...data } : res
        ),
        pendingUpdates: newPendingUpdates,
      }
    }),

  commitUpdate: (id) =>
    set((state) => {
      const newPendingUpdates = new Map(state.pendingUpdates)
      newPendingUpdates.delete(id)

      return {
        pendingUpdates: newPendingUpdates,
      }
    }),

  rollbackUpdate: (id) =>
    set((state) => {
      const pending = state.pendingUpdates.get(id)
      if (!pending) return state

      const newPendingUpdates = new Map(state.pendingUpdates)
      newPendingUpdates.delete(id)

      return {
        reservations: state.reservations.map((res) =>
          res.id === id ? pending.previousState : res
        ),
        pendingUpdates: newPendingUpdates,
      }
    }),

  clearPendingUpdates: () => set({ pendingUpdates: new Map() }),

  // ============================================
  // COMPUTED SELECTORS (Store içinde)
  // Not: Bunları doğrudan kullanmak yerine useReservationSelectors hook'unu kullan
  // Bu selector'lar performans için useMemo ile sarmalanmalı
  // ============================================

  getReservationsByDate: (date) => {
    const { reservations } = get()
    return reservations.filter((res) => {
      const resDate = new Date(res.reservation_time).toISOString().split('T')[0]
      return resDate === date
    })
  },

  getReservationsByTable: (tableId) => {
    const { reservations } = get()
    return reservations.filter((res) => res.table_id === tableId)
  },

  getActiveReservations: () => {
    const { reservations } = get()
    return reservations.filter(
      (res) =>
        res.status === ReservationStatus.PENDING ||
        res.status === ReservationStatus.CONFIRMED
    )
  },

  getUpcomingReservations: (minutes) => {
    const { reservations } = get()
    const now = new Date()
    const future = new Date(now.getTime() + minutes * 60 * 1000)

    return reservations.filter((res) => {
      const resTime = new Date(res.reservation_time)
      return (
        resTime > now &&
        resTime <= future &&
        (res.status === ReservationStatus.PENDING ||
          res.status === ReservationStatus.CONFIRMED)
      )
    })
  },
}))

// ============================================
// DERIVED SELECTORS (Ayrı dosyada kullanım için)
// ============================================

/**
 * Rezervasyonun güncellenme durumunu döndürür
 */
export function selectIsPending(state: ReservationsState, reservationId: string): boolean {
  return state.pendingUpdates.has(reservationId)
}

/**
 * Tüm pending rezervasyonları döndürür
 */
export function selectPendingReservations(state: ReservationsState): Reservation[] {
  const pendingIds = Array.from(state.pendingUpdates.keys())
  return state.reservations.filter((r) => pendingIds.includes(r.id))
}

/**
 * Bugünkü rezervasyonları döndürür
 */
export function selectTodayReservations(state: ReservationsState): Reservation[] {
  const today = getNow().toLocaleDateString('sv-SE')
  return state.reservations.filter(
    (r) => new Date(r.reservation_time).toISOString().split('T')[0] === today
  )
}
