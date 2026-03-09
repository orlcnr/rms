'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, RefreshCw } from 'lucide-react'
import { Modal } from '@/modules/shared/components/Modal'
import { Button } from '@/modules/shared/components/Button'
import { formatDateTime } from '@/modules/shared/utils/date'
import { toast } from 'sonner'

type ReservationPreview = {
  id: string
  reservation_time: string
  status: string
}

interface ReservationArrivalModalProps {
  isOpen: boolean
  onClose: () => void
  tableName: string
  reservation: ReservationPreview | null
  mode: 'arrived-confirm' | 'warning-only'
  warningMessage?: string | null
  errorMessage?: string | null
  isSubmitting?: boolean
  onConfirmArrived: () => Promise<void> | void
  onContinueWithoutStatus: () => void
  onRequestRefresh: () => Promise<void> | void
}

export function ReservationArrivalModal({
  isOpen,
  onClose,
  tableName,
  reservation,
  mode,
  warningMessage,
  errorMessage,
  isSubmitting = false,
  onConfirmArrived,
  onContinueWithoutStatus,
  onRequestRefresh,
}: ReservationArrivalModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const reservationDateText = useMemo(() => {
    if (!reservation?.reservation_time) return '-'
    return formatDateTime(reservation.reservation_time)
  }, [reservation?.reservation_time])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRequestRefresh()
      toast.success('Masa listesi yenilendi')
    } catch {
      toast.error('Liste yenilenemedi')
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'arrived-confirm' ? 'Rezervasyon Onayı' : 'Rezervasyon Uyarısı'}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div className="rounded-sm border border-border-light bg-bg-muted/20 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Masa</p>
          <p className="mt-1 text-sm font-black text-text-primary">{tableName}</p>
        </div>

        {reservation && (
          <div className="rounded-sm border border-border-light bg-bg-surface p-3">
            <div className="flex items-center gap-2 text-text-secondary">
              <CalendarClock className="h-4 w-4" />
              <p className="text-xs font-bold uppercase tracking-wider">Rezervasyon Saati</p>
            </div>
            <p className="mt-2 text-sm font-bold text-text-primary">{reservationDateText}</p>
          </div>
        )}

        {warningMessage && (
          <div className="rounded-sm border border-warning-main/35 bg-warning-subtle/20 p-3 text-xs font-semibold text-warning-main">
            {warningMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-sm border border-danger-main/35 bg-danger-subtle/20 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-danger-main" />
              <p className="text-xs font-semibold text-danger-main">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Vazgeç
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isSubmitting || isRefreshing}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Yenile
          </Button>
          <Button
            variant="secondary"
            onClick={onContinueWithoutStatus}
            disabled={isSubmitting || isRefreshing}
          >
            Masaya Başka Müşteri Al
          </Button>
          {mode === 'arrived-confirm' && (
            <Button
              variant="primary"
              onClick={onConfirmArrived}
              isLoading={isSubmitting}
              disabled={isRefreshing}
            >
              {errorMessage ? 'Tekrar Dene' : 'Geldi Olarak Onayla'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
