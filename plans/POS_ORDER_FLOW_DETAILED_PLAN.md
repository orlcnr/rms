# POS Sipariş İşlemleri Detaylı Plan

## Mevcut Durum Analizi

### Problem Tanımı
1. POS'da "Sipariş Ver" butonu aktif değil veya doğru çalışmıyor
2. Masadaki açık siparişler sepete yansımıyor
3. Item olmayan açık siparişler temizlenmeli

### Hedef
- "Sipariş Ver" butonunu aktif hale getirmek
- Mevcut açık sipariş varsa güncellemek, yoksa yeni oluşturmak
- Sepet ile açık sipariş senkronizasyonu

---

## Plan Detayları

### 1. Mevcut Kod Analizi

#### Frontend (`OrdersClient.tsx`)
```typescript
// Mevcut handleSubmitOrder fonksiyonu
const handleSubmitOrder = async () => {
  if (!selectedTable || basket.length === 0) return
  setIsSubmitting(true)
  try {
    if (existingOrder) {
      // Mevcut siparişi güncelle
      await ordersApi.updateOrderItems(existingOrder.id, {
        items: basket.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity }))
      })
    } else {
      // Yeni sipariş oluştur
      const newOrder = await ordersApi.createOrder({
        restaurant_id: restaurantId,
        table_id: selectedTable.id,
        type: orderType,
        items: basket.map(i => ({ menu_item_id: i.menuItemId, quantity: i.quantity }))
      })
      setOrders([newOrder, ...orders])
    }
    clearBasket()
    toast.success('İşlem başarılı')
  } catch (e) {
    toast.error('Hata oluştu')
  } finally {
    setIsSubmitting(false)
  }
}
```

#### Backend API'ler
- `POST /orders` - Yeni sipariş oluştur
- `PATCH /orders/:id/items` - Sipariş kalemlerini güncelle

---

### 2. Yapılacak Değişiklikler

#### 2.1. Açık Sipariş Kontrolü ve Senkronizasyon

**Sorun:** `existingOrder` sepete yansımıyor

**Çözüm:**
1. POS sayfası açıldığında masadaki açık siparişi al
2. Açık siparişin kalemlerini sepete yükle
3. `existingOrder` props olarak zaten geliyor, kontrol et

```typescript
// page.tsx - Mevcut siparişi al
let existingOrder = null

if (orderIdFromQuery) {
  existingOrder = await ordersApi.getOrderById(orderIdFromQuery)
} else {
  // Masadaki açık siparişi bul
  const activeOrders = await ordersApi.getOrders({
    restaurantId,
    tableId,
    status: OrderStatus.PENDING
  })
  existingOrder = activeOrders?.[0] || null
}
```

#### 2.2. Boş Sipariş Temizliği

**Sorun:** Item olmayan açık siparişler var

**Çözüm:**
1. Sipariş oluştururken veya güncellerken item kontrolü yap
2. Eğer siparişte item yoksa sil

```typescript
// Backend'de eklenecek kontrol
async function ensureOrderHasItems(orderId: string) {
  const order = await ordersApi.getOrderById(orderId)
  if (!order.items || order.items.length === 0) {
    await ordersApi.deleteOrder(orderId)
    return null
  }
  return order
}
```

#### 2.3. Sipariş Oluştur/Güncelle Mantığı

**Akış:**
1. Kullanıcı "Sipariş Ver" butonuna tıklar
2. Sepette item varsa devam et
3. Eğer `existingOrder` varsa:
   - PATCH `/orders/:id/items` ile güncelle
4. Eğer `existingOrder` yoksa:
   - POST `/orders` ile yeni sipariş oluştur
5. Başarılı olursa:
   - Sepeti temizle
   - Toast mesajı göster
   - Gerekirse sayfayı yenile

---

### 3. Backend Değişiklikleri

#### 3.1. Sipariş Kalemi Güncelleme Endpoint'i

```typescript
// orders.controller.ts
@Patch(':id/items')
async updateOrderItems(
  @Param('id') id: string,
  @Body() dto: UpdateOrderItemsDto
) {
  return this.ordersService.updateOrderItems(id, dto);
}

// dto/update-order-items.dto.ts
export class UpdateOrderItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
```

#### 3.2. Boş Sipariş Silme

```typescript
// orders.service.ts
async updateOrderItems(orderId: string, items: OrderItemDto[]) {
  const order = await this.findOne(orderId);
  
  // Mevcut item'ları sil
  await this.orderItemRepository.delete({ order_id: orderId });
  
  // Yeni item'ları ekle
  for (const item of items) {
    await this.orderItemRepository.save({
      order_id: orderId,
      menu_item_id: item.menuItemId,
      quantity: item.quantity
    });
  }
  
  return this.findOne(orderId);
}
```

---

### 4. Frontend Değişiklikleri

#### 4.1. Sepet Başlangıç Değeri

```typescript
// OrdersClient.tsx - existingOrder'u sepete yükle
useEffect(() => {
  if (existingOrder && existingOrder.items) {
    // Sepete mevcut kalemleri ekle
    existingOrder.items.forEach(item => {
      addToBasket({
        menuItemId: item.menuItemId,
        name: item.menuItem?.name || '',
        price: item.menuItem?.price || 0,
        quantity: item.quantity
      })
    })
  }
}, [existingOrder])
```

#### 4.2. Submit Button State

```typescript
// Butonu her zaman aktif tut, sepette item yoksa disable
<Button
  variant="primary"
  className="w-full"
  onClick={handleSubmitOrder}
  disabled={basket.length === 0 || isSubmitting}
>
  {isSubmitting 
    ? 'İşleniyor...' 
    : existingOrder 
      ? 'Siparişi Güncelle' 
      : 'Sipariş Ver'
  }
</Button>
```

---

### 5. Test Senaryoları

| # | Senaryo | Beklenen Sonuç |
|---|---------|----------------|
| 1 | Yeni masa, yeni sipariş | Yeni sipariş oluşturulur |
| 2 | Masada açık sipariş var | Mevcut sipariş güncellenir |
| 3 | Siparişte item yok | Sipariş silinir veya hata verir |
| 4 | Sepet boş | Buton disable olur |
| 5 | Ağ hatası | Hata toast gösterilir |

---

### 6. Riskler ve Önlemler

| Risk | Önlem |
|------|-------|
| Item silme/güncelleme race condition | Transaction kullan |
| Stok yetersiz | Backend'de kontrol ekle |
| Çift sipariş | Idempotentlik kontrolü |

---

### 7. Implementasyon Sırası

1. [ ] Backend: `updateOrderItems` endpoint'i kontrol et/güncelle
2. [ ] Frontend: `existingOrder` sepete yükle
3. [ ] Frontend: Submit button logic güncelle
4. [ ] Test: Tüm senaryoları test et

---

## Sonraki Adımlar

Bu plan onaylandıktan sonra Code modunda implementasyona geçebiliriz.
