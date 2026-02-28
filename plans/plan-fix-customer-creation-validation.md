# Plan: Fix Customer Creation Validation Error

## Özet

Frontend'de ödeme sırasında yeni müşteri oluşturulurken `restaurant_id` alanı gönderiliyor ancak backend'in `CreateCustomerDto`'sı bu alanı kabul etmiyor. Backend zaten kullanıcı bilgisinden (`@GetUser()`) `restaurant_id`'yi alıyor. Çözüm: frontend'den gereksiz `restaurant_id` gönderimini kaldırmak.

## Etkilenecek Dosyalar

| Dosya | Değişiklik Türü |
|-------|-----------------|
| `web/modules/orders/hooks/usePaymentModal.ts` | Düzeltme |

## Mevcut Durum (Sorunlu Kod)

**Dosya:** `web/modules/orders/hooks/usePaymentModal.ts` (Satır 37-42)

```typescript
const newCustomer = await customersApi.create({
  first_name: firstName,
  last_name: lastName,
  phone: tempPhone,
  restaurant_id: restaurantId, // Required for multi-tenant support
});
```

**Backend Controller:** `backend/src/modules/customers/customers.controller.ts` (Satır 31-32)

```typescript
create(@Body() createCustomerDto: CreateCustomerDto, @GetUser() user: User) {
  return this.customersService.create(createCustomerDto, user.restaurant_id);
}
```

**Sorun:** Backend `restaurant_id`'yi DTO'dan değil, authenticated kullanıcıdan alıyor. Frontend gereksiz yere gönderiyor ve DTO whitelist validation hatası veriyor.

## Adım Adım Değişiklikler

### 1. Frontend'den restaurant_id Kaldır

**Dosya:** `web/modules/orders/hooks/usePaymentModal.ts`

**Değişiklik:** `restaurant_id` alanını customer creation payload'ından kaldır.

**Önceki hali:**
```typescript
const newCustomer = await customersApi.create({
  first_name: firstName,
  last_name: lastName,
  phone: tempPhone,
  restaurant_id: restaurantId,
});
```

**Sonraki hali:**
```typescript
const newCustomer = await customersApi.create({
  first_name: firstName,
  last_name: lastName,
  phone: tempPhone,
});
```

## Test Senaryoları

### Manuel Test
1. POS ekranında "Açık Hesap" ödeme yöntemi seç
2. Yeni müşteri ekle butonuna tıkla
3. Müşteri adı gir ve kaydet
4. Müşterinin başarıyla oluşturulduğunu doğrula
5. Ödemeyi tamamla ve işlemin başarılı olduğunu kontrol et

### API Test
```bash
# Doğrudan API çağrısı ile test
curl -X POST http://localhost:3001/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"first_name":"Test","last_name":"User","phone":"5551234567"}'
```
Başarılı yanıt bekleniyor.

## Notlar

- Backend zaten multi-tenant yapıyı `@GetUser()` decorator üzerinden yönetiyor
- Frontend'in `restaurant_id` göndermesi gereksiz ve hataya neden oluyor
- Aynı düzeltmeyi başka yerlerde de kontrol etmek faydalı olabilir
