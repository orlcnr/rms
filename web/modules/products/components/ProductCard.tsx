'use client';

import React from 'react';
import { Edit2, Trash2, Package } from 'lucide-react';
import { MenuItem } from '../types';
import { cn } from '@/modules/shared/utils/cn';
import { formatCurrency } from '@/modules/shared/utils/numeric';

interface ProductCardProps {
    product: MenuItem;
    onEdit: (product: MenuItem) => void;
    onDelete: (id: string) => void;
    variant?: 'grid' | 'list';
}

export function ProductCard({ product, onEdit, onDelete, variant = 'grid' }: ProductCardProps) {
    const isListView = variant === 'list';
    
    if (isListView) {
        // List view layout
        return (
            <div className="bg-bg-surface border border-border-light rounded-sm p-4 hover:border-border-medium hover:shadow-md transition-all flex items-center gap-4">
                {/* Product Icon */}
                <div className="w-16 h-16 rounded-sm bg-bg-muted flex items-center justify-center shrink-0">
                    <Package size={24} className="text-text-secondary" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-text-primary uppercase tracking-tight">
                            {product.name}
                        </h3>
                        <div className="flex gap-1">
                            {product.is_available ? (
                                <span className="bg-success-main text-text-inverse text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm">
                                    SATIŞTA
                                </span>
                            ) : (
                                <span className="bg-danger-main text-text-inverse text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm">
                                    KAPALI
                                </span>
                            )}
                            {product.track_inventory && (
                                <span className="bg-info-main text-text-inverse text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm">
                                    STOK TAKİP
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-text-secondary font-medium line-clamp-1">
                        {product.description || 'Açıklama belirtilmemiş.'}
                    </p>
                </div>
                
                {/* Price */}
                <div className="shrink-0">
                    <span className="text-lg font-black text-text-primary">
                        {formatCurrency(product.price)}
                    </span>
                </div>
                
                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                    <button
                        onClick={() => onEdit(product)}
                        className="p-2.5 text-text-muted hover:text-primary-main hover:bg-primary-subtle rounded-sm transition-all"
                        title="Düzenle"
                    >
                        <Edit2 size={20} />
                    </button>
                    <button
                        onClick={() => onDelete(product.id)}
                        className="p-2.5 text-text-muted hover:text-danger-main hover:bg-danger-subtle rounded-sm transition-all"
                        title="Sil"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>
        );
    }
    
    // Grid view (default)
    return (
        <div className="bg-bg-surface border border-border-light rounded-sm p-2 group hover:border-border-medium hover:shadow-md transition-all flex flex-col h-full relative">
            {/* Product Icon Area - Compact */}
            <div className="w-full h-12 rounded-sm mb-2 bg-bg-muted flex items-center justify-center group-hover:bg-bg-hover transition-colors">
                <div className="flex flex-col items-center text-text-secondary">
                    <Package size={24} />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 mb-2">
                <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="text-base font-bold text-text-primary uppercase tracking-tight truncate leading-tight">
                        {product.name}
                    </h3>
                    <div className="flex gap-1 shrink-0">
                        {product.is_available ? (
                            <span className="bg-success-main text-text-inverse text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm">
                                SATIŞTA
                            </span>
                        ) : (
                            <span className="bg-danger-main text-text-inverse text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm">
                                KAPALI
                            </span>
                        )}
                        {product.track_inventory && (
                            <span className="bg-info-main text-text-inverse text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm">
                                STOK TAKİP
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-[10px] text-text-secondary font-medium line-clamp-2 leading-relaxed min-h-[30px]">
                    {product.description || 'Açıklama belirtilmemiş.'}
                </p>
            </div>

            {/* Price and Actions Footer */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-border-light/50">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-0.5">BİRİM FİYAT</span>
                    <span className="text-base font-semibold text-text-primary tabular-nums tracking-tighter">
                        {formatCurrency(product.price)}
                    </span>
                </div>

                <div className="flex gap-1.5">
                    <button
                        onClick={() => onEdit(product)}
                        className="p-2 bg-bg-muted text-text-muted hover:bg-bg-hover hover:text-primary-main rounded-sm transition-all"
                        title="DÜZENLE"
                    >
                        <Edit2 size={20} />
                    </button>
                    <button
                        onClick={() => onDelete(product.id)}
                        className="p-2 bg-bg-muted text-text-muted hover:bg-bg-hover hover:text-danger-main rounded-sm transition-all"
                        title="SİL"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
