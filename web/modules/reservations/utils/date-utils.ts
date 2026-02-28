// ============================================
// DATE UTILITIES
// Rezervasyon modülü için tarih yardımcı fonksiyonları
// ============================================

import { getNow } from '@/modules/shared/utils/date'

// ============================================
// FORMATTING
// ============================================

/**
 * Rezervasyon tarihini formatla (örn: 25 Şubat 2026)
 */
export function formatReservationDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString))
}

/**
 * Rezervasyon saatini formatla (örn: 19:00)
 */
export function formatReservationTime(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

/**
 * Rezervasyon tarih ve saatini formatla (örn: 25 Şubat 2026, 19:00)
 */
export function formatReservationDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

/**
 * Kısa tarih formatı (örn: 25.02.2026)
 */
export function formatShortDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString))
}

// ============================================
// DATE PARSING
// ============================================

/**
 * Date objesini API için formatla (YYYY-MM-DD)
 */
export function getDateForApi(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
  }).format(date)
}

/**
 * ISO string'den Date objesi oluştur
 */
export function parseIsoDate(isoString: string): Date {
  return new Date(isoString)
}

/**
 * Türkiye saat diliminde Date objesi oluştur
 */
export function createTurkeyDate(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00+03:00`)
}

// ============================================
// DATE CALCULATIONS
// ============================================

/**
 * Haftanın günlerini döndürür ( Pazartesi başlar)
 */
export function getWeekDays(date: Date): Date[] {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date)
  monday.setDate(diff)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

/**
 * Ayın günlerini döndürür
 */
export function getMonthDays(year: number, month: number): Date[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: daysInMonth }, (_, i) => {
    return new Date(year, month, i + 1)
  })
}

/**
 * İki tarih arasındaki gün farkını hesapla
 */
export function getDaysBetween(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Tarih bugün mü?
 */
export function isToday(date: Date): boolean {
  const today = getNow()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Tarih gelecekte mi?
 */
export function isFuture(date: Date): boolean {
  return date > getNow()
}

/**
 * Tarih geçmişte mi?
 */
export function isPast(date: Date): boolean {
  return date < getNow()
}

// ============================================
// TIME UTILITIES
// ============================================

/**
 * Saat formatla (HH:mm)
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Time string'ini Date'e çevir
 */
export function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return { hours, minutes }
}

/**
 * Time slot'ları oluştur
 */
export function generateTimeSlots(
  startHour: number = 9,
  endHour: number = 23,
  intervalMinutes: number = 30
): string[] {
  const slots: string[] = []

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      slots.push(
        `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      )
    }
  }

  return slots
}

// ============================================
// RESERVATION TIME INFO
// ============================================

export interface ReservationTimeInfo {
  text: string
  color: 'danger' | 'warning' | 'info' | 'muted'
  isPast: boolean
  isUrgent: boolean
}

/**
 * Rezervasyon zamanı hakkında bilgi döndürür
 * ReservationCard'da kullanılır
 */
export function getReservationTimeInfo(reservationTime: string): ReservationTimeInfo {
  const now = getNow()
  const resDate = new Date(reservationTime)
  const diffMinutes = Math.floor((resDate.getTime() - now.getTime()) / 60000)

  // Geçmiş rezervasyonlar
  if (diffMinutes < 0) {
    return {
      text: 'Süresi Geçti',
      color: 'muted',
      isPast: true,
      isUrgent: false,
    }
  }

  // 30 dakika veya daha az
  if (diffMinutes <= 30) {
    return {
      text: `${diffMinutes} dk kaldı`,
      color: 'danger',
      isPast: false,
      isUrgent: true,
    }
  }

  // 2 saat veya daha az
  if (diffMinutes <= 120) {
    return {
      text: 'Yaklaşıyor',
      color: 'warning',
      isPast: false,
      isUrgent: false,
    }
  }

  // 2 saat sonra
  return {
    text: 'Gelecek',
    color: 'info',
    isPast: false,
    isUrgent: false,
  }
}
