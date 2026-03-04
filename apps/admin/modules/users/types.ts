import { PaginatedMeta } from '../shared/types';

export type AdminUserRole =
  | 'super_admin'
  | 'restaurant_owner'
  | 'manager'
  | 'waiter'
  | 'chef'
  | 'customer';

export interface AdminUserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  restaurant?: {
    id?: string;
    name?: string;
  };
}

export interface UsersResponse {
  data: AdminUserRow[];
  meta: PaginatedMeta;
}

export interface UserFormValues {
  email: string;
  first_name: string;
  last_name: string;
  role: AdminUserRole;
  restaurant_id?: string;
  password?: string;
}
