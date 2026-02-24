'use client'

import React from 'react'
import { User, ChevronRight, Calendar, ArrowRight } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'

const RESERVATIONS = [
    { id: 1, name: 'AHMET DEMİR', count: '6 KİŞİ', time: '14:30', status: 'onayli', statusLabel: 'ONAYLI' },
    { id: 2, name: 'MELİSA KORKMAZ', count: '8 KİŞİ', time: '19:00', status: 'onayli', statusLabel: 'ONAYLI' },
    { id: 3, name: 'VEDAT KAYA', count: '4 KİŞİ', time: '20:00', status: 'beklemede', statusLabel: 'BEKLEMEDE' },
    { id: 4, name: 'SİBEL YURT', count: '2 KİŞİ', time: '21:30', status: 'onayli', statusLabel: 'ONAYLI' },
]

export function UpcomingReservations() {
    return (
        <section className="bg-bg-surface border border-border-light rounded-sm shadow-sm flex flex-col h-full">
            <div className="p-4 pb-2.5 border-b border-border-light flex-shrink-0">
                <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-info-main rounded-full" />
                            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.15em]">REZERVASYONLAR</h2>
                        </div>
                        <button className="text-xs font-semibold text-text-muted hover:text-primary-main transition-colors tracking-widest uppercase flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-primary-main" aria-label="Tüm rezervasyonları görüntüle">
                            TÜM REZERVASYONLAR <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
            </div>

            <div className="overflow-auto max-h-[320px] scrollbar-thin scrollbar-thumb-border-medium flex-1">
                <div className="divide-y divide-border-light/50">
                    {RESERVATIONS.map((res) => (
                        <div
                            key={res.id}
                            className="px-4 py-3 hover:bg-bg-muted/50 transition-colors duration-150 cursor-pointer group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-sm bg-bg-muted flex items-center justify-center text-text-muted border border-border-light group-hover:border-border-medium transition-colors flex-shrink-0">
                                    <User size={16} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-semibold text-text-primary uppercase tracking-tight truncate leading-none">
                                        {res.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-text-muted font-semibold tracking-widest uppercase">{res.count}</span>
                                        <span className="w-0.5 h-0.5 rounded-full bg-border-medium" />
                                        <span className="text-xs text-info-main font-semibold tabular-nums tracking-widest">{res.time}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={cn(
                                    "text-xs font-semibold px-2 py-1 rounded-sm uppercase tracking-wider",
                                    res.status === 'onayli' ? 'bg-success-bg text-success-main' : 'bg-warning-bg text-warning-main'
                                )}>
                                    {res.statusLabel}
                                </span>
                                <ChevronRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer - Data info */}
            <div className="mt-auto p-4 border-t border-border-light bg-bg-muted/30">
                <p className="text-xs text-text-muted font-semibold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-main" />
                    4 MASA TOPLAM 12 KİŞİ REZERVASYON VAR
                </p>
            </div>

            </section>
    )
}
