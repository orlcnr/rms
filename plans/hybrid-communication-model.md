# Hybrid Communication & Data Integrity Implementation Plan (v2)

This plan outlines the conversion of the communication architecture for the **Orders**, **Payment**, **Cash**, and **Reservations** modules to a "Hybrid" model (HTTP Write + Socket Notify).

---

## Proposed Changes

### 1. Shared Layout Components

#### [MODIFY] [ConnectionStatus.tsx](file:///home/cinar/projects/restaruant-management-system/web/modules/shared/components/layout/ConnectionStatus.tsx)
- Add `isSyncing` boolean prop.
- Implement the "Yellow Pulsing" LED state:
    - **Green**: `isConnected` is true AND `isSyncing` is false.
    - **Yellow (Pulse)**: `isSyncing` is true (overrides `isConnected` visual).
    - **Red**: `isConnected` is false.
- Add Tooltip to Yellow LED: "Veri sunucuya yazılıyor..."

#### [MODIFY] [SubHeaderSection.tsx](file:///home/cinar/projects/restaruant-management-system/web/modules/shared/components/layout/SubHeaderSection.tsx)
- Add `isSyncing` prop and pass it to `ConnectionStatus`.

---

### 2. Core Logic & Hooks

#### [NEW] [useSocketRevalidation.ts](file:///home/cinar/projects/restaruant-management-system/web/modules/shared/hooks/useSocketRevalidation.ts)
- Centralized hook to monitor socket reconnection.
- Slogan: **"Her yeşil ışık yandığında veriyi bir kez tazele."**
- **[Silent Revalidation]**: Action: Trigger *background* `refetch` for the active module when `isConnected` transitions from `false` to `true`. Avoid full-screen loading spinners.
- **[Offline Queue Flushing]**: On reconnect, before revalidation, flush any pending writes from `usePendingQueue` (see below) first, then refetch.

#### [NEW] [usePendingQueue.ts](file:///home/cinar/projects/restaruant-management-system/web/modules/shared/hooks/usePendingQueue.ts)
- **Amacı**: Bağlantı kesildiğinde uçan HTTP isteklerini kayıt altında tutmak.
- **Yapı**:
    ```ts
    type PendingOperation = {
      id: string;           // UUID v4 (idempotency key)
      module: string;       // 'orders' | 'payment' | 'cash' | 'reservations'
      endpoint: string;
      payload: unknown;
      attemptedAt: number;  // timestamp
    };
    ```
- **Davranış**:
    - HTTP isteği başarısız olursa (network error veya 5xx) → kuyruğa ekle.
    - Bağlantı yeniden kurulduğunda (`useSocketRevalidation` tetikler) → kuyruktaki işlemleri sırayla yeniden dene.
    - Başarılı olan işlem kuyruktan temizlenir.
    - Kullanıcıya: kuyrukta bekleyen işlem varsa LED üstüne ek bir badge göster ("X işlem bekliyor").
- **Scope**: In-memory (sayfa yenilenirse kaybolur). Kritik modüller için `sessionStorage` fallback değerlendirilebilir.

#### [MODIFY] [usePayment.ts](file:///home/cinar/projects/restaruant-management-system/web/modules/orders/hooks/usePayment.ts)
- **[IMPORTANT]** Remove all client-side `emit` calls.
- **[Transaction ID]**: Generate UUID v4 on the **Frontend** and send as `idempotency-key` in the request header or body.
- **[Update Stratejisi — Pessimistic]**: Ödeme işlemleri için **pessimistic update** uygulanır:
    - HTTP 200 OK gelmeden local state güncellenmez.
    - Hata durumunda rollback gerekmez çünkü state zaten değiştirilmemiştir.
- **[Socket Event Suppression]**: HTTP write başarılı olduktan sonra, backend'in aynı `transaction_id` ile yayınlayacağı socket event'i **yoksay** (aşağıdaki `suppressedTransactionIds` mekanizmasıyla).
- **[Race Condition Protection]**: Implement "Post-Success Local Update".
- Ensure `isProcessing` is passed to `SubHeaderSection`.
- **[Error Recovery]**: HTTP isteği başarısız olursa:
    - `isSyncing` → `false`'a döner.
    - Toast notification göster: "İşlem başarısız oldu. Lütfen tekrar deneyin."
    - `usePendingQueue`'ya ekle (network hatası ise).

#### [MODIFY] [useOrdersBoard.ts](file:///home/cinar/projects/restaruant-management-system/web/modules/orders/hooks/useOrdersBoard.ts)
- **[Update Stratejisi — Optimistic]**: Order status değişimleri için **optimistic update** uygulanır:
    - HTTP isteği gönderilmeden önce local state güncellenmir → anlık UX.
    - HTTP başarısız olursa: local state eski haline döner (rollback) + Toast: "Durum güncellenemedi."
- **[Socket Event Suppression]**: Her write işlemi için UUID v4 üretilir ve `suppressedTransactionIds: Set<string>` kümesine eklenir. Socket'ten gelen event bu ID'yi taşıyorsa işlenmez ve ID kümeden temizlenir.
    ```ts
    // Örnek akış:
    const txId = uuidv4();
    suppressedTransactionIds.add(txId);
    optimisticallyUpdate(localState);
    await httpPatch('/orders/status', { ..., transaction_id: txId });
    // Socket event geldiğinde:
    socket.on('order:updated', (event) => {
      if (suppressedTransactionIds.has(event.transaction_id)) {
        suppressedTransactionIds.delete(event.transaction_id);
        return; // Zaten local'de güncelledik, tekrar işleme
      }
      // Başka bir client'tan gelen gerçek güncelleme — işle
      refetch();
    });
    ```
- **[`isSyncing` Scope — Component Bazlı]**: Global bir `isSyncing` yerine, her sipariş kartı kendi `syncingOrderId: string | null` state'ini tutar. Böylece sadece ilgili kartın butonu disable olur, diğerleri etkilenmez.
- Ensure all socket-triggered refetches are **Silent** (no UI blocking).

---

### 3. UI Integrity & Protection

#### [MODIFY] [PaymentModal.tsx](file:///home/cinar/projects/restaruant-management-system/web/modules/orders/components/PaymentModal.tsx)
- When `isProcessing` is true:
    - Entire form becomes **Read-Only** or covered by a subtle overlay.

#### [GENERAL] Action Button Disable Kuralı
- `OrdersBoardClient`: Buton disable → `syncingOrderId === order.id` (component bazlı, diğerlerini etkilemez).
- `CashClient` ve `ReservationClient`: Buton disable → `isSyncing === true` (modül bazlı yeterli).

---

### 4. Data Integrity (Backend Requirements)

#### [Idempotency Locking]
- **Requirement**: Backend must use the Frontend-provided `transaction_id` (UUID) to prevent duplicate operations.
- **[UPDATED] Endpoint Bazlı TTL**:
    | Endpoint | Redis TTL |
    |---|---|
    | `POST /payment` | **30 saniye** (ağır işlem, timeout riski) |
    | `PATCH /orders/status` | **10 saniye** |
    | `POST /cash` | **15 saniye** |
    | `POST /reservations` | **10 saniye** |
- **[Socket Event'e transaction_id Ekle]**: Backend, socket event yayınlarken `transaction_id`'yi payload'a dahil etmelidir. Bu, frontend'in yukarıdaki suppression mekanizmasını çalıştırabilmesi için zorunludur.
    ```json
    // Socket event payload örneği:
    {
      "type": "order:updated",
      "transaction_id": "uuid-v4-buraya",
      "data": { ... }
    }
    ```

---

## Verification Plan

### Manual Verification

1. **Orders Module — Optimistic Update**:
   - Change an order status. Verify the button goes into loading state.
   - Verify the UI updates **immediately** (optimistic) without waiting for HTTP response.
   - Verify the LED turns **Yellow (Pulse)**.
   - Simulate HTTP failure → Verify UI rolls back to previous state + error toast.

2. **Payment Module — Pessimistic Update**:
   - Initiate a payment. Verify UI **does not update** until HTTP 200 OK arrives.
   - Verify modal becomes read-only during `isProcessing`.

3. **Socket/HTTP Çakışma Testi**:
   - Status değişikliği yap. Network sekmesinden socket event'in geldiğini gözlemle.
   - State'in **iki kez değişmediğini** (double-update yok) doğrula. React DevTools ile kontrol et.

4. **Silent Refresh**:
   - Manually disconnect/reconnect. Verify data updates without showing a full-screen "Loading..." spinner.

5. **Idempotency**:
   - Inspect network request to verify UUID v4 is sent for every write operation.
   - Aynı isteği kısa süre içinde iki kez gönder (Network sekmesinden "Replay XHR"). Backend'in ikinci isteği duplicate olarak tanıyıp reddettiğini doğrula.

6. **Concurrent Request Testi** *(Yeni)*:
   - İki farklı browser sekmesinde aynı uygulamayı aç.
   - Aynı siparişe aynı anda farklı status ata.
   - Son yazanın kazandığını (last-write-wins) ve her iki client'ın da doğru nihai state'e ulaştığını doğrula.

7. **Offline Queue Testi** *(Yeni)*:
   - Network'ü kes (DevTools → Offline).
   - Bir işlem yap → "X işlem bekliyor" badge'ini gör.
   - Network'ü geri aç → işlemin otomatik olarak tamamlandığını ve badge'in kaybolduğunu doğrula.

---

## Değişmemiş Önemli Kararlar
- `useSocketRevalidation` yaklaşımı korundu.
- Frontend'de UUID v4 üretimi korundu.
- `isSyncing` → LED görsel mantığı korundu.
