import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/modules/shared/components/Button'
import { Modal } from '@/modules/shared/components/Modal'
import type { useGuestBasket } from '../hooks/useGuestBasket'
import type { GuestTableGuestOrderSummary } from '../types'
import { formatCurrency } from './guest-view-utils'

interface GuestCartViewProps {
  basket: ReturnType<typeof useGuestBasket>
  invalidMenuItemIds: Set<string>
  isSessionEnded: boolean
  onSubmit: () => Promise<void>
  otherGuestSummary: GuestTableGuestOrderSummary
}

export function GuestCartView({
  basket,
  invalidMenuItemIds,
  isSessionEnded,
  onSubmit,
  otherGuestSummary,
}: GuestCartViewProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const hasInvalidItems = invalidMenuItemIds.size > 0

  const handleConfirmSubmit = async () => {
    await onSubmit()
    setIsConfirmOpen(false)
  }

  return (
    <>
      <section className="space-y-4 px-4 pt-4">
        <div className="rounded-2xl border border-border-light bg-bg-surface p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
            Sepet
          </p>
          <h2 className="mt-1 text-lg font-black text-text-primary">
            Siparişini düzenle
          </h2>
        </div>

        {basket.basketItems.length ? (
          <div className="space-y-3">
            {basket.basketItems.map((item) => {
              const isInvalid = invalidMenuItemIds.has(item.menuItemId)

              return (
                <article
                  key={item.menuItemId}
                  className="rounded-2xl border border-border-light bg-bg-surface p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-text-primary">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs font-medium text-text-secondary">
                        Birim: {formatCurrency(item.unitPrice)}
                      </p>
                      {isInvalid ? (
                        <p className="mt-2 text-xs font-medium text-red-700">
                          Bu ürün artık serviste değil.
                        </p>
                      ) : null}
                    </div>

                    <p className="shrink-0 text-sm font-black tabular-nums text-text-primary">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="rounded-xl border border-border-light bg-bg-muted p-1">
                      <div className="grid grid-cols-[36px_44px_36px] items-center gap-2">
                        <button
                          type="button"
                          onClick={() => basket.changeQuantity(item.menuItemId, -1)}
                          disabled={isSessionEnded}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-surface text-text-primary shadow-sm transition hover:bg-bg-hover disabled:opacity-40"
                          aria-label={`${item.name} azalt`}
                        >
                          <Minus className="h-4 w-4" strokeWidth={1.8} />
                        </button>

                        <span className="text-center text-sm font-black tabular-nums text-text-primary">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => basket.changeQuantity(item.menuItemId, 1)}
                          disabled={isSessionEnded || isInvalid}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-main text-text-inverse shadow-sm transition hover:bg-primary-hover disabled:opacity-40"
                          aria-label={`${item.name} artır`}
                        >
                          <Plus className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted"
                      onClick={() => basket.removeItem(item.menuItemId)}
                    >
                      Kaldır
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-border-light bg-bg-surface px-4 py-5 text-sm font-medium text-text-secondary shadow-sm">
            Henüz sepetine ürün eklemedin.
          </div>
        )}

        {otherGuestSummary.otherSessionsOrdersCount > 0 ? (
          <div className="rounded-2xl border border-border-light bg-bg-surface p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
              Masadaki Diğer Siparişler
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border-light bg-bg-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
                  Sipariş
                </p>
                <p className="mt-1 text-sm font-black text-text-primary">
                  {otherGuestSummary.otherSessionsOrdersCount}
                </p>
              </div>
              <div className="rounded-xl border border-border-light bg-bg-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
                  Toplam Kalem
                </p>
                <p className="mt-1 text-sm font-black text-text-primary">
                  {otherGuestSummary.otherSessionsItemCount}
                </p>
              </div>
              <div className="rounded-xl border border-border-light bg-bg-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
                  Tutar
                </p>
                <p className="mt-1 text-sm font-black text-text-primary">
                  {formatCurrency(otherGuestSummary.otherSessionsTotalAmount)}
                </p>
              </div>
            </div>

            {otherGuestSummary.previewItems.length ? (
              <div className="mt-4 space-y-2 border-t border-border-light pt-3">
                {otherGuestSummary.previewItems.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="grid grid-cols-[minmax(0,1fr)_36px_96px] items-center gap-3 text-xs font-medium text-text-secondary"
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="text-right tabular-nums">{item.quantity}x</span>
                    <span className="text-right font-bold tabular-nums text-text-primary">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <p className="mt-4 rounded-xl border border-primary-main/10 bg-primary-subtle px-3 py-2 text-xs font-medium text-text-secondary">
              Bu siparişler yalnızca bilgi amaçlıdır. Siparişiniz sadece kendi
              seçtiklerinizden oluşturulur.
            </p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-border-light bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                Ara Toplam
              </p>
              <p className="mt-1 text-xl font-black tabular-nums text-text-primary">
                {formatCurrency(basket.totalAmount)}
              </p>
            </div>
          </div>

          {hasInvalidItems ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              Sepette artık sunulmayan ürünler var. Göndermeden önce kaldırın.
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-border-light bg-bg-surface normal-case tracking-normal text-xs font-bold text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              onClick={() => void basket.syncDraft()}
              disabled={isSessionEnded || basket.basketItems.length === 0}
              isLoading={basket.isSavingDraft}
            >
              Taslağı Kaydet
            </Button>
            <Button
              className="rounded-xl bg-primary-main normal-case tracking-normal text-xs font-bold text-text-inverse hover:bg-primary-hover"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isSessionEnded || basket.basketItems.length === 0 || hasInvalidItems}
              isLoading={basket.isSubmitting}
            >
              Siparişi Gönder
            </Button>
          </div>
        </div>
      </section>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Siparis Ozetini Onayla"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border-light bg-bg-muted px-4 py-3 text-sm font-medium text-text-secondary">
            Masadaki diğer siparişler bu işleme dahil değildir.
          </div>

          <div className="space-y-3">
            {basket.basketItems.map((item) => (
              <div
                key={`confirm-${item.menuItemId}`}
                className="grid grid-cols-[minmax(0,1fr)_40px_120px] items-center gap-3 rounded-xl border border-border-light bg-bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-text-primary">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs font-medium text-text-secondary">
                    {formatCurrency(item.unitPrice)} / adet
                  </p>
                </div>
                <span className="text-right text-sm font-black text-text-secondary">
                  {item.quantity}x
                </span>
                <span className="text-right text-sm font-black text-text-primary">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border-light bg-bg-muted px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">
                Genel Toplam
              </span>
              <span className="text-base font-black text-text-primary">
                {formatCurrency(basket.totalAmount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={basket.isSubmitting}
            >
              Vazgeç
            </Button>
            <Button
              className="bg-primary-main text-text-inverse hover:bg-primary-hover"
              onClick={() => void handleConfirmSubmit()}
              isLoading={basket.isSubmitting}
              disabled={basket.isSubmitting}
            >
              Onayla ve Gönder
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
