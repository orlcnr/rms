# Backend Development Rules

> Her yeni modül oluştururken veya mevcut modülü refactor ederken bu doküman referans alınır.
> Aksi belirtilmedikçe tüm kurallar zorunludur.

---

## İçindekiler

1. [Modül Yapısı](#1-modül-yapısı)
2. [Katman Sorumlulukları](#2-katman-sorumlulukları)
3. [Controller Kuralları](#3-controller-kuralları)
4. [Service Kuralları](#4-service-kuralları)
5. [Use-Case Pattern](#5-use-case-pattern)
6. [Repository Pattern](#6-repository-pattern)
7. [Query Spec Pattern](#7-query-spec-pattern)
8. [Mapper Pattern](#8-mapper-pattern)
9. [DTO Kuralları](#9-dto-kuralları)
10. [Entity Kuralları](#10-entity-kuralları)
11. [Response Standardı](#11-response-standardı)
12. [Hata Yönetimi](#12-hata-yönetimi)
13. [Güvenlik ve Authorization](#13-güvenlik-ve-authorization)
14. [Transaction Yönetimi](#14-transaction-yönetimi)
15. [Audit Logging](#15-audit-logging)
16. [Event / Mesaj Kuyruğu](#16-event--mesaj-kuyruğu)
17. [WebSocket Kuralları](#17-websocket-kuralları)
18. [Caching Kuralları](#18-caching-kuralları)
19. [Tarih ve Zaman](#19-tarih-ve-zaman)
20. [Naming Convention](#20-naming-convention)
21. [Test Kuralları](#21-test-kuralları)
22. [Git Commit Kuralları](#22-git-commit-kuralları)
23. [DTO Field Sözleşmesi](#23-dto-field-sözleşmesi)
24. [Yeni Modül Checklist](#24-yeni-modül-checklist)

---

## 1. Modül Yapısı

Her modül aşağıdaki standart yapıya sahip olmalıdır:

```
backend/src/modules/[module-name]/
├── [module].module.ts           # NestJS modül tanımı — ZORUNLU
├── [module].controller.ts       # HTTP endpoint routing — ZORUNLU
├── [module].service.ts          # Facade/orchestration — ZORUNLU
│
├── dto/
│   ├── create-[entity].dto.ts
│   ├── update-[entity].dto.ts
│   └── get-[entity].dto.ts
│
├── entities/
│   └── [entity].entity.ts
│
├── enums/
│   └── [enum].enum.ts
│
├── interfaces/
│   └── [interface].interface.ts
│
├── repositories/                # QueryBuilder karmaşıklaşınca — ZORUNLU
│   └── [entity].repository.ts
│
├── services/                    # Service 200+ satırı geçince — ZORUNLU
│   ├── [domain]-query.service.ts
│   ├── [domain]-command.service.ts
│   └── [domain]-authorization.service.ts
│
├── use-cases/                   # Birden fazla servis koordinasyonu gerekince
│   └── [action]-[entity].use-case.ts
│
├── mappers/                     # Response hydration tekrarlanınca — ZORUNLU
│   └── [entity].mapper.ts
│
├── query/                       # Filtreli liste endpoint'i varsa — ZORUNLU
│   ├── specs/
│   │   └── [entity]-[filter].spec.ts
│   └── factories/
│       └── [entity]-query.factory.ts
│
└── events/                      # Domain event publish ediliyorsa
    ├── [module]-event.types.ts
    ├── [module]-event.factory.ts
    └── publishers/
        └── [module]-event.publisher.ts
```

**Büyüme kuralı:**

| Durum | Yapılacak |
|-------|-----------|
| Service > 200 satır | `services/` altına böl |
| 2+ servis koordinasyonu | `use-cases/` oluştur |
| Response hydration tekrarlanıyor | `mappers/` oluştur |
| Filtreli liste endpoint'i var | `query/specs` + `query/factories` oluştur |
| Service içinde doğrudan QueryBuilder | `repositories/` oluştur |

---

## 2. Katman Sorumlulukları

```
Controller          → Routing, guard, request/response mapping. Logic YOK.
Service (Facade)    → Use-case ve alt servisleri koordine eder.
QueryService        → Okuma sorguları, filtreleme, sayfalama.
CommandService      → Yazma işlemleri, domain kuralları.
AuthorizationService→ Scope doğrulaması (brand/branch/restaurant).
UseCase             → Tek iş birimi: birden fazla servis/repo koordinasyonu.
Repository          → QueryBuilder metodları, ham DB erişimi.
Mapper              → Entity → DTO dönüşümü, response hydration.
Spec                → Tek filtre kuralı, QueryBuilder'a uygulanır.
Factory             → Spec listesi üretir, koşulları yönetir.
```

**Katmanlar arası bağımlılık (tek yön):**

```
Controller
  └── Service (facade)
        ├── QueryService / CommandService
        │     └── Repository
        ├── UseCase
        │     └── Repository + dış servisler
        └── AuthorizationService
```

---

## 3. Controller Kuralları

Controller sadece routing yapar. İş mantığı, doğrulama kontrolü, veri dönüşümü controller'da olmaz.

```typescript
@Controller('ingredients')
@ApiTags('Inventory')
@UseGuards(JwtAuthGuard)
export class IngredientController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Malzeme listesi' })
  async findAll(
    @Query() query: GetIngredientsDto,
    @GetUser() user: User,
  ) {
    // Sadece yönlendirme — logic YOK
    return this.service.findAll(query, user.restaurantId)
  }

  @Post()
  @ApiOperation({ summary: 'Yeni malzeme oluştur' })
  async create(
    @Body() dto: CreateIngredientDto,
    @GetUser() user: User,
    @Req() req: Request,
  ) {
    return this.service.createIngredient(dto, user, req)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIngredientDto,
    @GetUser() user: User,
    @Req() req: Request,
  ) {
    return this.service.updateIngredient(id, dto, user, req)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @GetUser() user: User,
    @Req() req: Request,
  ) {
    return this.service.deleteIngredient(id, user, req)
  }
}
```

---

## 4. Service Kuralları

Service (facade) sadece koordinasyon yapar. 200 satırı geçen servisler alt servislere bölünür.

```typescript
// ✅ Doğru — facade, sadece yönlendirir
@Injectable()
export class InventoryService {
  constructor(
    private readonly queryService: InventoryQueryService,
    private readonly commandService: InventoryCommandService,
    private readonly authService: InventoryAuthorizationService,
  ) {}

  async findAll(filters: GetIngredientsDto, restaurantId: string) {
    return this.queryService.findAllIngredients(filters, restaurantId)
  }

  async createIngredient(dto: CreateIngredientDto, actor: User, req: Request) {
    await this.authService.assertBrandAccess(actor)
    return this.commandService.createIngredient(dto, actor, req)
  }
}

// ❌ Yanlış — her şey tek service'te, 700+ satır
@Injectable()
export class InventoryService {
  async findAll() { /* 50 satır QueryBuilder */ }
  async create() { /* 80 satır transaction */ }
  async getFoodCostAlerts() { /* 60 satır analiz */ }
  // ...
}
```

---

## 5. Use-Case Pattern

Birden fazla servis veya repository koordinasyonu gerektiren işlemler use-case olarak yazılır.

```typescript
// use-cases/deduct-branch-stock.use-case.ts
@Injectable()
export class DeductBranchStockUseCase {
  constructor(private dataSource: DataSource) {}

  async execute(
    branchId: string,
    items: DeductItem[],
    context?: { brandId?: string; actorId?: string },
  ): Promise<DeductResult> {
    return this.dataSource.transaction(async (manager) => {
      const results: DeductResultItem[] = []

      for (const item of items) {
        const result = await manager.query(`
          UPDATE operations.branch_stocks
          SET quantity = quantity - $1, updated_at = NOW()
          WHERE ingredient_id = $2
            AND branch_id = $3
            AND quantity >= $1
          RETURNING quantity
        `, [item.quantity, item.ingredientId, branchId])

        results.push({
          ingredientId: item.ingredientId,
          status: result.length ? 'OK' : 'INSUFFICIENT_STOCK',
          remaining: result[0]?.quantity ?? null,
        })
      }

      return { branchId, items: results }
    })
  }
}
```

**Use-case kuralları:**

```
✅ Tek iş birimi (Single Responsibility)
✅ Transaction yönetir
✅ Caller audit emit yapar — use-case içinde audit YOK
✅ Caller event publish yapar — use-case içinde publish YOK
❌ Başka use-case çağırmaz
❌ HTTP exception fırlatmaz — domain error döner
```

---

## 6. Repository Pattern

Service içinde doğrudan `createQueryBuilder` kullanımı yasaktır.

```typescript
// repositories/ingredient.repository.ts
@Injectable()
export class IngredientRepository {
  constructor(
    @InjectRepository(Ingredient)
    private repo: Repository<Ingredient>,
  ) {}

  createBaseQuery(branchId: string): SelectQueryBuilder<Ingredient> {
    return this.repo
      .createQueryBuilder('ingredient')
      .leftJoin(
        BranchStock,
        'branch_stock',
        'branch_stock.ingredient_id = ingredient.id AND branch_stock.branch_id = :branchId',
        { branchId },
      )
  }

  async findByBrand(
    brandId: string,
    branchId: string,
  ): Promise<Ingredient[]> {
    return this.createBaseQuery(branchId)
      .where('ingredient.brand_id = :brandId', { brandId })
      .getMany()
  }

  async findOneByBrand(
    id: string,
    brandId: string,
  ): Promise<Ingredient | null> {
    return this.repo.findOne({
      where: { id, brand_id: brandId },
      relations: ['stock'],
    })
  }
}
```

---

## 7. Query Spec Pattern

Filtreli liste sorguları **mutlaka** Spec pattern ile yazılır. `if/if/if` zinciri yasaktır.

### 7.1 Base Interface

```typescript
// shared/query/query-spec.interface.ts
// Bu interface her modülde tekrar yazılmaz — shared'dan import edilir
export interface QuerySpec<T> {
  apply(query: SelectQueryBuilder<T>): void
}
```

### 7.2 Spec Yazma Kuralları

```typescript
// ✅ Doğru — tek sorumluluk, null check yok
export class IngredientNameSpec implements QuerySpec<Ingredient> {
  constructor(private name: string) {}

  apply(query: SelectQueryBuilder<Ingredient>): void {
    query.andWhere('ingredient.name ILIKE :name', {
      name: `%${this.name}%`,
    })
  }
}

export class IngredientStatusSpec implements QuerySpec<Ingredient> {
  constructor(
    private status: StockStatus,
    private quantityExpr: string,
  ) {}

  apply(query: SelectQueryBuilder<Ingredient>): void {
    switch (this.status) {
      case StockStatus.CRITICAL:
        query
          .andWhere(`${this.quantityExpr} > 0`)
          .andWhere(`${this.quantityExpr} <= ingredient.critical_level`)
        break
      case StockStatus.OUT_OF_STOCK:
        query.andWhere(`${this.quantityExpr} <= 0`)
        break
      case StockStatus.HEALTHY:
        query.andWhere(`${this.quantityExpr} > ingredient.critical_level`)
        break
    }
  }
}

// ❌ Yanlış — iki filtre bir arada
export class IngredientNameAndStatusSpec implements QuerySpec<Ingredient> { }

// ❌ Yanlış — spec içinde null check
apply(query) {
  if (!this.name) return  // bu factory'nin sorumluluğu
  query.andWhere(...)
}
```

### 7.3 Factory Kuralları

```typescript
// Context tipi — ayrı interface olarak tanımla
export interface IngredientQueryContext {
  brandId?: string
  branchId: string
  quantityExpr: string
}

@Injectable()
export class IngredientQueryFactory {
  create(
    dto: GetIngredientsDto,
    context: IngredientQueryContext,
  ): QuerySpec<Ingredient>[] {
    const specs: QuerySpec<Ingredient>[] = []

    // Zorunlu — scope her zaman eklenir
    specs.push(new IngredientScopeSpec(context))

    // Opsiyonel — koşullar factory'de
    if (dto.name)   specs.push(new IngredientNameSpec(dto.name))
    if (dto.status) specs.push(new IngredientStatusSpec(dto.status, context.quantityExpr))

    return specs
  }
}
```

### 7.4 Service'te Kullanım

```typescript
// ✅ Doğru — tek satır, if zinciri yok
this.ingredientQueryFactory
  .create(filters, context)
  .forEach(spec => spec.apply(queryBuilder))

// ❌ Yanlış — inline if zinciri
if (filters.name) queryBuilder.andWhere('ingredient.name ILIKE :name', ...)
if (filters.status) queryBuilder.andWhere(...)
```

---

## 8. Mapper Pattern

Response hydration (entity → DTO) tekrarlanıyorsa mapper zorunludur.
Service içinde inline hydration yasaktır.

```typescript
// mappers/ingredient.mapper.ts
export class IngredientMapper {
  static toResponse(
    ingredient: Ingredient,
    branchStock?: BranchStock,
    branchCost?: BranchIngredientCost,
  ): IngredientResponseDto {
    return {
      id: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      base_unit: ingredient.base_unit,
      current_stock: Number(branchStock?.quantity ?? 0),
      average_cost: branchCost?.average_cost ?? null,
      last_price: branchCost?.last_price ?? null,
    }
  }

  static toResponseList(
    ingredients: Ingredient[],
    stockMap: Map<string, BranchStock>,
    costMap: Map<string, BranchIngredientCost>,
  ): IngredientResponseDto[] {
    return ingredients.map(item =>
      this.toResponse(item, stockMap.get(item.id), costMap.get(item.id)),
    )
  }
}
```

**Kural:**

```
Entity → DTO dönüşümü sadece Mapper'da yapılır
Service veri toplar, Mapper şekillendirir
Controller Mapper'ı doğrudan çağırmaz — Service döndürür
```

---

## 9. DTO Kuralları

```typescript
// dto/create-ingredient.dto.ts
export class CreateIngredientDto {
  @ApiProperty({ description: 'Malzeme adı', example: 'Domates' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string

  @ApiProperty({ enum: UnitType })
  @IsEnum(UnitType)
  unit: UnitType

  @ApiPropertyOptional({ description: 'Kritik stok seviyesi' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  critical_level?: number
}

// dto/update-ingredient.dto.ts — tekrar yazma
export class UpdateIngredientDto extends PartialType(CreateIngredientDto) {}

// dto/get-ingredient.dto.ts
export class GetIngredientDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ enum: StockStatus })
  @IsOptional()
  @IsEnum(StockStatus)
  status?: StockStatus
}
```

**Kurallar:**

```
restaurant_id / brand_id / branch_id body'den ALINMAZ — auth'tan resolve edilir
Pagination limit hard-cap: max 100
UpdateDto → PartialType(CreateDto) — tekrar yazma
@IsOptional() her zaman diğer dekoratörlerden önce gelir
Tüm alanlar @ApiProperty ile dokümante edilir
```

---

## 10. Entity Kuralları

```typescript
// entities/ingredient.entity.ts
@Entity({ schema: 'operations', name: 'ingredients' })
@Index('idx_ingredients_brand_id', ['brand_id'])
@Index('idx_ingredients_restaurant_status', ['restaurant_id', 'status'])
export class Ingredient extends BaseEntity {
  @Column()
  name: string

  @Column({ nullable: true })
  @Index()
  brand_id: string

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  quantity: number

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand
}
```

**Kurallar:**

```
Schema adı explicit yazılır (operations, business vb.)
Index tanımları entity'de — migration'da değil
Soft delete: softRemove() — hard delete yasak (gerekmedikçe)
Decimal alanlar: precision + scale mutlaka belirtilir
  → @Column({ type: 'decimal', precision: 12, scale: 4 })
created_at / updated_at / deleted_at → BaseEntity'den gelir, tekrar yazılmaz
```

---

## 11. Response Standardı

Tüm API response'ları `ApiResponseDto` ile normalize edilir.

```typescript
// Başarılı — tekil kayıt
{
  "success": true,
  "data": { "id": "...", "name": "Domates" },
  "timestamp": "2026-01-15T10:30:00.000Z"
}

// Başarılı — paginated liste
{
  "success": true,
  "data": {
    "items": [...],
    "meta": {
      "totalItems": 100,
      "itemCount": 10,
      "itemsPerPage": 10,
      "totalPages": 10,
      "currentPage": 1
    }
  },
  "timestamp": "2026-01-15T10:30:00.000Z"
}

// Hata
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Yetersiz stok: Domates. Mevcut: 0, İstenen: 200"
  },
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

```typescript
// common/dto/api-response.dto.ts
export class ApiResponseDto<T> {
  static ok<T>(data: T, message?: string): ApiResponseDto<T> {
    return { success: true, data, message, timestamp: new Date().toISOString() }
  }

  static paginated<T>(items: T[], meta: PaginationMeta) {
    return {
      success: true,
      data: { items, meta },
      timestamp: new Date().toISOString(),
    }
  }
}
```

**Binary response** (export/download) envelope dışındadır — `@Res()` ile raw stream olarak döner.

---

## 12. Hata Yönetimi

### 12.1 Exception Hiyerarşisi

```typescript
// Kayıt bulunamadı
throw new NotFoundException('Malzeme bulunamadı')

// Geçersiz istek / iş kuralı ihlali
throw new BadRequestException('Stok miktarı negatif olamaz')

// Yetki yok
throw new ForbiddenException('Bu şubeye erişim yetkiniz yok')

// Çakışma
throw new ConflictException('Bu e-posta zaten kayıtlı')

// Domain exception — iş kuralı kodu ile
export class InsufficientStockException extends BadRequestException {
  constructor(name: string, available: number, requested: number) {
    super(
      `Yetersiz stok: ${name}. Mevcut: ${available}, İstenen: ${requested}`,
      'INSUFFICIENT_STOCK',
    )
  }
}
```

### 12.2 Sessiz Hata Yutma Yasağı

```typescript
// ❌ Yasak
try {
  await this.repo.save(entity)
} catch {
  return null
}

// ✅ Doğru
try {
  return await this.repo.save(entity)
} catch (error) {
  this.logger.error('Entity save failed', error)
  throw new InternalServerErrorException('Kayıt oluşturulamadı')
}
```

### 12.3 Audit / Event — Fail-Open

```typescript
// Audit ve event publish hatası ana akışı ASLA bloklamaz
await this.auditService.safeEmitLog({ ... })
  .catch(err => this.logger.warn('Audit log failed', err))

await this.eventPublisher.publish(event)
  .catch(err => this.logger.warn('Event publish failed', err))
```

### 12.4 Global Exception Filter

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const request = ctx.getRequest()

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Beklenmeyen bir hata oluştu'

    this.logger.error({ path: request.url, status, message })

    response.status(status).json({
      success: false,
      error: {
        code: typeof message === 'object' ? (message as any).error : 'INTERNAL_ERROR',
        message: typeof message === 'object' ? (message as any).message : message,
      },
      timestamp: new Date().toISOString(),
    })
  }
}
```

---

## 13. Güvenlik ve Authorization

### 13.1 Scope Doğrulaması (Multi-Tenant)

Her mutasyon işleminde scope kontrolü zorunludur:

```typescript
// ✅ Brand owner — sadece kendi brand'inin şubelerine erişir
if (requester.brandId !== target.brandId) {
  throw new ForbiddenException('Farklı brand şubesi için işlem yapılamaz')
}

// ✅ Branch manager — sadece kendi şubesine erişir
if (requester.restaurantId !== targetBranchId) {
  throw new ForbiddenException('Başka şube için işlem yetkiniz yok')
}
```

### 13.2 restaurant_id / brand_id Client'tan Alınmaz

```typescript
// ❌ Yasak — body'den restaurant_id
async create(@Body() dto: CreateDto) {
  // dto.restaurant_id güvenilmez, kullanıcı manipüle edebilir
}

// ✅ Doğru — auth'tan resolve
async create(@Body() dto: CreateDto, @GetUser() user: User) {
  return this.service.create(dto, user.restaurantId)
}
```

### 13.3 SQL Injection

```typescript
// ✅ Parameterized query
qb.where('ingredient.brand_id = :brandId', { brandId })

// ❌ KESİNLİKLE YASAK — string concatenation
qb.where(`ingredient.brand_id = '${brandId}'`)
```

### 13.4 Validation Pipeline (main.ts)

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // DTO'da olmayan alanları sil
  forbidNonWhitelisted: true,   // bilinmeyen alan → 400
  transform: true,              // otomatik tip dönüşümü
  transformOptions: {
    enableImplicitConversion: true,
  },
}))
```

### 13.5 Guard Kullanımı

```typescript
@UseGuards(JwtAuthGuard)                    // Auth gerekli endpoint'ler
@UseGuards(JwtAuthGuard, RolesGuard)        // Rol bazlı erişim
@Roles('manager', 'admin')
@UseGuards(SuperAdminGuard)                 // Super admin erişimi
```

### 13.6 Permission Matrix

| Rol | İzinler |
|-----|---------|
| super_admin | Tüm izinler |
| brand_owner | Brand ve şube yönetimi |
| manager | Şube yönetimi, raporlar |
| waiter | Sipariş oluşturma/görüntüleme |
| kitchen | Sipariş durumu güncelleme |
| cashier | Ödeme işlemleri |

---

## 14. Transaction Yönetimi

```typescript
// Standart — QueryRunner ile explicit
const queryRunner = this.dataSource.createQueryRunner()
await queryRunner.connect()
await queryRunner.startTransaction()

try {
  // işlemler...
  await queryRunner.commitTransaction()

  // Audit ve event — COMMIT'ten SONRA
  await this.auditService.safeEmitLog({ ... }).catch(...)
  await this.eventPublisher.publish(event).catch(...)

} catch (err) {
  await queryRunner.rollbackTransaction()
  throw err
} finally {
  await queryRunner.release()  // her durumda
}
```

**Kurallar:**

```
Audit emit → transaction COMMIT'ten sonra
Event publish → transaction COMMIT'ten sonra
Audit/event hatası → transaction rollback etmez (fail-open)
Transaction içinde başka transaction açılmaz
finally'de release mutlaka çağrılır
```

---

## 15. Audit Logging

```typescript
// Her başarılı mutasyondan sonra — transaction dışında
await this.auditService.safeEmitLog({
  action: AuditAction.INVENTORY_INGREDIENT_CREATED,
  resource: 'INVENTORY',
  user_id: actor?.id,
  user_name: `${actor?.first_name} ${actor?.last_name}`.trim(),
  restaurant_id: entity.restaurant_id,
  changes: sanitizeAuditChanges({
    before: beforeSnapshot,  // mutasyon öncesi state
    after: afterSnapshot,    // mutasyon sonrası state
  }),
  ip_address: request?.ip,
  user_agent: request?.headers?.['user-agent'],
}, 'ServiceName.methodName')

this.auditService.markRequestAsAudited(request)
```

**Kurallar:**

```
Başarılı mutasyonlar → audit emit
Başarısız mutasyonlar → audit emit YOK
Bulk işlemlerde → changes.meta ile özet (satır bazlı değil)
sanitizeAuditChanges → şifre/token alanları maskelenir
safeEmitLog → fail-open (hata ana akışı bozmaz)
markRequestAsAudited → duplicate guard
```

---

## 16. Event / Mesaj Kuyruğu

### 16.1 Domain Event Envelope

```typescript
export interface DomainEvent<T> {
  eventId: string           // UUID
  eventType: string         // 'inventory.stock.deducted'
  eventVersion: 1
  occurredAt: string        // ISO 8601
  correlationId?: string
  actorId?: string
  brandId?: string
  branchId?: string
  payload: T
}
```

### 16.2 Routing Key Convention

```
[module].[entity].[action]

Örnekler:
  inventory.stock.deducted
  inventory.stock.insufficient
  orders.order.created
  payments.payment.confirmed
```

### 16.3 Publish Kuralı

```typescript
// Transaction COMMIT'ten sonra — fail-open
await this.eventPublisher
  .publish(event, aggregateId)
  .catch(err => this.logger.warn('Event publish failed', err))
```

### 16.4 Consumer (Queue)

```typescript
@Processor('mail_queue')
export class MailConsumer {
  @Process('send-welcome')
  async handleWelcomeEmail(job: Job<WelcomeEmailData>) {
    await this.mailService.sendMail({
      to: job.data.to,
      subject: 'Hoş Geldiniz',
      template: 'welcome',
      context: { name: job.data.name },
    })
  }
}
```

---

## 17. WebSocket Kuralları

```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server

  handleConnection(client: Socket) {
    const restaurantId = client.handshake.query.restaurantId
    client.join(`restaurant:${restaurantId}`)
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurant_id: string },
  ) {
    client.join(`restaurant:${data.restaurant_id}`)
  }

  emitToRestaurant(restaurantId: string, event: string, data: unknown) {
    this.server.to(`restaurant:${restaurantId}`).emit(event, data)
  }
}
```

**Event Naming Convention:**

| Event | Yön | Açıklama |
|-------|-----|----------|
| `order_created` | Server → Client | Yeni sipariş |
| `order_updated` | Server → Client | Sipariş güncelleme |
| `order_item_updated` | Server → Client | Sipariş kalemi güncelleme |
| `table_updated` | Server → Client | Masa durumu |
| `menu:price_updated` | Server → Client | Fiyat değişikliği |
| `notification` | Server → Client | Genel bildirim |

---

## 18. Caching Kuralları

### 18.1 Cache Key Convention

```
restaurant:{id}:menu          → Menü cache
restaurant:{id}:context       → Şube context
session:{token}               → Session cache
user:{id}:permissions         → Kullanıcı izinleri
```

### 18.2 Cache Interceptor

```typescript
@Get()
@UseInterceptors(CacheInterceptor)
@CacheKey('restaurant_menu')
@CacheTTL(900)  // 15 dakika
async getMenu() {
  return this.menuService.findAll()
}
```

### 18.3 Cache Invalidation

```typescript
async updateMenuItem(id: string, dto: UpdateMenuItemDto) {
  const item = await this.repository.save({ id, ...dto })

  // Güncelleme sonrası cache temizle
  await this.cacheManager.del(`restaurant:${item.restaurantId}:menu`)

  return item
}
```

---

## 19. Tarih ve Zaman

**CRITICAL:** Gün bazlı filtrelemede timezone sapmaları üretim hatalarına yol açar.

```typescript
// ✅ Doğru — PostgreSQL AT TIME ZONE dönüşümü
qb.andWhere(
  `CAST(entity.reservation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul' AS DATE) = :date`,
  { date: '2026-02-27' }
)

// ✅ "Bugün" hesabı — sunucu saati ne olursa olsun İstanbul zamanı
const todayIstanbul = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul',
}).format(new Date())

qb.andWhere(
  `CAST(entity.reservation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul' AS DATE) = :today`,
  { today: todayIstanbul }
)
```

**Alan ayrımı:**

```
created_at       → Kayıt oluşturma anı, UTC, sadece log/audit filtresi için
reservation_time → İş zamanı, filtreleme ve gösterimde kullanılır, İstanbul TZ
```

---

## 20. Naming Convention

| Tür | Kural | Örnek |
|-----|-------|-------|
| Class | PascalCase | `IngredientService` |
| Method | camelCase | `findAllByBrand` |
| Variable | camelCase | `brandId` |
| Constant | UPPER_SNAKE | `MAX_PAGE_SIZE` |
| Enum değer | PascalCase | `MovementType.IN` |
| File | kebab-case | `ingredient.service.ts` |
| DB Table | snake_case + schema | `operations.ingredients` |
| DB Column | snake_case | `brand_id`, `created_at` |
| Spec class | `[Entity][Filter]Spec` | `IngredientStatusSpec` |
| Factory class | `[Entity]QueryFactory` | `IngredientQueryFactory` |
| Use-case class | `[Action][Entity]UseCase` | `DeductBranchStockUseCase` |
| Mapper class | `[Entity]Mapper` | `IngredientMapper` |

---

## 21. Test Kuralları

### 21.1 Unit Test — Zorunlu Senaryolar

```typescript
// Spec testi
describe('IngredientNameSpec', () => {
  it('ILIKE filtresi uygulanır', () => {
    const query = mockQueryBuilder<Ingredient>()
    new IngredientNameSpec('domates').apply(query)

    expect(query.andWhere).toHaveBeenCalledWith(
      'ingredient.name ILIKE :name',
      { name: '%domates%' },
    )
  })
})

// Use-case testi
describe('DeductBranchStockUseCase', () => {
  it('yeterli stok → OK döner', async () => { ... })
  it('yetersiz stok → INSUFFICIENT_STOCK döner', async () => { ... })
  it('satır yok → STOCK_ROW_NOT_FOUND döner', async () => { ... })
  it('eşzamanlı çağrı → race condition olmaz', async () => { ... })
})
```

### 21.2 Integration Test — Zorunlu Senaryolar

```
Her modül için minimum:
  □ Create → DB'ye yazıldı, audit emit oldu
  □ Scope ihlali → 403 döndü
  □ Paginated list → envelope formatı doğru
  □ Transaction rollback → partial state yok
```

### 21.3 Mock Kuralları

```typescript
// Repository mock — tip güvenli
const mockRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  }),
} as unknown as Repository<Ingredient>
```

---

## 22. Git Commit Kuralları

### Format

```
type(scope): subject

[optional body]
[optional footer]
```

### Type'lar

| Type | Açıklama |
|------|----------|
| `feat` | Yeni özellik |
| `fix` | Bug düzeltme |
| `refactor` | Davranış değişmeden yeniden yapılandırma |
| `test` | Test ekleme/düzenleme |
| `docs` | Dokümantasyon |
| `perf` | Performans iyileştirmesi |
| `chore` | Bakım, bağımlılık güncellemesi |
| `ci` | CI/CD değişikliği |

### Örnekler

```
feat(inventory): add branch-scoped stock deduction use-case

- Atomic UPDATE ile race condition önlendi
- INSUFFICIENT_STOCK domain error eklendi
- Transaction sonrası audit emit

Closes #234
```

```
fix(inventory): fix bulkUpdateStock missing branch_stocks update

branch_stocks tablosu güncellenmiyordu, sadece legacy
stocks tablosu güncelleniyordu.

Fixes #312
```

---

## 23. DTO Field Sözleşmesi

Her response DTO'daki alanın kaynağı, anlamı ve null durumu dokümante edilir.
Bu, frontend-backend arasındaki sessiz sürüklenmeyi önler.

### 23.1 Field Annotation Formatı

Her DTO alanı üç bilgiyi taşımalıdır:

```typescript
/**
 * @source     Verinin DB kaynağı veya hesaplama yöntemi
 * @context    Hangi bağlamda kullanılır (sales | admin | audit)
 * @nullable   null/undefined gelebilir mi, ne zaman?
 */
```

### 23.2 Örnek — MenuItemResponseDto

```typescript
export class MenuItemResponseDto {
  /**
   * @source   menu_items.price
   * @context  admin — ürün düzenleme formu, maliyet analizi
   * @nullable Hayır — her zaman dolu
   */
  base_price: number

  /**
   * @source   COALESCE(branch_menu_overrides.custom_price, menu_items.price)
   * @context  sales — POS kart, guest kart, sepete ekleme, checkout
   * @nullable Hayır — branch context'te her zaman dolu (backend garantisi)
   * @note     price alanı da bu değere eşitlenir (backward compat)
   */
  effective_price: number

  /**
   * @source   effective_price (branch context) | base_price (admin context)
   * @context  generic — eski kod uyumu için korunur
   * @nullable Hayır
   * @deprecated Yeni kod effective_price veya base_price'ı explicit kullanır
   */
  price: number

  /**
   * @source   branch_menu_overrides.custom_price IS NOT NULL
   * @context  admin — override rozeti gösterimi
   * @nullable Evet — override yoksa null
   */
  override_price: number | null

  /**
   * @source   COUNT(branch_menu_overrides) WHERE menu_item_id = id
   * @context  admin — "X şubede farklı fiyat" bilgisi
   * @nullable Hayır — override yoksa 0
   */
  override_count: number
}
```

### 23.3 Örnek — IngredientResponseDto

```typescript
export class IngredientResponseDto {
  /**
   * @source   operations.ingredients.name
   * @context  her yerde
   * @nullable Hayır
   */
  name: string

  /**
   * @source   operations.ingredients.base_unit
   * @context  stok giriş formu, reçete formu — birim dönüşüm base'i
   * @nullable Hayır — createIngredient'ta normalize edilir
   */
  base_unit: 'gr' | 'ml' | 'adet'

  /**
   * @source   operations.branch_stocks.quantity WHERE branch_id = activeBranch
   * @context  sales/inventory — aktif şubenin anlık stoğu
   * @nullable Hayır — branch_stocks satırı yoksa 0 döner
   * @note     Brand context dışında legacy stock.quantity değil, branch stoğu gelir
   */
  current_stock: number

  /**
   * @source   operations.branch_ingredient_costs.average_cost WHERE branch_id = activeBranch
   * @context  inventory — maliyet analizi, food cost hesabı
   * @nullable Evet — şube için henüz stok hareketi yapılmamışsa null
   * @ui-rule  current_stock <= 0 ise UI'da "—" gösterilir
   */
  average_cost: number | null

  /**
   * @source   operations.branch_ingredient_costs.last_price
   * @context  inventory — son alış fiyatı gösterimi
   * @nullable Evet — ilk stok girişine kadar null
   */
  last_price: number | null
}
```

### 23.4 Örnek — StockMovementResponseDto

```typescript
export class StockMovementResponseDto {
  /**
   * @source   operations.stock_movements.quantity (kullanıcının girdiği)
   * @context  UI gösterimi — kullanıcının anladığı birimde
   * @nullable Hayır
   */
  quantity: number

  /**
   * @source   operations.stock_movements.unit (kullanıcının seçtiği birim)
   * @context  UI gösterimi
   * @nullable Hayır
   */
  unit: string

  /**
   * @source   operations.stock_movements.base_quantity (toBaseUnit() sonucu)
   * @context  stok hesabı, düşüm — her zaman base_unit cinsinden
   * @nullable Hayır — kayıt sırasında hesaplanır
   * @note     Stok düşümünde bu alan kullanılır, quantity değil
   */
  base_quantity: number

  /**
   * @source   operations.stock_movements.branch_id
   * @context  multi-tenant scope — hangi şubenin hareketi
   * @nullable Hayır — actor.restaurant_id'den set edilir, body'den alınmaz
   */
  branch_id: string
}
```

### 23.5 Genel Field Kuralları

**Kaynak (source) kuralları:**

```
DB alan adı yazılır: menu_items.price
Hesaplamalı alanlar formülle yazılır: COALESCE(override.custom_price, mi.price)
Auth'tan gelen alanlar: actor.restaurant_id
Türetilmiş alanlar: COUNT(...), SUM(...)
```

**Null kuralları:**

```
Nullable alan → response type'ında T | null yazılır (undefined değil)
"Her zaman dolu" → backend garantisi, test ile kilitlenir
"Koşullu dolu" → null olduğu durum @nullable'da açıklanır
```

**Context kuralları:**

```
sales   → POS, guest, sepet, checkout (satış yüzeyi)
admin   → Yönetim paneli, ürün düzenleme, raporlar
audit   → Log, izleme, debug — kullanıcıya gösterilmez
```

**Kritik ayrım — fiyat alanları:**

```
base_price      → admin context ONLY, satış yüzeyinde kullanılmaz
effective_price → sales context ONLY, admin formunda gösterilmez
price           → backward compat, yeni kod explicit alanı kullanır
unitPrice       → sipariş anı kilitli fiyat, sonraki değişiklikten etkilenmez
```

### 23.6 Response DTO Yazma Checklist

```
Her alan için:
  □ @source tanımlı (DB alanı veya hesaplama formülü)
  □ @context tanımlı (sales | admin | audit)
  □ @nullable durumu açık (hayır / evet + ne zaman)
  □ @note varsa özel kural veya uyarı yazılmış

Özel durumlar:
  □ Backward compat için korunan alan → @deprecated işareti
  □ Branch context'e göre değişen alan → @note ile açıklanmış
  □ "Her zaman dolu" garantisi → integration test'te doğrulanmış
```

---

## 24. Yeni Modül Checklist

```
DTO FIELD SÖZLEŞMESİ:
  □ Her response alanında @source, @context, @nullable var
  □ Fiyat alanları: base_price (admin) / effective_price (sales) ayrımı net
  □ Nullable alanlar type'ta T | null olarak yazılmış
  □ "Her zaman dolu" garantisi integration test'te var
  □ Backward compat alanları @deprecated işaretli

MODÜL YAPISI:
  □ module.ts, controller.ts, service.ts mevcut
  □ DTO'lar: create, update, get — ayrı dosyalar
  □ Entity: schema adı explicit, index tanımlı

GÜVENLİK:
  □ restaurant_id / brand_id body'den alınmıyor — auth'tan resolve
  □ Scope doğrulaması (brand/branch) var
  □ SQL sorguları parameterized (interpolasyon yok)
  □ Guard'lar controller'da tanımlı
  □ ValidationPipe global aktif

KOD KALİTESİ:
  □ Filtreli list → QuerySpec pattern kullanıyor
  □ Karmaşık QueryBuilder → Repository'de kapsüllenmiş
  □ Response hydration tekrarı → Mapper'da
  □ 2+ servis koordinasyonu → UseCase'de
  □ Service 200 satırı geçmiyor
  □ Controller'da logic yok

RESPONSE:
  □ Tüm response'lar ApiResponseDto ile normalize
  □ Paginated → data.items + data.meta
  □ Hata → success:false + error.code + error.message
  □ Binary export → envelope dışı, raw stream

TRANSACTION:
  □ Audit emit → commit'ten sonra (fail-open)
  □ Event publish → commit'ten sonra (fail-open)
  □ finally'de queryRunner.release() çağrılıyor

TEST:
  □ Her Spec için unit test
  □ Use-case: success + failure + edge case
  □ Scope ihlali integration test'te var
  □ Paginated response envelope formatı test edilmiş
```