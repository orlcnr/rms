import { Button } from '@/modules/shared/components/Button'
import * as React from 'react'
import type { GuestBootstrapResponse } from '../types'
import { formatCurrency } from './guest-view-utils'

interface GuestAccountViewProps {
  items: GuestBootstrapResponse['tableBill']['items']
  totalAmount: number
  billRemaining: number
  waiterRemaining: number
  isSessionEnded: boolean
  onBillRequest: () => Promise<void>
  onWaiterRequest: (note?: string) => Promise<void>
}

export function GuestAccountView({
  items,
  totalAmount,
  billRemaining,
  waiterRemaining,
  isSessionEnded,
  onBillRequest,
  onWaiterRequest,
}: GuestAccountViewProps) {
  const [activeConfirmation, setActiveConfirmation] = React.useState<'bill' | 'waiter' | null>(null)
  const [waiterNote, setWaiterNote] = React.useState('')
  const [pendingAction, setPendingAction] = React.useState<'bill' | 'waiter' | null>(null)

  const isBillDisabled = isSessionEnded || billRemaining > 0 || pendingAction !== null
  const isWaiterDisabled =
    isSessionEnded || waiterRemaining > 0 || pendingAction !== null

  async function handleConfirmBillRequest() {
    setPendingAction('bill')

    try {
      await onBillRequest()
      setActiveConfirmation(null)
    } finally {
      setPendingAction(null)
    }
  }

  async function handleConfirmWaiterRequest() {
    setPendingAction('waiter')

    try {
      const normalizedNote = waiterNote.trim()
      await onWaiterRequest(normalizedNote || undefined)
      setWaiterNote('')
      setActiveConfirmation(null)
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <section className="space-y-4 px-4 pt-4">
      <div className="rounded-2xl border border-border-light bg-bg-surface p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
          Hesap
        </p>
        <h2 className="mt-1 text-lg font-black text-text-primary">Masa adisyonu</h2>
        <p className="mt-1 text-xs font-medium leading-5 text-text-secondary">
          Açık masa toplamını buradan takip edebilirsiniz.
        </p>
      </div>

      <div className="rounded-2xl border border-primary-main/15 bg-primary-subtle p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-main">
          Toplam
        </p>
        <p className="mt-2 text-3xl font-black tabular-nums text-text-primary">
          {formatCurrency(totalAmount)}
        </p>
      </div>

      {items.length ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="grid grid-cols-[minmax(0,1fr)_40px_86px] gap-3 rounded-xl border border-border-light bg-bg-surface px-4 py-3 shadow-sm"
            >
              <span className="truncate text-sm font-medium text-text-primary">
                {item.name}
              </span>
              <span className="text-right text-sm font-medium tabular-nums text-text-secondary">
                {item.quantity}
              </span>
              <span className="text-right text-sm font-black tabular-nums text-text-primary">
                {formatCurrency(item.subtotal)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border-light bg-bg-surface px-4 py-5 text-sm font-medium text-text-secondary shadow-sm">
          Masada açık hesap kalemi bulunmuyor.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          className="rounded-xl bg-primary-main normal-case tracking-normal text-xs font-bold text-text-inverse hover:bg-primary-hover"
          onClick={() =>
            setActiveConfirmation((current) => (current === 'bill' ? null : 'bill'))
          }
          disabled={isBillDisabled}
        >
          {billRemaining > 0 ? `Hesap ${billRemaining} sn` : 'Hesap İste'}
        </Button>
        <Button
          variant="outline"
          className="rounded-xl border-border-light bg-bg-surface normal-case tracking-normal text-xs font-bold text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          onClick={() =>
            setActiveConfirmation((current) => (current === 'waiter' ? null : 'waiter'))
          }
          disabled={isWaiterDisabled}
        >
          {waiterRemaining > 0 ? `Garson ${waiterRemaining} sn` : 'Garson Çağır'}
        </Button>
      </div>

      {activeConfirmation === 'bill' ? (
        <div className="rounded-2xl border border-primary-main/20 bg-bg-surface p-4 shadow-sm">
          <p className="text-sm font-bold text-text-primary">
            Hesap isteği gönderilsin mi?
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            Personel masanıza yönlendirilecek ve hesap talebiniz iletilecek.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              className="rounded-xl normal-case tracking-normal text-xs"
              onClick={() => void handleConfirmBillRequest()}
              isLoading={pendingAction === 'bill'}
            >
              Onayla
            </Button>
            <Button
              variant="outline"
              className="rounded-xl normal-case tracking-normal text-xs"
              onClick={() => setActiveConfirmation(null)}
              disabled={pendingAction !== null}
            >
              Vazgeç
            </Button>
          </div>
        </div>
      ) : null}

      {activeConfirmation === 'waiter' ? (
        <div className="rounded-2xl border border-border-light bg-bg-surface p-4 shadow-sm">
          <p className="text-sm font-bold text-text-primary">
            Garson çağrısı gönderilsin mi?
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            İsterseniz kısa bir not ekleyebilirsiniz.
          </p>
          <textarea
            value={waiterNote}
            onChange={(event) => setWaiterNote(event.target.value)}
            rows={3}
            maxLength={240}
            placeholder="Örn. Peçete rica ediyorum"
            className="mt-3 w-full rounded-xl border border-border-light bg-bg-app px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-primary-main"
          />
          <div className="mt-1 text-right text-[11px] text-text-muted">
            {waiterNote.length}/240
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl normal-case tracking-normal text-xs"
              onClick={() => setActiveConfirmation(null)}
              disabled={pendingAction !== null}
            >
              Vazgeç
            </Button>
            <Button
              className="rounded-xl normal-case tracking-normal text-xs"
              onClick={() => void handleConfirmWaiterRequest()}
              isLoading={pendingAction === 'waiter'}
            >
              Gönder
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
