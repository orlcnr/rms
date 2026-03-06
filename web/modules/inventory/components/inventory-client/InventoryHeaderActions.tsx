'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/modules/shared/components/Button'
import { cn } from '@/modules/shared/utils/cn'
import {
    INVENTORY_LABELS,
    INVENTORY_VIEW_OPTIONS,
    InventoryView,
} from '../../types'

interface InventoryHeaderActionsProps {
    view: InventoryView
    onChangeView: (view: InventoryView) => void
    onCreateIngredient: () => void
}

export function InventoryHeaderActions({
    view,
    onChangeView,
    onCreateIngredient,
}: InventoryHeaderActionsProps) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center bg-bg-hover p-1 rounded-sm border border-border-light">
                {INVENTORY_VIEW_OPTIONS.map((btn) => (
                    <button
                        key={btn.id}
                        onClick={() => onChangeView(btn.id)}
                        className={cn(
                            'px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all',
                            view === btn.id
                                ? 'bg-bg-surface text-primary-main shadow-sm border border-border-light'
                                : 'text-text-muted hover:text-text-primary',
                        )}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>

            <Button
                variant="primary"
                onClick={onCreateIngredient}
                className="flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-[0.2em]"
            >
                <Plus size={18} />
                {INVENTORY_LABELS.newIngredient}
            </Button>
        </div>
    )
}
