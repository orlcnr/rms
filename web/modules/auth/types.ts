export type Role = 'super_admin' | 'manager' | 'waiter' | 'kitchen' | 'cashier';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: Role;
  restaurantId?: string;
  restaurant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  access_token: string;
  refreshToken?: string;
  user?: User;
}
