import { adminApiFetch } from '../shared/service';
import { AdminRestaurantRow, RestaurantsResponse } from './types';

export function getRestaurants(search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return adminApiFetch<RestaurantsResponse>(`/super-admin/restaurants${query}`);
}

export function getRestaurantById(id: string) {
  return adminApiFetch<AdminRestaurantRow>(`/super-admin/restaurants/${id}`);
}
