'use client'

import React, { useMemo } from 'react'
import { Reservation } from '../types'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday as isDateToday } from 'date-fns'
import { tr } from 'date-fns/locale'
import { cn } from '@/modules/shared/utils/cn'

interface ReservationMonthlyViewProps {
  reservations: Reservation[]
  selectedDate: string
  onDateSelect: (date: string) => void
}

export function ReservationMonthlyView({
  reservations,
  selectedDate,
  onDateSelect,
}: ReservationMonthlyViewProps) {
  const currentDate = new Date(selectedDate)

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentDate])

  const reservationCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    reservations.forEach(res => {
      const dateKey = res.reservation_time.split('T')[0]
      counts[dateKey] = (counts[dateKey] || 0) + 1
    })
    return counts
  }, [reservations])

  return (
    <div className="flex flex-col h-full bg-bg-surface border border-border-light rounded-sm overflow-hidden">
      {/* Weekdays Header */}
      <div className="grid grid-cols-7 border-b border-border-light bg-bg-muted/30">
        {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(day => (
          <div key={day} className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-text-muted border-r border-border-light last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 flex-1">
        {days.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const count = reservationCounts[dateKey] || 0
          const isSelected = isSameDay(day, currentDate)
          const isToday = isDateToday(day)
          const isCurrentMonth = isSameMonth(day, currentDate)

          return (
            <div
              key={dateKey}
              onClick={() => onDateSelect(dateKey)}
              className={cn(
                "min-h-[100px] p-2 border-r border-b border-border-light flex flex-col gap-1 transition-all cursor-pointer group",
                idx % 7 === 6 && "border-r-0",
                !isCurrentMonth && "bg-bg-muted/20 opacity-40",
                isSelected && "bg-primary-main/5 ring-1 ring-primary-main inset-0 z-10 shadow-lg shadow-primary-main/5",
                "hover:bg-bg-muted/40"
              )}
            >
              <div className="flex justify-between items-start">
                <span className={cn(
                  "text-xs font-black tabular-nums h-6 w-6 flex items-center justify-center rounded-full transition-colors",
                  isToday && !isSelected && "bg-primary-main/10 text-primary-main",
                  isSelected && "bg-primary-main text-white"
                )}>
                  {format(day, 'd')}
                </span>

                {count > 0 && (
                  <span className="bg-primary-main/10 text-primary-main text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </div>

              {/* Mini Preview */}
              <div className="flex-1 overflow-hidden">
                {reservations
                  .filter(r => r.reservation_time.split('T')[0] === dateKey)
                  .slice(0, 3)
                  .map(res => (
                    <div key={res.id} className="text-[8px] font-bold text-text-secondary truncate bg-bg-muted/50 mb-0.5 px-1 py-0.5 rounded-[2px] border-l border-primary-main">
                      {format(new Date(res.reservation_time), 'HH:mm')} {res.customer?.last_name}
                    </div>
                  ))
                }
                {count > 3 && (
                  <div className="text-[8px] font-black text-text-muted opacity-60 pl-1 mt-0.5">
                    + {count - 3} daha...
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
