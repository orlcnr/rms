'use client'

import React from 'react'
import { cn } from '@/modules/shared/utils/cn'

interface ProductsStatsSummaryProps {
    summaryDate: string
    socketConnected: boolean
    totalProducts: number
    categoryCount: number
}

export function ProductsStatsSummary({
    summaryDate,
    socketConnected,
    totalProducts,
    categoryCount,
}: ProductsStatsSummaryProps) {
    return (
        <div className="hidden xl:flex items-center gap-6 ml-auto px-6 border-l border-border-light">
            <div className="flex flex-col justify-center text-right border-r border-border-light pr-6">
                <p className="text-sm font-black text-orange-500 uppercase tracking-widest leading-none">
                    {summaryDate}
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-1.5">
                    <div className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        socketConnected ? 'bg-success-main animate-pulse' : 'bg-danger-main'
                    )} />
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">
                        Günün Özeti
                    </p>
                </div>
            </div>
            <div className="text-center w-16">
                <p className="text-sm font-black text-text-primary tabular-nums">{totalProducts}</p>
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Ürün</p>
            </div>
            <div className="text-center w-16">
                <p className="text-sm font-black text-success-main tabular-nums">{categoryCount}</p>
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter">Kategori</p>
            </div>
        </div>
    )
}
