// ============================================
// CASH CLOSE MODAL COMPONENT
// Modal for closing a cash session with blind counting
// ============================================

'use client'

import { useState } from 'react'
import { Coins, CreditCard, X, AlertTriangle, Banknote } from 'lucide-react'
import { Button } from '@/modules/shared/components/Button'
import { Modal } from '@/modules/shared/components/Modal'
import { parseNumericValue, formatNumericDisplay } from '@/modules/shared/utils/numeric'
import { DenominationEntry } from '../types'
import { DenominationTable } from './DenominationTable'

interface CashCloseModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    countedBalance: number
    creditCardTotal: number
    denominations?: DenominationEntry[]
    notes?: string
    distributeCardTips?: boolean
    cardTipsToDistribute?: number
  }) => void
  cardTipsToday: number // Bugün kartla alınan bahşiş
  isLoading?: boolean
}

export function CashCloseModal({
  isOpen,
  onClose,
  onSubmit,
  cardTipsToday,
  isLoading,
}: CashCloseModalProps) {
  const [countedBalance, setCountedBalance] = useState('')
  const [creditCardTotal, setCreditCardTotal] = useState('')
  const [showDenomination, setShowDenomination] = useState(false)
  const [denominations, setDenominations] = useState<DenominationEntry[]>([])
  const [notes, setNotes] = useState('')
  const [distributeCardTips, setDistributeCardTips] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      countedBalance: parseNumericValue(countedBalance),
      creditCardTotal: parseNumericValue(creditCardTotal),
      denominations: showDenomination ? denominations : undefined,
      notes: notes || undefined,
      distributeCardTips,
      cardTipsToDistribute: distributeCardTips ? cardTipsToday : 0,
    })
  }

  const handleClose = () => {
    setCountedBalance('')
    setCreditCardTotal('')
    setShowDenomination(false)
    setDenominations([])
    setNotes('')
    setDistributeCardTips(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Kasayı Kapat">
      <div className="bg-bg-surface rounded-sm border border-border-light p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-primary">Kasayı Kapat ve Raporla</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-bg-hover rounded-sm transition-colors"
          >
            <X className="h-5 w-5 text-text-muted" />
          </button>
        </div>

        {/* Uyarı - Kör Sayım */}
        <div className="mb-6 p-4 bg-warning-main/10 border border-warning-main/30 rounded-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning-main mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warning-dark">Kör Sayım Uygulanıyor</p>
              <p className="text-xs text-text-secondary mt-1">
                Sistemin size söylemesini beklemeyin. Elinizdeki nakiti sayarak giriniz.
              </p>
            </div>
          </div>
        </div>

        {/* Personel Bahşiş Uyarısı */}
        {cardTipsToday > 0 && (
          <div className="mb-6 p-4 bg-primary-main/10 border border-primary-main/30 rounded-sm">
            <div className="flex items-start gap-3">
              <Banknote className="h-5 w-5 text-primary-main mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary-dark">Kartla Toplanan Bahşiş</p>
                <p className="text-2xl font-black text-primary-main mt-1">
                  ₺{cardTipsToday.toFixed(2)}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Bu tutarı kasadan personele dağıtacak mısınız?
                </p>

                {/* Dağıtım Seçeneği */}
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distributeCardTips}
                    onChange={(e) => setDistributeCardTips(e.target.checked)}
                    className="w-4 h-4 rounded border-primary-main text-primary-main focus:ring-primary-main"
                  />
                  <span className="text-sm text-text-primary">Bahşişi kasandan dağıt</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fiili Nakit Tutarı */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
              Fiili Nakit Tutarı
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Coins className="h-5 w-5 text-text-muted" />
              </div>
              <input
                type="text"
                value={countedBalance}
                onChange={(e) => setCountedBalance(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-12 py-3 text-xl font-bold text-right bg-bg-muted border border-border-light rounded-sm focus:outline-none focus:border-primary-main"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-muted">
                TL
              </span>
            </div>
            {countedBalance && (
              <p className="text-xs text-text-muted mt-1 text-right">
                {formatNumericDisplay(countedBalance)} TL
              </p>
            )}
          </div>

          {/* Kredi Kartı Slip Toplamı */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
              Kredi Kartı Slip Toplamı
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-5 w-5 text-text-muted" />
              </div>
              <input
                type="text"
                value={creditCardTotal}
                onChange={(e) => setCreditCardTotal(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-12 py-3 text-xl font-bold text-right bg-bg-muted border border-border-light rounded-sm focus:outline-none focus:border-primary-main"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-muted">
                TL
              </span>
            </div>
            {creditCardTotal && (
              <p className="text-xs text-text-muted mt-1 text-right">
                {formatNumericDisplay(creditCardTotal)} TL
              </p>
            )}
          </div>

          {/* Denomination Toggle */}
          <button
            type="button"
            onClick={() => setShowDenomination(!showDenomination)}
            className="text-xs text-primary-main hover:underline"
          >
            {showDenomination ? '▼ Banknot detaylarını gizle' : '▶ Banknot bazlı sayım yap'}
          </button>

          {/* Denomination Table */}
          {showDenomination && (
            <DenominationTable value={denominations} onChange={setDenominations} />
          )}

          {/* Notlar */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
              Kapanış Notları
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-bg-muted border border-border-light rounded-sm focus:outline-none focus:border-primary-main resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="flex-1"
            >
              İptal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="flex-1"
            >
              Oturumu Sonlandır
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default CashCloseModal
