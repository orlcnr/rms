# Payment Module Fixes Plan (Updated)

## Özet
Payment modülünde tespit edilen hataların ve iyileştirmelerin detaylı planı.

---

## 1. Nakit Ödeme Input Genişliği ve Etiketi

### Problem
- Nakit ödeme input'u çok dar
- Başlık "Nakit Düzenleniyor" yerine "Ödeme Tutari" olmalı
- Input'a tıklandığında 0 silinmek zorunda kalınıyor

### Çözüm
- Input genişliği artırılmalı (`w-full` veya `max-w-md`)
- Label "Ödeme Tutari" olarak değiştirilmeli
- Input default value yerine placeholder kullanılmalı

---

## 2. final_amount NULL Hatası

### Problem
```
ERROR: null value in column "final_amount" of relation "payments" violates not-null constraint
```

### Kök Neden
- `CreatePaymentDto` veya entity'de `final_amount` için default değer yok
- Frontend'den `final_amount` gönderilmiyor veya backend hesaplaması yapılmıyor
- **Floating Point Hatası**: Para hesaplamalarında 0.1 + 0.2 = 0.30000000000000004 gibi hatalar

### Çözüm (Backend)
1. Entity'de `final_amount` için default değer ekle:
```typescript
@Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
final_amount: number;
```

2. **Big.js/Decimal.js Entegrasyonu** - Hesaplamaları kuruş (integer) üzerinden yap:
```typescript
import Decimal from 'decimal.js';

// Para hesaplamaları için
const finalAmount = new Decimal(amount)
  .minus(new Decimal(discountAmount))
  .toDecimalPlaces(2)
  .toNumber();
```

3. Frontend'de validation ekle - gönderilmeden önce kontrol et

---

## 3. Ödeme Yöntemi Label'ları

### Problem
- DEBIT_CARD → "DEBIT_CARD" yazıyor (label yok)
- DIGITAL_WALLET → "DIGITAL-WALLET" yazıyor (label yok)
- BANK_TRANSFER → "BAK_TRANSFER" yazıyor (label yok)

### Çözüm
PaymentMethod enum için label map oluşturulmalı:

```typescript
export const PaymentMethodLabels = {
  [PaymentMethod.CASH]: 'Nakit',
  [PaymentMethod.CREDIT_CARD]: 'Kredi Kartı',
  [PaymentMethod.DEBIT_CARD]: 'Banka Kartı',
  [PaymentMethod.DIGITAL_WALLET]: 'Dijital Cüzdan',
  [PaymentMethod.BANK_TRANSFER]: 'Havale',
  [PaymentMethod.OPEN_ACCOUNT]: 'Açık Hesap',
};
```

---

## 4. İndirim Uygulama Butonu Çalışmıyor

### Problem
- İndirim uygula butonuna tıklandığında hata alınmıyor ama aksiyon da gerçekleşmiyor

### Kök Neden (Olası)
- State güncellemesi yapılmıyor
- Handler fonksiyonu eksik veya hatalı
- Validation sorunu

### Çözüm
- `handleApplyDiscount` fonksiyonu kontrol edilmeli
- State'in doğru şekilde güncellendiği doğrulanmalı

---

## 5. Ödenmemiş Tutar Formatlaması

### Problem
- "14830.00 TL Ödenmemiş" gösteriminde para formatı düzgün değil

### Çözüm
- `formatCurrency` fonksiyonu kullanılmalı
- Örnek: "14.830,00 ₺" formatında gösterim

---

## 6. Açık Hesap (Open Account) Müşteri Seçimi

### Problem
- Açık hesap seçildiğinde hata veriyor
- Yeni müşteri için "Yeni Müşteri Aç" butonu çıkmıyor
- Mevcut müşteri seçildiğinde validation hatası:

```
ValidationError: property restaurant_id should not exist
```

### Kök Neden
- `GetCustomersDto` içinde `restaurant_id` whitelist validation'a takılıyor
- Müşteri seçimi için gerekli validation eksik

### Çözüm
1. CustomerSelector component'inde "Yeni Müşteri" butonu ekle
2. GetCustomersDto'dan `restaurant_id` kaldır veya manual validation ekle

---

## 7. Payment Modal Layout İyileştirmesi

### Problem
- Desktop için modal çok dar
- Ödeme özeti ve ödeme yöntemleri yan yana olmalı

### Çözüm
Grid layout kullan:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Sol: Ödeme Özeti */}
  <div>...</div>
  {/* Sağ: Ödeme Yöntemleri */}
  <div>...</div>
</div>
```

---

## 8. İndirim Butonu Görünürlüğü

### Problem
- İndirim uygula butonu yeterince dikkat çekici değil

### Çözüm
- Daha belirgin renk veya icon ekle
- Badge veya indicator ile indirim miktarını göster

---

## 9. Input Yerleşimi ve Tasarım Kontrolü

### Problem
- Açılan input ve title yerleşimleri düzgün değil

### Çözüm
- FormSection veya FormInput component'lerini kullan
- Tutarlı spacing ve alignment uygula

---

## 10. Race Condition Önleme (Çift Ödeme)

### Problem
- Kullanıcı "Ödemeyi Tamamla" butonuna iki kez basarsa
- final_amount veya stoklar üzerinde tutarsızlık oluşabilir
- Ağ bağlantısı yavaşsa kullanıcı tekrar basma eğilimi artar

### Çözüm
- Buton tıklandığında `isSubmitting` state'i true yap
- Button `disabled` state ekle:
```tsx
<Button
  onClick={handlePayment}
  disabled={isSubmitting || isPaymentComplete}
>
  {isSubmitting ? 'İşleniyor...' : 'Ödemeyi Tamamla'}
</Button>
```

---

## 11. UX İyileştirmeleri

### 11.1 Hızlı Nakit Butonları
Nakit ödeme için hızlı seçim butonları ekle:
- Tam Tutar (order total)
- 100 TL
- 200 TL
- 500 TL

### 11.2 Para Üstü Hesaplayıcı
Nakit tutarı girildiğinde otomatik para üstü göster:
```
💵 Verilen: 200,00 ₺
📊 Hesap: 120,00 ₺
✅ Para Üstü: 80,00 ₺ (yeşil, büyük font)
```

### 11.3 Hata Mesajı Özelleştirme
Generic 500 hatası yerine kullanıcı dostu mesaj:
```typescript
// Backend
throw new InternalServerErrorException('Ödeme kaydedilemedi');

// Frontend toast
toast.error('Ödeme kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
```

---

## 12. Parçalı Ödeme (Split Payment) Desteği

### Senaryo
Kullanıcı hem Nakit hem Kredi Kartı ile ödeme yapmak istiyor.

### Gereksinimler

#### 12.1 Kalan Tutar Hesaplaması
- Her ödeme yöntemi eklendiğinde "Kalan Tutar" otomatik güncellenmeli
- Formula: `Kalan = Toplam - Ödenen`

#### 12.2 Ödeme Satırları (Payment Rows)
```typescript
interface PaymentRow {
  id: string;
  method: PaymentMethod;
  amount: number;
  // ...
}

const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
```

#### 12.3 Limit Kontrolü
- Toplam ödeme tutarı > sipariş tutarı → Uyarı göster
- "Ödemeyi Tamamla" butonu pasif:
```tsx
const canSubmit = totalPaid >= remainingAmount && totalPaid <= orderTotal + allowedOverpayment;
```

---

## Yapılacaklar Sıralaması

| Öncelik | İş | Dosyalar |
|---------|-----|----------|
| 1 | final_amount null hatası + Big.js entegrasyonu | backend/src/modules/payments/ |
| 2 | Race condition (buton disable) | web/modules/orders/components/PaymentModal.tsx |
| 3 | Frontend validation | web/modules/orders/components/ |
| 4 | Ödeme yöntemi label'ları | web/modules/orders/components/ |
| 5 | İndirim butonu çalışmıyor | web/modules/orders/components/PaymentModal.tsx |
| 6 | Ödenmemiş tutar formatlaması | web/modules/orders/components/ |
| 7 | Açık hesap müşteri seçimi | web/modules/orders/components/CustomerSelector.tsx |
| 8 | Nakit input genişliği | web/modules/orders/components/PaymentModal.tsx |
| 9 | Modal layout | web/modules/orders/components/PaymentModal.tsx |
| 10 | Hızlı nakit butonları | web/modules/orders/components/PaymentModal.tsx |
| 11 | Para üstü hesaplayıcı | web/modules/orders/components/PaymentModal.tsx |
| 12 | Hata mesajı özelleştirme | web/modules/orders/components/ |
| 13 | Parçalı ödeme | web/modules/orders/components/PaymentModal.tsx |
| 14 | İndirim butonu görünürlüğü | web/modules/orders/components/ |
