import { formatAdminErrorMessage } from './errors';

function readCookie(name: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');

  for (const part of cookies) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://api.localhost/api/v1';

export async function adminClientFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = readCookie('admin_access_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  if (response.status === 401 && retry) {
    const refreshed = await fetch(`${API_URL}/super-admin/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (refreshed.ok) {
      const refreshPayload = await refreshed.json().catch(() => null);
      const nextToken = refreshPayload?.data?.access_token;

      if (nextToken) {
        document.cookie = `admin_access_token=${nextToken}; path=/; max-age=${60 * 15}; samesite=lax`;
      }

      return adminClientFetch<T>(path, init, false);
    }
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(formatAdminErrorMessage(payload?.message || payload));
  }

  return payload.data as T;
}
