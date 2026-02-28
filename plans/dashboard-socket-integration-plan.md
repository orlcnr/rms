# Dashboard Socket Entegrasyon Planı

## Özet

Bu plan, `web/modules/dashboard` klasöründeki mevcut taslak dashboardun dinamik hale getirilmesini ve socket üzerinden gerçek zamanlı verilerle çalışmasını kapsamaktadır. Backend'deki mevcut `NotificationsGateway` ve `AnalyticsService` kullanılarak frontend'deki dashboard gerçek verilerle beslenecektir.

> **RMS Özel Notu**: Restoran yönetim sistemlerinde dashboard sadece "geçmişin raporu" değil, **anlık operasyonel karar destek sistemi** olmalıdır. Bu plan bu felsefe ile hazırlanmıştır.

---

## Mevcut Durum Analizi

### Web Dashboard (Taslak - Statik Veriler)
- **Konum**: `web/modules/dashboard/components/`
- **Bileşenler**:
  - `HeroStats.tsx` - 4 KPI kartı (örnek veriler: ₺12.650,45, 42 sipariş, %86 doluluk, 12 kritik stok)
  - `RecentOrders.tsx` - Son siparişler tablosu (sabit dizi)
  - `RevenueChart.tsx` - 7 günlük gelir grafiği (sabit veri)
  - `UpcomingReservations.tsx` - Gelecek rezervasyonlar

### Frontend Dashboard (API Entegrasyonu Hazır)
- **Konum**: `frontend/modules/dashboard/`
- **Dosyalar**:
  - `service.ts` - `analyticsApi.getSummary()` ve `analyticsApi.getHourlySales()` API çağrıları
  - `types.ts` - `AnalyticsSummary`, `HourlySales`, `DailySales` tipleri

### Backend Altyapısı
- **Analytics Module**: `backend/src/modules/analytics/`
  - `GET /analytics/summary` - Özet metrikler (günlük gelir, aktif sipariş, doluluk oranı)
  - `GET /analytics/hourly-sales` - Saatlik satış raporu
- **NotificationsGateway**: `backend/src/modules/notifications/`
  - `join_room` event - Restaurant odasına katılım
  - `new_order` - Yeni sipariş bildirimi
  - `order_status_updated` - Sipariş durumu güncelleme
  - `order:updated` - Sipariş güncelleme

---

## Hedefler

1. Web dashboard bileşenlerinin backend API'sine bağlanması
2. Socket entegrasyonu ile gerçek zamanlı güncellemeler
3. Web dashboard'un mevcut taslak UI's korunarak veri akışının sağlanması
4. **RMS Operasyonel**: Kritik stok, mutfak yükü, masa devir hızı gibi operasyonel metriklerin dashboard'a entegre edilmesi
5. **Bağlantı Güvenliği**: Socket bağlantı durumunun görsel olarak takibi

---

## Etkilenecek Dosyalar

### Yeni Oluşturulacak Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `web/modules/dashboard/hooks/useDashboardSocket.ts` | Socket bağlantısı ve event yönetimi (Zustand store entegrasyonu) |
| `web/modules/dashboard/hooks/useAnalytics.ts` | Analytics API çağrıları için hook |
| `web/modules/dashboard/types/dashboard.types.ts` | Dashboard için TypeScript tipleri |
| `web/modules/dashboard/lib/socket.ts` | Socket.io client konfigürasyonu |
| `web/modules/dashboard/store/dashboard.store.ts` | Zustand store (performans için client-side KPI güncellemesi) |
| `web/modules/dashboard/components/ConnectionStatus.tsx` | Socket bağlantı durumu göstergesi (yeşil/kırmızı nokta) |
| `web/modules/dashboard/components/KitchenLoadMeter.tsx` | Mutfak yükü göstergesi |
| `web/modules/dashboard/components/InventoryAlertDrawer.tsx` | Kritik stok uyarı drawer'ı |

### Modifikasyon Yapılacak Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `web/modules/dashboard/components/DashboardClient.tsx` | Socket bağlantısı, store, ve bağlantı durumu eklenecek |
| `web/modules/dashboard/components/HeroStats.tsx` | Dinamik veri + masa devir hızı + kritik stok tıklanabilir |
| `web/modules/dashboard/components/RecentOrders.tsx` | Socket event'leri dinleyecek |
| `web/modules/dashboard/components/RevenueChart.tsx` | Dual-axis grafik (Gelir + Sipariş Sayısı) |

---

## Adım Adım Değişiklikler

### Adım 1: Tip Tanımları ve API Servisi

```
1.1. Create web/modules/dashboard/types/dashboard.types.ts
    - AnalyticsSummary interface (API response için)
    - Order interface (socket event'leri için)
    - DashboardStats interface (HeroStats için)
    - KitchenLoad interface (mutfak yükü için)
    - InventoryAlert interface (kritik stok için)
    - TableTurnaround interface (masa devir hızı için)

1.2. Create web/modules/dashboard/lib/api.ts
    - analytics.getSummary() wrapper
    - analytics.getDailySales() wrapper
    - orders.getRecent() wrapper
    - inventory.getCritical() wrapper (kritik stoklar için)
    - tables.getTurnaround() wrapper (devir hızı için)
```

### Adım 2: Zustand Store ve Socket Entegrasyonu

> **Performans Notu**: Her yeni sipariş geldiğinde API'yi tekrar çağırmak yerine, client-side'da manuel KPI güncellenmesi yapılacak. Bu RMS sistemlerinde kritik performans sağlar.

```
2.1. Install Zustand in web/
    - npm install zustand

2.2. Create web/modules/dashboard/store/dashboard.store.ts
    - State: recentOrders[], kpis, isSocketConnected, criticalStocks[], kitchenLoad
    - Actions: addRecentOrder(), updateKPIs(), setConnectionStatus(), setCriticalStocks()
    - Persist middleware (opsiyonel - localStorage)

2.3. Install socket.io-client in web/
    - npm install socket.io-client

2.4. Create web/modules/dashboard/lib/socket.ts
    - Socket instance oluştur
    - JWT token authentication
    - Restaurant odasına katılma fonksiyonu
    - Event listener kayıt fonksiyonları

2.5. Create web/modules/dashboard/hooks/useDashboardSocket.ts
    - Socket bağlantısı (useEffect)
    - join_room/leave_room yönetimi
    - Zustand store'a bağlı event handlers:
        * onNewOrder → addRecentOrder() + updateKPIs({ activeOrders: '+1', totalRevenue: order.totalAmount })
        * onOrderStatusUpdate → updateOrderInList()
        * onInventoryLow → setCriticalStocks()
        * onKitchenLoad → setKitchenLoad()
    - Socket bağlantı durumu yönetimi (isSocketConnected)
    - Disconnect toast notification
    - Cleanup on unmount
```

### Adım 3: Dashboard Bileşenlerinin Güncellenmesi

```
3.1. ConnectionStatus.tsx (YENİ)
    - Props: isConnected: boolean
    - Yeşil nokta = Bağlı, Kırmızı nokta = Bağlantı koptu
    - Tooltip: "Canlı veri aktarımı aktif" / "Bağlantı kesildi"

3.2. KitchenLoadMeter.tsx (YENİ)
    - Preparing sipariş sayısı / Toplam Kapasite
    - Progress bar: yeşil (<%60), sarı (%60-80), kırmızı (>%80)
    - Label: "Mutfak Kapasitesi: 12/20 (60%)"
    - Real-time socket güncellemesi

3.3. InventoryAlertDrawer.tsx (YENİ)
    - Kritik stok ürünleri listesi
    - Ürün adı, mevcut miktar, minimum miktar
    - Tıklandığında açılan drawer
    - Socket event: inventory:low

3.4. HeroStats.tsx Güncellemesi
    - Props: kpis: DashboardKPI[] (Zustand store'dan)
    - useAnalytics hook'tan ilk yükleme verisi
    - Masa Devir Hızı (Ortalama İşgal Süresi) kartı eklenecek
    - Kritik Stok kartı tıklanabilir → InventoryAlertDrawer açılır
    - Loading/error state'leri handle et

3.5. RecentOrders.tsx Güncellemesi
    - Props: orders: Order[] (Zustand store'dan)
    - Socket event: 'new_order' → orders listesine ekle
    - Socket event: 'order_status_updated' → ilgili siparişi güncelle

3.6. RevenueChart.tsx Güncellemesi (DUAL-AXIS)
    - Sol Y-Axis: Gelir (TL)
    - Sağ Y-Axis: Sipariş Sayısı
    - Combo chart (Line + Bar veya Area + Line)
    - API'den son 7 günlük veri çek
    - "Sepet Ortalaması" hesaplaması için karşılaştırmalı veri
    - Tarih formatlaması

3.7. DashboardClient.tsx Güncellemesi
    - Zustand store provider
    - Socket ve API hook'larını entegre et
    - ConnectionStatus bileşenini header'a ekle
    - KitchenLoadMeter bileşenini KPI'ların yanına ekle
    - Loading skeleton'ları ekle
```

### Adım 4: Backend Socket Event Genişletmesi

```
4.1. Yeni Socket Event'leri (Backend tarafında eklenecek)

    a) inventory:low
        - Veri: { productId, productName, currentStock, minStock, unit }
        - Tetikleyici: Inventory service'de kritik stok kontrolü
        - UI: HeroStats'taki kritik stok sayısı güncellenir + drawer açılır

    b) kitchen:load
        - Veri: { preparingCount, totalCapacity, loadPercentage }
        - Tetikleyici: Orders service'de status değişikliği
        - UI: KitchenLoadMeter güncellenir

    c) table:turnaround
        - Veri: { averageOccupancyMinutes, totalTurnarounds, currentOccupied }
        - Tetikleyici: Tables service'de masa durumu değişikliği
        - UI: HeroStats masa kartı güncellenir

    d) dashboard:stats_update
        - Veri: { kpis: {...} }
        - Tetikleyici: Cron job veya analytics service
        - UI: Periyodik KPI güncellemeleri (30 saniye)

4.2. Analytics Service Güncellemeleri
    - getCriticalStocks() - Kritik stokları getir
    - getTableTurnaround() - Masa devir hızını hesapla
    - getKitchenLoad() - Mutfak yükünü hesapla

4.3. NotificationsGateway Güncellemesi
    - notifyInventoryLow() metodu
    - notifyKitchenLoad() metodu
    - notifyTableTurnaround() metodu
```

---

## Socket Event Mappings

### Frontend'de Dinlenecek Event'ler

| Event Adı | Veri Yapısı | UI Etkisi |
|-----------|-------------|-----------|
| `new_order` | Order object | RecentOrders'a ekle, HeroStats sipariş sayısını artır, kitchenLoad güncelle |
| `order_status_updated` | Order object | İlgili siparişin durumunu güncelle, kitchenLoad güncelle |
| `order:updated` | { orderId, totalAmount, status } | Sipariş tutarını güncelle |
| `inventory:low` | { productId, productName, currentStock, minStock } | HeroStats kritik stok sayısı artır, notification göster |
| `kitchen:load` | { preparingCount, totalCapacity } | KitchenLoadMeter güncellenir |
| `table:turnaround` | { averageOccupancyMinutes } | HeroStats masa kartı güncellenir |
| `reservation_update` | Reservation object | UpcomingReservations'ı güncelle |
| `connect` | - | ConnectionStatus yeşile döner |
| `disconnect` | - | ConnectionStatus kırmızı döner + toast gösterilir |

### Backend'e Gönderilecek Event'ler

| Event Adı | Veri Yapısı |
|-----------|-------------|
| `join_room` | { restaurant_id: string, token: string } |
| `leave_room` | { restaurant_id: string } |

---

## RMS-Spesifik Özellikler Detay

### 1. Kritik Stok Uyarı Sistemi

```
Akış:
1. Backend: InventoryService'de ürün stok kontrolü yapılır
2. Stok < MinStock olduğunda → inventory:low eventi emit edilir
3. Frontend: Socket dinler, Zustand store güncellenir
4. UI: HeroStats'taki sayı artar + kırmızı uyarı + tıklanınca drawer açılır

Drawer İçeriği:
- Ürün adı
- Mevcut stok miktarı
- Minimum stok eşiği
- "Stok Güncelle" butonu (opsiyonel)
```

### 2. Masa Devir Hızı (Table Turnaround)

```
Neden Önemli?
- Yüksek doluluk + düşük devir = "Uzun oturan masalar" (sorun)
- Düşük doluluk + yüksek devir = Sağlıklı operasyon

Metrik:
- Ortalama Masa İşgal Süresi (dk)
- Bugünkü devir sayısı
- Anlık dolu masa / Toplam masa

Socket Event: table:turnaround
```

### 3. Mutfak Yükü (Kitchen Load)

```
Neden Önemli?
- Dashboard'dan mutfağın tıkanıp tıkanmadığı bir bakışta görülmeli
- Kapasite aşımı = Sipariş gecikmeleri = Müşteri şikayetleri

Metrik:
- Preparing sipariş sayısı
- Toplam mutfak kapasitesi (konfigüre edilebilir)
- Yüzdelik yük

Eşik Değerler:
- %0-60: Yeşil (Normal)
- %60-80: Sarı (Dikkat)
- %80+: Kırmızı (Kritik)
```

### 4. Dual-Axis Gelir Grafiği

```
Neden Önemli?
- Sadece gelire bakarak yanılabiliriz
- Az siparişle yüksek ciro mu? Çok siparişle düşük ciro mu?

Grafik Yapısı:
- Sol Y-Axis: Toplam Gelir (TL) - Area/Line
- Sağ Y-Axis: Sipariş Sayısı - Bar/Line
- X-Axis: Tarih (7 gün)

Analiz:
- Sepet Ortalaması = Gelir / Sipariş Sayısı
- Trend karşılaştırması görselleştirilir
```

---

## Test Senaryoları

### Birim Testler (Unit Tests)

1. **useDashboardSocket Hook Testi**
   - Socket bağlantısı doğru kuruluyor mu?
   - join_room/leave_room doğru çağrılıyor mu?
   - Cleanup fonksiyonu socket'i doğru kapatıyor mu?
   - Zustand store fonksiyonları doğru tetikleniyor mu?

2. **Dashboard Store Testi**
   - addRecentOrder() doğru çalışıyor mu?
   - updateKPIs() Manuel artırma doğru mu?
   - setConnectionStatus() state'i güncelliyor mu?

3. **HeroStats Bileşen Testi**
   - API'den gelen veri doğru render ediliyor mu?
   - Loading state görünüyor mu?
   - Kritik stok tıklanması drawer açıyor mu?
   - Masa devir hızı gösteriliyor mu?

4. **KitchenLoadMeter Testi**
   - Yüzdelik hesaplaması doğru mu?
   - Renk eşikleri doğru çalışıyor mu?

5. **RecentOrders Bileşen Testi**
   - Socket event geldiğinde liste güncelleniyor mu?
   - Yeni sipariş en üste ekleniyor mu?

6. **RevenueChart Testi**
   - Dual-axis doğru çiziliyor mu?
   - Veri formatlaması doğru mu?

### Entegrasyon Testleri

7. **API Entegrasyon Testi**
   - `/analytics/summary` endpoint'i doğru çalışıyor mu?
   - `/analytics/hourly-sales` veri döndürüyor mu?
   - `/inventory/critical` kritik stokları getiriyor mu?

8. **Socket Entegrasyon Testi**
   - Gerçek bir sipariş oluşturulduğunda dashboard güncelleniyor mu?
   - Sipariş durumu değiştiğinde UI update oluyor mu?
   - inventory:low eventi doğru tetikleniyor mu?

### E2E Test Senaryoları

9. **Dashboard Akış Testi**
   - Kullanıcı dashboard'a giriyor
   - İlk yükleme API verileri ile oluyor
   - ConnectionStatus yeşil gösteriyor
   - Yeni sipariş oluşturuluyor (farklı bir tarayıcı/tab)
   - Dashboard real-time güncelleniyor (KPI + RecentOrders)
   - Sipariş durumu değiştiriliyor → KitchenLoad güncelleniyor
   - Kritik stok oluşuyor → Drawer açılıyor

10. **Bağlantı Kesilmesi Testi**
    - İnternet kapatılıyor
    - ConnectionStatus kırmızı dönüyor
    - Toast notification görünüyor
    - Internet geri geliyor
    - Otomatik reconnect oluyor
    - ConnectionStatus yeşile dönüyor

---

## Riskler ve Dikkat Edilecekler

1. **Socket Bağlantı Kesilmesi** ✅
   - Reconnection logic eklenecek (socket.io built-in)
   - UI'da bağlantı durumu gösterilecek (ConnectionStatus bileşeni)
   - Toast notification ile kullanıcı bilgilendirilecek
   - **CRITICAL**: RMS için bağlantı kesilmesi operasyonel kriz yaratabilir

2. **Performans** ✅
   - Zustand ile client-side KPI güncellemesi (API tekrarı yok)
   - Büyük sipariş listeleri için pagination veya limit
   - React.memo ile gereksiz re-render'ları önleme
   - Debounce/throttle socket event'leri için

3. **Güvenlik** ✅
   - Socket authentication (JWT token)
   - Restaurant ID validation
   - Backend'de restaurant bazlı yetkilendirme kontrolü

4. **Veri Tutarlılığı** ✅
   - API ve socket verileri arasında senkronizasyon
   - Initial load (API) → Real-time updates (Socket)
   - Conflict resolution: Socket event öncelikli

5. **RMS Operasyonel Kritiklik** ✅
   - Stok biterse mutfak durur → Kritik öncelik
   - Mutfak tıkanırsa sipariş gecikir → Görsel uyarı
   - Masa devir hızı düşükse gelir kaybı → Metrik takibi

---

## Sonraki Adımlar

1. Bu planı review edin
2. Onay sonrası Adım 1 ile başlayalım
3. Backend socket event'lerinin eklenmesi (Adım 4) paralel yapılabilir
4. Her adım tamamlandığında testleri çalıştıralım

---

## Referanslar

- Backend Analytics Controller: `backend/src/modules/analytics/analytics.controller.ts`
- Backend NotificationsGateway: `backend/src/modules/notifications/notifications.gateway.ts`
- Frontend Dashboard Service: `frontend/modules/dashboard/service.ts`
- Web Dashboard Components: `web/modules/dashboard/components/`

---

## Eklenen RMS-Spesifik Özellikler (v2)

| Özellik | Öncelik | Açıklama |
|---------|---------|----------|
| **Inventory Alerts** | 🔴 Kritik | Kritik stok tıklanabilir + drawer |
| **Socket Connection Status** | 🔴 Kritik | Yeşil/kırmızı bağlantı göstergesi |
| **Kitchen Load Meter** | 🟠 Yüksek | Mutfak kapasitesi real-time |
| **Table Turnaround** | 🟠 Yüksek | Masa devir hızı metriği |
| **Dual-Axis Chart** | 🟡 Orta | Gelir + Sipariş karşılaştırması |
| **Zustand Store** | 🟡 Orta | Client-side KPI güncellemesi |
