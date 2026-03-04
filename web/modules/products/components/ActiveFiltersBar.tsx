'use client'

import React from 'react'
import { X } from 'lucide-react'
import { FILTER_OPTIONS, ProductFilters } from '../types'

interface ActiveFiltersBarProps {
    filters: ProductFilters
    setFilters: React.Dispatch<React.SetStateAction<ProductFilters>>
}

export function ActiveFiltersBar({ filters, setFilters }: ActiveFiltersBarProps) {
    const hasActiveFilters = (
        filters.stockStatus !== 'all' ||
        filters.salesStatus !== 'all' ||
        filters.minPrice !== undefined ||
        filters.maxPrice !== undefined
    )

    if (!hasActiveFilters) return null

    return (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-light">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Aktif Filtreler:</span>
            {filters.stockStatus !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-subtle text-primary-main text-[10px] font-black uppercase rounded-sm">
                    Stok: {FILTER_OPTIONS.stockStatus.find((option) => option.value === filters.stockStatus)?.label}
                    <button onClick={() => setFilters((current) => ({ ...current, stockStatus: 'all' }))} className="hover:text-primary-hover">
                        <X size={10} />
                    </button>
                </span>
            )}
            {filters.salesStatus !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-subtle text-primary-main text-[10px] font-black uppercase rounded-sm">
                    Satış: {FILTER_OPTIONS.salesStatus.find((option) => option.value === filters.salesStatus)?.label}
                    <button onClick={() => setFilters((current) => ({ ...current, salesStatus: 'all' }))} className="hover:text-primary-hover">
                        <X size={10} />
                    </button>
                </span>
            )}
            {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-subtle text-primary-main text-[10px] font-black uppercase rounded-sm">
                    Fiyat: {filters.minPrice || '0'} - {filters.maxPrice || '∞'} TL
                    <button
                        onClick={() => setFilters((current) => ({
                            ...current,
                            minPrice: undefined,
                            maxPrice: undefined,
                        }))}
                        className="hover:text-primary-hover"
                    >
                        <X size={10} />
                    </button>
                </span>
            )}
        </div>
    )
}
