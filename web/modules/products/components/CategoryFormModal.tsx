'use client'

import React from 'react'
import { Button } from '@/modules/shared/components/Button'

interface CategoryFormModalProps {
    categoryName: string
    categoryDescription: string
    onCategoryNameChange: (value: string) => void
    onCategoryDescriptionChange: (value: string) => void
    onClose: () => void
    onSubmit: () => void
    isSubmitting: boolean
}

export function CategoryFormModal({
    categoryName,
    categoryDescription,
    onCategoryNameChange,
    onCategoryDescriptionChange,
    onClose,
    onSubmit,
    isSubmitting,
}: CategoryFormModalProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">
                    Kategori Adı
                </label>
                <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => onCategoryNameChange(e.target.value)}
                    placeholder="Örn: Tatlılar"
                    className="w-full bg-bg-app border border-border-light rounded-sm py-2.5 px-3 text-text-primary text-xs font-bold outline-none focus:border-primary-main transition-all"
                />
            </div>
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">
                    Açıklama (Opsiyonel)
                </label>
                <textarea
                    value={categoryDescription}
                    onChange={(e) => onCategoryDescriptionChange(e.target.value)}
                    rows={3}
                    placeholder="Kategori açıklaması"
                    className="w-full bg-bg-app border border-border-light rounded-sm py-2.5 px-3 text-text-primary text-xs font-semibold outline-none focus:border-primary-main transition-all resize-none"
                />
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>
                    İPTAL
                </Button>
                <Button variant="primary" onClick={onSubmit} isLoading={isSubmitting}>
                    KAYDET
                </Button>
            </div>
        </div>
    )
}
