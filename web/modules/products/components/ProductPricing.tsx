'use client';

import React, { useMemo } from 'react';
import { FormInput } from '@/modules/shared/components/FormInput';
import { RmsSwitch } from '@/modules/shared/components/RmsSwitch';
import { FormSection } from '@/modules/shared/components/FormSection';
import { handleNumericInput, formatNumericDisplay, formatCurrency } from '@/modules/shared/utils/numeric';
import { AlertTriangle } from 'lucide-react';
import { RecipeItem } from '../types';

// ============================================
// PROPS
// ============================================

interface ProductPricingProps {
  formData: {
    name: string;
    description: string;
    price: string;
    category_id: string;
    is_available: boolean;
    track_inventory: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    price: string;
    category_id: string;
    is_available: boolean;
    track_inventory: boolean;
  }>>;
  recipes?: Partial<RecipeItem>[];
  ingredientOptions?: Array<{
    id: string;
    average_cost?: number;
  }>;
}

// ============================================
// COMPONENT
// ============================================

export function ProductPricing({ 
  formData, 
  setFormData,
  recipes = [],
  ingredientOptions = []
}: ProductPricingProps) {
  const handlePriceChange = (value: string) => {
    setFormData({ ...formData, price: value });
  };

  // Calculate cost metrics
  const costMetrics = useMemo(() => {
    // Toplam reçete maliyeti hesapla
    const totalRecipeCost = recipes.reduce((sum, recipe) => {
      const option = ingredientOptions.find(o => o.id === recipe.ingredient_id);
      const cost = option?.average_cost || 0;
      const quantity = Number(recipe.quantity) || 0;
      return sum + (cost * quantity);
    }, 0);

    // Satış fiyatı
    const sellingPrice = Number(formData.price) || 0;
    
    // Food Cost Oranı
    const foodCostRatio = sellingPrice > 0 ? (totalRecipeCost / sellingPrice) * 100 : 0;
    
    // Brüt kâr
    const grossProfit = sellingPrice - totalRecipeCost;
    
    // Uyarı durumları
    const isHighCost = foodCostRatio > 35;
    const isLoss = sellingPrice > 0 && sellingPrice < totalRecipeCost;

    return {
      totalRecipeCost,
      sellingPrice,
      foodCostRatio,
      grossProfit,
      isHighCost,
      isLoss
    };
  }, [recipes, ingredientOptions, formData.price]);

  return (
    <div className="md:col-span-4 border-r border-border-light pr-6">
      <FormSection 
        title="FİYAT VE DURUM" 
        variant="success"
        showDivider={false}
        className="!pb-0"
      >
        <div className="space-y-4">
          {/* Price Input */}
          <FormInput
            id="productPrice"
            name="price"
            type="number"
            label="NET SATIŞ FİYATI (₺)"
            value={formData.price}
            onChange={handlePriceChange}
            placeholder="0,00"
            required
            inputMode="decimal"
            textAlign="right"
            fontSize="xl"
          />

          {/* Availability Toggle */}
          <RmsSwitch
            checked={formData.is_available}
            onChange={(checked) => setFormData({ ...formData, is_available: checked })}
            label="Satış Durumu"
            labelOn="AKTİF"
            labelOff="PASİF"
            theme="success"
          />

          {/* Inventory Tracking Toggle */}
          <RmsSwitch
            checked={formData.track_inventory}
            onChange={(checked) => setFormData({ ...formData, track_inventory: checked })}
            label="Stok Takibi"
            labelOn="EVET"
            labelOff="HAYIR"
            theme="info"
          />
        </div>

        {/* Cost Summary Section - Show when inventory tracking is enabled and recipes exist */}
        {formData.track_inventory && recipes.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border-light space-y-3">
            {/* Toplam Reçete Maliyeti */}
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                Toplam Reçete Maliyeti
              </span>
              <span className="text-sm font-bold text-text-primary">
                {formatCurrency(costMetrics.totalRecipeCost)}
              </span>
            </div>
            
            {/* Food Cost Oranı */}
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                Food Cost Oranı
              </span>
              <div className="flex items-center gap-2">
                {costMetrics.isHighCost && (
                  <AlertTriangle size={14} className="text-danger-main" />
                )}
                <span className={`text-sm font-bold ${costMetrics.isHighCost ? 'text-danger-main' : 'text-text-primary'}`}>
                  %{costMetrics.foodCostRatio.toFixed(1)}
                </span>
              </div>
            </div>
            
            {/* Brüt Kâr */}
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                Brüt Kâr
              </span>
              <span className={`text-sm font-bold ${costMetrics.isLoss ? 'text-danger-main' : 'text-success-main'}`}>
                {formatCurrency(costMetrics.grossProfit)}
              </span>
            </div>
            
            {/* Uyarılar */}
            {costMetrics.isLoss && (
              <div className="flex items-center gap-2 p-2 bg-danger-subtle border border-danger-main/20 rounded-sm">
                <AlertTriangle size={16} className="text-danger-main" />
                <span className="text-xs font-bold text-danger-main uppercase tracking-wider">
                  Zararına Satış!
                </span>
              </div>
            )}
            
            {costMetrics.isHighCost && !costMetrics.isLoss && (
              <div className="flex items-center gap-2 p-2 bg-warning-subtle border border-warning-main/20 rounded-sm">
                <AlertTriangle size={16} className="text-warning-main" />
                <span className="text-xs font-bold text-warning-main uppercase tracking-wider">
                  Yüksek Maliyet! (%35 üzeri)
                </span>
              </div>
            )}
          </div>
        )}
      </FormSection>
    </div>
  );
}
