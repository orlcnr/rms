'use client'

import { Save } from 'lucide-react'

interface StockTableHeaderProps {
    isBulkEditMode: boolean
    hasChanges: boolean
    onToggleBulkMode: (enabled: boolean) => void
    onBulkSave: () => void
}

export function StockTableHeader({
    isBulkEditMode,
    hasChanges,
    onToggleBulkMode,
    onBulkSave,
}: StockTableHeaderProps) {
    return (
        <div className="flex items-center justify-between px-6 py-3 border-b border-border-light bg-bg-muted/10">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
                Malzeme Listesi
            </h3>
            <div className="flex items-center gap-4">
                {isBulkEditMode && hasChanges && (
                    <button
                        onClick={onBulkSave}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-success-main text-white rounded hover:bg-success-hover transition-colors"
                    >
                        <Save className="w-4 h-4" />
                        Toplu Kaydet
                    </button>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Hızlı Sayım Modu
                    </span>
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isBulkEditMode}
                            onChange={(e) => onToggleBulkMode(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-bg-muted rounded-full peer peer-checked:bg-primary-main transition-colors" />
                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                    </div>
                </label>
            </div>
        </div>
    )
}
