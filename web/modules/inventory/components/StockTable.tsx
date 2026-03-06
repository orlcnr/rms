'use client'

import { useMemo, useState } from 'react'
import { handleNumericInput } from '@/modules/shared/utils/numeric'
import { BulkStockUpdate, Ingredient, MovementType } from '../types'
import { StockTableHeader } from './stock-table/StockTableHeader'
import { StockTableRows } from './stock-table/StockTableRows'

interface StockTableProps {
    ingredients: Ingredient[]
    onAddMovement: (ingredient: Ingredient, type: MovementType) => void
    onEdit: (ingredient: Ingredient) => void
    isBulkEditMode?: boolean
    onBulkSave?: (updates: BulkStockUpdate[]) => void
    onToggleBulkMode?: (enabled: boolean) => void
    syncingIngredientId?: string | null
}

export function StockTable({
    ingredients,
    onAddMovement,
    onEdit,
    isBulkEditMode = false,
    onBulkSave,
    onToggleBulkMode,
    syncingIngredientId,
}: StockTableProps) {
    const [bulkQuantities, setBulkQuantities] = useState<Record<string, number>>({})

    const handleQuantityChange = (ingredientId: string, value: string) => {
        const numValue = parseFloat(handleNumericInput(value)) || 0
        setBulkQuantities((prev) => ({
            ...prev,
            [ingredientId]: numValue,
        }))
    }

    const updates = useMemo(
        () =>
            Object.entries(bulkQuantities)
                .filter(([id, qty]) => {
                    const ingredient = ingredients.find((i) => i.id === id)
                    return ingredient && qty !== (ingredient.stock?.quantity || 0)
                })
                .map(([ingredientId, newQuantity]) => ({
                    ingredientId,
                    newQuantity,
                })),
        [bulkQuantities, ingredients],
    )

    const hasChanges = updates.length > 0

    const handleBulkSave = () => {
        if (!onBulkSave || !hasChanges) return
        onBulkSave(updates)
        setBulkQuantities({})
    }

    const handleToggleBulkMode = (enabled: boolean) => {
        onToggleBulkMode?.(enabled)
        if (!enabled) {
            setBulkQuantities({})
        }
    }

    return (
        <div className="border border-border-light rounded-sm bg-bg-surface">
            <StockTableHeader
                isBulkEditMode={isBulkEditMode}
                hasChanges={hasChanges}
                onToggleBulkMode={handleToggleBulkMode}
                onBulkSave={handleBulkSave}
            />

            <div className="overflow-x-auto">
                <table className="w-full erp-table">
                    <thead>
                        <tr className="border-b border-border-light bg-bg-muted/10">
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary w-[40%]">
                                MALZEME BİLGİSİ
                            </th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-center">
                                BİRİM
                            </th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-right">
                                MEVCUT STOK
                            </th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-center">
                                MALİYET
                            </th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-center">
                                DURUM
                            </th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-right">
                                EYLEMLER
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                        <StockTableRows
                            ingredients={ingredients}
                            isBulkEditMode={isBulkEditMode}
                            bulkQuantities={bulkQuantities}
                            onChangeQuantity={handleQuantityChange}
                            onAddMovement={onAddMovement}
                            onEdit={onEdit}
                            syncingIngredientId={syncingIngredientId}
                        />
                    </tbody>
                </table>
            </div>
        </div>
    )
}
