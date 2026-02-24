# Schema Organization Migration

Bu klasör PostgreSQL schema organizasyonu için migration dosyalarını içerir.

## Schema Yapısı

- **business**: Temel iş verileri (users, restaurants, orders, tables, menus, reservations)
- **operations**: Operasyonel veriler (inventory, cash, payments)
- **public_api**: Public-facing API verileri (guest orders)
- **infrastructure**: Altyapı verileri (notifications)

## Migration Sırası

Migration'lar şu sırayla çalıştırılmalıdır:

1. `001-create-schemas.ts` - Schema'ları oluşturur
2. `002-move-business-tables.ts` - Business tablolarını taşır
3. `003-move-operations-tables.ts` - Operations tablolarını taşır
4. `004-move-public-api-tables.ts` - Public API tablolarını taşır
5. `005-move-infrastructure-tables.ts` - Infrastructure tablolarını taşır

## Çalıştırma

```bash
# Test ortamında
npm run typeorm migration:run -- -d src/database/data-source.ts

# Production'da
npm run typeorm migration:run -- -d src/database/data-source.ts
```

## Geri Alma

```bash
npm run typeorm migration:revert -- -d src/database/data-source.ts
```

## Önemli Notlar

- Migration'ları çalıştırmadan önce **mutlaka backup alın**
- Test ortamında deneyin
- Foreign key'ler otomatik olarak cross-schema çalışır
- Search path: `business,operations,public_api,infrastructure,public`
