'use client'

import React from 'react'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { Drawer } from '@/modules/shared/components/Drawer'
import { Button } from '@/modules/shared/components/Button'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { BasketItem } from '../types'
import { Table } from '@/modules/tables/types'
import { OrderType } from '../types'

interface MobileBasketDrawerProps {
    isOpen: boolean
    onClose: () => void
    items: BasketItem[]
    selectedTable: Table | null
    orderType: OrderType
    onIncrement: (menuItemId: string) => void
    onDecrement: (menuItemId: string) => void
    onRemove: (menuItemId: string) => void
    onClear: () => void
    onSubmit: () => void
    isLoading?: boolean
}

export function MobileBasketDrawer({
    isOpen,
    onClose,
    items,
    selectedTable,
    orderType,
    onIncrement,
    onDecrement,
    onRemove,
    onClear,
    onSubmit,
    isLoading = false,
}: MobileBasketDrawerProps) {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

    const isEmpty = items.length === 0

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title="Sepet"
        >
            {/* Empty State */}
            {isEmpty ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ShoppingBag className="w-16 h-16 text-text-muted mb-4" />
                    <p className="text-base font-semibold text-text-primary mb-2">
                        Sepetiniz boş
                    </p>
                    <p className="text-sm text-text-muted">
                        Ürün eklemek için listeden seçin
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Order Info */}
                    <div className="flex items-center justify-between py-2 border-b border-border-light">
                        <div>
                            <p className="text-xs font-bold text-text-muted uppercase">
                                {orderType === OrderType.DINE_IN ? 'Masa' : 'Paket/ Teslimat'}
                            </p>
                            <p className="text-sm font-black text-text-primary">
                                {selectedTable?.name || 'Seçilmedi'}
                            </p>
                        </div>
                        <button
                            onClick={onClear}
                            className="text-xs text-danger-main font-bold uppercase hover:underline"
                        >
                            Temizle
                        </button>
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                        {items.map((item) => (
                            <div
                                key={item.menuItemId}
                                className="flex items-center gap-3 p-3 bg-bg-muted rounded-sm"
                            >
                                {/* Item Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-text-primary truncate">
                                        {item.name}
                                    </p>
                                    <p className="text-xs font-semibold text-text-muted">
                                        {formatCurrency(item.price)}
                                    </p>
                                </div>

                                {/* Quantity Controls */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onDecrement(item.menuItemId)}
                                        className="w-8 h-8 flex items-center justify-center rounded-sm bg-bg-surface border border-border-light hover:border-danger-main transition-colors"
                                    >
                                        <Minus className="w-3 h-3 text-text-primary" />
                                    </button>
                                    
                                    <span className="w-8 text-center font-bold text-text-primary">
                                        {item.quantity}
                                    </span>
                                    
                                    <button
                                        onClick={() => onIncrement(item.menuItemId)}
                                        className="w-8 h-8 flex items-center justify-center rounded-sm bg-bg-surface border border-border-light hover:border-success-main transition-colors"
                                    >
                                        <Plus className="w-3 h-3 text-text-primary" />
                                    </button>
                                </div>

                                {/* Remove Button */}
                                <button
                                    onClick={() => onRemove(item.menuItemId)}
                                    className="p-2 text-text-muted hover:text-danger-main transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Total & Submit */}
                    <div className="pt-4 border-t border-border-light space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-text-muted uppercase">
                                Toplam ({itemCount} ürün)
                            </span>
                            <span className="text-xl font-black text-text-primary">
                                {formatCurrency(total)}
                            </span>
                        </div>

                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={onSubmit}
                            disabled={isLoading || isEmpty}
                        >
                            {isLoading ? 'İşleniyor...' : 'Siparişi Ver'}
                        </Button>
                    </div>
                </div>
            )}
        </Drawer>
    )
}
