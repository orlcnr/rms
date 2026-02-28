# Payment Tip (Bahşiş) Özelliği Planı

## Özet

Bu plan, Kredi Kartı (KK) ve Debit Kart ödeme yöntemlerine "Bahşiş" (Tip) ekleme özelliğinin sisteme entegre edilmesini kapsamaktadır.
**Önemli**:
- Net bahşiş hesaplaması **backend** tarafında yapılacaktır. Frontend yalnızca `tip_amount` ve `commission_rate` gönderecektir.
- Hesaplama: `net_tip_amount = tip_amount - (tip_amount × commission_rate)`
- Kasiyerin komisyon oranını değiştirip değiştiremeyeceği ayarlardan (settings) kontrol edilecektir.

---

## Mevcut Durum

### Backend (Tamamlanmış)
- **Dosya**: `backend/src/modules/payments/entities/payment.entity.ts`
- **Mevcut Alanlar**:
  ```typescript
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tip_amount: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commission_rate: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  net_tip_amount: number | null;
  ```

### Frontend - Web (Güncellenecek)
- **PaymentLine**: `web/modules/orders/types.ts` (satır 323-329)
- **CardPaymentForm**: `web/modules/orders/components/PaymentMethodDetails.tsx` (satır 239-281)
- **Hesaplama Mantığı**: `web/modules/orders/utils/` veya `types.ts` içinde

### Frontend - Frontend (Eski)
- `frontend/modules/payments/` - Kullanılmıyor, web modülü kullanılıyor

---

## Etkilenecek Dosyalar

### Güncellenecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `web/modules/orders/types.ts` | PaymentLine interface'ine `tipAmount`, `commissionRate` ekleme |
| `web/modules/orders/components/PaymentMethodDetails.tsx` | CardPaymentForm'a tip inputu ve komisyon gösterimi |
| `web/modules/orders/types.ts` | Hesaplama fonksiyonlarını güncelleme (net tip dahil) |
| `web/modules/payments/services/payment.service.ts` | Backend DTO'suna tip alanlarını ekleme |
| `web/modules/orders/components/PaymentModal.tsx` | Ödeme butonunda toplam tutar net gösterimi |

### Oluşturulabilecek Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `web/modules/orders/components/PaymentSummaryCard.tsx` | Ödeme özetinde toplam tip gösterme (yoksa oluşturulacak) |

---

## Adım Adım Değişiklikler

### Aşama 1: Veri Yapısı Güncellemesi (Types)

#### 1.1 PaymentLine Interface Güncelleme

```typescript
// web/modules/orders/types.ts - PaymentLine güncelleme

export interface PaymentLine {
  id: string;
  method: PaymentMethod;
  amount: number;           // Sipariş tutarından düşecek ana miktar
  tipAmount?: number;       // Ekstra eklenen bahşiş (brüt)
  commissionRate?: number;  // Komisyon oranı (örn: 0.02 = %2)
  cashReceived?: number;    // Nakit ödeme için alınan
  customerId?: string;      // Açık hesap için
  
  // Backend'den gelen (readonly)
  netTipAmount?: number;   // Net bahşiş (tip - komisyon)
}
```

#### 1.2 CreatePaymentInput Güncelleme

```typescript
// web/modules/payments/types.ts

export interface CreatePaymentInput {
  order_id: string;
  amount: number;
  tip_amount?: number;      // Bahşiş (brüt)
  commission_rate?: number;  // Komisyon oranı (settings'den çekilecek)
  method: PaymentMethod;
  discount_amount?: number;
  notes?: string;
}
```

### Aşama 1.5: Veritabanı ve Backend Ayarlar Yapısı [NEW]

#### 1.3 `restaurant_settings` Tablo Yapısı

Bu tablo, restoran bazlı konfigürasyonları anahtar-değer (key-value) formatında tutacaktır.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary Key |
| `restaurant_id` | UUID | Foreign Key (Restoran Ref) |
| `key` | VARCHAR | Ayar anahtarı (örn: 'tip_commission_rate') |
| `value` | TEXT | Ayar değeri (örn: '0.02') |
| `type` | ENUM | 'number', 'boolean', 'string' |
| `group` | VARCHAR | 'payment', 'tax', 'general' vb. |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Constraint**: `UNIQUE(restaurant_id, key)`

#### 1.4 Tip Ayarları Anahtarları

- `tip_commission_rate`: `number` (Varsayılan: 0.02)
- `tip_commission_enabled`: `boolean` (Varsayılan: true)
- `tip_commission_editable`: `boolean` (Varsayılan: true)

### Aşama 2: Komisyon Ayarları ve Backend Mantığı

#### 2.1 Backend: Settings Service

Backend'de bir `SettingsService` oluşturulacak:
- `getSetting(restaurantId, key)`: Değeri alır ve `type` kolonuna göre cast eder (örn: '0.02' -> 0.02).
- `updateSetting(restaurantId, key, value)`: Ayarı günceller.

#### 2.2 Payment Service (Backend)

Ödeme kaydedilirken:
- `commission_rate` frontend'den gelmiyorsa veya geçersizse DB'deki `tip_commission_rate` kullanılır.
- `net_tip_amount` hesaplanarak kaydedilir.

### Aşama 2.3: Komisyon Ayarları ve Hesaplama Mantığı

#### 2.3.1 Komisyon Oranı Ayarları

```typescript
// web/modules/settings/types.ts (veya ilgili settings modülü)
// Restaurant bazlı komisyon oranı ayarı

export interface RestaurantSettings {
  // ... mevcut alanlar ...
  tip_commission_rate: number;     // Varsayılan oran (örn: 0.02)
  tip_commission_enabled: boolean;   // Komisyon sistemi aktif mi?
  tip_commission_editable: boolean;  // Kasiyer oranı değiştirebilir mi?
}

// Varsayılan değerler
const DEFAULT_TIP_SETTINGS = {
  tip_commission_rate: 0.02,  // %2 varsayılan
  tip_commission_enabled: true,
};
```

#### 2.3.2 Hesaplama Fonksiyonları (Güncellendi)

```typescript
// web/modules/orders/types.ts - Hesaplama fonksiyonları

/**
 * Net bahşiş hesapla
 * Net Bahşiş = Brüt Bahşiş - (Brüt Bahşiş × Komisyon Oranı)
 * 
 * Örnek: 100 TL bahşiş, %2 komisyon
 * Net = 100 - (100 × 0.02) = 100 - 2 = 98 TL
 */
export function calculateNetTip(
  tipAmount: number, 
  commissionRate: number = 0
): number {
  // NOT: Bu fonksiyon sadece UI gösterimi içindir. 
  // Gerçek kayıt backend'deki hesaplama ile yapılacaktır.
  if (tipAmount <= 0) return 0;
  const commission = tipAmount * commissionRate;
  return Math.max(0, tipAmount - commission);
}

/**
 * Komisyon miktarını hesapla
 */
export function calculateTipCommission(
  tipAmount: number, 
  commissionRate: number
): number {
  return tipAmount * commissionRate;
}

/**
 * Toplam ödenen miktarı hesapla (amount + tip dahil)
 */
export function calculateTotalPaid(payments: PaymentLine[]): number {
  return payments.reduce(
    (sum, p) => sum + (p.amount || 0) + (p.tipAmount || 0), 
    0
  );
}

/**
 * Kalan bakiye hesapla (SADECE amount üzerinden, tip dahil DEĞİL)
 * ÖNEMLİ: Tip, sipariş borcunu azaltmaz!
 */
export function calculateRemaining(orderTotal: number, payments: PaymentLine[]): number {
  const paid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  return Math.max(0, orderTotal - paid);
}

/**
 * Toplam brüt bahşişi hesapla
 */
export function calculateTotalTips(payments: PaymentLine[]): number {
  return payments.reduce((sum, p) => sum + (p.tipAmount || 0), 0);
}

/**
 * Toplam net bahşişi hesapla (komisyon düşülmüş)
 */
export function calculateTotalNetTips(
  payments: PaymentLine[], 
  commissionRate: number = 0
): number {
  return payments.reduce(
    (sum, p) => sum + calculateNetTip(p.tipAmount || 0, commissionRate), 
    0
  );
}

/**
 * Toplam komisyon miktarını hesapla
 */
export function calculateTotalTipCommission(
  payments: PaymentLine[], 
  commissionRate: number = 0
): number {
  return payments.reduce(
    (sum, p) => sum + calculateTipCommission(p.tipAmount || 0, commissionRate), 
    0
  );
}

/**
 * Karttan çekilecek toplam tutar (amount + tip)
 */
export function calculateTotalCharged(payment: PaymentLine): number {
  return (payment.amount || 0) + (payment.tipAmount || 0);
}
```

### Aşama 3: UI Bileşenleri

#### 3.1 CardPaymentForm Güncelleme

```typescript
// web/modules/orders/components/PaymentMethodDetails.tsx
// CardPaymentForm fonksiyonu güncelleme

interface CardPaymentFormProps {
  payment: PaymentLine;
  onUpdate: (updates: Partial<PaymentLine>) => void;
  disabled: boolean;
  methodLabel: string;
  commissionRate: number;     // Settings'den gelen varsayılan
  isEditable: boolean;        // Settings'den gelen editable flag'i
}

function CardPaymentForm({
  payment,
  onUpdate,
  disabled,
  methodLabel,
  commissionRate = 0.02,
  isEditable = true,
}: CardPaymentFormProps) {
  const [localAmount, setLocalAmount] = useState(payment.amount.toString());
  const [tip, setTip] = useState(payment.tipAmount?.toString() || '0');

  const handleAmountChange = (value: string) => {
    setLocalAmount(value);
    const num = parseFloat(value.replace(',', '.')) || 0;
    onUpdate({ amount: num });
  };

  const handleTipChange = (value: string) => {
    setTip(value);
    const num = parseFloat(value.replace(',', '.')) || 0;
    onUpdate({ tipAmount: num });
  };

  const amount = parseFloat(localAmount.replace(',', '.')) || 0;
  const tipAmount = parseFloat(tip.replace(',', '.')) || 0;
  const totalCharged = amount + tipAmount;
  
  // Komisyon hesaplamaları
  const commissionAmount = calculateTipCommission(tipAmount, commissionRate);
  const netTip = calculateNetTip(tipAmount, commissionRate);

  return (
    <div className="space-y-4">
      {/* Ana Ödeme Tutarı */}
      <div>
        <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
          {methodLabel} Tutarı
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={localAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            disabled={disabled}
            className="flex-1 px-4 py-3 text-xl font-bold text-right bg-bg-muted border border-border-light rounded-sm"
            placeholder="0,00"
          />
          <span className="text-lg font-semibold text-text-muted">TL</span>
        </div>
      </div>

      {/* Tip (Bahşiş) Alanı */}
      <div>
        <label className="text-xs font-semibold text-primary-main uppercase block mb-2">
          Bahşiş (Tip)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={tip}
            onChange={(e) => handleTipChange(e.target.value)}
            disabled={disabled}
            className="flex-1 px-4 py-3 text-xl font-bold text-right bg-primary-main/5 border border-primary-main/20 rounded-sm focus:ring-2 focus:ring-primary-main"
            placeholder="0,00"
          />
          <span className="text-lg font-semibold text-text-muted">TL</span>
        </div>
      </div>

      {/* Komisyon Bilgisi (Tip > 0 ise göster) */}
      {tipAmount > 0 && (
        <div className="p-3 bg-warning-main/10 border border-warning-main/20 rounded-sm space-y-3">
          <div className="flex justify-between items-center text-xs text-text-secondary">
            <span>Bahşiş Oranı:</span>
            <div className="flex items-center gap-1">
              <input 
                type="number"
                value={commissionRate * 100}
                readOnly={!isEditable}
                onChange={(e) => onUpdate({ commissionRate: parseFloat(e.target.value) / 100 })}
                className={`w-12 text-right bg-white border rounded px-1 ${!isEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <span>%</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Brüt Bahşiş:</span>
              <span>{formatCurrency(tipAmount)}</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Komisyon Tutarı:</span>
              <span className="text-error-main">-{formatCurrency(commissionAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-success-main pt-2 border-t border-warning-main/20">
              <span>Net Bahşiş:</span>
              <span>{formatCurrency(netTip)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Toplam Çekilecek Tutar */}
      {tipAmount > 0 && (
        <div className="p-4 bg-success-main/10 border border-success-main/30 rounded-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-success-main" />
              <span className="text-sm font-semibold text-success-main">
                Karttan Çekilecek Toplam
              </span>
            </div>
            <span className="text-2xl font-black text-success-main">
              ₺{formatPaymentAmount(totalCharged)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3.2 Ödeme Butonu (Net Tutar Gösterimi)

```typescript
// PaymentModal veya ödeme onay butonu
// "120,00 TL Çek ve Ödemeyi Tamamla" - Çok net gösterim

{
  /* Ödeme Yap Butonu - Toplam Tutar Çok Net */
}
<Button
  variant="primary"
  size="lg"
  className="w-full py-4 text-lg font-bold"
  onClick={handlePayment}
>
  {totalCharged > 0 ? (
    <>
      {formatCurrency(totalCharged)} TL Çek ve Ödemeyi Tamamla
    </>
  ) : (
    'Ödemeyi Tamamla'
  )}
</Button>
```

#### 3.3 PaymentSummaryCard Güncelleme

```typescript
// Ödeme özetinde toplam tip gösterme
// PaymentSummaryCard bileşeninde:

{
  totalTips > 0 && (
    <div className="space-y-2 pt-2 border-t border-border-light">
      <div className="flex justify-between text-sm text-text-secondary">
        <span>Toplam Bahşiş:</span>
        <span>{formatCurrency(totalTips)}</span>
      </div>
      
      {commissionRate > 0 && (
        <>
          <div className="flex justify-between text-sm text-error-main">
            <span>Komisyon:</span>
            <span>-{formatCurrency(totalCommission)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-success-main">
            <span>Net Bahşiş:</span>
            <span>{formatCurrency(totalNetTips)}</span>
          </div>
        </>
      )}
    </div>
  )
}
```

### Aşama 4: Backend Entegrasyonu

#### 4.1 Payment Service Güncelleme

```typescript
// web/modules/payments/services/payment.service.ts

export interface CreatePaymentInput {
  order_id: string;
  amount: number;
  tip_amount?: number;        // Bahşiş (brüt)
  commission_rate?: number;   // Komisyon oranı
  payment_method: PaymentMethod;
  // ... diğer alanlar
}

// Backend'e gönderirken:
// 1. tip_amount: kullanıcının girdiği brüt bahşiş
// 2. commission_rate: girdiği veya varsayılan oran
// 3. Backend (PaymentsService.ts):
//    const net_tip_amount = tip_amount - (tip_amount * commission_rate);
//    dto.net_tip_amount = net_tip_amount;

#### 4.2 Backend DTO Kontrolü

Backend'de:
- `create-payment.dto.ts` ve `create-split-payment.dto.ts` içinde:
  ```typescript
  @IsNumber()
  @IsOptional()
  @Min(0)
  // Makul bir limit, örn: siparişin 2 katı (Opsiyonel backend kontrolü)
  tip_amount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1) // %100'den fazla komisyon olamaz
  commission_rate?: number;
  ```
- Service katmanında (`PaymentsService.ts`) `net_tip_amount` hesaplanmalı:
  ```typescript
  const net_tip_amount = tip_amount - (tip_amount * (commission_rate || 0));
  ```
- Kaydedilirken üç alan da DB'ye yazılmalı.

---

## Özel Senaryolar

### 5.1 İptal Senaryosu

Ödeme iptal edildiğinde hem `amount` hem `tipAmount` iade edilmeli:

```typescript
// Payment revert işlemlerinde
const refundAmount = payment.amount + (payment.tipAmount || 0);
// Komisyon da iade edilmeli (garson zarar görmemeli)

const refundTip = payment.netTipAmount || payment.tipAmount;
// Backend'e refund isteği:
// - original_payment_id
// - refund_amount (toplam)
// - refund_tip_amount (net)
```

### 5.2 Nakit Tip Desteği

Nakit ödemelerde tip ekleme isteğe bağlı:

```typescript
// CashPaymentForm'da tip ekleme (opsiyonel)
// Not: Nakit tip genellikle komisyonsuz (doğrudan kasaya girer)
```

### 5.3 Raporlama (Z Raporu / Gün Sonu)

```typescript
// Raporlama - Üç ayrı değer gösterilmeli

interface TipReport {
  totalGrossTips: number;     // Brüt bahşiş (müşteriden alınan)
  totalCommission: number;    // Toplam komisyon (işletme gideri)
  totalNetTips: number;       // Net bahşiş (garsonun cebine girecek)
  totalRevenue: number;      // Ciro (tip HARİÇ)
}

// Örnek:
// Brüt Bahşiş: 1.000 TL
// Komisyon (%2): 20 TL
// Net Bahşiş: 980 TL (garsonun alacağı)
// Ciro: 10.000 TL
```

---

## Test Senaryoları

### Tip Girişi Testleri
- [ ] Kredi kartı için tip girişi yapılabilmeli
- [ ] Tip miktarı 0 olduğunda toplam sadece amount olmalı
- [ ] Tip girildiğinde "Karttan Çekilecek Toplam" gösterilmeli
- [ ] Tip miktarı değiştirildiğinde toplam anlık güncellenmeli

### Komisyon Hesaplama Testleri
- [ ] %2 komisyon ile 100 TL bahşiş → 98 TL net
- [ ] %3 komisyon ile 100 TL bahşiş → 97 TL net
- [ ] Komisyon 0 ise net = brüt
- [ ] Komisyon bilgisi UI'da doğru gösteriliyor

### UI Testleri
- [ ] Ödeme butonunda "120,00 TL Çek ve Ödemeyi Tamamla" yazıyor
- [ ] Net bahşiş bilgisi CardPaymentForm'da görünüyor

### Hesaplama Testleri
- [ ] Kalan bakiye hesaplaması sadece amount üzerinden yapılmalı
- [ ] Tip, kalan borcu etkilememeli
- [ ] Toplam ödenen miktar amount + tip olmalı

### İptal Testleri
- [ ] Ödeme iptal edildiğinde tip de iade edilmeli

### Raporlama Testleri
- [ ] Z Raporu'nda brüt bahşiş, komisyon, net bahşiş ayrı göster edilmeli

---

## Notlar

1. **Backend Uyumu**: Backend'de zaten `tip_amount`, `commission_rate`, ve `net_tip_amount` alanları mevcut. Sadece frontend entegrasyonu yapılacak.

2. **Vergi Matrahı**: Tip, gelir olarak sayılmamalı ve vergi matrahına dahil edilmemeli. Komisyon ise işletme gideri olarak değerlendirilebilir.

3. **Kredi Kartı Komisyonu**:
   - Net Bahşiş = Brüt Bahşiş - (Brüt Bahşiş × Komisyon Oranı)
   - Komisyon oranı **settings'den** çekilecek (restaurant bazlı yapılandırılabilir)
   - Garsonun raporlarında **net bahşiş** gösterilecek

4. **UI Netlik**: Ödeme onay butonunda "120,00 TL Çek ve Ödemeyi Tamamla" gibi net bir ifade olmalı.

5. **Güvenlik**: Tip miktarı backend tarafında doğrulanmalı (negatif değer, aşırı yüksek tutar kontrolü).

---

## Bağımlılıklar

- `@/modules/shared/utils/numeric.ts` - Sayısal işlemler için yardımcı fonksiyonlar
- `formatPaymentAmount` - Mevcut para birimi formatlama fonksiyonu
- Backend `payments` modülü çalışır durumda olmalı
- Settings modülü (`tip_commission_rate` ayarı)

---

## Sonraki Aşamalar

1. **Digital Wallet için Tip Desteği**: Bank Transfer, Digital Wallet için de tip ekleme
2. **Tip Oranı Özelliği**: Yüzdelik tip hesaplama (%10, %15, %20)
3. **Personel Bazlı Raporlama**: Bahşişin hangi garson/personele ait olduğu
4. **POS Terminal Entegrasyonu**: Fiziksel POS cihazlarına tip gönderimi
