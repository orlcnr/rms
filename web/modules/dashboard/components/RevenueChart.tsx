'use client'

import React from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'

// Sample data for 7 days - in production this would come from API
const REVENUE_DATA = [
    { day: 'Pzt', revenue: 8500, date: '17.02' },
    { day: 'Sal', revenue: 9200, date: '18.02' },
    { day: 'Çar', revenue: 7800, date: '19.02' },
    { day: 'Per', revenue: 11000, date: '20.02' },
    { day: 'Cum', revenue: 12600, date: '21.02' },
    { day: 'Cmt', revenue: 14200, date: '22.02' },
    { day: 'Paz', revenue: 11800, date: '23.02' },
]

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-bg-surface border border-border-light rounded-sm p-3 shadow-md">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {label} ({payload[0].payload.date})
                </p>
                <p className="text-base font-black text-text-primary tabular-nums">
                    ₺{payload[0].value.toLocaleString('tr-TR')}
                </p>
            </div>
        )
    }
    return null
}

export function RevenueChart() {
    // Calculate average for reference
    const avgRevenue = REVENUE_DATA.reduce((sum, d) => sum + d.revenue, 0) / REVENUE_DATA.length

    return (
        <section className="bg-bg-surface border border-border-light rounded-sm shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 pb-3 flex justify-between items-center border-b border-border-light/50">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-primary-main rounded-full" />
                    <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.15em]">
                        GELİR TRENDİ
                    </h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">HAFTALIK ORTALAMA</p>
                        <p className="text-sm font-black text-text-primary tabular-nums">
                            ₺{avgRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Chart - Compact height */}
            <div className="p-4 pt-3">
                <div className="h-[160px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={REVENUE_DATA}
                            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="var(--border-light)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
                                dy={8}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}
                                tickFormatter={(value) => `₺${(value / 1000).toFixed(1)}k`}
                                dx={-5}
                                width={50}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="var(--primary-main)"
                                strokeWidth={1.5}
                                dot={{ fill: 'var(--primary-main)', strokeWidth: 0, r: 3 }}
                                activeDot={{ fill: 'var(--primary-main)', strokeWidth: 0, r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Footer - Period info */}
            <div className="px-4 py-3 border-t border-border-light bg-bg-muted/30">
                <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">
                    SON 7 GÜN • 17.02.2026 - 23.02.2026
                </p>
            </div>
        </section>
    )
}
