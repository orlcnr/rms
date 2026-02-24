'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, History, Package, TrendingUp, Loader2 } from 'lucide-react'
import { Ingredient, PaginatedResponse, MovementType, StockMovement, StockStatus, BulkStockUpdate, CostImpact, FoodCostAlert, CountDifference } from '../types'
import { StockTable } from './StockTable'
import { MovementHistory } from './MovementHistory'
import { IngredientForm } from './IngredientForm'
import { StockMovementForm } from './StockMovementForm'
import { CostAnalysisCards } from './CostAnalysisCards'
import { CountDifferencesTable } from './CountDifferencesTable'
import { inventoryApi } from '../services/inventory.service'
import { Modal } from '@/modules/shared/components/Modal'
import { Button } from '@/modules/shared/components/Button'
import { SearchInput } from '@/modules/shared/components/SearchInput'
import { FilterPanel } from '@/modules/shared/components/FilterPanel'
import { FilterSelect } from '@/modules/shared/components/FilterSelect'
import { toast } from 'sonner'
import { useDebounce } from '@/modules/shared/hooks/useDebounce'
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
    const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredientsResponse.items)
    const [movements, setMovements] = useState<StockMovement[]>([])
    
    // Analysis data state
    const [costImpacts, setCostImpacts] = useState<CostImpact[]>([])
    const [foodCostAlerts, setFoodCostAlerts] = useState<FoodCostAlert[]>([])
    const [countDifferences, setCountDifferences] = useState<CountDifference[]>([])
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)
    
    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState('')
    const [stockStatus, setStockStatus] = useState<StockStatus>(StockStatus.ALL)
    const debouncedSearch = useDebounce(searchQuery, 300)
    const [isLoading, setIsLoading] = useState(false)

    // Modals state
    const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false)
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
    const [activeMovementType, setActiveMovementType] = useState<MovementType>(MovementType.IN)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Bulk edit mode state
    const [isBulkEditMode, setIsBulkEditMode] = useState(false)

    // Load analysis data when view changes to analysis
    useEffect(() => {
        if (view === 'analysis') {
            const fetchAnalysisData = async () => {
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
            }
            fetchAnalysisData()
        }
    }, [view])

    // Load movements if view changes
    useEffect(() => {
        if (view === 'movements') {
            const fetchMovements = async () => {
                setIsLoading(true)
                try {
                    const response = await inventoryApi.getStockMovements({ page: 1, limit: 50 })
                    setMovements(response.items)
                } catch (error) {
                    toast.error('Hareket geçmişi yüklenemedi.')
                } finally {
                    setIsLoading(false)
                }
            }
            fetchMovements()
        }
    }, [view])

    // Filter ingredients
    useEffect(() => {
        const refreshData = async () => {
            setIsLoading(true)
            try {
                const response = await inventoryApi.getIngredients({
                    page: 1,
                    limit: 20,
                    name: debouncedSearch || undefined,
                    status: stockStatus !== StockStatus.ALL ? stockStatus : undefined
                })
                setIngredients(response.items)
            } catch (error) {
                console.error('Failed to filter ingredients:', error)
            } finally {
                setIsLoading(false)
            }
        }

        if (debouncedSearch !== '' || view === 'list' || stockStatus !== StockStatus.ALL) {
            refreshData()
        }
    }, [debouncedSearch, view, stockStatus])

    const handleAddMovement = (ingredient: Ingredient, type: MovementType) => {
        setSelectedIngredient(ingredient)
        setActiveMovementType(type)
        setIsMovementModalOpen(true)
    }

    const handleEditIngredient = (ingredient: Ingredient) => {
        setSelectedIngredient(ingredient)
        setIsIngredientModalOpen(true)
    }

    const handleBulkSave = async (updates: BulkStockUpdate[]) => {
        setIsSubmitting(true)
        try {
            await inventoryApi.bulkUpdateStock(updates)
            toast.success('Stoklar başarıyla güncellendi.')
            setIsBulkEditMode(false)
            // Refresh ingredients
            const response = await inventoryApi.getIngredients({
                page: 1,
                limit: 20,
                name: debouncedSearch || undefined,
                status: stockStatus !== StockStatus.ALL ? stockStatus : undefined
            })
            setIngredients(response.items)
        } catch (error) {
            toast.error('Stok güncelleme başarısız oldu.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCreateIngredient = () => {
        setSelectedIngredient(null)
        setIsIngredientModalOpen(true)
    }

    const handleIngredientSubmit = async (data: any) => {
        setIsSubmitting(true)
        try {
            if (selectedIngredient) {
                const updated = await inventoryApi.updateIngredient(selectedIngredient.id, data)
                setIngredients(prev => prev.map(i => i.id === selectedIngredient.id ? updated : i))
                toast.success('Malzeme güncellendi.')
            } else {
                const created = await inventoryApi.createIngredient({ ...data, restaurant_id: restaurantId })
                setIngredients(prev => [created, ...prev])
                toast.success('Yeni malzeme eklendi.')
            }
            setIsIngredientModalOpen(false)
        } catch (error) {
            toast.error('İşlem başarısız oldu.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleMovementSubmit = async (data: any) => {
        setIsSubmitting(true)
        try {
            await inventoryApi.addMovement(data)

            // Update local ingredients stock
            setIngredients(prev => prev.map(i => {
                if (i.id === data.ingredient_id) {
                    const currentQty = Number(i.stock?.quantity || 0)
                    const change = Number(data.type === MovementType.OUT ? -data.quantity : data.quantity)
                    const newQuantity = Number((currentQty + change).toFixed(4))

                    return {
                        ...i,
                        stock: { ...i.stock, quantity: newQuantity } as any
                    }
                }
                return i
            }))

            toast.success('Stok hareketi başarıyla kaydedildi.')
            setIsMovementModalOpen(true) // Keep modal or close? Plan says close.
            setIsMovementModalOpen(false)
        } catch (error) {
            toast.error('Hareket kaydedilemedi.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // View button configurations
    const viewButtons = [
        { id: 'list' as ViewType, label: 'STOK', icon: Package, activeView: 'list' },
        { id: 'movements' as ViewType, label: 'HAREKETLER', icon: History, activeView: 'movements' },
        { id: 'analysis' as ViewType, label: 'MALİYET ANALİZİ', icon: TrendingUp, activeView: 'analysis' },
    ]

    return (
        <div className="space-y-6 pb-20">
            {/* Header Area - ERP Standard */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight uppercase">ENVANTER YÖNETİMİ</h1>
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mt-1">Stok Takibi ve Malzeme Hareketleri</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    <div className="flex items-center bg-bg-muted rounded-sm p-1">
                        {viewButtons.map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => setView(btn.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all",
                                    view === btn.id
                                        ? "bg-bg-surface text-text-primary shadow-sm"
                                        : "text-text-muted hover:text-text-secondary"
                                )}
                            >
                                <btn.icon size={14} />
                                <span className="hidden sm:inline">{btn.label}</span>
                            </button>
                        ))}
                    </div>
                    {view === 'list' && (
                        <Button
                            variant="primary"
                            size="md"
                            onClick={handleCreateIngredient}
                            className="gap-2"
                        >
                            <Plus size={18} />
                            <span>YENİ MALZEME</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters Panel - Only show for list view */}
            {view === 'list' && (
                <FilterPanel>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <SearchInput
                            placeholder="MALZEME ADI İLE ARA..."
                            value={searchQuery}
                            onChange={setSearchQuery}
                            className="flex-1"
                        />
                        <FilterSelect
                            value={stockStatus}
                            onChange={(value) => setStockStatus(value as StockStatus)}
                            options={[
                                { value: StockStatus.ALL, label: 'TÜMÜ' },
                                { value: StockStatus.CRITICAL, label: 'KRITIK' },
                                { value: StockStatus.OUT_OF_STOCK, label: 'STOK YOK' },
                                { value: StockStatus.HEALTHY, label: 'NORMAL' },
                            ]}
                            className="w-full sm:w-48"
                        />
                    </div>
                </FilterPanel>
            )}

            {/* Analysis Tabs - Only show for analysis view */}
            {view === 'analysis' && (
                <div className="flex items-center gap-2 border-b border-border-light pb-3">
                    <button
                        onClick={() => setAnalysisTab('overview')}
                        className={cn(
                            "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all",
                            analysisTab === 'overview'
                                ? "bg-primary-main text-white"
                                : "text-text-muted hover:text-text-primary hover:bg-bg-muted"
                        )}
                    >
                        Genel Bakış
                    </button>
                    <button
                        onClick={() => setAnalysisTab('count-diff')}
                        className={cn(
                            "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition-all",
                            analysisTab === 'count-diff'
                                ? "bg-primary-main text-white"
                                : "text-text-muted hover:text-text-primary hover:bg-bg-muted"
                        )}
                    >
                        Sayım Farkları
                    </button>
                </div>
            )}

            {/* Content Area */}
            {isLoading ? (
                <div className="bg-bg-surface border border-border-light rounded p-20 flex flex-col items-center justify-center shadow-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-main mb-4" />
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Veriler Yükleniyor...</span>
                </div>
            ) : (
                <div className="bg-bg-surface border border-border-light rounded shadow-sm overflow-hidden">
                    {view === 'list' ? (
                        <StockTable
                            ingredients={ingredients}
                            onAddMovement={handleAddMovement}
                            onEdit={handleEditIngredient}
                            isBulkEditMode={isBulkEditMode}
                            onBulkSave={handleBulkSave}
                            onToggleBulkMode={setIsBulkEditMode}
                        />
                    ) : view === 'movements' ? (
                        <MovementHistory movements={movements} />
                    ) : (
                        <div className="p-4">
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
