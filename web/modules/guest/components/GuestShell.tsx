import type { ReactNode } from 'react'

interface GuestShellProps {
  header: ReactNode
  banner?: ReactNode
  children: ReactNode
  footer: ReactNode
}

export function GuestShell({
  header,
  banner,
  children,
  footer,
}: GuestShellProps) {
  return (
    <div className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(236,91,19,0.08),_transparent_30%),linear-gradient(180deg,_#fbfbfc_0%,_#f6f7f9_100%)] px-0 text-text-primary md:px-5 md:py-5">
      <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden border-x border-border-light/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] md:h-[calc(100dvh-2.5rem)] md:max-w-3xl md:rounded-[28px] md:border md:shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        {header}

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {banner ? <div className="px-4 pt-4 md:px-5">{banner}</div> : null}
          <div className="min-h-0">{children}</div>
        </main>

        <div className="shrink-0">{footer}</div>
      </div>
    </div>
  )
}
