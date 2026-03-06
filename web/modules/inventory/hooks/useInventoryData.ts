'use client'

import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { inventoryApi } from '../service'
import {
    CostImpact,
    CountDifference,
    FoodCostAlert,
    GetIngredientsDto,
    GetStockMovementsDto,
    Ingredient,
    INVENTORY_MESSAGES,
    InventorySummary,
    PaginatedResponse,
    StockMovement,
} from '../types'

interface UseInventoryDataProps {
    initialIngredientsResponse?: PaginatedResponse<Ingredient>
}

export function useInventoryData({ initialIngredientsResponse }: UseInventoryDataProps) {
    const [ingredients, setIngredients] = useState<Ingredient[]>(
        initialIngredientsResponse?.items || [],
    )
    const [movements, setMovements] = useState<StockMovement[]>([])
    const [costImpacts, setCostImpacts] = useState<CostImpact[]>([])
    const [foodCostAlerts, setFoodCostAlerts] = useState<FoodCostAlert[]>([])
    const [countDifferences, setCountDifferences] = useState<CountDifference[]>([])
    const [summary, setSummary] = useState<InventorySummary | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)

    const ingredientFetchRequestIdRef = useRef(0)
    const movementFetchRequestIdRef = useRef(0)

    const fetchIngredients = useCallback(async (params: GetIngredientsDto = {}) => {
        const requestId = ++ingredientFetchRequestIdRef.current
        setIsLoading(true)
        try {
            const response = await inventoryApi.getIngredients({
                page: 1,
                limit: 50,
                ...params,
            })

            if (requestId === ingredientFetchRequestIdRef.current) {
                setIngredients(response.items)
            }
            return response
        } catch (error) {
            toast.error(INVENTORY_MESSAGES.ingredientsLoadFailed)
            throw error
        } finally {
            if (requestId === ingredientFetchRequestIdRef.current) {
                setIsLoading(false)
            }
        }
    }, [])

    const fetchMovements = useCallback(async (params: GetStockMovementsDto = {}) => {
        const requestId = ++movementFetchRequestIdRef.current
        setIsLoading(true)
        try {
            const response = await inventoryApi.getStockMovements({
                page: 1,
                limit: 50,
                ...params,
            })

            if (requestId === movementFetchRequestIdRef.current) {
                setMovements(response.items)
            }
            return response
        } catch (error) {
            toast.error(INVENTORY_MESSAGES.movementsLoadFailed)
            throw error
        } finally {
            if (requestId === movementFetchRequestIdRef.current) {
                setIsLoading(false)
            }
        }
    }, [])

    const fetchAnalysisData = useCallback(async () => {
        setIsAnalysisLoading(true)
        try {
            const [costImpactData, foodCostData, countDiffData, summaryData] =
                await Promise.all([
                    inventoryApi.getCostImpact(7),
                    inventoryApi.getFoodCostAlerts(),
                    inventoryApi.getCountDifferences(4),
                    inventoryApi.getSummary(),
                ])
            setCostImpacts(costImpactData.items)
            setFoodCostAlerts(foodCostData.items)
            setCountDifferences(countDiffData.items)
            setSummary(summaryData)
        } catch (error) {
            toast.error(INVENTORY_MESSAGES.analysisLoadFailed)
        } finally {
            setIsAnalysisLoading(false)
        }
    }, [])

    return {
        ingredients,
        setIngredients,
        movements,
        costImpacts,
        foodCostAlerts,
        countDifferences,
        summary,
        isLoading,
        isAnalysisLoading,
        fetchIngredients,
        fetchMovements,
        fetchAnalysisData,
    }
}
