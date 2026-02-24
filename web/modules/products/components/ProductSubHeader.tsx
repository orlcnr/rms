// ============================================
// PRODUCT SUB HEADER - Ürünler Sayfası Header
// Sol: Başlık + Açıklama
// Sağ: Yeni Ürün Ekle butonu
// ============================================

'use client'

import React from 'react'
import { Plus } from 'lucide-react'

interface ProductSubHeaderProps {
  onAddProduct: () => void
}

/**
 * Product Sub Header - Products Modülü Header
 * - Sol: Başlık + Alt açıklama + Dekoratif çubuk
 * - Sağ: Yeni Ürün Ekle butonu
 */
export function ProductSubHeader({
  onAddProduct,
}: ProductSubHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border-light pb-8">
      {/* Sol: Başlık ve Açıklama */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {/* Dekoratif Çubuk - Products tarzı */}
          <div className="w-2 h-6 bg-primary-main rounded-full" />
          <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight">
            Ürün Kataloğu
          </h1>
        </div>
        <p className="text-text-muted text-sm font-bold uppercase tracking-widest opacity-70">
          Menü ve ürün envanter yönetimi
        </p>
      </div>

      {/* Sağ: Yeni Ürün Ekle Butonu */}
      <button
        onClick={onAddProduct}
        className="flex items-center justify-center gap-3 px-8 py-3 bg-primary-main hover:bg-primary-hover text-text-inverse rounded-sm text-xs font-black uppercase tracking-[0.2em] shadow-sm transition-all active:scale-95 group"
      >
        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
        <span>YENİ ÜRÜN EKLE</span>
      </button>
    </div>
  )
}
