'use client'

import React from 'react'
import { Armchair, ClipboardList, Package, Layers, BarChart3, Wallet, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/modules/shared/utils/cn'

const SHORTCUTS = [
    { id: 1, title: 'MASA YÖNETİMİ', href: '/operations', icon: Armchair, color: 'text-primary-main', bg: 'bg-primary-subtle' },
    { id: 2, title: 'SİPARİŞ TAKİBİ', href: '/orders', icon: ClipboardList, color: 'text-warning-main', bg: 'bg-warning-bg' },
    { id: 3, title: 'STOK VE ENVANTER', href: '/inventory', icon: Package, color: 'text-danger-main', bg: 'bg-danger-bg' },
    { id: 4, title: 'ÜRÜN KATALOĞU', href: '/products', icon: Layers, color: 'text-info-main', bg: 'bg-info-bg' },
    { id: 5, title: 'GÜNLÜK RAPORLAR', href: '/reports', icon: BarChart3, color: 'text-success-main', bg: 'bg-success-bg' },
    { id: 6, title: 'KASA İŞLEMLERİ', href: '/cash', icon: Wallet, color: 'text-text-secondary', bg: 'bg-bg-muted' },
]

export function DashboardNavigation() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {SHORTCUTS.map((item) => (
                <Link key={item.id} href={item.href} className="group outline-none" aria-label={item.title}>
                    <div className="bg-bg-surface border border-border-light p-4 rounded-sm hover:border-border-medium hover:bg-bg-muted/30 transition-all flex items-center justify-between cursor-pointer shadow-sm group-focus-visible:ring-2 group-focus-visible:ring-primary-main">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                                "w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 duration-200",
                                item.bg, item.color
                            )}>
                                <item.icon size={20} strokeWidth={1.5} />
                            </div>
                            <span className="text-xs font-semibold text-text-primary uppercase tracking-[0.08em] truncate">
                                {item.title}
                            </span>
                        </div>
                        <ChevronRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                    </div>
                </Link>
            ))}
        </div>
    )
}
