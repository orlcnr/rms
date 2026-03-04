'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'

interface ProductsLoadingOverlayProps {
    viewMode: 'grid' | 'list'
}

export function ProductsLoadingOverlay({ viewMode }: ProductsLoadingOverlayProps) {
    return (
        <div className="absolute inset-0 z-10 bg-bg-app/80 backdrop-blur-[2px] px-2 py-4">
            <div className={cn(
                'grid gap-6 opacity-75',
                viewMode === 'grid'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'grid-cols-1'
            )}>
                {Array.from({ length: viewMode === 'grid' ? 4 : 3 }).map((_, index) => (
                    <div
                        key={index}
                        className="h-40 rounded-sm border border-border-light bg-bg-surface animate-pulse"
                    />
                ))}
            </div>
            <div className="absolute inset-x-0 top-6 flex justify-center">
                <div className="flex items-center gap-3 rounded-sm border border-primary-main/20 bg-bg-surface px-4 py-2 text-primary-main shadow-sm">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-[0.25em]">LİSTE GÜNCELLENİYOR</span>
                </div>
            </div>
        </div>
    )
}
