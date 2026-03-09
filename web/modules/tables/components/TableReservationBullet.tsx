'use client'

import Link from 'next/link'
import { CalendarDays } from 'lucide-react'

interface TableReservationBulletProps {
  tableId: string
}

const ISTANBUL_TODAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Istanbul',
}).format(new Date())

export function TableReservationBullet({ tableId }: TableReservationBulletProps) {
  const href = `/reservations?date=${ISTANBUL_TODAY}&tableId=${tableId}`

  return (
    <Link
      href={href}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-1.5 rounded-full border border-warning-main/35 bg-warning-subtle/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-warning-main hover:bg-warning-subtle/35 transition-colors"
      aria-label="Bugünkü rezervasyonları aç"
      title="Bugünkü rezervasyonları aç"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-warning-main" />
      <CalendarDays className="h-3 w-3" />
      Rezervasyonlu
    </Link>
  )
}
