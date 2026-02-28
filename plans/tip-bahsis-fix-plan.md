# Bahşiş (Tip) Özelliği Sorunu ve Çözüm Planı

## Sorun Özeti

| # | Sorun | Öncelik |
|---|-------|----------|
| 1 | Settings endpoint public ve güvensiz | Kritik |
| 2 | Bahşiş alanı frontend'de görünmüyor | Yüksek |
| 3 | Backend'de tip_commission_enabled ayarı yok | Yüksek |
| 4 | Frontend hardcoded değer kullanıyor | Orta |

---

## BÖLÜM 1: Settings Endpoint Güvenlik Düzeltmesi

### 1.1 GetSettingsDto (Yeni Dosya)
`backend/src/modules/settings/dto/get-settings.dto.ts`:
```typescript
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetSettingsDto {
  @ApiPropertyOptional({ example: 'payment' })
  @IsOptional()
  @IsString()
  group?: string;
}
```

### 1.2 UpdateSettingDto (Yeni Dosya)
`backend/src/modules/settings/dto/update-setting.dto.ts`:
```typescript
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SettingType } from '../entities/restaurant-setting.entity';

export class UpdateSettingDto {
  @ApiProperty({ example: 'tip_commission_rate' })
  @IsString()
  @IsNotEmpty()
  key: string;

  // ⚠️ Düzeltme: IsNumber yerine IsNotEmpty - value herhangi bir tip olabilir
  @ApiProperty({ example: 0.02, description: 'Value can be number, string, or boolean' })
  @IsNotEmpty()
  value: unknown;

  @ApiProperty({ enum: SettingType })
  @IsEnum(SettingType)
  type: SettingType;

  @ApiPropertyOptional({ example: 'payment' })
  @IsOptional()
  @IsString()
  group?: string;
}
```

### 1.3 Controller Güncelleme
`backend/src/modules/settings/settings.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingType } from './entities/restaurant-setting.entity';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../../modules/users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { GetSettingsDto } from './dto/get-settings.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)  // ✅ Auth zorunlu
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get(':restaurantId')
    @ApiOperation({ summary: 'Get settings for a restaurant' })
    async getSettings(
        @Param('restaurantId') restaurantId: string,
        @Query() query: GetSettingsDto,
        @GetUser() user: User,
    ) {
        // ✅ Multi-tenant kontrolü + SUPER_ADMIN exception
        if (user.role !== Role.SUPER_ADMIN && user.restaurantId !== restaurantId) {
            throw new ForbiddenException('Bu restorana erişim yetkiniz yok');
        }
        
        return this.settingsService.getSettingsByGroup(restaurantId, query.group);
    }

    @Post(':restaurantId')
    @ApiOperation({ summary: 'Update or create a setting' })
    async updateSetting(
        @Param('restaurantId') restaurantId: string,
        @Body() dto: UpdateSettingDto,
        @GetUser() user: User,
    ) {
        // ✅ Multi-tenant kontrolü + SUPER_ADMIN exception
        if (user.role !== Role.SUPER_ADMIN && user.restaurantId !== restaurantId) {
            throw new ForbiddenException('Bu restorana erişim yetkiniz yok');
        }
        
        return this.settingsService.updateSetting(
            restaurantId,
            dto.key,
            dto.value,
            dto.type,
            dto.group,
        );
    }
}
```

---

## BÖLÜM 2: Migration - tip_commission Ayaları

### 2.1 Migration Manuel Çalıştırma

```bash
cd backend
npm run migration:generate -- -n AddTipCommissionSettings
npm run migration:run
```

Bu komut otomatik doğru timestamp oluşturur (örn: `1709000000000-add-tip-commission-settings.ts`).

### 2.2 Otomatik Oluşan Migration (Örnek)
`backend/src/migrations/1709xxxxxxx-add-tip-commission-settings.ts`:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTipCommissionSettings1709xxxxxxx implements MigrationInterface {
    name = 'AddTipCommissionSettings1709xxxxxxx';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Tüm restoranlar için tip_commission_enabled ayarı
        await queryRunner.query(`
            INSERT INTO business.restaurant_settings (id, restaurant_id, key, value, type, group, created_at, updated_at)
            SELECT 
                gen_random_uuid() as id,
                id as restaurant_id,
                'tip_commission_enabled' as key,
                'true' as value,
                'BOOLEAN' as type,
                'payment' as "group",
                NOW() as created_at,
                NOW() as updated_at
            FROM business.restaurants
            WHERE deleted_at IS NULL
            ON CONFLICT (restaurant_id, key) DO NOTHING
        `);

        // Tüm restoranlar için tip_commission_rate ayarı
        await queryRunner.query(`
            INSERT INTO business.restaurant_settings (id, restaurant_id, key, value, type, group, created_at, updated_at)
            SELECT 
                gen_random_uuid() as id,
                id as restaurant_id,
                'tip_commission_rate' as key,
                '0.02' as value,
                'NUMBER' as type,
                'payment' as "group",
                NOW() as created_at,
                NOW() as updated_at
            FROM business.restaurants
            WHERE deleted_at IS NULL
            ON CONFLICT (restaurant_id, key) DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM business.restaurant_settings 
            WHERE key IN ('tip_commission_enabled', 'tip_commission_rate')
        `);
    }
}
```

---

## BÖLÜM 3: Frontend Güncelleme

### 3.1 Token Yönetimi
Projede token **cookie**'den alınıyor (`getCookie('access_token')`). Buna göre düzeltme:

`web/modules/orders/components/PaymentModal.tsx`:
```typescript
import { getCookie } from '@/modules/shared/utils/cookie';  // Veya mevcut utility

// useState - başlangıçta backend'den çekilmemişken false
const [tipSettings, setTipSettings] = useState({
  enabled: false,  // ✅ Backend'den gelene kadar bekle
  editable: true,
  rate: 0.02
});

const [token, setToken] = useState<string | null>(null);

useEffect(() => {
  // ✅ Cookie'den token al
  const accessToken = getCookie('access_token');
  setToken(accessToken);
}, []);

useEffect(() => {
  const fetchSettings = async () => {
    // ✅ Token yoksa fetch yapma
    if (!restaurantId || !token) return;
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/${restaurantId}?group=payment`,
        {
          headers: { 
            // ✅ Cookie'den token kullan
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Settings fetch failed');
      
      const json = await response.json();
      const settings = json.data || {};
      
      // Backend'den gelen değerleri kullan
      setTipSettings({
        rate: parseFloat(settings.tip_commission_rate) || 0.02,
        enabled: settings.tip_commission_enabled === true || settings.tip_commission_enabled === 'true',
        editable: settings.tip_commission_editable === true || settings.tip_commission_editable === 'true'
      });
    } catch (error) {
      console.error('Error fetching tip settings:', error);
      // Fallback: hata durumunda varsayılan değerler
      setTipSettings({ enabled: true, editable: true, rate: 0.02 });
    }
  };
  
  if (isOpen && restaurantId && token) {
    fetchSettings();
  }
}, [isOpen, restaurantId, token]);  // ✅ Token değişirse refetch
```

---

## BÖLÜM 4: Test Senaryoları

### 4.1 Güvenlik Testleri
| Test | Beklenen Sonuç |
|------|---------------- olmadan settings çağır |-|
| Auth 401 Unauthorized |
| Farklı restaurant'ın settings | 403 Forbidden |
| SUPER_ADMIN her restaurant'a erişir | 200 OK |

### 4.2 Bahşiş Akış Testi
| Test | Beklenen Sonuç |
|------|-----------------|
| Payment modal açılır | tip_commission_enabled backend'den çekilir |
| enabled: true ise | Bahşiş input'u görünür |
| Ödeme yapılır | tip_amount kaydedilir |
| Cash movement | Bahşiş hareketi görünür |

---

## Özet - Yapılacaklar

| Adım | Dosya | Değişiklik |
|------|-------|-------------|
| 1 | `dto/get-settings.dto.ts` | Yeni dosya |
| 2 | `dto/update-settings.dto.ts` | Yeni dosya (value: unknown) |
| 3 | `settings.controller.ts` | Auth + DTO + Multi-tenant |
| 4 | Migration | `npm run migration:generate` |
| 5 | `PaymentModal.tsx` | Cookie'den token + backend'den çek |
| 6 | Test | Manuel doğrulama |
