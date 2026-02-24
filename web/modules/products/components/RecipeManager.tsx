'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Package, PlusCircle, Trash2, X } from 'lucide-react';
import { RecipeItem } from '../types';
import { MovementType } from '../../inventory/types';
import { SearchableSelect } from '@/modules/shared/components/SearchableSelect';
import { AddIngredientModal } from '@/modules/shared/components/AddIngredientModal';
import { FormSection } from '@/modules/shared/components/FormSection';
import { FormInput } from '@/modules/shared/components/FormInput';
import { toast } from 'sonner';
import { inventoryApi } from '../../inventory/services/inventory.service';
import { formatNumericDisplay, handleNumericInput, formatCurrency } from '@/modules/shared/utils/numeric';

// ============================================
// PROPS
// ============================================

interface RecipeManagerProps {
  recipes: Partial<RecipeItem>[];
  setRecipes: React.Dispatch<React.SetStateAction<Partial<RecipeItem>[]>>;
  track_inventory: boolean;
  ingredientOptions: Array<{
    id: string;
    label: string;
    sublabel?: string;
    average_cost?: number;
  }>;
  searchIngredients: (query: string) => Promise<Array<{ id: string; label: string; sublabel?: string; average_cost?: number }>>;
  addRecipeItem: () => void;
  removeRecipeItem: (index: number) => void;
  updateRecipeItem: (index: number, field: keyof RecipeItem, value: any) => void;
  restaurantId: string;
  initialData?: {
    recipes?: Array<{
      ingredient_id?: string;
      quantity?: number;
    }>;
  };
}

// ============================================
// COMPONENT
// ============================================

export function RecipeManager({
  recipes,
  setRecipes,
  track_inventory,
  ingredientOptions,
  searchIngredients,
  addRecipeItem,
  removeRecipeItem,
  updateRecipeItem,
  restaurantId,
}: RecipeManagerProps) {
  // Stock adjustment state
  const [adjustingIngredient, setAdjustingIngredient] = useState<string | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({ quantity: '', type: MovementType.IN });
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Add ingredient modal state
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number | null>(null);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  // Get ingredient cost by ID
  const getIngredientCost = useCallback((ingredientId?: string): number => {
    if (!ingredientId) return 0;
    const option = ingredientOptions.find(o => o.id === ingredientId);
    return option?.average_cost || 0;
  }, [ingredientOptions]);

  // Get ingredient unit by ID
  const getIngredientUnit = useCallback((ingredientId?: string): string => {
    if (!ingredientId) return '';
    const option = ingredientOptions.find(o => o.id === ingredientId);
    return option?.sublabel || '';
  }, [ingredientOptions]);

  // Calculate line total (quantity * average_cost)
  const calculateLineTotal = useCallback((recipe: Partial<RecipeItem>): number => {
    const cost = getIngredientCost(recipe.ingredient_id);
    const quantity = Number(recipe.quantity) || 0;
    return cost * quantity;
  }, [getIngredientCost]);

  // Calculate total recipe cost
  const totalRecipeCost = useMemo(() => {
    return recipes.reduce((sum, recipe) => sum + calculateLineTotal(recipe), 0);
  }, [recipes, calculateLineTotal]);

  // Handle quick stock adjustment
  const handleStockAdjustment = useCallback(async (ingredientId: string) => {
    if (!adjustmentData.quantity || Number(adjustmentData.quantity) <= 0) return;
    
    setIsAdjusting(true);
    try {
      await inventoryApi.addMovement({
        ingredient_id: ingredientId,
        quantity: Number(adjustmentData.quantity),
        type: adjustmentData.type,
        reason: 'Ürün Reçete Ekranından Hızlı Düzenleme'
      });
      toast.success('Stok hareketi kaydedildi');
      setAdjustingIngredient(null);
      setAdjustmentData({ quantity: '', type: MovementType.IN });
    } catch (error) {
      toast.error('Stok hareketi kaydedilemedi');
    } finally {
      setIsAdjusting(false);
    };
  }, [adjustmentData]);

  // Handle adding new ingredient
  const handleAddNewIngredient = useCallback((name: string, recipeIndex: number) => {
    setSelectedRecipeIndex(recipeIndex);
    setShowAddIngredientModal(true);
  }, []);

  // Success callback for modal
  const handleIngredientCreated = useCallback((ingredientId: string) => {
    if (selectedRecipeIndex !== null) {
      updateRecipeItem(selectedRecipeIndex, 'ingredient_id' as any, ingredientId);
    }
    setSelectedRecipeIndex(null);
  }, [selectedRecipeIndex, updateRecipeItem]);

  return (
    <div className="md:col-span-8">
      <FormSection 
        title="REÇETE YÖNETİMİ" 
        variant="info"
        showDivider={false}
        className="!pb-0"
        actions={
          track_inventory ? (
            <button
              type="button"
              onClick={addRecipeItem}
              className="px-4 py-1.5 bg-bg-app border border-border-light hover:border-info-main hover:text-info-main transition-all text-text-secondary text-[9px] font-black uppercase tracking-widest rounded-sm shadow-sm flex items-center gap-2"
            >
              <PlusCircle size={14} />
              YENİ MALZEME
            </button>
          ) : undefined
        }
      >
        {/* Content based on track_inventory and recipes */}
        {!track_inventory ? (
          <div className="h-full border border-dashed border-border-light rounded-sm flex flex-col items-center justify-center p-12 text-center opacity-40 bg-bg-app/50 grayscale">
            <Package size={48} className="text-text-muted mb-4" />
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] max-w-[200px]">
              BU ÜRÜN İÇİN STOK TAKİBİ AKTİF DEĞİL
            </p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="h-full border border-dashed border-border-light rounded-sm flex flex-col items-center justify-center p-12 text-center bg-bg-app/30">
            <PlusCircle size={32} className="text-text-muted/40 mb-3" />
            <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">
              HENÜZ REÇETE TANIMLANMADI
            </p>
            <button 
              type="button" 
              onClick={addRecipeItem} 
              className="mt-4 text-[9px] font-black text-primary-main underline underline-offset-4 uppercase tracking-[0.2em]"
            >
              MALZEME LİSTESİ OLUŞTUR
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table Header */}
            <div className="flex items-center gap-3 px-2 pb-2 border-b border-border-light">
              <div className="flex-1">
                <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">MALZEME</span>
              </div>
              <div className="w-24 text-right">
                <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">MİKTAR</span>
              </div>
              <div className="w-28 text-right">
                <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">BİRİM MALİYET</span>
              </div>
              <div className="w-28 text-right">
                <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">SATIR TOPLAM</span>
              </div>
              <div className="w-16"></div>
            </div>
            
            {/* Recipe Items */}
            {recipes.map((recipe, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 bg-bg-app py-3 px-2 border border-border-light rounded-sm group relative animate-in fade-in slide-in-from-right-2 duration-300"
              >
                {/* Ingredient Select */}
                <div className="flex-1">
                  <SearchableSelect
                    key={`recipe-${index}-${recipe.ingredient_id}`}
                    options={ingredientOptions}
                    selectedId={recipe.ingredient_id || undefined}
                    onChange={(option) => {
                      if (option.id) {
                        updateRecipeItem(index, 'ingredient_id' as any, option.id);
                      }
                    }}
                    onSearch={searchIngredients}
                    placeholder="Malzeme seçin veya arayın..."
                    showAddNew={true}
                    onAddNew={(name) => handleAddNewIngredient(name, index)}
                  />
                </div>

                {/* Quantity Input */}
                <div className="w-24">
                  <FormInput
                    id={`recipe-quantity-${index}`}
                    name="quantity"
                    type="text"
                    value={formatNumericDisplay(recipe.quantity)}
                    onChange={(value) => updateRecipeItem(index, 'quantity' as any, handleNumericInput(value))}
                    placeholder="0"
                    inputMode="decimal"
                    textAlign="right"
                  />
                </div>

                {/* Unit Cost Display */}
                <div className="w-28 text-right">
                  <span className="text-xs font-semibold text-text-secondary">
                    {formatCurrency(getIngredientCost(recipe.ingredient_id))}
                  </span>
                  <span className="text-[9px] text-text-muted block">
                    /{getIngredientUnit(recipe.ingredient_id) || 'birim'}
                  </span>
                </div>

                {/* Line Total Display */}
                <div className="w-28 text-right">
                  <span className="text-xs font-bold text-text-primary">
                    {formatCurrency(calculateLineTotal(recipe))}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1 pr-1 items-center">
                  <button
                    type="button"
                    onClick={() => setAdjustingIngredient(recipe.ingredient_id || null)}
                    className="p-2 text-text-muted hover:text-success-main transition-colors rounded-sm hover:bg-success-subtle"
                    title="HIZLI STOK DÜZENLEME"
                  >
                    <PlusCircle size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecipeItem(index);
                    }}
                    className="p-2 text-text-muted hover:text-danger-main transition-colors rounded-sm hover:bg-danger-subtle cursor-pointer"
                    title="MALZEMEYİ SİL"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Stock Adjustment Overlay */}
                {adjustingIngredient === recipe.ingredient_id && (
                  <div className="absolute inset-x-0 bottom-full mb-2 bg-bg-surface border border-border-light rounded-sm p-3 shadow-xl animate-in fade-in slide-in-from-bottom-2 z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] font-black text-text-primary uppercase tracking-widest">
                        HIZLI STOK DÜZENLEME
                      </span>
                      <button 
                        onClick={() => setAdjustingIngredient(null)} 
                        className="text-text-muted hover:text-text-primary"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <select
                        className="bg-bg-app border border-border-light text-sm font-semibold p-2 rounded-sm outline-none"
                        value={adjustmentData.type}
                        onChange={(e) => setAdjustmentData({ ...adjustmentData, type: e.target.value as any })}
                      >
                        <option value={MovementType.IN}>GİRİŞ (+)</option>
                        <option value={MovementType.OUT}>ÇIKIŞ (-)</option>
                      </select>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="flex-1 bg-bg-app border border-border-light text-base font-semibold p-2 rounded-sm outline-none"
                        placeholder="MİKTAR"
                        value={adjustmentData.quantity}
                        onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })}
                      />
                      <button
                        onClick={() => handleStockAdjustment(recipe.ingredient_id!)}
                        disabled={isAdjusting || !adjustmentData.quantity}
                        className="px-3 bg-primary-main text-text-inverse text-[9px] font-black rounded-sm hover:bg-primary-hover disabled:opacity-50"
                      >
                        {isAdjusting ? '...' : 'ONAY'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Total Recipe Cost Summary */}
        {track_inventory && recipes.length > 0 && (
          <div className="flex justify-end items-center gap-4 pt-4 mt-2 border-t border-border-light">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
              Toplam Reçete Maliyeti
            </span>
            <span className="text-sm font-bold text-text-primary">
              {formatCurrency(totalRecipeCost)}
            </span>
          </div>
        )}
      </FormSection>

      {/* Add Ingredient Modal */}
      <AddIngredientModal
        isOpen={showAddIngredientModal}
        onClose={() => {
          setShowAddIngredientModal(false);
          setSelectedRecipeIndex(null);
        }}
        onSuccess={handleIngredientCreated}
        restaurantId={restaurantId}
      />
    </div>
  );
}
