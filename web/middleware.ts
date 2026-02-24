import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { jwtDecode } from 'jwt-decode'

export function middleware(request: NextRequest) {
    const token = request.cookies.get('access_token')?.value
    const { pathname } = request.nextUrl

    // Token geçerliliğini kontrol et (sadece süresine bakıyoruz)
    let isTokenValid = false
    if (token) {
        try {
            const decoded = jwtDecode<{ exp: number }>(token)
            isTokenValid = decoded.exp * 1000 > Date.now()
        } catch (e) {
            isTokenValid = false
        }
    }

    // 1. Giriş yapmış (ve geçerli tokenı olan) kullanıcı giriş sayfasına gitmeye çalışırsa dashboard'a yönlendir
    if (isTokenValid && pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // 2. Token yoksa (veya geçersiz/süresi dolmuşsa) ve korunan bir sayfaya gitmeye çalışıyorsa login'e yönlendir
    const isAuthRoute = pathname === '/login'
    const isPublicFile = pathname.includes('.') || pathname.startsWith('/_next') || pathname.startsWith('/api')

    if (!isTokenValid && !isAuthRoute && !isPublicFile) {
        const response = NextResponse.redirect(new URL('/login', request.url))
        // Geçersiz tokenı temizle
        if (token) {
            response.cookies.delete('access_token')
        }
        return response
    }

    return NextResponse.next()
}

// Middleware'in hangi rotalarda çalışacağını belirle
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
