'use client'

import React from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'

interface ViewToggleProps {
    value: 'grid' | 'list'
    onChange: (value: 'grid' | 'list') => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
    return (
        <div className="flex items-center gap-1 bg-bg-app border border-border-light rounded-sm p-1">
            <button
                onClick={() => onChange('grid')}
                className={cn(
                    'p-2 rounded-sm transition-all',
                    value === 'grid'
                        ? 'bg-primary-main text-text-inverse'
                        : 'text-text-muted hover:text-text-primary'
                )}
            >
                <LayoutGrid size={16} />
            </button>
            <button
                onClick={() => onChange('list')}
                className={cn(
                    'p-2 rounded-sm transition-all',
                    value === 'list'
                        ? 'bg-primary-main text-text-inverse'
                        : 'text-text-muted hover:text-text-primary'
                )}
            >
                <List size={16} />
            </button>
        </div>
    )
}
