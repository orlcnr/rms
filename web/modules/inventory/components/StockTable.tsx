'use client'

import React, { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, MoreVertical, Package, Save, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Ingredient, MovementType, BulkStockUpdate, IngredientUsage } from '../types'
import { StockStatusBadge } from '@/modules/shared/components/StockStatusBadge'
import { EmptyState } from '@/modules/shared/components/EmptyState'
import { formatNumericDisplay, handleNumericInput } from '@/modules/shared/utils/numeric'
import { inventoryApi } from '../services/inventory.service'

interface StockTableProps {
    ingredients: Ingredient[]
    onAddMovement: (ingredient: Ingredient, type: MovementType) => void
    onEdit: (ingredient: Ingredient) => void
    isBulkEditMode?: boolean
    onBulkSave?: (updates: BulkStockUpdate[]) => void
    onToggleBulkMode?: (enabled: boolean) => void
}

export function StockTable({ 
    ingredients, 
    onAddMovement, 
    onEdit,
    isBulkEditMode = false,
    onBulkSave,
    onToggleBulkMode
}: StockTableProps) {
    const [bulkQuantities, setBulkQuantities] = useState<Record<string, number>>({})
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [ingredientUsage, setIngredientUsage] = useState<Record<string, IngredientUsage>>({})
    const [loadingUsage, setLoadingUsage] = useState<Set<string>>(new Set())

    const handleQuantityChange = (ingredientId: string, value: string) => {
        const numValue = parseFloat(handleNumericInput(value)) || 0
        setBulkQuantities(prev => ({
            ...prev,
            [ingredientId]: numValue
        }))
    }

    const handleBulkSave = () => {
        if (!onBulkSave) return
        
        const updates = Object.entries(bulkQuantities)
            .filter(([id, qty]) => {
                const ingredient = ingredients.find(i => i.id === id)
                return ingredient && qty !== (ingredient.stock?.quantity || 0)
            })
            .map(([ingredientId, newQuantity]) => ({
                ingredientId,
                newQuantity
            }))

        if (updates.length > 0) {
            onBulkSave(updates)
            setBulkQuantities({})
        }
    }

    const hasChanges = Object.keys(bulkQuantities).some(id => {
        const ingredient = ingredients.find(i => i.id === id)
        return ingredient && bulkQuantities[id] !== (ingredient.stock?.quantity || 0)
    })

    // Handle expand/collapse
    const toggleRowExpand = async (ingredientId: string) => {
        const newExpanded = new Set(expandedRows)
        
        if (newExpanded.has(ingredientId)) {
            newExpanded.delete(ingredientId)
        } else {
            newExpanded.add(ingredientId)
            // Load usage data if not already loaded
            if (!ingredientUsage[ingredientId]) {
                setLoadingUsage(prev => new Set(prev).add(ingredientId))
                try {
                    const usage = await inventoryApi.getIngredientUsage(ingredientId)
                    setIngredientUsage(prev => ({ ...prev, [ingredientId]: usage }))
                } catch (error) {
                    console.error('Failed to load ingredient usage:', error)
                } finally {
                    setLoadingUsage(prev => {
                        const newSet = new Set(prev)
                        newSet.delete(ingredientId)
                        return newSet
                    })
                }
            }
        }
        
        setExpandedRows(newExpanded)
    }

    return (
        <div className="border border-border-light rounded-sm bg-bg-surface">
            {/* Header with Bulk Edit Toggle */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border-light bg-bg-muted/10">
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
                    Malzeme Listesi
                </h3>
                <div className="flex items-center gap-4">
                    {isBulkEditMode && hasChanges && (
                        <button
                            onClick={handleBulkSave}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-success-main text-white rounded hover:bg-success-hover transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Toplu Kaydet
                        </button>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                            Hızlı Sayım Modu
                        </span>
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={isBulkEditMode}
                                onChange={(e) => {
                                    onToggleBulkMode?.(e.target.checked)
                                    if (!e.target.checked) {
                                        setBulkQuantities({})
                                    }
                                }}
                            />
                            <div className="w-11 h-6 bg-bg-muted rounded-full peer peer-checked:bg-primary-main transition-colors" />
                            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                        </div>
                    </label>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full erp-table">
                    <thead>
                        <tr className="border-b border-border-light bg-bg-muted/10">
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary w-[40%]">MALZEME BİLGİSİ</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-center">BİRİM</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-right">MEVCUT STOK</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-center">MALİYET</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-center">DURUM</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary text-right">EYLEMLER</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                        {ingredients.length === 0 ? (
                            <tr>
                                <td colSpan={6}>
                                    <EmptyState
                                        icon={<Package className="w-8 h-8" />}
                                        title="ENVANTER KAYDI BULUNAMADI"
                                        className="py-16"
                                    />
                                </td>
                            </tr>
                        ) : ingredients.map((item) => {
                            const currentStock = item.stock?.quantity || 0
                            const displayQty = bulkQuantities[item.id] !== undefined 
                                ? String(Number(bulkQuantities[item.id]))
                                : String(Number(currentStock))
                            const isExpanded = expandedRows.has(item.id)
                            const isLoading = loadingUsage.has(item.id)
                            const usage = ingredientUsage[item.id]

                            return (
                                <React.Fragment key={item.id}>
                                    <tr className="group hover:bg-bg-hover transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                {/* Expand Button */}
                                                <button
                                                    onClick={() => toggleRowExpand(item.id)}
                                                    className="p-1 hover:bg-bg-muted rounded transition-colors"
                                                    title={isExpanded ? 'Kullanım detaylarını gizle' : 'Kullanım detaylarını göster'}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4 text-text-muted" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-text-muted" />
                                                    )}
                                                </button>
                                                
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-text-primary uppercase tracking-tight truncate leading-none">{item.name}</p>
                                                    <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase mt-2">
                                                        KRİTİK SEVİYE: <span className="text-text-secondary">{formatNumericDisplay(item.critical_level)} {item.unit}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest px-2 py-1 bg-bg-muted/30 rounded-sm">{item.unit}</span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {isBulkEditMode ? (
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={displayQty}
                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                    className="w-24 px-3 py-2 text-right text-base font-bold bg-bg-app border border-border-light rounded focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className="text-base font-bold tabular-nums tracking-tight text-text-primary">
                                                        {formatNumericDisplay(currentStock)}
                                                    </span>
                                                    <div className="w-24 h-2 bg-bg-muted rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-300 rounded-full ${
                                                                currentStock <= 0 ? 'bg-danger-main' :
                                                                currentStock <= item.critical_level ? 'bg-warning-main' : 
                                                                'bg-success-main'
                                                            }`}
                                                            style={{ width: `${item.critical_level > 0 ? Math.min((currentStock / item.critical_level) * 100, 100) : 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-sm font-semibold text-text-secondary">
                                                {item.average_cost 
                                                    ? `${formatNumericDisplay(item.average_cost)} ₺` 
                                                    : '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex justify-center">
                                                <StockStatusBadge 
                                                    status={
                                                        currentStock <= 0 ? 'out_of_stock' :
                                                        currentStock <= item.critical_level ? 'critical' :
                                                        'in_stock'
                                                    }
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                {!isBulkEditMode && (
                                                    <>
                                                        <button
                                                            onClick={() => onAddMovement(item, MovementType.IN)}
                                                            title="Stok Girişi"
                                                            className="p-2 text-success-main hover:bg-success-bg rounded-sm transition-all border border-transparent hover:border-success-border"
                                                        >
                                                            <ArrowUpRight className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => onAddMovement(item, MovementType.OUT)}
                                                            title="Stok Çıkışı"
                                                            className="p-2 text-danger-main hover:bg-danger-bg rounded-sm transition-all border border-transparent hover:border-danger-border"
                                                        >
                                                            <ArrowDownRight className="w-5 h-5" />
                                                        </button>
                                                        <div className="w-px h-5 bg-border-light mx-1" />
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => onEdit(item)}
                                                    title="Düzenle"
                                                    className="p-2 text-text-muted hover:bg-bg-hover hover:text-text-primary rounded-sm transition-all border border-transparent hover:border-border-light"
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    {/* Expandable Row - Product Usage */}
                                    {isExpanded && (
                                        <tr className="bg-bg-muted/20">
                                            <td colSpan={6} className="px-4 py-4">
                                                {isLoading ? (
                                                    <div className="flex items-center gap-2 text-text-muted">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span className="text-xs">Kullanım bilgileri yükleniyor...</span>
                                                    </div>
                                                ) : usage ? (
                                                    <div>
                                                        <h4 className="text-xs font-bold uppercase mb-3 text-text-secondary">
                                                            Kullanıldığı Ürünler ({usage.total_products_affected})
                                                        </h4>
                                                        {usage.products.length > 0 ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                {usage.products.map((product) => (
                                                                    <div 
                                                                        key={product.product_id}
                                                                        className="flex items-center justify-between px-3 py-2 bg-bg-surface border border-border-light rounded-sm"
                                                                    >
                                                                        <span className="text-sm font-medium text-text-primary">
                                                                            {product.product_name}
                                                                        </span>
                                                                        <span className="text-xs text-text-muted">
                                                                            {formatNumericDisplay(product.quantity)} {usage.ingredient.unit}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-text-muted">
                                                                Bu malzeme hiçbir üründe kullanılmıyor.
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-text-muted">
                                                        Kullanım bilgisi yüklenemedi.
                                                    </p>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
