import { http } from '@/modules/shared/api/http'
import { Category, MenuItem, CreateCategoryInput, CreateMenuItemInput, PaginatedResponse } from '../types'

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
        return http.delete(`/menus/categories/${id}`)
    },

    // Menu Items
    getMenuItems: async (
        restaurantId: string,
        params: { page?: number; limit?: number; search?: string; categoryId?: string } = {}
    ): Promise<PaginatedResponse<MenuItem>> => {
        return http.get<PaginatedResponse<MenuItem>>(`/menus/restaurants/${restaurantId}/items`, { params })
    },

    createMenuItem: async (data: CreateMenuItemInput): Promise<MenuItem> => {
        return http.post<MenuItem>('/menus/items', data)
    },

    updateMenuItem: async (id: string, data: Partial<CreateMenuItemInput>): Promise<MenuItem> => {
        return http.patch<MenuItem>(`/menus/items/${id}`, data)
    },

    deleteMenuItem: async (id: string): Promise<void> => {
        return http.delete(`/menus/items/${id}`)
    },
}
