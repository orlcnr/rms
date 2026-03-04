'use client'

import { useMemo, useState } from 'react'
import { useDebounce } from '@/modules/shared/hooks/useDebounce'
import { ProductFilters } from '../types'

export function useProductFilters() {
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebounce(searchQuery, 300)
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState<ProductFilters>({
        stockStatus: 'all',
        salesStatus: 'all',
        minPrice: undefined,
        maxPrice: undefined,
    })

    const activeFilterCount = useMemo(() => {
        let count = 0

        if (filters.stockStatus !== 'all') count += 1
        if (filters.salesStatus !== 'all') count += 1
        if (filters.minPrice !== undefined) count += 1
        if (filters.maxPrice !== undefined) count += 1

        return count
    }, [filters])

    const clearFilters = () => {
        setFilters({
            stockStatus: 'all',
            salesStatus: 'all',
            minPrice: undefined,
            maxPrice: undefined,
        })
    }

    return {
        activeCategoryId,
        setActiveCategoryId,
        searchQuery,
        setSearchQuery,
        debouncedSearch,
        showFilters,
        setShowFilters,
        filters,
        setFilters,
        activeFilterCount,
        clearFilters,
    }
}
