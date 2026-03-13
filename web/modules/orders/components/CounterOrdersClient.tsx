'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { OrderModeSwitcher } from './OrderModeSwitcher'
import { SubHeaderSection, BodySection } from '@/modules/shared/components/layout'
import { Button } from '@/modules/shared/components/Button'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { MenuItem } from '@/modules/products/types'
import { ordersApi } from '../services'
import { Order, ORDER_STATUS_LABELS, OrderStatus, OrderType, PickupType } from '../types'
import { CategoryTabs } from './CategoryTabs'
import { ProductGrid } from './ProductGrid'
import { CounterCart } from './CounterCart'

interface CounterOrdersClientProps {
  restaurantId: string
  initialItems: MenuItem[]
}

type BasketRow = {
  menuItemId: string
  name: string
  unitPrice: number
  quantity: number
  sendToKitchen: boolean
}

export function CounterOrdersClient({
  restaurantId,
  initialItems,
}: CounterOrdersClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<string>('__all__')
  const [basket, setBasket] = useState<BasketRow[]>([])
  const [pickupType, setPickupType] = useState<PickupType>(PickupType.IMMEDIATE)
  const [pickupTime, setPickupTime] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
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

  const submit = async () => {
    if (basket.length === 0) {
      toast.error('Sepet boş')
      return
    }
    if (pickupType === PickupType.SCHEDULED && !pickupTime) {
      toast.error('Planlı teslim için saat seçmelisiniz')
      return
    }

    setSubmitting(true)
    try {
      const created = await ordersApi.createOrder({
        type: OrderType.COUNTER,
        pickup_type: pickupType,
        pickup_time: pickupType === PickupType.SCHEDULED ? pickupTime : undefined,
        customer_name: customerName || undefined,
        items: basket.map((row) => ({
          menu_item_id: row.menuItemId,
          quantity: row.quantity,
          send_to_kitchen: row.sendToKitchen,
        })),
      })
      toast.success('Sipariş oluşturuldu, ödeme ekranına yönlendiriliyorsunuz')
      router.push(`/orders/${created.id}/payment?source=counter`)
    } catch (error) {
      console.error(error)
      toast.error('Sipariş oluşturulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!isHistoryOpen) return

    const loadHistory = async () => {
      setHistoryLoading(true)
      try {
        const res = await ordersApi.getOrders({
          page: 1,
          limit: 20,
          type: OrderType.COUNTER,
          status: [
            OrderStatus.PENDING,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.SERVED,
            OrderStatus.ON_WAY,
          ],
        })
        setHistoryOrders(res.items)
      } catch (error) {
        console.error(error)
        toast.error('Geçmiş siparişler yüklenemedi')
      } finally {
        setHistoryLoading(false)
      }
    }

    loadHistory()
  }, [isHistoryOpen])

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <SubHeaderSection
        title="TEZGAH SİPARİŞİ"
        description="Counter hızlı satış akışı"
        moduleColor="bg-primary-main"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="min-h-10 px-4 text-[10px]"
              onClick={() => setIsHistoryOpen(true)}
            >
              📋 Geçmiş Siparişler
            </Button>
            <OrderModeSwitcher />
          </div>
        }
      />
      <BodySection noPadding className="min-h-0 overflow-hidden p-0">
        <div className="grid h-full min-h-0 grid-cols-1 gap-4 p-4 lg:grid-cols-12">
          <section className="flex min-h-0 flex-col rounded-sm border border-border-light bg-bg-surface p-4 lg:col-span-8">
            <input
              className="mb-3 min-h-11 w-full rounded-sm border border-border-light bg-bg-app px-3 py-2 text-sm"
              placeholder="Ürün ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <CategoryTabs
              categories={categories}
              activeCategoryId={activeCategoryId}
              onCategoryChange={setActiveCategoryId}
            />
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <ProductGrid
                items={filteredItems}
                basketQuantities={basketQuantities}
                onAddItem={addItem}
              />
            </div>
          </section>

          <div className="lg:col-span-4">
            <CounterCart
              basket={basket}
              total={total}
              pickupType={pickupType}
              pickupTime={pickupTime}
              customerName={customerName}
              submitting={submitting}
              onDecrease={decreaseQuantity}
              onIncrease={increaseQuantity}
              onSetSendToKitchen={setSendToKitchen}
              onPickupTypeChange={setPickupType}
              onPickupTimeChange={setPickupTime}
              onCustomerNameChange={setCustomerName}
              onSubmit={submit}
            />
          </div>
        </div>
      </BodySection>

      {isHistoryOpen ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            className="flex-1 bg-black/30"
            onClick={() => setIsHistoryOpen(false)}
            aria-label="Geçmiş siparişleri kapat"
          />
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-border-light bg-bg-surface p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-text-primary">
                Açık Counter Siparişleri
              </h3>
              <Button
                variant="ghost"
                className="min-h-10 px-3"
                onClick={() => setIsHistoryOpen(false)}
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
                Açık counter siparişi bulunmuyor.
              </div>
            ) : null}

            <div className="space-y-2">
              {historyOrders.map((order) => {
                const itemCount = order.items.reduce(
                  (sum, item) => sum + Number(item.quantity || 0),
                  0,
                )
                const localTime = new Date(order.createdAt).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Europe/Istanbul',
                })
                const isPaid = order.status === OrderStatus.PAID

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() =>
                      router.push(`/orders/${order.id}/payment?source=counter&from=history`)
                    }
                    className="w-full rounded-sm border border-border-light bg-bg-app p-3 text-left transition-transform active:scale-[0.97]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-text-primary">
                        {localTime}
                      </span>
                      <span
                        className={`text-xs font-black uppercase ${
                          isPaid ? 'text-success-main' : 'text-warning-main'
                        }`}
                      >
                        {isPaid
                          ? 'Ödendi'
                          : ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                      {itemCount} ürün
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
