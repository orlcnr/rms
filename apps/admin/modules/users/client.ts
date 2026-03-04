'use client';

import { adminClientFetch } from '../shared/client';
import { UserFormValues } from './types';

export function createUser(payload: UserFormValues) {
  return adminClientFetch('/super-admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateUser(id: string, payload: Partial<UserFormValues>) {
  return adminClientFetch(`/super-admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function activateUser(id: string) {
  return adminClientFetch(`/super-admin/users/${id}/activate`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export function deactivateUser(id: string) {
  return adminClientFetch(`/super-admin/users/${id}/deactivate`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export function resetUserPassword(id: string, password?: string) {
  return adminClientFetch(`/super-admin/users/${id}/password`, {
    method: 'PATCH',
    body: JSON.stringify(password ? { password } : {}),
  });
}
