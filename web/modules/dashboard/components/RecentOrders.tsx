'use client'

import React from 'react'
import { cn } from '@/modules/shared/utils/cn'
import { ArrowRight } from 'lucide-react'

const RECENT_ORDERS = [
    { id: 'ORD-2104', name: 'ALAADDİN USTA', table: 'M10', time: '12:45', amount: '₺245,60', status: 'hazirlaniyor', statusLabel: 'HAZIRLANIYOR' },
    { id: 'ORD-2103', name: 'ELİF YILMAZ', table: 'ONLINE', time: '12:42', amount: '₺215,00', status: 'yolda', statusLabel: 'YOLDA' },
    { id: 'ORD-2102', name: 'HASAN TUNA', table: 'M3', time: '12:38', amount: '₺158,00', status: 'odendi', statusLabel: 'ÖDENDİ' },
    { id: 'ORD-2101', name: 'AYŞE AKYÜZ', table: 'M12', time: '12:35', amount: '₺420,50', status: 'odendi', statusLabel: 'ÖDENDİ' },
    { id: 'ORD-2100', name: 'MEHMET CAN', table: 'M7', time: '12:30', amount: '₺185,00', status: 'hazirlaniyor', statusLabel: 'HAZIRLANIYOR' },
    { id: 'ORD-2099', name: 'ZEYNEP KARA', table: 'M5', time: '12:28', amount: '₺310,00', status: 'hazirlaniyor', statusLabel: 'HAZIRLANIYOR' },
    { id: 'ORD-2098', name: 'BURAK YAVUZ', table: 'M8', time: '12:25', amount: '₺175,50', status: 'odendi', statusLabel: 'ÖDENDİ' },
    { id: 'ORD-2097', name: 'DERYA TÜRK', table: 'ONLINE', time: '12:20', amount: '₺89,00', status: 'yolda', statusLabel: 'YOLDA' },
]

export function RecentOrders() {
    return (
        <section className="bg-bg-surface border border-border-light rounded-sm shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-4 pb-3">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-primary-main rounded-full" />
                        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.15em]">SON SİPARİŞLER</h2>
                    </div>
                    <button className="text-xs font-semibold text-text-muted hover:text-primary-main transition-colors tracking-widest uppercase flex items-center gap-2 group focus-visible:ring-2 focus-visible:ring-primary-main" aria-label="Tüm siparişleri görüntüle">
                        TAM LİSTE <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>

                {/* Scrollable table container with sticky header */}
                <div className="overflow-auto max-h-[320px] scrollbar-thin scrollbar-thumb-border-medium">
                    <table className="w-full erp-table">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-bg-muted">
                                <th className="text-left w-28 px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">SİPARİŞ ID</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">MÜŞTERİ / MASA</th>
                                <th className="text-center w-24 px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">SAAT</th>
                                <th className="text-right w-28 px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">TUTAR</th>
                                <th className="text-right w-32 px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">DURUM</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light/50">
                            {RECENT_ORDERS.map((order) => (
                                <tr key={order.id} className="hover:bg-bg-muted/50 transition-colors duration-150 group cursor-pointer">
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-semibold text-text-secondary tabular-nums">{order.id}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-text-primary uppercase tracking-tight truncate">{order.name}</span>
                                            <span className="text-xs text-text-muted font-semibold tracking-widest uppercase mt-0.5">{order.table}</span>
                                        </div>
                                    </td>
                                    <td className="text-center px-4 py-3">
                                        <span className="text-sm font-semibold text-text-secondary tabular-nums">{order.time}</span>
                                    </td>
                                    <td className="text-right px-4 py-3">
                                        <span className="text-sm font-black text-text-primary tabular-nums">{order.amount}</span>
                                    </td>
                                    <td className="text-right px-4 py-3">
                                        <span className={cn(
                                            "text-xs font-semibold px-2 py-1 rounded-sm uppercase tracking-wider inline-block",
                                            order.status === 'hazirlaniyor' ? 'bg-primary-subtle text-primary-main' :
                                                order.status === 'yolda' ? 'bg-success-bg text-success-main' :
                                                    'bg-info-bg text-info-main'
                                        )}>
                                            {order.statusLabel}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="mt-auto p-4 border-t border-border-light bg-bg-muted/30">
                <p className="text-xs text-text-muted font-semibold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-main" />
                    VERİ SETİ SON 15 DAKİKAYI KAPSAR
                </p>
            </div>
        </section>
    )
}
