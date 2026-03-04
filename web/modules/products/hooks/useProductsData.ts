'use client'

import { useCallback, useRef, useState } from 'react'
import { useIntersectionObserver } from '@/modules/shared/hooks/useIntersectionObserver'
import { productsApi } from '../services/products.service'
import { MenuItem, PaginatedResponse, ProductFilters } from '../types'

const PRODUCTS_PAGE_LIMIT = 12
const AUTO_FILL_THRESHOLD_PX = 48
const MAX_AUTO_FILL_PASSES = 10

interface UseProductsDataArgs {
    restaurantId: string
    mounted: boolean
    initialProductsResponse: PaginatedResponse<MenuItem>
    debouncedSearch: string
    activeCategoryId: string | null
    filters: ProductFilters
}

export function useProductsData({
    restaurantId,
    mounted,
    initialProductsResponse,
    debouncedSearch,
    activeCategoryId,
    filters,
}: UseProductsDataArgs) {
    const [products, setProducts] = useState<MenuItem[]>(initialProductsResponse.items)
    const [hasMore, setHasMore] = useState(
        initialProductsResponse.meta.currentPage < initialProductsResponse.meta.totalPages
    )
    const [totalProductsCount, setTotalProductsCount] = useState(
        initialProductsResponse.meta.totalItems ?? initialProductsResponse.items.length
    )
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    const pageRef = useRef(1)
    const hasMoreRef = useRef(
        initialProductsResponse.meta.currentPage < initialProductsResponse.meta.totalPages
    )
    const isRefreshingRef = useRef(false)
    const isLoadingMoreRef = useRef(false)
    const requestIdRef = useRef(0)
    const autoFillInProgressRef = useRef(false)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const getRequestParams = useCallback((targetPage: number) => ({
        page: targetPage,
        limit: PRODUCTS_PAGE_LIMIT,
        search: debouncedSearch || undefined,
        categoryId: activeCategoryId || undefined,
        stockStatus: filters.stockStatus !== 'all' ? filters.stockStatus : undefined,
        salesStatus: filters.salesStatus !== 'all' ? filters.salesStatus : undefined,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
    }), [activeCategoryId, debouncedSearch, filters])

    const loadMore = useCallback(async (): Promise<boolean> => {
        if (isRefreshingRef.current || isLoadingMoreRef.current || !hasMoreRef.current) return false

        const requestId = ++requestIdRef.current
        const nextPage = pageRef.current + 1
        isLoadingMoreRef.current = true
        setIsLoadingMore(true)

        try {
            const response = await productsApi.getProducts(restaurantId, getRequestParams(nextPage))
            if (requestId !== requestIdRef.current) return false

            const nextHasMore = response.meta.currentPage < response.meta.totalPages
            setProducts((prev) => {
                const existingIds = new Set(prev.map((item) => item.id))
                const newItems = response.items.filter((item) => !existingIds.has(item.id))
                return [...prev, ...newItems]
            })
            setHasMore(nextHasMore)
            setTotalProductsCount((prev) => response.meta.totalItems ?? prev)
            pageRef.current = nextPage
            hasMoreRef.current = nextHasMore

            return true
        } catch (error) {
            console.error('Failed to load more products:', error)
            return false
        } finally {
            if (requestId === requestIdRef.current) {
                isLoadingMoreRef.current = false
                setIsLoadingMore(false)
            }
        }
    }, [getRequestParams, restaurantId])

    const handleObserverLoadMore = useCallback(() => {
        void loadMore()
    }, [loadMore])

    const observerTarget = useIntersectionObserver(handleObserverLoadMore, [handleObserverLoadMore])

    const shouldAutoFill = useCallback(() => {
        const scrollContainer = scrollContainerRef.current
        const sentinel = observerTarget.current

        if (!scrollContainer || !sentinel) return false
        if (!hasMoreRef.current || isRefreshingRef.current || isLoadingMoreRef.current) return false

        const containerRect = scrollContainer.getBoundingClientRect()
        const sentinelRect = sentinel.getBoundingClientRect()

        return sentinelRect.top <= containerRect.bottom + AUTO_FILL_THRESHOLD_PX
    }, [observerTarget])

    const autoFillUntilScrollable = useCallback(async () => {
        if (!mounted || autoFillInProgressRef.current) return

        autoFillInProgressRef.current = true

        try {
            let passCount = 0

            while (passCount < MAX_AUTO_FILL_PASSES && shouldAutoFill() && hasMoreRef.current) {
                const loaded = await loadMore()
                if (!loaded) break

                passCount += 1
                await new Promise<void>((resolve) => {
                    window.requestAnimationFrame(() => resolve())
                })
            }
        } finally {
            autoFillInProgressRef.current = false
        }
    }, [loadMore, mounted, shouldAutoFill])

    const scheduleAutoFill = useCallback(() => {
        if (!mounted) return

        window.requestAnimationFrame(() => {
            void autoFillUntilScrollable()
        })
    }, [autoFillUntilScrollable, mounted])

    const applyProductsResponse = useCallback((
        response: PaginatedResponse<MenuItem>,
        shouldScheduleAutoFill = false,
    ) => {
        const nextHasMore = response.meta.currentPage < response.meta.totalPages

        setProducts(response.items)
        setHasMore(nextHasMore)
        setTotalProductsCount(response.meta.totalItems ?? response.items.length)
        pageRef.current = 1
        hasMoreRef.current = nextHasMore
        isRefreshingRef.current = false
        setIsRefreshing(false)
        isLoadingMoreRef.current = false
        setIsLoadingMore(false)

        if (shouldScheduleAutoFill) {
            scheduleAutoFill()
        }
    }, [scheduleAutoFill])

    const refreshProducts = useCallback(async (showOverlay = true) => {
        const requestId = ++requestIdRef.current
        isRefreshingRef.current = true
        setIsRefreshing(showOverlay)
        isLoadingMoreRef.current = false
        setIsLoadingMore(false)

        try {
            const response = await productsApi.getProducts(restaurantId, getRequestParams(1))
            if (requestId !== requestIdRef.current) return false

            applyProductsResponse(response, true)
            return true
        } catch (error) {
            console.error('Failed to refresh products:', error)
            return false
        } finally {
            if (requestId === requestIdRef.current) {
                isRefreshingRef.current = false
                setIsRefreshing(false)
            }
        }
    }, [applyProductsResponse, getRequestParams, restaurantId])

    return {
        products,
        hasMore,
        totalProductsCount,
        isRefreshing,
        isLoadingMore,
        scrollContainerRef,
        observerTarget,
        refreshProducts,
        scheduleAutoFill,
        applyProductsResponse,
    }
}
