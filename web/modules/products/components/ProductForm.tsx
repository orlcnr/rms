'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { AlertTriangle, ArrowRight, FileText, ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import { 
    Category, 
    MenuItem, 
    CreateMenuItemInput, 
    RecipeItem,
    DEFAULT_FORM_DATA
} from '../types'
import { Ingredient } from '../../inventory/types'
import { ProductGeneralInfo } from './ProductGeneralInfo'
import { RecipeManager } from './RecipeManager'
import { formatCurrency } from '@/modules/shared/utils/numeric'

interface ProductFormProps {
    initialData?: MenuItem
    categories: Category[]
    ingredients: Ingredient[]
    restaurantId: string
    onSubmit: (data: Partial<CreateMenuItemInput>, file?: File) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

export function ProductForm({ 
    initialData, 
    categories, 
    ingredients, 
    restaurantId, 
    onSubmit, 
    onCancel, 
    isLoading 
}: ProductFormProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'recipe'>('general')

    // Use the hook for state management
    const { hook } = useProductForm({
        initialData,
        categories,
        ingredients,
        restaurantId,
        onSubmit,
        onCancel,
        isLoading
    })

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const validRecipes = hook.recipes.filter(
            (recipe) =>
                typeof recipe.ingredient_id === 'string' &&
                recipe.ingredient_id.trim().length > 0 &&
                Number(recipe.quantity) > 0,
        )

        const hasInvalidRecipeQuantity = hook.recipes.some(
            (recipe) =>
                typeof recipe.ingredient_id === 'string' &&
                recipe.ingredient_id.trim().length > 0 &&
                Number(recipe.quantity) <= 0,
        )

        if (hook.formData.track_inventory && validRecipes.length === 0) {
            setActiveTab('recipe')
            toast.error(
                hasInvalidRecipeQuantity
                    ? 'Seçili reçete satırlarında miktar 0’dan büyük olmalıdır.'
                    : 'Stok takibi açıkken en az 1 reçete girmelisiniz.',
            )
            return
        }

        await hook.handleFormSubmit(e)
    }

    const costMetrics = React.useMemo(() => {
        const totalRecipeCost = hook.recipes.reduce((sum, recipe) => {
            const option = hook.ingredientOptions.find((o) => o.id === recipe.ingredient_id)
            const cost = option?.average_cost || 0
            const quantity = Number(recipe.quantity) || 0
            return sum + cost * quantity
        }, 0)

        const sellingPrice = Number(hook.formData.price) || 0
        const foodCostRatio = sellingPrice > 0 ? (totalRecipeCost / sellingPrice) * 100 : 0
        const grossProfit = sellingPrice - totalRecipeCost
        const isHighCost = foodCostRatio > 35
        const isLoss = sellingPrice > 0 && sellingPrice < totalRecipeCost

        return {
            totalRecipeCost,
            foodCostRatio,
            grossProfit,
            isHighCost,
            isLoss,
        }
    }, [hook.formData.price, hook.ingredientOptions, hook.recipes])

    return (
        <form onSubmit={handleFormSubmit} className="space-y-6 bg-bg-surface border border-border-light rounded-sm p-6 sm:p-8 shadow-sm">
            <div className="space-y-2">
                <div className="flex items-center gap-2 bg-bg-hover p-1 rounded-sm border border-border-light">
                <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'general'
                        ? 'bg-bg-surface text-primary-main shadow-sm border border-primary-main/30'
                        : 'text-text-muted hover:text-text-primary'
                        }`}
                >
                    <FileText size={14} />
                    Genel Bilgiler
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('recipe')}
                    className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] rounded-sm transition-all flex items-center gap-2 ${activeTab === 'recipe'
                        ? 'bg-bg-surface text-primary-main shadow-sm border border-primary-main/30'
                        : 'text-text-muted hover:text-text-primary'
                        }`}
                >
                    <ListChecks size={14} />
                    Reçete Yönetimi
                </button>
            </div>
                <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">
                    {activeTab === 'general'
                        ? 'Ürün adı, kategori, fiyat ve satış durumunu yönetin'
                        : 'Stok takibi ve reçete/malzeme tanımlarını yönetin'}
                </p>
            </div>

            <div className="flex flex-col gap-8">
                {activeTab === 'general' ? (
                    <>
                        <ProductGeneralInfo
                            formData={hook.formData}
                            setFormData={hook.setFormData}
                            categories={categories}
                            previewUrl={hook.previewUrl}
                            fileInputRef={hook.fileInputRef as any}
                            handleFileChange={hook.handleFileChange}
                            removeFile={hook.removeFile}
                        />
                    </>
                ) : (
                    <>
                        {hook.formData.track_inventory && hook.recipes.length > 0 ? (
                            <div className="border border-border-light rounded-sm p-4 bg-bg-app">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-3">
                                    Reçete Maliyet Özeti
                                </h4>
                                <div className="mt-6 pt-4 border-t border-border-light space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                                            Toplam Reçete Maliyeti
                                        </span>
                                        <span className="text-sm font-bold text-text-primary">
                                            {formatCurrency(costMetrics.totalRecipeCost)}
                                        </span>
                                    </div>

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

                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                                            Brüt Kâr
                                        </span>
                                        <span className={`text-sm font-bold ${costMetrics.isLoss ? 'text-danger-main' : 'text-success-main'}`}>
                                            {formatCurrency(costMetrics.grossProfit)}
                                        </span>
                                    </div>

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
                            </div>
                        ) : null}

                        <RecipeManager
                            recipes={hook.recipes}
                            setRecipes={hook.setRecipes}
                            track_inventory={hook.formData.track_inventory}
                            setTrackInventory={(enabled) =>
                                hook.setFormData((prev) => ({ ...prev, track_inventory: enabled }))
                            }
                            ingredientOptions={hook.ingredientOptions}
                            searchIngredients={hook.searchIngredients}
                            addRecipeItem={hook.addRecipeItem}
                            removeRecipeItem={hook.removeRecipeItem}
                            updateRecipeItem={hook.updateRecipeItem}
                            restaurantId={restaurantId}
                            initialData={initialData}
                            className="md:col-span-12"
                        />
                    </>
                )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-border-light">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-8 py-3 bg-bg-app border border-border-light hover:bg-bg-hover text-text-secondary text-[10px] font-black uppercase tracking-[0.15em] transition-all rounded-sm"
                    disabled={isLoading}
                >
                    İPTAL ET
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="min-w-[200px] px-10 py-3 bg-primary-main hover:bg-primary-hover text-text-inverse text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-sm shadow-sm flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <div className="w-3.5 h-3.5 border-2 border-text-inverse/30 border-t-text-inverse rounded-full animate-spin" />
                            <span>KAYDEDİLİYOR...</span>
                        </>
                    ) : (
                        <>
                            <span>{initialData ? 'DEĞİŞİKLİKLERİ KAYDET' : 'ÜRÜNÜ SİSTEME EKLE'}</span>
                            <ArrowRight size={14} />
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}

// ============================================
// useProductForm Hook (Inline for convenience)
// ============================================

import { inventoryApi } from '../../inventory/services/inventory.service'

interface UseProductFormProps {
  initialData?: MenuItem
  categories: Category[]
  ingredients: Ingredient[]
  restaurantId: string
  onSubmit: (data: Partial<CreateMenuItemInput>, file?: File) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

function useProductForm({
  initialData,
  categories,
  ingredients,
  restaurantId,
  onSubmit,
  onCancel,
  isLoading,
}: UseProductFormProps) {
  // ==================== STATE ====================
  const [formData, setFormData] = useState({
    name: initialData?.name || DEFAULT_FORM_DATA.name,
    description: initialData?.description || DEFAULT_FORM_DATA.description,
    price: initialData?.price?.toString() || DEFAULT_FORM_DATA.price,
    category_id: initialData?.category_id || DEFAULT_FORM_DATA.category_id,
    is_available: initialData?.is_available ?? DEFAULT_FORM_DATA.is_available,
    track_inventory: initialData?.track_inventory ?? DEFAULT_FORM_DATA.track_inventory,
  })

  const [recipes, setRecipes] = useState<Partial<RecipeItem>[]>(
    initialData?.recipes?.map(r => ({
      ingredient_id: r.ingredient_id,
      quantity: r.quantity
    })) || []
  )

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.image_url || null)
  const [newIngredients, setNewIngredients] = useState<Ingredient[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (initialData?.image_url) {
      setPreviewUrl(initialData.image_url)
    }
  }, [initialData?.image_url])

  // ==================== COMPUTED ====================
  const ingredientOptions = React.useMemo(() => {
    const baseOptions = ingredients.map(ing => ({
      id: ing.id,
      label: ing.name,
      sublabel: ing.unit,
      average_cost: ing.average_cost
    }))
    
    const newOptions = newIngredients.map(ing => ({
      id: ing.id,
      label: ing.name,
      sublabel: ing.unit,
      average_cost: ing.average_cost
    }))
    
    if (initialData?.recipes) {
      const recipeIngredientIds = new Set([...baseOptions.map(o => o.id), ...newOptions.map(o => o.id)])
      const additionalOptions = initialData.recipes
        .filter(r => r.ingredient_id && !recipeIngredientIds.has(r.ingredient_id))
        .map(r => ({
          id: r.ingredient_id!,
          label: r.ingredient?.name || 'Bilinmeyen Malzeme',
          sublabel: r.ingredient?.unit || '',
          average_cost: (r.ingredient as any)?.average_cost
        }))
      return [...baseOptions, ...newOptions, ...additionalOptions]
    }
    
    return [...baseOptions, ...newOptions]
  }, [ingredients, initialData?.recipes, newIngredients])

  // ==================== ACTIONS ====================
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const removeFile = useCallback(() => {
    setSelectedFile(null)
    setPreviewUrl(initialData?.image_url || null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [initialData?.image_url])

  const addRecipeItem = useCallback(() => {
    setRecipes((prev) => [...prev, { ingredient_id: '', quantity: 1 }])
  }, [])

  const removeRecipeItem = useCallback((index: number) => {
    setRecipes((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateRecipeItem = useCallback(
    (index: number, field: keyof RecipeItem, value: any) => {
      setRecipes((prev) =>
        prev.map((recipe, i) =>
          i === index ? { ...recipe, [field]: value } : recipe,
        ),
      )
    },
    [],
  )

  // API-based async search for ingredients
  const searchIngredients = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) return []
    
    try {
      const response = await inventoryApi.getIngredients({ 
        name: query, 
        page: 1, 
        limit: 50 
      })
      
      const items = (response as any).data?.items || response.items || []
      return items.map((ing: Ingredient) => ({
        id: ing.id,
        label: ing.name,
        sublabel: ing.unit,
        average_cost: ing.average_cost
      }))
    } catch (error) {
      console.error('Ingredient search error:', error)
      return []
    }
  }, [])

  // Form submit handler
  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Calculate total recipe cost
    const totalRecipeCost = recipes.reduce((sum, recipe) => {
      const option = ingredientOptions.find(o => o.id === recipe.ingredient_id)
      const cost = option?.average_cost || 0
      const quantity = Number(recipe.quantity) || 0
      return sum + (cost * quantity)
    }, 0)
    
    await onSubmit({
      ...formData,
      price: Number(formData.price) || 0,
      total_cost: totalRecipeCost,
      recipes: recipes
        .filter(r => r.ingredient_id && Number(r.quantity) > 0)
        .map(r => ({
          ingredient_id: r.ingredient_id!,
          quantity: Number(r.quantity)
        })) as any
    }, selectedFile || undefined)
  }, [formData, recipes, ingredientOptions, selectedFile, onSubmit])

  const hook = {
    formData,
    setFormData,
    recipes,
    setRecipes,
    selectedFile,
    setSelectedFile,
    previewUrl,
    newIngredients,
    fileInputRef,
    isLoading,
    categories,
    restaurantId,
    ingredientOptions,
    handleFileChange,
    removeFile,
    addRecipeItem,
    removeRecipeItem,
    updateRecipeItem,
    searchIngredients,
    handleFormSubmit,
    onCancel,
  }

  return { hook }
}
