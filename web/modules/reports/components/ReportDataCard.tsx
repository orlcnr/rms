import type { ReactNode } from 'react'

interface ReportDataCardProps {
  title: string
  description?: string
  children: ReactNode
}

export function ReportDataCard({
  title,
  description,
  children,
}: ReportDataCardProps) {
  return (
    <section className="border border-border-light bg-white">
      <div className="border-b border-border-light px-5 py-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-text-primary">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm font-bold text-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
