import { AlertCircle, Info, RefreshCcw } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'
import type { GuestStatusBannerVariant } from './guest-view-utils'

interface GuestStatusBannerProps {
  variant?: GuestStatusBannerVariant
  title: string
  description?: string
  compact?: boolean
  icon?: 'info' | 'refresh' | 'danger'
}

function resolveIcon(icon: GuestStatusBannerProps['icon']) {
  if (icon === 'refresh') {
    return RefreshCcw
  }

  if (icon === 'danger') {
    return AlertCircle
  }

  return Info
}

export function GuestStatusBanner({
  variant = 'info',
  title,
  description,
  compact = false,
  icon = 'info',
}: GuestStatusBannerProps) {
  const Icon = resolveIcon(icon)

  const variants = {
    info: 'border-primary-main/15 bg-primary-subtle text-primary-main',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    danger: 'border-red-200 bg-red-50 text-red-700',
  }

  return (
    <section
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-sm',
        variants[variant],
        compact && 'rounded-lg px-3 py-2.5',
      )}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70">
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>

      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.16em]">{title}</p>
        {description ? (
          <p className="mt-1 text-xs font-medium leading-5 text-current/80">
            {description}
          </p>
        ) : null}
      </div>
    </section>
  )
}
