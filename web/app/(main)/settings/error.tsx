'use client'

import { Button } from '@/modules/shared/components/Button'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg bg-bg-surface border border-border-light rounded-sm p-8 space-y-4 text-center">
        <h2 className="text-lg font-black uppercase tracking-wider text-text-primary">Bir Hata Oluştu</h2>
        <p className="text-sm text-text-secondary font-semibold">{error.message || 'Beklenmeyen bir hata oluştu.'}</p>
        <div className="flex justify-center">
          <Button onClick={reset}>TEKRAR DENE</Button>
        </div>
      </div>
    </div>
  )
}
