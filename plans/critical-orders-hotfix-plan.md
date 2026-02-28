# Critical Orders Hotfix Plan

## Kök Neden Analizi

### BUG 1: `toFixed()` RangeError — OrderDetailDrawer (line 143)
**Kök Neden:** TypeORM'un `decimal` tip kolonları (`unit_price`, `subtotal`) veritabanından sorgu yapıldığında JavaScript'e **string olarak** döner (ORM'nin bilinen davranışı). Bu nedenle `item.totalPrice.toFixed(2)` ve `item.totalAmount.toFixed(2)` çağrıları, `string` üzerinde çağrıldığında `RangeError: Invalid time value` fırlatır.

**İlgili Dosyalar:**
- `web/modules/orders/components/OrderDetailDrawer.tsx` (line 143 ve 149)
- `web/modules/orders/components/OrderCard.tsx` (tutar gösterimli tüm yerler)
- `web/modules/orders/utils/order-group.ts` (totalAmount hesaplamaları)

**Çözüm:** Tüm `.toFixed(2)` çağrılarından önce `Number(value || 0).toFixed(2)` ile güvenli cast uygulanacak. Benzer şekilde`item.totalPrice` ve `item.unitPrice` ile toplam hesaplama yapan tüm yerler güvenli hale getirilecek.

---

### BUG 2: KRİTİK — Kanban'da sürükle-bırak sonrası masanın kaybolması
**Kök Neden:**  Backend `tables.service.ts`'deki `findAllTablesByRestaurant` metodu, tabloyu `OCCUPIED` göstermek için sadece `status IN ('pending','preparing','ready','served')` olan aktif siparişlere bakar. 

Sorunun asıl kaynağı şu olduğu düşünülüyor:
1. Yeni sipariş açıldığında `table.status = OCCUPIED` yapılıyor ✅
2. Sipariş durumu PENDING→PREPARING'e alınıyor — bu geçişte masa üzerinde **herhangi bir işlem yapılmıyor** (backend doğru)
3. Frontend'deki **optimistic update** ise tek bir `orderId` için tüm grubu kaldırıp yeniden oluşturuyor. Eğer grup birden fazla sipariş içeriyorsa veya `tableId` eşleşmesi hatalıysa, **grup kayboluyor** (frontend'deki olası bug)
4. Socket üzerinden gelen `order:status` event'i, backend'in düzeltilmiş verisini push edebilir ve frontend state tamamen refetch edilince masa tekrar görünür ancak gecikme yaşanır.

Ek sorun olarak, `orders.service.ts`'deki `create()` metodu:
```ts
// Check if there's already an active order for this table
const activeOrder = await ... findOne(Order, { tableId: table_id, status: In([...]) })
if (activeOrder) throw BadRequestException('Bu masada zaten açık bir sipariş var.')
```
Bu logic'e göre B-M-10 masasında zaten bir sipariş varken **yeni** sipariş açılamaz ama var olan sipariş taşındığında tabloya artık aktif sipariş kalmayabilir. Bu kesin söylenemez, daha fazla detay gerekiyor.

**Çözüm:**
1. Frontend: `useOrdersBoard.ts` içerisindeki optimistic update mantığını, tüm `orderIds`'i aynı gruba ait görecek şekilde revize et. `tabldeId` bazlı grubu bul ve sadece **taşınan order**'ları filtrele, diğerlerini eski grupta bırak.
2. Backend'de `updateStatus` metoduna `PREPARING` durumu için masa durumunu `OCCUPIED` olmaya devam ettirecek bir güvence ekle (şu an sadece PAID/CANCELLED için kontrol var, bu değişmeyecek).
3. Socket event'lerini frontend'de yakalandığında refetch yapılmasını sağlamak için `useOrdersSocket.ts` hook'unu incele.

---

### BUG 3: Görsel — Kart fiyatları yanlış gösterilebiliyor
**Kök Neden:** `OrderGroup.totalAmount` ve `OrderItem.totalPrice` TypeORM'dan string geldiği için `Number()` cast olmaksızın toplama yapılınca `"10.50" + "20.00"` gibi string concatenation olabiliyor.

**İlgili Dosyalar:**
- `web/modules/orders/utils/order-group.ts` (line 49-50: `+=` işlemleri)
- `web/modules/orders/components/KanbanColumn.tsx` (tutar display)

**Çözüm:** `order-group.ts`'deki toplam hesaplamalarında `Number(...)` cast eklenmesi.

---

## Uygulama Adımları

### Adım 1: toFixed ve fiyat güvenli dönüşümleri (Frontend — Kolay)
- [ ] `OrderDetailDrawer.tsx`: `item.totalPrice.toFixed(2)` → `Number(item.totalPrice || 0).toFixed(2)`
- [ ] `OrderDetailDrawer.tsx`: `o.totalAmount.toFixed(2)` → `Number(o.totalAmount || 0).toFixed(2)`
- [ ] `OrderDetailDrawer.tsx`: `orderGroup.totalAmount.toFixed(2)` → aynı
- [ ] `order-group.ts`: `acc[tableId].totalAmount += Number(order.totalAmount) || 0` — zaten var ama `order.items` toplamında eksik olabilir
- [ ] `KanbanColumn.tsx`: Tutar gösterimleri güvenli hale getirilecek

### Adım 2: Optimistic update group logic (Frontend — Kritik)
- [ ] `useOrdersBoard.ts` → `updateStatus` içindeki optimistic update bloğunu düzelt:
  - Sürüklenen grup tüm orderları içeriyorsa, grup silinmemeli; sadece taşınan orderlar yeni statüye taşınmalı
  - Eski statüdeki grup boşaldığında sadece O ZAMAN gruptan çıkarılmalı
  - `tableId` eşleşmesi için `group.orders.some(o => orderIds.includes(o.id))` veya `group.tableId === targetTableId` gibi grup-bazlı yaklaşım benimsenmeli

### Adım 3: useOrdersSocket doğrulama (Frontend — Araştırma)
- [ ] `web/modules/orders/hooks/useOrdersSocket.ts` okunacak
- [ ] Socket event handler'larının optimistic state ile çakışıp çakışmadığı kontrol edilecek
- [ ] Gerekirse, socket event geldiğinde state'i refetch ile senkronize et

### Adım 4: Design System uyumu (Frontend — Kozmetik)
- [ ] `OrderDetailDrawer.tsx`: Modal başlığı, border ve padding ERP standartlarına getirilecek (`bg-bg-surface`, `border-border-light`)
- [ ] `OrderDetailDrawer.tsx`: "Ek Sipariş" badge styling `primary-main` token ile uyumlu hale getirilecek
- [ ] Tablo tutarları `formatPaymentAmount(amount)` yardımcı fonksiyonu ile gösterilecek (zaten `types.ts`'de var)
