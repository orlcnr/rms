'use client'

import React, { useState, useEffect } from 'react'
import { Users, QrCode, MoreVertical, Clock } from 'lucide-react'
import { Table, TableStatus } from '../types'
import { TABLE_STATUS_STYLES } from '../enums/table-status.enum'
import { Button } from '@/modules/shared/components/Button'
import { cn } from '@/modules/shared/utils/cn'
import { formatCurrency } from '@/modules/shared/utils/numeric'

interface TableCardProps {
    table: Table
    isAdminMode?: boolean
    onEdit?: (table: Table) => void
    onDelete?: (id: string) => void
    onShowQr?: (table: Table) => void
    onTableClick?: (table: Table) => void
}

export function TableCard({ table, isAdminMode = false, onEdit, onDelete, onShowQr, onTableClick }: TableCardProps) {
    const statusStyle = TABLE_STATUS_STYLES[table.status]
    const isOccupied = table.status === TableStatus.OCCUPIED
    const [now, setNow] = useState(new Date())

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
                "group relative p-4 rounded-sm border transition-all duration-200 border-l-[4px]",
                isOccupied
                    ? "bg-danger-subtle/20 border-l-danger-main border-y-danger-main/30 border-r-danger-main/30"
                    : "bg-bg-surface border-l-success-main border-y-border-light border-r-border-light hover:border-primary-main",
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

            {/* Content */}
            <div className="mb-6">
                <h3 className={cn(
                    "text-lg  tracking-tight transition-colors duration-200 text-text-primary group-hover:text-primary-main"
                )}>
                    {table.name}
                </h3>
                <p className="text-[9px] text-text-muted font-semibold uppercase tracking-widest">
                    {table.area?.name || 'GENEL ALAN'}
                </p>
            </div>

            {/* Bottom: Price (left) + Time & Capacity (right) */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                {/* Price - larger and on the left */}
                {isOccupied && table.active_order && (
                    <div className=" text-xl text-text-primary">
                        {formatCurrency(table.active_order.total_price)}
                    </div>
                )}
                {/* Right side: Time and Capacity */}
                <div className="flex items-center gap-3 text-text-muted">
                    {isOccupied && table.active_order && (
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{getElapsedTime()}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span className="text-[10px] font-bold">{table.capacity}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
