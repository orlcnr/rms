export type Role =
  | 'super_admin'
  | 'brand_owner'
  | 'branch_manager'
  | 'branch_cashier'
  | 'branch_waiter'
  | 'branch_chef'
  | 'restaurant_owner'
  | 'manager'
  | 'waiter'
  | 'chef'
  | 'kitchen'
  | 'cashier'
  | 'customer';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: Role;
  tokenVersion?: number;
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
