'use client'

import React from 'react'
import { formatDateTime } from '@/modules/shared/utils/date'

interface HydrationSafeDateTimeProps {
  value?: string | Date | null
  fallback?: string
  className?: string
}

export function HydrationSafeDateTime({
  value,
  fallback = '-',
  className,
}: HydrationSafeDateTimeProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!value) {
    return <span className={className}>{fallback}</span>
  }

  const dateValue = value instanceof Date ? value.toISOString() : value

  return (
    <span className={className} suppressHydrationWarning>
      {mounted ? formatDateTime(dateValue) : fallback}
    </span>
  )
}
