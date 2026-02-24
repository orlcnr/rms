'use client'

import React from 'react'
import { Table } from '../types'
import { TableCard } from './TableCard'
import { EmptyState } from '@/modules/shared/components/EmptyState'

interface TableGridProps {
    tables: Table[]
    isAdminMode?: boolean
    onEdit?: (table: Table) => void
    onDelete?: (id: string) => void
    onShowQr?: (table: Table) => void
    onTableClick?: (table: Table) => void
}

export function TableGrid({ tables, isAdminMode = false, onEdit, onDelete, onShowQr, onTableClick }: TableGridProps) {
    if (tables.length === 0) {
        return (
            <EmptyState
                title="Masa Bulunamadı"
                description="Bu alanda henüz hiç masa tanımlanmamış. Yeni bir masa ekleyerek başlayabilirsiniz."
                icon={
                    <div className="w-16 h-16 rounded-sm bg-bg-muted flex items-center justify-center">
                        <span className="text-3xl">🪑</span>
                    </div>
                }
            />
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((table) => (
                <TableCard
                    key={table.id}
                    table={table}
                    isAdminMode={isAdminMode}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onShowQr={onShowQr}
                    onTableClick={onTableClick}
                />
            ))}
        </div>
    )
}
