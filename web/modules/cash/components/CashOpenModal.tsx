// ============================================
// CASH OPEN MODAL COMPONENT
// Modal for opening a cash session
// ============================================

'use client'

import { useState } from 'react'
import { Banknote, X } from 'lucide-react'
import { Button } from '@/modules/shared/components/Button'
import { Modal } from '@/modules/shared/components/Modal'
import { parseNumericValue, formatNumericDisplay } from '@/modules/shared/utils/numeric'

interface CashOpenModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { openingBalance: number; notes?: string }) => void
  isLoading?: boolean
}

export function CashOpenModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: CashOpenModalProps) {
  const [openingBalance, setOpeningBalance] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      openingBalance: parseNumericValue(openingBalance),
      notes: notes || undefined,
    })
  }

  const handleClose = () => {
    setOpeningBalance('')
    setNotes('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Kasa Oturumu Aç">
      <div className="bg-bg-surface rounded-sm border border-border-light p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-primary">Kasa Oturumu Aç</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-bg-hover rounded-sm transition-colors"
          >
            <X className="h-5 w-5 text-text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Açılış Bakiyesi */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
              Açılış Bakiyesi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Banknote className="h-5 w-5 text-text-muted" />
              </div>
              <input
                type="text"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-12 py-3 text-xl font-bold text-right bg-bg-muted border border-border-light rounded-sm focus:outline-none focus:border-primary-main"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-muted">
                TL
              </span>
            </div>
            {openingBalance && (
              <p className="text-xs text-text-muted mt-1 text-right">
                {formatNumericDisplay(openingBalance)} TL
              </p>
            )}
          </div>

          {/* Notlar */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase block mb-2">
              Notlar (Opsiyonel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kasa açılışı ile ilgili notlar..."
              rows={3}
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
              Kasayı Aç
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default CashOpenModal
