'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'
import { Area } from '../types'

interface AreaTabsProps {
    areas: Area[]
    activeAreaId: string | null
    onAreaChange: (id: string | null) => void
    onAddArea: () => void
    onEditArea: (area: Area) => void
    onDeleteArea: (id: string) => void
}

export function AreaTabs({ areas, activeAreaId, onAreaChange, onAddArea, onEditArea }: AreaTabsProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* All Tables Button - CategoryTabs style */}
            <button
                onClick={() => onAreaChange(null)}
                className={cn(
                    "px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border",
                    activeAreaId === null
                        ? "bg-primary-main text-white border-primary-main"
                        : "bg-transparent text-text-muted border-border-light hover:border-primary-main hover:text-text-primary"
                )}
            >
                TÜMÜ
            </button>

            {/* Area Buttons - CategoryTabs style */}
            {areas.map((area) => (
                <button
                    key={area.id}
                    onClick={() => onAreaChange(area.id)}
                    className={cn(
                        "px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border",
                        activeAreaId === area.id
                            ? "bg-primary-main text-white border-primary-main"
                            : "bg-transparent text-text-muted border-border-light hover:border-primary-main hover:text-text-primary"
                    )}
                >
                    {area.name}
                </button>
            ))}

            {/* Add Area Trigger - CategoryTabs style */}
            <button
                onClick={onAddArea}
                className="px-3 py-1.5 bg-transparent text-text-muted border border-dashed border-border-light rounded-sm hover:border-primary-main hover:text-primary-main transition-all flex-shrink-0 flex items-center gap-1.5"
                title="YENİ ALAN TANIMLA"
            >
                <Plus size={12} className="group-hover:rotate-90 transition-transform" />
                <span className="text-[9px] font-bold uppercase tracking-wider">EKLE</span>
            </button>
        </div>
    )
}
