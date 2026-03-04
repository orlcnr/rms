'use client';

import { adminClientFetch } from '../shared/client';
import { AdminRestaurantRow, RestaurantFormValues } from './types';

export function createRestaurant(payload: RestaurantFormValues) {
  return adminClientFetch<{
    restaurant: AdminRestaurantRow;
  }>('/super-admin/restaurants', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateRestaurant(
  id: string,
  payload: Partial<RestaurantFormValues>,
) {
  return adminClientFetch<AdminRestaurantRow>(`/super-admin/restaurants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function suspendRestaurant(id: string) {
  return adminClientFetch<{ message: string }>(
    `/super-admin/restaurants/${id}/suspend`,
    {
      method: 'PATCH',
      body: JSON.stringify({}),
    },
  );
}

export function activateRestaurant(id: string) {
  return adminClientFetch<{ message: string }>(
    `/super-admin/restaurants/${id}/activate`,
    {
      method: 'PATCH',
      body: JSON.stringify({}),
    },
  );
}
