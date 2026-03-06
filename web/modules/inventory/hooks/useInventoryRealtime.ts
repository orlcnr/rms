'use client'

import { useCallback, useEffect } from 'react'
import type { MutableRefObject } from 'react'
import { useSocketStore } from '@/modules/shared/api/socket'
import { useSocketRevalidation } from '@/modules/shared/hooks/useSocketRevalidation'

interface UseInventoryRealtimeProps {
    restaurantId: string
    fetchIngredients: () => Promise<unknown>
    suppressedTransactionIds: MutableRefObject<Set<string>>
}

export function useInventoryRealtime({
    restaurantId,
    fetchIngredients,
    suppressedTransactionIds,
}: UseInventoryRealtimeProps) {
    const on = useSocketStore((state) => state.on)
    const off = useSocketStore((state) => state.off)
    const connect = useSocketStore((state) => state.connect)
    const disconnect = useSocketStore((state) => state.disconnect)
    const isConnected = useSocketStore((state) => state.isConnected)

    const handleInventoryUpdate = useCallback(
        (event: unknown) => {
            const payload =
                typeof event === 'object' && event !== null
                    ? (event as { transaction_id?: string })
                    : {}
            if (
                payload.transaction_id &&
                suppressedTransactionIds.current.has(payload.transaction_id)
            ) {
                suppressedTransactionIds.current.delete(payload.transaction_id)
                return
            }
            void fetchIngredients()
        },
        [fetchIngredients, suppressedTransactionIds],
    )

    useSocketRevalidation({
        isConnected,
        onRevalidate: () => {
            void fetchIngredients()
        },
    })

    useEffect(() => {
        if (!restaurantId) return undefined

        connect(restaurantId)
        on('inventory:updated', handleInventoryUpdate)

        return () => {
            off('inventory:updated', handleInventoryUpdate)
            disconnect()
        }
    }, [restaurantId, connect, disconnect, on, off, handleInventoryUpdate])

    return { isSocketConnected: isConnected }
}
