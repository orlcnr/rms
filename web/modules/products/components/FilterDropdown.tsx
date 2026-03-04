'use client'

import React from 'react'
import { FILTER_OPTIONS, ProductFilters, SalesStatus, StockStatus } from '../types'
import { cn } from '@/modules/shared/utils/cn'

interface FilterDropdownProps {
    show: boolean
    filters: ProductFilters
    setFilters: React.Dispatch<React.SetStateAction<ProductFilters>>
    activeFilterCount: number
    clearFilters: () => void
}

export function FilterDropdown({
    show,
    filters,
    setFilters,
    activeFilterCount,
    clearFilters,
}: FilterDropdownProps) {
    if (!show) return null

    return (
        <div className="absolute top-full left-0 mt-2 w-80 bg-bg-surface border border-border-light rounded-sm shadow-lg z-20 p-4 space-y-4">
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Stok Durumu</label>
                <div className="flex flex-wrap gap-2">
                    {FILTER_OPTIONS.stockStatus.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setFilters((current) => ({
                                ...current,
                                stockStatus: option.value as StockStatus,
                            }))}
                            className={cn(
                                'px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-sm border transition-all',
                                filters.stockStatus === option.value
                                    ? 'bg-primary-main border-primary-main text-text-inverse'
                                    : 'bg-bg-app border-border-light text-text-secondary hover:border-primary-main'
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Satış Durumu</label>
                <div className="flex flex-wrap gap-2">
                    {FILTER_OPTIONS.salesStatus.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setFilters((current) => ({
                                ...current,
                                salesStatus: option.value as SalesStatus,
                            }))}
                            className={cn(
                                'px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-sm border transition-all',
                                filters.salesStatus === option.value
                                    ? 'bg-primary-main border-primary-main text-text-inverse'
                                    : 'bg-bg-app border-border-light text-text-secondary hover:border-primary-main'
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Fiyat Aralığı (TL)</label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        placeholder="Min"
                        className="w-full bg-bg-app border border-border-light rounded-sm py-2 px-3 text-text-primary text-xs font-bold outline-none focus:border-primary-main transition-all"
                        value={filters.minPrice || ''}
                        onChange={(e) => setFilters((current) => ({
                            ...current,
                            minPrice: e.target.value ? Number(e.target.value) : undefined,
                        }))}
                    />
                    <span className="text-text-muted">-</span>
                    <input
                        type="number"
                        placeholder="Max"
                        className="w-full bg-bg-app border border-border-light rounded-sm py-2 px-3 text-text-primary text-xs font-bold outline-none focus:border-primary-main transition-all"
                        value={filters.maxPrice || ''}
                        onChange={(e) => setFilters((current) => ({
                            ...current,
                            maxPrice: e.target.value ? Number(e.target.value) : undefined,
                        }))}
                    />
                </div>
            </div>

            {activeFilterCount > 0 && (
                <button
                    onClick={clearFilters}
                    className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-danger-main hover:text-danger-hover transition-all"
                >
                    Temizle ({activeFilterCount})
                </button>
            )}
        </div>
    )
}
