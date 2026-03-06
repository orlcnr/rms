import { http } from '@/modules/shared/api/http'
import { normalizePaginatedEnvelope } from '@/modules/shared/api/normalize-paginated-envelope'
import { Category, MenuItem, CreateCategoryInput, CreateMenuItemInput, PaginatedResponse, StockStatus, SalesStatus } from '../types'

export interface GetProductsParams {
    page?: number
    limit?: number
    search?: string
    categoryId?: string
    stockStatus?: StockStatus
    salesStatus?: SalesStatus
    minPrice?: number
    maxPrice?: number
    posMode?: boolean
}

export const productsApi = {
    // Categories
    getCategories: async (restaurantId: string) => {
        const branchCategories = await http.get<Array<{
            categoryId: string
            name: string
            isHiddenInBranch?: boolean
        }>>(`/menus/branches/${restaurantId}/categories`)

        return branchCategories
            .map((item) => ({
                id: item.categoryId,
                name: item.name,
                restaurant_id: restaurantId,
            } as Category))
    },

    createCategory: async (data: CreateCategoryInput) => {
        return http.post<Category>('/menus/categories', data)
    },

    updateCategory: async (id: string, data: Partial<CreateCategoryInput>) => {
        return http.patch<Category>(`/menus/categories/${id}`, data)
    },

    deleteCategory: async (id: string) => {
        await http.deleteEnvelope<null>(`/menus/categories/${id}`)
    },

    // Products (Menu Items)
    getProducts: async (restaurantId: string, params: GetProductsParams = {}) => {
        const response = await http.getEnvelope<MenuItem[]>(`/menus/restaurants/${restaurantId}/items`, { params })
        return normalizePaginatedEnvelope(response)
    },

    getProductById: async (id: string) => {
        return http.get<MenuItem>(`/menus/items/${id}`)
    },

    getBranchProductById: async (branchId: string, id: string) => {
        return http.get<MenuItem>(`/menus/branches/${branchId}/items/${id}`)
    },

    createProduct: async (data: CreateMenuItemInput) => {
        return http.post<MenuItem>('/menus/items', data)
    },

    updateProduct: async (id: string, data: Partial<CreateMenuItemInput>) => {
        return http.patch<MenuItem>(`/menus/items/${id}`, data)
    },

    upsertBranchMenuOverride: async (
        branchId: string,
        menuItemId: string,
        data: { custom_price?: number },
    ) => {
        return http.patch(`/menus/branches/${branchId}/items/${menuItemId}/override`, data)
    },

    deleteProduct: async (id: string) => {
        await http.deleteEnvelope<null>(`/menus/items/${id}`)
    },

    uploadImage: async (file: File) => {
        return http.upload<{ url: string }>('/files/upload', file, 'file')
    },
}
