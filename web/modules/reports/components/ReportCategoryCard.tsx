import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import {
  ReportCategoryPreviewItem,
  ReportCategoryStatus,
  REPORT_STATUS_LABELS,
} from '../types'

interface ReportCategoryCardProps {
  title: string
  description: string
  href: string
  icon: ReactNode
  status: ReportCategoryStatus
  previewItems: ReportCategoryPreviewItem[]
  isDisabled?: boolean
}

export function ReportCategoryCard({
  title,
  description,
  href,
  icon,
  status,
  previewItems,
  isDisabled = false,
}: ReportCategoryCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-border-light bg-bg-surface text-text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
              {REPORT_STATUS_LABELS[status]}
            </p>
            <h2 className="mt-2 text-lg font-black uppercase tracking-tight text-text-primary">
              {title}
            </h2>
            <p className="mt-2 text-sm font-bold text-text-secondary">
              {description}
            </p>
          </div>
        </div>

        <ChevronRight
          size={18}
          className="shrink-0 text-text-muted transition group-hover:text-text-primary"
        />
      </div>

      <div className="mt-6 grid gap-3 border-t border-border-light pt-4 sm:grid-cols-3">
        {previewItems.map((item) => (
          <div key={item.label}>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
              {item.label}
            </p>
            <p className="mt-2 text-sm font-black text-text-primary">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </>
  )

  if (isDisabled) {
    return (
      <div className="rounded-sm border border-border-light bg-white p-6">
        {content}
      </div>
    )
  }

  return (
    <Link
      href={href}
      className="group rounded-sm border border-border-light bg-white p-6 transition hover:border-primary-main"
    >
      {content}
    </Link>
  )
}
