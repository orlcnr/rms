'use client'

import React from 'react'
import { Milk, Apple, AlertTriangle, ChevronRight } from 'lucide-react'
import { cn } from '@/modules/shared/utils/cn'

const CRITICAL_ITEMS = [
    { id: 1, name: 'COLA (330ML)', stock: '12 ŞİŞE', icon: Milk, color: 'text-primary-main', bg: 'bg-primary-subtle' },
    { id: 2, name: 'DOMATES', stock: '8 KG', icon: Apple, color: 'text-danger-main', bg: 'bg-danger-bg' },
]

export function CriticalStock() {
    return (
        <section className="bg-bg-surface border border-border-light rounded-sm p-4 lg:p-6 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-light">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary-main rounded-full" />
                    <h2 className="text-sm font-black text-text-primary uppercase tracking-widest">KRİTİK STOK</h2>
                </div>
                <button className="text-[10px] font-black text-text-muted hover:text-primary-main transition-colors tracking-widest uppercase">ENVANTER</button>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center py-4 mb-6 bg-bg-muted/20 rounded-sm border border-border-light/50">
                <div className="relative flex items-center justify-center">
                    <svg className="w-24 h-24 sm:w-28 sm:h-28">
                        <circle className="text-border-light" cx="50%" cy="50%" r="42%" fill="transparent" stroke="currentColor" strokeWidth="8" />
                        <circle
                            className="text-primary-main transition-all duration-500 -rotate-90 origin-center"
                            cx="50%" cy="50%" r="42%"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeDasharray="263"
                            strokeDashoffset="60"
                            strokeLinecap="square"
                        />
                    </svg>
                    <div className="absolute text-center">
                        <p className="text-2xl font-black text-text-primary tracking-tighter tabular-nums leading-none">78%</p>
                        <p className="text-[8px] text-text-muted font-black uppercase tracking-widest mt-1">SAĞLIK</p>
                    </div>
                </div>
                <div className="mt-4 flex gap-4">
                    <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary-main" />
                        <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest">KRİTİK</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 rounded-full bg-border-light" />
                        <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest">NORMAL</span>
                    </div>
                </div>
            </div>

            <div className="space-y-1.5">
                {CRITICAL_ITEMS.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-bg-surface p-3 rounded-sm border border-border-light hover:border-border-light transition-all group cursor-pointer">
                        <div className="flex items-center space-x-3 min-w-0">
                            <div className={cn("p-1.5 rounded-sm", item.bg, item.color)}>
                                <item.icon className="w-4 h-4 flex-shrink-0" />
                            </div>
                            <span className="text-[11px] font-bold text-text-primary uppercase tracking-tight truncate leading-none">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={cn("text-[10px] font-black tabular-nums tracking-widest", item.color)}>{item.stock}</span>
                            <ChevronRight size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
