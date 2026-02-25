# POS Ödeme Ekranı Redesign Planı

## Mevcut Durum Analizi

### ✓ Zaten Uygulanmış Olanlar

| Özellik | Durum | Dosya |
|---------|-------|-------|
| Split Layout (40%/60%) | ✓ | `PaymentModal.tsx` (satır 154-238) |
| Status Bar (Toplam/Kalan/İndirim) | ✓ | `PaymentStatusBar.tsx` |
| 4'lü Grid Ödeme Yöntemleri | ✓ | `PaymentMethodsGrid.tsx` (satır 73) |
| Dinamik İçerik Alanı | ✓ | `PaymentMethodDetails.tsx` |

---

## Yapılması İstenen İyileştirmeler

### 1. Ödeme Yöntemi Butonlarını Kompakt Hale Getirme

**Mevcut Durum:**
```tsx
// PaymentMethodsGrid.tsx - satır 73-99
<div className="grid grid-cols-4 gap-2">
  <button className="flex items-center gap-2 px-3 py-2.5 rounded-sm...">
    <Icon className="h-4 w-4" />
    <span className="text-xs font-medium">Nakit</span>
  </button>
</div>
```

**İstenen Değişiklik:**
- İkonların metnin solunda olması (zaten böyle)
- Daha kompakt butonlar (dikey padding azaltılabilir)
- Seçili durumda: Kalın border yerine **arka plan rengi dolgusu** (primary-subtle)
- Butonlar arasındaki boşluk azaltılabilir

**Yapılacak Değişiklik:**
```tsx
// Seçili durum için:
// ÖNCE: border-l-4 border-l-primary-main
// SONRA: bg-primary-subtle (primary/10)
```

### 2. Status Bar'ı Daha Belirgin Hale Getirme

**Mevcut Durum:** `PaymentStatusBar.tsx` - `px-4 py-3 bg-bg-muted`

**İstenen:**
- Status bar zaten mevcut, ancak kullanıcı bunun **modal en üstünde** olmasını istiyor
- Daha geniş ve belirgin tasarım

**Yapılacak Değişiklik:**
- PaymentStatusBar'ı header ile body arasına değil, en üste taşı
- Daha belirgin bir arka plan rengi kullan (örn: bg-primary-subtle veya bg-warning-subtle)
- Font boyutlarını büyüt

### 3. Sol Panel İçeriğini Sadeleştirme

**Mevcut Durum:** `PaymentSummaryCard` + Payment Lines birlikte

**İstenen:**
- Sol panel sadece **Ödeme Özeti** (Ara Toplam, Ödenen, Kalan)
- İndirim uygulama alanı da buraya
- Payment Lines (ödeme satırları) sağ panelde veya ayrı bir section olarak

---

## Uygulama Adımları

### Adım 1: PaymentMethodsGrid İyileştirmesi

```typescript
// PaymentMethodsGrid.tsx
// Seçili durumda arka plan dolgusu
isSelected
  ? 'bg-primary-subtle border border-primary-main/30 text-primary-main'
  : 'bg-bg-muted border border-border-light hover:border-primary-main/50'
```

### Adım 2: Status Bar'ı Yeniden Tasarla

```typescript
// PaymentStatusBar.tsx
// Daha belirgin tasarım
<div className="flex items-center justify-between px-6 py-4 bg-primary-subtle border-b border-primary-main/20">
  // Toplam | Kalan | İndirim | Ödenen
</div>
```

### Adım 3: Sol Panel'i Sadeleştir

- PaymentSummaryCard'ı temizle
- İndirim uygulama butonunu ekle
- Payment Lines'ı sağ paneldeki "Aktif Ödeme" section'ına taşı

---

## Etkilenecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `PaymentMethodsGrid.tsx` | Seçili state styling |
| `PaymentStatusBar.tsx` | Daha belirgin tasarım |
| `PaymentModal.tsx` | Layout düzenlemeleri |
| `PaymentSummaryCard.tsx` | İndirim butonu ekleme |

---

## Notlar

- Split layout zaten 40%/60% olarak uygulanmış
- Dinamik içerik alanı (Contextual UI) zaten çalışıyor
- Status Bar zaten mevcut, sadece görsel olarak daha belirgin hale getirilmeli
