'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SubHeaderSection, BodySection } from '@/modules/shared/components/layout'
import { Button } from '@/modules/shared/components/Button'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { MenuItem } from '@/modules/products/types'
import { ordersApi } from '../services'
import { DeliveryStatus, Order, OrderStatus, OrderType } from '../types'
import { OrderModeSwitcher } from './OrderModeSwitcher'
import { CategoryTabs } from './CategoryTabs'
import { ProductGrid } from './ProductGrid'

interface DeliveryOrdersClientProps {
  restaurantId: string
  initialItems: MenuItem[]
  initialOrders: Order[]
}

type BasketRow = {
  menuItemId: string
  name: string
  unitPrice: number
  quantity: number
  sendToKitchen: boolean
}

const DELIVERY_FLOW: Record<DeliveryStatus, DeliveryStatus | null> = {
  [DeliveryStatus.PENDING]: DeliveryStatus.CONFIRMED,
  [DeliveryStatus.CONFIRMED]: DeliveryStatus.PREPARING,
  [DeliveryStatus.PREPARING]: DeliveryStatus.READY,
  [DeliveryStatus.READY]: DeliveryStatus.ON_THE_WAY,
  [DeliveryStatus.ON_THE_WAY]: DeliveryStatus.DELIVERED,
  [DeliveryStatus.DELIVERED]: null,
  [DeliveryStatus.CANCELLED]: null,
}

export function DeliveryOrdersClient({
  restaurantId,
  initialItems,
  initialOrders,
}: DeliveryOrdersClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<string>('__all__')
  const [basket, setBasket] = useState<BasketRow[]>([])
  const [customerName, setCustomerName] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyOrders, setHistoryOrders] = useState<Order[]>([])

  const categories = useMemo(() => {
    const map = new Map<string, string>()
    initialItems.forEach((item) => {
      if (!item.category_id) return
      map.set(item.category_id, item.category?.name || 'Kategori')
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [initialItems])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return initialItems.filter((item) => {
      const matchesCategory =
        activeCategoryId === '__all__' || item.category_id === activeCategoryId
      const matchesSearch = !q || item.name.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [initialItems, search, activeCategoryId])

  const total = basket.reduce((sum, row) => sum + row.unitPrice * row.quantity, 0)
  const basketQuantities = useMemo(
    () =>
      basket.reduce<Record<string, number>>((acc, row) => {
        acc[row.menuItemId] = row.quantity
        return acc
      }, {}),
    [basket],
  )

  const addItem = (item: MenuItem) => {
    setBasket((prev) => {
      const index = prev.findIndex((row) => row.menuItemId === item.id)
      if (index >= 0) {
        const next = [...prev]
        next[index] = { ...next[index], quantity: next[index].quantity + 1 }
        return next
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          unitPrice: Number(item.effective_price ?? item.price ?? 0),
          quantity: 1,
          sendToKitchen: Boolean(item.requires_kitchen ?? true),
        },
      ]
    })
  }

  const setQuantity = (menuItemId: string, quantity: number) => {
    setBasket((prev) =>
      prev
        .map((row) =>
          row.menuItemId === menuItemId ? { ...row, quantity: Math.max(0, quantity) } : row,
        )
        .filter((row) => row.quantity > 0),
    )
  }

  const increaseQuantity = (menuItemId: string) => {
    const current = basket.find((row) => row.menuItemId === menuItemId)
    if (!current) return
    setQuantity(menuItemId, current.quantity + 1)
  }

  const decreaseQuantity = (menuItemId: string) => {
    const current = basket.find((row) => row.menuItemId === menuItemId)
    if (!current) return
    setQuantity(menuItemId, current.quantity - 1)
  }

  const setSendToKitchen = (menuItemId: string, value: boolean) => {
    setBasket((prev) =>
      prev.map((row) =>
        row.menuItemId === menuItemId ? { ...row, sendToKitchen: value } : row,
      ),
    )
  }

  const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
    [DeliveryStatus.PENDING]: 'Pending',
    [DeliveryStatus.CONFIRMED]: 'Onaylandı',
    [DeliveryStatus.PREPARING]: 'Hazırlanıyor',
    [DeliveryStatus.READY]: 'Hazır',
    [DeliveryStatus.ON_THE_WAY]: 'Yolda',
    [DeliveryStatus.DELIVERED]: 'Teslim',
    [DeliveryStatus.CANCELLED]: 'İptal',
  }

  const getPaymentBadge = (orderStatus: OrderStatus) => {
    if (orderStatus === OrderStatus.PAID) {
      return {
        label: 'Ödendi',
        className: 'bg-success-bg text-success-main border-success-border',
      }
    }
    if (orderStatus === OrderStatus.CANCELLED) {
      return {
        label: 'İptal',
        className: 'bg-danger-bg text-danger-main border-danger-border',
      }
    }
    return {
      label: 'Ödeme Bekliyor',
      className: 'bg-warning-bg text-warning-text border-warning-border',
    }
  }

  const fetchActiveOrders = async () => {
    const res = await ordersApi.getOrders({
      page: 1,
      limit: 100,
      type: OrderType.DELIVERY,
    })
    setOrders(res.items)
  }

  const fetchHistoryOrders = async () => {
    const res = await ordersApi.getOrders({
      page: 1,
      limit: 20,
      type: OrderType.DELIVERY,
      status: [
        OrderStatus.PENDING,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.SERVED,
        OrderStatus.ON_WAY,
      ],
    })
    setHistoryOrders(res.items)
  }

  const submit = async () => {
    if (!deliveryAddress.trim() || !deliveryPhone.trim()) {
      toast.error('Paket siparişi için adres ve telefon zorunludur')
      return
    }
    if (basket.length === 0) {
      toast.error('Sepet boş')
      return
    }
    setSubmitting(true)
    try {
      const created = await ordersApi.createOrder({
        type: OrderType.DELIVERY,
        customer_name: customerName || undefined,
        delivery_phone: deliveryPhone,
        delivery_address: deliveryAddress,
        delivery_status: DeliveryStatus.PENDING,
        items: basket.map((row) => ({
          menu_item_id: row.menuItemId,
          quantity: row.quantity,
          send_to_kitchen: row.sendToKitchen,
        })),
      })
      setOrders((prev) => [created, ...prev])
      setBasket([])
      setCustomerName('')
      setDeliveryPhone('')
      setDeliveryAddress('')
      toast.success('Paket siparişi oluşturuldu')
      void fetchActiveOrders().catch((error) => {
        console.error(error)
      })
    } catch (error) {
      console.error(error)
      toast.error('Sipariş oluşturulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  const advanceStatus = async (order: Order) => {
    const current = (order.delivery_status || DeliveryStatus.PENDING) as DeliveryStatus
    const next = DELIVERY_FLOW[current]
    if (!next) return
    setUpdatingOrderId(order.id)
    try {
      const updated = await ordersApi.updateDeliveryStatus(order.id, {
        delivery_status: next,
      })
      setOrders((prev) => prev.map((row) => (row.id === order.id ? updated : row)))
      toast.success('Teslimat durumu güncellendi')
      void fetchActiveOrders().catch((error) => {
        console.error(error)
      })
    } catch (error) {
      console.error(error)
      toast.error('Teslimat durumu güncellenemedi')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const openHistory = async () => {
    setHistoryOpen(true)
    setHistoryLoading(true)
    try {
      await fetchHistoryOrders()
    } catch (error) {
      console.error(error)
      toast.error('Geçmiş siparişler yüklenemedi')
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <SubHeaderSection
        title="PAKET SİPARİŞLER"
        description="Delivery sipariş oluşturma ve takip"
        moduleColor="bg-warning-main"
        actions={<OrderModeSwitcher />}
      />

      <BodySection className="grid grid-cols-1 gap-4 xl:min-h-0 xl:grid-cols-12">
        <section className="rounded-sm border border-border-light bg-bg-surface p-4 xl:col-span-8 xl:flex xl:min-h-0 xl:flex-col">
          <h3 className="mb-3 flex-shrink-0 text-xs font-black uppercase tracking-wider text-text-primary">
            Yeni Paket Sipariş
          </h3>
          <div className="grid flex-shrink-0 grid-cols-1 gap-2 md:grid-cols-2">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Müşteri adı (opsiyonel)"
              className="min-h-11 rounded-sm border border-border-light bg-bg-app px-3 py-2 text-sm"
            />
            <input
              value={deliveryPhone}
              onChange={(e) => setDeliveryPhone(e.target.value)}
              placeholder="Telefon *"
              className="min-h-11 rounded-sm border border-border-light bg-bg-app px-3 py-2 text-sm"
            />
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Adres *"
              className="md:col-span-2 rounded-sm border border-border-light bg-bg-app px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          <div className="my-3 flex-shrink-0">
            <input
              className="min-h-11 w-full rounded-sm border border-border-light bg-bg-app px-3 py-2 text-sm"
              placeholder="Ürün ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <CategoryTabs
              categories={categories}
              activeCategoryId={activeCategoryId}
              onCategoryChange={setActiveCategoryId}
            />
          </div>

          <div className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1 custom-scrollbar">
            <ProductGrid
              items={filteredItems}
              basketQuantities={basketQuantities}
              onAddItem={addItem}
            />
          </div>

          <div className="mt-4 flex-shrink-0 rounded-sm border border-border-light p-3">
            <h4 className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-text-primary">
              Sepet
            </h4>
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
              {basket.length === 0 ? (
                <div className="rounded-sm border border-dashed border-border-light bg-bg-app p-4 text-sm text-text-muted">
                  Sepet boş. Ürün seçerek başlayın.
                </div>
              ) : null}
              {basket.map((row) => (
                <div key={row.menuItemId} className="rounded-sm border border-border-light p-3">
                  <div className="text-sm font-bold text-text-primary">{row.name}</div>
                  <div className="mt-1 text-xs text-text-muted">
                    {formatCurrency(row.unitPrice * row.quantity)}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => decreaseQuantity(row.menuItemId)}
                        className="flex h-11 w-11 items-center justify-center rounded-sm border border-border-light bg-bg-app text-xl font-bold text-text-primary transition-transform active:scale-[0.97]"
                      >
                        -
                      </button>
                      <div className="flex h-11 min-w-11 items-center justify-center rounded-sm bg-bg-app px-3 text-sm font-bold text-text-primary">
                        {row.quantity}
                      </div>
                      <button
                        type="button"
                        onClick={() => increaseQuantity(row.menuItemId)}
                        className="flex h-11 w-11 items-center justify-center rounded-sm border border-border-light bg-bg-app text-xl font-bold text-text-primary transition-transform active:scale-[0.97]"
                      >
                        +
                      </button>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-text-muted">
                      <input
                        type="checkbox"
                        checked={row.sendToKitchen}
                        onChange={(e) => setSendToKitchen(row.menuItemId, e.target.checked)}
                        className="h-4 w-4"
                      />
                      Mutfağa gönder
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex-shrink-0 border-t border-border-light pt-3">
            <div className="mb-2 text-base font-black text-text-primary">
              Sepet Toplamı: {formatCurrency(total)}
            </div>
            <Button
              variant="primary"
              className="min-h-11 w-full"
              isLoading={submitting}
              onClick={submit}
            >
              Paket Siparişi Oluştur
            </Button>
          </div>
        </section>

        <aside className="rounded-sm border border-border-light bg-bg-surface p-4 xl:col-span-4 xl:flex xl:min-h-0 xl:h-[calc(100vh-190px)] xl:flex-col xl:overflow-hidden xl:sticky xl:top-4">
          <div className="mb-3 flex flex-shrink-0 items-center justify-between gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
              Aktif Paketler
            </h3>
            <Button
              variant="outline"
              className="min-h-10 px-3 text-[10px]"
              onClick={openHistory}
            >
              📋 Geçmiş
            </Button>
          </div>
          {orders.length === 0 ? (
            <div className="rounded-sm border border-dashed border-border-light bg-bg-app p-4 text-center xl:flex-1">
              <p className="text-xs font-bold text-text-muted">
                Henüz paket siparişi yok.
              </p>
              <p className="mt-1 text-[11px] text-text-muted">
                Sol taraftan yeni paket siparişi oluşturduğunuzda burada takip edebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="space-y-3 custom-scrollbar xl:flex-1 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
              {orders.map((order) => {
                const current = (order.delivery_status || DeliveryStatus.PENDING) as DeliveryStatus
                const next = DELIVERY_FLOW[current]
                const paymentBadge = getPaymentBadge(order.status)
                return (
                  <div key={order.id} className="rounded-sm border border-border-light p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-text-primary">
                          {order.orderNumber || order.id.slice(0, 8)}
                        </div>
                        <div
                          className={`mt-1 inline-flex rounded-sm border px-2 py-1 text-[10px] font-black uppercase ${paymentBadge.className}`}
                        >
                          {paymentBadge.label}
                        </div>
                      </div>
                      <span className="rounded-sm bg-primary-subtle px-2 py-1 text-[10px] font-black uppercase text-primary-main">
                        {DELIVERY_STATUS_LABELS[current]}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-text-muted">
                      {order.customer_name || order.customer?.name || '-'}
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                      {order.delivery_phone || '-'}
                    </div>
                    <div className="mt-1 text-xs text-text-muted line-clamp-2">
                      {order.delivery_address || '-'}
                    </div>
                    <div className="mt-2 text-sm font-bold text-text-primary">
                      {formatCurrency(order.totalAmount)}
                    </div>
                    {next ? (
                      <Button
                        size="lg"
                        className="mt-3 min-h-11 w-full"
                        disabled={updatingOrderId === order.id}
                        onClick={() => advanceStatus(order)}
                      >
                        {DELIVERY_STATUS_LABELS[next]}
                      </Button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </aside>
      </BodySection>

      {historyOpen ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Geçmiş drawer kapat"
            onClick={() => setHistoryOpen(false)}
            className="flex-1 bg-black/30"
          />
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-border-light bg-bg-surface p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-text-primary">
                Açık Paket Siparişleri
              </h3>
              <Button
                variant="ghost"
                className="min-h-10 px-3"
                onClick={() => setHistoryOpen(false)}
              >
                Kapat
              </Button>
            </div>

            {historyLoading ? (
              <div className="rounded-sm border border-border-light bg-bg-app p-4 text-sm text-text-muted">
                Yükleniyor...
              </div>
            ) : null}

            {!historyLoading && historyOrders.length === 0 ? (
              <div className="rounded-sm border border-border-light bg-bg-app p-4 text-sm text-text-muted">
                Açık paket siparişi bulunmuyor.
              </div>
            ) : null}

            <div className="space-y-2">
              {historyOrders.map((order) => {
                const localTime = new Date(order.createdAt).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Europe/Istanbul',
                })
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() =>
                      router.push(`/orders/${order.id}/payment?source=delivery&from=history`)
                    }
                    className="w-full rounded-sm border border-border-light bg-bg-app p-3 text-left transition-transform active:scale-[0.97]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-text-primary">{localTime}</span>
                      <span className="text-xs font-black uppercase text-primary-main">
                        {DELIVERY_STATUS_LABELS[
                          (order.delivery_status || DeliveryStatus.PENDING) as DeliveryStatus
                        ]}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                      {order.customer_name || order.customer?.name || '-'}
                    </div>
                    <div className="mt-1 text-sm font-black text-text-primary">
                      {formatCurrency(order.totalAmount)}
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
