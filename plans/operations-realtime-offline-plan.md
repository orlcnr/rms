# Operations Modülü - WebSocket ve Offline Destek Planlaması

Bu belge, Operations modülüne gerçek zamanlı güncelleme (WebSocket) ve offline çalışma desteği eklemek için detaylı planlamayı içerir.

---

## ⚠️ ÖNEMLİ: Mevcut Modülleri Korumak

**Kural:** Mevcut `orders` ve `tables` modüllerine DOKUNMAYACAĞIZ.

- ✅ `ordersApi` mevcut haliyle kullanılacak
- ✅ `tablesApi` mevcut haliyle kullanılacak  
- ✅ Operations modülü sadece WebSocket **dinleyecek** (emit etmeyecek)
- ✅ Backend'de sadece mevcut `NotificationsGateway` kullanılacak

---

## BÖLÜM 1: WebSocket ile Gerçek Zamanlı Güncelleme

### 1.1 Mevcut Durum Analizi

**Backend (Mevcut):**
- ✅ `NotificationsGateway` sınıfı var
- ✅ `join_room`, `leave_room` event'leri
- ✅ `new_order`, `order_status_updated` event'leri

**Frontend (Mevcut):**
- ❌ Socket.io-client kurulu değil
- ❌ WebSocket hook'u yok
- ❌ 10 saniye polling ile veri çekiliyor

### 1.2 Hedef Mimari (Mevcut Yapıyı Bozmadan)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                          │
├─────────────────────────────────────────────────────────────────┤
│  Operations Modülü (SADECE DINLER)                               │
│  ├── useOperationsSocket (YENİ)                                 │
│  │   ├── Bağlantı yönetimi                                      │
│  │   ├── Room join/leave                                        │
│  │   └── Event dinleme (new_order, order_status_updated)        │
│  └── useOperationsData (güncellenmiş)                           │
│      └── WebSocket event'leri ile state güncelleme              │
│                                                                  │
│  Orders Modülü (DOKUNULMAYACAK)                                  │
│  └── ordersApi mevcut haliyle kalacak                           │
│                                                                  │
│  Tables Modülü (DOKUNULMAYACAK)                                  │
│  └── tablesApi mevcut haliyle kalacak                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (Sadece dinle)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (NestJS)                            │
├─────────────────────────────────────────────────────────────────┤
│  NotificationsGateway (MEVCUT - değişiklik yok)                  │
│  ├── new_order - Yeni sipariş (mevcut)                          │
│  └── order_status_updated - Sipariş durumu (mevcut)             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Backend Değişiklikleri (YOK)

**Backend'de hiçbir değişiklik yapmayacağız.** Mevcut `NotificationsGateway` zaten:
- `new_order` event'i gönderiyor
- `order_status_updated` event'i gönderiyor

Bu event'leri Operations modülünde dinleyeceğiz.

### 1.4 Frontend Değişiklikleri

#### 1.4.1 Mevcut Yapı

**Zaten kurulu:**
- ✅ `socket.io-client` package.json'da mevcut
- ✅ `useGuestSocket` hook pattern'i mevcut (`frontend/modules/qr-guest/hooks/useGuestSocket.ts`)

**Yapılacak:**
- `useGuestSocket` pattern'ini referans alarak `useOperationsSocket` oluştur
- Yeni bir Context Provider gerekmez (guest socket gibi direkt hook)

#### 1.4.2 Operations Socket Hook (SADECE DINLER)

**Dosya:** `frontend/modules/operations/hooks/useOperationsSocket.ts`

```typescript
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Order } from '@/modules/orders/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface UseOperationsSocketOptions {
  restaurantId: string | undefined;
  onNewOrder?: (order: Order) => void;
  onOrderStatusUpdated?: (order: Order) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

/**
 * Operations Socket Hook
 * 
 * SADECE DINLER - emit yapmaz.
 * Mevcut orders ve tables modüllerini etkilemez.
 * useGuestSocket pattern'ini takip eder.
 */
export function useOperationsSocket(options: UseOperationsSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const optionsRef = useRef(options);

  // Keep options ref up to date
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback((restaurantId: string) => {
    if (socketRef.current?.connected) {
      return;
    }

    // Socket URL hazırla
    const baseUrl = SOCKET_URL.replace(/\/$/, '');
    const socketBaseUrl = baseUrl.replace(/\/api\/v1$/, '');

    console.log('[OperationsSocket] Connecting to:', socketBaseUrl);

    const socket = io(socketBaseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[OperationsSocket] Connected');
      setIsConnected(true);
      optionsRef.current.onConnected?.();

      // Restaurant room'a katıl
      socket.emit('join_room', { restaurant_id: restaurantId });
    });

    socket.on('disconnect', (reason) => {
      console.log('[OperationsSocket] Disconnected:', reason);
      setIsConnected(false);
      optionsRef.current.onDisconnected?.();
    });

    socket.on('connect_error', (error) => {
      console.error('[OperationsSocket] Connection error:', error);
    });

    // MEVCUT EVENT'LERI DINLE
    // new_order - NotificationsGateway'den
    socket.on('new_order', (order: Order) => {
      console.log('[OperationsSocket] New order:', order.id);
      optionsRef.current.onNewOrder?.(order);
    });

    // order_status_updated - NotificationsGateway'den
    socket.on('order_status_updated', (order: Order) => {
      console.log('[OperationsSocket] Order status updated:', order.id);
      optionsRef.current.onOrderStatusUpdated?.(order);
    });
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Restaurant ID değiştiğinde bağlan
  useEffect(() => {
    if (options.restaurantId) {
      connect(options.restaurantId);
    }
    return () => {
      disconnect();
    };
  }, [options.restaurantId, connect, disconnect]);

  return {
    isConnected,
    disconnect,
  };
}
```

#### 1.4.4 Güncellenmiş useOperationsData Hook

**Dosya:** `frontend/modules/operations/hooks/useOperationsData.ts` (güncellenecek)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { operationsApi } from '../service';
import { UseOperationsDataReturn } from '../types';
import { Table, Area } from '@/modules/tables/types';
import { Order, OrderStatus } from '@/modules/orders/types';
import { useOperationsSocket } from './useOperationsSocket';

export function useOperationsData(
  restaurantId: string | undefined,
  isAuthLoading: boolean
): UseOperationsDataReturn {
  const [tables, setTables] = useState<Table[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // İlk veri çekme
  const fetchData = useCallback(async () => {
    if (!restaurantId) return;
    try {
      setError(null);
      const data = await operationsApi.getOperationsData(restaurantId);
      setAreas(data.areas);
      setTables(data.tables);
      setActiveOrders(data.activeOrders);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Veri çekme hatası'));
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // WebSocket event handler'ları
  const handleNewOrder = useCallback((newOrder: Order) => {
    setActiveOrders(prev => {
      // Aynı sipariş varsa güncelle, yoksa ekle
      const exists = prev.some(o => o.id === newOrder.id);
      if (exists) {
        return prev.map(o => o.id === newOrder.id ? newOrder : o);
      }
      return [newOrder, ...prev];
    });
  }, []);

  const handleOrderStatusUpdated = useCallback((updatedOrder: Order) => {
    setActiveOrders(prev => {
      // Eğer sipariş PAID veya CANCELLED ise listeden kaldır
      if (updatedOrder.status === OrderStatus.PAID || updatedOrder.status === OrderStatus.CANCELLED) {
        return prev.filter(o => o.id !== updatedOrder.id);
      }
      // Değilse güncelle
      return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    });
  }, []);

  // WebSocket bağlantısı (SADECE DINLER)
  const { isConnected } = useOperationsSocket({
    restaurantId,
    onNewOrder: handleNewOrder,
    onOrderStatusUpdated: handleOrderStatusUpdated,
  });

  // İlk yükleme
  useEffect(() => {
    if (!isAuthLoading && restaurantId) {
      fetchData();
    }
  }, [restaurantId, isAuthLoading, fetchData]);

  // WebSocket bağlı değilse polling'e düş (fallback)
  useEffect(() => {
    if (!isConnected && restaurantId && !isAuthLoading) {
      const interval = setInterval(fetchData, 30000); // 30 saniye
      return () => clearInterval(interval);
    }
  }, [isConnected, restaurantId, isAuthLoading, fetchData]);

  return {
    tables,
    areas,
    activeOrders,
    loading,
    error,
    refresh: fetchData,
  };
}
```

### 1.5 Uygulama Sırası

| Sıra | Görev | Dosya | Etki |
|------|-------|-------|------|
| 1 | useOperationsSocket hook | `modules/operations/hooks/useOperationsSocket.ts` | Yeni dosya |
| 2 | useOperationsData güncelle | `modules/operations/hooks/useOperationsData.ts` | Güncelleme |

**DOKUNULMAYACAK:**
- ❌ `backend/src/modules/notifications/notifications.gateway.ts`
- ❌ `frontend/modules/orders/service.ts`
- ❌ `frontend/modules/tables/service.ts`
- ❌ `backend/src/modules/orders/orders.service.ts`
- ❌ `backend/src/modules/tables/tables.service.ts`
- ❌ `package.json` (socket.io-client zaten kurulu)
- ❌ `app/layout.tsx` (Provider gerekmez)

**Kullanılan Pattern:**
- `useGuestSocket` hook pattern'i referans alındı
- Context Provider yerine direkt hook kullanımı

---

## BÖLÜM 2: Offline Destek

### 2.1 Strateji

**IndexedDB + Service Worker yaklaşımı:**

1. **IndexedDB**: Verileri lokal olarak sakla
2. **Service Worker**: API isteklerini intercept et
3. **Sync Queue**: Offline işlemleri kuyruğa al
4. **Background Sync**: Bağlantı geldiğinde senkronize et

### 2.2 Mimari

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                          │
├─────────────────────────────────────────────────────────────────┤
│  useOperationsData Hook                                          │
│  ├── useOfflineStorage (YENİ)                                   │
│  │   ├── IndexedDB read/write                                   │
│  │   ├── Cache invalidation                                     │
│  │   └── Stale-while-revalidate                                 │
│  └── useSyncQueue (YENİ)                                        │
│      ├── Offline işlemleri kuyruğa al                           │
│      └── Online olduğunda sync                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      IndexedDB                                   │
├─────────────────────────────────────────────────────────────────┤
│  operations_cache                                                │
│  ├── tables: Table[]                                            │
│  ├── areas: Area[]                                              │
│  ├── activeOrders: Order[]                                      │
│  └── lastUpdated: timestamp                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 IndexedDB Storage

#### 2.3.1 Storage Utility

**Dosya:** `frontend/modules/shared/utils/indexedDB.ts`

```typescript
const DB_NAME = 'restaurant_operations';
const DB_VERSION = 1;

interface OperationsCache {
  tables: Table[];
  areas: Area[];
  activeOrders: Order[];
  lastUpdated: number;
}

export const operationsDB = {
  async open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Cache store
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
        
        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  },

  async getCache(key: string): Promise<OperationsCache | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cache', 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.value?.data || null);
    });
  },

  async setCache(key: string, data: OperationsCache): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('cache', 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put({ key, data });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async addToSyncQueue(operation: SyncOperation): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('syncQueue', 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.add({
        ...operation,
        timestamp: Date.now(),
      });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },

  async getSyncQueue(): Promise<SyncOperation[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('syncQueue', 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  },

  async clearSyncQueue(): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('syncQueue', 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },
};

interface SyncOperation {
  id?: number;
  type: 'CREATE_ORDER' | 'UPDATE_ORDER' | 'UPDATE_TABLE';
  payload: any;
  timestamp: number;
}
```

#### 2.3.2 Offline Storage Hook

**Dosya:** `frontend/modules/operations/hooks/useOfflineStorage.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { operationsDB, OperationsCache } from '@/modules/shared/utils/indexedDB';
import { Table, Area } from '@/modules/tables/types';
import { Order } from '@/modules/orders/types';

const CACHE_KEY = 'operations_data';
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Online/offline durumu
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cache'e kaydet
  const saveToCache = useCallback(async (
    tables: Table[],
    areas: Area[],
    activeOrders: Order[]
  ) => {
    const cache: OperationsCache = {
      tables,
      areas,
      activeOrders,
      lastUpdated: Date.now(),
    };
    await operationsDB.setCache(CACHE_KEY, cache);
    setLastUpdated(cache.lastUpdated);
  }, []);

  // Cache'den oku
  const loadFromCache = useCallback(async (): Promise<OperationsCache | null> => {
    const cache = await operationsDB.getCache(CACHE_KEY);
    
    if (!cache) return null;
    
    // Cache süresi dolmuş mu?
    const isExpired = Date.now() - cache.lastUpdated > CACHE_TTL;
    if (isExpired && isOnline) {
      return null; // Online ise expired cache'i kullanma
    }
    
    setLastUpdated(cache.lastUpdated);
    return cache;
  }, [isOnline]);

  // Cache temizle
  const clearCache = useCallback(async () => {
    await operationsDB.setCache(CACHE_KEY, {
      tables: [],
      areas: [],
      activeOrders: [],
      lastUpdated: 0,
    });
  }, []);

  return {
    isOnline,
    lastUpdated,
    saveToCache,
    loadFromCache,
    clearCache,
  };
}
```

#### 2.3.3 Sync Queue Hook

**Dosya:** `frontend/modules/operations/hooks/useSyncQueue.ts`

```typescript
import { useEffect, useCallback, useState } from 'react';
import { operationsDB, SyncOperation } from '@/modules/shared/utils/indexedDB';
import { operationsApi } from '../service';

export function useSyncQueue(isOnline: boolean) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Offline işlem kuyruğa ekle
  const addToQueue = useCallback(async (operation: Omit<SyncOperation, 'id' | 'timestamp'>) => {
    await operationsDB.addToSyncQueue(operation as SyncOperation);
    setPendingCount(prev => prev + 1);
  }, []);

  // Kuyruğu senkronize et
  const syncQueue = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      const queue = await operationsDB.getSyncQueue();
      
      for (const operation of queue) {
        try {
          switch (operation.type) {
            case 'CREATE_ORDER':
              await operationsApi.createOrder(operation.payload);
              break;
            case 'UPDATE_ORDER':
              await operationsApi.updateOrder(operation.payload.id, operation.payload);
              break;
            case 'UPDATE_TABLE':
              await operationsApi.updateTable(operation.payload.id, operation.payload);
              break;
          }
        } catch (error) {
          console.error('Sync operation failed:', operation, error);
          // Başarısız işlemi kuyrukta bırak
          continue;
        }
      }
      
      // Başarılı işlemleri temizle
      await operationsDB.clearSyncQueue();
      setPendingCount(0);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // Online olduğunda sync
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncQueue();
    }
  }, [isOnline, pendingCount, syncQueue]);

  // Başlangıçta kuyruk sayısını al
  useEffect(() => {
    operationsDB.getSyncQueue().then(queue => {
      setPendingCount(queue.length);
    });
  }, []);

  return {
    pendingCount,
    isSyncing,
    addToQueue,
    syncQueue,
  };
}
```

### 2.4 Güncellenmiş useOperationsData Hook (Offline Destekli)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { operationsApi } from '../service';
import { UseOperationsDataReturn } from '../types';
import { Table, Area } from '@/modules/tables/types';
import { Order } from '@/modules/orders/types';
import { useOfflineStorage } from './useOfflineStorage';
import { useSyncQueue } from './useSyncQueue';

export function useOperationsData(
  restaurantId: string | undefined,
  isAuthLoading: boolean
): UseOperationsDataReturn {
  const [tables, setTables] = useState<Table[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { isOnline, saveToCache, loadFromCache } = useOfflineStorage();
  const { pendingCount, addToQueue } = useSyncQueue(isOnline);

  const fetchData = useCallback(async () => {
    if (!restaurantId) return;

    // Offline ise cache'den oku
    if (!isOnline) {
      const cache = await loadFromCache();
      if (cache) {
        setTables(cache.tables);
        setAreas(cache.areas);
        setActiveOrders(cache.activeOrders);
        setLoading(false);
        return;
      }
    }

    try {
      setError(null);
      const data = await operationsApi.getOperationsData(restaurantId);
      
      setAreas(data.areas);
      setTables(data.tables);
      setActiveOrders(data.activeOrders);
      
      // Cache'e kaydet
      await saveToCache(data.tables, data.areas, data.activeOrders);
    } catch (err) {
      // API hatası - cache'den oku
      const cache = await loadFromCache();
      if (cache) {
        setTables(cache.tables);
        setAreas(cache.areas);
        setActiveOrders(cache.activeOrders);
      } else {
        setError(err instanceof Error ? err : new Error('Veri çekme hatası'));
      }
    } finally {
      setLoading(false);
    }
  }, [restaurantId, isOnline, saveToCache, loadFromCache]);

  useEffect(() => {
    if (!isAuthLoading && restaurantId) {
      fetchData();
      
      // Online ise polling
      if (isOnline) {
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [restaurantId, isAuthLoading, fetchData, isOnline]);

  return {
    tables,
    areas,
    activeOrders,
    loading,
    error,
    refresh: fetchData,
    // Offline ek bilgiler
    isOnline,
    pendingCount,
    addToQueue,
  } as UseOperationsDataReturn & {
    isOnline: boolean;
    pendingCount: number;
    addToQueue: (operation: any) => Promise<void>;
  };
}
```

### 2.5 UI Göstergeleri

#### 2.5.1 Offline Banner Component

**Dosya:** `frontend/modules/operations/components/OfflineBanner.tsx`

```typescript
import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastUpdated: number | null;
}

export function OfflineBanner({ 
  isOnline, 
  pendingCount, 
  isSyncing,
  lastUpdated 
}: OfflineBannerProps) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`
      fixed bottom-4 left-1/2 -translate-x-1/2 z-50
      px-4 py-2 rounded-xl shadow-lg
      flex items-center gap-3
      ${isOnline ? 'bg-amber-500/90' : 'bg-rose-500/90'}
      text-white text-sm font-medium
    `}>
      {!isOnline ? (
        <>
          <WifiOff size={16} />
          <span>Çevrimdışı mod - Veriler önbellekten</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw size={16} className="animate-spin" />
          <span>Senkronize ediliyor...</span>
        </>
      ) : (
        <>
          <RefreshCw size={16} />
          <span>{pendingCount} işlem bekliyor</span>
        </>
      )}
      
      {lastUpdated && !isOnline && (
        <span className="text-white/60 text-xs">
          Son güncelleme: {new Date(lastUpdated).toLocaleTimeString('tr-TR')}
        </span>
      )}
    </div>
  );
}
```

### 2.6 Uygulama Sırası

| Sıra | Görev | Dosya |
|------|-------|-------|
| 1 | IndexedDB utility oluştur | `modules/shared/utils/indexedDB.ts` |
| 2 | useOfflineStorage hook | `modules/operations/hooks/useOfflineStorage.ts` |
| 3 | useSyncQueue hook | `modules/operations/hooks/useSyncQueue.ts` |
| 4 | OfflineBanner component | `modules/operations/components/OfflineBanner.tsx` |
| 5 | useOperationsData güncelle | `modules/operations/hooks/useOperationsData.ts` |
| 6 | OperationsClient'a ekle | `app/(main)/operations/_components/OperationsClient.tsx` |
| 7 | Types güncelle | `modules/operations/types.ts` |

---

## ÖZET

### WebSocket Avantajları
- ✅ Gerçek zamanlı güncelleme (polling yok)
- ✅ Anlık masa durumu değişikliği
- ✅ Yeni sipariş anında görünür
- ✅ Düşük gecikme süresi

### Offline Avantajları
- ✅ İnternet kesintisinde çalışma
- ✅ Veri kaybı önleme
- ✅ Kötü bağlantıda performans
- ✅ İşlem kuyruğu ile güvenilirlik

### Riskler ve Önlemler

| Risk | Önlem |
|------|-------|
| WebSocket bağlantı kopması | Polling fallback |
| IndexedDB dolması | Cache TTL ile otomatik temizleme |
| Sync çakışması | Timestamp bazlı conflict resolution |
| Memory leak | useEffect cleanup |

### Tahmini Geliştirme Süresi

| Bölüm | İş |
|-------|-----|
| WebSocket | Backend event'leri + Frontend hook |
| Offline | IndexedDB + Sync queue |
| Test | Unit + Integration test |
| Toplam | - |

---

## Onay Bekleyen Maddeler

Bu planı onaylarsanız Code moduna geçerek implementasyona başlayabiliriz. Değiştirmek istediğiniz bir şey var mı?
