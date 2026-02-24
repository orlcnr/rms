'use client'

import React from 'react'
import { DollarSign, ShoppingBag, Users, AlertTriangle } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'

export function HeroStats() {
    const kpis = [
        {
            label: 'GÜNLÜK NET SATIŞ',
            value: '₺12.650,45',
            trend: '+12.5%',
            trendUp: true,
            icon: DollarSign,
            color: 'text-success-main'
        },
        {
            label: 'AKTİF SİPARİŞLER',
            value: '42',
            trend: '8 Bekleyen',
            trendUp: false,
            icon: ShoppingBag,
            color: 'text-primary-main'
        },
        {
            label: 'MASA DOLULUK ORANI',
            value: '%86',
            trend: '32/40 Dolu',
            trendUp: true,
            icon: Users,
            color: 'text-info-main'
        },
        {
            label: 'KRİTİK STOK UYARISI',
            value: '12',
            trend: 'Eylem Gerekli',
            trendUp: false,
            icon: AlertTriangle,
            color: 'text-danger-main'
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, idx) => (
                <div
                    key={idx}
                    className="bg-bg-surface border border-border-light rounded-sm p-4 hover:border-border-medium transition-all shadow-sm"
                >
                    <div className="flex justify-between items-start mb-3">
                        {/* Icon Container - Structured rounded with bg-bg-muted */}
                        <div className={cn(
                            "w-10 h-10 rounded-sm flex items-center justify-center",
                            "bg-bg-muted border border-border-light",
                            kpi.color
                        )}>
                            <kpi.icon size={20} strokeWidth={1.5} />
                        </div>
                        <div className={cn(
                            "text-xs font-semibold px-2 py-1 rounded-sm tracking-wider tabular-nums",
                            kpi.trendUp ? "bg-success-bg text-success-main" : "bg-warning-bg text-warning-main"
                        )}>
                            {kpi.trend}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-[0.1em] mb-1.5">{kpi.label}</p>
                        <h3 className="text-2xl font-black text-text-primary tracking-tight tabular-nums leading-none">
                            {kpi.value}
                        </h3>
                    </div>
                </div>
            ))}
        </div>
    )
}
