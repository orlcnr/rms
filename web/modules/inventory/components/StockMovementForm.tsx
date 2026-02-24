'use client'

import React, { useState } from 'react'
import { Check, ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react'
import { Ingredient, MovementType } from '../types'
import { cn } from '@/modules/shared/utils/cn'
import { Button } from '@/modules/shared/components/Button'
import { FormInput } from '@/modules/shared/components/FormInput'
import { FormSection } from '@/modules/shared/components/FormSection'

interface StockMovementFormProps {
    ingredient: Ingredient
    type: MovementType
    onSubmit: (data: any) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

export function StockMovementForm({ ingredient, type, onSubmit, onCancel, isLoading }: StockMovementFormProps) {
    const [formData, setFormData] = useState({
        quantity: '' as string | number,
        reason: '',
        unit_price: '' as string | number,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const submitData: any = {
            quantity: Number(formData.quantity) || 0,
            ingredient_id: ingredient.id,
            type
        }

        // Add reason if provided
        if (formData.reason) {
            submitData.reason = formData.reason
        }

        // Add unit price only for IN movements
        if (type === MovementType.IN && formData.unit_price) {
            submitData.unit_price = Number(formData.unit_price)
        }

        await onSubmit(submitData)
    }

    const isStockIn = type === MovementType.IN
    const isStockOut = type === MovementType.OUT
    const colorClass = isStockIn ? "text-success-main" : isStockOut ? "text-danger-main" : "text-primary-main"
    const bgClass = isStockIn ? "bg-success-bg" : isStockOut ? "bg-danger-bg" : "bg-primary-subtle"
    const Icon = isStockIn ? ArrowUpRight : isStockOut ? ArrowDownRight : RefreshCcw
    const title = isStockIn ? "STOK GİRİŞİ" : isStockOut ? "STOK ÇIKIŞI" : "STOK DÜZELTME"

    return (
        <form onSubmit={handleSubmit} className="space-y-0">
            {/* Header with movement type */}
            <div className="flex items-center gap-3 p-3 rounded bg-bg-muted/30 border border-border-light mb-6">
                <div className={cn("p-2 rounded border border-current", bgClass, colorClass)}>
                    <Icon size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-text-primary uppercase text-xs tracking-tight">{title}</h3>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                        {ingredient.name} ({ingredient.unit})
                    </p>
                </div>
            </div>

            <FormSection title="HAREKET BİLGİLERİ" variant={isStockIn ? 'success' : isStockOut ? 'danger' : 'primary'}>
                <div className="space-y-4">
                    <FormInput
                        id="movementQuantity"
                        name="quantity"
                        type="number"
                        label={`MİKTAR (${ingredient.unit})`}
                        value={formData.quantity}
                        onChange={(value) => setFormData({ ...formData, quantity: value })}
                        placeholder="0.000"
                        required
                        inputMode="decimal"
                        textAlign="right"
                        fontSize="xl"
                    />

                    {/* Birim Fiyat - Sadece Giriş (IN) hareketlerinde göster */}
                    {isStockIn && (
                        <FormInput
                            id="unitPrice"
                            name="unit_price"
                            type="number"
                            label="BİRİM FİYAT (₺)"
                            value={formData.unit_price}
                            onChange={(value) => setFormData({ ...formData, unit_price: value })}
                            placeholder="0.00"
                            inputMode="decimal"
                            textAlign="right"
                            fontSize="xl"
                        />
                    )}

                    <FormInput
                        id="movementReason"
                        name="reason"
                        label="İŞLEM NEDENİ / AÇIKLAMA"
                        value={formData.reason}
                        onChange={(value) => setFormData({ ...formData, reason: value })}
                        placeholder="ÖRN: TEDARİKÇİDEN ALIŞ, ZAYİAT, SAYIM FARKI..."
                        required
                        isTextarea
                        rows={3}
                    />

                    {/* Quick Select Chips */}
                    <div className="flex flex-wrap gap-1.5">
                        {[
                            { label: 'Sayım Farkı', value: 'SAYIM FARKI' },
                            { label: 'Tedarik', value: 'TEDARIK' },
                            { label: 'İade', value: 'İADE' },
                            { label: 'Fire', value: 'FIRE' },
                            { label: 'Üretim', value: 'URETIM' },
                        ].map((chip) => (
                            <button
                                key={chip.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, reason: chip.value })}
                                className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded bg-bg-muted/30 text-text-muted hover:bg-primary-subtle hover:text-primary-main transition-colors"
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>
                </div>
            </FormSection>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-light mt-6">
                <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="min-w-[100px]"
                >
                    İPTAL
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isLoading}
                    disabled={Number(formData.quantity) <= 0}
                    className="min-w-[140px] gap-2"
                >
                    {!isLoading && <Check size={16} />}
                    <span>HAREKETİ KAYDET</span>
                </Button>
            </div>
        </form>
    )
}
