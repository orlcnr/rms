'use client'

import React from 'react'
import { cn } from '@/modules/shared/utils/cn'

interface UserStatusBadgeProps {
  isActive: boolean
}

export function UserStatusBadge({ isActive }: UserStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-1 text-[9px] font-black uppercase tracking-widest',
        isActive
          ? 'bg-success-main/10 text-success-main border border-success-main/30'
          : 'bg-danger-main/10 text-danger-main border border-danger-main/30',
      )}
    >
      {isActive ? 'AKTIF' : 'PASIF'}
    </span>
  )
}
