'use client'

import { Modal } from '@/modules/shared/components/Modal'
import { PrintFormat } from './types'

interface PrintFormatModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (format: PrintFormat) => void
  title?: string
  defaultFormat?: PrintFormat
  profileName?: string
  guidance?: string
}

export function PrintFormatModal({
  isOpen,
  onClose,
  onSelect,
  title = 'YAZDIRMA FORMATI',
  defaultFormat,
  profileName,
  guidance,
}: PrintFormatModalProps) {
  const formats: Array<{
    format: PrintFormat
    title: string
    description: string
  }> = [
    {
      format: 'receipt_80mm',
      title: 'Termal Fiş (80mm)',
      description: 'Kısa adisyon çıktısı, yazarkasa ve fiş yazıcısı odaklı.',
    },
    {
      format: 'receipt_58mm',
      title: 'Termal Fiş (58mm)',
      description: 'Dar termal fiş yazıcıları için kompakt çıktı.',
    },
    {
      format: 'a4',
      title: 'A4 Adisyon',
      description: 'Detaylı adisyon çıktısı, operasyonel arşiv için uygun.',
    },
    {
      format: 'label_4x6',
      title: 'Etiket (4x6)',
      description: 'Etiket yazıcılarında ürün ve sipariş etiketi çıktısı.',
    },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-3">
        {(profileName || guidance) && (
          <div className="rounded-sm border border-primary-main/30 bg-primary-main/5 px-3 py-2">
            {profileName && (
              <p className="text-[11px] font-black uppercase tracking-wider text-text-primary">
                Aktif Profil: {profileName}
              </p>
            )}
            {guidance && (
              <p className="mt-1 text-[11px] text-text-secondary">{guidance}</p>
            )}
          </div>
        )}
        {formats.map((item) => (
          <button
            key={item.format}
            type="button"
            onClick={() => onSelect(item.format)}
            className="w-full rounded-sm border border-border-light bg-bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-muted"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-text-primary">
                {item.title}
              </p>
              {defaultFormat === item.format ? (
                <span className="text-[10px] font-black uppercase tracking-wider text-primary-main">
                  ÖNERİLEN
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] font-medium text-text-muted">
              {item.description}
            </p>
          </button>
        ))}
      </div>
    </Modal>
  )
}
