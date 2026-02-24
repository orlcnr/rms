# Dashboard UI İyileştirme Planı

## Genel Bakış

Bu plan, dashboard'daki 3 ana alanda yapılacak iyileştirmeleri kapsamaktadır:
1. Sidebar (Sol Menü) iyileştirmeleri
2. Rezervasyonlar paneli güncellemeleri
3. Header ve genel düzen iyileştirmeleri

---

## 1. Sidebar (Sol Menü) İyileştirmeleri

### Dosya: `web/modules/shared/components/Sidebar.tsx`

| # | Değişiklik | Satır | Mevcut Değer | Yeni Değer |
|---|-----------|-------|--------------|------------|
| 1 | Aktif öğe için sol border ekle | 77 | `border-r-4 border-primary-main` | `border-l-4 border-primary-main` |
| 2 | Menu header font ağırlığı | 65 | `font-black` | `font-medium` |
| 3 | İkon renk düzeltmesi (inaktif) | 83 | `text-text-muted` | `text-text-secondary` |

### Detaylar:

```tsx
// Satır 65 - Menu header (ANA MENÜ)
<span className="text-[9px] font-medium text-text-muted uppercase tracking-[0.2em] opacity-50">
  ANA MENÜ
</span>

// Satır 74-78 - Menu item styling
className={cn(
  "flex items-center gap-3 px-6 py-3.5 text-[10px] font-black uppercase tracking-wider transition-all relative group",
  isActive
    ? "text-primary-main bg-bg-app border-l-4 border-primary-main"  // DEĞİŞTİ: border-r -> border-l
    : "text-text-secondary hover:text-text-primary hover:bg-bg-app/50 border-l-4 border-transparent"  // DEĞİŞTİ: text-text-muted -> text-text-secondary
)}

// Satır 83 - İkon renk
className={cn("transition-colors", isActive ? "text-primary-main" : "text-text-secondary")}  // DEĞİŞTİ: text-text-muted -> text-text-secondary
```

---

## 2. Rezervasyonlar Paneli Güncellemeleri

### Dosya: `web/modules/dashboard/components/UpcomingReservations.tsx`

| # | Değişiklik | Satır | Mevcut Değer | Yeni Değer |
|---|-----------|-------|--------------|------------|
| 1 | Yükseklik eşitleme | 16 | `h-[340px]` | `h-full` + flex düzenlemesi |
| 2 | Kayıt sayısını kaldır | 23-25 | Counter span | Link button ekle |
| 3 | Takvim butonunu kaldır | 65-70 | Button section | Kaldır |

### Detaylar:

```tsx
// Satır 16 - Yükseklik değişikliği
// Önceki:
// <section className="bg-bg-surface border border-border-light rounded-sm shadow-sm h-[340px] flex flex-col">

// Yeni:
<section className="bg-bg-surface border border-border-light rounded-sm shadow-sm flex flex-col min-h-[400px]">

// Satır 17-27 - Header güncellemesi
<div className="p-4 pb-2.5 border-b border-border-light flex-shrink-0">
  <div className="flex justify-between items-center mb-3">
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-4 bg-info-main rounded-full" />
      <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.15em]">REZERVASYONLAR</h2>
    </div>
    {/* YENİ: Link button - RecentOrders'a benzer */}
    <button className="text-xs font-semibold text-text-muted hover:text-primary-main transition-colors tracking-widest uppercase flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-primary-main" aria-label="Tüm rezervasyonları görüntüle">
      TÜM REZERVASYONLAR <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
    </button>
  </div>
</div>

// Satır 29 - Scroll alanı (mevcut - korunacak)
// <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border-medium">

// Satır 65-70 - Takvim butonu (KALDIRILACAK)
// Bu div tamamen kaldırılacak
```

### DashboardClient.tsx ile eşitleme:

```tsx
// DashboardClient.tsx - Satır 43-45
// Önceki:
// <div className="lg:col-span-4">
//     <UpcomingReservations />
// </div>

// Yeni: Her iki panel aynı yükseklikte olacak şekilde düzenleme
<div className="lg:col-span-4 h-full">
    <UpcomingReservations />
</div>
```

---

## 3. Header ve Genel Düzen İyileştirmeleri

### 3.1 MainHeader Yükseklik Artırma

### Dosya: `web/modules/shared/components/MainHeader.tsx`

| # | Değişiklik | Satır | Mevcut Değer | Yeni Değer |
|---|-----------|-------|--------------|------------|
| 1 | Header yüksekliği | 11 | `h-16` | `h-20` (80px) |

```tsx
// Satır 11
<header className="fixed top-0 left-0 right-0 z-50 bg-bg-surface border-b border-border-light h-20 flex items-center justify-between px-6 lg:px-8 shadow-sm">
```

### 3.2 Sidebar Logout Button İyileştirmesi

### Dosya: `web/modules/shared/components/Sidebar.tsx`

| # | Değişiklik | Satır | Mevcut Değer | Yeni Değer |
|---|-----------|-------|--------------|------------|
| 1 | Logout button hover | 106 | `hover:bg-danger-main/10` | `hover:bg-danger-subtle` |

```tsx
// Satır 105-110
<button
  className="flex items-center gap-3 px-4 py-3.5 w-full rounded-sm text-[10px] font-black uppercase tracking-[0.2em] text-danger-main bg-danger-main/5 hover:bg-danger-subtle border border-danger-main/10 hover:border-danger-main/30 transition-all active:scale-95"
>
  <LogOut size={16} />
  <span>SİSTEMDEN ÇIK</span>
</button>
```

---

## Uygulama Sırası

1. **Sidebar.tsx** - Aktif state düzeltmesi ve menu header font
2. **UpcomingReservations.tsx** - Header link, yükseklik, takvim butonu kaldırma
3. **MainHeader.tsx** - Header yükseklik artırma
4. **Sidebar.tsx** - Logout button hover düzeltmesi

---

## Notlar

- Mevcut `text-text-secondary` kullanımı korunacak (zaten doğru)
- Aktif item için `border-l-4` (sol kenar) eklenecek - bu ERP standartlarına uygun
- Rezervasyon paneli `h-full` kullanarak RecentOrders ile eşitlenecek
- Scroll alanı (`overflow-y-auto`) mevcut, korunacak
- Token'lar (`text-text-secondary`, `text-text-primary`, `border-primary-main`, `bg-danger-subtle`) projenin design token'larından
