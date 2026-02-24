 Raporlama Modülü - Detaylı Planlama
📊 Genel Bakış
Restoran yönetim sistemi için kapsamlı bir raporlama altyapısı oluşturacağız. Sistem 3 ana kategori altında 11 farklı rapor tipi sunacak.

🎯 Rapor Kategorileri
Raporlar
├─ 📈 Satış
│  ├─ Günlük Satış Raporu
│  ├─ Ürün Bazlı Satış Analizi
│  ├─ Kategori Bazlı Performans
│  └─ Saatlik Satış Dağılımı
│
├─ 📦 Stok
│  ├─ Anlık Stok Durumu
│  ├─ Stok Hareket Raporu
│  ├─ Fire (Kayıp) Raporu
│  └─ Maliyet Analizi
│
└─ 💰 Finans
   ├─ Kasa Raporu
   └─ Ödeme Tipi Bazlı Analiz
❓ Netleştirilmesi Gereken Noktalar
Lütfen şu soruları yanıtlayalım ki doğru mimariyi kuralım:

1. Tarih Filtreleme
Soru: Tüm raporlarda özel tarih aralığı seçilebilmeli mi? (örn: 15 Ocak - 20 Şubat)
Öneri: Hazır şablonlar + özel tarih
Bugün
Bu Hafta (Pazartesi-Pazar)
Bu Ay
Geçen Ay
Son 7 gün
Son 30 gün
Özel Tarih Aralığı
2. Rapor Exportları
Soru: Raporlar dışa aktarılabilmeli mi?
Formatlar: Excel (XLSX), PDF, CSV
Öneri: Önce ekranda göster, sonraki aşamada export ekle
3. Stok Fire Raporu
Soru: Fire kayıtları nasıl tutulacak?
Seçenekler:
A) Envanter modülünde ayrı bir "Fire Kaydı" formu eklensin
B) Sayım sırasında otomatik tespit edilsin (beklenen vs gerçek)
C) Her ikisi
Ek Alan: Fire nedeni (bozulma, test, kırılma, çalınma, vb.)
4. Maliyet Analizi
Soru: Detay seviyesi ne olmalı?
Seçenekler:
A) Sadece malzeme maliyeti (COGS)
B) Malzeme + İşçilik (saatlik ücret × süre)
C) Tam maliyet (malzeme + işçilik + genel giderler)
Öneri: Önce A, sonra genişletilebilir
5. Kasa Raporu
Soru: Kasa açılış/kapanış saydırması sisteme kayıt edilecek mi?
Seçenekler:
A) Evet, vardiya başı/sonu kasada olması gereken vs. gerçek tutarı girsin
B) Hayır, sadece ödemeleri topla
Ek özellik: Nakit çekmeler, ekleme vs.
6. Görselleştirme
Soru: Grafik/chart kütüphanesi kullanmamızı ister misiniz?
Öneri: Recharts (React için popüler, hafif)
Grafik Tipleri:
Çizgi grafik (trend)
Bar grafik (karşılaştırma)
Pasta grafik (dağılım)
Heatmap (saatlik yoğunluk)
7. Gerçek Zamanlı vs. Snapshot
Soru: Raporlar her açıldığında canlı hesaplansın mı, yoksa günlük snapshot'lar tutulsun mu?
Trade-off:
Canlı: Her zaman güncel, ama yavaş (özellikle büyük veri setlerinde)
Snapshot: Çok hızlı, ama bir gün önceki veriler
Öneri: Hybrid - Bugünkü verilerimiz canlı, geçmiş snapshot
🏗️ Önerilen Mimari
Backend Yapısı
backend/src/modules/reports/
├── reports.module.ts
├── reports.controller.ts
├── reports.service.ts
├── services/
│   ├── sales-report.service.ts
│   ├── inventory-report.service.ts
│   └── finance-report.service.ts
├── dto/
│   ├── date-range.dto.ts
│   ├── sales-report.dto.ts
│   ├── inventory-report.dto.ts
│   └── finance-report.dto.ts
└── entities/
    ├── waste-log.entity.ts (Fire kayıtları için)
    └── cash-session.entity.ts (Kasa açılış/kapanış için, opsiyonel)
Örnek Endpoint'ler
// Satış Raporları
GET /reports/sales/daily?start_date=2024-01-01&end_date=2024-01-31
GET /reports/sales/by-product?start_date=2024-01-01&end_date=2024-01-31
GET /reports/sales/by-category?start_date=2024-01-01&end_date=2024-01-31
GET /reports/sales/hourly?date=2024-01-15
// Stok Raporları
GET /reports/inventory/current
GET /reports/inventory/movements?start_date=...&end_date=...
GET /reports/inventory/waste?start_date=...&end_date=...
GET /reports/inventory/cost-analysis?start_date=...&end_date=...
// Finans Raporları
GET /reports/finance/cash-register?start_date=...&end_date=...
GET /reports/finance/payment-methods?start_date=...&end_date=...
Frontend Yapısı
frontend/
├── app/reports/
│   ├── page.tsx (Ana rapor sayfası - liste)
│   ├── sales/
│   │   ├── daily/page.tsx
│   │   ├── by-product/page.tsx
│   │   ├── by-category/page.tsx
│   │   └── hourly/page.tsx
│   ├── inventory/
│   │   ├── current/page.tsx
│   │   ├── movements/page.tsx
│   │   ├── waste/page.tsx
│   │   └── cost/page.tsx
│   └── finance/
│       ├── cash/page.tsx
│       └── payment-methods/page.tsx
│
└── modules/reports/
    ├── components/
    │   ├── ReportCard.tsx (Rapor kartı)
    │   ├── DateRangePicker.tsx (Tarih seçici)
    │   ├── ReportHeader.tsx
    │   ├── ExportButton.tsx
    │   └── charts/
    │       ├── LineChart.tsx
    │       ├── BarChart.tsx
    │       ├── PieChart.tsx
    │       └── HeatMap.tsx
    ├── service.ts
    └── types.ts
📝 Rapor Detayları
📈 Satış Raporları
1. Günlük Satış Raporu
Gösterilecek Bilgiler:

Toplam satış adedi
Toplam ciro
Ortalama hesap tutarı
En çok satan 5 ürün
Günlere göre trend grafiği
2. Ürün Bazlı Satış
Gösterilecek Bilgiler:

Her ürün için: adet, ciro, kar marjı
Sıralama: En çok satan > En az satan
Filtreleme: Kategori bazlı
3. Kategori Bazlı Performans
Gösterilecek Bilgiler:

Kategori adı
Satılan ürün adedi
Toplam ciro
Pasta grafik (kategori dağılımı)
4. Saatlik Satış Dağılımı
Gösterilecek Bilgiler:

Saat dilimlerine göre (00:00-01:00, 01:00-02:00, ...)
Her saatte kaç sipariş alındı
Heatmap görselleştirme
Yoğun saatlerin tespiti
📦 Stok Raporları
1. Anlık Stok Durumu
Gösterilecek Bilgiler:

Tüm malzemeler
Mevcut miktar vs minimum stok
Kritik seviye uyarıları
Toplam stok değeri (maliyet × miktar)
2. Stok Hareket Raporu
Gösterilecek Bilgiler:

Giriş/Çıkış hareketleri
Hareket tipi (satın alma, kullanım, fire)
Tarih, miktar, açıklama
3. Fire (Kayıp) Raporu
Gösterilecek Bilgiler:

Fire verilen malzeme
Miktar
Maliyet
Neden
Toplam fire değeri
4. Maliyet Analizi
Gösterilecek Bilgiler:

Ürün bazında COGS (Cost of Goods Sold)
Satış fiyatı vs. maliyet
Kar marjı (%)
En karlı/zararlı ürünler
💰 Finans Raporları
1. Kasa Raporu
Gösterilecek Bilgiler:

Açılış kasası (opsiyonel)
Nakit tahsilatlar
Nakit çıkışlar
Beklenen kapanış
Gerçek kapanış (opsiyonel)
Fark analizi
2. Ödeme Tipi Bazlı Analiz
Gösterilecek Bilgiler:

Nakit ödemeler (toplam, adet)
Kredi kartı (toplam, adet)
Diğer (yemek kartı, vb.)
Pasta grafik (dağılım)
🚀 Önerilen Geliştirme Fazları
Faz 1: Temel Altyapı (İlk Sprint)
 DateRangePicker component
 Backend ReportsModule kurulumu
 Temel DTO'lar ve validation
 Ana rapor sayfası (liste görünümü)
Faz 2: Satış Raporları
 Günlük satış raporu
 Ürün bazlı analiz
 Kategori performans
 Saatlik dağılım
Faz 3: Stok Raporları
 Anlık stok durumu
 Hareket raporu
 Fire logging sistemi + raporu
 Maliyet analizi
Faz 4: Finans Raporları
 Ödeme tipi analizi
 Kasa raporu (opsiyonel özelliklerle)
Faz 5: Görselleştirme & Export
 Chart'lar (Recharts entegrasyonu)
 Excel export
 PDF export (opsiyonel)
💡 Öneriler
Performans
Index'ler: orders.created_at, order_items.menu_item_id, payments.payment_method
Büyük veri setleri için pagination
Cache kullanımı (Redis) snapshot'lar için
Güvenlik
Raporlara sadece OWNER, MANAGER, SUPER_ADMIN erişebilmeli
Restaurant ID filtreleme (multi-tenant)
UX
Loading skeleton'ları
Empty state'ler (veri yoksa)
Responsive tasarım
Print-friendly görünüm
