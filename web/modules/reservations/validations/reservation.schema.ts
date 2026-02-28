// ============================================
// RESERVATIONS VALIDATION SCHEMAS
// Zod schemas for runtime validation
// ============================================

import { z } from 'zod'
import { getNow } from '@/modules/shared/utils/date'

// UUID regex kontrolü
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Telefon regex - Türkiye formatı
const PHONE_REGEX = /^[\d\s\+\-\(\)]{10,}$/

// Geçerli rezervasyon durumları
const reservationStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const

// ============================================
// RESERVATION SCHEMAS
// ============================================

/**
 * Rezervasyon oluşturma şeması
 */
export const createReservationSchema = z.object({
  customer_id: z
    .string()
    .min(1, 'Müşteri seçilmelidir')
    .regex(UUID_REGEX, 'Geçerli bir müşteri ID olmalıdır'),
  table_id: z
    .string()
    .min(1, 'Masa seçilmelidir')
    .regex(UUID_REGEX, 'Geçerli bir masa ID olmalıdır'),
  reservation_time: z.string().refine(
    (val) => {
      const date = new Date(val)
      const now = getNow()
      // Bugüne (00:00) kadar olan tüm girişlere izin veriyoruz 
      // (Örn: Gece 00:30'da 00:00'a kayıt girilebilsin diye)
      now.setHours(0, 0, 0, 0)
      return date >= now
    },
    { message: 'Geçmiş tarihe rezervasyon yapılamaz' }
  ),
  guest_count: z
    .number()
    .min(1, 'En az 1 kişi olmalıdır')
    .max(50, 'Maksimum 50 kişi olabilir'),
  prepayment_amount: z.number().min(0).default(0),
  notes: z.string().max(500).optional(),
})

/**
 * Rezervasyon güncelleme şeması
 */
export const updateReservationSchema = createReservationSchema
  .partial()
  .extend({
    status: z.enum(reservationStatuses).optional(),
  })
  .refine(
    (data) => {
      // Eğer status değişmiyorsa, en az bir alan değişmeli
      if (data.status === undefined) {
        return Object.keys(data).length > 0
      }
      return true
    },
    { message: 'En az bir alan güncellenmelidir' }
  )

/**
 * Durum güncelleme şeması
 */
export const updateStatusSchema = z.object({
  status: z.enum(reservationStatuses, {
    errorMap: () => ({ message: 'Geçerli bir durum seçiniz' }),
  }),
})

// ============================================
// CUSTOMER SCHEMAS
// ============================================

/**
 * Hızlı müşteri oluşturma şeması (modal içinde)
 */
export const quickCustomerSchema = z.object({
  first_name: z
    .string()
    .min(1, 'Ad zorunludur')
    .max(50, 'Ad en fazla 50 karakter olabilir'),
  last_name: z.string().max(50, 'Soyad en fazla 50 karakter olabilir').optional(),
  phone: z
    .string()
    .min(10, 'Geçerli bir telefon numarası giriniz')
    .regex(PHONE_REGEX, 'Geçersiz telefon formatı'),
  email: z.string().email('Geçerli bir email giriniz').optional().or(z.literal('')),
})

// ============================================
// DYNAMIC SCHEMA FACTORIES
// ============================================

/**
 * Dinamik schema oluşturucu - müşteri seçili mi yoksa yeni müşteri mi
 * ReservationModal'da kullanılır
 */
export function createReservationSchemaWithCustomer(
  hasCustomer: boolean,
  hasNewCustomer: boolean
): z.ZodSchema<any> {
  if (!hasCustomer && !hasNewCustomer) {
    return createReservationSchema.extend({
      customer_id: z
        .string()
        .min(1, 'Müşteri seçilmeli veya yeni oluşturulmalıdır'),
    })
  }

  return createReservationSchema
}

// ============================================
// TYPE INFERENCE
// ============================================

export type CreateReservationFormData = z.infer<typeof createReservationSchema>
export type UpdateReservationFormData = z.infer<typeof updateReservationSchema>
export type UpdateStatusFormData = z.infer<typeof updateStatusSchema>
export type QuickCustomerFormData = z.infer<typeof quickCustomerSchema>

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Rezervasyon zamanı validation helper'ı
 */
export function validateReservationTime(time: string): {
  valid: boolean
  message?: string
} {
  const date = new Date(time)
  const now = new Date()
  const maxAdvanceDays = 90 // 90 gün sonrasına kadar

  // 15 dakikalık bir esneklik payı bırakıyoruz
  now.setMinutes(now.getMinutes() - 15)

  if (date < now) {
    return { valid: false, message: 'Geçmiş tarihe rezervasyon yapılamaz' }
  }

  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays)

  if (date > maxDate) {
    return { valid: false, message: `En fazla ${maxAdvanceDays} gün sonrasına rezervasyon yapılabilir` }
  }

  return { valid: true }
}

/**
 * Kişi sayısı validation helper'ı
 */
export function validateGuestCount(count: number): {
  valid: boolean
  message?: string
} {
  if (count < 1) {
    return { valid: false, message: 'En az 1 kişi olmalıdır' }
  }
  if (count > 50) {
    return { valid: false, message: 'Maksimum 50 kişi olabilir' }
  }
  return { valid: true }
}

/**
 * Tarih formatı kontrolü (YYYY-MM-DD)
 */
export function isValidDateFormat(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  return regex.test(dateString)
}

/**
 * Saat formatı kontrolü (HH:mm)
 */
export function isValidTimeFormat(timeString: string): boolean {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  return regex.test(timeString)
}

// ============================================
// CONSTANTS
// ============================================

export const RESERVATION_DURATION_HOURS = 2

export const MAX_ADVANCE_DAYS = 90

export const MIN_GUEST_COUNT = 1

export const MAX_GUEST_COUNT = 50

export const DEFAULT_TIME_SLOTS = {
  startHour: 9,
  endHour: 23,
  slotDuration: 30, // dakika
} as const
