# Backend Development Rules

## Genel Kurallar

### 1. Modüler Yapý Organizasyonu

Her modül asagidaki standart yapýya sahip olmalidir:

Kod yazarken DRY (Don't Repeat Yourself), tek sorumluluk prensibi ve 
endişelerin ayrılması prensiplerini uygula. Okunabilir, test edilebilir 
ve bakımı kolay kod yaz.

```
backend/src/modules/[module-name]/
ââââ [module].module.ts      # NestJS modül tanimi - ZORUNLU
ââââ [module].controller.ts  # HTTP endpoint'leri - ZORUNLU
ââââ [module].service.ts     # Is mantigi - ZORUNLU
ââââ dto/                    # Data transfer objects
ââ   ââââ create-[entity].dto.ts
ââ   ââââ update-[entity].dto.ts
ââ   ââââ get-[entity].dto.ts
ââââ entities/               # TypeORM entity'leri
ââ   ââââ [entity].entity.ts
ââââ enums/                  # Modül enum'lari
ââ   ââââ [enum].enum.ts
ââââ interfaces/             # Interface tanimlari
ââ   ââââ [interface].interface.ts
```

### 2. Module Tanimi

```typescript
// [module].module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Entity]),
    // Diger modüller
  ],
  controllers: [ModuleController],
  providers: [ModuleService],
  exports: [ModuleService],  // Diger modüllerde kullanilacaksa
})
export class ModuleModule {}
```

### 3. Controller Kurallari

```typescript
// [module].controller.ts
@Controller('endpoint')
@ApiTags('Endpoint')  // Swagger için
@UseGuards(JwtAuthGuard)  // Auth gerekli
export class ModuleController {
  constructor(private readonly service: ModuleService) {}

  // GET - Liste
  @Get()
  @ApiOperation({ summary: 'Tüm kayitlari listele' })
  @ApiOkResponse({ type: [Entity] })
  async getAll(@Query() query: GetDto, @GetUser() user: User) {
    return this.service.findAll(query, user.restaurantId);
  }

  // GET - Tekil
  @Get(':id')
  @ApiOperation({ summary: 'ID ile kayit getir' })
  @ApiOkResponse({ type: Entity })
  @ApiNotFoundResponse({ description: 'Kayit bulunamadi' })
  async getOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // POST - Olustur
  @Post()
  @ApiOperation({ summary: 'Yeni kayit olustur' })
  @ApiCreatedResponse({ type: Entity })
  @ApiBadRequestResponse({ description: 'Gecersiz veri' })
  async create(@Body() dto: CreateDto, @GetUser() user: User) {
    return this.service.create(dto, user);
  }

  // PATCH - Guncelle
  @Patch(':id')
  @ApiOperation({ summary: 'Kayit guncelle' })
  @ApiOkResponse({ type: Entity })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDto,
  ) {
    return this.service.update(id, dto);
  }

  // DELETE - Sil
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Kayit sil' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

### 4. Service Kurallari

```typescript
// [module].service.ts
@Injectable()
export class ModuleService {
  constructor(
    @InjectRepository(Entity)
    private repository: Repository<Entity>,
    // Diger dependency'ler
  ) {}

  async findAll(query: GetDto, restaurantId: string): Promise<Entity[]> {
    const qb = this.repository.createQueryBuilder('entity');
    
    // Restaurant filtreleme - multi-tenant
    qb.andWhere('entity.restaurantId = :restaurantId', { restaurantId });
    
    // Query parametreleri
    if (query.status) {
      qb.andWhere('entity.status = :status', { status: query.status });
    }
    
    // Pagination
    qb.skip((query.page - 1) * query.limit).take(query.limit);
    
    return qb.getMany();
  }

  async findOne(id: string): Promise<Entity> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('Kayit bulunamadi');
    }
    return entity;
  }

  async create(dto: CreateDto, user: User): Promise<Entity> {
    const entity = this.repository.create({
      ...dto,
      restaurantId: user.restaurantId,
      createdBy: user.id,
    });
    return this.repository.save(entity);
  }

  async update(id: string, dto: UpdateDto): Promise<Entity> {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repository.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.repository.softRemove(entity);
  }
}
```

### 5. DTO Kurallari

```typescript
// dto/create-[entity].dto.ts
import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEntityDto {
  @ApiProperty({ description: 'Ad', example: 'Örnek' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Açiklama' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Miktar', example: 10 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ enum: Status, description: 'Durum' })
  @IsEnum(Status)
  status: Status;
}

// dto/update-[entity].dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateEntityDto } from './create-entity.dto';

export class UpdateEntityDto extends PartialType(CreateEntityDto) {}

// dto/get-[entity].dto.ts
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetEntityDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
```

### 6. Entity Kurallari

```typescript
// entities/[entity].entity.ts
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity';

@Entity('entities')
@Index('idx_entities_restaurant', ['restaurantId'])
export class Entity extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ default: true })
  isActive: boolean;

  // Multi-tenant
  @Column()
  @Index()
  restaurantId: string;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  // Soft delete
  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
```

### 7. Naming Convention

| Tür | Kural | Örnek |
|-----|-------|-------|
| Class | PascalCase | `OrderService` |
| Method | camelCase | `findAll` |
| Variable | camelCase | `restaurantId` |
| Constant | UPPER_SNAKE | `MAX_PAGE_SIZE` |
| Enum | PascalCase | `OrderStatus` |
| File | kebab-case | `order.service.ts` |
| Table | snake_case | `order_items` |
| Column | snake_case | `created_at` |

---

## Validation Kurallari

### 1. class-validator Decorator'lari

```typescript
// String validation
@IsString()
@IsNotEmpty()
@MinLength(3)
@MaxLength(100)
name: string;

// Number validation
@IsNumber()
@Min(0)
@Max(1000)
price: number;

// Email validation
@IsEmail()
email: string;

// Enum validation
@IsEnum(Status)
status: Status;

// Date validation
@IsDate()
@Type(() => Date)
createdAt: Date;

// Array validation
@IsArray()
@ValidateNested({ each: true })
items: ItemDto[];

// Optional field
@IsOptional()
@IsString()
description?: string;

// Custom validation
@Validate(CustomValidator)
customField: string;
```

### 2. Custom Validator

```typescript
// validators/custom-validators.ts
import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'isPhoneNumber', async: false })
export class IsPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phone: string) {
    return /^(\+90|0)?[1-9]\d{9}$/.test(phone);
  }

  defaultMessage() {
    return 'Gecersiz telefon numarasi';
  }
}

// Kullanim
@Column()
@Validate(IsPhoneNumberConstraint)
phone: string;
```

---

## API ve Güvenlik Kurallari

### 1. DTO ile Veri Kontrolü

Tüm gelen ve giden veriler mutlaka DTO ile kontrol edilmelidir:

```typescript
// DO - Gelen veriyi DTO ile validate et
// dto/create-order.dto.ts
export class CreateOrderDto {
  @ApiProperty({ description: 'Masa ID' })
  @IsString()
  @IsNotEmpty()
  tableId: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

// Controller'da kullanım
@Post()
async create(@Body() dto: CreateOrderDto, @GetUser() user: User) {
  return this.service.create(dto, user);
}

// DO NOT - Any tip veya validasyon olmadan
@Post()
async create(@Body() body: any) {  // YANLIŞ!
  return this.service.create(body);
}
```

### 2. Standart Response Format

Tüm API response'ları standart formatta dönmelidir:

```typescript
// common/interceptors/transform.interceptor.ts
export interface StandardResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

// Response örnekleri:
// Başarılı - Tekil kayıt
{
  "success": true,
  "data": { "id": "1", "name": "Ürün" },
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Başarılı - Liste
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 10
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Başarılı - Mesaj ile
{
  "success": true,
  "data": { "id": "1" },
  "message": "Sipariş başarıyla oluşturuldu",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. SQL Injection Koruması

```typescript
// DO - Parameterized queries kullan
const qb = this.repository.createQueryBuilder('order')
  .where('order.restaurantId = :restaurantId', { restaurantId })
  .andWhere('order.status = :status', { status });

// DO - TypeORM'un built-in metodları
const orders = await this.repository.find({
  where: { restaurantId, status },
});

// DO NOT - String concatenation
const orders = await this.repository.query(
  `SELECT * FROM orders WHERE restaurant_id = '${restaurantId}'`  // TEHLİKELİ!
);

// DO NOT - Raw user input
const qb = this.repository.createQueryBuilder('order');
qb.where(`order.status = '${userInput}'`);  // TEHLİKELİ!

// DO - Input sanitization
import { sanitize } from 'class-sanitizer';

export class SearchDto {
  @IsString()
  @MaxLength(100)
  @Sanitize()
  query: string;
}
```

### 4. Controller'da Logic Geliştirmeme

Controller'lar sadece request/response yönetimi yapmalı, iş mantığı service'e gönderilmelidir:

```typescript
// DO - Controller sadece yönlendirme yapar
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(@Body() dto: CreateOrderDto, @GetUser() user: User) {
    // Controller'da logic YOK - sadece service'e yönlendir
    return this.ordersService.createOrder(dto, user);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @GetUser() user: User,
  ) {
    return this.ordersService.updateOrderStatus(id, dto.status, user);
  }
}

// DO NOT - Controller'da iş mantığı
@Post()
async create(@Body() dto: CreateOrderDto, @GetUser() user: User) {
  // YANLIŞ - Controller'da logic olmamalı!
  const table = await this.tableRepo.findOne({ where: { id: dto.tableId } });
  if (!table) throw new NotFoundException('Masa bulunamadı');
  
  const order = this.orderRepo.create({
    ...dto,
    table,
    restaurantId: user.restaurantId,
  });
  
  const saved = await this.orderRepo.save(order);
  await this.notificationService.sendNotification(...);
  
  return saved;
}

// DO - Service'te iş mantığı
// orders.service.ts
@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    private tableService: TablesService,
    private notificationService: NotificationsService,
  ) {}

  async createOrder(dto: CreateOrderDto, user: User): Promise<Order> {
    // Tüm iş mantığı service'te
    const table = await this.tableService.validateAndGet(dto.tableId, user.restaurantId);
    
    const order = this.orderRepo.create({
      ...dto,
      table,
      restaurantId: user.restaurantId,
      createdBy: user.id,
    });
    
    const savedOrder = await this.orderRepo.save(order);
    
    // Bildirim gönder
    await this.notificationService.notifyNewOrder(savedOrder);
    
    return savedOrder;
  }
}
```

### 5. Error Handler Kuralları

```typescript
// DO - Service'te hata fırlat
async findOne(id: string): Promise<Order> {
  const order = await this.repository.findOne({ where: { id } });
  
  if (!order) {
    throw new NotFoundException('Sipariş bulunamadı');
  }
  
  return order;
}

// DO - Business logic hataları için özel exception
export class InsufficientStockException extends BadRequestException {
  constructor(itemName: string, available: number, requested: number) {
    super(
      `Yetersiz stok: ${itemName}. Mevcut: ${available}, İstenen: ${requested}`,
      'INSUFFICIENT_STOCK'
    );
  }
}

// Kullanım
if (stock.quantity < dto.quantity) {
  throw new InsufficientStockException(item.name, stock.quantity, dto.quantity);
}

// DO - Global exception filter
@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Beklenmeyen bir hata oluştu';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      
      if (typeof response === 'object' && response !== null) {
        message = (response as any).message || message;
        errorCode = (response as any).error || errorCode;
      } else {
        message = response as string;
      }
    }

    // Log error
    this.logger.error({
      path: request.url,
      method: request.method,
      status,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // Standard error response
    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message: Array.isArray(message) ? message[0] : message,
        details: Array.isArray(message) ? message : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

// DO NOT - Sessiz hata yutma
async createOrder(dto: CreateOrderDto) {
  try {
    return await this.repository.save(dto);
  } catch (error) {
    // YANLIŞ - Hata yutuluyor, log yok, bildirim yok
    return null;
  }
}

// DO - Proper error handling
async createOrder(dto: CreateOrderDto) {
  try {
    return await this.repository.save(dto);
  } catch (error) {
    this.logger.error('Order creation failed', error);
    throw new InternalServerErrorException('Sipariş oluşturulamadı');
  }
}
```

### 6. Request Validation Pipeline

```typescript
// main.ts - Global validation pipe
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // DTO'da olmayan alanları sil
    forbidNonWhitelisted: true, // DTO'da olmayan alan varsa hata ver
    transform: true,           // Otomatik tip dönüşümü
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);

// Örnek: Gelen request
// { "name": "Test", "extraField": "value", "price": "100" }

// DTO
export class CreateItemDto {
  @IsString()
  name: string;

  @IsNumber()
  price: number;
  // extraField yok
}

// ValidationPipe sonrası:
// { "name": "Test", "price": 100 }  // extraField silindi, price number'a dönüştü
```

---

## Authentication & Authorization Kurallari

### 1. Guard Kullanimi

```typescript
// JwtAuthGuard - Tüm auth gerekli endpoint'ler
@UseGuards(JwtAuthGuard)

// RolesGuard - Rol bazli erisim
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager', 'admin')

// SuperAdminGuard - Super admin erisimi
@UseGuards(SuperAdminGuard)
```

### 2. Custom Decorator'ler

```typescript
// Kullanici bilgisi almak
@GetUser() user: User

// Public endpoint
@Public()
@Post('login')

// Rol kontrolü
@Roles('manager', 'admin')
```

### 3. Permission Matrix

| Rol | Izinler |
|-----|---------|
| super_admin | Tüm izinler |
| manager | Restoran yönetimi, raporlar |
| waiter | Siparis olusturma/görüntüleme |
| kitchen | Siparis durumu güncelleme |
| cashier | Ödeme islemleri |

---

## Database Kurallari

### 1. Query Builder Kullanimi

```typescript
// DO - Query Builder
const qb = this.repository.createQueryBuilder('order')
  .leftJoinAndSelect('order.items', 'items')
  .leftJoinAndSelect('items.menuItem', 'menuItem')
  .where('order.restaurantId = :restaurantId', { restaurantId })
  .orderBy('order.createdAt', 'DESC');

// DO NOT - Raw query (gerekmedikçe)
await this.repository.query('SELECT * FROM orders');
```

### 2. Transaction Kullanimi

```typescript
// Transactional decorator
@Transactional()
async createOrder(dto: CreateOrderDto): Promise<Order> {
  // Siparis olustur
  const order = await this.orderRepository.save(orderData);
  
  // Stok düs
  await this.inventoryService.decreaseStock(items);
  
  // Herhangi bir hata durumunda otomatik rollback
  return order;
}

// Manuel transaction
async createOrderWithTransaction(dto: CreateOrderDto): Promise<Order> {
  return this.dataSource.transaction(async (manager) => {
    const order = await manager.save(Order, orderData);
    await manager.save(StockMovement, movementData);
    return order;
  });
}
```

### 3. Index Kullanimi

```typescript
// Entity'de index tanimi
@Entity('orders')
@Index('idx_orders_restaurant_status', ['restaurantId', 'status'])
@Index('idx_orders_created_at', ['createdAt'])
export class Order extends BaseEntity {
  // ...
}
```

---

## Error Handling Kurallari

### 1. Exception Tipleri

```typescript
// NotFoundException - Kayit bulunamadi
throw new NotFoundException('Siparis bulunamadi');

// BadRequestException - Gecersiz istek
throw new BadRequestException('Gecersiz veri');

// UnauthorizedException - Auth hatasi
throw new UnauthorizedException('Gecersiz token');

// ForbiddenException - Yetkisiz erisim
throw new ForbiddenException('Bu isleme yetkiniz yok');

// ConflictException - Çakisma
throw new ConflictException('Bu kayit zaten mevcut');
```

### 2. Custom Exception

```typescript
// exceptions/business.exception.ts
export class BusinessException extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'BusinessException';
  }
}

// Kullanim
if (stock < quantity) {
  throw new BusinessException('Yetersiz stok', 'INSUFFICIENT_STOCK');
}
```

### 3. Exception Filter

```typescript
// filters/all-exception.filter.ts
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;
    
    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Beklenmeyen hata';
    
    response.status(status).json({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## WebSocket Kurallari

### 1. Gateway Yapisi

```typescript
// notifications.gateway.ts
@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const restaurantId = client.handshake.query.restaurantId;
    client.join(`restaurant:${restaurantId}`);
  }

  handleDisconnect(client: Socket) {
    // Cleanup
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurant_id: string },
  ) {
    client.join(`restaurant:${data.restaurant_id}`);
  }

  // Event emit
  emitToRestaurant(restaurantId: string, event: string, data: any) {
    this.server.to(`restaurant:${restaurantId}`).emit(event, data);
  }
}
```

### 2. Event Naming

| Event | Direction | Açiklama |
|-------|-----------|----------|
| `order_created` | Server -> Client | Yeni siparis |
| `order_updated` | Server -> Client | Siparis güncelleme |
| `order_item_updated` | Server -> Client | Siparis kalemi güncelleme |
| `table_updated` | Server -> Client | Masa durumu |
| `notification` | Server -> Client | Genel bildirim |

---

## Message Queue Kurallari

### 1. Producer

```typescript
// Mail gönderme
@Injectable()
export class MailService {
  constructor(
    @InjectQueue('mail_queue') private mailQueue: Queue,
  ) {}

  async sendWelcomeEmail(user: User) {
    await this.mailQueue.add('send-welcome', {
      to: user.email,
      name: user.name,
    });
  }
}
```

### 2. Consumer

```typescript
// mail.consumer.ts
@Processor('mail_queue')
export class MailConsumer {
  constructor(private mailService: MailService) {}

  @Process('send-welcome')
  async handleWelcomeEmail(job: Job<WelcomeEmailData>) {
    await this.mailService.sendMail({
      to: job.data.to,
      subject: 'Hosgeldiniz',
      template: 'welcome',
      context: { name: job.data.name },
    });
  }
}
```

---

## Caching Kurallari

### 1. Cache Key Convention

```
restaurant:{id}:menu          # Menü cache
restaurant:{id}:context       # Restoran context
session:{token}               # Session cache
user:{id}:permissions         # Kullanici izinleri
```

### 2. Cache Interceptor

```typescript
@Get()
@UseInterceptors(CacheInterceptor)
@CacheKey('restaurant_menu')
@CacheTTL(900)  // 15 dakika
async getMenu() {
  return this.menuService.findAll();
}
```

### 3. Cache Invalidation

```typescript
async updateMenuItem(id: string, dto: UpdateMenuItemDto) {
  const item = await this.repository.save({ id, ...dto });
  
  // Cache temizle
  await this.cacheManager.del(`restaurant:${item.restaurantId}:menu`);
  
  return item;
}
```

---

## Testing Kurallari

### 1. Unit Test

```typescript
// [module].service.spec.ts
describe('ModuleService', () => {
  let service: ModuleService;
  let repository: MockType<Repository<Entity>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ModuleService,
        { provide: getRepositoryToken(Entity), useFactory: repositoryMockFactory },
      ],
    }).compile();

    service = module.get(ModuleService);
    repository = module.get(getRepositoryToken(Entity));
  });

  it('should find all entities', async () => {
    const entities = [{ id: '1', name: 'Test' }];
    repository.find.mockResolvedValue(entities);

    expect(await service.findAll()).toEqual(entities);
  });
});
```

### 2. E2E Test

```typescript
// test/[module].e2e-spec.ts
describe('ModuleController (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    // Setup app and get auth token
  });

  it('/endpoint (GET)', () => {
    return request(app.getHttpServer())
      .get('/endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
```

---

## Git Commit Kurallari

### Commit Message Format

```
type(scope): subject

[optional body]

[optional footer]
```

### Type'lar

| Type | Açiklama |
|------|----------|
| feat | Yeni özellik |
| fix | Bug düzeltme |
| docs | Dokümantasyon |
| style | Formatlama |
| refactor | Kod düzeltme |
| test | Test ekleme |
| chore | Bakim isleri |
| perf | Performans |
| ci | CI/CD |

### Örnekler

```
feat(orders): add order status update endpoint

- Add PATCH /orders/:id/status endpoint
- Add validation for status transitions
- Add WebSocket event emission

Closes #123
```

```
fix(inventory): fix stock calculation for negative values

Stock was incorrectly calculated when negative
movements exceeded current stock.

Fixes #456