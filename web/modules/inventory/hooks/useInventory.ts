'use client'

import { useRef } from 'react'
import { Ingredient, PaginatedResponse } from '../types'
import { useInventoryActions } from './useInventoryActions'
import { useInventoryData } from './useInventoryData'
import { useInventoryRealtime } from './useInventoryRealtime'

interface UseInventoryProps {
    restaurantId: string
    initialIngredientsResponse?: PaginatedResponse<Ingredient>
}

export function useInventory({ restaurantId, initialIngredientsResponse }: UseInventoryProps) {
    const suppressedTransactionIds = useRef<Set<string>>(new Set())

    const data = useInventoryData({ initialIngredientsResponse })
    const actions = useInventoryActions({
        fetchIngredients: data.fetchIngredients,
        setIngredients: data.setIngredients,
        suppressedTransactionIds,
    })
    const realtime = useInventoryRealtime({
        restaurantId,
        fetchIngredients: data.fetchIngredients,
        suppressedTransactionIds,
    })

    return {
        ...data,
        ...actions,
        ...realtime,
    }
}
