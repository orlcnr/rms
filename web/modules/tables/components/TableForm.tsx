'use client'

import React, { useState } from 'react'
import { Table, CreateTableInput, TableStatus, Area, CAPACITY_OPTIONS } from '../types'
import { FormInput } from '@/modules/shared/components/FormInput'
import { FormSection } from '@/modules/shared/components/FormSection'
import { Button } from '@/modules/shared/components/Button'

interface TableFormProps {
    initialData?: Table
    areas: Area[]
    onSubmit: (data: Partial<CreateTableInput>) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

export function TableForm({ initialData, areas, onSubmit, onCancel, isLoading }: TableFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        capacity: initialData?.capacity?.toString() || '4',
        area_id: initialData?.area_id || '',
        status: initialData?.status || TableStatus.AVAILABLE,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit({
            ...formData,
            capacity: Number(formData.capacity) || 0,
        })
    }

    // Convert CAPACITY_OPTIONS to FormInput format
    const capacityOptions = CAPACITY_OPTIONS.map(opt => ({
        value: opt.value,
        label: opt.label,
    }))

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <FormSection 
                title="MASA BİLGİLERİ" 
                variant="primary"
                showDivider={false}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Table Name */}
                    <div className="md:col-span-2">
                        <FormInput
                            id="tableName"
                            name="name"
                            label="Masa Adı / No"
                            value={formData.name}
                            onChange={(value) => setFormData({ ...formData, name: value })}
                            placeholder="Örn: M-01, Teras 5..."
                            required
                        />
                    </div>

                    {/* Capacity */}
                    <FormInput
                        id="tableCapacity"
                        name="capacity"
                        type="number"
                        label="Kapasite"
                        value={formData.capacity}
                        onChange={(value) => setFormData({ ...formData, capacity: value })}
                        options={capacityOptions}
                        isSelect
                        required
                    />

                    {/* Area Selection */}
                    <FormInput
                        id="tableArea"
                        name="area_id"
                        label="Salon / Alan"
                        value={formData.area_id}
                        onChange={(value) => setFormData({ ...formData, area_id: value })}
                        options={areas.map(area => ({ value: area.id, label: area.name }))}
                        isSelect
                        required
                        placeholder="Salon Seçin"
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
                    disabled={!formData.name || !formData.area_id}
                >
                    {initialData ? 'GÜNCELLE' : 'KAYDET'}
                </Button>
            </div>
        </form>
    )
}
