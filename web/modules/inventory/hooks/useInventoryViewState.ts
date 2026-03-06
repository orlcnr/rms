'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useDebounce } from '@/modules/shared/hooks/useDebounce'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import {
    buildMovementDateQuery,
    INVENTORY_MESSAGES,
    InventoryAnalysisTab,
    InventoryMovementTypeFilter,
    InventoryView,
    MovementType,
    StockStatus,
} from '../types'
import { movementFilterSchema } from '../schemas'

export function useInventoryViewState() {
    const lastNotifiedErrorRef = useRef<string | null>(null)
    const [view, setView] = useState<InventoryView>(InventoryView.LIST)
    const [analysisTab, setAnalysisTab] = useState<InventoryAnalysisTab>(
        InventoryAnalysisTab.OVERVIEW,
    )
    const [searchQuery, setSearchQuery] = useState('')
    const [stockStatus, setStockStatus] = useState<StockStatus>(StockStatus.ALL)
    const [movementSearchQuery, setMovementSearchQuery] = useState('')
    const [movementTypeFilter, setMovementTypeFilter] = useState<
        InventoryMovementTypeFilter | MovementType
    >(InventoryMovementTypeFilter.ALL)
    const [movementStartDate, setMovementStartDate] = useState('')
    const [movementEndDate, setMovementEndDate] = useState('')
    const [movementDateError, setMovementDateError] = useState<string | null>(null)
    const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false)
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
    const [isBulkEditMode, setIsBulkEditMode] = useState(false)

    const debouncedSearch = useDebounce(searchQuery, 300)
    const debouncedMovementSearch = useDebounce(movementSearchQuery, 300)

    const ingredientQuery = useMemo(
        () => ({
            name: debouncedSearch || undefined,
            status: stockStatus !== StockStatus.ALL ? stockStatus : undefined,
        }),
        [debouncedSearch, stockStatus],
    )

    const movementQuery = useMemo(() => {
        const startDate = buildMovementDateQuery(movementStartDate)
        const endDate = buildMovementDateQuery(movementEndDate)
        const validation = movementFilterSchema.safeParse({ startDate, endDate })

        if (!validation.success) {
            return null
        }

        if (startDate && endDate) {
            const dayDiff = differenceInCalendarDays(parseISO(endDate), parseISO(startDate))
            if (dayDiff < 0) {
                return null
            }
            if (dayDiff > 31) {
                return null
            }
        }

        return {
            ingredientName: debouncedMovementSearch || undefined,
            type:
                movementTypeFilter !== InventoryMovementTypeFilter.ALL
                    ? (movementTypeFilter as MovementType)
                    : undefined,
            startDate,
            endDate,
        }
    }, [
        debouncedMovementSearch,
        movementEndDate,
        movementStartDate,
        movementTypeFilter,
    ])

    useEffect(() => {
        const startDate = buildMovementDateQuery(movementStartDate)
        const endDate = buildMovementDateQuery(movementEndDate)
        const validation = movementFilterSchema.safeParse({ startDate, endDate })

        if (!validation.success) {
            const message =
                validation.error.issues[0]?.message ||
                INVENTORY_MESSAGES.movementDateInvalidRange
            setMovementDateError(message)
            if (lastNotifiedErrorRef.current !== message) {
                toast.error(message)
                lastNotifiedErrorRef.current = message
            }
            return
        }

        if (startDate && endDate) {
            const dayDiff = differenceInCalendarDays(parseISO(endDate), parseISO(startDate))
            if (dayDiff < 0) {
                const message = INVENTORY_MESSAGES.movementDateInvalidRange
                setMovementDateError(message)
                if (lastNotifiedErrorRef.current !== message) {
                    toast.error(message)
                    lastNotifiedErrorRef.current = message
                }
                return
            }
            if (dayDiff > 31) {
                const message = INVENTORY_MESSAGES.movementDateMaxRange
                setMovementDateError(message)
                if (lastNotifiedErrorRef.current !== message) {
                    toast.error(message)
                    lastNotifiedErrorRef.current = message
                }
                return
            }
        }

        setMovementDateError(null)
        lastNotifiedErrorRef.current = null
    }, [movementStartDate, movementEndDate])

    const resetMovementFilters = () => {
        setMovementSearchQuery('')
        setMovementTypeFilter(InventoryMovementTypeFilter.ALL)
        setMovementStartDate('')
        setMovementEndDate('')
        setMovementDateError(null)
    }

    return {
        view,
        setView,
        analysisTab,
        setAnalysisTab,
        searchQuery,
        setSearchQuery,
        stockStatus,
        setStockStatus,
        movementSearchQuery,
        setMovementSearchQuery,
        movementTypeFilter,
        setMovementTypeFilter,
        movementStartDate,
        setMovementStartDate,
        movementEndDate,
        setMovementEndDate,
        movementDateError,
        ingredientQuery,
        movementQuery,
        isIngredientModalOpen,
        setIsIngredientModalOpen,
        isMovementModalOpen,
        setIsMovementModalOpen,
        isBulkEditMode,
        setIsBulkEditMode,
        resetMovementFilters,
    }
}
