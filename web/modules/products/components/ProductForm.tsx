'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { 
    Category, 
    MenuItem, 
    CreateMenuItemInput, 
    RecipeItem,
    DEFAULT_FORM_DATA
} from '../types'
import { Ingredient } from '../../inventory/types'
import { ProductGeneralInfo } from './ProductGeneralInfo'
import { ProductPricing } from './ProductPricing'
import { RecipeManager } from './RecipeManager'

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
        await hook.handleFormSubmit(e)
    }

    return (
        <form onSubmit={handleFormSubmit} className="space-y-6 bg-bg-surface border border-border-light rounded-sm p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col gap-10">
                {/* Product General Info */}
                <ProductGeneralInfo
                    formData={hook.formData}
                    setFormData={hook.setFormData}
                    categories={categories}
                    previewUrl={hook.previewUrl}
                    fileInputRef={hook.fileInputRef as any}
                    handleFileChange={hook.handleFileChange}
                    removeFile={hook.removeFile}
                />

                {/* Configuration Section - Pricing & Recipe */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Pricing */}
                    <ProductPricing
                        formData={hook.formData}
                        setFormData={hook.setFormData}
                        recipes={hook.recipes}
                        ingredientOptions={hook.ingredientOptions}
                    />

                    {/* Recipe Manager */}
                    <RecipeManager
                        recipes={hook.recipes}
                        setRecipes={hook.setRecipes}
                        track_inventory={hook.formData.track_inventory}
                        ingredientOptions={hook.ingredientOptions}
                        searchIngredients={hook.searchIngredients}
                        addRecipeItem={hook.addRecipeItem}
                        removeRecipeItem={hook.removeRecipeItem}
                        updateRecipeItem={hook.updateRecipeItem}
                        restaurantId={restaurantId}
                        initialData={initialData}
                    />
                </div>
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

import { toast } from 'sonner'
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
    setRecipes([...recipes, { ingredient_id: '', quantity: 0 }])
  }, [recipes])

  const removeRecipeItem = useCallback((index: number) => {
    const newRecipes = recipes.filter((_, i) => i !== index)
    setRecipes(newRecipes)
  }, [recipes])

  const updateRecipeItem = useCallback((index: number, field: keyof RecipeItem, value: any) => {
    const newRecipes = [...recipes]
    newRecipes[index] = { ...newRecipes[index], [field]: value }
    setRecipes(newRecipes)
  }, [recipes])

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
