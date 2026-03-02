import { http } from '@/modules/shared/api/http'
import { RestaurantDetails, RestaurantFormInput } from '../types'

export const settingsRestaurantService = {
  async getRestaurant(restaurantId: string): Promise<RestaurantDetails> {
    return http.get<RestaurantDetails>(`/restaurants/${restaurantId}`)
  },

  async updateRestaurant(
    restaurantId: string,
    payload: RestaurantFormInput,
  ): Promise<RestaurantDetails> {
    return http.patch<RestaurantDetails>(`/restaurants/${restaurantId}`, payload)
  },
}
