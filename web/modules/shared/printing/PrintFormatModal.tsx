'use client'

import { Modal } from '@/modules/shared/components/Modal'
import { PrintFormat } from './types'

interface PrintFormatModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (format: PrintFormat) => void
  title?: string
}

export function PrintFormatModal({
  isOpen,
  onClose,
  onSelect,
  title = 'YAZDIRMA FORMATI',
}: PrintFormatModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSelect('receipt_80mm')}
          className="w-full rounded-sm border border-border-light bg-bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-muted"
        >
          <p className="text-xs font-black uppercase tracking-wider text-text-primary">
            Termal Fiş (80mm)
          </p>
          <p className="mt-1 text-[11px] font-medium text-text-muted">
            Kısa adisyon çıktısı, yazarkasa ve fiş yazıcısı odaklı.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onSelect('a4')}
          className="w-full rounded-sm border border-border-light bg-bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-muted"
        >
          <p className="text-xs font-black uppercase tracking-wider text-text-primary">
            A4 Adisyon
          </p>
          <p className="mt-1 text-[11px] font-medium text-text-muted">
            Detaylı adisyon çıktısı, operasyonel arşiv için uygun.
          </p>
        </button>
      </div>
    </Modal>
  )
}
