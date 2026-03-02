'use client'

import React from 'react'

export function SettingsSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-bg-app animate-pulse">
      <div className="py-8 flex items-center justify-between">
        <div className="flex items-start gap-4">
          <div className="w-1.5 h-10 rounded-full bg-primary-main/40 mt-1" />
          <div className="space-y-2">
            <div className="h-6 w-64 bg-bg-surface border border-border-light rounded-sm" />
            <div className="h-4 w-80 bg-bg-surface border border-border-light rounded-sm" />
            <div className="h-3 w-48 bg-bg-surface border border-border-light rounded-sm" />
          </div>
        </div>
        <div className="h-10 w-40 bg-bg-surface border border-border-light rounded-sm" />
      </div>

      <main className="flex flex-col flex-1 pb-6 min-h-0">
        <div className="bg-bg-surface border-t border-x border-border-light rounded-t-sm p-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-8 w-24 bg-bg-app border border-border-light rounded-sm" />
            ))}
          </div>
        </div>

        <div className="bg-bg-surface border border-border-light rounded-b-sm flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-12 bg-bg-app border border-border-light rounded-sm" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
