import type { GuestOrder } from '../types'
import {
  formatCurrency,
  formatGuestOrderTimestamp,
  getGuestOrderStatusMeta,
} from './guest-view-utils'

interface GuestOrdersViewProps {
  orders: GuestOrder[]
}

export function GuestOrdersView({ orders }: GuestOrdersViewProps) {
  return (
    <section className="space-y-4 px-4 pt-4">
      <div className="rounded-2xl border border-border-light bg-bg-surface p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
          Siparişler
        </p>
        <h2 className="mt-1 text-lg font-black text-text-primary">
          Bu masanin misafir siparisleri
        </h2>
        <p className="mt-1 text-xs font-medium leading-5 text-text-secondary">
          Bekleyen, onaylanan ve reddedilen misafir siparislerini buradan takip edin.
        </p>
      </div>

      {orders.length ? (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusMeta = getGuestOrderStatusMeta(
              order.linkedOrderStatus || order.status,
            )
            const submittedAt = formatGuestOrderTimestamp(order.submittedAt)

            return (
              <article
                key={order.id}
                className="rounded-2xl border border-border-light bg-bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                    <div className="mt-3 space-y-1">
                      {submittedAt ? (
                        <p className="text-xs font-medium text-text-secondary">
                          Gönderim: {submittedAt}
                        </p>
                      ) : null}
                      <p className="text-xs font-medium text-text-secondary">
                        {order.items.length} kalem
                      </p>
                    </div>
                  </div>

                  <p className="shrink-0 text-sm font-black tabular-nums text-text-primary">
                    {formatCurrency(order.totalAmount)}
                  </p>
                </div>

                <div className="mt-4 space-y-2 border-t border-border-light pt-3">
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.menuItemId}-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_32px_88px] items-center gap-3 text-xs font-medium text-text-secondary"
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="text-right tabular-nums">{item.quantity}x</span>
                      <span className="text-right font-bold tabular-nums text-text-primary">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {order.rejectedReason ? (
                  <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    Sebep: {order.rejectedReason}
                  </p>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-border-light bg-bg-surface px-4 py-5 text-sm font-medium text-text-secondary shadow-sm">
          Bu masa icin goruntulenecek misafir siparisi bulunmuyor.
        </div>
      )}
    </section>
  )
}
