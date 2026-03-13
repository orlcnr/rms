'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/modules/shared/utils/cn'

const MODES = [
  { href: '/orders/board', label: 'Masa' },
  { href: '/orders/counter', label: 'Tezgah' },
  { href: '/orders/delivery', label: 'Paket' },
] as const

export function OrderModeSwitcher() {
  const pathname = usePathname()

  return (
    <div className="inline-flex items-center rounded-sm border border-border-light bg-bg-surface p-1">
      {MODES.map((mode) => {
        const isActive =
          pathname === mode.href ||
          pathname?.startsWith(`${mode.href}/`)
        return (
          <Link
            key={mode.href}
            href={mode.href}
            className={cn(
              'rounded-sm px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all',
              isActive
                ? 'bg-primary-main text-white shadow-sm ring-1 ring-primary-main/50'
                : 'text-text-muted hover:bg-bg-muted hover:text-text-primary',
            )}
          >
            {mode.label}
          </Link>
        )
      })}
    </div>
  )
}
