import { http } from '@/modules/shared/api/http'
import { Restaurant, UpdateRestaurantInput } from '../types'

export const restaurantService = {
    /**
     * Mevcut kullanıcının restoranını getirir (ilk restoranı baz alır)
     */
    getMyRestaurant: async (): Promise<Restaurant | null> => {
        const response = await http.get<Restaurant[]>('/restaurants')
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
}
