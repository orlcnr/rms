import { http } from '@/modules/shared/api/http'
import {
    Ingredient,
    Stock,
    StockMovement,
    GetIngredientsDto,
    GetStockMovementsDto,
    PaginatedResponse,
    BulkStockUpdate,
    IngredientUsage,
    CostImpact,
    CountDifference,
    FoodCostAlert
} from '../types'

export const inventoryApi = {
    // Ingredients
    getIngredients: async (params: GetIngredientsDto) => {
        return http.get<PaginatedResponse<Ingredient>>('/inventory/ingredients', { params })
    },

    getIngredient: async (id: string) => {
        return http.get<Ingredient>(`/inventory/ingredients/${id}`)
    },

    createIngredient: async (data: any) => {
        return http.post<Ingredient>('/inventory/ingredients', data)
    },

    updateIngredient: async (id: string, data: any) => {
        return http.patch<Ingredient>(`/inventory/ingredients/${id}`, data)
    },

    deleteIngredient: async (id: string) => {
        return http.delete<void>(`/inventory/ingredients/${id}`)
    },

    // Stocks
    getStocks: async (restaurantId: string) => {
        return http.get<Stock[]>(`/inventory/stocks/restaurant/${restaurantId}`)
    },

    // Movements
    getStockMovements: async (params: GetStockMovementsDto) => {
        return http.get<PaginatedResponse<StockMovement>>('/inventory/movements', { params })
    },

    addMovement: async (data: any) => {
        return http.post<StockMovement>('/inventory/movements', data)
    },

    // Bulk stock update for quick count mode
    bulkUpdateStock: async (updates: BulkStockUpdate[]) => {
        return http.post<{ success: boolean }>('/inventory/stocks/bulk-update', { updates })
    },

    // Recipes
    getProductRecipe: async (productId: string) => {
        return http.get<any[]>(`/inventory/recipes/product/${productId}`)
    },

    createRecipe: async (data: any) => {
        return http.post<any>('/inventory/recipes', data)
    },

    deleteRecipe: async (id: string) => {
        return http.delete<void>(`/inventory/recipes/${id}`)
    },

    // ============================================
    // MALİYET ANALİZ METODLARI
    // ============================================

    // Malzemenin kullanıldığı ürünleri getir
    getIngredientUsage: async (id: string) => {
        return http.get<IngredientUsage>(`/inventory/ingredients/${id}/usage`)
    },

    // Maliyet etkisi (fiyatı en çok artanlar)
    getCostImpact: async (days: number = 7) => {
        return http.get<CostImpact[]>('/inventory/ingredients/cost-impact', { params: { days } })
    },

    // Sayım farkları
    getCountDifferences: async (weeks: number = 4) => {
        return http.get<CountDifference[]>('/inventory/analysis/count-differences', { params: { weeks } })
    },

    // Food Cost uyarıları
    getFoodCostAlerts: async () => {
        return http.get<FoodCostAlert[]>('/inventory/analysis/food-cost-alerts')
    },
}
