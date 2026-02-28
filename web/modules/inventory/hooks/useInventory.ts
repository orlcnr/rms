'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
    Ingredient,
    PaginatedResponse,
    MovementType,
    StockMovement,
    StockStatus,
    BulkStockUpdate,
    CostImpact,
    FoodCostAlert,
    CountDifference,
    CreateIngredientPayload,
    UpdateIngredientPayload,
    CreateStockMovementPayload,
    BulkStockUpdatePayload
} from '../types'
import { inventoryApi } from '../services/inventory.service'
import { useSocketStore } from '@/modules/shared/api/socket'
import { usePendingQueue } from '@/modules/shared/hooks/usePendingQueue'
import { useSocketRevalidation } from '@/modules/shared/hooks/useSocketRevalidation'

interface UseInventoryProps {
    restaurantId: string
    initialIngredientsResponse?: PaginatedResponse<Ingredient>
}

export function useInventory({ restaurantId, initialIngredientsResponse }: UseInventoryProps) {
    // State managed by the hook
    const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredientsResponse?.items || [])
    const [movements, setMovements] = useState<StockMovement[]>([])

    // Analysis data state
    const [costImpacts, setCostImpacts] = useState<CostImpact[]>([])
    const [foodCostAlerts, setFoodCostAlerts] = useState<FoodCostAlert[]>([])
    const [countDifferences, setCountDifferences] = useState<CountDifference[]>([])
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)

    // UI State
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false) // Generic submitting for simple ops
    const [syncingIngredientId, setSyncingIngredientId] = useState<string | null>(null)
    const [isBulkSyncing, setIsBulkSyncing] = useState(false)

    // Integration hooks
    const { on, off, connect, disconnect, isConnected } = useSocketStore()
    const pendingQueue = usePendingQueue()
    const suppressedTransactionIds = useRef<Set<string>>(new Set())

    // ============================================
    // FETCH DATA
    // ============================================

    const fetchIngredients = useCallback(async (params: any = {}) => {
        setIsLoading(true)
        try {
            const response = await inventoryApi.getIngredients({
                page: 1,
                limit: 50, // Standard limit
                ...params
            })
            setIngredients(response.items)
            return response
        } catch (error) {
            console.error('Failed to fetch ingredients:', error)
            toast.error('Malzemeler yüklenemedi.')
            throw error
        } finally {
            setIsLoading(false)
        }
    }, [])

    const fetchMovements = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await inventoryApi.getStockMovements({ page: 1, limit: 50 })
            setMovements(response.items)
            return response
        } catch (error) {
            console.error('Failed to fetch movements:', error)
            toast.error('Hareket geçmişi yüklenemedi.')
            throw error
        } finally {
            setIsLoading(false)
        }
    }, [])

    const fetchAnalysisData = useCallback(async () => {
        setIsAnalysisLoading(true)
        try {
            const [costImpactData, foodCostData, countDiffData] = await Promise.all([
                inventoryApi.getCostImpact(7),
                inventoryApi.getFoodCostAlerts(),
                inventoryApi.getCountDifferences(4)
            ])
            setCostImpacts(costImpactData)
            setFoodCostAlerts(foodCostData)
            setCountDifferences(countDiffData)
        } catch (error) {
            console.error('Failed to load analysis data:', error)
            toast.error('Analiz verileri yüklenemedi.')
        } finally {
            setIsAnalysisLoading(false)
        }
    }, [])

    // Silent revalidation on reconnect
    useSocketRevalidation({
        isConnected,
        onRevalidate: () => { fetchIngredients() }
    })

    // ============================================
    // SOCKET INTEGRATION
    // ============================================

    useEffect(() => {
        if (!restaurantId) return

        connect(restaurantId)

        const handleInventoryUpdate = (event: any) => {
            if (event.transaction_id && suppressedTransactionIds.current.has(event.transaction_id)) {
                suppressedTransactionIds.current.delete(event.transaction_id)
                return
            }
            // Silent refresh from server truth
            fetchIngredients()
        }

        on('inventory:updated', handleInventoryUpdate)

        return () => {
            off('inventory:updated', handleInventoryUpdate as any)
            disconnect()
        }
    }, [restaurantId, connect, disconnect, on, off, fetchIngredients])

    // ============================================
    // WRITE OPERATIONS (Hybrid Model)
    // ============================================

    const createIngredient = useCallback(async (data: Omit<Ingredient, 'id' | 'restaurant_id'>) => {
        setIsSubmitting(true)
        const txId = crypto.randomUUID()
        const payload: CreateIngredientPayload = {
            ...data,
            restaurant_id: restaurantId,
            transaction_id: txId
        }

        try {
            suppressedTransactionIds.current.add(txId)
            const created = await inventoryApi.createIngredient(payload)
            setIngredients(prev => [created, ...prev])
            toast.success('Yeni malzeme eklendi.')
            return created
        } catch (error: any) {
            suppressedTransactionIds.current.delete(txId)
            if (error.code === 'ERR_NETWORK' || !error.response) {
                pendingQueue.add({
                    id: txId,
                    module: 'inventory',
                    endpoint: '/inventory/ingredients',
                    method: 'POST',
                    payload
                })
            }
            toast.error('Malzeme eklenemedi.')
            throw error
        } finally {
            setIsSubmitting(false)
        }
    }, [restaurantId, pendingQueue])

    const updateIngredient = useCallback(async (id: string, data: Partial<Ingredient>) => {
        setSyncingIngredientId(id)
        const txId = crypto.randomUUID()
        const payload: UpdateIngredientPayload = {
            ...data as any,
            transaction_id: txId
        }

        try {
            suppressedTransactionIds.current.add(txId)
            const updated = await inventoryApi.updateIngredient(id, payload)
            setIngredients(prev => prev.map(i => i.id === id ? updated : i))
            toast.success('Malzeme güncellendi.')
            return updated
        } catch (error: any) {
            suppressedTransactionIds.current.delete(txId)
            if (error.code === 'ERR_NETWORK' || !error.response) {
                pendingQueue.add({
                    id: txId,
                    module: 'inventory',
                    endpoint: `/inventory/ingredients/${id}`,
                    method: 'PATCH',
                    payload
                })
            }
            toast.error('Güncelleme başarısız.')
            throw error
        } finally {
            setSyncingIngredientId(null)
        }
    }, [pendingQueue])

    const deleteIngredient = useCallback(async (id: string) => {
        setSyncingIngredientId(id)
        const txId = crypto.randomUUID()

        try {
            suppressedTransactionIds.current.add(txId)
            await inventoryApi.deleteIngredient(id)
            setIngredients(prev => prev.map(i => i.id === id ? { ...i, deleted: true } : i)) // Hypothetical or refetch
            fetchIngredients() // Better to refetch for deletions
            toast.success('Malzeme silindi.')
        } catch (error: any) {
            suppressedTransactionIds.current.delete(txId)
            if (error.code === 'ERR_NETWORK' || !error.response) {
                pendingQueue.add({
                    id: txId,
                    module: 'inventory',
                    endpoint: `/inventory/ingredients/${id}`,
                    method: 'DELETE',
                    payload: { transaction_id: txId }
                })
            }
            toast.error('Silme işlemi başarısız.')
            throw error
        } finally {
            setSyncingIngredientId(null)
        }
    }, [pendingQueue, fetchIngredients])

    const addMovement = useCallback(async (data: Omit<CreateStockMovementPayload, 'transaction_id'>) => {
        setSyncingIngredientId(data.ingredient_id)
        const txId = crypto.randomUUID()
        const payload: CreateStockMovementPayload = {
            ...data,
            transaction_id: txId
        }

        try {
            suppressedTransactionIds.current.add(txId)
            const result = await inventoryApi.addMovement(payload)
            // Pessimistic update: refresh ingredients to get latest stock from server
            await fetchIngredients()
            toast.success('Stok hareketi kaydedildi.')
            return result
        } catch (error: any) {
            suppressedTransactionIds.current.delete(txId)
            if (error.code === 'ERR_NETWORK' || !error.response) {
                pendingQueue.add({
                    id: txId,
                    module: 'inventory',
                    endpoint: '/inventory/movements',
                    method: 'POST',
                    payload
                })
            }
            toast.error('Hareket kaydedilemedi.')
            throw error
        } finally {
            setSyncingIngredientId(null)
        }
    }, [pendingQueue, fetchIngredients])

    const bulkUpdateStock = useCallback(async (updates: BulkStockUpdate[]) => {
        setIsBulkSyncing(true)
        const txId = crypto.randomUUID()
        const payload: BulkStockUpdatePayload = {
            updates,
            transaction_id: txId
        }

        try {
            suppressedTransactionIds.current.add(txId)
            await inventoryApi.bulkUpdateStock(payload as any)
            await fetchIngredients()
            toast.success('Stoklar toplu olarak güncellendi.')
        } catch (error: any) {
            suppressedTransactionIds.current.delete(txId)
            if (error.code === 'ERR_NETWORK' || !error.response) {
                pendingQueue.add({
                    id: txId,
                    module: 'inventory',
                    endpoint: '/inventory/stocks/bulk-update',
                    method: 'POST',
                    payload
                })
            }
            toast.error('Toplu güncelleme başarısız.')
            throw error
        } finally {
            setIsBulkSyncing(false)
        }
    }, [pendingQueue, fetchIngredients])

    return {
        // State
        ingredients,
        movements,
        isLoading,
        isSubmitting,
        syncingIngredientId,
        isBulkSyncing,
        isSocketConnected: isConnected,

        // Analysis data
        costImpacts,
        foodCostAlerts,
        countDifferences,
        isAnalysisLoading,

        // Actions
        fetchIngredients,
        fetchMovements,
        fetchAnalysisData,
        createIngredient,
        updateIngredient,
        deleteIngredient,
        addMovement,
        bulkUpdateStock
    }
}
