'use client'

import React, { useState } from 'react'
import { Area, CreateAreaInput } from '../types'
import { FormInput } from '@/modules/shared/components/FormInput'
import { FormSection } from '@/modules/shared/components/FormSection'
import { Button } from '@/modules/shared/components/Button'

interface AreaFormProps {
    initialData?: Area
    onSubmit: (data: Partial<CreateAreaInput>) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

export function AreaForm({ initialData, onSubmit, onCancel, isLoading }: AreaFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <FormSection 
                title="SALON BİLGİLERİ" 
                variant="primary"
                showDivider={false}
            >
                <div className="space-y-2">
                    <FormInput
                        id="areaName"
                        name="name"
                        label="Salon / Alan Adı"
                        value={formData.name}
                        onChange={(value) => setFormData({ ...formData, name: value })}
                        placeholder="Örn: Teras, Bahçe, Salon 1..."
                        required
                    />
                </div>
            </FormSection>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-light">
                <Button
                    variant="outline"
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                >
                    İPTAL
                </Button>
                <Button
                    variant="primary"
                    type="submit"
                    isLoading={isLoading}
                    disabled={!formData.name}
                >
                    {initialData ? 'GÜNCELLE' : 'KAYDET'}
                </Button>
            </div>
        </form>
    )
}
