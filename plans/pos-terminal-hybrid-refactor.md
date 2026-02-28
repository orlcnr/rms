# POS Terminal Hybrid Communication & Design Refactor Plan (v2)

This plan outlines the refactoring of the POS Terminal (`OrdersClient.tsx`) to align with the Hybrid Communication model and the ERP Design System rules.

---

## Technical Objectives

- **Idempotency**: Generate `transaction_id` (UUID v4) on the frontend for all order creation and item updates.
- **Pessimistic Strategy**: Order submissions wait for 200 OK before updating local state or clearing the basket.
- **Socket Suppression**: Prevent "double-updates" by filtering out socket events matching local `transaction_id`s.
- **Design Alignment**: Use `SubHeaderSection`, `FilterSection`, and `BodySection` layout wrappers.
- **Visual Sync**: Integrate the Pulsing Yellow LED in the SubHeader during active sync operations.

---

## Proposed Changes

### 1. Layout & Components

#### [MODIFY] [OrdersClient.tsx](file:///home/cinar/projects/restaruant-management-system/web/modules/orders/components/OrdersClient.tsx)
- Replace custom layout DIVs with:
    - `<SubHeaderSection title="POS TERMİNALİ" ... />`
        - Pass `isConnected`, `isSyncing`.
        - `description`: "Masa siparişlerini yönetin ve yeni sipariş oluşturun"
        - `actions`: Display Masa No Badge here.
    - `<FilterSection>`: Contains the search input and `PosCategoryTabs`.
    - `<BodySection>`: Contains the product grid and basket.
- Theme: Set `moduleColor="bg-success-main"`.

#### [DELETE] [PosSubHeader.tsx](file:///home/cinar/projects/restaruant-management-system/web/modules/orders/components/PosSubHeader.tsx)
- **Karar**: Tüm logic `SubHeaderSection`'a taşınır. ERP standartlarıyla uyum için bu bileşen kaldırılır.

---

### 2. Logic & Hooks

#### [MODIFY] [useOrdersLogic.ts](file:///home/cinar/projects/restaruant-management-system/web/modules/orders/hooks/useOrdersLogic.ts)

**[Transaction ID]**:
- UUID v4, `handleSubmitOrder` içinde üretilir.
- Hem `createOrder` ve `updateOrderItems` payload'larına eklenir.
- Scope: `isSubmitting` global olarak yönetilir. POS'ta aynı anda tek aktif sipariş işlemi olduğu varsayılır; satır bazlı ayrıma gerek yoktur.

**[Pessimistic Update — `handleSubmitOrder` Akışı]**:
```
1. isSubmitting(true)  →  LED Yellow pulse başlar, buton + sepet kilitlenir
2. API Call  →  transaction_id payload'da gönderilir
3. Başarı (200 OK)  →  clearBasket(), tablo refresh, isSubmitting(false)
4. Başarısız  →  isSubmitting(false), sepet korunur, toast error
5. Network hatası (ERR_NETWORK)  →  usePendingQueue'ya ekle
```

> **Sepet Davranışı**: `isSubmitting === true` iken kullanıcı sepete yeni ürün ekleyemez, miktarı değiştiremez. İstek tamamlanana kadar tüm sepet etkileşimleri kilitlenir.

**[Socket Suppression]**:
```ts
const suppressedTransactionIds = useRef<Set<string>>(new Set());

// Submit sırasında:
const txId = uuidv4();
suppressedTransactionIds.current.add(txId);
await httpPost('/orders', { ...payload, transaction_id: txId });

// Socket event'te:
socket.on('order_status_updated', (event) => {
  if (suppressedTransactionIds.current.has(event.transaction_id)) {
    suppressedTransactionIds.current.delete(event.transaction_id);
    return; // Kendi işlemimiz — zaten local'de güncelledik
  }
  refetch(); // Başka client'tan gelen güncelleme
});
```

**[Entegrasyonlar]**:
- `usePendingQueue` → network hatası durumunda offline kuyruk.
- `useSocketRevalidation` → yeniden bağlandığında ürün/kategori listesi için silent background refetch.

---

### 3. Data Integrity (Backend Requirements)

#### [Idempotency Locking]
- Backend, frontend'den gelen `transaction_id` (UUID v4) ile duplicate operasyonları engeller.
- **Endpoint Bazlı Redis TTL**:

    | Endpoint | Redis TTL | Gerekçe |
    |---|---|---|
    | `POST /orders` | **15 saniye** | Yeni sipariş oluşturma |
    | `PATCH /orders/:id/items` | **10 saniye** | Sipariş güncelleme |

#### [Socket Event Payload — Zorunlu]
- Backend, socket event'leri yayınlarken `transaction_id`'yi payload'a dahil etmelidir. Suppression mekanizması bu alana bağımlıdır:
    ```json
    {
      "type": "order_status_updated",
      "transaction_id": "uuid-v4-buraya",
      "data": { ... }
    }
    ```

---

## Verification Plan

### Manual Verification

1. **Pessimistic Check**:
   - "SİPARİŞ VER"e bas. Butonun loading state'e geçtiğini ve LED'in Yellow pulse yaptığını doğrula.
   - HTTP 200 OK gelmeden sepetin **temizlenmediğini** doğrula.
   - İstek sürerken sepete yeni ürün eklenemediğini doğrula (etkileşim kilitli).

2. **Error Recovery**:
   - Network sekmesinden isteği blokla (Request blocking). "SİPARİŞ VER"e bas.
   - Sepetin korunduğunu, toast hatası gösterildiğini ve `isSubmitting`'in `false`'a döndüğünü doğrula.

3. **Idempotency**:
   - Network sekmesinde `transaction_id` UUID v4 olarak gönderildiğini doğrula.
   - "Replay XHR" ile aynı isteği tekrar gönder. Backend'in ikinci isteği duplicate olarak tanıyıp reddettiğini doğrula.

4. **Socket Suppression**:
   - İki farklı browser sekmesinde aynı uygulamayı aç.
   - Birinde sipariş ver. Diğerinin socket üzerinden güncellendiğini doğrula.
   - Siparişi veren sekmede **double-update olmadığını** React DevTools ile doğrula.

5. **Concurrent Request Testi**:
   - İki farklı browser sekmesinde aynı masaya aynı anda farklı sipariş gönder.
   - Son yazanın kazandığını (last-write-wins) ve her iki client'ın doğru nihai state'e ulaştığını doğrula.

6. **Offline Mode**:
   - Network'ü kes (DevTools → Offline). Sipariş vermeye çalış.
   - "1 işlem bekliyor" badge'ini doğrula.
   - Network'ü geri aç → işlemin otomatik tamamlandığını ve badge'in kaybolduğunu doğrula.

7. **Layout Check**:
   - POS sayfasının `SubHeaderSection`, `FilterSection`, `BodySection` hiyerarşisine uyduğunu doğrula.
   - `bg-bg-app` / `bg-bg-surface` renk hiyerarşisinin korunduğunu doğrula.
