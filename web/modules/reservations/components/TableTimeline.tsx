'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Clock, AlertCircle, Check } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'
import { calculateTableOccupancy, ConflictCheckReservation } from '../utils/reservation.utils'

interface TableTimelineProps {
  tableId: string
  tableName: string
  date: string // YYYY-MM-DD
  selectedTime?: string // ISO string
  reservations: ConflictCheckReservation[]
  className?: string
}

export function TableTimeline({
  tableId,
  tableName,
  date,
  selectedTime,
  reservations,
  className
}: TableTimelineProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const occupancy = React.useMemo(() => {
    if (!tableId || !date) return []
    return calculateTableOccupancy(reservations, tableId, date, selectedTime)
  }, [reservations, tableId, date, selectedTime])

  if (!mounted) {
    return (
      <div className={cn("flex flex-col h-full border-l border-border-light bg-bg-muted/5 animate-pulse", className)} />
    )
  }

  if (!tableId) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full text-text-muted p-8 text-center border-l border-border-light bg-bg-muted/5", className)}>
        <Clock className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-medium">Masa seçildiğinde günlük akış burada görünecek</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full border-l border-border-light bg-bg-muted/5", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light bg-bg-surface">
        <h3 className="text-[9px] font-black text-text-primary uppercase tracking-[0.2em] mb-0.5">
          GÜNLÜK AKIŞ
        </h3>
        <p className="text-xs font-bold text-primary-main truncate">{tableName}</p>
      </div>

      {/* Timeline List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-style">
        {occupancy.map((slot) => {
          const isBusy = slot.status === 'busy'
          const isConflict = slot.status === 'selected-conflict'
          
          return (
            <div
              key={slot.time}
              className={cn(
                "group relative flex items-center gap-3 px-2 py-1 rounded-sm border transition-all duration-200",
                slot.status === 'free' 
                  ? "bg-bg-surface border-border-light hover:border-primary-main/30" 
                  : isConflict 
                    ? "bg-danger-main/10 border-danger-main animate-pulse" 
                    : "bg-bg-muted border-transparent opacity-80"
              )}
            >
              {/* Time */}
              <span className={cn(
                "text-[10px] font-black tabular-nums min-w-[35px]",
                isBusy || isConflict ? "text-text-primary" : "text-text-muted"
              )}>
                {slot.time}
              </span>

              {/* Status Indicator */}
              <div className="flex-1 flex items-center justify-between">
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-tight",
                  isConflict ? "text-danger-main" : isBusy ? "text-text-secondary" : "text-text-muted opacity-50"
                )}>
                  {isConflict ? "ÇAKIŞMA" : isBusy ? "DOLU" : "MÜSAİT"}
                </span>

                {isConflict ? (
                  <AlertCircle className="w-3 h-3 text-danger-main" />
                ) : isBusy ? (
                  <Clock className="w-3 h-3 text-text-muted" />
                ) : (
                  <Check className="w-3 h-3 text-success-main opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-border-light bg-bg-surface">
        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-tighter">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-bg-surface border border-border-light" />
            <span className="text-text-muted">Boş</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-bg-muted" />
            <span className="text-text-muted">Dolu</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-danger-main animate-pulse" />
            <span className="text-danger-main">Çakışma</span>
          </div>
        </div>
      </div>
    </div>
  )
}
