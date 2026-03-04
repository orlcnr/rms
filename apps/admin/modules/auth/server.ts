import { adminApiFetch } from '../shared/service';

export interface CurrentSuperAdmin {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  must_change_password: boolean;
}

export function getCurrentSuperAdmin() {
  return adminApiFetch<CurrentSuperAdmin>('/super-admin/auth/me');
}
