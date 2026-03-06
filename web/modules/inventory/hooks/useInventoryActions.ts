'use client'
import { useCallback, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { toast } from 'sonner'
import { usePendingQueue } from '@/modules/shared/hooks/usePendingQueue'
import { inventoryApi } from '../service'
import {
    BulkStockUpdate,
    BulkStockUpdatePayload,
    CreateIngredientPayload,
    CreateStockMovementPayload,
    Ingredient,
    INVENTORY_MESSAGES,
    UpdateIngredientPayload,
} from '../types'

interface UseInventoryActionsProps {
    fetchIngredients: () => Promise<unknown>
    setIngredients: Dispatch<SetStateAction<Ingredient[]>>
    suppressedTransactionIds: MutableRefObject<Set<string>>
}

export function useInventoryActions({
    fetchIngredients,
    setIngredients,
    suppressedTransactionIds,
}: UseInventoryActionsProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [syncingIngredientId, setSyncingIngredientId] = useState<string | null>(null)
    const [isBulkSyncing, setIsBulkSyncing] = useState(false)
    const pendingQueue = usePendingQueue()
    const createIngredient = useCallback(async (data: Omit<Ingredient, 'id' | 'restaurant_id'>) => {
        setIsSubmitting(true)
        const txId = crypto.randomUUID()
        const payload: CreateIngredientPayload = {
            ...data,
            transaction_id: txId,
        }

        try {
            suppressedTransactionIds.current.add(txId)
            const created = await inventoryApi.createIngredient(payload)
            setIngredients((prev) => [created, ...prev])
            toast.success(INVENTORY_MESSAGES.ingredientCreated)
            return created
        } catch (error: any) {
            suppressedTransactionIds.current.delete(txId)
            if (error.code === 'ERR_NETWORK' || !error.response) {
                pendingQueue.add({
                    id: txId,
                    module: 'inventory',
                    endpoint: '/inventory/ingredients',
                    method: 'POST',
                    payload,
                })
            }
            toast.error(INVENTORY_MESSAGES.ingredientCreateFailed)
            throw error
        } finally {
            setIsSubmitting(false)
        }
    }, [pendingQueue, setIngredients, suppressedTransactionIds])

    const updateIngredient = useCallback(async (id: string, data: Partial<Ingredient>) => {
        setSyncingIngredientId(id)
        const txId = crypto.randomUUID()
        const payload: UpdateIngredientPayload = {
            ...(data as any),
            transaction_id: txId,
        }

        try {
            suppressedTransactionIds.current.add(txId)
            const updated = await inventoryApi.updateIngredient(id, payload)
            setIngredients((prev) => prev.map((i) => (i.id === id ? updated : i)))
            toast.success(INVENTORY_MESSAGES.ingredientUpdated)
            return updated
        } catch (error: any) {
            suppressedTransactionIds.current.delete(txId)
            if (error.code === 'ERR_NETWORK' || !error.response) {
                pendingQueue.add({
                    id: txId,
                    module: 'inventory',
                    endpoint: `/inventory/ingredients/${id}`,
                    method: 'PATCH',
                    payload,
                })
            }
            toast.error(INVENTORY_MESSAGES.ingredientUpdateFailed)
            throw error
        } finally {
            setSyncingIngredientId(null)
        }
    }, [pendingQueue, setIngredients, suppressedTransactionIds])

    const deleteIngredient = useCallback(async (id: string) => {
        setSyncingIngredientId(id)
        const txId = crypto.randomUUID()

        try {
            suppressedTransactionIds.current.add(txId)
            await inventoryApi.deleteIngredient(id)
            setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, deleted: true } : i)))
            await fetchIngredients()
            toast.success(INVENTORY_MESSAGES.ingredientDeleted)
        } catch (error: any) {
            suppressedTransactionIds.current.delete(txId)
            if (error.code === 'ERR_NETWORK' || !error.response) {
                pendingQueue.add({
                    id: txId,
                    module: 'inventory',
                    endpoint: `/inventory/ingredients/${id}`,
                    method: 'DELETE',
                    payload: { transaction_id: txId },
                })
            }
            toast.error(INVENTORY_MESSAGES.ingredientDeleteFailed)
            throw error
        } finally {
            setSyncingIngredientId(null)
        }
    }, [fetchIngredients, pendingQueue, setIngredients, suppressedTransactionIds])

    const addMovement = useCallback(
        async (data: Omit<CreateStockMovementPayload, 'transaction_id'>) => {
            setSyncingIngredientId(data.ingredient_id)
            const txId = crypto.randomUUID()
            const payload: CreateStockMovementPayload = {
                ...data,
                transaction_id: txId,
            }

            try {
                suppressedTransactionIds.current.add(txId)
                const result = await inventoryApi.addMovement(payload)
                await fetchIngredients()
                toast.success(INVENTORY_MESSAGES.movementAdded)
                return result
            } catch (error: any) {
                suppressedTransactionIds.current.delete(txId)
                if (error.code === 'ERR_NETWORK' || !error.response) {
                    pendingQueue.add({
                        id: txId,
                        module: 'inventory',
                        endpoint: '/inventory/movements',
                        method: 'POST',
                        payload,
                    })
                }
                toast.error(INVENTORY_MESSAGES.movementAddFailed)
                throw error
            } finally {
                setSyncingIngredientId(null)
            }
        },
        [fetchIngredients, pendingQueue, suppressedTransactionIds],
    )

    const bulkUpdateStock = useCallback(async (updates: BulkStockUpdate[]) => {
        setIsBulkSyncing(true)
        const txId = crypto.randomUUID()
        const payload: BulkStockUpdatePayload = {
            updates,
            transaction_id: txId,
        }

        try {
            suppressedTransactionIds.current.add(txId)
            await inventoryApi.bulkUpdateStock(payload)
            await fetchIngredients()
            toast.success(INVENTORY_MESSAGES.bulkUpdated)
        } catch (error: any) {
            suppressedTransactionIds.current.delete(txId)
            if (error.code === 'ERR_NETWORK' || !error.response) {
                pendingQueue.add({
                    id: txId,
                    module: 'inventory',
                    endpoint: '/inventory/stocks/bulk-update',
                    method: 'POST',
                    payload,
                })
            }
            toast.error(INVENTORY_MESSAGES.bulkUpdateFailed)
            throw error
        } finally {
            setIsBulkSyncing(false)
        }
    }, [fetchIngredients, pendingQueue, suppressedTransactionIds])

    return {
        isSubmitting,
        syncingIngredientId,
        isBulkSyncing,
        createIngredient,
        updateIngredient,
        deleteIngredient,
        addMovement,
        bulkUpdateStock,
    }
}
