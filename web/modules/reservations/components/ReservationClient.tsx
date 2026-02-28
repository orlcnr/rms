'use client'

import React, { useState, useCallback, memo, useEffect, useMemo } from 'react'
import { Calendar, Loader2, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/modules/shared/components/Button'
import { SubHeaderSection, FilterSection, BodySection } from '@/modules/shared/components/layout'
import { cn } from '@/modules/shared/utils/cn'

import { useReservations } from '../hooks/useReservations'
import { getNow } from '@/modules/shared/utils/date'
import { Reservation, ReservationStatus } from '../types'

import { ReservationModal } from './ReservationModal'
import { ReservationCard, ReservationList } from './ReservationCard'
import { DateTimePicker } from '@/modules/shared/components/DateTimePicker'
import { ReservationWeeklyView } from './ReservationWeeklyView'
import { ReservationMonthlyView } from './ReservationMonthlyView'

// ============================================
// PROPS
// ============================================

interface ReservationClientProps {
  restaurantId: string
  userId?: string
  initialReservations?: Reservation[]
}

// ============================================
// TYPES
// ============================================

type ViewType = 'agenda' | 'weekly' | 'monthly'

// ============================================
// COMPONENT (memoized for performance)
// ============================================

function ReservationClientComponent({
  restaurantId,
  userId,
  initialReservations = [],
}: ReservationClientProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])
  // UI State
  const [view, setView] = React.useState<ViewType>('agenda')
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [selectedReservation, setSelectedReservation] = React.useState<Reservation | null>(null)

  // Reservations hook - initial data ile
  // NOT: initialReservations her render'da yeni referans olabilir
  // Ama hook içindeki initialized ref bunu handle ediyor
  const {
    reservations,
    isLoading,
    selectedDate,
    selectDate,
    updateStatusOptimistic,
    refetch,
    createReservation,
    isSocketConnected,
    isSyncing,
  } = useReservations(restaurantId, {}, initialReservations, view)

  // Selected date reservations - use memo directly from reservations
  const selectedDateReservations = React.useMemo(() => {
    return reservations.filter((res) => {
      // Use local date string comparison to ensure consistency with selectedDate and backend
      const resLocalDate = new Date(res.reservation_time).toLocaleDateString('sv-SE');
      return resLocalDate === selectedDate;
    })
  }, [reservations, selectedDate])

  // Stats - calculate based on the selected date
  const stats = React.useMemo(() => {
    return {
      total: selectedDateReservations.length,
      pending: selectedDateReservations.filter((r) => r.status === ReservationStatus.PENDING).length,
      confirmed: selectedDateReservations.filter((r) => r.status === ReservationStatus.CONFIRMED).length,
      totalGuests: selectedDateReservations.reduce((sum, r) => sum + r.guest_count, 0),
    }
  }, [selectedDateReservations])

  // ============================================
  // HANDLERS (memoized)
  // ============================================

  const handleOpenModal = React.useCallback((reservation?: Reservation) => {
    setSelectedReservation(reservation || null)
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = React.useCallback(() => {
    setIsModalOpen(false)
    setSelectedReservation(null)
  }, [])

  const handleStatusChange = React.useCallback(async (id: string, status: ReservationStatus) => {
    try {
      await updateStatusOptimistic(id, status)
      toast.success('Durum güncellendi')
    } catch (error) {
      toast.error('Güncelleme başarısız')
    }
  }, [updateStatusOptimistic])

  const handleModalSuccess = React.useCallback(() => {
    refetch()
    handleCloseModal()
  }, [refetch, handleCloseModal])

  const handlePrevDay = React.useCallback(() => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() - 1)
    selectDate(date.toLocaleDateString('sv-SE'))
  }, [selectedDate, selectDate])

  const handleNextDay = React.useCallback(() => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + 1)
    selectDate(date.toLocaleDateString('sv-SE'))
  }, [selectedDate, selectDate])

  const handleToday = React.useCallback(() => {
    selectDate(getNow().toLocaleDateString('sv-SE'))
  }, [selectDate])

  // Format date for display
  const formatSelectedDate = React.useCallback(() => {
    return new Date(selectedDate).toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [selectedDate])

  const isToday = selectedDate === getNow().toLocaleDateString('sv-SE')

  // ============================================
  // RENDER
  // ============================================

  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-muted">Restoran bilgisi bulunamadı</p>
      </div>
    )
  }

  if (!mounted) {
    return (
      <div className="h-screen bg-bg-app animate-pulse" />
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-app">
      {/* SubHeader Section */}
      <SubHeaderSection
        title="REZERVASYONLAR"
        description="Müşteri rezervasyonları ve masa yönetimi"
        isConnected={isSocketConnected}
        isSyncing={isSyncing}
        onRefresh={refetch}
        moduleColor="bg-orange-500"
        actions={
          <Button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-[0.2em]"
          >
            <Plus size={18} />
            YENİ REZERVASYON
          </Button>
        }
      />

      <main className="flex flex-col">
        {/* Filter Section */}
        <FilterSection className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
            {/* Date Navigation */}
            <div className="flex items-center gap-1 bg-bg-hover p-1 rounded-sm border border-border-light">
              <button
                onClick={handlePrevDay}
                className="p-2 hover:bg-bg-surface rounded-sm transition-colors text-text-secondary"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                onClick={handleToday}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all",
                  isToday
                    ? 'bg-bg-surface text-primary-main shadow-sm border border-border-light'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                BUGÜN
              </button>

              <button
                onClick={handleNextDay}
                className="p-2 hover:bg-bg-surface rounded-sm transition-colors text-text-secondary"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Date Picker */}
            <div className="w-[180px]">
              <DateTimePicker
                id="main-date-picker"
                label=""
                value={selectedDate ? `${selectedDate}T12:00:00` : ''}
                onChange={(val) => selectDate(val.split('T')[0])}
                showTime={false}
                placeholder="Tarih seçin"
              />
            </div>

            {/* Stats */}
            <div className="hidden xl:flex items-center gap-6 ml-4 px-6 border-l border-border-light">
              <div className="flex flex-col justify-center text-right border-r border-border-light pr-6">
                <p className="text-sm font-black text-primary-main uppercase tracking-widest">
                  {formatSelectedDate()}
                </p>
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">
                  Günün Özeti
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-text-primary tabular-nums">{stats.total}</p>
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Toplam</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-warning-main tabular-nums">{stats.pending}</p>
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Bekliyor</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-success-main tabular-nums">{stats.confirmed}</p>
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Onaylı</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-text-primary tabular-nums">{stats.totalGuests}</p>
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Kişi</p>
              </div>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex items-center gap-1 bg-bg-hover rounded-sm p-1 border border-border-light">
            {[
              { id: 'agenda', label: 'Ajanda' },
              { id: 'weekly', label: 'Hafta' },
              { id: 'monthly', label: 'Ay' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as ViewType)}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all",
                  view === tab.id
                    ? 'bg-bg-surface text-primary-main shadow-sm border border-border-light'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Body Section */}
        <BodySection className="min-h-[600px] bg-bg-surface">
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-10 h-10 animate-spin text-primary-main" />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {view === 'agenda' && (
                <ReservationList
                  reservations={selectedDateReservations}
                  onClick={handleOpenModal}
                  onStatusChange={handleStatusChange}
                  showTimeBadge
                  showActions
                  emptyMessage="Bu tarihte rezervasyon bulunmuyor"
                />
              )}

              {view === 'weekly' && (
                <ReservationWeeklyView
                  reservations={reservations}
                  selectedDate={selectedDate}
                  onReservationClick={handleOpenModal}
                />
              )}

              {view === 'monthly' && (
                <ReservationMonthlyView
                  reservations={reservations}
                  selectedDate={selectedDate}
                  onDateSelect={(date) => {
                    selectDate(date)
                    setView('agenda')
                  }}
                />
              )}
            </div>
          )}
        </BodySection>
      </main>

      {/* Modal - Conditionally rendered to prevent stale form/customer state */}
      {isModalOpen && (
        <ReservationModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleModalSuccess}
          reservationToEdit={selectedReservation || undefined}
          restaurantId={restaurantId}
          createReservation={createReservation}
        />
      )}
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export const ReservationClient = memo(ReservationClientComponent)
