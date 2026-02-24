# ORDERS/POS MODULE REFACTOR PLAN

## Overview
Bu plan, `web/modules/orders` ve `web/app/(main)/orders/pos` sayfasının products modülü referans alınarak yeniden yazılmasını kapsar.

---

## Önemli Notlar (Kullanıcı Geri Bildirimi)

### 1. Masa Bilgisini Kaybetme
- Route `orderId` üzerinden gidiyor
- Sipariş detayı gösterirken `table` bilgisi mutlaka çekilmeli
- `Order` type'ında `table: { id, name }` bilgisi olmalı

### 2. Boş Sipariş Durumu (Hayalet Sipariş Önleme)
- **Çözüm A**: Sepet boşken "Sipariş Ver" butonu pasif
- **Çözüm B**: Sayfadan çıkışta sepet dolu ise uyarı göster
- **Çözüm C**: Sipariş sadece ilk ürün eklendiğinde backend'de "draft" olarak oluşturulur

### 3. Responsive Önceliği (Mobile First)
- **Portrait mod** (dikey): `grid-cols-2` zorunlu
- **Drawer**: Mobilde "Sepeti Gör" butonu → Drawer açılır
- **Desktop**: Sidebar olarak sağda sabit

---

## Referans Modüller
- **Products**: `web/modules/products/` - Liste görünümü, kartlar, filtreleme
- **Tables**: `web/modules/tables/` - Alan yapısı, status yönetimi

---

## 1. Modül Yapısı (web/modules/orders/)

```
web/modules/orders/
├── types.ts                    # Order types + Enums + Constants
├── service.ts                  # API service
├── enums/
│   └── order-status.enum.ts    # Status mapping + styles
├── components/
│   ├── OrdersClient.tsx        # Ana bileşen (grid + sidebar)
│   ├── OrderCard.tsx           # Sipariş kartı
│   ├── OrderStatusBadge.tsx    # Durum badge
│   ├── PosProductCard.tsx     # POS için ürün kartı
│   ├── CategoryTabs.tsx        # Kategori sekmeleri
│   ├── PosBasket.tsx           # Sağ panel sepet
│   └── PosInterface.tsx       # POS main interface
├── hooks/
│   └── useOrderForm.ts        # Sipariş oluşturma formu (opsiyonel)
```

---

## 2. Backend API Entegrasyonu

### Mevcut Endpoint'ler
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/orders` | Filtreli siparişler |
| POST | `/orders` | Yeni sipariş |
| GET | `/orders/:id` | Sipariş detayı |
| PATCH | `/orders/:id/status` | Durum güncelle |
| PATCH | `/orders/:id/items` | Kalem güncelle |
| PATCH | `/orders/:id/move-to-table` | Masa değiştir |

### Frontend Type Tanımlamaları
```typescript
// OrderStatus
PENDING, PREPARING, READY, SERVED, PAID, ON_WAY, DELIVERED, CANCELLED

// OrderType
DINE_IN, TAKEAWAY, DELIVERY

// OrderSource  
INTERNAL, QR_GUEST, INTEGRATION
```

---

## 3. UI/UX Yapısı

### Layout: Split Panel (Desktop)
```
┌─────────────────────────────────────────────────────────┐
│  Header: "YENİ SİPARİŞ" + Masa Seçimi                  │
├──────────────────────────────────┬──────────────────────┤
│  SOL PANEL (70%)                 │  SAĞ PANEL (30%)    │
│  ┌────────────────────────────┐  │  ┌────────────────┐  │
│  │ Arama                      │  │  │ MASA BİLGİSİ   │  │
│  │ (Sadece ürün arama)        │  │  ├────────────────┤  │
│  ├────────────────────────────┤  │  │ SEPET          │  │
│  │ Kategori Sekmeleri         │  │  │ - Ürün 1       │  │
│  ├────────────────────────────┤  │  │ - Ürün 2       │  │
│  │                            │  │  │ ...            │  │
│  │ ÜRÜN KARTLARI             │  │  ├────────────────┤  │
│  │ (Grid: 3-4 kolon)          │  │  │ TOPLAM         │  │
│  │                            │  │  ├────────────────┤  │
│  │ [+] [+] [+] [+]           │  │  │ SİPARİŞ OLUŞTUR│ │
│  │ [+] [+] [+] [+]           │  │  └────────────────┘  │
│  │                            │  │                      │
│  └────────────────────────────┘  │                      │
└──────────────────────────────────┴──────────────────────┘
```

### Layout: Mobile Drawer
```
┌─────────────────────────────────────────┐
│  Header: "YENİ SİPARİŞ" + Masa Seçimi  │
├─────────────────────────────────────────┤
│  Arama (Ürün ara)                       │
├─────────────────────────────────────────┤
│  Kategori Sekmeleri                     │
├─────────────────────────────────────────┤
│                                         │
│  ÜRÜN KARTLARI (grid-cols-2)          │
│  [+] [+]                                │
│  [+] [+]                                │
│  [+] [+]                                │
│                                         │
├─────────────────────────────────────────┤
│  [SEPETİ GÖR] (Fixed Bottom Button)   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ← SEPET (Drawer)                       │
├─────────────────────────────────────────┤
│  MASA: B-M-1                            │
│  ────────────────────────────────────   │
│  • Ürün 1.............2x...........50TL │
│  • Ürün 2.............1x...........35TL │
│  ────────────────────────────────────   │
│  TOPLAM.........................85TL   │
│  ────────────────────────────────────   │
│  [SİPARİŞ VER]                         │
└─────────────────────────────────────────┘
```

### Responsive Breakpoints
```css
/* Desktop: >= 1024px */
desktop: grid-cols-3 lg:grid-cols-4

/* Tablet: 768px - 1023px */
tablet: grid-cols-2

/* Mobile: < 768px - Portrait priority */
mobile: grid-cols-2 (ZORUNLU)
```

### Sol Panel Bileşenleri
1. **SearchInput**: Ürün ara
2. **CategoryTabs**: Menü kategorileri (All, Kategori 1, Kategori 2...)
3. **ProductGrid**: POS ürün kartları (tıklanınca sepete ekle)

### Sağ Panel Bileşenleri (Sabit)
1. **TableInfo**: Seçili masa bilgisi
2. **BasketList**: Sepet kalemleri (adet artı/az/sil)
3. **OrderTotal**: Ara toplam + "Sipariş Ver" butonu

---

## 4. Veri Akışı

### Server Component (page.tsx)
```typescript
// Data fetching
const [orders, tables, menuCategories, menuItems] = await Promise.all([
  ordersApi.getOrders(restaurantId),
  tablesApi.getTables(restaurantId),
  menuService.getCategories(restaurantId),
  menuService.getMenuItems(restaurantId)
])
```

### Client Component State
```typescript
// Sepet state
const [basket, setBasket] = useState<BasketItem[]>([])
const [selectedTable, setSelectedTable] = useState<Table | null>(null)

// Kategori state
const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
```

---

## 5. Types Tanımlamaları (types.ts)

```typescript
import { BaseEntity } from '@/modules/shared/types'

// Enums (Backend'den import veya lokal tanım)
export enum OrderStatus { ... }
export enum OrderType { ... }

// Order Types
export interface Order extends BaseEntity {
  orderNumber: string
  tableId: string | null
  table?: { name: string }
  userId: string
  user?: { name: string }
  status: OrderStatus
  type: OrderType
  source: OrderSource
  totalAmount: number
  notes?: string
  items: OrderItem[]
  createdAt: string
}

export interface OrderItem {
  id: string
  menuItemId: string
  menuItem?: { name: string; price: number }
  quantity: number
  unitPrice: number
  totalPrice: number
  notes?: string
}

// Basket Types (Local State)
export interface BasketItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

// Constants (DRY)

---

## 6. Dosya Öncelik Sırası

### Adım 1: Temel Yapı
- [ ] `web/modules/orders/types.ts` - Types + Enums + Constants
- [ ] `web/modules/orders/service.ts` - API service
- [ ] `web/modules/orders/enums/order-status.enum.ts` - Status styles

### Adım 2: UI Bileşenleri
- [ ] `web/modules/orders/components/OrderStatusBadge.tsx`
- [ ] `web/modules/orders/components/CategoryTabs.tsx` (products'dan adapt)
- [ ] `web/modules/orders/components/PosProductCard.tsx` (product card adapt)
- [ ] `web/modules/orders/components/OrderCard.tsx`

### Adım 3: Ana Bileşen
- [ ] `web/modules/orders/components/OrdersClient.tsx` - Split panel layout
- [ ] `web/modules/orders/components/PosBasket.tsx` - Sepet bileşeni

### Adım 4: Sayfa Entegrasyonu
- [ ] `web/app/(main)/orders/pos/page.tsx` - Server component

---

## 7. Products Modülünden Farklar

| Özellik | Products | Orders/POS |
|----------|----------|------------|
| Liste | Grid kartlar | Split panel (sol:ürün, sağ:sepet) |
| Filtre | Stok durumu, Satış durumu, Fiyat | Sipariş durumu, Sipariş tipi |
| Boş durum | "Ürün bulunamadı" | Boş sepet mesajı |
| Modal | Ürün ekleme/düzenleme | Anlık sepete ekleme |

---

## 8. Sepet Mantığı (Hayalet Sipariş Önleme)

### Çözüm A: Sepet Boş Kontrolü
```typescript
// Sipariş oluştur - buton pasif
const canSubmit = basket.length > 0 && selectedTable !== null;

<button disabled={!canSubmit} className="...">
  SİPARİŞ VER
</button>
```

### Çözüm B: Sayfadan Çıkış Uyarısı
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (basket.length > 0) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [basket]);

// Veya Next.js useBeforeUnload hook
```

### Çözüm C: Draft Sipariş (Backend Entegrasyonu)
- Backend'de `status: DRAFT` sipariş oluştur
- İlk ürün eklendiğinde DRAFT → PENDING
- Kullanıcı hiç ürün eklemeden çıkarsa DRAFT siparişler temizlenir

### Sepet Fonksiyonları
```typescript
// Sepete ekle
const addToBasket = (menuItem: MenuItem) => {
  setBasket(prev => {
    const existing = prev.find(item => item.menuItemId === menuItem.id)
    if (existing) {
      return prev.map(item => 
        item.menuItemId === menuItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    }
    return [...prev, { 
      menuItemId: menuItem.id, 
      name: menuItem.name, 
      price: menuItem.price, 
      quantity: 1 
    }]
  })
}

// Sipariş oluştur
const createOrder = async () => {
  // Kontrol A: Masa seçili mi?
  if (!selectedTable) {
    toast.error('Lütfen masa seçin')
    return
  }
  
  // Kontrol B: Sepet dolu mu?
  if (basket.length === 0) {
    toast.error('Sepet boş')
    return
  }
  
  await ordersApi.create({
    tableId: selectedTable.id,
    items: basket.map(item => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      notes: item.notes
    }))
  })
  
  setBasket([])
  toast.success('Sipariş oluşturuldu')
}
```

---

## 10. Shared Components Kullanımı (ZORUNLU)

Tüm yeni buton ve input'lar "sıfırdan" yazılmayacak, mevcut atomik bileşenler kullanılacaktır:

| Fonksiyon | Shared Bileşen | Kullanım Notu |
|-----------|----------------|---------------|
| Aksiyonlar | `Button` | `variant="primary"`, `size="lg"` (POS için büyük) |
| Girdiler | `FormInput` / `SearchInput` | Arama barı için `type="search"`, `icon="Search"` |
| Bilgi Etiketleri | `Badge` (custom) | Order status renkleri için variant |
| Yükleme | `LoadingSpinner` | Sayfa ve sepet onay işlemleri için |
| Bildirimler | `toast` (sonner) | Hata ve başarı mesajları için |
| Çizgiler | `Divider` | Paneller arası temiz ayrım için |

### Shared Component Path
```
web/modules/shared/components/
├── Button.tsx
├── FormInput.tsx
├── SearchInput.tsx
├── Badge.tsx (veya custom OrderStatusBadge)
├── LoadingSpinner.tsx
├── EmptyState.tsx
├── Modal.tsx
├── Divider.tsx
└── ...
```

---

## 11. Design Tokens (CSS/Tailwind)

Yeni CSS sınıfları türetilmeyecek, sadece projenin mevcut Design Token'ları kullanılacaktır:

### Arka Planlar
- `bg-bg-app` - Genel sayfa arka planı
- `bg-bg-surface` - Paneller, kartlar, formlar
- `bg-bg-muted` - Disabled state, placeholder

### Kenarlıklar
- `border-border-light` - Paneller arası ince ayrım
- `border-border-medium` - Form input kenarları

### Tipografi
- `text-text-primary` - Ana metin
- `text-text-secondary` - İkincil metin
- `text-text-muted` - Yardımcı metin, placeholder

### Köşeler
- `rounded-sm` - Maksimum 2-4px, kurumsal keskin hatlar
- `rounded` - Varsayılan (4px)

### Örnek Kullanım
```tsx
<div className="bg-bg-surface border border-border-light rounded-sm p-4">
  <h2 className="text-text-primary font-semibold">Sipariş Detay</h2>
  <p className="text-text-muted">Masa seçiniz</p>
</div>
```

---

## 12. Global State vs Local State Stratejisi

### Sepet (Basket) - localStorage Persist
Sayfa yenilendiğinde sepetin kaybolmaması için:

```typescript
// useBasket hook - localStorage entegrasyonu
const useBasket = () => {
  const [basket, setBasket] = useState<BasketItem[]>(() => {
    // Client-side only: localStorage'dan yükle
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_basket')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  // Her değişiklikte localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('pos_basket', JSON.stringify(basket))
  }, [basket])

  return { basket, setBasket }
}
```

### Masa Senkronizasyonu
Masanın anlık durumunu (dolu/boş) takip etmek için:

```typescript
// Context veya Custom Event kullanımı
// Masa değiştiğinde tüm POS bileşenlerini bilgilendir

// Pattern 1: Custom Event
window.dispatchEvent(new CustomEvent('table:selected', { 
  detail: { tableId, status } 
}))

// Pattern 2: React Context
<TableContext.Provider value={{ selectedTable, setSelectedTable }}>
  {children}
</TableContext.Provider>
```

---

## 13. "Action Bar" Mimarisi

POS ekranının en altında:

### Desktop: Sağ Panel Altına Gömülü
```
┌─────────────────────────────┐
│  SAĞ PANEL                  │
│  ├─ MASA BİLGİSİ            │
│  ├─ SEPET LİSTESİ            │
│  ├─ TOPLAM: 125,50 ₺         │
│  └─ [TEMİZLE] [SİPARİŞ VER] │  ← Action Bar (gömülü)
└─────────────────────────────┘
```

### Mobile: Sticky Bottom
```
┌─────────────────────────────┐
│  ÜRÜN GRID (scrollable)     │
│  ...                        │
│  ...                        │
├─────────────────────────────┤
│  ┌─────────────────────────┐│
│  │ TOPLAM: 125,50 ₺        ││
│  │ [TEMİZLE] [SİPARİŞ VER]││  ← Action Bar (sticky bottom)
│  └─────────────────────────┘│
└─────────────────────────────┘
```

### Action Bar İçerik
- **Toplam Tutar**: Bold, büyük font
- **Temizle Butonu**: Secondary variant, sepette ürün varsa aktif
- **Siparişi Onayla / Ödeme Al**: Primary variant, sepette ürün varsa aktif
- **Mevcut siparişlerde**: "Ödeme Al" butonu göster

### Örnek Kod
```tsx
// Desktop Action Bar
<div className="border-t border-border-light p-4 space-y-3">
  <div className="flex justify-between items-center">
    <span className="text-text-muted">TOPLAM</span>
    <span className="text-xl font-bold text-text-primary">
      {formatCurrency(total)}
    </span>
  </div>
  <div className="flex gap-2">
    <Button 
      variant="secondary" 
      size="lg" 
      onClick={clearBasket}
      disabled={basket.length === 0}
    >
      TEMİZLE
    </Button>
    <Button 
      variant="primary" 
      size="lg" 
      className="flex-1"
      onClick={createOrder}
      disabled={basket.length === 0 || !selectedTable}
    >
      SİPARİŞ VER
    </Button>
  </div>
</div>

// Mobile Sticky
<div className="fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-border-light p-4">
  {/* Aynı içerik */}
</div>
```

---

## 14. Referans Dosyalar

- **ProductsClient**: `web/modules/products/components/ProductsClient.tsx`
- **Products types**: `web/modules/products/types.ts`
- **Tables client**: `web/modules/tables/components/TablesClient.tsx`
- **Table types**: `web/modules/tables/types.ts`
- **Status styles**: `web/modules/tables/enums/table-status.enum.ts`

---

## 15. WebSocket / Reactive UI Mimarisi (ZORUNLU)

**Önemli**: POS modülü sadece sayfa yüklendiğinde veri çekmez. Herhangi bir anda Socket Event ile veri güncellenir. State yönetimi buna uygun olmalı.

### 15.1 Socket Event Tanımları

| Event | Yön | Açıklama |
|-------|-----|----------|
| `new_order` | Server → Client | Yeni sipariş oluşturuldu (QR guest vb.) |
| `order_status_updated` | Server → Client | Sipariş durumu değişti |
| `order_updated` | Server → Client | Sipariş güncellendi |
| `table_status_updated` | Server → Client | Masa durumu değişti (dolu/boş) |
| `join_room` | Client → Server | Restoran odasına katılma |

### 15.2 State Yönetimi: Zustand Store

```typescript
// hooks/usePosStore.ts - Zustand store
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PosState {
  // Sepet
  basket: BasketItem[]
  addToBasket: (item: BasketItem) => void
  removeFromBasket: (menuItemId: string) => void
  clearBasket: () => void
  
  // Masa
  selectedTable: Table | null
  setSelectedTable: (table: Table | null) => void
  
  // Siparişler (real-time güncellenir)
  orders: Order[]
  setOrders: (orders: Order[]) => void
  updateOrder: (order: Order) => void
  addOrder: (order: Order) => void
  
  // Masalar (real-time güncellenir)
  tables: Table[]
  setTables: (tables: Table[]) => void
  updateTable: (table: Table) => void
}

export const usePosStore = create<PosState>()(
  persist(
    (set) => ({
      // Sepet - localStorage'a kaydedilir
      basket: [],
      addToBasket: (item) => set((state) => {
        const existing = state.basket.find(b => b.menuItemId === item.menuItemId)
        if (existing) {
          return {
            basket: state.basket.map(b => 
              b.menuItemId === item.menuItemId 
                ? { ...b, quantity: b.quantity + item.quantity }
                : b
            )
          }
        }
        return { basket: [...state.basket, item] }
      }),
      removeFromBasket: (menuItemId) => set((state) => ({
        basket: state.basket.filter(b => b.menuItemId !== menuItemId)
      })),
      clearBasket: () => set({ basket: [] }),
      
      // Masa
      selectedTable: null,
      setSelectedTable: (table) => set({ selectedTable: table }),
      
      // Siparişler
      orders: [],
      setOrders: (orders) => set({ orders }),
      updateOrder: (order) => set((state) => ({
        orders: state.orders.map(o => o.id === order.id ? order : o)
      })),
      addOrder: (order) => set((state) => ({
        orders: [order, ...state.orders]
      })),
      
      // Masalar
      tables: [],
      setTables: (tables) => set({ tables }),
      updateTable: (table) => set((state) => ({
        tables: state.tables.map(t => t.id === table.id ? table : t)
      })),
    }),
    {
      name: 'pos-store',
      partialize: (state) => ({ 
        // Sadece sepet ve seçili masa localStorage'a kaydedilir
        basket: state.basket,
        selectedTable: state.selectedTable 
      }),
    }
  )
)
```

### 15.3 Socket Hook

```typescript
// hooks/useOrderSocket.ts
import { useEffect } from 'react'
import { socketService } from '@/modules/shared/api/socket'
import { usePosStore } from './usePosStore'
import { Order } from '../types'

export function useOrderSocket(restaurantId: string) {
  const { addOrder, updateOrder, updateTable } = usePosStore()
  
  useEffect(() => {
    // Bağlan
    socketService.connect(restaurantId)
    
    // Event dinleyicileri
    socketService.on<Order>('new_order', (order) => {
      addOrder(order)
      // Toast bildirimi
    })
    
    socketService.on<Order>('order_status_updated', (order) => {
      updateOrder(order)
    })
    
    socketService.on<Order>('order_updated', (order) => {
      updateOrder(order)
    })
    
    socketService.on<{ tableId: string; status: string }>('table_status_updated', ({ tableId, status }) => {
      updateTable({ id: tableId, status } as Table)
    })
    
    // Cleanup
    return () => {
      socketService.off('new_order')
      socketService.off('order_status_updated')
      socketService.off('order_updated')
      socketService.off('table_status_updated')
      socketService.disconnect()
    }
  }, [restaurantId, addOrder, updateOrder, updateTable])
}
```

### 15.4 POS Client Bileşeninde Kullanım

```typescript
// components/PosClient.tsx
'use client'

import { usePosStore } from '@/modules/orders/hooks/usePosStore'
import { useOrderSocket } from '@/modules/orders/hooks/useOrderSocket'
import { ordersApi } from '@/modules/orders/services'
import { productsApi } from '@/modules/products/services'

export function PosClient({ restaurantId, initialOrders, initialTables, initialMenuItems }: PosClientProps) {
  const { setOrders, setTables, orders, tables, basket } = usePosStore()
  
  // Socket bağlantısı (real-time güncellemeler)
  useOrderSocket(restaurantId)
  
  // Initial data yükle (sadece ilk yüklemede)
  useEffect(() => {
    setOrders(initialOrders)
    setTables(initialTables)
  }, [])
  
  // ... render
}
```

---

## 16. Backend Event Emit Konfigürasyonu

Backend'de sipariş oluşturulduğunda/güncellendiğinde ilgili gateway'ler event emit eder:

### NotificationsGateway (Mevcut)
```typescript
// backend/src/modules/notifications/notifications.gateway.ts
notifyNewOrder(restaurantId: string, order: Order) {
  this.server.to(restaurantId).emit('new_order', order)
}

notifyOrderStatus(restaurantId: string, order: Order) {
  this.server.to(restaurantId).emit('order_status_updated', order)
}
```

### OrdersService (Güncellenecek)
```typescript
// Backend'de sipariş oluşturulduğunda
await this.notificationsGateway.notifyNewOrder(order.restaurantId, order)

// Status güncellendiğinde
await this.notificationsGateway.notifyOrderStatus(order.restaurantId, order)
```
