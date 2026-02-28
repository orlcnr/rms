// ============================================
// RESERVATION UTILITIES
// Rezervasyon yardımcı fonksiyonları
// ============================================

import { Reservation, ReservationStatus } from '../types'
import { getNow } from '@/modules/shared/utils/date'

// ============================================
// CONFLICT CHECKING
// ============================================

export const DEFAULT_RESERVATION_DURATION = 120; // 120 minutes (2 hours)

export interface TimeSlot {
  start: Date
  end: Date
}

/**
 * İki zaman diliminin çakışıp çakışmadığını kontrol eder
 */
export function doTimeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  return slot1.start < slot2.end && slot1.end > slot2.start
}

/**
 * Rezervasyon için varsayılan süreyi hesapla (2 saat)
 */
export function getDefaultReservationEndTime(startTime: Date): Date {
  return new Date(startTime.getTime() + 2 * 60 * 60 * 1000)
}

/**
 * Çakışma kontrolü için rezervasyon verilerini hazırla
 */
export interface ConflictCheckReservation {
  id?: string
  table_id: string
  reservation_time: string
  status: string
}

/**
 * Belirli bir masanın belirli bir zamandaki çakışma durumunu kontrol eder
 */
export function checkTableConflict(
  reservations: ConflictCheckReservation[],
  tableId: string,
  reservationTime: string,
  excludeReservationId?: string,
  durationHours: number = 2
): { hasConflict: boolean; conflictingReservation?: ConflictCheckReservation } {
  const newStart = new Date(reservationTime)
  const newEnd = new Date(newStart.getTime() + (durationHours || DEFAULT_RESERVATION_DURATION / 60) * 60 * 60 * 1000)

  const activeStatuses = ['pending', 'confirmed']

  for (const res of reservations) {
    // Aynı masa değilse veya çıkarılacak rezervasyonsa atla
    if (res.table_id !== tableId) continue
    if (excludeReservationId && res.id === excludeReservationId) continue
    if (!activeStatuses.includes(res.status)) continue

    const existingStart = new Date(res.reservation_time)
    const existingEnd = new Date(existingStart.getTime() + DEFAULT_RESERVATION_DURATION * 60 * 1000)

    if (
      doTimeSlotsOverlap(
        { start: newStart, end: newEnd },
        { start: existingStart, end: existingEnd }
      )
    ) {
      return {
        hasConflict: true,
        conflictingReservation: res,
      }
    }
  }

  return { hasConflict: false }
}

/**
 * Belirli bir masanın belirli bir tarihteki doluluk planını döndürür (30dk aralıklarla)
 */
export function calculateTableOccupancy(
  reservations: ConflictCheckReservation[],
  tableId: string,
  dateStr: string,
  selectedTime?: string, // Personelin seçtiği anlık saat (conflict tespiti için)
  startHour: number = 9,
  endHour: number = 24
): { time: string; status: 'free' | 'busy' | 'selected-conflict'; reservation?: ConflictCheckReservation }[] {
  const slots: { time: string; status: 'free' | 'busy' | 'selected-conflict'; reservation?: ConflictCheckReservation }[] = []

  // Sadece ilgili masanın aktif rezervasyonlarını filtrele
  const activeStatuses = ['pending', 'confirmed']
  const tableReservations = reservations.filter(
    r => r.table_id === tableId && activeStatuses.includes(r.status)
  )

  const selectedDateTime = selectedTime ? new Date(selectedTime) : null
  const selectedEnd = selectedDateTime ? new Date(selectedDateTime.getTime() + DEFAULT_RESERVATION_DURATION * 60 * 1000) : null

  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

      // 24:30 ve sonrasını engelle (00:00 son slot olmalı)
      if (hour === endHour && minute > 0) break

      // 00:00 gösterimi için özel durum (Eğer hour 24 ise 00:00 olarak göster)
      const displayTime = hour === 24 ? '00:00' : timeStr

      const slotStart = new Date(`${dateStr}T${hour === 24 ? '00:00' : timeStr}:00+03:00`)
      if (hour === 24) {
        slotStart.setDate(slotStart.getDate() + 1)
      }
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)

      let status: 'free' | 'busy' | 'selected-conflict' = 'free'
      let conflictingRes: ConflictCheckReservation | undefined

      // Mevcut rezervasyonlarla çakışıyor mu?
      for (const res of tableReservations) {
        const resStart = new Date(res.reservation_time)
        const resEnd = new Date(resStart.getTime() + DEFAULT_RESERVATION_DURATION * 60 * 1000)

        if (slotStart < resEnd && slotEnd > resStart) {
          status = 'busy'
          conflictingRes = res
          break
        }
      }

      // Eğer seçili saat varsa ve bu slot o aralıktaysa ve meşgulse -> selected-conflict
      if (status === 'busy' && selectedDateTime && selectedEnd) {
        if (slotStart < selectedEnd && slotEnd > selectedDateTime) {
          status = 'selected-conflict'
        }
      }

      slots.push({
        time: displayTime,
        status,
        reservation: conflictingRes
      })
    }
  }

  return slots
}

// ============================================
// OPTIMISTIC UPDATE HELPERS
// ============================================

/**
 * Optimistic update wrapper fonksiyonu
 */
export async function withOptimisticUpdate<T>(
  reservationId: string,
  updateData: Partial<Reservation>,
  store: {
    optimisticUpdate: (id: string, data: Partial<Reservation>) => void
    commitUpdate: (id: string) => void
    rollbackUpdate: (id: string) => void
  },
  apiCall: () => Promise<T>
): Promise<T> {
  // 1. Store'u optimistic olarak güncelle
  store.optimisticUpdate(reservationId, updateData)

  try {
    // 2. API çağrısını yap
    const result = await apiCall()

    // 3. Başarılı - commit yap
    store.commitUpdate(reservationId)

    return result
  } catch (error) {
    // 4. Hata - rollback yap
    store.rollbackUpdate(reservationId)
    throw error
  }
}

/**
 * Status transition validator
 */
export function canChangeStatus(
  currentStatus: ReservationStatus,
  newStatus: ReservationStatus
): boolean {
  const validTransitions: Record<ReservationStatus, ReservationStatus[]> = {
    [ReservationStatus.PENDING]: [
      ReservationStatus.CONFIRMED,
      ReservationStatus.CANCELLED,
      ReservationStatus.NO_SHOW,
    ],
    [ReservationStatus.CONFIRMED]: [
      ReservationStatus.COMPLETED,
      ReservationStatus.CANCELLED,
      ReservationStatus.NO_SHOW,
    ],
    [ReservationStatus.COMPLETED]: [],
    [ReservationStatus.CANCELLED]: [ReservationStatus.PENDING],
    [ReservationStatus.NO_SHOW]: [ReservationStatus.PENDING],
  }

  return validTransitions[currentStatus]?.includes(newStatus) ?? false
}

/**
 * Available status options döndürür
 */
export function getAvailableStatusOptions(currentStatus: ReservationStatus): ReservationStatus[] {
  const validTransitions: Record<ReservationStatus, ReservationStatus[]> = {
    [ReservationStatus.PENDING]: [
      ReservationStatus.CONFIRMED,
      ReservationStatus.CANCELLED,
      ReservationStatus.NO_SHOW,
    ],
    [ReservationStatus.CONFIRMED]: [
      ReservationStatus.COMPLETED,
      ReservationStatus.CANCELLED,
      ReservationStatus.NO_SHOW,
    ],
    [ReservationStatus.COMPLETED]: [],
    [ReservationStatus.CANCELLED]: [ReservationStatus.PENDING],
    [ReservationStatus.NO_SHOW]: [ReservationStatus.PENDING],
  }

  return validTransitions[currentStatus] ?? []
}

// ============================================
// RESERVATION HELPERS
// ============================================

/**
 * Müşteri adını formatla
 */
export function formatCustomerName(customer?: Reservation['customer']): string {
  if (!customer) return '-'
  return `${customer.first_name} ${customer.last_name}`.trim()
}

/**
 * Masa adını formatla
 */
export function formatTableName(table?: Reservation['table']): string {
  if (!table) return '-'
  return table.name || table.table_number || '-'
}

/**
 * Kişi sayısını formatla
 */
export function formatGuestCount(count: number): string {
  return `${count} ${count === 1 ? 'kişi' : 'kişi'}`
}

// ============================================
// FILTERING
// ============================================

/**
 * Aktif rezervasyonları filtrele (pending veya confirmed)
 */
export function filterActiveReservations(reservations: Reservation[]): Reservation[] {
  return reservations.filter(
    (r) => r.status === ReservationStatus.PENDING || r.status === ReservationStatus.CONFIRMED
  )
}

/**
 * Tarihe göre rezervasyonları filtrele
 */
export function filterReservationsByDate(
  reservations: Reservation[],
  date: string
): Reservation[] {
  return reservations.filter((r) => {
    const resDate = new Date(r.reservation_time)
    const resLocalDate = `${resDate.getFullYear()}-${String(resDate.getMonth() + 1).padStart(2, '0')}-${String(resDate.getDate()).padStart(2, '0')}`
    return resLocalDate === date
  })
}

/**
 * Masa ID'sine göre rezervasyonları filtrele
 */
export function filterReservationsByTable(
  reservations: Reservation[],
  tableId: string
): Reservation[] {
  return reservations.filter((r) => r.table_id === tableId)
}

/**
 * Yaklaşan rezervasyonları filtrele
 */
export function filterUpcomingReservations(
  reservations: Reservation[],
  minutes: number = 30
): Reservation[] {
  const now = getNow()
  const future = new Date(now.getTime() + minutes * 60 * 1000)

  return reservations.filter((r) => {
    const resTime = new Date(r.reservation_time)
    return (
      resTime > now &&
      resTime <= future &&
      (r.status === ReservationStatus.PENDING || r.status === ReservationStatus.CONFIRMED)
    )
  })
}

// ============================================
// GROUPING
// ============================================

/**
 * Rezervasyonları tarihe göre grupla
 */
export function groupReservationsByDate(
  reservations: Reservation[]
): Record<string, Reservation[]> {
  return reservations.reduce(
    (acc, res) => {
      const date = new Date(res.reservation_time).toLocaleDateString('sv-SE')
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(res)
      return acc
    },
    {} as Record<string, Reservation[]>
  )
}

/**
 * Rezervasyonları masa ID'sine göre grupla
 */
export function groupReservationsByTable(
  reservations: Reservation[]
): Record<string, Reservation[]> {
  return reservations.reduce(
    (acc, res) => {
      if (!acc[res.table_id]) {
        acc[res.table_id] = []
      }
      acc[res.table_id].push(res)
      return acc
    },
    {} as Record<string, Reservation[]>
  )
}
