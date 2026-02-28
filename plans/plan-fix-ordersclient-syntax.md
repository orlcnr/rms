# Plan: Fix Unterminated RegExp Literal in OrdersClient.tsx

## Özet

`web/modules/orders/components/OrdersClient.tsx` dosyasında 58. satırda düzgün kapatılmamış bir yorum bloğu (`*/`) bulunmaktadır. Bu syntax hatası, Next.js uygulamasının derlenmesini engellemektedir. Hatanın çözümü için 58. satırdaki gereksiz yorum kapatma işaretinin kaldırılması gerekmektedir.

## Etkilenecek Dosyalar

| Dosya | Değişiklik Türü |
|-------|-----------------|
| `web/modules/orders/components/OrdersClient.tsx` | Düzeltme |

## Mevcut Durum (Sorunlu Kod)

```typescript
// Satır 57-60
if (!hook.mounted) return null

    */
    <div
      className="flex flex-col bg-bg-surface overflow-hidden"
```

**Sorun:** 58. satırda `*/` yorum kapatma işareti var ancak açılış işareti (`/*`) bulunmuyor. Bu, "Unterminated regexp literal" hatasına neden oluyor.

## Adım Adım Değişiklikler

### 1. Düzeltme (Tek Adım)

**Dosya:** `web/modules/orders/components/OrdersClient.tsx`

**Değişiklik:** 58. satırdaki gereksiz `*/` karakterlerini kaldır.

**Önceki hali (satır 57-60):**
```typescript
if (!hook.mounted) return null

    */
    <div
```

**Sonraki hali (satır 57-60):**
```typescript
if (!hook.mounted) return null

    <div
```

## Test Senaryoları

### Manuel Test
1. `npm run dev` komutu ile Next.js geliştirme sunucusunu başlat
2. Tarayıcıda `/orders` sayfasına git
3. Sayfanın hatasız yüklendiğini doğrula
4. Ürün arama, kategori seçimi, sepete ekleme işlevlerini test et

### Build Test
```bash
cd web
npm run build
```
Build işleminin başarılı olması bekleniyor.

### Lint Test
```bash
cd web
npm run lint
```
Herhangi bir lint hatası olmamalıdır.

## Notlar

- Bu hata muhtemelen bir refactoring veya kopyalama işlemi sırasında yanlışlıkla eklenmiş.
- Düzenli olarak lint ve type-check çalıştırarak bu tür syntax hataları erken tespit edilebilir.
