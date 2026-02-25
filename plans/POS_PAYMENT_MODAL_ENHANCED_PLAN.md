# POS Ödeme Ekranı UI/UX ve Mantık İyileştirmeleri Planı

## Mevcut Durum Analizi

### 1. CustomerSelector.tsx (Satır 234-261)
**Mevcut Sorun:** "Yeni Müşteri" butonu sadece `searchQuery.length >= 2` VE `customers.length > 0` olduğunda görünüyor
```typescript
// Mevcut kod - satır 234
{onAddNew && searchQuery.length >= 2 && (
  // Buton sadece arama sonucu varsa görünüyor
)}
```
**Sorun:** Sonuç yoksa buton kayboluyor

### 2. PaymentSummaryCard - İndirim Butonu
**Mevcut Durum:** `onApplyDiscount` prop'u boş - işlevsiz

### 3. Sol Panel Ödeme Satırı Hizalama
**Mevcut Durum:** `flex items-center gap-3` eksik - input ve search alanları hizasız

---

## Yapılacak Değişiklikler

### Adım 1: Müşteri Arama - "Yeni Müşteri" Mantığı

#### Sorun
```typescript
// Mevcut - satır 188-189
{isOpen && customers.length > 0 && (
  // ... dropdown content
)}
```
**Sorun:** `customers.length > 0` koşulu ile sonuç yoksa dropdown hiç açılmıyor

#### Çözüm
```typescript
// Yeni yaklaşım
{isOpen && (
  <div className="absolute z-50 w-full mt-1 bg-bg-surface border border-border-light rounded-sm shadow-lg">
    {/* Sonuçlar varsa listele */}
    {customers.length > 0 ? (
      <div className="max-h-60 overflow-y-auto">
        {customers.map(...)}
      </div>
    ) : (
      /* Sonuç yoksa boş state göster */
      <div className="px-4 py-6 text-center text-text-muted">
        <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Müşteri bulunamadı</p>
      </div>
    )}
    
    {/* HER ZAMAN GÖRÜNÜR - Yeni Müşteri Butonu */}
    <button
      type="button"
      onClick={() => openNewCustomerModal()}
      className="w-full text-left px-4 py-3 hover:bg-primary-main/5 transition-colors border-t border-border-light"
    >
      <div className="flex items-center gap-3">
        <Plus className="h-4 w-4 text-primary-main" />
        <span className="font-semibold text-primary-main">Yeni Müşteri Ekle</span>
      </div>
    </button>
  </div>
)}
```

### Adım 2: Yeni Müşteri Modal

#### Yeni Bileşen: `NewCustomerModal.tsx`
```typescript
interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
  restaurantId: string;
  initialName?: string;
}

// Form alanları:
// - Ad Soyad (zorunlu)
// - Telefon (zorunlu)  
// - E-posta (opsiyonel)
// - Adres (opsiyonel)
```

#### Akış
1. CustomerSelector'da "Yeni Müşteri Ekle" tıklanır
2. `openNewCustomerModal()` fonksiyonu çağrılır
3. Modal açılır (initialName varsa otomatik doldurulur)
4. Form doldurulur ve "Kaydet" tıklanır
5. API ile veritabanına kaydedilir
6. Modal kapanır ve otomatik olarak seçili müşteri olarak atanır

### Adım 3: Sol Panel Ödeme Satırı Hizalama

#### Mevcut (PaymentModal.tsx - satır ~172-197)
```tsx
{hook.payments.map((payment, index) => (
  <PaymentLineItem
    key={payment.id}
    payment={payment}
    // hizalama eksik
  />
))}
```

#### Yeni - Hizalı Yapı
```tsx
<div className="flex items-center gap-3 p-3 bg-bg-surface border border-border-light rounded-sm">
  {/* Yöntem İkonu */}
  <div className="w-8 h-8 rounded-full bg-primary-main/10 flex items-center justify-center">
    <Icon className="h-4 w-4 text-primary-main" />
  </div>
  
  {/* Tutar Input */}
  <div className="flex-1">
    <input
      type="text"
      value={payment.amount}
      className="w-full px-3 py-2 text-right font-bold"
    />
  </div>
  
  {/* Müşteri/Search (Açık Hesap için) */}
  {payment.method === 'OPEN_ACCOUNT' && (
    <div className="flex-1">
      <CustomerSelector ... />
    </div>
  )}
  
  {/* Sil Butonu */}
  <button>...</button>
</div>
```

### Adım 4: İndirim Butonu Tasarımı

#### Mevcut (PaymentSummaryCard)
```tsx
<button 
  onClick={onApplyDiscount}
  className="text-primary-main text-sm hover:underline"
>
  İndirim Uygula
</button>
```

#### Yeni - Belirgin Tasarım
```tsx
<button
  onClick={() => setShowDiscountInput(true)}
  className={`
    w-full flex items-center justify-center gap-2 px-4 py-3 
    border border-dashed border-primary-main/30 rounded-sm
    text-primary-main font-semibold text-sm
    hover:bg-primary-main/5 hover:border-solid
    transition-all duration-200
  `}
>
  <Percent className="h-4 w-4" />
  İndirim Uygula
</button>

{/* AnimatePresence ile açılan input */}
{showDiscountInput && (
  <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
    <input 
      type="text" 
      placeholder="Tutar veya %"
      className="flex-1 px-3 py-2 border rounded-sm"
    />
    <button className="px-4 py-2 bg-primary-main text-white rounded-sm">
      Uygula
    </button>
  </div>
)}
```

### Adım 5: Validasyon - Ödemeyi Tamamla Butonu

#### Mevcut Mantık
```typescript
const canCompletePayment = remainingBalance <= 0;
```

#### Yeni Mantık - Açık Hesap için Müşteri Zorunlu
```typescript
const canCompletePayment = useMemo(() => {
  // Kalan <= 0 olmalı
  if (hook.remainingBalance > 0) return false;
  
  // Açık hesap ödemelerinde müşteri seçilmeli
  const hasOpenAccount = hook.payments.some(p => p.method === 'OPEN_ACCOUNT');
  if (hasOpenAccount) {
    const allHaveCustomer = hook.payments
      .filter(p => p.method === 'OPEN_ACCOUNT')
      .every(p => p.customerId);
    if (!allHaveCustomer) return false;
  }
  
  return true;
}, [hook.remainingBalance, hook.payments]);
```

---

## Etkilenecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `CustomerSelector.tsx` | Dropdown mantığı + her zaman görünür "Yeni Müşteri" butonu |
| `PaymentModal.tsx` | Yeni müşteri modal state yönetimi |
| `PaymentSummaryCard.tsx` | İndirim butonu tasarımı ve input açma/kapama |
| `NewCustomerModal.tsx` | **YENİ** - Yeni müşteri formu modal |
| `PaymentMethodDetails.tsx` | Açık hesap formu hizalama |

---

## Yeni Dosya Oluşturulacak

### `web/modules/orders/components/NewCustomerModal.tsx`

> **Bonus İpucu:** Telefon girişi için `react-input-mask` kullanılması önerilir. Bu, telefon numaralarının standart formatta (05xx xxx xx xx) kaydedilmesini sağlar.

```typescript
'use client';

import { useState } from 'react';
import { X, User, Phone, Mail, MapPin, Loader2 } from 'lucide-react';
import { customersApi, Customer } from '@/modules/customers/services/customers.service';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
  restaurantId: string;
  initialName?: string;
}

export function NewCustomerModal({ ... }) {
  const [formData, setFormData] = useState({
    first_name: initialName?.split(' ')[0] || '',
    last_name: initialName?.split(' ').slice(1).join(' ') || '',
    phone: '',
    email: '',
    address: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const newCustomer = await customersApi.create({
        ...formData,
        restaurant_id: restaurantId,
      });
      onSuccess(newCustomer);
      onClose();
    } catch (error) {
      console.error('Failed to create customer:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-bg-surface rounded-sm shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-text-primary uppercase">
            Yeni Müşteri
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
              Ad Soyad *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                required
                value={formData.first_name}
                onChange={e => setFormData({...formData, first_name: e.target.value})}
                className="w-full pl-10 pr-4 py-3 border border-border-light rounded-sm"
                placeholder="Ad"
              />
              <input
                required
                value={formData.last_name}
                onChange={e => setFormData({...formData, last_name: e.target.value})}
                className="w-full mt-2 pl-10 pr-4 py-3 border border-border-light rounded-sm"
                placeholder="Soyad"
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
              Telefon *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                required
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full pl-10 pr-4 py-3 border border-border-light rounded-sm"
                placeholder="0 (___) ___ __ __"
              />
            </div>
          </div>
          
          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary-main text-white font-semibold rounded-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Kaydet'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## Özet

| # | Görev | Dosya |
|---|-------|-------|
| 1 | Müşteri dropdown her zaman açılsın | `CustomerSelector.tsx` |
| 2 | "Yeni Müşteri" butonu her zaman görünsün | `CustomerSelector.tsx` |
| 3 | Yeni Müşteri Modal oluştur | `NewCustomerModal.tsx` (YENİ) |
| 4 | İndirim butonu tasarımı | `PaymentSummaryCard.tsx` |
| 5 | Sol panel hizalama | `PaymentModal.tsx` |
| 6 | Açık hesap validasyonu | `PaymentModal.tsx` |
