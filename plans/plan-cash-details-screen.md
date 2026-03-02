# Stratejik Plan: Kasa İşlemleri Detay Ekranı Uygulaması (GÜNCELLENDİ)

## Özet
Kullanıcıların geçmiş kasa oturumlarını, bu oturumlardaki tüm hareketleri (satışlar, bahşişler, manuel giriş/çıkışlar) ve finansal özetleri detaylı bir şekilde görebileceği bir "Kasa İşlemleri Detay Ekranı" geliştirilmesi planlanmaktadır. Bu ekran, kasa mutabakatlarını kontrol etmek ve finansal şeffaflığı artırmak için kritik öneme sahiptir.

## Etkilenecek Dosyalar

### Backend (NestJS)
- `src/modules/cash/cash.service.ts`: Oturum geçmişi (pagination dahil) ve detayları için mantık güncellenmesi.
- `src/modules/cash/cash.controller.ts`: Pagination destekli geçmiş uç noktası.
- `src/modules/cash/dto/get-session-history.dto.ts`: `page`, `limit` ve tarih filtrelerinin eklenmesi.
- `src/modules/payments/payments.service.ts`: İptal/İade durumlarında kasa hareketlerinin terslenmesi mantığı.

### Frontend Web (Next.js)
- `web/modules/cash/services.ts`: Pagination destekli `getSessionHistory` ve `getSessionDetail` API çağrıları.
- `web/modules/cash/types.ts`: Yeni veri yapıları ve Pagination tipleri.
- `web/app/(main)/cash/history/page.tsx`: Kasa geçmişi listeleme sayfası (Pagination bileşeni ile).
- `web/app/(main)/cash/sessions/[id]/page.tsx`: Detay sayfası ve PDF Export butonu.
- `web/modules/cash/components/SessionHistoryTable.tsx`: Sayfalamayı destekleyen tablo.
- `web/modules/cash/components/SessionMovementTable.tsx`: Hareket listesi.
- `web/modules/cash/components/SessionFinancialSummary.tsx`: Finansal özet kartları.

## Adım Adım Değişiklikler

### 1. Backend Geliştirmeleri
- **Pagination:** `getSessionHistory` metoduna `TypeORM` QueryBuilder kullanılarak `skip` ve `take` (page/limit) mantığı eklenecek. Toplam kayıt sayısı (`total`) da dönecek.
- **İptal/İade Mantığı:** 
    - İptal edilen siparişler veya iade edilen ödemeler, beklenen bakiye hesabına **dahil edilmeyecek**.
    - Eğer bir ödeme iptal edilirse, kasa hareketlerinde bu işlem "CANCELLED" olarak işaretlenecek veya ters hareket (OUT) oluşturulacak. `getSessionSummary` sadece aktif (iptal edilmemiş) hareketleri toplayacak.
- **Detaylı Kırılım:** `getSessionSummary` metoduna ödeme yöntemlerine göre (Nakit, Kredi Kartı, Yemek Çeki vb.) net tutarlar eklenecek.

### 2. Frontend Servis Katmanı
- `web/modules/cash/services.ts` dosyasına pagination parametrelerini alan metodlar eklenecek.
- `web/modules/cash/types.ts` dosyasına `PaginatedResponse<T>` ve `CashSessionDetail` arayüzleri eklenecek.

### 3. UI Bileşenlerinin Oluşturulması
- **SessionHistoryTable:** Sayfalama kontrolleri (Previous/Next/Page Numbers) eklenecek.
- **SessionMovementTable:** İptal edilen işlemlerin üstü çizili veya farklı renkte gösterilmesi sağlanacak.
- **Export İşlevi:** `jsPDF` veya benzeri bir kütüphane (veya basitçe `window.print()` için optimize edilmiş CSS) kullanılarak "Kasa Mutabakat Raporu (PDF)" oluşturma özelliği eklenecek.

### 4. Sayfa Yapılandırması
- `/cash/history`: Filtreleme ve sayfalama destekli liste.
- `/cash/sessions/[id]`: Detaylar, hareketler ve **Yazdır/Dışa Aktar** butonu.

### 5. Navigasyon ve Entegrasyon
- Kasa yönetim panelinde "Geçmiş İşlemler" sekmesi/butonu.
- Kasa kapatma sonrası detay ekranına yönlendirme.

## Test Senaryoları

1. **Pagination Testi:** Sayfa değiştirildiğinde doğru verilerin geldiğinin ve `total` sayısının tutarlılığının doğrulanması.
2. **İptal İşlemi Testi:** Bir ödeme iptal edildiğinde, kasa oturumundaki "Beklenen Bakiye"nin anlık olarak güncellendiğinin ve iptal edilen tutarın düşüldüğünün doğrulanması.
3. **PDF Export Testi:** İndirilen PDF dosyasının tüm finansal özeti ve hareketleri okunabilir bir formatta içerdiğinin kontrolü.
4. **Tarih Filtresi:** Belirli bir tarih aralığı seçildiğinde sadece o aralıktaki oturumların listelendiğinin doğrulanması.
5. **Büyük Veri Seti:** 100+ oturum olduğunda sayfalama performansının kontrolü.
