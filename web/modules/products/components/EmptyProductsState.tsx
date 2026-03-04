'use client'

import React from 'react'
import { ArrowRight, Package } from 'lucide-react'

interface EmptyProductsStateProps {
    onReset: () => void
}

export function EmptyProductsState({ onReset }: EmptyProductsStateProps) {
    return (
        <div className="bg-bg-surface border border-border-light rounded-sm py-32 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-20 h-20 bg-bg-app rounded-full flex items-center justify-center mb-6 text-text-muted/20">
                <Package size={40} />
            </div>
            <h3 className="text-xl font-black text-text-primary uppercase tracking-tight mb-2">ÜRÜN BULUNAMADI</h3>
            <p className="text-text-muted text-xs font-bold uppercase tracking-widest max-w-sm opacity-60">
                Arama kriterlerinize uygun ürün mevcut değil. Lütfen filtreleri kontrol edin.
            </p>
            <button
                onClick={onReset}
                className="mt-8 flex items-center gap-2 text-primary-main text-[10px] font-black uppercase tracking-widest hover:underline"
            >
                TÜM ÜRÜNLERİ GÖSTER <ArrowRight size={14} />
            </button>
        </div>
    )
}
