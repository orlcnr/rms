// ============================================
// RESERVATIONS API SERVICE
// Backend: backend/src/modules/reservations/reservations.controller.ts
// ============================================

import { http } from '@/modules/shared/api/http'
import {
  Reservation,
  CreateReservationDto,
  UpdateReservationDto,
  GetReservationsQueryParams,
} from '../types'

export const reservationsApi = {
  /**
   * Get all reservations with optional filters
   * GET /reservations
   * Note: restaurantId is now handled by JWT on backend
   */
  getAll: async (params: GetReservationsQueryParams) => {
    const searchParams = new URLSearchParams()

    if (params.date) searchParams.append('date', params.date)
    if (params.startDate) searchParams.append('startDate', params.startDate)
    if (params.endDate) searchParams.append('endDate', params.endDate)

    const queryString = searchParams.toString()
    const url = `/reservations${queryString ? `?${queryString}` : ''}`

    // JWT token backend'de restaurantId'yi alıyor - query param gerekmiyor
    return http.get<Reservation[]>(url)
  },

  /**
   * Get single reservation by ID
   * GET /reservations/:id
   */
  getById: async (id: string) => {
    return http.get<Reservation>(`/reservations/${id}`)
  },

  /**
   * Create new reservation
   * POST /reservations
   */
  create: async (data: CreateReservationDto) => {
    return http.post<Reservation>('/reservations', data)
  },

  /**
   * Update reservation
   * PATCH /reservations/:id
   */
  update: async (id: string, data: Partial<UpdateReservationDto>) => {
    return http.patch<Reservation>(`/reservations/${id}`, data)
  },

  /**
   * Update reservation status
   * PATCH /reservations/:id/status
   */
  updateStatus: async (id: string, status: string) => {
    return http.patch<Reservation>(`/reservations/${id}/status`, { status })
  },

  /**
   * Delete reservation (soft delete)
   * DELETE /reservations/:id
   */
  delete: async (id: string) => {
    return http.delete<void>(`/reservations/${id}`)
  },
}

// ============================================
// STATUS TRANSITION HELPERS
// ============================================

import { ReservationStatus } from '../types'

/**
 * Valid status transitions
 */
export const STATUS_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
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

/**
 * Check if status transition is valid
 */
export function canChangeStatus(
  currentStatus: ReservationStatus,
  newStatus: ReservationStatus
): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false
}

/**
 * Get available status options for current status
 */
export function getAvailableStatusOptions(currentStatus: ReservationStatus): ReservationStatus[] {
  return STATUS_TRANSITIONS[currentStatus] ?? []
}
