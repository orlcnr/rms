# POS & Payment Bug Fixes Plan

## Özet

Bu plan 6 adet POS ve ödeme modalı ile ilgili bug'ı düzeltmeyi kapsıyor:
1. Sipariş verildikten sonra ödeme butonunun görünmemesi
2. Kategori seçiminde sonsuz döngü (loop)
3. Payment modal input'larında default "0" değerinin kaybolmaması
4. Ödeme tutarı girildiğinde sol panelde güncellenmemesi
5. Toplam ve kalan tutarda fazladan "TL" currency gösterimi
6. İndirim uygula butonunun çalışmaması

---

## Sorun Analizi

### Sorun 1: Ödeme Butonu Gözükmüyor

**Dosya**: `web/modules/orders/components/OrdersClient.tsx`

**Sorun**: `handleSubmitOrder` fonksiyonu sipariş oluşturduktan sonra `localExistingOrder` state'ini güncellenmediği için ödeme butonu görünmüyor.

```typescript
// Mevcut kod - sorunlu
const [localExistingOrder, setLocalExistingOrder] = useState<Order | null>(existingOrder || null)

// handleSubmitOrder'da sipariş oluşturulduktan sonra localExistingOrder güncellenmiyor
```

**Çözüm**: `handleSubmitOrder` fonksiyonunda sipariş oluşturulduktan sonra `setLocalExistingOrder` çağrılacak.

---

### Sorun 2: Kategorilerde Sonsuz Döngü

**Dosya**: `web/modules/orders/hooks/useOrdersLogic.ts`

**Sorun**: `activeCategoryId` değiştiğinde `allItems` state'i resetleniyor ve infinite scroll her render'da tetikleniyor. 

```typescript
// Problem: Her kategori değişikliğinde items resetleniyor
useEffect(() => {
  setAllItems(initialMenuItems)
  setPage(1)
}, [initialTable, setSelectedTable, initialMenuItems])
```

**Çözüm**: Sadece `initialMenuItems` gerçekten değiştiğinde (farklı API çağrısından geldiğinde) resetleme yapılacak.

---

### Sorun 3: Input Default Değer Sorunu

**Dosya**: `web/modules/orders/components/PaymentModal.tsx`

**Sorun**: `PaymentLineItem` bileşeninde `localAmount` state'i başlatılmıyor:

```typescript
// Mevcut kod - sorunlu
const [localAmount, setLocalAmount] = useState(payment.amount.toString());
// payment.amount 0 olduğunda "0" stringi
// Kullanıcı tıkladığında cursor başa gitmiyor, değer değişmiyor
```

**Çözüm**:
```typescript
useEffect(() => {
  setLocalAmount(payment.amount > 0 ? payment.amount.toString() : '');
}, [payment.amount]);

// Input onFocus'da tüm değeri seç
onFocus={(e) => e.target.select()}
```

---

### Sorun 4: Ödeme Tutari Güncellenmiyor

**Dosya**: `web/modules/orders/components/PaymentModal.tsx`

**Sorun**: `localAmount` değiştiğinde `onUpdate` çağrılıyor ama state güncellemesi düzgün çalışmıyor.

**Çözüm**: Input değişikliğinde hemen `onUpdate` yerine `onBlur`'da veya debounce ile çağırılacak.

---

### Sorun 5: Fazladan Currency (TL)

**Dosya**: `web/modules/orders/components/PaymentSummaryCard.tsx`

**Sorun**: 
- Satır 128: `<span className="text-base font-bold">0,00 TL</span>` - hem format hem "TL"
- Satır 134: `{formatPaymentAmount(remainingBalance)}` zaten TL içeriyor + ek "TL" ekleniyor

**Çözüm**:
```typescript
// Satır 128: "0,00 TL" yerine sadece formatlanmış değer
<span className="text-base font-bold">{formatPaymentAmount(0)}</span>

// Satır 134: Fazladan "TL" ekini kaldır
// formatPaymentAmount zaten TL ekliyor
```

---

### Sorun 6: İndirim Butonu Çalışmıyor

**Dosya**: `web/modules/orders/components/PaymentModal.tsx`

**Sorun**: Satır 201: `onApplyDiscount={() => {}}` - boş fonksiyon

**Çözüm**: İndirim modalı oluşturulacak veya mevcut indirim formu kullanılacak, `onApplyDiscount` prop'u düzgün bağlanacak.

---

## Adım Adım Değişiklikler

### Adım 1: OrdersClient.tsx - Ödeme Butonu Düzeltmesi

1. `handleSubmitOrder` fonksiyonunu bul
2. Sipariş başarıyla oluşturulduktan sonra `setLocalExistingOrder(newOrder)` çağır

### Adım 2: useOrdersLogic.ts - Kategori Loop Düzeltmesi

1. `useEffect` içindeki `setAllItems(initialMenuItems)` çağrısını koşullu yap
2. Sadece `initialMenuItems` referansı değiştiğinde resetle

### Adım 3: PaymentModal.tsx - Input Default Değer Düzeltmesi

1. `PaymentLineItem` bileşeninde `useEffect` ile `localAmount` yönetimi
2. Input `onFocus` handler'ı ekle

### Adım 4: PaymentModal.tsx - Ödeme Tutari Güncelleme

1. Input değişikliğinde `onUpdate` çağrısını düzelt
2. Gerekirse debounce ekle

### Adım 5: PaymentSummaryCard.tsx - Currency Kaldırma

1. Satır 128'deki "0,00 TL" değerini düzelt
2. Satır 134'teki fazladan "TL" ekini kaldır

### Adım 6: PaymentModal.tsx - İndirim Butonu

1. İndirim modalı oluştur veya mevcut formu kullan
2. `onApplyDiscount` prop'unu düzgün bağla

---

## Etkilenecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `web/modules/orders/components/OrdersClient.tsx` | localExistingOrder güncelleme |
| `web/modules/orders/hooks/useOrdersLogic.ts` | Kategori loop düzeltme |
| `web/modules/orders/components/PaymentModal.tsx` | Input düzeltme + indirim bağlama |
| `web/modules/orders/components/PaymentSummaryCard.tsx` | Currency kaldırma |

---

## Test Senaryoları

### Test 1: Ödeme Butonu
- POS ekranında ürün seç → sepete ekle
- "Sipariş Ver" butonuna tıkla
- **Beklenen**: Ödeme butonunun ANINDA görünür olması (refresh olmadan)

### Test 2: Kategori Loop
- Herhangi bir kategoriye tıkla
- **Beklenen**: Sadece o kategorinin ürünleri yüklenmeli, sürekli istek atma olmamalı

### Test 3: Input Testi
- Payment modalı aç
- Nakit ödeme seç
- Tutar inputuna tıkla
- **Beklenen**: Default "0" yerine boş veya seçili olmalı, yeni değer girebilmeli

### Test 4: Ödeme Listesi Güncelleme
- Ödeme tutarı gir
- **Beklenen**: Sol paneldeki ödeme listesinde tutar güncellenmiş olmalı

### Test 5: Currency Testi
- Payment modalı aç
- **Beklenen**: Toplam ve kalan tutarlarda sadece rakam gösterilmeli (örn: "150,00" - "TL" olmadan)

### Test 6: İndirim Testi
- İndirim uygula butonuna tıkla
- **Beklenen**: İndirim modalı açılmalı ve işlem yapılabilmeli
