'use client'

import React from 'react'
import { FilterSection } from '@/modules/shared/components/layout'
import { BoardFilters } from './BoardFilters'
import { BoardFilters as BoardFiltersType, ORDER_STATUS_LABELS, OrderStatus } from '../types'
import { cn } from '@/modules/shared/utils/cn'

interface OrderBoardToolbarProps {
    filters: BoardFiltersType
    onFilterChange: (filters: Partial<BoardFiltersType>) => void
    onClearFilters: () => void
    stats: {
        total: number
        pending: number
        preparing: number
        ready: number
        tables: number
    }
    summaryDate: string
    socketConnected: boolean
}

export function OrderBoardToolbar({
    filters,
    onFilterChange,
    onClearFilters,
    stats,
    summaryDate,
    socketConnected
}: OrderBoardToolbarProps) {
    return (
        <FilterSection className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 w-full">
                <BoardFilters
                    filters={filters}
                    onFilterChange={onFilterChange}
                    onClearFilters={onClearFilters}
                />

                {/* Stats Summary - Matches Reservation Style */}
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
                    <div className="text-center">
                        <p className="text-sm font-black text-text-primary tabular-nums">{stats.total}</p>
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Sipariş</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-black text-warning-main tabular-nums">{stats.pending}</p>
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">{ORDER_STATUS_LABELS[OrderStatus.PENDING]}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-black text-primary-main tabular-nums">{stats.preparing}</p>
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">{ORDER_STATUS_LABELS[OrderStatus.PREPARING]}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-black text-success-main tabular-nums">{stats.ready}</p>
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">{ORDER_STATUS_LABELS[OrderStatus.READY]}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-black text-text-primary tabular-nums">{stats.tables}</p>
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Aktif Masa</p>
                    </div>
                </div>
            </div>
        </FilterSection>
    )
}
