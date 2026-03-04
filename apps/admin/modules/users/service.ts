import { adminApiFetch } from '../shared/service';
import { UsersResponse } from './types';

export function getUsers(search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return adminApiFetch<UsersResponse>(`/super-admin/users${query}`);
}
