import React from 'react'

interface ReportLoadingStateProps {
  message?: string
  className?: string
}

export function ReportLoadingState({
  message = 'Veriler yükleniyor...',
  className,
}: ReportLoadingStateProps) {
  return (
    <div className={className}>
      <p className="text-sm font-bold text-text-muted">{message}</p>
    </div>
  )
}
