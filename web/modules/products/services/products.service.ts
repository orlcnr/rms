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
        return http.get<Category[]>(`/menus/restaurants/${restaurantId}/categories`)
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

    createProduct: async (data: CreateMenuItemInput) => {
        return http.post<MenuItem>('/menus/items', data)
    },

    updateProduct: async (id: string, data: Partial<CreateMenuItemInput>) => {
        return http.patch<MenuItem>(`/menus/items/${id}`, data)
    },

    deleteProduct: async (id: string) => {
        await http.deleteEnvelope<null>(`/menus/items/${id}`)
    },

    uploadImage: async (file: File) => {
        return http.upload<{ url: string }>('/files/upload', file, 'file')
    },
}
