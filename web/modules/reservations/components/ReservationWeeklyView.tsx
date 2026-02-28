'use client'

import React, { useMemo } from 'react'
import { Reservation } from '../types'
import { ReservationCard } from './ReservationCard'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { tr } from 'date-fns/locale'
import { cn } from '@/modules/shared/utils/cn'

interface ReservationWeeklyViewProps {
  reservations: Reservation[]
  selectedDate: string
  onReservationClick: (reservation: Reservation) => void
}

export function ReservationWeeklyView({
  reservations,
  selectedDate,
  onReservationClick,
}: ReservationWeeklyViewProps) {
  const currentDate = new Date(selectedDate)

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4 h-full overflow-hidden">
      {weekDays.map((day) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const dayReservations = reservations.filter((r) =>
          r.reservation_time.split('T')[0] === dayStr
        )
        const isCurrentDay = isSameDay(day, currentDate)
        const isToday = isSameDay(day, new Date())

        return (
          <div
            key={dayStr}
            className={cn(
              "flex flex-col rounded-sm border bg-bg-surface overflow-hidden transition-all",
              isCurrentDay ? "border-primary-main ring-1 ring-primary-main/20" : "border-border-light",
              isToday && !isCurrentDay && "border-primary-main/30"
            )}
          >
            {/* Day Header */}
            <div className={cn(
              "p-3 border-b text-center",
              isCurrentDay ? "bg-primary-main text-white" : "bg-bg-muted/30"
            )}>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                {format(day, 'EEEE', { locale: tr })}
              </p>
              <p className="text-lg font-black tabular-nums">
                {format(day, 'd')}
              </p>
            </div>

            {/* Reservations List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-bg-app/10 scrollbar-none">
              {dayReservations.length === 0 ? (
                <div className="h-20 flex items-center justify-center border-2 border-dashed border-border-light rounded-sm opacity-30">
                  <span className="text-[10px] font-black uppercase tracking-tighter">Boş</span>
                </div>
              ) : (
                dayReservations.map((res) => (
                  <div
                    key={res.id}
                    onClick={() => onReservationClick(res)}
                    className="p-2 bg-bg-surface border border-border-light rounded-sm hover:border-primary-main transition-all cursor-pointer shadow-sm group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-black text-primary-main tabular-nums">
                        {format(new Date(res.reservation_time), 'HH:mm')}
                      </span>
                      <span className="text-[9px] font-bold text-text-muted">
                        {res.table?.name}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-text-primary uppercase truncate">
                      {res.customer?.first_name} {res.customer?.last_name}
                    </p>
                    <div className="flex items-center gap-1 mt-1 opacity-60">
                      <div className="w-1 h-1 rounded-full bg-text-muted" />
                      <span className="text-[9px] font-medium text-text-muted">{res.guest_count} Kişi</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
