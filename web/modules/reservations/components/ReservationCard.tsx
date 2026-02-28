// ============================================
// RESERVATION CARD COMPONENT
// Reservation card with status, time info and optimistic update support
// ============================================

import { useState, useEffect } from 'react'
import { Button } from '@/modules/shared/components/Button'
import { toast } from 'sonner'
import { Calendar, Users, Armchair, Loader2 } from 'lucide-react'

import { Reservation, ReservationStatus } from '../types'
import { RESERVATION_STATUS_CONFIG, RESERVATION_STATUS_LABELS } from '../types'
import { useIsReservationPending } from '../hooks/useReservationSelectors'
import { getReservationTimeInfo, formatReservationTime, formatShortDate } from '../utils/date-utils'
import { canChangeStatus, getAvailableStatusOptions } from '../services/reservations.service'
import { formatPhoneNumber } from '@/modules/shared/utils/format'

// ============================================
// PROPS
// ============================================

interface ReservationCardProps {
  reservation: Reservation
  onClick?: (reservation: Reservation) => void
  onStatusChange?: (id: string, status: ReservationStatus) => Promise<void>
  showTimeBadge?: boolean
  showActions?: boolean
}

// ============================================
// COMPONENT
// ============================================

export function ReservationCard({
  reservation,
  onClick,
  onStatusChange,
  showTimeBadge = true,
  showActions = true,
}: ReservationCardProps) {
  const [mounted, setMounted] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Optimistic update state
  const isPending = useIsReservationPending(reservation.id)

  // Status config
  const statusConfig = RESERVATION_STATUS_CONFIG[reservation.status]
  const statusLabel = RESERVATION_STATUS_LABELS[reservation.status]

  // Available status options
  const availableStatuses = getAvailableStatusOptions(reservation.status)

  // Handle status change
  const handleStatusChange = async (newStatus: ReservationStatus) => {
    if (!onStatusChange) return

    setIsUpdating(true)
    try {
      await onStatusChange(reservation.id, newStatus)
      toast.success('Durum güncellendi')
    } catch (error) {
      toast.error('Güncelleme başarısız')
    } finally {
      setIsUpdating(false)
    }
  }

  if (!mounted) {
    return (
      <div className="p-4 rounded-lg border bg-bg-card border-border h-[140px] animate-pulse" />
    )
  }

  // Time info (Client-only calculation)
  const timeInfo = getReservationTimeInfo(reservation.reservation_time)

  return (
    <div
      className={`relative p-4 rounded-lg border transition-all cursor-pointer bg-bg-card border-border ${isPending ? 'opacity-50' : ''} ${onClick ? 'hover:shadow-md' : ''}`}
      onClick={() => onClick?.(reservation)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          {/* Customer Name */}
          <h3 className="font-semibold text-text-primary">
            {reservation.customer?.first_name} {reservation.customer?.last_name}
          </h3>
          {/* Phone */}
          <p className="text-sm text-text-muted">
            {reservation.customer?.phone ? formatPhoneNumber(reservation.customer.phone) : ''}
          </p>
        </div>

        {/* Time Badge */}
        {showTimeBadge && (
          <div
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ` +
              `${timeInfo.color === 'danger' ? 'bg-danger-main text-text-inverse' : ''}` +
              `${timeInfo.color === 'warning' ? ' bg-warning-main text-text-inverse' : ''}` +
              `${timeInfo.color === 'info' ? ' bg-primary-main text-text-inverse' : ''}` +
              `${timeInfo.color === 'muted' ? ' bg-bg-hover text-text-muted' : ''}` +
              `${timeInfo.isUrgent ? ' animate-pulse' : ''}`}
          >
            {timeInfo.text}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex items-center gap-4 text-sm text-text-secondary mb-3">
        {/* Date & Time */}
        <div className="flex items-center gap-1">
          <Calendar size={14} className="text-text-muted" />
          <span>
            {formatShortDate(reservation.reservation_time)} - {' '}
            {formatReservationTime(reservation.reservation_time)}
          </span>
        </div>

        {/* Guest Count */}
        <div className="flex items-center gap-1">
          <Users size={14} className="text-text-muted" />
          <span>{reservation.guest_count} kişi</span>
        </div>

        {/* Table */}
        {reservation.table && (
          <div className="flex items-center gap-1">
            <Armchair size={14} className="text-text-muted" />
            <span>{reservation.table.name}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {reservation.notes && (
        <p className="text-sm text-text-muted italic mb-3 line-clamp-2">
          &quot;{reservation.notes}&quot;
        </p>
      )}

      {/* Status & Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        {/* Current Status Badge */}
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${
            statusConfig.color === 'success' ? 'bg-success-main text-text-inverse' :
            statusConfig.color === 'warning' ? 'bg-warning-main text-text-inverse' :
            statusConfig.color === 'danger' ? 'bg-danger-main text-text-inverse' : ''
          }`}
        >
          {statusLabel}
        </div>

        {/* Status Actions */}
        {showActions && availableStatuses.length > 0 && (
          <div className="flex gap-1">
            {availableStatuses.map((status) => (
              <Button
                key={status}
                onClick={(e) => {
                  e.stopPropagation()
                  handleStatusChange(status)
                }}
                disabled={isUpdating}
                variant="ghost"
                size="sm"
              >
                {RESERVATION_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-bg-card/50 flex items-center justify-center rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-primary-main" />
        </div>
      )}
    </div>
  )
}

// ============================================
// RESERVATION LIST COMPONENT
// ============================================

interface ReservationListProps {
  reservations: Reservation[]
  onClick?: (reservation: Reservation) => void
  onStatusChange?: (id: string, status: ReservationStatus) => Promise<void>
  showTimeBadge?: boolean
  showActions?: boolean
  emptyMessage?: string
}

export function ReservationList({
  reservations,
  onClick,
  onStatusChange,
  showTimeBadge = true,
  showActions = true,
  emptyMessage = 'Rezervasyon bulunmuyor',
}: ReservationListProps) {
  if (reservations.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reservations.map((reservation) => (
        <ReservationCard
          key={reservation.id}
          reservation={reservation}
          onClick={onClick}
          onStatusChange={onStatusChange}
          showTimeBadge={showTimeBadge}
          showActions={showActions}
        />
      ))}
    </div>
  )
}
