import { cookies } from 'next/headers';
import { ApiEnvelope } from './types';
import { formatAdminErrorMessage } from './errors';

const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://api.localhost/api/v1';
const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL || 'http://backend:3000/api/v1';

export async function adminApiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_access_token')?.value;
  const isServer = typeof window === 'undefined';

  const response = await fetch(
    `${isServer ? INTERNAL_API_URL : PUBLIC_API_URL}${path}`,
    {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
      cache: 'no-store',
    },
  );

  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(formatAdminErrorMessage(payload?.message || payload));
  }

  return payload?.data as T;
}
