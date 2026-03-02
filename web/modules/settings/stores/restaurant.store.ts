'use client'

import { create } from 'zustand'
import { settingsRestaurantService } from '../services/restaurant.service'
import { RestaurantDetails, RestaurantFormInput } from '../types'

interface RestaurantStore {
  restaurant: RestaurantDetails | null
  isLoading: boolean
  error: string | null
  loadRestaurant: (restaurantId: string) => Promise<void>
  updateRestaurant: (restaurantId: string, payload: RestaurantFormInput) => Promise<void>
}

export const useRestaurantStore = create<RestaurantStore>((set) => ({
  restaurant: null,
  isLoading: false,
  error: null,

  loadRestaurant: async (restaurantId) => {
    set({ isLoading: true, error: null })

    try {
      const restaurant = await settingsRestaurantService.getRestaurant(restaurantId)
      set({ restaurant, isLoading: false })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Firma bilgileri alınamadı',
      })
    }
  },

  updateRestaurant: async (restaurantId, payload) => {
    set({ isLoading: true, error: null })

    try {
      const restaurant = await settingsRestaurantService.updateRestaurant(restaurantId, payload)
      set({ restaurant, isLoading: false })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Firma bilgileri güncellenemedi',
      })
      throw error
    }
  },
}))
