'use client'

import { BasketItem } from '../types'
import { formatCurrency } from '@/modules/shared/utils/numeric'

interface OrderSubmitConfirmationDialogProps {
  isOpen: boolean
  isLoading?: boolean
  isUpdate?: boolean
  tableName?: string
  items: BasketItem[]
  onCancel: () => void
  onConfirm: () => void
}

export function OrderSubmitConfirmationDialog({
  isOpen,
  isLoading = false,
  isUpdate = false,
  tableName,
  items,
  onCancel,
  onConfirm,
}: OrderSubmitConfirmationDialogProps) {
  if (!isOpen) return null

  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  )
  const totalQuantity = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  )

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isLoading ? undefined : onCancel}
      />
      <div className="relative bg-bg-surface w-full max-w-2xl mx-4 p-6 rounded-sm shadow-xl">
        <h3 className="text-xl font-black text-text-primary text-center mb-2">
          SİPARİŞ ÖZETİ
        </h3>
        <p className="text-xs text-text-muted text-center uppercase tracking-wider mb-4">
          {isUpdate ? 'Sipariş Güncelleme Onayı' : 'Yeni Sipariş Onayı'}
          {tableName ? ` • ${tableName}` : ''}
        </p>

        <div className="rounded-sm border border-border-light bg-bg-muted p-3 max-h-[45vh] overflow-y-auto">
          <p className="text-xs font-black text-text-muted uppercase tracking-wider mb-2">
            {isUpdate ? 'Bu Güncellemede Eklenecek Ürünler' : 'Sipariş Ürünleri'}
          </p>
          {items.length === 0 ? (
            <p className="text-sm text-text-muted">
              {isUpdate
                ? 'Yeni eklenen ürün bulunmuyor. Önceki sipariş kalemleri bu özette gösterilmez.'
                : 'Sepette ürün bulunmuyor.'}
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.menuItemId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-text-secondary font-semibold">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="text-text-primary font-bold">
                    {formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-sm border border-border-light p-3 bg-bg-surface">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Toplam Ürün</span>
            <span className="font-bold text-text-primary">{totalQuantity}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-text-muted">Genel Toplam</span>
            <span className="font-black text-primary-main">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-bg-muted text-text-primary font-bold rounded-sm hover:bg-border-light transition-colors disabled:opacity-50"
          >
            İPTAL
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || (!isUpdate && items.length === 0)}
            className="flex-1 py-3 px-4 bg-success-main text-white font-bold rounded-sm hover:bg-success-hover transition-colors disabled:opacity-50"
          >
            {isLoading
              ? 'İŞLENİYOR...'
              : isUpdate
                ? 'ONAYLA VE GÜNCELLE'
                : 'ONAYLA VE SİPARİŞ VER'}
          </button>
        </div>
      </div>
    </div>
  )
}
