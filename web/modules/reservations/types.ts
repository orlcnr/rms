// ============================================
// RESERVATIONS MODULE TYPES
// Backend: backend/src/modules/reservations/entities/reservation.entity.ts
// ============================================

import { BaseEntity } from '@/modules/shared/types'

// ============================================
// ENUMS (Backend'den)
// ============================================

/**
 * Reservation Status Enum
 * Backend: backend/src/modules/reservations/entities/reservation.entity.ts
 */
export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

// ============================================
// STATUS MAPPING & LABELS
// ============================================

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: 'Bekliyor',
  [ReservationStatus.CONFIRMED]: 'Onaylandı',
  [ReservationStatus.COMPLETED]: 'Tamamlandı',
  [ReservationStatus.CANCELLED]: 'İptal Edildi',
  [ReservationStatus.NO_SHOW]: 'Gelmedi',
}

export const RESERVATION_STATUS_CONFIG: Record<
  ReservationStatus,
  { label: string; color: 'success' | 'warning' | 'danger' | 'info' | 'muted' }
> = {
  [ReservationStatus.PENDING]: {
    label: 'Bekliyor',
    color: 'warning',
  },
  [ReservationStatus.CONFIRMED]: {
    label: 'Onaylandı',
    color: 'success',
  },
  [ReservationStatus.COMPLETED]: {
    label: 'Tamamlandı',
    color: 'success',
  },
  [ReservationStatus.CANCELLED]: {
    label: 'İptal',
    color: 'danger',
  },
  [ReservationStatus.NO_SHOW]: {
    label: 'Gelmedi',
    color: 'danger',
  },
}

// ============================================
// RESERVATION TYPES (Backend Response)
// ============================================

/**
 * Reservation Entity
 * Backend: backend/src/modules/reservations/entities/reservation.entity.ts
 */
export interface Reservation extends BaseEntity {
  customer_id: string
  customer?: {
    id: string
    first_name: string
    last_name: string
    phone: string
  }
  table_id: string
  table?: {
    id: string
    name: string
    table_number?: string
  }
  reservation_time: string
  guest_count: number
  prepayment_amount: number
  status: ReservationStatus
  notes?: string
}

// ============================================
// DTO TYPES
// ============================================

export interface CreateReservationDto {
  customer_id: string
  table_id: string
  reservation_time: string
  guest_count: number
  prepayment_amount?: number
  notes?: string
  transaction_id?: string
}

export interface UpdateReservationDto extends Partial<CreateReservationDto> {
  status?: ReservationStatus
  transaction_id?: string
}

// ============================================
// API PARAMETERS
// ============================================

export interface GetReservationsParams {
  date?: string
  startDate?: string
  endDate?: string
}

// Note: restaurantId is now handled by JWT on backend - not needed in frontend
export interface GetReservationsQueryParams extends GetReservationsParams {
  // Removed: restaurantId is now obtained from JWT token on backend
}

// ============================================
// CONFLICT TYPES
// ============================================

export interface ReservationConflict {
  hasConflict: boolean
  conflictingReservation?: Reservation
  message?: string
}

// ============================================
// OPTIMISTIC UPDATE TYPES
// ============================================

export interface PendingUpdate {
  reservationId: string
  previousState: Reservation
  timestamp: number
}

// ============================================
// FORM TYPES (Local State)
// ============================================

export interface ReservationFormData {
  customer_id: string
  table_id: string
  reservation_time: string
  guest_count: number
  prepayment_amount: number
  notes: string
}

export interface CustomerSearchResult {
  id: string
  first_name: string
  last_name: string
  phone: string
  visit_count?: number
}

// ============================================
// TIME SLOT TYPES
// ============================================

export interface TimeSlot {
  time: string
  available: boolean
}

export interface DayAvailability {
  date: string
  slots: TimeSlot[]
}
