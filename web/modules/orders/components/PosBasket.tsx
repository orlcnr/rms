// ============================================
// POS BASKET - Dijital Fiş (Adisyon Estetiği)
// Header: "ADİZYON" + masa numarası
// Ürün satırları: dotted çizgiler
// Action bar: h-16 devasa buton
// ============================================

'use client'

import React from 'react'
import { Minus, Plus, Trash2, Package, CreditCard, Send } from 'lucide-react'
import { BasketItem, calculateBasketSummary, ORDER_TYPE_LABELS, OrderStatus } from '../types'
import { Table } from '@/modules/tables/types'
import { Order, OrderType } from '../types'
import { cn } from '@/modules/shared/utils/cn'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { Button } from '@/modules/shared/components/Button'

interface PosBasketProps {
  items: BasketItem[]
  selectedTable: Table | null
  orderType: OrderType
  existingOrder?: Order | null
  onIncrement: (menuItemId: string) => void
  onDecrement: (menuItemId: string) => void
  onRemove: (menuItemId: string) => void
  onClear: () => void
  onSubmit: () => void
  onPay?: () => void // Ödeme için yeni prop
  isLoading?: boolean
  disabled?: boolean
  className?: string
}

/**
 * POS Basket - Dijital Fiş (Adisyon)
 * - Header: "ADİZYON" + masa numarası
 * - Ürün satırları: dotted çizgiler
 * - Action bar: h-16 devasa buton
 */
export function PosBasket({
  items,
  selectedTable,
  orderType,
  existingOrder,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onSubmit,
  onPay,
  isLoading = false,
  disabled = false,
  className,
}: PosBasketProps) {
  const summary = calculateBasketSummary(items)
  const isEmpty = items.length === 0
  
  // Sipariş ödenmemişse ödeme yapılabilir
  const needsPayment = existingOrder && 
    existingOrder.status !== OrderStatus.PAID && 
    existingOrder.status !== OrderStatus.CANCELLED
  
  // Ödenmemiş sipariş varsa mevcut topla
  const hasUnpaidOrder = !!existingOrder && 
    existingOrder.status !== OrderStatus.PAID && 
    existingOrder.status !== OrderStatus.CANCELLED

  return (
    <div className={cn('flex flex-col h-full p-4', className)}>
      {/* Header: ADİZYON + Masa */}
      <div className="pb-6 border-b-2 border-border-light">
        <h3 className="text-2xl font-black text-text-primary uppercase tracking-tight">
          ADİSYON
        </h3>
        {selectedTable && (
          <p className="text-xs font-bold text-text-muted uppercase mt-1">
            Masa: {selectedTable.name} • {ORDER_TYPE_LABELS[orderType]}
          </p>
        )}
      </div>

      {/* Sepet Items */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-bg-muted rounded-full flex items-center justify-center mb-3">
              <Package size={24} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-muted font-medium">
              Sepetiniz boş
            </p>
            <p className="text-xs text-text-muted mt-1">
              Ürün seçerek başlayın
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.menuItemId}
              className="flex items-center justify-between py-2 border-b border-dotted border-border-light gap-2"
            >
              {/* Left: Name only */}
              <h4 className="text-xs font-bold text-text-primary uppercase truncate flex-1 mr-2">
                {item.name}
              </h4>

              {/* Right: Price + Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold text-text-muted whitespace-nowrap min-w-[50px] text-right">
                  {formatCurrency(item.price * item.quantity)}
                </span>
                
                {/* Adet Kontrolü - Primary theme butonlar */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onDecrement(item.menuItemId)}
                    className="w-5 h-5 flex items-center justify-center rounded-sm bg-primary-main hover:bg-primary-hover transition-colors"
                  >
                    <Minus size={10} className="text-text-inverse" />
                  </button>
                  <span className="w-4 text-center text-[10px] font-bold">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onIncrement(item.menuItemId)}
                    className="w-5 h-5 flex items-center justify-center rounded-sm bg-primary-main hover:bg-primary-hover transition-colors"
                  >
                    <Plus size={10} className="text-text-inverse" />
                  </button>
                </div>

                {/* Sil - Gri ikon */}
                <button
                  onClick={() => onRemove(item.menuItemId)}
                  className="p-1 hover:bg-bg-muted rounded-sm transition-colors"
                >
                  <Trash2 size={12} className="text-text-muted" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Özet - Turuncu başlık */}
      {!isEmpty && (
        <div className="pt-4 border-t-2 border-border-light">
          <div className="flex flex-col gap-1 mb-3">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Toplam
            </span>
            <span className="text-2xl font-bold text-primary-main">
              {formatCurrency(summary.total)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-text-muted">
              {summary.itemCount} ürün
            </span>
          </div>
        </div>
      )}

      {/* Action Bar - Tam genişlik turuncu buton */}
      <div className="border-t border-border-light pt-3 mt-auto">
        {/* Ödenmemiş sipariş varsa hem Siparişi Güncelle hem de Ödeme Al butonu */}
        {needsPayment && onPay ? (
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="lg"
              onClick={onSubmit}
              disabled={isLoading || isEmpty || !selectedTable}
              isLoading={isLoading}
              className="flex-1 h-12 text-sm font-bold rounded-lg"
            >
              {hasUnpaidOrder ? 'SİPARİŞİ GÜNCELLE' : 'SİPARİŞ VER'}
            </Button>
            <Button
              variant="success"
              size="lg"
              onClick={onPay}
              disabled={isLoading}
              isLoading={isLoading}
              className="flex-1 h-12 text-sm font-bold rounded-lg flex items-center justify-center gap-2"
            >
              <CreditCard size={16} />
              ÖDEME AL
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            onClick={onSubmit}
            disabled={isLoading || isEmpty || !selectedTable}
            isLoading={isLoading}
            className="w-full h-12 text-base font-bold rounded-lg"
          >
            {hasUnpaidOrder ? 'SİPARİŞİ GÜNCELLE' : 'SİPARİŞ VER'}
          </Button>
        )}
      </div>
    </div>
  )
}
