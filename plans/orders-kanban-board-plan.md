# Orders Kanban Board Module Plan

## Executive Summary

Bu plan, Restaurant Management System (RMS) için Kanban tarzı bir sipariş yönetim paneli oluşturulmasını kapsamaktadır. Mevcut POS modülünden bağımsız, siparişlerin durumlarını görsel olarak takip edebileceğimiz ve hızlıca güncelleyebileceğimiz bir modül hedeflenmektedir.

---

## Mevcut Durum Analizi

### Mevcut Yapı

```
web/app/
├── (main)/
│   ├── cash/page.tsx           ✓ Server Component yapısı
│   ├── dashboard/page.tsx      ✓ Server Component yapısı
│   ├── products/page.tsx        ✓ Server Component yapısı
│   ├── tables/page.tsx         ✓ Server Component yapısı
│   ├── inventory/page.tsx       ✓ Server Component yapısı
│   └── orders/
│       └── pos/[tableId]/page.tsx  # POS - mevcut
```

### Sidebar Durumu

```typescript
// Sidebar.tsx - MENU_ITEMS
{ icon: Receipt, label: 'SİPARİŞLER', href: '/orders' }
```

- `/orders` rotası için mevcut bir sayfa YOK
- POS (`/orders/pos/[tableId]`) mevcut ama Kanban tarzı değil
- Kanban board modülü bu boşluğu dolduracak

### Mevcut Orders Types (Referans)

```typescript
// web/modules/orders/types.ts
export enum OrderStatus {
  PENDING = 'pending',      // Beklemede
  PREPARING = 'preparing',  // Hazırlanıyor
  READY = 'ready',         // Hazır
  SERVED = 'served',       // Servis Edildi
  PAID = 'paid',           // Ödendi
  ON_WAY = 'on_way',       // Yolda
  DELIVERED = 'delivered', // Teslim Edildi
  CANCELLED = 'cancelled', // İptal Edildi
}
```

---

## Hedeflenen Yapı

### URL Yapısı

```
/orders                    # Kanban Board (Ana sipariş yönetimi)
/orders/pos/[tableId]      # Mevcut POS (Değişiklik yok)
```

### Klasör Yapısı (Kurallara Uygun)

```
web/app/(main)/orders/
├── page.tsx                    # Server Component - SADECE data fetching

web/modules/orders/
├── types.ts                    # ✓ Mevcut - güncellenecek
├── services.ts                 # ✓ Mevcut - güncellenecek
├── utils/
│   └── order-group.ts         # OrderGroup helper (server-side)
├── hooks/
│   ├── useOrdersBoard.ts       # Board mantığı (client-state)
│   └── useOrdersSocket.ts      # Real-time güncellemeler
└── components/
    ├── OrdersBoardClient.tsx   # Client Component - ana mantık
    ├── KanbanBoard.tsx         # Board container (sütunlar)
    ├── KanbanColumn.tsx        # Tek sütun (status bazlı)
    ├── OrderCard.tsx           # Sipariş kartı
    ├── OrderQuickActions.tsx   # Hızlı aksiyonlar (dropdown)
    ├── OrderDetailDrawer.tsx   # Sipariş detay çekmecesi
    ├── BoardFilters.tsx        # Filtreler (tarih, tip, masa)
    └── index.ts                # Export barrel
```

**Önemli:** Component'ler module içinde kalacak, app klasörü sadece server-side data fetching yapacak.

---

## Kanban Sütun Yapısı

### Dine-In (Yemek İçi)

| Sütun | Status | Renk | İkon |
|-------|--------|------|------|
| Yeni Siparişler | `pending` | Sarı/Orange | Clock |
| Hazırlanıyor | `preparing` | Mavi | ChefHat |
| Hazır | `ready` | Yeşil | Check |
| Servis Edildi | `served` | Mor | Utensils |

### Paket Servis / Teslimat

| Sütun | Status | Renk | İkon |
|-------|--------|------|------|
| Beklemede | `pending` | Sarı | Clock |
| Hazırlanıyor | `preparing` | Mavi | ChefHat |
| Hazır | `ready` | Yeşil | Check |
| Yolda | `on_way` | Turuncu | Truck |
| Teslim Edildi | `delivered` | Yeşil | CheckCircle |

### Tamamlanmış

| Sütun | Status | Renk | İkon |
|-------|--------|------|------|
| Ödenmiş | `paid` | Yeşil | CreditCard |
| İptal | `cancelled` | Kırmızı | XCircle |

---

## Özellikler

### 1. Temel Özellikler

- [ ] Kanban board görünümü (sütunlar halinde siparişler)
- [ ] Sipariş kartları (müşteri, masa, ürünler, toplam)
- [ ] Sütunlar arası durum değiştirme (buton tıklaması)
- [ ] Sipariş durumu güncelleme
- [ ] Gerçek zamanlı güncellemeler (socket.io)
- [ ] **Draggable hazırlığı** (@dnd-kit sarmalayıcı)

### 2. Filtreleme

- [ ] Tarih aralığı (bugün, dün, bu hafta, özel)
- [ ] Sipariş tipi (Dine-In, Paket, Teslimat)
- [ ] Masa seçimi
- [ ] Arama (müşteri adı, sipariş no)

### 3. Sipariş Detay

- [ ] Çekmece (drawer) ile detay görünümü
- [ ] Ürün listesi
- [ ] Ödeme durumu
- [ ] Notlar
- [ ] Sipariş zamanı

### 4. Hızlı Aksiyonlar

- [ ] Durum değiştirme dropdown
- [ ] Ödeme yap
- [ ] İptal et
- [ ] Masa değiştir
- [ ] Yazdır

---

## Gelişmiş Teknik Gereksinimler

### 1. Data Fetching Stratejisi (Cache & Revalidation)

Siparişler çok sık değiştiği için hem socket hem de server-side cache stratejisi kullanılmalıdır.

```typescript
// page.tsx - Server Component
export default async function OrdersPage() {
  const { restaurantId } = await getRestaurantContext()
  
  // Cache Strategy: Her zaman taze veri
  // socket bağlantısı koptuğunda fallback olarak en güncel veri
  const orders = await ordersApi.getOrders({ 
    restaurantId, 
    limit: 100,
  }, {
    cache: 'no-store',           // Her request'te fresh data
    tags: ['orders', 'orders-board'],  // Revalidation için tag
  })
  
  // Server-side gruplama (client yükünü azalt)
  const groupedOrders = groupOrdersByTableAndStatus(orders.items)
  
  return <OrdersBoardClient 
    restaurantId={restaurantId}
    initialOrdersByStatus={groupedOrders}
  />
}
```

**Neden no-store?**
- Siparişler çok hızlı değişiyor
- Socket koptuğunda fallback için fresh data şart
- Tag-based revalidation ile manual invalidate edilebilir

**Revalidation Tag Kullanımı:**
```typescript
// mutations sonrası (örneğin status güncelleme)
import { revalidateTag } from 'next/cache'

// Status güncellendiğinde
revalidateTag('orders-board')

// Sadece belirli status'ü güncelle
revalidateTag('orders-pending')
```

### 2. Server-Side OrderGroup Mantığı

Client-side'da 100+ siparişi her render'da gruplamak düşük donanımlı cihazlarda kasılmaya neden olabilir. Bu yüzden gruplama server-side yapılır.

```typescript
// web/modules/orders/utils/order-group.ts

export interface OrderGroup {
  tableId: string
  tableName: string
  orders: Order[]
  totalItems: number
  totalAmount: number
  firstOrderTime: string
  lastOrderTime: string
}

export interface OrdersByStatus {
  pending: OrderGroup[]
  preparing: OrderGroup[]
  ready: OrderGroup[]
  served: OrderGroup[]
  on_way: OrderGroup[]
  delivered: OrderGroup[]
  paid: OrderGroup[]
  cancelled: OrderGroup[]
}

export function groupOrdersByTableAndStatus(orders: Order[]): OrdersByStatus {
  // 1. Masa bazında grupla
  const tableGroups = orders.reduce((acc, order) => {
    const tableId = order.tableId || 'unknown'
    if (!acc[tableId]) {
      acc[tableId] = {
        tableId,
        tableName: order.table?.name || 'Bilinmeyen Masa',
        orders: [],
        totalItems: 0,
        totalAmount: 0,
        firstOrderTime: order.createdAt,
        lastOrderTime: order.createdAt,
      }
    }
    acc[tableId].orders.push(order)
    acc[tableId].totalItems += order.items.length
    acc[tableId].totalAmount += order.totalAmount
    
    if (new Date(order.createdAt) < new Date(acc[tableId].firstOrderTime)) {
      acc[tableId].firstOrderTime = order.createdAt
    }
    if (new Date(order.createdAt) > new Date(acc[tableId].lastOrderTime)) {
      acc[tableId].lastOrderTime = order.createdAt
    }
    
    return acc
  }, {} as Record<string, OrderGroup>)
  
  const tableOrderGroups = Object.values(tableGroups)
  
  // 2. Status bazında dağıt
  const byStatus: OrdersByStatus = {
    pending: [],
    preparing: [],
    ready: [],
    served: [],
    on_way: [],
    delivered: [],
    paid: [],
    cancelled: [],
  }
  
  for (const group of tableOrderGroups) {
    // Her OrderGroup'taki en son siparişin status'ünü al
    const latestOrder = group.orders.reduce((latest, order) => {
      return new Date(order.createdAt) > new Date(latest.createdAt) ? order : latest
    }, group.orders[0])
    
    const status = latestOrder.status as keyof OrdersByStatus
    if (byStatus[status]) {
      byStatus[status].push(group)
    }
  }
  
  return byStatus
}
```

**Avantajları:**
- Client yükü azalır (tablet/ telefonlarda performans artışı)
- Server'da bir kez hesapla, tüm client'lara aynı sonuç
- Socket event geldiğinde sadece ilgili status güncellenir

### 3. Draggable Hazırlığı (@dnd-kit)

İleride sürükle-bırak eklemek için DOM yapısı şimdiden buna uygun kurulmalıdır.

```typescript
// KanbanColumn.tsx - SortableContext ile sarmalama
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface KanbanColumnProps {
  status: OrderStatus
  orderGroups: OrderGroup[]
  onStatusChange: (orderId, newStatus) => void
  onOrderClick: (orderGroup) => void
}

export function KanbanColumn({ status, orderGroups, ... }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px]">
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 bg-bg-muted rounded-t-sm">
        <span className="font-bold text-sm">{getStatusLabel(status)}</span>
        <span className="text-xs bg-bg-hover px-2 py-0.5 rounded">
          {orderGroups.length}
        </span>
      </div>
      
      {/* Sortable Content */}
      <SortableContext 
        items={orderGroups.map(g => g.tableId)} 
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-2 p-2 overflow-y-auto min-h-[200px]">
          {orderGroups.map(group => (
            <SortableOrderCard 
              key={group.tableId} 
              orderGroup={group}
              onClick={() => onOrderClick(group)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
```

```typescript
// OrderCard.tsx - useSortable ile sarmalama
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableOrderCardProps {
  orderGroup: OrderGroup
  onClick: () => void
}

export function SortableOrderCard({ orderGroup, onClick }: SortableOrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: orderGroup.tableId })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <OrderCard 
        orderGroup={orderGroup} 
        onClick={onClick}
      />
    </div>
  )
}
```

**Neden Şimdiden Hazırlanalım?**
- Sonradan @dnd-kit eklemek mevcut component yapısını bozar
- Her kart için `key` ve `ref` şimdiden doğru verilmeli
- Event listener'lar (attributes, listeners) şimdiden eklenmeli

---

## Bileşen Detayları

### 1. page.tsx (Server Component) (~40 satır)

```typescript
import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { ordersApi } from '@/modules/orders/services'
import { groupOrdersByTableAndStatus } from '@/modules/orders/utils/order-group'
import { OrdersBoardClient } from '@/modules/orders/components'

export const dynamic = 'force-dynamic'  // Her zaman fresh data

export default async function OrdersPage() {
  const { restaurantId } = await getRestaurantContext()
  
  if (!restaurantId) {
    throw new Error('Restaurant not found')
  }
  
  // Server-side data fetching + gruplama
  const ordersResponse = await ordersApi.getOrders({ 
    restaurantId, 
    limit: 100,
  })
  
  // Server-side gruplama (client yükünü azalt)
  const ordersByStatus = groupOrdersByTableAndStatus(ordersResponse.items)
  
  return <OrdersBoardClient 
    restaurantId={restaurantId}
    initialOrdersByStatus={ordersByStatus}
  />
}
```

### 2. OrdersBoardClient.tsx (~150 satır)

```typescript
'use client'

interface OrdersBoardClientProps {
  restaurantId: string
  initialOrdersByStatus: OrdersByStatus
}

export function OrdersBoardClient({ restaurantId, initialOrdersByStatus }) {
  // State: ordersByStatus, filters, selectedOrderGroup, isDetailOpen
  // Hook: useOrdersBoard({ restaurantId, initialOrdersByStatus })
  // Socket: useOrdersSocket(restaurantId, setOrdersByStatus)
  // Render:
  //   - BoardFilters
  //   - KanbanBoard (container)
  //     - KanbanColumn[] (mapped by status)
  //   - OrderDetailDrawer
}
```

### 3. KanbanBoard.tsx (~60 satır)

```typescript
interface KanbanBoardProps {
  ordersByStatus: OrdersByStatus
  onStatusChange: (orderGroupId, newStatus) => void
  onOrderClick: (orderGroup) => void
}

export function KanbanBoard({ ordersByStatus, ... }) {
  // Horizontal scroll container
  // Map columns by status
}
```

### 4. KanbanColumn.tsx (~80 satır) - Draggable Ready

```typescript
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface KanbanColumnProps {
  status: OrderStatus
  orderGroups: OrderGroup[]
  onStatusChange: (orderGroupId, newStatus) => void
  onOrderClick: (orderGroup) => void
}

export function KanbanColumn({ status, orderGroups, ... }) {
  // SortableContext wrap
  // Status header with count
  // OrderGroup cards list (scrollable)
  // Droppable area for drag-between-columns (future)
}
```

### 5. OrderCard.tsx (~80 satır) - Draggable Ready

```typescript
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface OrderCardProps {
  orderGroup: OrderGroup
  onClick: () => void
  onStatusChange: (status) => void
}

export function OrderCard({ orderGroup, ... }) {
  // useSortable hook
  // Transform CSS
  // Expand butonu
  // Multiple orders list
  // Relative time badge
  // Quick status dropdown
}
```

### 6. useOrdersBoard.ts Hook (~150 satır)

```typescript
interface UseOrdersBoardProps {
  restaurantId: string
  initialOrdersByStatus: OrdersByStatus
}

export function useOrdersBoard({ restaurantId, initialOrdersByStatus }) {
  // State
  const [ordersByStatus, setOrdersByStatus] = useState(initialOrdersByStatus)
  const [filters, setFilters] = useState({})
  const [selectedOrderGroup, setSelectedOrderGroup] = useState(null)

  // Socket updates - sadece ilgili status güncellenir
  const handleSocketEvent = useCallback((event) => {
    // order_created, order_updated, order_status_changed
    // setOrdersByStatus ile incremental update
  }, [])

  // Actions
  const updateStatus = async (orderGroupId, newStatus) => ...

  return { 
    ordersByStatus, 
    filters, 
    selectedOrderGroup,
    updateStatus, 
    setSelectedOrderGroup,
    handleSocketEvent,
    ... 
  }
}
```

### 7. useOrdersSocket.ts (~60 satır)

```typescript
export function useOrdersSocket(
  restaurantId: string, 
  setOrdersByStatus: React.Dispatch<React.SetStateAction<OrdersByStatus>>
) {
  useEffect(() => {
    socket.connect(restaurantId)
    
    socket.on('order_created', (order) => {
      // İlgili status kolonuna ekle
    })
    
    socket.on('order_updated', (order) => {
      // İlgili kolonda güncelle
    })
    
    socket.on('order_status_changed', ({ orderId, oldStatus, newStatus }) => {
      // Eski kolondan çıkar, yeni kolo ekle
    })
    
    return () => socket.disconnect()
  }, [restaurantId])
}
```

---

## Etkilenecek Dosyalar

### Yeni Oluşturulacak

| Dosya | Açıklama |
|-------|----------|
| `web/app/(main)/orders/page.tsx` | Server Component - data fetching + gruplama |
| `web/modules/orders/utils/order-group.ts` | OrderGroup helper (server-side) |
| `web/modules/orders/components/OrdersBoardClient.tsx` | Client Component - ana mantık |
| `web/modules/orders/components/KanbanBoard.tsx` | Board container |
| `web/modules/orders/components/KanbanColumn.tsx` | Kolon component (SortableContext) |
| `web/modules/orders/components/OrderCard.tsx` | Sipariş kartı (useSortable) |
| `web/modules/orders/components/OrderDetailDrawer.tsx` | Detay çekmecesi |
| `web/modules/orders/components/BoardFilters.tsx` | Filtreler |
| `web/modules/orders/components/index.ts` | Export barrel |
| `web/modules/orders/hooks/useOrdersBoard.ts` | Board hook |
| `web/modules/orders/hooks/useOrdersSocket.ts` | Socket hook |

### Güncellenecek

| Dosya | Değişiklik |
|-------|------------|
| `web/modules/orders/types.ts` | `OrderGroup`, `OrdersByStatus` tipleri |
| `web/modules/orders/services.ts` | Cache options + Tag support |

---

## Adım Adım Değişiklikler

### Phase 1: Temel Yapı + Server-Side Grouping (Gün 1)

1. **page.tsx** - Server Component
   - `getRestaurantContext()` ile restaurantId al
   - `ordersApi.getOrders()` ile initial data çek
   - `groupOrdersByTableAndStatus()` ile server-side gruplama
   - `OrdersBoardClient`'a `OrdersByStatus` olarak aktar

2. **utils/order-group.ts** - Helper fonksiyonları
   - `groupOrdersByTable()` masa bazında gruplama
   - `groupOrdersByTableAndStatus()` status bazlı dağıtma
   - Type tanımları

### Phase 2: Kanban Bileşenleri + Draggable (Gün 2)

3. **OrdersBoardClient.tsx** - Client Component
   - `useOrdersBoard` hook'unu kullan
   - `useOrdersSocket` ile real-time bağlantı
   - Alt component'leri render et

4. **KanbanBoard.tsx** - Sütun container
   - Status bazlı sütunları map et
   - Horizontal scroll container

5. **KanbanColumn.tsx** - Tek sütun
   - `SortableContext` ile sarmala (draggable hazırlığı)
   - Header (status adı, sayı)
   - OrderGroup kartları listesi

6. **OrderCard.tsx** - Sipariş kartı
   - `useSortable` hook (draggable hazırlığı)
   - Çoklu sipariş gösterimi
   - Relative time badge
   - Expand butonu

### Phase 3: Detay ve Filtreler (Gün 3)

7. **OrderDetailDrawer.tsx** - Sipariş detayı
   - Her sipariş ayrı kart
   - Ürün listesi detaylı
   - Toplam hesaplamaları

8. **BoardFilters.tsx** - Filtreler
   - Tarih, tip, masa filtreleri
   - Arama

### Phase 4: Real-time Entegrasyonu (Gün 4)

9. **useOrdersSocket.ts** - Socket entegrasyonu
   - `order_created` - yeni sipariş
   - `order_updated` - sipariş güncellendi
   - `order_status_changed` - durum değişti
   - Incremental state update

---

## Test Senaryoları

### Birim Testler

- [ ] `groupOrdersByTableAndStatus` - doğru gruplama
- [ ] `useOrdersBoard` hook - durum güncelleme
- [ ] `useOrdersBoard` hook - filtreleme mantığı
- [ ] `OrderCard` - doğru bilgi render etme
- [ ] `KanbanColumn` - SortableContext yapısı

### Entegrasyon Testleri

- [ ] Sayfa yüklemesi - initial data ile
- [ ] Durum değişikliği - API çağrısı + revalidateTag
- [ ] Filtreleme - doğru sonuç
- [ ] Real-time güncelleme - socket event
- [ ] Server-side grouping - client'ta doğru data

### UI/UX Testleri

- [ ] Mobil uyumluluk (scroll, dokunmatik)
- [ ] Kart tıklama - detay açılması
- [ ] Draggable hazırlığı - sürükleme simgesi
- [ ] Relative time renk kodlaması
- [ ] Loading states
- [ ] Boş durum (empty state)

---

## Kural Kontrolü

| Kural | Durum |
|-------|-------|
| Server/Client ayrımı | ✓ `page.tsx` Server, component'ler Client |
| Component konumu | ✓ `modules/orders/components/` içinde |
| Max 200 satır/component | ✓ Her component ayrı dosyada |
| DRY prensibi | ✓ Hooks ile logic ayrımı |
| TypeScript types | ✓ Backend ile uyumlu |
| Naming conventions | ✓ PascalCase component, camelCase fonksiyon |
| Relative time | ✓ `formatRelativeTime()` kullanımı |
| Server-side grouping | ✓ `groupOrdersByTableAndStatus()` |
| Cache strategy | ✓ `no-store` + tags |
| Draggable hazırlığı | ✓ SortableContext + useSortable |

---

## Sonraki Adımlar

1. Bu planı onayla
2. Backend'de eksik endpoint var mı kontrol et
3. Phase 1 ile başla

---

## Sorular / Tartışma Noktaları

1. **Real-time için socket server hazır mı?**
   - Backend'de socket entegrasyonu kontrol edilmeli

2. **Kaç sütun gösterilecek?**
   - Tüm status'lar mı? Aktif olanlar mı?
   - Öneri: Aktif siparişler (pending → delivered)

3. **Pagination?**
   - Server-side gruplama ile birlikte düşünülmeli
   - Her status için ayrı sayfa (infinite scroll)

---

**Plan Oluşturulma Tarihi:** 2026-02-25
**Versiyon:** 1.3
**Durum:** Taslak - Onay bekliyor
