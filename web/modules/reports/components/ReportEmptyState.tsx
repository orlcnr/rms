import React from 'react'

interface ReportEmptyStateProps {
  title: string
  description: string
  className?: string
}

export function ReportEmptyState({
  title,
  description,
  className,
}: ReportEmptyStateProps) {
  return (
    <div className={className}>
      <p className="text-sm font-black uppercase tracking-wider text-text-primary">
        {title}
      </p>
      <p className="mt-2 text-sm font-bold text-text-muted">{description}</p>
    </div>
  )
}
