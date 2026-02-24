# POS Akış Düzeltme Planı

## Problem Özeti

Mevcut akışta 3 kritik sorun var:

1. **Dolu masaya tıklandığında hata**: Backend'de aktif sipariş kontrolü yapılıyor ama kullanıcı "Bu masada zaten açık sipariş var" hatası alıyor
2. **Hayalet sipariş**: Boş masaya tıklandığında hemen boş sipariş oluşturuluyor (items: [])
3. **Masa seçili değil**: POS sayfasında masa seçili gelmiyor, kullanıcı tekrar seçmek zorunda kalıyor

---

## Yeni Akış Tasarımı

### Akış Diyagramı

```mermaid
flowchart TD
    A[Masa kartına tıkla] --> B{Masada aktif sipariş var mı?}
    B -- Evet --> C[/orders/pos/tableId?existingOrderId=xxx]
    B -- Hayır --> D[/orders/pos/tableId]
    C --> E[POS sayfası yüklendi]
    D --> E
    E --> F[tableId ile masayı bul]
    F --> G[setSelectedTable ile seç]
    G --> H{Aktif sipariş var mı?}
    H -- Evet --> I[Siparişi yükle, buton 'Güncelle']
    H -- Hayır --> J[Sipariş yok, buton 'Sipariş Ver']
    J --> K{Kullanıcı ürün ekledi}
    K -- Evet --> L[Sipariş Ver butonu aktif]
    K -- Hayır --> M[Sipariş Ver butonu pasif]
```

---

## Değişiklikler

### 1. URL Yapısı Değişikliği

**Eski**: `/orders/pos/[orderId]`  
**Yeni**: `/orders/pos/[tableId]`

Query params:
- `?orderId=xxx` (opsiyonel, mevcut sipariş varsa)

### 2. TablesClient Güncellemesi

**Dosya**: `web/modules/tables/components/TablesClient.tsx`

**Değişiklik**: `handleTableClick` fonksiyonu:

```typescript
// ESKİ (Sorunlu)
const handleTableClick = async (table: Table) => {
  // Aktif sipariş kontrolü yapıp yeni order oluşturuyor - HAYALET SİPARİŞ!
  const activeOrder = await ordersApi.getOrders({ 
    restaurantId, tableId: table.id, status: OrderStatus.PENDING 
  })
  
  if (activeOrder) {
    router.push(`/orders/pos/${activeOrder.id}`)
  } else {
    // HAYAT SIKINTISI: Boş sipariş oluşturuyor!
    const newOrder = await ordersApi.createOrder({...})
    router.push(`/orders/pos/${newOrder.id}`)
  }
}

// YENİ (Doğru)
const handleTableClick = (table: Table) => {
  // Sadece tableId ile yönlendir, order oluşturma!
  // Sipariş kontrolü POS sayfasında yapılacak
  router.push(`/orders/pos/${table.id}`)
}
```

### 3. OrdersClient Güncellemesi

**Dosya**: `web/app/(main)/orders/pos/[tableId]/page.tsx`

**Değişiklik**: 
- Parametre: `tableId` (orderId yerine)
- Query: `?orderId=xxx` (opsiyonel, mevcut sipariş varsa)

```typescript
// page.tsx
interface PageProps {
  params: Promise<{ tableId: string }>
  searchParams: Promise<{ orderId?: string }>
}

export default async function PosPage({ params, searchParams }: PageProps) {
  const { tableId } = await params
  const { orderId } = await searchParams
  
  // 1. Masayı bul
  const table = await tablesApi.getTableById(tableId)
  
  // 2. Eğer orderId yoksa, bu masada aktif sipariş var mı kontrol et
  let existingOrder = null
  if (!orderId) {
    const ordersResponse = await ordersApi.getOrders({
      restaurantId,
      tableId,
      status: 'pending'
    })
    existingOrder = ordersResponse.items?.[0]
  } else {
    existingOrder = await ordersApi.getOrderById(orderId)
  }
  
  // 3. Data fetch
  const [menuItems, categories] = await Promise.all([...])
  
  return (
    <OrdersClient
      restaurantId={restaurantId}
      tableId={tableId}           // YENİ PROP
      initialTable={table}        // YENİ PROP
      existingOrder={existingOrder} // YENİ PROP
      initialMenuItems={menuItems}
      initialCategories={categories}
    />
  )
}
```

### 4. OrdersClient - Masa Otomatik Seçimi

**Dosya**: `web/modules/orders/components/OrdersClient.tsx`

```typescript
interface OrdersClientProps {
  tableId?: string
  initialTable?: Table      // YENİ
  existingOrder?: Order     // YENİ
  // ... mevcut props
}

export function OrdersClient({
  tableId,
  initialTable,
  existingOrder,
  // ... mevcut props
}: OrdersClientProps) {
  // ...
  
  // İlk yüklemede masayı otomatik seç
  useEffect(() => {
    if (initialTable) {
      setSelectedTable(initialTable)
    }
  }, [initialTable, setSelectedTable])
  
  // Submit mantığı
  const handleSubmitOrder = async () => {
    if (!selectedTable) {
      toast.error('Lütfen masa seçin')
      return
    }
    
    if (basket.length === 0) {
      toast.error('Sepet boş')
      return
    }
    
    if (existingOrder) {
      // Aktif sipariş varsa GÜNCELLE
      await ordersApi.updateOrderItems(existingOrder.id, itemsToAdd)
      toast.success('Sipariş güncellendi')
    } else {
      // Yoksa YENİ OLUŞTUR
      await ordersApi.createOrder({...})
      toast.success('Sipariş oluşturuldu')
    }
  }
}
```

### 5. PosSubHeader - Masa Kilitleme

**Dosya**: `web/modules/orders/components/PosSubHeader.tsx`

```typescript
interface PosSubHeaderProps {
  isEditingMode: boolean      // YENİ
  lockedTable?: Table         // YENİ
  // ... mevcut props
}

export function PosSubHeader({
  isEditingMode,
  lockedTable,
  selectedTable,
  tables,
  onTableSelect,
  // ... mevcut props
}: PosSubHeaderProps) {
  // Edit modunda masa değiştirilemez
  const isTableLocked = isEditingMode && !!lockedTable
  
  return (
    <div>
      {/* Masa Seçici - Edit modunda kilitli */}
      <button
        disabled={isTableLocked}
        onClick={() => !isTableLocked && setIsTableDropdownOpen(!isTableDropdownOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-sm border',
          isTableLocked && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span>{selectedTable ? selectedTable.name : 'Masa Seç'}</span>
        {!isTableLocked && <ChevronDown size={16} />}
      </button>
    </div>
  )
}
```

### 6. PosBasket - Boş Sepet Kontrolü

**Dosya**: `web/modules/orders/components/PosBasket.tsx`

```typescript
// Sipariş Ver butonu her zaman sepet dolu olmalı
<Button
  variant="primary"
  disabled={basket.length === 0 || isLoading}  // YENİ: Boş sepet kontrolü
  isLoading={isLoading}
  onClick={onSubmit}
>
  {existingOrder ? 'Siparişi Güncelle' : 'Sipariş Ver'}
</Button>
```

---

## Dosya Listesi

| Dosya | Değişiklik |
|-------|------------|
| `web/app/(main)/orders/pos/[orderId]/page.tsx` | Rename to `[tableId]`, query params |
| `web/modules/tables/components/TablesClient.tsx` | `handleTableClick` sadeleştir |
| `web/modules/orders/components/OrdersClient.tsx` | Masa auto-select, submit mantığı |
| `web/modules/orders/components/PosSubHeader.tsx` | Kilitleme özelliği |
| `web/modules/orders/components/PosBasket.tsx` | Boş sepet kontrolü |

---

## Backend Değişiklikleri Gerekli mi?

Hayır, backend'de değişiklik gerekmiyor. Frontend akışı düzeldiğinde:

1. TablesClient artık boş order oluşturmayacak
2. OrdersClient:
   - tableId ile geldiğinde masa otomatik seçilecek
   - Aktif sipariş kontrolü yapacak
   - Varsa update, yoksa create yapacak

---

## Test Senaryoları

| Senaryo | Beklenen Sonuç |
|---------|---------------|
| Boş masa tıkla | `/orders/pos/tableId` açılır, masa seçili, buton pasif |
| Boş masaya ürün ekle | Sepet dolur, buton aktif olur |
| Sipariş Ver tıkla | Yeni sipariş oluşur |
| Dolu masa tıkla | `/orders/pos/tableId?orderId=xxx` açılır, sipariş yüklenir |
| Dolu masada sipariş güncelle | Mevcut sipariş güncellenir |
| Masa değiştirmeye çalış | Kilitli, değiştirilemez |
