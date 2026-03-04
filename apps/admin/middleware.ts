import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded)) as Record<string, unknown>;
    return decoded;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_access_token')?.value;
  const pathname = request.nextUrl.pathname;
  const payload = token ? decodePayload(token) : null;
  const isTokenValid =
    !!payload &&
    typeof payload.exp === 'number' &&
    payload.exp * 1000 > Date.now() &&
    payload.scope === 'super_admin';

  if (
    isTokenValid &&
    payload?.must_change_password === true &&
    pathname !== '/force-password-change'
  ) {
    return NextResponse.redirect(new URL('/force-password-change', request.url));
  }

  if (pathname === '/login' && isTokenValid) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const isPublic = pathname === '/login';
  if (!isPublic && !isTokenValid) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('admin_access_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
