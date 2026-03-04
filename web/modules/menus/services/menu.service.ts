import { http } from '@/modules/shared/api/http'
import { normalizePaginatedEnvelope } from '@/modules/shared/api/normalize-paginated-envelope'
import { Category, MenuItem, CreateCategoryInput, CreateMenuItemInput, PaginatedResponse } from '../types'

/**
 * @deprecated Bu servis aktif kullanımda değildir.
 * Yeni geliştirmeler için productsApi kullanın.
 * Bkz: web/modules/products/services/products.service.ts
 */
export const menuService = {
    // Categories
    getCategories: async (restaurantId: string): Promise<Category[]> => {
        return http.get<Category[]>(`/menus/restaurants/${restaurantId}/categories`)
    },

    createCategory: async (data: CreateCategoryInput): Promise<Category> => {
        return http.post<Category>('/menus/categories', data)
    },

    updateCategory: async (id: string, data: Partial<CreateCategoryInput>): Promise<Category> => {
        return http.patch<Category>(`/menus/categories/${id}`, data)
    },

    deleteCategory: async (id: string): Promise<void> => {
        await http.deleteEnvelope<null>(`/menus/categories/${id}`)
    },

    // Menu Items
    getMenuItems: async (
        restaurantId: string,
        params: { page?: number; limit?: number; search?: string; categoryId?: string } = {}
    ): Promise<PaginatedResponse<MenuItem>> => {
        const response = await http.getEnvelope<MenuItem[]>(`/menus/restaurants/${restaurantId}/items`, { params })
        return normalizePaginatedEnvelope(response)
    },

    createMenuItem: async (data: CreateMenuItemInput): Promise<MenuItem> => {
        return http.post<MenuItem>('/menus/items', data)
    },

    updateMenuItem: async (id: string, data: Partial<CreateMenuItemInput>): Promise<MenuItem> => {
        return http.patch<MenuItem>(`/menus/items/${id}`, data)
    },

    deleteMenuItem: async (id: string): Promise<void> => {
        await http.deleteEnvelope<null>(`/menus/items/${id}`)
    },
}
