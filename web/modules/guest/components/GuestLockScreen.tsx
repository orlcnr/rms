'use client'

import React from 'react'

interface GuestLockScreenProps {
  title: string
  description: string
}

export function GuestLockScreen({
  title,
  description,
}: GuestLockScreenProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(241,245,249,0.95),_rgba(226,232,240,0.85),_rgba(248,250,252,1))] px-6 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-200/80 bg-white/95 p-8 text-center shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-lg font-semibold text-amber-700">
            QR
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Misafir Oturumu
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {description}
          </p>
          <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
            Devam etmek için masadaki QR kodu yeniden okutun.
          </div>
        </div>
      </div>
    </div>
  )
}
