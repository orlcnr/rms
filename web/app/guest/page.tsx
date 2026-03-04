import { Suspense } from 'react'
import { GuestEntryClient } from '@/modules/guest/components/GuestEntryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function GuestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-sm font-medium text-slate-500">
          Misafir ekranı hazırlanıyor...
        </div>
      }
    >
      <GuestEntryClient />
    </Suspense>
  )
}
