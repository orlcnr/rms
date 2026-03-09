'use client'

import React from 'react'
import { ArrowRight, ChevronRight, User } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/modules/shared/utils/cn'
import { Button } from '@/modules/shared/components/Button'
import { ReservationItem } from '../types'

interface UpcomingReservationsProps {
  reservations: ReservationItem[]
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

function statusLabel(status: ReservationItem['status']) {
  switch (status) {
    case 'confirmed':
      return 'ONAYLI'
    case 'pending':
      return 'BEKLEMEDE'
    case 'cancelled':
      return 'İPTAL'
    case 'completed':
      return 'TAMAMLANDI'
    case 'no_show':
      return 'GELMEDİ'
    default:
      return status.toUpperCase()
  }
}

function statusClass(status: ReservationItem['status']) {
  if (status === 'confirmed' || status === 'completed') return 'bg-success-bg text-success-main'
  if (status === 'pending') return 'bg-warning-bg text-warning-main'
  return 'bg-danger-bg text-danger-main'
}

export function UpcomingReservations({ reservations, isLoading, error, onRetry }: UpcomingReservationsProps) {
  return (
    <section className="bg-bg-surface border border-border-light rounded-sm shadow-sm flex flex-col h-full">
      <div className="p-4 pb-2.5 border-b border-border-light flex-shrink-0">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 bg-info-main rounded-full" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.15em]">REZERVASYONLAR</h2>
          </div>
          <Link
            href="/reservations"
            className="text-xs font-semibold text-text-muted hover:text-primary-main transition-colors tracking-widest uppercase flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-primary-main"
            aria-label="Tüm rezervasyonları görüntüle"
          >
            TÜM REZERVASYONLAR <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Bugünün rezervasyonları</p>
      </div>

      {error && !isLoading ? (
        <div className="p-4 border-b border-border-light/50 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-danger-main">{error}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>TEKRAR DENE</Button>
        </div>
      ) : null}

      <div className="overflow-auto max-h-[320px] scrollbar-thin scrollbar-thumb-border-medium flex-1">
        <div className="divide-y divide-border-light/50">
          {isLoading && reservations.length === 0 ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="px-4 py-4"><div className="h-6 bg-bg-muted rounded-sm animate-pulse" /></div>
            ))
          ) : reservations.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-muted text-xs font-bold uppercase tracking-wider">REZERVASYON BULUNAMADI</div>
          ) : (
            reservations.map((res) => (
              <div key={res.id} className="px-4 py-3 hover:bg-bg-muted/50 transition-colors duration-150 cursor-pointer group flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-sm bg-bg-muted flex items-center justify-center text-text-muted border border-border-light group-hover:border-border-medium transition-colors flex-shrink-0">
                    <User size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary uppercase tracking-tight truncate leading-none">{res.guestName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-text-muted font-semibold tracking-widest uppercase">{res.guestCount} KİŞİ</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-border-medium" />
                      <span className="text-xs text-text-secondary font-semibold tracking-widest uppercase">
                        MASA: {res.tableCode}
                      </span>
                      <span className="w-0.5 h-0.5 rounded-full bg-border-medium" />
                      <span className="text-xs text-info-main font-semibold tabular-nums tracking-widest">{res.time}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn('text-xs font-semibold px-2 py-1 rounded-sm uppercase tracking-wider', statusClass(res.status))}>
                    {statusLabel(res.status)}
                  </span>
                  <ChevronRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-auto p-4 border-t border-border-light bg-bg-muted/30">
        <p className="text-xs text-text-muted font-semibold uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-main" />
          BUGÜN İÇİN TOPLAM {reservations.length} REZERVASYON
        </p>
      </div>
    </section>
  )
}
