import React from 'react'
import { ReportKpiItem } from '../types'

interface ReportKpiStripProps {
  items: ReportKpiItem[]
}

export function ReportKpiStrip({ items }: ReportKpiStripProps) {
  return (
    <div className="grid shrink-0 grid-cols-2 gap-4 xl:w-[420px]">
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={index % 2 === 0 ? 'border-r border-border-light pr-4' : ''}
        >
          <p
            className={`text-[10px] font-black uppercase tracking-widest ${
              item.accentClassName || 'text-text-muted'
            }`}
          >
            {item.label}
          </p>
          <p className="mt-2 text-sm font-black text-text-primary xl:text-2xl xl:tabular-nums">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
