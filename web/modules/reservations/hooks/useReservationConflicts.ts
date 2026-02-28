// ============================================
// RESERVATIONS CONFLICTS HOOK
// Client-side conflict checking for reservations
// ============================================

import { useCallback, useMemo } from 'react'
import { useReservationsStore } from '../store/reservations.store'
import { Reservation, TimeSlot as TimeSlotType } from '../types'
import { checkTableConflict, ConflictCheckReservation } from '../utils/reservation.utils'
import { generateTimeSlots } from '../utils/date-utils'

// ============================================
// HOOK
// ============================================

/**
 * Çakışma Kontrolü Hook'u
 *
 * Kullanım:
 * - ReservationModal'da masa/saat seçildiğinde
 * - Real-time güncellemelerde
 * - Form validation'da
 */
export function useReservationConflicts(customReservations?: Reservation[]) {
  const storeReservations = useReservationsStore((state) => state.reservations)
  const reservations = customReservations || storeReservations

  // ============================================
  // CONFLICT CHECKING
  // ============================================

  /**
   * Belirli bir masa ve zamandaki çakışmayı kontrol eder
   */
  const checkConflict = useCallback(
    (
      tableId: string,
      reservationTime: string,
      excludeReservationId?: string
    ): { hasConflict: boolean; conflictingReservation?: Reservation } => {
      const reservationsForCheck: ConflictCheckReservation[] = reservations.map((r) => ({
        id: r.id,
        table_id: r.table_id,
        reservation_time: r.reservation_time,
        status: r.status,
      }))

      const result = checkTableConflict(
        reservationsForCheck,
        tableId,
        reservationTime,
        excludeReservationId
      )

      if (result.hasConflict && result.conflictingReservation) {
        const originalReservation = reservations.find(
          (r) => r.id === result.conflictingReservation?.id
        )
        return {
          hasConflict: true,
          conflictingReservation: originalReservation,
        }
      }

      return { hasConflict: false }
    },
    [reservations]
  )

  /**
   * Çakışma var mı? (basit boolean döndürür)
   */
  const hasConflict = useCallback(
    (tableId: string, reservationTime: string, excludeReservationId?: string): boolean => {
      return checkConflict(tableId, reservationTime, excludeReservationId).hasConflict
    },
    [checkConflict]
  )

  // ============================================
  // FILTERING
  // ============================================

  /**
   * Bir masanın tüm rezervasyonlarını döndürür
   */
  const getReservationsForTable = useCallback(
    (tableId: string): Reservation[] => {
      return reservations.filter((res) => res.table_id === tableId)
    },
    [reservations]
  )

  /**
   * Belirli bir tarihteki rezervasyonları döndürür
   */
  const getReservationsForDate = useCallback(
    (date: string): Reservation[] => {
      return reservations.filter((res) => {
        const resDate = new Date(res.reservation_time).toLocaleDateString('sv-SE')
        return resDate === date
      })
    },
    [reservations]
  )

  /**
   * Aktif (pending/confirmed) rezervasyonları döndürür
   */
  const getActiveReservations = useCallback((): Reservation[] => {
    return reservations.filter(
      (res) => res.status === 'pending' || res.status === 'confirmed'
    )
  }, [reservations])

  // ============================================
  // TIME SLOTS
  // ============================================

  /**
   * Bir masanın belirli bir tarihteki müsaitlik durumunu kontrol eder
   */
  const getAvailableTimeSlots = useCallback(
    (
      tableId: string,
      date: string,
      startHour: number = 9,
      endHour: number = 23,
      slotDuration: number = 30
    ): { time: string; available: boolean }[] => {
      // Önce tüm time slot'ları oluştur
      const allSlots = generateTimeSlots(startHour, endHour, slotDuration)

      // Bu tarihteki masanın rezervasyonlarını al
      const dateReservations = reservations.filter((res) => {
        const resDate = new Date(res.reservation_time).toLocaleDateString('sv-SE')
        return (
          res.table_id === tableId &&
          resDate === date &&
          (res.status === 'pending' || res.status === 'confirmed')
        )
      })

      // Her slot için müsaitlik kontrolü yap
      return allSlots.map((time) => {
        const checkTime = new Date(`${date}T${time}:00+03:00`)

        const conflictResult = checkTableConflict(
          dateReservations as unknown as ConflictCheckReservation[],
          tableId,
          checkTime.toISOString()
        )

        return {
          time,
          available: !conflictResult.hasConflict,
        }
      })
    },
    [reservations]
  )

  /**
   * Sadece müsait slotları döndürür
   */
  const getOnlyAvailableSlots = useCallback(
    (
      tableId: string,
      date: string,
      startHour: number = 9,
      endHour: number = 23,
      slotDuration: number = 30
    ): string[] => {
      const allSlots = getAvailableTimeSlots(tableId, date, startHour, endHour, slotDuration)
      return allSlots.filter((slot) => slot.available).map((slot) => slot.time)
    },
    [getAvailableTimeSlots]
  )

  // ============================================
  // TABLE AVAILABILITY
  // ============================================

  /**
   * Bir masanın belirli bir tarih ve saatte müsait olup olmadığını döndürür
   */
  const isTableAvailable = useCallback(
    (tableId: string, date: string, time: string): boolean => {
      const reservationTime = new Date(`${date}T${time}:00+03:00`).toISOString()
      return !hasConflict(tableId, reservationTime)
    },
    [hasConflict]
  )

  /**
   * Bir masanın belirli bir günde toplam kaç rezervasyon aldığını döndürür
   */
  const getReservationCountForTable = useCallback(
    (tableId: string, date: string): number => {
      return reservations.filter((res) => {
        const resDate = new Date(res.reservation_time).toLocaleDateString('sv-SE')
        return res.table_id === tableId && resDate === date
      }).length
    },
    [reservations]
  )

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Tüm masaların belirli bir tarihteki durumunu döndürür
   */
  const getTablesAvailability = useCallback(
    (date: string, tableIds: string[]): Record<string, boolean> => {
      const result: Record<string, boolean> = {}

      for (const tableId of tableIds) {
        const reservationsOnDate = getReservationsForDate(date).filter(
          (r) => r.table_id === tableId && (r.status === 'pending' || r.status === 'confirmed')
        )
        result[tableId] = reservationsOnDate.length === 0
      }

      return result
    },
    [getReservationsForDate]
  )

  return {
    // Conflict checking
    checkConflict,
    hasConflict,

    // Filtering
    getReservationsForTable,
    getReservationsForDate,
    getActiveReservations,

    // Time slots
    getAvailableTimeSlots,
    getOnlyAvailableSlots,

    // Table availability
    isTableAvailable,
    getReservationCountForTable,

    // Bulk
    getTablesAvailability,
  }
}
