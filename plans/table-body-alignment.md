# Table Body Alignment and Area Tabs

## Hedefler
- Body alanının sol ve sağ hizalamasının sayfa başlığı (`SubHeaderSection`) ile tam örtüşmesinin sağlanması.
- `page-modul-design-rules.md` dosyasına Body hizalama kurallarının eklenerek standartlaştırılması.
- Masa Yönetimi ekranında Operasyon modu pasifken (Yani "Yönetici" modundayken) butonların çıkması ancak aktifken ("Operasyon" modu) Alan adlarının yanında düzenleme (kalem) butonlarının görünmesi/gizlenmesi kuralının uygulanması.
- Masa (TableCard) içerisindeki isim ve fiyat bilgisinin (dolu olsa bile) siyah düz renkte kalması.

## İşlem Adımları
- [x] Body Alanı Hizalaması: `TablesClient.tsx` içerisinde `main` etiketindeki fazladan `mx-layout` margininin silinerek yerine tam genişlik verilmesi.
- [x] Tasarım Kuralları Belgesi (`page-modul-design-rules.md`) Güncellemesi: Yeni oluşturulacak modüllerde Body alanının sağ/sol toleransları olmadan (padding/margin olmadan) %100 kapsayıcı içinde header ile aynı boyutta konumlandırılacağının dokümanlara eklenmesi.
- [x] AreaTabs.tsx (Salon Sekmeleri) Güncellemesi: `isAdminMode` değişkeni yardımıyla sekme içi ekle (Plus) ikonunun gizlenmesi ancak sekmelerin gösterilmesi sağlandı.
- [x] TableCard.tsx Güncellemesi: Siyah dolgu prensibine uygun olarak dolu bir msada yazan kırmızı Fiyat ve İsim metni (Danger color) standart siyah (`text-text-primary`) yazı paletine çevrildi.
