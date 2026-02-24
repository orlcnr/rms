import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'

interface AuthPayload {
    id: string
    email: string
    restaurantId?: string
    restaurant_id?: string
    role: string
    exp: number
}

export async function getRestaurantContext() {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
        redirect('/login')
    }

    let decoded: AuthPayload
    try {
        decoded = jwtDecode<AuthPayload>(token)
    } catch (error) {
        console.error('[Auth Server] Token decode error:', error)
        redirect('/login')
    }

    // Token süresi kontrolü
    if (decoded.exp * 1000 < Date.now()) {
        redirect('/login')
    }

    return {
        restaurantId: decoded.restaurant_id || decoded.restaurantId,
        user: {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
        },
    }
}
