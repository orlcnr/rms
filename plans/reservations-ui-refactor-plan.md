Reservations UI Refactor Plan

Amaç

Rezervasyon modülünü, ürün modülüyle aynı elden çıkmış hissi veren, tasarım standartlarına uyumlu ve bakımı kolay bir yapıya dönüştürmek.
İşlevselliği bozmadan, Shared UI bileşenlerini (FormInput, FormSection, ReservationModal, ReservationCard vb.) merkezileştiren ve design tokens ile uyumlu bir görünüm sağlayan bir refactor gerçekleştirmek.
Multi-tenancy (restaurantId) korunarak backend entegrasyonları ile sorunsuz çalışır hale getirmek.
Kapsam ve hedefler

Frontend
Web rezervasyon modülü: types.ts, validations/reservation.schema.ts, services/reservations.service.ts, store/reservations.store.ts, hooks/useReservations.ts, hooks/useReservationSelectors.ts, hooks/useReservationConflicts.ts, components/ReservationModal.tsx, ReservationClient.tsx, ReservationCard.tsx, view bileşenleri (WeeklyView, MonthlyView, AgendaView), utils/date-utils.ts ve utils/reservation.utils.ts, page.tsx ve Sidebar entegrasyonu.
Tasarım tokenları ve shared bileşenlerle tam uyum; gradients, neon renkler, dekoratif animasyonlardan kaçınma.
Çoklu-tenancy: restaurantId’nin her adımda doğru kullanımı ve güvenli state yönetimi.
Backend
Mevcut rezervasyon API uç noktalarını kullanımda tutma; frontend ile uyumlu veri şekillerinin korunması.
Zod/validation entegrasyonu için client-side uyumlu yapılandırma.
Teslimat kriterleri
UI görünümü ürün modülündeki estetikle uyumlu; aynı typography, spacing ve tokenlar kullanılıyor.
Rezervasyon akışında loop problemi yok; sayfa yükleme ve veri fetch süreçleri stabil çalışıyor.
Çakışma kontrolü, validation ve optimistic update akışları korunuyor veya iyileştiriliyor.
Responsive davranışlar güncel tasarım standardına uygun.
Planın aşamaları (adım adım)

Tipler ve validation
web/modules/reservations/types.ts ve validations/reservation.schema.ts oluşturulacak/uygun hale getirilecek.
API katmanı
web/modules/reservations/services/reservations.service.ts mevcut uç noktalarını kullanacak şekilde yapılandırılacak; Get/Incre/değişiklik uç noktaları uyumlu olacak.
State yönetimi
web/modules/reservations/store/reservations.store.ts: Zustand tabanlı global state kurulumu veya güncellenmesi; selectors ve optimistic updates için yapılandırma.
Optimistic updates ve hooklar
web/modules/reservations/hooks/useReservations.ts, useReservationSelectors.ts, useReservationConflicts.ts ile optimistic akışları, conflict kontrolünü ve hesaplanan görünümleri yönetecek.
UI bileşenleri
ReservationModal.tsx: Form yönetimi için react-hook-form + Zod entegrasyonu, conflict kontrolü için useReservationConflicts, shared FormInput/FormSection ile uyum.
ReservationCard.tsx: Optimistic güncellemeyi yansıtan kart ve durum gösterimi.
ReservationClient.tsx: Ana rezervasyon görünümü ve modal tetikleyicileri.
WeeklyView.tsx, MonthlyView.tsx, AgendaView.tsx: mevcut Web mimarisine uygun şekilde bileşenler.
Yardımcı util’ler
web/modules/reservations/utils/date-utils.ts ile tarih biçimlendirme; reservation.utils.ts ile conflict hesapları ve zaman hesaplama yardımcıları.
View ve sayfa entegrasyonu
web/app/(main)/reservations/page.tsx ve ilgili route entegrasyonu.
Sidebar ve tablo entegrasyonu
web/modules/shared/components/Sidebar.tsx’a Rezervasyonlar menüsü eklenmesi.
dashboard ve tables modüllerinde rezervasyon uyarısı entegrasyonu için gerekli noktaların güncellenmesi.
Tasarım uyumu ve token kullanımı
rms-design-rules.md ile uyumlu renk/spacing/typography kullanımı; gradient ve dekoratif öğelerin kaldırılması ya da tokenlar üzerinden kontrol edilmesi.
Test senaryoları ve doğrulama
Rezervasyon oluşturma, çakışma kontrolü, güncelleme (optimistic update), görünüm geçişleri ve responsive davranışlar için test senaryoları oluşturulup uygulanması.
Dağıtım ve geri dönüş planı
Küçük bir feature branch üzerinde değişiklikleri izole etmek; entegrasyon ve manuel testlerle doğrulama.
Hata giderme ve risk yönetimi
Loop sorununu tetikleyen bağımlılıkları inceleyip, fetch/onChange/route değişikliklerinde gereksiz tekrarı önlemek.
Versiyonlama ve dokümantasyon
Değişikliklerin dokümantasyonu ve planlandığı şekilde plan dosyasının güncellenmesi.
Kabul kriterleri (success criteria)

Rezervasyon sayfası, Shared UI bileşenleri ve design tokens ile uyumlu bir görünüme sahip.
Yükleme ve veri fetch güvenilir; sayfa girildiğinde loop oluşmuyor.
Formlar validation ve error stateleri rms-design-rules’a uygun.
Çakışma kontrolü frontend tarafında düzgün çalışıyor; backend tarafı ile uyumlu ve güvenli.
Optimistic updates güvenli ve rollback mekanizması düzgün çalışıyor.
Multi-tenancy (restaurantId) doğru şekilde kullanılıyor ve güvenli.
