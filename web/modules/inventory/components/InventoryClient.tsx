'use client'

import { useEffect, useState } from 'react'
import { Ingredient, INVENTORY_LABELS, InventoryView, MovementType, PaginatedResponse } from '../types'
import { useInventory } from '../hooks/useInventory'
import { useInventoryViewState } from '../hooks/useInventoryViewState'
import { SubHeaderSection } from '@/modules/shared/components/layout'
import { InventoryHeaderActions } from './inventory-client/InventoryHeaderActions'
import { InventoryFiltersPanel } from './inventory-client/InventoryFiltersPanel'
import { InventoryContent } from './inventory-client/InventoryContent'
import { InventoryModals } from './inventory-client/InventoryModals'

interface InventoryClientProps {
    restaurantId: string
    initialIngredientsResponse: PaginatedResponse<Ingredient>
}

export function InventoryClient({
    restaurantId,
    initialIngredientsResponse,
}: InventoryClientProps) {
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
    const [activeMovementType, setActiveMovementType] = useState<MovementType>(MovementType.IN)

    const inventory = useInventory({ restaurantId, initialIngredientsResponse })
    const viewState = useInventoryViewState()
    const { fetchAnalysisData, fetchMovements, fetchIngredients } = inventory

    useEffect(() => {
        if (viewState.view === InventoryView.ANALYSIS) {
            void fetchAnalysisData()
        }
    }, [viewState.view, fetchAnalysisData])

    useEffect(() => {
        if (viewState.view !== InventoryView.MOVEMENTS || !viewState.movementQuery) return
        void fetchMovements(viewState.movementQuery)
    }, [viewState.view, viewState.movementQuery, fetchMovements])

    useEffect(() => {
        if (
            viewState.view === InventoryView.LIST ||
            viewState.ingredientQuery.name ||
            viewState.ingredientQuery.status
        ) {
            void fetchIngredients(viewState.ingredientQuery)
        }
    }, [viewState.view, viewState.ingredientQuery, fetchIngredients])

    return (
        <div className="flex flex-col min-h-screen bg-bg-app">
            <SubHeaderSection
                title={INVENTORY_LABELS.title}
                description={INVENTORY_LABELS.subtitle}
                isConnected={inventory.isSocketConnected}
                isSyncing={inventory.isBulkSyncing || inventory.syncingIngredientId !== null}
                onRefresh={() => {
                    void inventory.fetchIngredients()
                }}
                moduleColor="bg-primary-main"
                actions={(
                    <InventoryHeaderActions
                        view={viewState.view}
                        onChangeView={viewState.setView}
                        onCreateIngredient={() => {
                            setSelectedIngredient(null)
                            viewState.setIsIngredientModalOpen(true)
                        }}
                    />
                )}
            />

            <main className="flex flex-col">
                <InventoryFiltersPanel
                    view={viewState.view}
                    analysisTab={viewState.analysisTab}
                    onChangeAnalysisTab={viewState.setAnalysisTab}
                    searchQuery={viewState.searchQuery}
                    onChangeSearchQuery={viewState.setSearchQuery}
                    stockStatus={viewState.stockStatus}
                    onChangeStockStatus={viewState.setStockStatus}
                    movementSearchQuery={viewState.movementSearchQuery}
                    onChangeMovementSearchQuery={viewState.setMovementSearchQuery}
                    movementTypeFilter={viewState.movementTypeFilter}
                    onChangeMovementTypeFilter={viewState.setMovementTypeFilter}
                    movementStartDate={viewState.movementStartDate}
                    onChangeMovementStartDate={viewState.setMovementStartDate}
                    movementEndDate={viewState.movementEndDate}
                    onChangeMovementEndDate={viewState.setMovementEndDate}
                    movementDateError={viewState.movementDateError}
                    onResetMovementFilters={viewState.resetMovementFilters}
                />

                <InventoryContent
                    view={viewState.view}
                    analysisTab={viewState.analysisTab}
                    isLoading={inventory.isLoading}
                    isBulkSyncing={inventory.isBulkSyncing}
                    ingredients={inventory.ingredients}
                    movements={inventory.movements}
                    syncingIngredientId={inventory.syncingIngredientId}
                    onAddMovement={(ingredient, type) => {
                        setSelectedIngredient(ingredient)
                        setActiveMovementType(type)
                        viewState.setIsMovementModalOpen(true)
                    }}
                    onEditIngredient={(ingredient) => {
                        setSelectedIngredient(ingredient)
                        viewState.setIsIngredientModalOpen(true)
                    }}
                    isBulkEditMode={viewState.isBulkEditMode}
                    onBulkSave={async (updates) => {
                        await inventory.bulkUpdateStock(updates)
                        viewState.setIsBulkEditMode(false)
                    }}
                    onToggleBulkMode={viewState.setIsBulkEditMode}
                    costImpacts={inventory.costImpacts}
                    foodCostAlerts={inventory.foodCostAlerts}
                    countDifferences={inventory.countDifferences}
                    criticalStockCount={inventory.summary?.criticalStockCount ?? 0}
                    isAnalysisLoading={inventory.isAnalysisLoading}
                />
            </main>

            <InventoryModals
                isIngredientModalOpen={viewState.isIngredientModalOpen}
                isMovementModalOpen={viewState.isMovementModalOpen}
                selectedIngredient={selectedIngredient}
                activeMovementType={activeMovementType}
                isSubmitting={inventory.isSubmitting}
                onCloseIngredientModal={() => viewState.setIsIngredientModalOpen(false)}
                onCloseMovementModal={() => viewState.setIsMovementModalOpen(false)}
                onSubmitIngredient={async (data) => {
                    if (selectedIngredient) {
                        await inventory.updateIngredient(selectedIngredient.id, data)
                    } else {
                        await inventory.createIngredient(data as Omit<Ingredient, 'id' | 'restaurant_id'>)
                    }
                    viewState.setIsIngredientModalOpen(false)
                }}
                onSubmitMovement={async (data) => {
                    await inventory.addMovement(data)
                    viewState.setIsMovementModalOpen(false)
                }}
            />
        </div>
    )
}
