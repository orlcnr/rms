'use client'

import { useEffect, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Category, MenuItem, PaginatedResponse, ProductFilters } from '../types'

interface UseProductsSyncArgs {
    mounted: boolean
    initialCategories: Category[]
    initialProductsResponse: PaginatedResponse<MenuItem>
    setCategories: Dispatch<SetStateAction<Category[]>>
    applyProductsResponse: (
        response: PaginatedResponse<MenuItem>,
        shouldScheduleAutoFill?: boolean,
    ) => void
    refreshProducts: (showOverlay?: boolean) => Promise<boolean>
    debouncedSearch: string
    activeCategoryId: string | null
    filters: ProductFilters
}

export function useProductsSync({
    mounted,
    initialCategories,
    initialProductsResponse,
    setCategories,
    applyProductsResponse,
    refreshProducts,
    debouncedSearch,
    activeCategoryId,
    filters,
}: UseProductsSyncArgs) {
    const hasMountedRefreshRef = useRef(false)
    const hasHandledInitialFilterEffectRef = useRef(false)

    useEffect(() => {
        setCategories(initialCategories)
    }, [initialCategories, setCategories])

    useEffect(() => {
        applyProductsResponse(initialProductsResponse, mounted && hasMountedRefreshRef.current)
    }, [applyProductsResponse, initialProductsResponse, mounted])

    useEffect(() => {
        if (!mounted || hasMountedRefreshRef.current) return

        hasMountedRefreshRef.current = true
        void refreshProducts(true)
    }, [mounted, refreshProducts])

    useEffect(() => {
        if (!mounted) return

        if (!hasHandledInitialFilterEffectRef.current) {
            hasHandledInitialFilterEffectRef.current = true
            return
        }

        void refreshProducts(true)
    }, [mounted, debouncedSearch, activeCategoryId, filters, refreshProducts])

    useEffect(() => {
        if (!mounted) return

        const handleVisibilityOrFocus = () => {
            if (document.visibilityState === 'visible') {
                void refreshProducts(true)
            }
        }

        window.addEventListener('focus', handleVisibilityOrFocus)
        document.addEventListener('visibilitychange', handleVisibilityOrFocus)

        return () => {
            window.removeEventListener('focus', handleVisibilityOrFocus)
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
        }
    }, [mounted, refreshProducts])
}
