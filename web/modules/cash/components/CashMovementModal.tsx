'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Receipt, Scale } from 'lucide-react'
import { Modal } from '@/modules/shared/components/Modal'
import { Button } from '@/modules/shared/components/Button'
import {
  formatNumericDisplay,
  parseNumericValue,
} from '@/modules/shared/utils/numeric'

type ManualCashMovementPreset = 'cash_in' | 'expense' | 'adjustment'
type ManualCashMovementDirection = 'in' | 'out'

export interface ManualCashMovementSubmitData {
  preset: ManualCashMovementPreset
  adjustmentDirection: ManualCashMovementDirection | null
  amount: number
  description: string
}

interface CashMovementModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ManualCashMovementSubmitData) => Promise<void> | void
  isLoading?: boolean
}

const PRESET_OPTIONS: Array<{
  value: ManualCashMovementPreset
  label: string
  description: string
}> = [
  {
    value: 'cash_in',
    label: 'Kasa Girişi',
    description: 'Kasaya manuel para ekleme',
  },
  {
    value: 'expense',
    label: 'Masraf / Gider',
    description: 'Kasadan masraf veya ödeme çıkışı',
  },
  {
    value: 'adjustment',
    label: 'Düzeltme',
    description: 'Sayım veya operasyon düzeltmesi',
  },
]

export function CashMovementModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: CashMovementModalProps) {
  const [preset, setPreset] = useState<ManualCashMovementPreset>('cash_in')
  const [adjustmentDirection, setAdjustmentDirection] =
    useState<ManualCashMovementDirection | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setPreset('cash_in')
      setAdjustmentDirection(null)
      setAmount('')
      setDescription('')
      setError(null)
    }
  }, [isOpen])

  const amountValue = useMemo(() => parseNumericValue(amount), [amount])
  const requiresDirection = preset === 'adjustment'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (requiresDirection && !adjustmentDirection) {
      setError('Düzeltme için yön seçmelisiniz')
      return
    }

    if (amountValue <= 0) {
      setError('Tutar sıfırdan büyük olmalıdır')
      return
    }

    const trimmedDescription = description.trim()
    if (!trimmedDescription) {
      setError('Açıklama girmelisiniz')
      return
    }

    await onSubmit({
      preset,
      adjustmentDirection,
      amount: amountValue,
      description: trimmedDescription,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manuel Kasa Hareketi" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_OPTIONS.map((option) => {
            const isActive = preset === option.value
            const Icon =
              option.value === 'cash_in'
                ? ArrowUpRight
                : option.value === 'expense'
                  ? ArrowDownRight
                  : Scale

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setPreset(option.value)
                  if (option.value !== 'adjustment') {
                    setAdjustmentDirection(null)
                  }
                }}
                className={`rounded-sm border p-4 text-left transition-all ${
                  isActive
                    ? 'border-primary-main bg-primary-main/5'
                    : 'border-border-light bg-white hover:bg-bg-app/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      isActive ? 'bg-primary-main/10 text-primary-main' : 'bg-bg-app text-text-muted'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-text-primary">
                    {option.label}
                  </p>
                </div>
                <p className="mt-2 text-xs text-text-muted">{option.description}</p>
              </button>
            )
          })}
        </div>

        {requiresDirection && (
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-text-secondary">
              Düzeltme Yönü
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentDirection('in')}
                className={`rounded-sm border px-4 py-3 text-sm font-bold transition-all ${
                  adjustmentDirection === 'in'
                    ? 'border-success-main bg-success-main/5 text-success-main'
                    : 'border-border-light bg-white text-text-primary hover:bg-bg-app/40'
                }`}
              >
                Kasaya Ekle
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentDirection('out')}
                className={`rounded-sm border px-4 py-3 text-sm font-bold transition-all ${
                  adjustmentDirection === 'out'
                    ? 'border-danger-main bg-danger-main/5 text-danger-main'
                    : 'border-border-light bg-white text-text-primary hover:bg-bg-app/40'
                }`}
              >
                Kasadan Çıkar
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase text-text-secondary">
            Tutar
          </label>
          <div className="relative">
            <input
              type="text"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0,00"
              className="w-full rounded-sm border border-border-light bg-white px-4 py-3 pr-12 text-right text-xl font-bold focus:border-primary-main focus:outline-none"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">
              TL
            </span>
          </div>
          {amount && (
            <p className="mt-1 text-right text-xs text-text-muted">
              {formatNumericDisplay(amount)} TL
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase text-text-secondary">
            Açıklama
          </label>
          <div className="relative">
            <Receipt className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Örn. kasa takviyesi, kurye masrafı"
              className="w-full rounded-sm border border-border-light bg-white py-3 pl-10 pr-4 text-sm focus:border-primary-main focus:outline-none"
              required
            />
          </div>
        </div>

        {error && (
          <div className="rounded-sm border border-danger-main/20 bg-danger-main/5 px-4 py-3 text-sm font-medium text-danger-main">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            İptal
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="flex-1">
            Hareketi Kaydet
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CashMovementModal
