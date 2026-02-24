# Gelişmiş Ödeme ve Cari Takip (Checkout) Planı

## 📋 Mevcut Durum Analizi

### Backend Mevcut Yapı
| Modül | Durum | Notlar |
|--------|--------|--------|
| `Payment` Entity | ⚠️ Geliştirilmeli | Sadece CASH, CREDIT_CARD - OPEN_ACCOUNT eklenmeli |
| `Order` Entity | ✅ Hazır | `customerId` alanı zaten mevcut |
| `Customer` Entity | ⚠️ Geliştirilmeli | `total_spent` var, borç takibi + limit eklenmeli |
| `CashService` | ✅ Hazır | Ödeme tamamlandığında otomatik CashMovement kaydediyor |
| `NotificationsGateway` | ✅ Hazır | Socket.io ile real-time event'ler |
| `PaymentsService` | ⚠️ Geliştirilmeli | Split payment desteği yok |

### Frontend Mevcut Yapı
| Modül | Durum | Notlar |
|--------|--------|--------|
| `PosBasket` | ⚠️ Geliştirilmeli | Ödeme butonu var ama ödeme akışı yok |
| `usePosStore` | ⚠️ Geliştirilmeli | Ödeme state'i yok |
| `useSocketStore` | ✅ Hazır | Restaurant bazlı real-time bağlantı |
| `orders/types.ts` | ⚠️ Geliştirilmeli | `PaymentMethod` enum güncellenmeli |
| Customer Module | ❌ Yok | Oluşturulması gerekiyor |

---

## 🎯 Hedeflenen Özellikler

### 1. Açık Hesap (Open Account) Desteği
- **PaymentMethod** enum'a `OPEN_ACCOUNT` ekle
- **Customer** entity'ye borç takip alanları ekle
- **Payment** entity'ye `customerId` ilişkisi ekle

### 2. Parçalı Ödeme (Split Payment)
- Tek sipariş için birden fazla ödeme kaydı
- Kullanıcı toplam tutarı bölebilir
- Anlık "Kalan Tutar" hesaplaması

### 3. Müşteri Entegrasyonu
- Müşteri arama/seçim bileşeni
- Otomatik müşteri tespiti (masada tanımlıysa)
- Borç onay uyarısı
- **Kredi Limit Kontrolü** - Limit aşımında uyarı

### 4. Ödeme Özet Kartı
- Ara Toplam, İndirim/İkram, Ödenen, Kalan gösterimi
- **Nakit Üstü** hesaplayıcı

### 5. Socket Entegrasyonu (Real-Time)
- Ödeme tamamlandığında tüm cihazlara bildirim
- Masa durumu anında güncellenir
- Sepetler diğer cihazlarda temizlenir

### 6. Mobil Uyumluluk
- Bottom Sheet yapısı
- Quick NumPad
- Swipe to delete

---

## 📐 Mimari Akış Diyagramı

```mermaid
graph TB
    subgraph "Frontend - POS Terminal"
        A[PosBasket] --> B[Ödeme Butonu Tıklanır]
        B --> C{PaymentModal Açılır}
        
        C --> D[Ödeme Yöntemi Seçimi]
        D --> E{CASH / CREDIT_CARD}
        D --> F{OPEN_ACCOUNT}
        
        E --> G[→ Ödeme Tutarı + "Alınan" Inputu]
        F --> H[→ Müşteri Seçimi + Limit Kontrolü]
        
        H --> I[Müşteri Arama Input]
        I --> J{Müşteri Bulundu?}
        J -->|Evet| K[Seçili Müşteri + Borç Bilgisi]
        J -->|Hayır| L[Yeni Müşteri Ekle]
        L --> K
        
        K --> M[Parçalı Ödeme Ekle]
        G --> M
        M --> N[PaymentSummaryCard]
        
        N --> O{Toplam == Ödenen?}
        O -->|Hayır| P[Kalan Tutar Göster]
        O -->|Evet| Q[Ödemeyi Tamamla Aktif]
        
        Q --> R[Backend API: POST /payments/split]
        
        R --> S[Transaction Başlar]
        S --> T[Payment Kayıtları Oluştur]
        T --> U[Customer Borç Güncelle (Limit Kontrolü)]
        U --> V[Order Status → PAID]
        V --> W[CashMovement Otomatik Kaydet]
        W --> X[Transaction Commit]
        
        X --> Y[Socket Broadcast]
        Y --> Z[table:available → Tüm cihazlar]
        Y --> AA[customer:debt-updated → Muhasebe]
    end
    
    subgraph "Backend - Socket Events"
        Y --> AB[NotificationsGateway]
        AB --> AC[Server.to(restaurantId).emit]
        AC --> AD["table:available" event]
        AC --> AE["payment:completed" event]
        AC --> AF["customer:debt-updated" event]
    end
```

---

## 🗂️ Veritabanı Şeması Değişiklikleri

### 1. Payment Entity Güncellemesi

```typescript
// backend/src/modules/payments/entities/payment.entity.ts

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  DIGITAL_WALLET = 'digital_wallet',
  BANK_TRANSFER = 'bank_transfer',
  OPEN_ACCOUNT = 'open_account',  // ← YENİ
}

export enum DiscountType {
  DISCOUNT = 'discount',    // İskonto (Dost indirimi vs.)
  COMPLIMENTARY = 'complimentary',  // İkram (Mutfak hatası vs.)
}

@Entity('payments', { schema: 'operations' })
export class Payment extends BaseEntity {
  @Column()
  order_id: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'uuid', nullable: true })  // ← YENİ
  customer_id: string | null;

  @ManyToOne(() => Customer, { nullable: true })  // ← YENİ
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  payment_method: PaymentMethod;

  // ===== YENİ ALANLAR =====
  
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cash_received: number | null;  // Nakit ödemede alınan tutar

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  change_given: number | null;  // Para üstü

  @Column({ 
    type: 'enum', 
    enum: DiscountType, 
    nullable: true 
  })
  discount_type: DiscountType | null;  // İSKONTO vs İKRAM

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'text', nullable: true })
  discount_reason: string;  // İndirim nedeni (muhasebe için)

  @Column({ type: 'uuid', nullable: true })
  original_payment_id: string;  // Refund için orijinal ödeme
}
```

### 2. Customer Entity Güncellemesi

```typescript
// backend/src/modules/customers/entities/customer.entity.ts

@Entity('customers', { schema: 'business' })
export class Customer extends BaseEntity {
  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ unique: true })
  @Index()
  phone: string;

  // ... mevcut alanlar

  // ===== YENİ ALANLAR =====
  
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_debt: number;  // Toplam borç (tarihsel)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  current_debt: number;  // Mevcut borç (ödenmemiş)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  credit_limit: number;  // Kredi limiti (opsiyonel, 0 = limitsiz)

  @Column({ type: 'boolean', default: false })
  credit_limit_enabled: boolean;  // Limit kontrolü aktif mi?

  @Column({ name: 'max_open_orders', type: 'int', default: 5 })
  max_open_orders: number;  // Maksimum açık sipariş sayısı
}
```

---

## 📋 Backend API Değişiklikleri

### 1. DTO'lar

```typescript
// backend/src/modules/payments/dto/create-split-payment.dto.ts

export class CreateSplitPaymentDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsUUID()
  @IsNotEmpty()
  order_id: string;

  @ApiProperty({ type: [PaymentTransactionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentTransactionDto)
  payments: PaymentTransactionDto[];

  @ApiPropertyOptional({ enum: DiscountType })
  @IsEnum(DiscountType)
  @IsOptional()
  discount_type?: DiscountType;

  @ApiPropertyOptional({ example: 'Doğum günü indirimi' })
  @IsString()
  @IsOptional()
  discount_reason?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discount_amount?: number;
}

export class PaymentTransactionDto {
  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiPropertyOptional({ example: 'uuid-of-customer' })
  @IsUUID()
  @IsOptional()
  customer_id?: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsNumber()
  @IsOptional()
  cash_received?: number;  // Nakit ödemede alınan

  @ApiPropertyOptional({ example: 'Nakit üzeri' })
  @IsString()
  @IsOptional()
  notes?: string;
}
```

```typescript
// backend/src/modules/payments/dto/revert-payment.dto.ts

export class RevertPaymentDto {
  @ApiProperty({ example: 'uuid-of-payment' })
  @IsUUID()
  @IsNotEmpty()
  payment_id: string;

  @ApiProperty({ example: 'Yanlış ödeme yöntemi' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ example: 'uuid-of-admin' })
  @IsUUID()
  @IsOptional()
  approved_by?: string;
}
```

### 2. PaymentsService (Socket Dahil)

```typescript
// backend/src/modules/payments/payments.service.ts

import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly eventEmitter: EventEmitter2,  // ← Socket için
    // ... diğer services
  ) {}

  // Yuvarlama hatası önleme
  private toCents(amount: number): number {
    return Math.round(amount * 100);
  }

  private fromCents(cents: number): number {
    return cents / 100;
  }

  async createSplitPayment(
    createSplitPaymentDto: CreateSplitPaymentDto,
    userId?: string
  ): Promise<Payment[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1-7. (Mevcut işlemler - indirim, ödeme kayıtları, sipariş güncelleme...)
      
      await queryRunner.commitTransaction();

      // ==== SOCKET BROADCAST ====
      
      // Event 1: Ödeme tamamlandı
      this.eventEmitter.emit('payment.completed', {
        tableId: order.table?.id,
        restaurantId: order.restaurantId,
        orderId: order.id,
        amount: savedPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        paymentMethod: 'split',
        userId: userId || order.userId,
      });

      // Event 2: Masa müsait oldu
      if (order.table) {
        this.eventEmitter.emit('table.status.changed', {
          tableId: order.table.id,
          restaurantId: order.restaurantId,
          oldStatus: TableStatus.OCCUPIED,
          newStatus: TableStatus.AVAILABLE,
        });
      }

      // Event 3: Müşteri borcu güncellendi (OPEN_ACCOUNT için)
      const openAccountPayments = savedPayments.filter(
        p => p.payment_method === PaymentMethod.OPEN_ACCOUNT
      );
      if (openAccountPayments.length > 0) {
        this.eventEmitter.emit('customer.debt.updated', {
          restaurantId: order.restaurantId,
          customerIds: [...new Set(openAccountPayments.map(p => p.customer_id).filter(Boolean))],
        });
      }

      return savedPayments;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
```

### 3. NotificationsGateway Güncellemesi

```typescript
// backend/src/modules/notifications/notifications.gateway.ts

// Mevcut metodlara ekle:

notifyPaymentCompleted(restaurantId: string, data: {
  tableId: string;
  orderId: string;
  amount: number;
  paymentMethod: string;
}) {
  this.server.to(restaurantId).emit('payment:completed', data);
}

notifyTableAvailable(restaurantId: string, tableId: string) {
  this.server.to(restaurantId).emit('table:available', { tableId });
}

notifyCustomerDebtUpdated(restaurantId: string, customerIds: string[]) {
  this.server.to(restaurantId).emit('customer:debt-updated', { customerIds });
}
```

---

## 📋 Frontend Yapı Değişiklikleri

### 1. Socket Event Handling

```typescript
// web/modules/orders/hooks/useOrdersLogic.ts - Güncelleme

useEffect(() => {
  if (!restaurantId) return;

  connect(restaurantId);

  // ==== YENİ: Ödeme sonrası masayı müsait yap ====
  const handleTableAvailable = (data: { tableId: string }) => {
    console.log('[Socket] Table available:', data.tableId);
    
    // Masa müsait oldu, sepeti temizle
    if (selectedTable?.id === data.tableId) {
      clearBasket();
    }
    
    // Masa durumunu güncelle
    setTables(prev => prev.map(t => 
      t.id === data.tableId ? { ...t, status: TableStatus.AVAILABLE } : t
    ));
  };

  // ==== YENİ: Müşteri borcu güncellendi ====
  const handleDebtUpdated = (data: { customerIds: string[] }) => {
    console.log('[Socket] Customer debt updated:', data.customerIds);
    // Müşteri paneli varsa burada güncelle
  };

  on('table:available', handleTableAvailable);
  on('customer:debt-updated', handleDebtUpdated);

  return () => {
    off('table:available');
    off('customer:debt-updated');
    disconnect();
  };
}, [restaurantId, selectedTable?.id]);
```

### 2. PaymentModal (Mobil Uyumlu)

```typescript
// web/modules/orders/components/PaymentModal.tsx

interface PaymentModalProps {
  // ... mevcut props
  isMobile?: boolean;  // ← YENİ
}

// Mobil için Bottom Sheet variant
export function PaymentModal({
  isMobile = false,
  ...props
}: PaymentModalProps) {
  // ... mevcut state'ler

  const content = (
    <div className="space-y-4">
      {/* İndirim Bölümü */}
      <DiscountSection />

      {/* Ödeme Satırları */}
      <div className="space-y-2">
        {payments.map((payment) => (
          <PaymentLineItem
            key={payment.id}
            payment={payment}
            onUpdate={updatePaymentLine}
            onDelete={removePaymentLine}
            isMobile={isMobile}  // ← Swipe to delete için
          />
        ))}
      </div>

      {/* Mobil: Para üstü sticky footer */}
      {isMobile && (
        <div className="sticky bottom-0 bg-bg-surface border-t p-4">
          <PaymentSummaryCard ... />
        </div>
      )}

      {/* Desktop: Normal */}
      {!isMobile && <PaymentSummaryCard ... />}
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      {content}
    </Modal>
  );
}

// ==== YENİ: Swipe to Delete Wrapper ====
function PaymentLineItem({ payment, onDelete, isMobile }) {
  const [swipeX, setSwipeX] = useState(0);

  if (isMobile) {
    return (
      <div 
        className="relative overflow-hidden"
        onTouchMove={(e) => setSwipeX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (swipeX < -100) onDelete(payment.id);  // Sola kaydır = sil
        }}
      >
        <div className="bg-danger-main w-16 absolute right-0 h-full flex items-center justify-center">
          <Trash2 size={20} />
        </div>
        <PaymentLineContent payment={payment} />
      </div>
    );
  }

  return <PaymentLineContent payment={payment} />;
}
```

### 3. Quick NumPad Bileşeni (Mobil)

```typescript
// web/modules/shared/components/QuickNumPad.tsx

interface QuickNumPadProps {
  value: string;
  onChange: (value: string) => void;
  onDone: () => void;
  currency?: string;
}

export function QuickNumPad({
  value,
  onChange,
  onDone,
  currency = '₺'
}: QuickNumPadProps) {
  const handlePress = (num: string) => {
    onChange(value + num);
  };

  const handleClear = () => {
    onChange('');
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', '⌫'],
  ];

  return (
    <div className="bg-bg-surface border rounded-lg p-2">
      {/* Display */}
      <div className="text-right p-4 bg-bg-muted rounded mb-2">
        <span className="text-2xl font-black">
          {value || '0'}{currency}
        </span>
      </div>

      {/* Buttons - Büyük ve kolay tıklanabilir */}
      <div className="grid grid-cols-3 gap-2">
        {buttons.flat().map((btn) => (
          <button
            key={btn}
            onClick={() => {
              if (btn === 'C') handleClear();
              else if (btn === '⌫') handleBackspace();
              else handlePress(btn);
            }}
            className={cn(
              "h-14 text-lg font-bold rounded",
              btn === 'C' && "bg-danger-main/10 text-danger-main",
              btn === '⌫' && "bg-warning-main/10 text-warning-main",
              !['C', '⌫'].includes(btn) && "bg-primary-main/10 text-primary-main"
            )}
          >
            {btn}
          </button>
        ))}
      </div>

      {/* Done button */}
      <Button 
        variant="primary" 
        className="w-full mt-2 h-12"
        onClick={onDone}
      >
        TAMAM
      </Button>
    </div>
  );
}
```

---

## ✅ Yapılacaklar Listesi

### Backend
- [ ] PaymentMethod enum'a `OPEN_ACCOUNT` ekle
- [ ] `DiscountType` enum oluştur
- [ ] Payment entity'ye alanları ekle (`customer_id`, `cash_received`, `change_given`, `discount_type`, `discount_reason`, `original_payment_id`)
- [ ] Customer entity'ye borç alanları ekle (`total_debt`, `current_debt`, `credit_limit`, `credit_limit_enabled`)
- [ ] `CreateSplitPaymentDto` oluştur (güncellenmiş)
- [ ] `RevertPaymentDto` oluştur
- [ ] `PaymentsService.createSplitPayment()` metodunu ekle (limit kontrolü + cents + socket)
- [ ] `PaymentsService.revertPayment()` metodunu ekle
- [ ] `CustomersService.updateDebt()` metodunu ekle
- [ ] `NotificationsGateway`'e yeni event'ler ekle
- [ ] Migration dosyası oluştur

### Frontend - Core
- [ ] `PaymentMethod` enum'ı güncelle
- [ ] `DiscountType` enum oluştur
- [ ] `PAYMENT_METHOD_LABELS` ve `DISCOUNT_TYPE_LABELS` ekle
- [ ] Customer module oluştur (`types.ts`, `services/`, `components/`)
- [ ] `CustomerSelector` bileşenini oluştur (borç bilgisi gösterimi)
- [ ] `PaymentModal` bileşenini oluştur (nakit üstü, indirim/ikram)
- [ ] `PaymentSummaryCard` bileşenini oluştur
- [ ] `paymentService.createSplit()` metodunu ekle
- [ ] `paymentService.revert()` metodunu ekle
- [ ] `PosBasket`'i ödeme butonu ile güncelle

### Frontend - Socket & Mobil
- [ ] `useOrdersLogic`'e socket event listener'ları ekle (`table:available`, `customer:debt-updated`)
- [ ] Masa müsait olduğunda sepeti otomatik temizle
- [ ] PaymentModal için `isMobile` prop ve Bottom Sheet entegrasyonu
- [ ] QuickNumPad bileşenini oluştur (mobil için)
- [ ] PaymentLineItem için Swipe to Delete ekle
- [ ] Mobilde Para Üstü hesaplayıcıyı sticky footer yap
- [ ] `useSocketStore`'a yeni event'leri ekle

---

## 🔄 İş Akışı Senaryoları

### Senaryo 1: Nakit Ödeme + Real-Time Sync
```
1. Garson masada 1000 TL nakit alır
2. "Alınan: 1200" girer → Para üstü: 200 TL
3. Ödemeyi tamamlar
4. Backend: Payment kaydı + CashMovement
5. Socket: "table:available" → Tüm cihazlara
6. Mutfak ekranı: Masa yeşil oldu ✓
7. Diğer POS: Masa müsait, sepet temizlendi ✓
```

### Senaryo 2: Açık Hesap + Borç Bildirimi
```
1. Müşteri açık hesapla ödemek istiyor
2. Müşteri seçilir, limit kontrolü geçer
3. Ödeme tamamlanır
4. Backend: Payment + Customer.current_debt güncellenir
5. Socket: "customer:debt-updated"
6. Muhasebe paneli: Müşteri borcu güncellendi alert ✓
```

### Senaryo 3: Mobil Hızlı Ödeme
```
1. Garson mobil cihazda ödemeyi açar
2. Bottom Sheet açılır (tam ekran)
3. Nümerik pad ile hızlı tutar girişi
4. Nakit seçili → Alınan: 500 (butona basılır)
5. Para üstü: Otomatik hesaplanır
6. Swipe ile gereksiz ödeme satırını siler
7. TAMAM butonu → Ödeme tamamlanır
8. Masa yeşil olur, garson bir sonraki müşteriye geçer
```

---

## 🎨 Socket Event Tanımları

| Event | Direction | Payload | Açıklama |
|-------|-----------|---------|----------|
| `payment:completed` | Server→Client | `{ tableId, orderId, amount }` | Ödeme tamamlandı |
| `table:available` | Server→Client | `{ tableId }` | Masa boşaldı |
| `customer:debt-updated` | Server→Client | `{ customerIds[] }` | Borç güncellendi |
| `table:status-changed` | Server→Client | `{ tableId, status }` | Masa durumu değişti |

---

## 📝 Notlar

### Socket Entegrasyonu (Zaten Mevcut!)
- `NotificationsGateway` - Restaurant bazlı room'lara emit
- `useSocketStore` - Frontend'de event dinleme
- Ödeme sonrası event'ler mevcut yapıya entegre edilecek

### Mobil UX
- Bottom Sheet: `react-bottom-sheet` veya custom
- Swipe: `react-native-gesture-handler` veya `use-swipe-action`
- Nümerik Pad: Custom component, sistem klavyesi yerine

### Kasa Entegrasyonu (Zaten Mevcut!)
- `CashService.handlePaymentCompleted()` otomatik çalışır
- OPEN_ACCOUNT kasaya eklenmez
- Para üstü kasaya eklenmez

---

## 📅 Öncelik Sıralaması

| Öncelik | Özellik | Açıklama |
|---------|---------|-----------|
| 1 | OPEN_ACCOUNT + Entity | Altyapı |
| 2 | Split payment + limit + cents | API + Business Logic |
| 3 | İndirim/İkram | Muhasebe |
| 4 | Nakit üstü | UX |
| 5 | Socket entegrasyonu | Real-time |
| 6 | PaymentSummaryCard | UI |
| 7 | PaymentModal | UI |
| 8 | CustomerSelector | UI |
| 9 | Mobil UX (NumPad, Swipe) | UX |
| 10 | Payment Revert | İşlevsellik |
| 11 | Frontend entegrasyon | Son adım |

---

*Plan versiyonu: 3.0 (Final Revize)*  
*Güncelleme tarihi: 2026-02-24*  
*Eklenen: Socket entegrasyonu, Mobil uyumluluk, Quick NumPad, Swipe to delete*
