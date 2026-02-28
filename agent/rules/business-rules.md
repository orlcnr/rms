# Business Rules - İş Kuralları

Bu doküman, RESTAU-RMS projesindeki iş kuralı (business rule) sisteminin nasıl çalıştığını açıklar.

## Genel Bakış

Proje, **Strategy Pattern** kullanarak esnek ve genişletilebilir bir iş kuralı sistemi içerir. Bu sistem sayesinde:

- Her restoran kendi iş kurallarını yapılandırabilir
- Kurallar veritabanında tutulur ve dinamik olarak etkinleştirilebilir/devre dışı bırakılabilir
- Yeni kural tipleri kolayca eklenebilir

## Mevcut Kural Kategorileri

| Kategori | Açıklama | Modül |
|----------|-----------|-------|
| `CASH` | Kasa işlemleri ile ilgili kurallar | [`cash-rule.evaluator.ts`](backend/src/modules/rules/evaluators/cash-rule.evaluator.ts) |
| `ORDER` | Sipariş işlemleri ile ilgili kurallar | [`order-rule.evaluator.ts`](backend/src/modules/rules/evaluators/order-rule.evaluator.ts) |
| `INVENTORY` | Stok/Malzeme işlemleri ile ilgili kurallar | [`inventory-rule.evaluator.ts`](backend/src/modules/rules/evaluators/inventory-rule.evaluator.ts) |
| `MENU` | Menü/Ürün işlemleri ile ilgili kurallar | [`menu-rule.evaluator.ts`](backend/src/modules/rules/evaluators/menu-rule.evaluator.ts) |
| `SYSTEM` | Sistem seviyesi kurallar | Gelecekte eklenecek |

## Mevcut Kurallar

### CASH Kuralları

| Key | Açıklama | Default |
|-----|----------|---------|
| `CASH_CHECK_OPEN_TABLES` | Kasayı kapatırken açık masa kontrolü yapar | Aktif |

### ORDER Kuralları

| Key | Açıklama | Default |
|-----|----------|---------|
| `ORDER_MANDATORY_TABLE` | Paket servis dışındaki siparişlerde masa seçimi zorunludur | Pasif |
| `ORDER_PREVENT_VOID` | Hazırlık aşamasına geçmiş siparişlerin iptalini engeller | Aktif |

### INVENTORY Kuralları

| Key | Açıklama | Default |
|-----|----------|---------|
| `INVENTORY_PREVENT_DELETE` | Stok hareketi olan malzemelerin silinmesini engeller | Aktif |
| `INVENTORY_LOW_STOCK_ALERT` | Düşük stok uyarısı (henüz implementasyonu yok) | - |

### MENU Kuralları

| Key | Açıklama | Default |
|-----|----------|---------|
| `MENU_PREVENT_DELETE_ITEM` | Stok 0, aktif siparişte yok ve satışta değilse ürün silinebilir | Aktif |
| `MENU_PREVENT_DELETE_CATEGORY` | Bağlı ürünü olmayan kategoriler silinebilir | Aktif |
| `MENU_ITEM_REQUIRES_STOCK_FOR_SALE` | Ürün satışa açılabilmesi için stok kritik seviyenin üzerinde olmalı | Pasif |

## Kullanım

### 1. Kural Kontrolü

Bir işlem sırasında kural kontrolü yapmak için `RulesService.checkRule()` metodu kullanılır:

```typescript
constructor(
    private readonly rulesService: RulesService,
    private readonly ordersService: OrdersService,
) {}

async cancelOrder(orderId: string, user: User) {
    const order = await this.ordersService.findOne(orderId);
    
    // Kural kontrolü - eğer kural aktifse ve koşul sağlanmazsa hata fırlatır
    await this.rulesService.checkRule(
        user.restaurantId,
        RuleKey.ORDER_PREVENT_VOID,
        order, // Context - kural değerlendirmesi için gerekli veri
        'Hazırlama aşamasındaki siparişler iptal edilemez'
    );
    
    // Kural geçtiyse işleme devam et
    return this.ordersService.updateStatus(orderId, OrderStatus.CANCELLED);
}
```

### 2. Kuralları Listeleme

```typescript
const rules = await this.rulesService.listRules(restaurantId);
// Her kategori ve kural için is_enabled durumunu döner
```

### 3. Kural Etkinleştirme/Devre Dışı Bırakma

```typescript
// Kuralı aktif et
await this.rulesService.toggleRule(restaurantId, RuleKey.ORDER_MANDATORY_TABLE, true);

// Kuralı pasif et
await this.rulesService.toggleRule(restaurantId, RuleKey.ORDER_PREVENT_VOID, false);
```

## Yeni Kural Ekleme

### 1. Enum'a Key Ekleme

[`rule-key.enum.ts`](backend/src/modules/rules/enums/rule-key.enum.ts)'a yeni kural key'i ekleyin:

```typescript
export enum RuleKey {
    // Mevcut kurallar...
    
    // Yeni kural
    ORDER_MAX_ITEM_COUNT = 'ORDER_MAX_ITEM_COUNT',
}
```

### 2. Evaluator Oluşturma

Yeni bir evaluator dosyası oluşturun veya mevcut evaluator'a ekleyin:

```typescript
// rules/evaluators/order-rule.evaluator.ts
import { RuleEvaluator } from '../interfaces/rule-evaluator.interface';
import { BusinessRule } from '../entities/business-rule.entity';
import { RuleKey } from '../enums/rule-key.enum';

@Injectable()
export class OrderRuleEvaluator implements RuleEvaluator {
    async handle(restaurantId: string, rule: BusinessRule, context?: any): Promise<boolean> {
        switch (rule.key) {
            // Mevcut case'ler...
            
            case RuleKey.ORDER_MAX_ITEM_COUNT:
                return this.checkMaxItemCount(context);
            default:
                return true;
        }
    }
    
    private checkMaxItemCount(context: any): boolean {
        // Kural mantığı
        const maxItems = 50;
        return context?.items?.length <= maxItems;
    }
}
```

### 3. Varsayılan Kural Ekleme

[`rules.service.ts`](backend/src/modules/rules/rules.service.ts)'deki `initializeDefaultRules` metoduna ekleyin:

```typescript
async initializeDefaultRules(restaurantId: string): Promise<void> {
    const defaultRules = [
        // Mevcut kurallar...
        
        {
            category: RuleCategory.ORDER,
            key: RuleKey.ORDER_MAX_ITEM_COUNT,
            name: 'Maksimum Ürün Sayısı',
            description: 'Bir siparişte en fazla 50 ürün olabilir.',
            is_enabled: false,
        },
    ];
    // ...
}
```

## API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/rules/restaurant/:restaurantId` | Tüm kuralları listele |
| POST | `/api/rules/restaurant/:restaurantId/toggle` | Kuralı aktif/pasif et |
| POST | `/api/rules/restaurant/:restaurantId/initialize` | Varsayılan kuralları başlat |

## Veritabanı Yapısı

```sql
-- business.business_rules tablosu
Column          | Type      | Açıklama
----------------|-----------|-------------------
id              | UUID      | Primary key
restaurant_id   | UUID      | Restoran ID
category        | ENUM      | Kural kategorisi (CASH, ORDER, INVENTORY, SYSTEM)
key             | ENUM      | Kural anahtarı
name            | VARCHAR   | Kural adı
description     | TEXT      | Kural açıklaması
is_enabled      | BOOLEAN   | Aktif/Pasif durumu
config          | JSONB     | Ek yapılandırma (opsiyonel)
created_at      | TIMESTAMP | Oluşturulma tarihi
updated_at      | TIMESTAMP | Güncellenme tarihi
```

## Örnek Akış

### Senaryo: Sipariş İptal Etme

1. **Kullanıcı** siparişi iptal etmek istiyor
2. **Controller** `cancelOrder` endpoint'ini çağırıyor
3. **Service** `rulesService.checkRule()` çağırıyor
4. **RulesService** veritabanından kuralı çekiyor
5. **Kontrol**: Eğer kural `is_enabled = true` ise:
   - İlgili evaluator'ın `handle()` metodu çağrılıyor
   - Context (sipariş bilgisi) ile kural değerlendiriliyor
   - `true` dönerse işleme devam edilir
   - `false` dönerse `BadRequestException` fırlatılıyor
6. **Kural pasif** ise işleme doğrudan devam ediliyor

## Best Practices

1. **Kural Adlandırma**: Açık ve anlaşılır isimler kullanın
2. **Varsayılan Değerler**: Yeni kurallar varsayılan olarak `is_enabled: false` olmalı
3. **Hata Mesajları**: Kullanıcı dostu Türkçe hata mesajları kullanın
4. **Loglama**: Hem başarılı hem başarısız kural kontrollerini loglayın
5. **Config Kullanımı**: Esnek kurallar için `config` alanını kullanın (örn. max değerler)
