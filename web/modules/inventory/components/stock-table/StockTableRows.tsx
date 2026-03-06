'use client'

import React, { useState } from 'react'
import { Package } from 'lucide-react'
import { EmptyState } from '@/modules/shared/components/EmptyState'
import { inventoryApi } from '../../service'
import {
    Ingredient,
    IngredientUsage,
    MovementType,
} from '../../types'
import { StockTableRow } from './StockTableRow'
import { StockTableUsagePanel } from './StockTableUsagePanel'

interface StockTableRowsProps {
    ingredients: Ingredient[]
    isBulkEditMode: boolean
    bulkQuantities: Record<string, number>
    onChangeQuantity: (ingredientId: string, value: string) => void
    onAddMovement: (ingredient: Ingredient, type: MovementType) => void
    onEdit: (ingredient: Ingredient) => void
    syncingIngredientId?: string | null
}

export function StockTableRows({
    ingredients,
    isBulkEditMode,
    bulkQuantities,
    onChangeQuantity,
    onAddMovement,
    onEdit,
    syncingIngredientId,
}: StockTableRowsProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [ingredientUsage, setIngredientUsage] = useState<Record<string, IngredientUsage>>({})
    const [loadingUsage, setLoadingUsage] = useState<Set<string>>(new Set())

    const toggleRowExpand = async (ingredientId: string) => {
        const newExpanded = new Set(expandedRows)

        if (newExpanded.has(ingredientId)) {
            newExpanded.delete(ingredientId)
        } else {
            newExpanded.add(ingredientId)
            if (!ingredientUsage[ingredientId]) {
                setLoadingUsage((prev) => new Set(prev).add(ingredientId))
                try {
                    const usage = await inventoryApi.getIngredientUsage(ingredientId)
                    setIngredientUsage((prev) => ({ ...prev, [ingredientId]: usage }))
                } finally {
                    setLoadingUsage((prev) => {
                        const newSet = new Set(prev)
                        newSet.delete(ingredientId)
                        return newSet
                    })
                }
            }
        }

        setExpandedRows(newExpanded)
    }

    if (ingredients.length === 0) {
        return (
            <tr>
                <td colSpan={6}>
                    <EmptyState
                        icon={<Package className="w-8 h-8" />}
                        title="ENVANTER KAYDI BULUNAMADI"
                        className="py-16"
                    />
                </td>
            </tr>
        )
    }

    return (
        <>
            {ingredients.map((item) => {
                const isExpanded = expandedRows.has(item.id)
                const isLoadingUsage = loadingUsage.has(item.id)
                const isSyncing = syncingIngredientId === item.id
                const usage = ingredientUsage[item.id]
                const displayQty =
                    bulkQuantities[item.id] !== undefined
                        ? String(Number(bulkQuantities[item.id]))
                        : String(Number(item.stock?.quantity || 0))

                return (
                    <React.Fragment key={item.id}>
                        <StockTableRow
                            item={item}
                            isBulkEditMode={isBulkEditMode}
                            displayQty={displayQty}
                            isExpanded={isExpanded}
                            isSyncing={isSyncing}
                            onToggleExpand={() => {
                                void toggleRowExpand(item.id)
                            }}
                            onChangeQuantity={(value) => onChangeQuantity(item.id, value)}
                            onAddMovement={onAddMovement}
                            onEdit={onEdit}
                        />

                        {isExpanded && (
                            <tr className="bg-bg-muted/20">
                                <td colSpan={6} className="px-4 py-4">
                                    <StockTableUsagePanel
                                        isLoading={isLoadingUsage}
                                        usage={usage}
                                    />
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                )
            })}
        </>
    )
}
