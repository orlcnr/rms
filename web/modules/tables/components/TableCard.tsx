'use client'

import React, { useState, useEffect } from 'react'
import {
    Users,
    QrCode,
    MoreVertical,
    Clock,
    Armchair,
    Plus,
    Calendar,
    Ban,
} from 'lucide-react'
import { Table, TableStatus } from '../types'
import { Button } from '@/modules/shared/components/Button'
import { cn } from '@/modules/shared/utils/cn'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { TableReservationBullet } from './TableReservationBullet'

interface TableCardProps {
    table: Table
    isAdminMode?: boolean
    onEdit?: (table: Table) => void
    onDelete?: (id: string) => void
    onShowQr?: (table: Table) => void
    onTableClick?: (table: Table) => void
}

const STATUS_THEME = {
    [TableStatus.AVAILABLE]: {
        card: 'bg-bg-surface border-border-light hover:border-primary-main/40',
        header: 'bg-transparent border-transparent',
        bottomLabel: 'text-text-muted/70',
        bottomIcon: Armchair,
        label: 'Boş',
    },
    [TableStatus.OCCUPIED]: {
        card: 'bg-bg-surface border-orange-300/70 hover:border-orange-400',
        header: 'bg-orange-50/80 border-orange-200/60',
        bottomLabel: 'text-primary-main',
        bottomIcon: Plus,
        label: 'Detay',
    },
    [TableStatus.RESERVED]: {
        card: 'bg-bg-surface border-warning-main/50 hover:border-warning-main/70',
        header: 'bg-warning-subtle/20 border-warning-main/30',
        bottomLabel: 'text-warning-main',
        bottomIcon: Calendar,
        label: 'Rezerve',
    },
    [TableStatus.OUT_OF_SERVICE]: {
        card: 'bg-bg-muted/60 border-border-light hover:border-text-muted/40',
        header: 'bg-bg-muted border-border-light',
        bottomLabel: 'text-text-muted',
        bottomIcon: Ban,
        label: 'Kapalı',
    },
} as const

export function TableCard({ table, isAdminMode = false, onEdit, onDelete, onShowQr, onTableClick }: TableCardProps) {
    const isOccupied = table.status === TableStatus.OCCUPIED
    const theme = STATUS_THEME[table.status] || STATUS_THEME[TableStatus.AVAILABLE]
    const BottomIcon = theme.bottomIcon
    const [now, setNow] = useState(new Date())
    const todayKey = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
    }).format(now)

    const hasReservationToday = (table.reservations || []).some((reservation) => {
        const reservationDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Istanbul',
        }).format(new Date(reservation.reservation_time))
        return reservationDate === todayKey
    })

    // Update time every minute for duration calculation
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000)
        return () => clearInterval(interval)
    }, [])

    // Calculate elapsed time - format: "170:09" or "2s 10dk"
    const getElapsedTime = (): string => {
        if (!table.active_order?.created_at) return ''

        const createdAt = new Date(table.active_order.created_at)
        const diffMs = now.getTime() - createdAt.getTime()
        const diffSeconds = Math.floor(diffMs / 1000)

        if (diffSeconds < 60) {
            return `${diffSeconds} sn`
        }

        const diffMinutes = Math.floor(diffSeconds / 60)

        if (diffMinutes < 60) {
            return `${diffMinutes} dk`
        }

        const hours = Math.floor(diffMinutes / 60)
        const minutes = diffMinutes % 60

        if (hours < 10) {
            return `${hours}:${minutes.toString().padStart(2, '0')}`
        }

        return `${hours}s ${minutes}dk`
    }

    const handleClick = () => {
        if (!isAdminMode && onTableClick) {
            onTableClick(table)
        }
    }

    return (
        <div
            className={cn(
                "group relative p-4 rounded-sm border transition-all duration-200 min-h-[164px]",
                theme.card,
                !isAdminMode && "cursor-pointer hover:shadow-md hover:shadow-primary-main/10"
            )}
            onClick={handleClick}
        >
            {/* Header / Actions */}
            <div className="flex items-start justify-between mb-3">
                <div className={cn(
                    "flex items-center gap-0.5 transition-all duration-200",
                    isAdminMode ? "opacity-0 group-hover:opacity-100" : "hidden"
                )}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onShowQr?.(table)}
                        className="p-1"
                        title="QR Kod"
                    >
                        <QrCode className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit?.(table)}
                        className="p-1"
                    >
                        <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Content: Title + Price + Area Badge */}
            <div
                className={cn(
                    "mb-10 rounded-sm px-3 py-2 -mx-1",
                    "border",
                    theme.header
                )}
            >
                <div className="flex items-start justify-between gap-3 min-h-[34px]">
                    <h3 className={cn(
                        "text-xl font-extrabold tracking-tight transition-colors duration-200 text-text-primary group-hover:text-primary-main leading-tight"
                    )}>
                        {table.name}
                    </h3>
                    {isOccupied && table.active_order && (
                        <span className="text-base md:text-lg font-black text-text-primary tabular-nums">
                            {formatCurrency(table.active_order.total_price)}
                        </span>
                    )}
                </div>

                <div className="mt-2 inline-flex items-center rounded-full bg-bg-app border border-border-light px-2.5 py-1">
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                        {table.area?.name || 'Genel Alan'}
                    </span>
                </div>
                {hasReservationToday && (
                    <div className="mt-2">
                        <TableReservationBullet tableId={table.id} />
                    </div>
                )}
            </div>

            {/* Bottom: Grouped infos */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-text-secondary">
                    <div className="flex items-center gap-1.5">
                        <Users className={cn(
                            "w-3.5 h-3.5",
                            isOccupied ? "text-primary-main" : "text-text-muted"
                        )} />
                        <span className={cn(
                            "text-[11px] font-bold",
                            isOccupied ? "text-text-primary" : "text-text-muted/80"
                        )}>
                            {table.capacity}
                        </span>
                    </div>
                    {isOccupied && table.active_order && (
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-text-muted" />
                            <span className="text-[11px] font-bold text-text-muted">{getElapsedTime()}</span>
                        </div>
                    )}
                </div>

                {isOccupied ? (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation()
                            handleClick()
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-primary-main/10 border border-primary-main/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary-main hover:bg-primary-main/15 transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        Detay
                    </button>
                ) : (
                    <div className={cn(
                        "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider",
                        theme.bottomLabel
                    )}>
                        <BottomIcon className="w-3.5 h-3.5" />
                        {theme.label}
                    </div>
                )}
            </div>
        </div>
    )
}
