'use client'

import { useEffect } from 'react'
import { http } from '@/modules/shared/api/http'
import { setServerOffset } from '../utils/date'

/**
 * Hook to synchronize client-side time with the server.
 * Fetches server time and calculates the offset to adjust getNow().
 */
export function useSystemSync() {
    useEffect(() => {
        const syncTime = async () => {
            try {
                const startTime = Date.now()
                // Using a skipToast config if possible, or just standard get
                const response = await http.get<{ serverTime: string }>('/system/status', {
                    // @ts-ignore - custom property for interceptor
                    skipToast: true
                } as any)
                const endTime = Date.now()

                // Offset = ServerTime - LocalTime
                // (startTime + endTime) / 2 approximates the moment server generated the response
                const serverTime = new Date(response.serverTime).getTime()
                const localTimeAtRequest = (startTime + endTime) / 2
                const offset = serverTime - localTimeAtRequest

                setServerOffset(offset)
                console.log(`[SystemSync] Server offset established: ${Math.round(offset)}ms`)
            } catch (error) {
                // Silently fail if not critical, but log it
                console.warn('[SystemSync] Could not sync with server time. Falling back to local time.', error)
            }
        }

        syncTime()
    }, [])
}
