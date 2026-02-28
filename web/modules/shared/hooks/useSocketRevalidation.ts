'use client';

import { useEffect, useRef } from 'react';

interface UseSocketRevalidationProps {
    isConnected: boolean;
    onRevalidate: () => Promise<void> | void;
    enabled?: boolean;
}

/**
 * Socket bağlantısı koptuğunda ve tekrar bağlandığında 
 * veriyi sessizce (silent) tazelemeyi sağlayan hook.
 * Slogan: "Her yeşil ışık yandığında veriyi bir kez tazele."
 */
export function useSocketRevalidation({
    isConnected,
    onRevalidate,
    enabled = true
}: UseSocketRevalidationProps) {
    const wasConnected = useRef(isConnected);

    useEffect(() => {
        // Sadece bağlantı koptuktan sonra tekrar bağlandığında tetikle
        if (enabled && !wasConnected.current && isConnected) {
            console.log('[SocketRevalidation] Reconnected. Triggering silent revalidation...');

            // Sessizce tazelemeyi başlat (kullanıcıya loading spinner göstermemeli)
            onRevalidate();
        }

        wasConnected.current = isConnected;
    }, [isConnected, onRevalidate, enabled]);
}
