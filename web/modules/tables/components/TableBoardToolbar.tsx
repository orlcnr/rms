'use client'

import React from 'react'
import { FilterSection } from '@/modules/shared/components/layout'
import { cn } from '@/modules/shared/utils/cn'
import { Search, X } from 'lucide-react'
interface TableBoardToolbarProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    stats: {
        total: number
        available: number
        occupied: number
    }
    summaryDate: string
    socketConnected: boolean
    children?: React.ReactNode // For AreaTabs
}

export function TableBoardToolbar({
    searchQuery,
    onSearchChange,
    stats,
    summaryDate,
    socketConnected,
    children
}: TableBoardToolbarProps) {
    return (
        <FilterSection className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 w-full">
                    {/* Search Field */}
                    <div className="relative w-[400px] max-w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="MASA ADI VEYA ALAN ARA..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-[11px] font-black uppercase tracking-wider border border-border-light bg-bg-app rounded-sm focus:outline-none focus:border-primary-main placeholder:text-text-muted transition-all shadow-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Stats Summary - Matches Order/Reservation Style */}
                    <div className="hidden xl:flex items-center gap-6 ml-auto px-6 border-l border-border-light">
                        <div className="flex flex-col justify-center text-right border-r border-border-light pr-6">
                            <p className="text-sm font-black text-orange-500 uppercase tracking-widest leading-none">
                                {summaryDate}
                            </p>
                            <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    socketConnected ? "bg-success-main animate-pulse" : "bg-danger-main"
                                )} />
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">
                                    Günün Özeti
                                </p>
                            </div>
                        </div>
                        <div className="text-center w-16">
                            <p className="text-sm font-black text-text-primary tabular-nums">{stats.total}</p>
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Toplam</p>
                        </div>
                        <div className="text-center w-16">
                            <p className="text-sm font-black text-success-main tabular-nums">{stats.available}</p>
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Boş</p>
                        </div>
                        <div className="text-center w-16">
                            <p className="text-sm font-black text-danger-main tabular-nums">{stats.occupied}</p>
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Dolu</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Render Area Categories below if provided */}
            {children && (
                <div className="pt-4 border-t border-border-light">
                    {children}
                </div>
            )}
        </FilterSection>
    )
}
