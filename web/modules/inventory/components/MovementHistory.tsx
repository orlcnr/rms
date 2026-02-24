'use client'

import React from 'react'
import { History } from 'lucide-react'
import { StockMovement, MovementType } from '../types'
import { MovementTypeBadge, MovementQuantity } from '@/modules/shared/components/MovementTypeBadge'
import { EmptyState } from '@/modules/shared/components/EmptyState'
import { formatDateTime } from '@/modules/shared/utils/date'
import { formatNumericDisplay } from '@/modules/shared/utils/numeric'
import { cn } from '@/modules/shared/utils/cn'

interface MovementHistoryProps {
    movements: StockMovement[]
}

export function MovementHistory({ movements }: MovementHistoryProps) {
    if (movements.length === 0) {
        return (
            <EmptyState
                icon={<History size={32} />}
                title="Hareket Bulunamadı"
                description="Herhangi bir stok hareketi kaydedilmemiş."
                className="bg-bg-surface border border-border-light rounded shadow-sm py-20"
            />
        )
    }

    return (
        <div className="overflow-x-auto border border-border-light rounded-sm bg-bg-surface">
            <table className="w-full text-left border-collapse min-w-max">
                <thead>
                    <tr className="border-b border-border-light bg-bg-muted/30">
                        <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary">TARİH</th>
                        <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary">MALZEME</th>
                        <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary text-center">TİP</th>
                        <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary text-right">MİKTAR</th>
                        <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary text-right">BİRİM FİYAT</th>
                        <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary">AÇIKLAMA</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-light bg-bg-surface">
                    {movements.map((m) => {
                        return (
                            <tr 
                                key={m.id} 
                                className={cn(
                                    "group hover:bg-bg-hover transition-colors",
                                    m.type === MovementType.IN ? "border-l-4 border-l-success-main" :
                                    m.type === MovementType.OUT ? "border-l-4 border-l-danger-main" : 
                                    "border-l-4 border-l-primary-main"
                                )}
                            >
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2 text-text-secondary">
                                        <span className="text-sm font-semibold tabular-nums">
                                            {formatDateTime(m.created_at || '')}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <p className="text-sm font-semibold text-text-primary uppercase">
                                        {m.ingredient?.name || 'BELİRSİZ'}
                                    </p>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <MovementTypeBadge type={m.type} size="sm" />
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <MovementQuantity 
                                        type={m.type}
                                        quantity={m.quantity}
                                        unit={m.ingredient?.unit}
                                    />
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <span className="text-sm font-semibold text-text-secondary">
                                        {m.unit_price 
                                            ? `${formatNumericDisplay(m.unit_price)} ₺` 
                                            : '-'}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2 text-text-muted">
                                        <p className="text-sm font-medium uppercase tracking-tight whitespace-normal">
                                            {m.reason || 'AÇIKLAMA YOK'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
