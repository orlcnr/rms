# Tam Mutabakat Raporu (Reconciliation Report) Uygulama Planı - [Güncellendi]

Bu plan, restoran yöneticileri için gün sonu mutabakat süreçlerini otomatize eden, detaylı "kar/zarar/fark" analizi sunan ve tüm tarih işlemlerini `Europe/Istanbul` saat dilimiyle senkronize eden raporlama özelliğinin eklenmesini kapsar.

## Temel Gereksinimler

1. **Dönem Bilgileri**: Oturum açılış/kapanış zamanları, personel ve kasa bilgisi.
2. **Satış Gruplandırma**: Nakit, POS ve Yemek Çeki bazlı ayrım.
3. **Bahşiş Yönetimi**: Tip komisyon oranı ayarlarını (`tip_commission_rate`) kullanarak net bahşiş hesabı.
4. **Fark Analizi (Over/Short)**: Sistemdeki beklenen nakit ile fiziki nakit karşılaştırması.
5. **Güvenlik**: Cross-tenant (restaurantId) doğrulaması.
6. **Timezone Senkronizasyonu**:
   - `getNow()` fonksiyonu ile merkezi zaman yönetimi.
   - DB sorgularında `AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul'` kullanımı.

## Yapılacak Değişiklikler

### 1. Ortak Bileşenler (Common Utilities)
- `backend/src/common/utils/date.utils.ts` dosyası oluşturuldu.
- `getNow()` ve `getIstanbulToday()` fonksiyonları eklendi.

### 2. Payment Modülü
- `PaymentMethod` enum'una `MEAL_VOUCHER` eklenecek.

### 3. Cash Modülü DTO
- `ReconciliationReportDto` oluşturulacak:
  - `sessionOpenedAt`, `sessionClosedAt`, `openedBy`, `closedBy`, `cashRegisterName`
  - `openingBalance`, `totalGrossSales`, `voidedSales`
  - `salesByMethod`, `totalTip`, `tipCommission`, `netTip`
  - `expectedCash`, `actualCash`, `difference`, `netBankAmount`, `movementCount`

### 4. Cash Service
- `SettingsService` enjekte edilecek.
- `getReconciliationReport` metodu eklenecek:
  - `expectedCash` hesabında `MEAL_VOUCHER` nakit bakiyeden hariç tutulacak.
  - Tip komisyonu dinamik olarak ayarlardan çekilecek.
  - İptal edilen satışlar (`voidedSales`) raporlanacak.
  - Tüm `new Date()` çağrıları `getNow()` ile değiştirilecek.

### 5. Cash Controller
- `GET /cash/sessions/:sessionId/reconciliation` endpoint'i eklenecek.
- Kullanıcının `restaurantId` bilgisi ile yetki kontrolü yapılacak.

## Test Senaryoları
- [ ] **Sıfır Hareketi Olan Oturum**: Sadece açılış bakiyesi görünmeli.
- [ ] **Sadece Kredi Kartı**: `expectedCash` = `openingBalance` doğrulanmalı.
- [ ] **Fark Senaryoları**: Kasa açığı (short) ve fazlası (over) durumları.
- [ ] **Timezone Doğrulama**: Sunucu UTC olsa bile raporun İstanbul saatine göre doğru gün/saat dönmesi.
