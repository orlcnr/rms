'use client'

import { Button } from '@/modules/shared/components/Button'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { PickupType } from '../types'

type CounterBasketRow = {
  menuItemId: string
  name: string
  unitPrice: number
  quantity: number
  sendToKitchen: boolean
}

interface CounterCartProps {
  basket: CounterBasketRow[]
  total: number
  pickupType: PickupType
  pickupTime: string
  customerName: string
  submitting: boolean
  onDecrease: (menuItemId: string) => void
  onIncrease: (menuItemId: string) => void
  onSetSendToKitchen: (menuItemId: string, value: boolean) => void
  onPickupTypeChange: (pickupType: PickupType) => void
  onPickupTimeChange: (value: string) => void
  onCustomerNameChange: (value: string) => void
  onSubmit: () => void
}

export function CounterCart({
  basket,
  total,
  pickupType,
  pickupTime,
  customerName,
  submitting,
  onDecrease,
  onIncrease,
  onSetSendToKitchen,
  onPickupTypeChange,
  onPickupTimeChange,
  onCustomerNameChange,
  onSubmit,
}: CounterCartProps) {
  return (
    <aside className="rounded-sm border border-border-light bg-bg-surface p-4 lg:sticky lg:top-4 lg:h-[calc(100vh-190px)] lg:overflow-hidden">
      <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-text-primary">
        Sepet
      </h3>

      <div className="space-y-2 lg:max-h-[calc(100%-290px)] lg:overflow-y-auto lg:pr-1">
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
                  onClick={() => onDecrease(row.menuItemId)}
                  className="flex h-11 w-11 items-center justify-center rounded-sm border border-border-light bg-bg-app text-xl font-bold text-text-primary transition-transform active:scale-[0.97]"
                  aria-label={`${row.name} azalt`}
                >
                  -
                </button>
                <div className="flex h-11 min-w-11 items-center justify-center rounded-sm bg-bg-app px-3 text-sm font-bold text-text-primary">
                  {row.quantity}
                </div>
                <button
                  type="button"
                  onClick={() => onIncrease(row.menuItemId)}
                  className="flex h-11 w-11 items-center justify-center rounded-sm border border-border-light bg-bg-app text-xl font-bold text-text-primary transition-transform active:scale-[0.97]"
                  aria-label={`${row.name} artır`}
                >
                  +
                </button>
              </div>
              <label className="flex items-center gap-2 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={row.sendToKitchen}
                  onChange={(e) => onSetSendToKitchen(row.menuItemId, e.target.checked)}
                  className="h-4 w-4"
                />
                Mutfağa gönder
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3 border-t border-border-light pt-3">
        <input
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          placeholder="Müşteri adı (opsiyonel)"
          className="min-h-11 w-full rounded-sm border border-border-light bg-bg-app px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onPickupTypeChange(PickupType.IMMEDIATE)}
            className={`min-h-11 rounded-sm border px-3 text-sm font-black uppercase tracking-[0.12em] transition-transform active:scale-[0.97] ${
              pickupType === PickupType.IMMEDIATE
                ? 'border-primary-main bg-primary-main text-white'
                : 'border-border-light bg-bg-app text-text-muted'
            }`}
          >
            Hemen
          </button>
          <button
            type="button"
            onClick={() => onPickupTypeChange(PickupType.SCHEDULED)}
            className={`min-h-11 rounded-sm border px-3 text-sm font-black uppercase tracking-[0.12em] transition-transform active:scale-[0.97] ${
              pickupType === PickupType.SCHEDULED
                ? 'border-primary-main bg-primary-main text-white'
                : 'border-border-light bg-bg-app text-text-muted'
            }`}
          >
            Sonra Gelir
          </button>
        </div>
        {pickupType === PickupType.SCHEDULED ? (
          <input
            type="time"
            value={pickupTime}
            onChange={(e) => onPickupTimeChange(e.target.value)}
            className="min-h-11 w-full rounded-sm border border-border-light bg-bg-app px-3 py-2 text-sm"
          />
        ) : null}
        <div className="text-base font-black text-text-primary">
          Toplam: {formatCurrency(total)}
        </div>
        <Button
          variant="primary"
          className="min-h-11 w-full"
          isLoading={submitting}
          onClick={onSubmit}
        >
          Siparişi Oluştur
        </Button>
      </div>
    </aside>
  )
}
