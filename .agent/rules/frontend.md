App Router: app/ klasörü sadece sayfa yapısı (routing) ve layout için kullanılmalıdır.

İş Mantığı: İş mantığı ve karmaşık componentler modules/ klasöründe (örneğin: modules/inventory/components) tutulmalıdır.

Service Katmanı: API çağrıları için her modülün kendi service.ts dosyası olmalı (Görselde inventory modülünde olduğu gibi).

Validation: Form yönetimi için Zod veya benzeri şema tabanlı doğrulayıcılar kullanılmalıdır.