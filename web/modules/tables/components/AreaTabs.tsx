
'use client'

import React from 'react'
import { Plus, Pencil } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'
import { Area } from '../types'

interface AreaTabsProps {
    areas: Area[]
    activeAreaId: string | null
    onAreaChange: (id: string | null) => void
    onAddArea: () => void
    onEditArea: (area: Area) => void
    onDeleteArea: (id: string) => void
    isAdminMode?: boolean
}

export function AreaTabs({ areas, activeAreaId, onAreaChange, onAddArea, onEditArea, isAdminMode = true }: AreaTabsProps) {
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
                <div key={area.id} className="relative group flex items-center">
                    <button
                        onClick={() => onAreaChange(area.id)}
                        className={cn(
                            "px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border",
                            activeAreaId === area.id
                                ? "bg-primary-main text-white border-primary-main"
                                : "bg-transparent text-text-muted border-border-light hover:border-primary-main hover:text-text-primary",
                            isAdminMode && "pr-8"
                        )}
                    >
                        {area.name}
                    </button>
                    {isAdminMode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEditArea(area); }}
                            className={cn(
                                "absolute right-1 p-1 rounded-xs transition-opacity opacity-0 group-hover:opacity-100",
                                activeAreaId === area.id
                                    ? "text-white hover:bg-white/20"
                                    : "text-text-muted hover:bg-bg-muted"
                            )}
                            title="Salonu Düzenle"
                        >
                            <Pencil size={11} />
                        </button>
                    )}
                </div>
            ))}

            {/* Add Area Trigger - CategoryTabs style */}
            {isAdminMode && (
                <button
                    onClick={onAddArea}
                    className="px-3 py-1.5 bg-transparent text-text-muted border border-dashed border-border-light rounded-sm hover:border-primary-main hover:text-primary-main transition-all flex-shrink-0 flex items-center gap-1.5"
                    title="YENİ ALAN TANIMLA"
                >
                    <Plus size={12} className="group-hover:rotate-90 transition-transform" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">EKLE</span>
                </button>
            )}
        </div>
    )
}
