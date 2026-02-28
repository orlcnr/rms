---
trigger: glob
---

# Page Module Design & Layout Rules (page-modul-design-rules.md)

## 1. GİRİŞ VE STRATEJİ
Bu doküman, RMS (Restaurant Management System) içerisindeki tüm modül sayfalarının görsel hiyerarşisini ve yapısal düzenini tanımlar. Temel amaç, 10+ saat ekran başında kalan personel için göz yorgunluğunu minimize etmek ve tüm sistemde sarsılmaz bir tutarlılık sağlamaktır.

**ÖNEMLİ:** Bu kurallar uygulanırken `rms-core-rules.md`, `rms-design-tokens-rules.md` ve `rms-design-rules.md` dosyalarındaki token tanımlamaları (`bg-bg-app`, `border-border-light` vb.) harfiyen kullanılmalıdır.

## 2. GLOBAL HİZALAMA KURALLARI (ALIGNMENT)
Tüm modül içerikleri şu dikey akslara sadık kalmalıdır:
- **Sabit Kenar Hizalaması (Full-Width Alignment):** Body ve Filter alanları, sayfa üst başlığı (`SubHeaderSection`) ve global header ile sağdan ve soldan **birebir, milimetrik aynı hizada** başlayıp bitmelidir.
- **KESİN KURAL (No Extra Margins):** Modüllerin içindeki ana `<main>` veya wrapper elementlerine asla `mx-layout`, `px-layout`, `m-4` gibi ekstra iç/dış boşluklar **YAZILMAMALIDIR**. Ana `layout.tsx` zaten genel hizalamayı yapmaktadır; oluşturduğunuz yapılar sayfaya tam oturacak şekilde (`className="flex flex-col flex-1 pb-6 min-h-0"`) kurgulanmalıdır. Tolerans, fazladan margin bırakmak KESİNLİKLE YASAKTIR.

## 3. MODÜL SAYFA KATMANLARI (SECTION HIERARCHY)
Tüm sayfalar yukarıdan aşağıya şu shared bileşen yapısıyla kurulmalıdır:

### 3.1. SubHeaderSection (Sayfa Kimliği)
- **Zemin:** Sayfa zemini ile aynı (`bg-bg-app`). Çerçeve (border) içermez.
- **Sol Panel:** 
    - **ModuleBrand:** Başlığın hemen solunda, modüle özgü renkte dikey bir çizgi (`w-1.5 h-8 rounded-full`).
    - `h1`: Modül ismi (Uppercase, font-black, tracking-tight).
    - `p`: Modül açıklaması (text-text-muted, text-sm, font-bold).
    - **ConnectionLine:** En başta bir Refresh iconu, yanında `animate-ping` efektli yeşil/kırmızı bir LED ve "Socket Bağlantısı Aktif/Pasif" metni.
- **Sağ Panel:** Sayfa aksiyon butonları (`Button` bileşenleri).

### 3.2. FilterSection (İşlem Alanı ve Özetler)
- **Zemin:** Saf beyaz (`bg-bg-surface`).
- **Stil:** `border-t border-x border-border-light`, `rounded-t-sm`.
- **Standart Bileşenler:** Arama çubuğu (Search), Filtreleme tipleri ve İstatistik (Özet) tablosu.
- **Standart Dizilim (Hizalama):** 
    - **Sol Alan:** Sabit bir arama kutusu (`400px` w). Saf native input veya iconlu özel kutu ile, daima büyük harf ('uppercase text-[11px] font-black tracking-wider').
    - **Özet Sağ Alan (Stats Summary):** Kapsamın sağ köşesinde, ilgili sayfanın özet detayları yer alır. 
        - Tarih gösterimi (Turuncu vurgulu).
        - "Günün Özeti" etiketi ve Socket Bağlantı Ledi (`bg-success-main animate-pulse`).
        - Dikey çizgiler (`border-r border-border-light`) ile birbirine ayrılmış veri panelleri (Toplam Sipariş, Boş Masa vb.). İnce, sıkışık ancak tam hizalı tabular-nums ile rakamlar yer almalıdır.

### 3.3. BodySection (Veri Alanı)
- **Zemin:** Saf beyaz (`bg-bg-surface`).
- **Stil:** `border border-border-light`, `rounded-b-sm`.
- **Kapsam:** Eğer üstte FilterSection varsa, iki bölüm görsel olarak birleşerek tek bir "Beyaz Kart" görünümü oluşturmalıdır.
- **Yükseklik (Full Height):** Beyaz kart, ekranın alt sınırına kadar uzanmalı ve sayfa scroll'u yerine kart içi scroll kullanılmalıdır. Bu, personelin sürekli değişen veri setlerinde header'ı kaybetmemesini sağlar.
- **İçerik:** Tablo, Grid veya Liste verileri burada yer alır.

## 4. MODÜL RENK PALETİ (MODULE COLORS)
Her modül için tutarlı bir marka rengi kullanılmalıdır:
- **Dashboard:** `bg-blue-500`
- **Operasyonlar:** `bg-purple-500`
- **Siparişler:** `bg-success-main`
- **Kasa:** `bg-warning-main`
- **Rezervasyonlar:** `bg-orange-500`
- **Masa Yönetimi:** `bg-cyan-500`
- **Envanter:** `bg-slate-500`
- **Ürünler:** `bg-rose-500`
- **Müşteriler:** `bg-teal-500`
- **Ayarlar:** `bg-primary-main`

## 5. SIDEBAR (ICONIZER) STANDARTLARI

- **Iconizer Modu:** Sidebar varsayılan olarak dardır (`w-20`).
- **Hover:** Iconların üzerine gelindiğinde Tooltip veya sağa açılan etiket ile isimler gözükür.
- **Aktif Durum:** Mevcut sayfa iconu `border-l-4 border-primary-main` ile işaretlenir.

## 5. TASARIM TOKENLARI TABLOSU

| Katman | Renk Tokenı | Border Tokenı | Padding (8px Scale) |
| :--- | :--- | :--- | :--- |
| Sayfa Genel | `bg-bg-app` | - | `px-layout` (Custom) |
| SubHeader | `bg-bg-app` | none | `py-6` |
| Filter Area | `bg-bg-surface` | `border-border-light` | `p-4` |
| Body Area | `bg-bg-surface` | `border-border-light` | `p-6` |
| Status LED | `bg-success-main` | - | `w-2 h-2` |

## 6. ÖRNEK KOD YAPISI (IMPLEMENTATION)
Aşağıdaki yapı her yeni modülün ana iskeletini oluşturur:

```tsx
// web/modules/[module]/components/ModuleClient.tsx
import { SubHeaderSection, FilterSection, BodySection } from '@/modules/shared/components/layout'

export function ModuleClient() {
  return (
    <div className="flex flex-col min-h-screen bg-bg-app">
      <SubHeaderSection 
        title="REZERVASYONLAR"
        description="Müşteri rezervasyonları ve masa yönetimi"
        actions={<Button variant="primary">YENİ EKLE</Button>}
      />
      
      <main className="flex flex-col flex-1 pb-6 min-h-0">
        <FilterSection>
          {/* Arama ve Filtreleme Bileşenleri */}
          <div className="flex gap-4">
            <FormInput id="search" placeholder="Ara..." />
            <DateTimePicker showTime={false} />
          </div>
        </FilterSection>

        <BodySection>
          {/* Ana Liste veya Tablo */}
          <ReservationTable />
        </BodySection>
      </main>

      <footer className="mt-auto bg-bg-surface border-t border-border-light p-4">
        {/* Footer İçeriği */}
      </footer>
    </div>
  )
}
```

## 7. VERİ İLETİŞİM VE BÜTÜNLÜK KURALLARI (HYBRID MODEL)

Tüm kritik modüller (Orders, Payment, Cash, Reservations) aşağıdaki iletişim protokolüne uymak zorundadır:

### 7.1. HTTP API (Write Operations)
- **Kapsam:** Create, Update, Delete işlemleri.
- **Zorunluluk (Idempotency):** Her istek bir `transaction_id` (UUID v4) içermelidir. Bu ID **daima Frontend tarafında üretilmeli** ve istekle beraber gönderilmelidir.
- **Update Stratejileri:**
    - **Optimistic (Sipariş Durumu vb.):** HTTP öncesi local state güncellenir. Başarısızlıkta rollback yapılır.
    - **Pessimistic (Ödeme vb.):** Sadece HTTP 200 OK sonrası local state güncellenir.
- **Socket Suppression:** Kendi yaptığımız HTTP write işlemi sonrası gelen socket event'i, `transaction_id` kontrolü ile yoksayılmalıdır (Mükerrer update'i önlemek için).
- **Offline Queue:** Bağlantı yokken yapılan istekler bir kuyruğa alınmalı ve bağlantı geldiğinde otomatik olarak yeniden denenmelidir.
- **UI:** İşlem sırasında formlar Read-Only hale getirilmeli, butonlar ise component bazlı (sadece ilgili kart) veya modül bazlı disable edilmelidir.

### 7.2. WebSockets (Read/Notification Operations)
- **Kapsam:** Real-time liste güncellemeleri ve bildirimler.
- **Reconnect Stratejisi & Silent Revalidation:** "Her yeşil ışık yandığında veriyi bir kez tazele." Soket bağlantısı tekrar kurulduğunda, aktif modülün verileri **Sessizce (Silent)** arka planda refetch edilmelidir.
- **Zorunluluk:** Soket koptuğunda sistem otomatik olarak "Offline Mode" uyarısı vermeli, ancak son okunan verileri göstermeye devam etmelidir.

### 7.3. Akıllı LED Durumları (Sync Indicator)
| LED Rengi | Durum | Açıklama |
| :--- | :--- | :--- |
| **Yeşil** | `CONNECTED` | Soket bağlı, bekleyen işlem yok. |
| **Sarı (Animasyonlu)** | `SYNCING` | HTTP isteği yapıldı, cevap bekleniyor. LED üzerinde "Veri sunucuya yazılıyor..." tooltip'i gösterilmelidir. Bekleyen offline işlem varsa "X işlem bekliyor" badge'i eklenmelidir. |
| **Kırmızı** | `DISCONNECTED` | Soket bağlantısı yok, veri güncelliği garanti edilemez. |

## 8. ZAMAN TUTARLILIĞI (TIME CONSISTENCY)

Sistemdeki tarih ve saat karmaşasını önlemek için şu teknik kurallara uyulmalıdır:

- **Server-Client Senkronizasyonu:** Uygulama ayağa kalkarken `SystemSync` bileşeni üzerinden sunucu saatiyle senkronize olmalı ve `serverOffset` değerini hesaplamalıdır.
- **Kayıt Stratejisi:** Formlardan gönderilen tüm zaman damgaları (timestamp) UTC ISO formatında (`new Date().toISOString()`) gönderilmelidir.
- **Filtreleme:** "Bugün" (Today) veya belirli bir günün verisi istenirken `toLocaleDateString('sv-SE')` formatı (YYYY-MM-DD) ve `getNow()` utility fonksiyonu kullanılmalıdır.
- **Görüntüleme:** Kullanıcıya gösterilen tüm zamanlar `Intl.DateTimeFormat` ile yerel saat dilimine ve `tr-TR` lokaline uygun formatlanmalıdır.

## 8. ORDERS KANBAN RULES (SİPARİŞ YÖNETİMİ)
Sipariş modülünde kullanılacak Kanban yapıları aşağıdaki katı kurallara tabidir:
- **Card Density (Kart Yoğunluğu):** Her kanban sütunu, en az 5 kartı scroll (kaydırma) işlemine gerek kalmadan gösterebilecek kadar kompakt (Dense Mode) olmalıdır. Gereksiz padding'lerden kaçınılmalıdır.
- **Real-time Sync (Canlı Geçişler):** Başka bir terminalden veya cihazdan sipariş durumu değiştiğinde, kartın yeni sütununa anında "sıfırlanarak" belirmesi yerine layout-animation (Framer Motion veya benzeri) araçlarla yumuşak bir geçiş yapması sağlanmalıdır.
- **Timezone Strictness (Zaman Kesinliği):** Kartlar üzerinde veya listelerde yazan "5 dk önce" gibi izafi (relative) ifadeler, lokal saatle `new Date()` yazılarak ASLA hesaplanmamalı; daima global `getNow()` utility fonksiyonu üzerinden (Sunucu destekli) hesaplanmalıdır.

---

**KRİTİK UYARI:** Tasarımı yaparken asla Gradients (Gradyan), Neon Renkler veya Dekoratif Animasyonlar kullanma. Kurumsal bir ERP sistemi ciddiyetinde, `rms-core-rules.md` dosyasındaki "High Data Density" (Yüksek Veri Yoğunluğu) prensibine sadık kal.