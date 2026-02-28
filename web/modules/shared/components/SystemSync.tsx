'use client'

import { useSystemSync } from '../hooks/useSystemSync'

/**
 * Renderless component that triggers time synchronization with the server.
 * Should be placed in the root layout or high-level provider.
 */
export function SystemSync() {
    useSystemSync()
    return null
}
