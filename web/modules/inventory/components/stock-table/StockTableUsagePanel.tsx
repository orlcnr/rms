'use client'

import { Loader2 } from 'lucide-react'
import { formatNumericDisplay } from '@/modules/shared/utils/numeric'
import { IngredientUsage } from '../../types'

interface StockTableUsagePanelProps {
    isLoading: boolean
    usage?: IngredientUsage
}

export function StockTableUsagePanel({
    isLoading,
    usage,
}: StockTableUsagePanelProps) {
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Kullanım bilgileri yükleniyor...</span>
            </div>
        )
    }

    if (!usage) {
        return <p className="text-sm text-text-muted">Kullanım bilgisi yüklenemedi.</p>
    }

    return (
        <div>
            <h4 className="text-xs font-bold uppercase mb-3 text-text-secondary">
                Kullanıldığı Ürünler ({usage.total_products_affected})
            </h4>
            {usage.products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {usage.products.map((product) => (
                        <div
                            key={product.product_id}
                            className="flex items-center justify-between px-3 py-2 bg-bg-surface border border-border-light rounded-sm"
                        >
                            <span className="text-sm font-medium text-text-primary">
                                {product.product_name}
                            </span>
                            <span className="text-xs text-text-muted">
                                {formatNumericDisplay(product.quantity)} {usage.ingredient.unit}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-text-muted">
                    Bu malzeme hiçbir üründe kullanılmıyor.
                </p>
            )}
        </div>
    )
}
