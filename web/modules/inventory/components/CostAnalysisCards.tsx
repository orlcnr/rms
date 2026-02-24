'use client'

import React from 'react'
import { AlertTriangle, TrendingUp, DollarSign, Package } from 'lucide-react'
import { CostImpact, FoodCostAlert, CountDifference } from '../types'
import { formatCurrency } from '@/modules/shared/utils/numeric'

interface CostAnalysisCardsProps {
    costImpacts: CostImpact[]
    foodCostAlerts: FoodCostAlert[]
    countDifferences: CountDifference[]
    isLoading?: boolean
}

export function CostAnalysisCards({
    costImpacts,
    foodCostAlerts,
    countDifferences,
    isLoading = false
}: CostAnalysisCardsProps) {
    // Kritik stok sayısı (stok <= kritik seviye)
    const criticalStockCount = 0 // Bu veri ingredients'den hesaplanmalı
    
    // Toplam potansiyel kayıp (son sayım farkları)
    const totalLoss = countDifferences.reduce((sum, diff) => sum + diff.difference_try, 0)
    
    // Fiyatı en çok artanların toplam etkisi
    const top3Impact = costImpacts.slice(0, 3).reduce((sum, item) => sum + item.cost_impact, 0)

    const cards = [
        {
            title: 'KRİTİK STOK',
            value: criticalStockCount,
            subtitle: 'Malzeme kritik seviyede',
            icon: Package,
            color: 'danger' as const,
            colorBg: 'bg-danger-bg',
            colorText: 'text-danger-main',
        },
        {
            title: 'FİYAT ARTIŞ ETKİSİ',
            value: formatCurrency(top3Impact),
            subtitle: 'Son 7 günde en çok artanlar',
            icon: TrendingUp,
            color: 'warning' as const,
            colorBg: 'bg-warning-bg',
            colorText: 'text-warning-main',
        },
        {
            title: 'POTANSİYEL KAYIP',
            value: formatCurrency(totalLoss),
            subtitle: 'Son sayım farkları',
            icon: DollarSign,
            color: totalLoss > 0 ? 'danger' as const : 'success' as const,
            colorBg: totalLoss > 0 ? 'bg-danger-bg' : 'bg-success-bg',
            colorText: totalLoss > 0 ? 'text-danger-main' : 'text-success-main',
        },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className="bg-bg-surface border border-border-light rounded-sm p-4"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                                {card.title}
                            </p>
                            <p className={`text-2xl font-bold mt-2 ${card.colorText}`}>
                                {isLoading ? '...' : card.value}
                            </p>
                            <p className="text-[10px] font-medium text-text-muted mt-1">
                                {card.subtitle}
                            </p>
                        </div>
                        <div className={`p-2 ${card.colorBg} rounded-sm`}>
                            <card.icon className={`w-5 h-5 ${card.colorText}`} />
                        </div>
                    </div>
                </div>
            ))}

            {/* Food Cost Alerts */}
            {foodCostAlerts.length > 0 && (
                <div className="md:col-span-3 mt-4">
                    <div className="bg-danger-bg border border-danger-border rounded-sm p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-5 h-5 text-danger-main" />
                            <h3 className="text-sm font-bold text-danger-main uppercase">
                                Food Cost Uyarısı - %35 Aşan Ürünler
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {foodCostAlerts.slice(0, 6).map((alert) => (
                                <div
                                    key={alert.product_id}
                                    className="bg-bg-surface border border-border-light rounded-sm p-3"
                                >
                                    <p className="text-sm font-bold text-text-primary">
                                        {alert.product_name}
                                    </p>
                                    <div className="flex justify-between mt-2 text-xs">
                                        <span className="text-text-muted">Mevcut Fiyat:</span>
                                        <span className="font-semibold">{formatCurrency(alert.current_price)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-text-muted">Food Cost:</span>
                                        <span className="font-bold text-danger-main">{alert.food_cost_percent.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between text-xs mt-1 pt-1 border-t border-border-light">
                                        <span className="text-text-muted">Önerilen:</span>
                                        <span className="font-bold text-success-main">{formatCurrency(alert.suggested_price)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Price Increases */}
            {costImpacts.length > 0 && (
                <div className="md:col-span-3 mt-4">
                    <div className="bg-bg-surface border border-border-light rounded-sm p-4">
                        <h3 className="text-sm font-bold text-text-secondary uppercase mb-3">
                            Son 7 Günde Fiyatı En Çok Artan Malzemeler
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border-light">
                                        <th className="text-left text-[10px] font-black uppercase text-text-muted py-2">MALZEME</th>
                                        <th className="text-right text-[10px] font-black uppercase text-text-muted py-2">ESKİ FİYAT</th>
                                        <th className="text-right text-[10px] font-black uppercase text-text-muted py-2">YENİ FİYAT</th>
                                        <th className="text-right text-[10px] font-black uppercase text-text-muted py-2">DEĞİŞİM</th>
                                        <th className="text-right text-[10px] font-black uppercase text-text-muted py-2">AYLIK ETKİ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {costImpacts.slice(0, 5).map((item) => (
                                        <tr key={item.ingredient_id} className="border-b border-border-light last:border-0">
                                            <td className="py-3 text-sm font-medium text-text-primary">
                                                {item.ingredient_name}
                                            </td>
                                            <td className="py-3 text-sm text-right text-text-secondary">
                                                {formatCurrency(item.previous_price)}
                                            </td>
                                            <td className="py-3 text-sm text-right text-text-secondary">
                                                {formatCurrency(item.current_price)}
                                            </td>
                                            <td className="py-3 text-sm text-right">
                                                <span className={item.price_change > 0 ? 'text-danger-main font-bold' : 'text-success-main font-bold'}>
                                                    {item.price_change > 0 ? '+' : ''}{item.price_change_percent.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="py-3 text-sm text-right font-bold text-text-primary">
                                                {formatCurrency(item.cost_impact)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
