# Orders Module Refactor Plan (Kanban & Timezone)

## 1. UI ve Tasarım Standartizasyonu
- [x] `OrdersBoardClient.tsx` dosyasının `SubHeaderSection`, `FilterSection` ve `BodySection` layout yapıtaşlarıyla (.agent/rules/page-modul-design-rules.md) sarmalanması.
- [x] `OrdersSubHeader` bileşeninin kullanımdan kaldırılarak, standard `SubHeaderSection`'a entegre edilmesi.
- [x] Özel component içi border ve background tanımlarının kaldırılarak, kurumsal tasarım tokenlerine (`bg-bg-app`, `bg-bg-surface`, `border-border-light`) geçiş yapılması.
- [x] Order tipleri ve durum etiketlerinde kullanılan geçici renklerin (`bg-blue-100` vb.) global tema tokenlarıyla değiştirilmesi.cek.
- **FilterSection:**
  - `BoardFilters.tsx` yenilenecek. Saf beyaz arkaplan, çerçeveler ve `DateTimePicker` ile tutarlı form elemanları kullanılacak. Dropdownlar modern ERP standartlarına çekilecek.
- **BodySection (Kanban Board):**
  - Kartların sergilendiği alan, ekranın alt sınırına kadar uzanan (Full Height) beyaz, çerçeveli bir kart içine alınacak. `overflow-hidden` ile kendi içinde dikey/yatay scrolllanabilir dnd-kit kanban board oluşturulacak.

## 2. Kanban Board Drag-and-Drop (Sürükle-Bırak) Düzeltmeleri
- [x] Kanban Board'daki (KanbanBoard.tsx) kartı sürükleyip bıraktıktan sonra state senkronizasyonu kaynaklı gecikmelerin (Optimistic UI update) giderilmesi.
- [x] **Optimistic Updates & Socket Guard:** `useOrdersBoard` hook'unda backend'den cevap beklenmeden UI snapshot'ının güncellenmesi. Eğer internet kesikse (`!isConnected`) Offline Mode olarak sürükleme işlemini iptal edip uyarı göstermek("Bağlantı bekleniyor...").
- [x] İlgili state güncelleme methodlarının (`updateStatus`) ID uyuşmazlığının düzeltilerek, drag olaylarının `orderId` ve list grouping kurgusuyla stabil çalışması.
- [x] Başka bir terminalden sipariş düzeltildiğinde Layout-Animation ile yumuşak geçişin sağlanması (Mevcut framer-motion/dnd-kit yapısı denetlenerek).

## 3. Timezone Tutarlılığı (Zaman Hesaplamaları)
- [x] OrderCard ve BoardFilters içinde kullanılan istemci bağımlı `new Date()` çağırmalarının tamamen temizlenmesi.
- [x] `date-fns` ve `getNow()` utility fonksiyonunun tüm hesaplamalara (`timeAgo`, `staleIndicator`, `DateFilters`) dahil edilmesi. Bekleme sürelerinin server destekli time-offset ile gerçeği yansıtması.
- [x] Backend Date işlemlerinin gözden geçirilip filtrelerde UTC-Lokal zaman kaymalarının düzeltilmesi (Backend timezone ve order filtrelemesi).` utility'si ile değiştirilecek.
  - Sınır tarih hesaplamalarında (Date Range) sunucu-istemci saat farkı (Offset) gözetilerek doğru Timestamp'ler (veya `toLocaleDateString('sv-SE')`) gönderilecek.
  - **Backend Adaptasyonu:** `orders.service.ts` veya ilgili filtreleme servislerinde `AT TIME ZONE` dönüşümleri kontrol edilecek ve UTC verilerin yerel saat aralıklarında doğru süzüldüğünden (özellikle 'Bugün' sorgularında) emin olunacak.
## 4. UI İşlevselliği ve Görsel İpuçları (Visual Cues)
- **Teslim Edilen Kartların Vurgulanması:**
  - Bir sipariş teslim edildiğinde (Served/Completed) kart dizaynı kendini belli edecek (örneğin soluklaşma, gri tonlama, üzerinde ✓ 'Teslim Edildi' ibaresi veya belirgin görsel de-aktivasyon).
- **"Sonradan Eklenen Ürün" Gruplama Mantığı ve Görsel Hiyerarşi:**
  - Sipariş içerisindeki ürünler "Eklenme Zamanına## 4. Görsel İpuçları ve Mutfak Önceliklendirme Ekranı
- [x] **Ek Sipariş Grubu:** Yeni bir `Order` eski bir gruba masaya dahil olduğunda, "EK SİPARİŞ" başlığı altında, farklı arka plan (`bg-bg-muted`) ve öncelikli renkle ayrıştırılması.
- [x] `SERVED` veya `DELIVERED` statülerine alınan sipariş kartlarının tamamen kapandığının anlaşılması için grileşmesi (`opacity`, `grayscale`) veya tasarım sisteminde yer alan başarıldı (kapandı) görünümüne girmesi.
- [x] "Stale Order" (Uzun süre bekleyen siparişler) için titreşim veya Border vurgusu (`Card Density` kurallarına uymak kaydıyla).tes:**
  - Kanban board'da bir kart sürüklendiğinde, `useOrders` hook'u içerisinde Zustand veya React Query üzerinden "Optimistic Update" uygulanacak. 
  - Backend'ten cevap beklenmeden UI anında yeni hale geçecek; böylece kullanıcının yorulması ve kartın eski yerine fırlaması (rubber-banding) sorunu engellenecek.
- **Soket (Bağlantı) Koruması [Offline Mode Kuralı]:**
  - İnternet anlık koptuğunda (`socket.disconnected`), sürükle-bırak (Drag & Drop) işlemi geçici olarak kilitlenecek.
  - Kullanıcıya anında "Bağlantı bekleniyor, işlem yapılamaz" şeklinde net bir hata/uyarı mesajı gösterilecek.
