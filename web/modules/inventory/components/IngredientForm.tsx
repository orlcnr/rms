'use client'

import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { Ingredient } from '../types'
import { Button } from '@/modules/shared/components/Button'
import { FormInput } from '@/modules/shared/components/FormInput'
import { FormSection } from '@/modules/shared/components/FormSection'

interface IngredientFormProps {
    initialData?: Ingredient
    onSubmit: (data: any) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

const UNIT_OPTIONS = [
    { value: 'kg', label: 'KİLOGRAM (KG)' },
    { value: 'gr', label: 'GRAM (GR)' },
    { value: 'lt', label: 'LİTRE (LT)' },
    { value: 'ml', label: 'MİLİLİTRE (ML)' },
    { value: 'adet', label: 'ADET' },
    { value: 'paket', label: 'PAKET' },
]

export function IngredientForm({ initialData, onSubmit, onCancel, isLoading }: IngredientFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        unit: initialData?.unit || 'kg',
        critical_level: initialData?.critical_level?.toString() || '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit({
            ...formData,
            critical_level: Number(formData.critical_level) || 0
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-0">
            <FormSection title="MALZEME BİLGİLERİ" variant="primary">
                <div className="space-y-4">
                    <FormInput
                        id="ingredientName"
                        name="name"
                        label="MALZEME ADI"
                        value={formData.name}
                        onChange={(value) => setFormData({ ...formData, name: value })}
                        placeholder="ÖRN: DOMATES, KIYMA..."
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormInput
                            id="ingredientUnit"
                            name="unit"
                            label="BİRİM"
                            value={formData.unit}
                            onChange={(value) => setFormData({ ...formData, unit: value })}
                            options={UNIT_OPTIONS}
                            isSelect
                            required
                        />

                        <FormInput
                            id="criticalLevel"
                            name="critical_level"
                            type="number"
                            label="KRİTİK SEVİYE"
                            value={formData.critical_level}
                            onChange={(value) => setFormData({ ...formData, critical_level: value })}
                            placeholder="0.00"
                            required
                            inputMode="decimal"
                            textAlign="right"
                        />
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
                    className="min-w-[140px] gap-2"
                >
                    {!isLoading && <Check size={16} />}
                    <span>{initialData ? 'GÜNCELLE' : 'KAYDET'}</span>
                </Button>
            </div>
        </form>
    )
}
