'use client'

import { Loader2 } from 'lucide-react'
import { BodySection } from '@/modules/shared/components/layout'
import {
    BulkStockUpdate,
    CostImpact,
    CountDifference,
    FoodCostAlert,
    Ingredient,
    INVENTORY_LABELS,
    InventoryAnalysisTab,
    InventoryView,
    MovementType,
    StockMovement,
} from '../../types'
import { CostAnalysisCards } from '../CostAnalysisCards'
import { CountDifferencesTable } from '../CountDifferencesTable'
import { MovementHistory } from '../MovementHistory'
import { StockTable } from '../StockTable'

interface InventoryContentProps {
    view: InventoryView
    analysisTab: InventoryAnalysisTab
    isLoading: boolean
    isBulkSyncing: boolean
    ingredients: Ingredient[]
    movements: StockMovement[]
    syncingIngredientId: string | null
    onAddMovement: (ingredient: Ingredient, type: MovementType) => void
    onEditIngredient: (ingredient: Ingredient) => void
    isBulkEditMode: boolean
    onBulkSave: (updates: BulkStockUpdate[]) => Promise<void>
    onToggleBulkMode: (enabled: boolean) => void
    costImpacts: CostImpact[]
    foodCostAlerts: FoodCostAlert[]
    countDifferences: CountDifference[]
    criticalStockCount: number
    isAnalysisLoading: boolean
}

export function InventoryContent({
    view,
    analysisTab,
    isLoading,
    isBulkSyncing,
    ingredients,
    movements,
    syncingIngredientId,
    onAddMovement,
    onEditIngredient,
    isBulkEditMode,
    onBulkSave,
    onToggleBulkMode,
    costImpacts,
    foodCostAlerts,
    countDifferences,
    criticalStockCount,
    isAnalysisLoading,
}: InventoryContentProps) {
    return (
        <BodySection className="relative min-h-[600px] bg-bg-surface border-t-0">
            {isBulkSyncing && (
                <div className="absolute inset-0 bg-bg-surface/60 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                    <div className="flex items-center gap-3 px-6 py-4 bg-bg-surface border border-border-light shadow-2xl rounded-sm">
                        <Loader2 className="w-5 h-5 animate-spin text-primary-main" />
                        <span className="text-xs font-black uppercase tracking-widest text-text-primary">
                            {INVENTORY_LABELS.syncingOverlay}
                        </span>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="w-10 h-10 animate-spin text-primary-main" />
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {view === InventoryView.LIST ? (
                        <StockTable
                            ingredients={ingredients}
                            onAddMovement={onAddMovement}
                            onEdit={onEditIngredient}
                            isBulkEditMode={isBulkEditMode}
                            onBulkSave={onBulkSave}
                            onToggleBulkMode={onToggleBulkMode}
                            syncingIngredientId={syncingIngredientId}
                        />
                    ) : view === InventoryView.MOVEMENTS ? (
                        <MovementHistory movements={movements} />
                    ) : analysisTab === InventoryAnalysisTab.OVERVIEW ? (
                        <CostAnalysisCards
                            costImpacts={costImpacts}
                            foodCostAlerts={foodCostAlerts}
                            countDifferences={countDifferences}
                            criticalStockCount={criticalStockCount}
                            isLoading={isAnalysisLoading}
                        />
                    ) : (
                        <CountDifferencesTable
                            differences={countDifferences}
                            isLoading={isAnalysisLoading}
                        />
                    )}
                </div>
            )}
        </BodySection>
    )
}
