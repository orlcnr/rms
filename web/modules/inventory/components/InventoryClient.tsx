'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, History, Package, TrendingUp, Loader2 } from 'lucide-react'
import {
    Ingredient,
    PaginatedResponse,
    MovementType,
    StockMovement,
    StockStatus,
    BulkStockUpdate,
    CostImpact,
    FoodCostAlert,
    CountDifference
} from '../types'
import { StockTable } from './StockTable'
import { MovementHistory } from './MovementHistory'
import { IngredientForm } from './IngredientForm'
import { StockMovementForm } from './StockMovementForm'
import { CostAnalysisCards } from './CostAnalysisCards'
import { CountDifferencesTable } from './CountDifferencesTable'
import { Modal } from '@/modules/shared/components/Modal'
import { Button } from '@/modules/shared/components/Button'
import { FilterSelect } from '@/modules/shared/components/FilterSelect'
import { useDebounce } from '@/modules/shared/hooks/useDebounce'
import { useInventory } from '../hooks/useInventory'
import { SubHeaderSection, FilterSection, BodySection } from '@/modules/shared/components/layout'
import { cn } from '@/modules/shared/utils/cn'

interface InventoryClientProps {
    restaurantId: string
    initialIngredientsResponse: PaginatedResponse<Ingredient>
}

type ViewType = 'list' | 'movements' | 'analysis'
type AnalysisTabType = 'overview' | 'count-diff'

export function InventoryClient({ restaurantId, initialIngredientsResponse }: InventoryClientProps) {
    const [view, setView] = useState<ViewType>('list')
    const [analysisTab, setAnalysisTab] = useState<AnalysisTabType>('overview')

    // UI State
    const [searchQuery, setSearchQuery] = useState('')
    const [stockStatus, setStockStatus] = useState<StockStatus>(StockStatus.ALL)
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Modals state
    const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false)
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
    const [activeMovementType, setActiveMovementType] = useState<MovementType>(MovementType.IN)

    // Bulk edit mode state
    const [isBulkEditMode, setIsBulkEditMode] = useState(false)

    // Modularized logic via hook
    const {
        ingredients,
        movements,
        isLoading,
        isSubmitting,
        syncingIngredientId,
        isBulkSyncing,
        isSocketConnected,
        costImpacts,
        foodCostAlerts,
        countDifferences,
        isAnalysisLoading,
        fetchIngredients,
        fetchMovements,
        fetchAnalysisData,
        createIngredient,
        updateIngredient,
        addMovement,
        bulkUpdateStock
    } = useInventory({ restaurantId, initialIngredientsResponse })

    // Load analysis data when view changes to analysis
    useEffect(() => {
        if (view === 'analysis') {
            fetchAnalysisData()
        }
    }, [view, fetchAnalysisData])

    // Load movements if view changes
    useEffect(() => {
        if (view === 'movements') {
            fetchMovements()
        }
    }, [view, fetchMovements])

    // Filter ingredients
    useEffect(() => {
        const params = {
            name: debouncedSearch || undefined,
            status: stockStatus !== StockStatus.ALL ? stockStatus : undefined
        }

        if (debouncedSearch !== '' || view === 'list' || stockStatus !== StockStatus.ALL) {
            fetchIngredients(params)
        }
    }, [debouncedSearch, view, stockStatus, fetchIngredients])

    const handleAddMovement = (ingredient: Ingredient, type: MovementType) => {
        setSelectedIngredient(ingredient)
        setActiveMovementType(type)
        setIsMovementModalOpen(true)
    }

    const handleEditIngredient = (ingredient: Ingredient) => {
        setSelectedIngredient(ingredient)
        setIsIngredientModalOpen(true)
    }

    const handleBulkSave = async (updates: any[]) => {
        await bulkUpdateStock(updates)
        setIsBulkEditMode(false)
    }

    const handleCreateIngredient = () => {
        setSelectedIngredient(null)
        setIsIngredientModalOpen(true)
    }

    const handleIngredientSubmit = async (data: any) => {
        if (selectedIngredient) {
            await updateIngredient(selectedIngredient.id, data)
        } else {
            await createIngredient(data)
        }
        setIsIngredientModalOpen(false)
    }

    const handleMovementSubmit = async (data: any) => {
        await addMovement(data)
        setIsMovementModalOpen(false)
    }

    // View button configurations
    const viewButtons = [
        { id: 'list' as ViewType, label: 'STOK', icon: Package, activeView: 'list' },
        { id: 'movements' as ViewType, label: 'HAREKETLER', icon: History, activeView: 'movements' },
        { id: 'analysis' as ViewType, label: 'MALİYET ANALİZİ', icon: TrendingUp, activeView: 'analysis' },
    ]

    return (
        <div className="flex flex-col min-h-screen bg-bg-app">
            {/* SubHeader Section - Hybrid Logic */}
            <SubHeaderSection
                title="ENVANTER YÖNETİMİ"
                description="Stok Takibi ve Malzeme Hareketleri"
                isConnected={isSocketConnected}
                isSyncing={isBulkSyncing || syncingIngredientId !== null}
                onRefresh={() => fetchIngredients()}
                moduleColor="bg-primary-main"
                actions={view === 'list' && (
                    <Button
                        variant="primary"
                        onClick={handleCreateIngredient}
                        className="flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-[0.2em]"
                    >
                        <Plus size={18} />
                        YENİ MALZEME
                    </Button>
                )}
            />

            <main className="flex flex-col">
                {/* Filter Section - Consolidated */}
                {view === 'list' && (
                    <FilterSection className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-[400px] max-w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                placeholder="MALZEME ADI İLE ARA..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 text-[11px] font-black uppercase tracking-wider border border-border-light bg-bg-app rounded-sm focus:outline-none focus:border-primary-main placeholder:text-text-muted transition-all shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            {/* View Switcher */}
                            <div className="flex items-center bg-bg-hover p-1 rounded-sm border border-border-light">
                                {viewButtons.map((btn) => (
                                    <button
                                        key={btn.id}
                                        onClick={() => setView(btn.id)}
                                        className={cn(
                                            "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all",
                                            view === btn.id
                                                ? "bg-bg-surface text-primary-main shadow-sm border border-border-light"
                                                : "text-text-muted hover:text-text-primary"
                                        )}
                                    >
                                        <span className="hidden sm:inline">{btn.label}</span>
                                        <span className="sm:hidden"><btn.icon size={14} /></span>
                                    </button>
                                ))}
                            </div>

                            <FilterSelect
                                value={stockStatus}
                                onChange={(value) => setStockStatus(value as StockStatus)}
                                options={[
                                    { value: StockStatus.ALL, label: 'TÜMÜ' },
                                    { value: StockStatus.CRITICAL, label: 'KRITİK' },
                                    { value: StockStatus.OUT_OF_STOCK, label: 'STOK YOK' },
                                    { value: StockStatus.HEALTHY, label: 'NORMAL' },
                                ]}
                                className="w-[180px]"
                            />
                        </div>
                    </FilterSection>
                )}

                {/* Analysis Tabs */}
                {view === 'analysis' && (
                    <FilterSection className="flex items-center justify-between">
                        <div className="flex items-center bg-bg-hover p-1 rounded-sm border border-border-light">
                            {[
                                { id: 'overview', label: 'Genel Bakış' },
                                { id: 'count-diff', label: 'Sayım Farkları' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setAnalysisTab(tab.id as AnalysisTabType)}
                                    className={cn(
                                        "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all",
                                        analysisTab === tab.id
                                            ? "bg-bg-surface text-primary-main shadow-sm border border-border-light"
                                            : "text-text-muted hover:text-text-primary"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1 bg-bg-hover p-1 rounded-sm border border-border-light">
                            {viewButtons.map((btn) => (
                                <button
                                    key={btn.id}
                                    onClick={() => setView(btn.id)}
                                    className={cn(
                                        "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all",
                                        view === btn.id
                                            ? "bg-bg-surface text-primary-main shadow-sm border border-border-light"
                                            : "text-text-muted hover:text-text-primary"
                                    )}
                                >
                                    <btn.icon size={14} />
                                </button>
                            ))}
                        </div>
                    </FilterSection>
                )}

                {/* Movements Toolbar */}
                {view === 'movements' && (
                    <FilterSection className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-primary-main" />
                            <span className="text-xs font-black uppercase tracking-widest">Hareket Geçmişi</span>
                        </div>
                        <div className="flex items-center gap-1 bg-bg-hover p-1 rounded-sm border border-border-light">
                            {viewButtons.map((btn) => (
                                <button
                                    key={btn.id}
                                    onClick={() => setView(btn.id)}
                                    className={cn(
                                        "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all",
                                        view === btn.id
                                            ? "bg-bg-surface text-primary-main shadow-sm border border-border-light"
                                            : "text-text-muted hover:text-text-primary"
                                    )}
                                >
                                    <btn.icon size={14} />
                                </button>
                            ))}
                        </div>
                    </FilterSection>
                )}

                {/* Content Area */}
                <BodySection className="relative min-h-[600px] bg-bg-surface border-t-0">
                    {/* Bulk Syncing Overlay */}
                    {isBulkSyncing && (
                        <div className="absolute inset-0 bg-bg-surface/60 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                            <div className="flex items-center gap-3 px-6 py-4 bg-bg-surface border border-border-light shadow-2xl rounded-sm">
                                <Loader2 className="w-5 h-5 animate-spin text-primary-main" />
                                <span className="text-xs font-black uppercase tracking-widest text-text-primary">Stoklar Senkronize Ediliyor...</span>
                            </div>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-32">
                            <Loader2 className="w-10 h-10 animate-spin text-primary-main" />
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {view === 'list' ? (
                                <StockTable
                                    ingredients={ingredients}
                                    onAddMovement={handleAddMovement}
                                    onEdit={handleEditIngredient}
                                    isBulkEditMode={isBulkEditMode}
                                    onBulkSave={handleBulkSave}
                                    onToggleBulkMode={setIsBulkEditMode}
                                    syncingIngredientId={syncingIngredientId}
                                />
                            ) : view === 'movements' ? (
                                <MovementHistory movements={movements} />
                            ) : (
                                <div>
                                    {analysisTab === 'overview' ? (
                                        <CostAnalysisCards
                                            costImpacts={costImpacts}
                                            foodCostAlerts={foodCostAlerts}
                                            countDifferences={countDifferences}
                                            isLoading={isAnalysisLoading}
                                        />
                                    ) : (
                                        <CountDifferencesTable
                                            differences={countDifferences}
                                            isLoading={isAnalysisLoading}
                                        />
                                    )}
                                </div>
                            )
                            }
                        </div>
                    )}
                </BodySection>
            </main>

            {/* Modals are centralized here */}
            <Modal
                isOpen={isIngredientModalOpen}
                onClose={() => setIsIngredientModalOpen(false)}
                title={selectedIngredient ? 'MALZEME DÜZENLE' : 'YENİ MALZEME EKLE'}
                maxWidth="max-w-xl"
            >
                <IngredientForm
                    initialData={selectedIngredient || undefined}
                    onSubmit={handleIngredientSubmit}
                    onCancel={() => setIsIngredientModalOpen(false)}
                    isLoading={isSubmitting}
                />
            </Modal>

            <Modal
                isOpen={isMovementModalOpen}
                onClose={() => setIsMovementModalOpen(false)}
                title={`${selectedIngredient?.name || ''} - STOK HAREKETİ`}
                maxWidth="max-w-xl"
            >
                {selectedIngredient && (
                    <StockMovementForm
                        ingredient={selectedIngredient}
                        type={activeMovementType}
                        onSubmit={handleMovementSubmit}
                        onCancel={() => setIsMovementModalOpen(false)}
                        isLoading={isSubmitting}
                    />
                )}
            </Modal>
        </div>
    )
}
