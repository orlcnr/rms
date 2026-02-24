'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Category, MenuItem, CreateMenuItemInput, RecipeItem, DEFAULT_FORM_DATA } from '../types'
import { Ingredient } from '../../inventory/types'
import { inventoryApi } from '../../inventory/services/inventory.service'
import { productsApi } from '../services/products.service'

interface UseProductFormProps {
  initialData?: MenuItem
  categories: Category[]
  ingredients: Ingredient[]
  restaurantId: string
  onSubmit: (data: Partial<CreateMenuItemInput>, file?: File) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function useProductForm({
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
  
  // Modal states
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false)
  const [newIngredientData, setNewIngredientData] = useState({ name: '', unit: 'adet', critical_level: '' })
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number | null>(null)
  const [isCreatingIngredient, setIsCreatingIngredient] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ==================== EFFECTS ====================
  // Update preview when initialData changes
  useEffect(() => {
    if (initialData?.image_url) {
      setPreviewUrl(initialData.image_url)
    }
  }, [initialData?.image_url])

  // ==================== COMPUTED ====================
  // Ingredient options for search - combines ingredients from API and newly created ones
  const ingredientOptions = React.useMemo(() => {
    const baseOptions = ingredients.map(ing => ({
      id: ing.id,
      label: ing.name,
      sublabel: ing.unit
    }))
    
    const newOptions = newIngredients.map(ing => ({
      id: ing.id,
      label: ing.name,
      sublabel: ing.unit
    }))
    
    // During edit, also include ingredients from the recipe
    if (initialData?.recipes) {
      const recipeIngredientIds = new Set([...baseOptions.map(o => o.id), ...newOptions.map(o => o.id)])
      const additionalOptions = initialData.recipes
        .filter(r => r.ingredient_id && !recipeIngredientIds.has(r.ingredient_id))
        .map(r => ({
          id: r.ingredient_id!,
          label: r.ingredient?.name || 'Bilinmeyen Malzeme',
          sublabel: r.ingredient?.unit || ''
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

  // Open modal for adding new ingredient
  const handleAddNewIngredient = useCallback((name: string, recipeIndex: number) => {
    setNewIngredientData({ name, unit: 'adet', critical_level: '' })
    setSelectedRecipeIndex(recipeIndex)
    setShowAddIngredientModal(true)
  }, [])

  // Create new ingredient from modal
  const createIngredientFromModal = useCallback(async () => {
    if (!newIngredientData.name || !newIngredientData.unit) {
      toast.error('Malzeme adı ve birimi gereklidir')
      return
    }

    setIsCreatingIngredient(true)
    try {
      const newIngredient = await inventoryApi.createIngredient({
        name: newIngredientData.name.trim(),
        unit: newIngredientData.unit,
        restaurant_id: restaurantId,
        critical_level: newIngredientData.critical_level ? Number(newIngredientData.critical_level) : undefined,
      } as any)

      setNewIngredients(prev => [...prev, newIngredient])
      
      if (selectedRecipeIndex !== null) {
        updateRecipeItem(selectedRecipeIndex, 'ingredient_id', newIngredient.id)
      }
      
      setShowAddIngredientModal(false)
      setNewIngredientData({ name: '', unit: 'adet', critical_level: '' })
      setSelectedRecipeIndex(null)
      toast.success('Malzeme başarıyla eklendi')
    } catch (error) {
      console.error('Malzeme oluşturma hatası:', error)
      toast.error('Malzeme oluşturulamadı')
    } finally {
      setIsCreatingIngredient(false)
    }
  }, [newIngredientData, restaurantId, selectedRecipeIndex, updateRecipeItem])

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
        sublabel: ing.unit
      }))
    } catch (error) {
      console.error('Ingredient search error:', error)
      return []
    }
  }, [])

  // Form submit handler
  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      ...formData,
      price: Number(formData.price) || 0,
      recipes: recipes
        .filter(r => r.ingredient_id && Number(r.quantity) > 0)
        .map(r => ({
          ingredient_id: r.ingredient_id!,
          quantity: Number(r.quantity)
        })) as any
    }, selectedFile || undefined)
  }, [formData, recipes, selectedFile, onSubmit])

  return {
    // State
    formData,
    setFormData,
    recipes,
    setRecipes,
    selectedFile,
    setSelectedFile,
    previewUrl,
    newIngredients,
    showAddIngredientModal,
    newIngredientData,
    setNewIngredientData,
    isCreatingIngredient,
    fileInputRef,
    isLoading,
    categories,
    restaurantId,
    
    // Computed
    ingredientOptions,
    
    // Actions
    handleFileChange,
    removeFile,
    addRecipeItem,
    removeRecipeItem,
    updateRecipeItem,
    handleAddNewIngredient,
    createIngredientFromModal,
    setShowAddIngredientModal,
    searchIngredients,
    handleFormSubmit,
    onCancel,
  }
}

// Need to import React for useMemo
import React from 'react'
