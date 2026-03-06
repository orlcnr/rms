import { http } from '@/modules/shared/api/http'
import { CreateRestaurantInput, Restaurant, UpdateRestaurantInput } from '../types'

export const restaurantService = {
    getBranches: async (): Promise<Restaurant[]> => {
        return http.get<Restaurant[]>('/restaurants')
    },

    /**
     * Mevcut kullanıcının restoranını getirir (ilk restoranı baz alır)
     */
    getMyRestaurant: async (): Promise<Restaurant | null> => {
        const response = await restaurantService.getBranches()
        if (Array.isArray(response) && response.length > 0) {
            return response[0]
        }
        return null
    },

    /**
     * ID'ye göre restoran getirir
     */
    getById: async (id: string): Promise<Restaurant> => {
        return http.get<Restaurant>(`/restaurants/${id}`)
    },

    /**
     * Restoran bilgilerini günceller
     */
    update: async (id: string, data: UpdateRestaurantInput): Promise<Restaurant> => {
        return http.patch<Restaurant>(`/restaurants/${id}`, data)
    },

    create: async (data: CreateRestaurantInput): Promise<Restaurant> => {
        return http.post<Restaurant>('/restaurants', data)
    },
}
