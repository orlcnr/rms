Modülerlik: Her yeni özellik src/modules/ altında kendi klasöründe; controller, service, module, dto ve entities alt klasörleriyle oluşturulmalıdır.

DTO Kullanımı: Request gövdeleri için mutlaka class-validator içeren DTO'lar kullanılmalıdır.

Entity: Veritabanı modelleri entities/ klasöründe tutulmalı, modül dışına doğrudan sızdırılmamalıdır.

Hata Yönetimi: Standart Nest.js HttpException sınıfları kullanılmalı, global bir exception.filter ile tutarlı hale getirilmelidir.