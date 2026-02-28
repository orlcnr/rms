// ============================================
// RESERVATIONS SELECTORS HOOK
// Optimized selectors with useMemo for performance
// ============================================

import { useMemo } from 'react'
import { getNow } from '@/modules/shared/utils/date'
import { useReservationsStore } from '../store/reservations.store'
import { Reservation, ReservationStatus } from '../types'

// ============================================
// SELECTORS
// ============================================

/**
 * Belirli bir tarihteki rezervasyonları döndürür
 * useMemo ile optimize edilmiş - sadece reservations veya date değişince recalculate eder
 */
export function useReservationsByDate(date: string): Reservation[] {
  const reservations = useReservationsStore((state) => state.reservations)

  return useMemo(() => {
    return reservations.filter((res) => {
      const resDate = new Date(res.reservation_time).toLocaleDateString('sv-SE')
      return resDate === date
    })
  }, [reservations, date])
}

/**
 * Belirli bir masadaki rezervasyonları döndürür
 */
export function useReservationsByTable(tableId: string): Reservation[] {
  const reservations = useReservationsStore((state) => state.reservations)

  return useMemo(() => {
    return reservations.filter((res) => res.table_id === tableId)
  }, [reservations, tableId])
}

/**
 * Aktif (pending/confirmed) rezervasyonları döndürür
 */
export function useActiveReservations(): Reservation[] {
  const reservations = useReservationsStore((state) => state.reservations)

  return useMemo(() => {
    return reservations.filter(
      (res) => res.status === ReservationStatus.PENDING || res.status === ReservationStatus.CONFIRMED
    )
  }, [reservations])
}

/**
 * Yaklaşan rezervasyonları döndürür (belirli dakika içinde)
 */
export function useUpcomingReservations(minutes: number = 30): Reservation[] {
  const reservations = useReservationsStore((state) => state.reservations)

  return useMemo(() => {
    const now = getNow()
    const future = new Date(now.getTime() + minutes * 60 * 1000)

    return reservations.filter((res) => {
      const resTime = new Date(res.reservation_time)
      return (
        resTime > now &&
        resTime <= future &&
        (res.status === ReservationStatus.PENDING || res.status === ReservationStatus.CONFIRMED)
      )
    })
  }, [reservations, minutes])
}

/**
 * Belirli bir masanın yaklaşan rezervasyonlarını döndürür (TableCard için)
 */
export function useTableUpcomingReservations(
  tableId: string,
  minutes: number = 30
): Reservation[] {
  const reservations = useReservationsStore((state) => state.reservations)

  return useMemo(() => {
    const now = getNow()
    const future = new Date(now.getTime() + minutes * 60 * 1000)

    return reservations.filter((res) => {
      if (res.table_id !== tableId) return false
      const resTime = new Date(res.reservation_time)
      return (
        resTime > now &&
        resTime <= future &&
        (res.status === ReservationStatus.PENDING || res.status === ReservationStatus.CONFIRMED)
      )
    })
  }, [reservations, tableId, minutes])
}

/**
 * Belirli bir rezervasyonun güncellenme durumunu döndürür (loading state için)
 */
export function useIsReservationPending(reservationId: string): boolean {
  const pendingUpdates = useReservationsStore((state) => state.pendingUpdates)

  return useMemo(() => {
    return pendingUpdates.has(reservationId)
  }, [pendingUpdates, reservationId])
}

/**
 * Toplam istatistikleri döndürür (dashboard için)
 */
export function useReservationStats() {
  const reservations = useReservationsStore((state) => state.reservations)

  return useMemo(() => {
    const today = getNow().toLocaleDateString('sv-SE')
    const todayReservations = reservations.filter(
      (res) => new Date(res.reservation_time).toLocaleDateString('sv-SE') === today
    )

    return {
      total: todayReservations.length,
      pending: todayReservations.filter((r) => r.status === ReservationStatus.PENDING).length,
      confirmed: todayReservations.filter((r) => r.status === ReservationStatus.CONFIRMED).length,
      completed: todayReservations.filter((r) => r.status === ReservationStatus.COMPLETED).length,
      cancelled: todayReservations.filter((r) => r.status === ReservationStatus.CANCELLED).length,
      noShow: todayReservations.filter((r) => r.status === ReservationStatus.NO_SHOW).length,
      totalGuests: todayReservations.reduce((sum, r) => sum + r.guest_count, 0),
    }
  }, [reservations])
}

/**
 * Bugünkü rezervasyonları döndürür
 */
export function useTodayReservations(): Reservation[] {
  const reservations = useReservationsStore((state) => state.reservations)

  return useMemo(() => {
    const today = getNow().toLocaleDateString('sv-SE')
    return reservations.filter(
      (res) => new Date(res.reservation_time).toLocaleDateString('sv-SE') === today
    )
  }, [reservations])
}

/**
 * Seçili tarihteki rezervasyonları döndürür
 */
export function useSelectedDateReservations(): Reservation[] {
  const reservations = useReservationsStore((state) => state.reservations)
  const selectedDate = useReservationsStore((state) => state.selectedDate)

  return useMemo(() => {
    return reservations.filter((res) => {
      const resDate = new Date(res.reservation_time).toLocaleDateString('sv-SE')
      return resDate === selectedDate
    })
  }, [reservations, selectedDate])
}

/**
 * Tüm pending güncellemeleri döndürür
 */
export function usePendingReservationIds(): string[] {
  const pendingUpdates = useReservationsStore((state) => state.pendingUpdates)

  return useMemo(() => {
    return Array.from(pendingUpdates.keys())
  }, [pendingUpdates])
}
