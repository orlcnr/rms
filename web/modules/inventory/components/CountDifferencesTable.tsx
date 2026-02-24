'use client'

import React from 'react'
import { CountDifference } from '../types'
import { formatCurrency } from '@/modules/shared/utils/numeric'

interface CountDifferencesTableProps {
    differences: CountDifference[]
    isLoading?: boolean
}

export function CountDifferencesTable({ differences, isLoading = false }: CountDifferencesTableProps) {
    // Haftalık gruplama
    const weeklyData = React.useMemo(() => {
        const grouped: { [week: string]: CountDifference[] } = {}
        
        differences.forEach(diff => {
            // Güvenli tarih kontrolü
            if (!diff.count_date) return
            
            const date = new Date(diff.count_date)
            if (isNaN(date.getTime())) return
            
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            const weekKey = weekStart.toISOString().split('T')[0]
            
            if (!grouped[weekKey]) {
                grouped[weekKey] = []
            }
            grouped[weekKey].push(diff)
        })
        
        return Object.entries(grouped).map(([week, items]) => ({
            week,
            items,
            totalDifference: items.reduce((sum, i) => sum + i.difference_quantity, 0),
            totalLoss: items.reduce((sum, i) => sum + i.difference_try, 0)
        })).sort((a, b) => b.week.localeCompare(a.week))
    }, [differences])

    if (isLoading) {
        return (
            <div className="bg-bg-surface border border-border-light rounded-sm p-8 text-center">
                <p className="text-text-muted">Yükleniyor...</p>
            </div>
        )
    }

    if (differences.length === 0) {
        return (
            <div className="bg-bg-surface border border-border-light rounded-sm p-8 text-center">
                <p className="text-text-muted">Sayım farkı verisi bulunmuyor.</p>
                <p className="text-xs text-text-muted mt-1">Hızlı sayım modunu kullanarak sayım yapabilirsiniz.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Özet */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-secondary uppercase">
                    Haftalık Sayım Farkı Raporu
                </h3>
                <div className="flex gap-4">
                    <div className="text-xs">
                        <span className="text-text-muted">Toplam Kayıp: </span>
                        <span className="font-bold text-danger-main">
                            {formatCurrency(differences.reduce((sum, d) => sum + d.difference_try, 0))}
                        </span>
                    </div>
                </div>
            </div>

            {/* Haftalık gruplar */}
            {weeklyData.map((weekGroup) => (
                <div key={weekGroup.week} className="bg-bg-surface border border-border-light rounded-sm overflow-hidden">
                    {/* Hafta başlığı */}
                    <div className="bg-bg-muted px-4 py-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-text-secondary uppercase">
                            {new Date(weekGroup.week).toLocaleDateString('tr-TR', { 
                                day: 'numeric', 
                                month: 'long' 
                            })} Haftası
                        </span>
                        <span className={`text-xs font-bold ${
                            weekGroup.totalLoss > 0 ? 'text-danger-main' : 'text-success-main'
                        }`}>
                            {weekGroup.totalLoss > 0 ? '-' : '+'}{formatCurrency(Math.abs(weekGroup.totalLoss))}
                        </span>
                    </div>

                    {/* Tablo */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border-light">
                                    <th className="text-left text-[10px] font-black uppercase text-text-muted px-4 py-2">TARİH</th>
                                    <th className="text-left text-[10px] font-black uppercase text-text-muted px-4 py-2">MALZEME</th>
                                    <th className="text-right text-[10px] font-black uppercase text-text-muted px-4 py-2">SİSTEM</th>
                                    <th className="text-right text-[10px] font-black uppercase text-text-muted px-4 py-2">SAYILAN</th>
                                    <th className="text-right text-[10px] font-black uppercase text-text-muted px-4 py-2">FARK</th>
                                    <th className="text-right text-[10px] font-black uppercase text-text-muted px-4 py-2">TUTAR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weekGroup.items.map((diff, idx) => (
                                    <tr key={`${diff.ingredient_id}-${idx}`} className="border-b border-border-light last:border-0">
                                        <td className="px-4 py-2 text-xs text-text-secondary">
                                            {new Date(diff.count_date).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-4 py-2 text-sm font-medium text-text-primary">
                                            {diff.ingredient_name}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-text-secondary">
                                            {diff.system_quantity} {diff.unit}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-text-secondary">
                                            {diff.counted_quantity} {diff.unit}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right font-bold">
                                            <span className={diff.difference_quantity >= 0 ? 'text-success-main' : 'text-danger-main'}>
                                                {diff.difference_quantity >= 0 ? '+' : ''}{diff.difference_quantity.toFixed(2)} {diff.unit}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right font-bold">
                                            <span className={diff.difference_try >= 0 ? 'text-success-main' : 'text-danger-main'}>
                                                {diff.difference_try >= 0 ? '+' : ''}{formatCurrency(Math.abs(diff.difference_try))}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    )
}
