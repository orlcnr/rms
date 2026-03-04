import {
  ReceiptText,
  ShoppingCart,
  Soup,
  WalletMinimal,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'
import type { GuestTabKey } from '../types'

interface GuestBottomNavProps {
  activeTab: GuestTabKey
  onChange: (tab: GuestTabKey) => void
  cartCount: number
  orderCount: number
  pulseCart: boolean
}

export function GuestBottomNav({
  activeTab,
  onChange,
  cartCount,
  orderCount,
  pulseCart,
}: GuestBottomNavProps) {
  const tabs: Array<{
    key: GuestTabKey
    icon: LucideIcon
    label: string
    badge?: number
  }> = [
    { key: 'menu', icon: Soup, label: 'Menü' },
    { key: 'orders', icon: ReceiptText, label: 'Siparişler', badge: orderCount },
    { key: 'cart', icon: ShoppingCart, label: 'Sepet', badge: cartCount },
    { key: 'account', icon: WalletMinimal, label: 'Hesap' },
  ]

  return (
    <nav className="z-40 border-t border-border-light bg-white/95 px-4 pb-4 pt-2 backdrop-blur md:px-5 md:pb-5">
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          const showBadge = (tab.badge || 0) > 0

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                'relative flex min-h-14 flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] font-bold uppercase tracking-[0.14em] transition',
                isActive
                  ? 'text-primary-main'
                  : 'text-text-muted hover:bg-bg-hover hover:text-text-secondary',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
              <span className="mt-1">{tab.label}</span>

              {showBadge ? (
                <span
                  className={cn(
                    'absolute right-2 top-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black',
                    isActive
                      ? 'bg-primary-subtle text-primary-main'
                      : 'bg-primary-main text-text-inverse',
                    tab.key === 'cart' && pulseCart && 'animate-pulse',
                  )}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
