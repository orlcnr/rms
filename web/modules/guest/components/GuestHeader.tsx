interface GuestHeaderProps {
  restaurantName: string
  tableName: string
  cartCount: number
  onCartClick: () => void
  pulseCart: boolean
}

export function GuestHeader({
  restaurantName,
  tableName,
  cartCount,
  onCartClick,
  pulseCart,
}: GuestHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border-light bg-white px-4 pb-3 pt-4 md:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="h-11 w-11 shrink-0" aria-hidden="true" />

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.24em] text-primary-main">
            {restaurantName}
          </p>
          <h1 className="mt-1 truncate text-[28px] font-black leading-none text-text-primary">
            {tableName}
          </h1>
        </div>

        <button
          type="button"
          onClick={onCartClick}
          aria-label="Sepete git"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-light bg-bg-surface text-text-primary shadow-sm transition hover:border-border-medium hover:bg-bg-hover"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <circle cx="8" cy="20" r="1" />
            <circle cx="19" cy="20" r="1" />
            <path d="M2 3h3l2.68 10.39a1 1 0 0 0 .97.76h9.72a1 1 0 0 0 .97-.76L22 7H6" />
          </svg>

          {cartCount > 0 ? (
            <span
              className={[
                'absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary-main px-1.5 py-0.5 text-[10px] font-black text-text-inverse',
                pulseCart ? 'animate-pulse' : '',
              ].join(' ')}
            >
              {cartCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  )
}
