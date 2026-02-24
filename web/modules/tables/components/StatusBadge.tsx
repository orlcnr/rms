'use client'

import { TableStatus } from '../types'
import { getStatusConfig } from '../enums/table-status.enum'
import { cn } from '@/modules/shared/utils/cn'

interface StatusBadgeProps {
    status: TableStatus
    size?: 'sm' | 'md' | 'lg'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const config = getStatusConfig(status)
    
    const sizeClasses = {
        sm: 'text-[8px] px-2 py-0.5',
        md: 'text-[9px] px-3 py-1', 
        lg: 'text-xs px-4 py-1.5',
    }
    
    return (
        <span className={cn(
            'inline-flex items-center rounded-sm font-black tracking-wider uppercase',
            config.style,
            sizeClasses[size]
        )}>
            {config.label}
        </span>
    )
}
