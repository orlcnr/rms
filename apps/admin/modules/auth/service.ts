import { AdminLoginResponse } from './types';
import { formatAdminErrorMessage } from '../shared/errors';
import { adminClientFetch } from '../shared/client';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://api.localhost/api/v1';

export async function loginSuperAdmin(
  email: string,
  password: string,
): Promise<AdminLoginResponse> {
  const response = await fetch(`${API_URL}/super-admin/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(formatAdminErrorMessage(payload?.message || payload));
  }

  const payload = await response.json();
  return payload.data as AdminLoginResponse;
}

export async function refreshSuperAdminAccess(): Promise<AdminLoginResponse> {
  const response = await fetch(`${API_URL}/super-admin/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(formatAdminErrorMessage(payload?.message || payload));
  }

  const payload = await response.json();
  return payload.data as AdminLoginResponse;
}

export function changeSuperAdminPassword(password: string) {
  return adminClientFetch<{ success: boolean }>('/super-admin/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}
