# Takeaway Alias Deprecation Notu

Geçiş release'inde `takeaway -> counter` alias'ı bilinçli olarak açıktır.

## Takip Kuralı

1. Bir sonraki release öncesi loglarda şu event kontrol edilir:
   - `orders.type_alias.takeaway_to_counter`
2. Eğer **0 istek** görülürse alias kaldırılır.
3. Alias kaldırılacak yerler:
   - `CreateOrderDto` içindeki `takeaway -> counter` transform
   - `OrdersCommandService.create` içindeki alias map + warning log
   - Frontend parse tarafındaki `takeaway -> counter` normalize fallback
   - `OrderType.TAKEAWAY` legacy enum alanı

## Neden

Alias sonsuza kadar açık kalırsa teknik borç oluşturur ve type contract'ı bulanıklaştırır.

