import { http } from '@/modules/shared/api/http'
import { normalizePaginatedEnvelope } from '@/modules/shared/api/normalize-paginated-envelope'
import {
    Ingredient,
    Stock,
    BranchStock,
    StockMovement,
    GetIngredientsDto,
    GetStockMovementsDto,
    BulkStockUpdatePayload,
    BulkUpdateStockResponse,
    IngredientUsage,
    CostImpact,
    CountDifference,
    FoodCostAlert,
    InventorySummary
} from '../types'
import type { BackendEnvelope } from '@/modules/shared/api/http'
import type { EnvelopePaginationMeta } from '@/modules/shared/types'

type PaginationQuery = {
    page?: number
    limit?: number
}

export const inventoryApi = {
    // Ingredients
    getIngredients: async (params: GetIngredientsDto) => {
        const envelope = await http.getEnvelope<Ingredient[] | { items: Ingredient[]; meta: EnvelopePaginationMeta }>(
            '/inventory/ingredients',
            { params }
        ) as BackendEnvelope<Ingredient[] | { items: Ingredient[]; meta: EnvelopePaginationMeta }>
        return normalizePaginatedEnvelope(envelope)
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
    getStocks: async (restaurantId: string, params?: PaginationQuery) => {
        const envelope = await http.getEnvelope<Stock[] | { items: Stock[]; meta: EnvelopePaginationMeta }>(
            `/inventory/stocks/restaurant/${restaurantId}`,
            { params }
        ) as BackendEnvelope<Stock[] | { items: Stock[]; meta: EnvelopePaginationMeta }>
        return normalizePaginatedEnvelope(envelope)
    },

    getBranchStocks: async (branchId: string, params?: PaginationQuery) => {
        const envelope = await http.getEnvelope<BranchStock[] | { items: BranchStock[]; meta: EnvelopePaginationMeta }>(
            `/inventory/branches/${branchId}/stocks`,
            { params }
        ) as BackendEnvelope<BranchStock[] | { items: BranchStock[]; meta: EnvelopePaginationMeta }>
        return normalizePaginatedEnvelope(envelope)
    },

    // Movements
    getStockMovements: async (params: GetStockMovementsDto) => {
        const envelope = await http.getEnvelope<StockMovement[] | { items: StockMovement[]; meta: EnvelopePaginationMeta }>(
            '/inventory/movements',
            { params }
        ) as BackendEnvelope<StockMovement[] | { items: StockMovement[]; meta: EnvelopePaginationMeta }>
        return normalizePaginatedEnvelope(envelope)
    },

    addMovement: async (data: any) => {
        return http.post<StockMovement>('/inventory/movements', data)
    },

    // Bulk stock update for quick count mode
    bulkUpdateStock: async (payload: BulkStockUpdatePayload) => {
        return http.post<BulkUpdateStockResponse>('/inventory/stocks/bulk-update', payload)
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
    getCostImpact: async (days: number = 7, params?: PaginationQuery) => {
        const envelope = await http.getEnvelope<CostImpact[] | { items: CostImpact[]; meta: EnvelopePaginationMeta }>(
            '/inventory/ingredients/cost-impact',
            { params: { days, ...params } }
        ) as BackendEnvelope<CostImpact[] | { items: CostImpact[]; meta: EnvelopePaginationMeta }>
        return normalizePaginatedEnvelope(envelope)
    },

    // Sayım farkları
    getCountDifferences: async (weeks: number = 4, params?: PaginationQuery) => {
        const envelope = await http.getEnvelope<CountDifference[] | { items: CountDifference[]; meta: EnvelopePaginationMeta }>(
            '/inventory/analysis/count-differences',
            { params: { weeks, ...params } }
        ) as BackendEnvelope<CountDifference[] | { items: CountDifference[]; meta: EnvelopePaginationMeta }>
        return normalizePaginatedEnvelope(envelope)
    },

    // Food Cost uyarıları
    getFoodCostAlerts: async (params?: PaginationQuery) => {
        const envelope = await http.getEnvelope<FoodCostAlert[] | { items: FoodCostAlert[]; meta: EnvelopePaginationMeta }>(
            '/inventory/analysis/food-cost-alerts',
            { params }
        ) as BackendEnvelope<FoodCostAlert[] | { items: FoodCostAlert[]; meta: EnvelopePaginationMeta }>
        return normalizePaginatedEnvelope(envelope)
    },

    getSummary: async () => {
        return http.get<InventorySummary>('/inventory/summary')
    },
}
