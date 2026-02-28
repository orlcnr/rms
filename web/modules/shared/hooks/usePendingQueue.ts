'use client';

import { useState, useCallback } from 'react';

/**
 * Bekleyen operasyon tipi
 */
export interface PendingOperation {
    id: string;           // UUID v4 (idempotency key)
    module: string;       // 'orders' | 'payment' | 'cash' | 'reservations'
    endpoint: string;
    method: string;
    payload: unknown;
    attemptedAt: number;  // timestamp
}

/**
 * Bağlantı koptuğunda veya hata alındığında 
 * HTTP isteklerini kuyruğa alan ve yöneten hook.
 */
export function usePendingQueue() {
    const [queue, setQueue] = useState<PendingOperation[]>([]);

    /**
     * Kuyruğa yeni işlem ekler
     */
    const add = useCallback((operation: Omit<PendingOperation, 'attemptedAt'>) => {
        setQueue(prev => [...prev, { ...operation, attemptedAt: Date.now() }]);
    }, []);

    /**
     * Kuyruğu temizler
     */
    const clear = useCallback(() => {
        setQueue([]);
    }, []);

    /**
     * Kuyruktaki işlemleri sunucuya göndermek için tetikler (Placeholder)
     * Bir sonraki fazda socket re-connect sonrası kullanılacak.
     */
    const flush = useCallback(async () => {
        if (queue.length === 0) return;

        console.log(`[PendingQueue] flushing ${queue.length} operations...`);
        // TODO: Implement flush logic with axios/fetch
    }, [queue]);

    /**
     * Belirli bir işlemi kuyruktan siler
     */
    const remove = useCallback((id: string) => {
        setQueue(prev => prev.filter(op => op.id !== id));
    }, []);

    return {
        queue,
        count: queue.length,
        add,
        clear,
        flush,
        remove,
        isEmpty: queue.length === 0
    };
}
