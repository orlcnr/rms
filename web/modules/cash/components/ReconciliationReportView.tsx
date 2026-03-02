'use client'

import React from 'react'
import { ReconciliationReport } from '../types'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { cn } from '@/modules/shared/utils/cn'
import {
    TrendingUp,
    Banknote,
    Heart,
    Scale,
    MinusCircle,
    PiggyBank
} from 'lucide-react'

interface ReconciliationReportViewProps {
    report: ReconciliationReport | null
    isLoading?: boolean
}

export function ReconciliationReportView({
    report,
    isLoading
}: ReconciliationReportViewProps) {
    if (isLoading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-48 bg-bg-app rounded-sm border border-border-light" />
                <div className="h-64 bg-bg-app rounded-sm border border-border-light" />
            </div>
        )
    }

    if (!report) {
        return (
            <div className="p-6 text-center text-text-muted">
                <p>Mutabakat raporu verisi bulunamadı.</p>
            </div>
        )
    }

    const salesRows = [
        { label: 'Açılış Bakiyesi', value: report.openingBalance || 0, description: 'Gün başı kasadaki nakit', icon: <PiggyBank size={14} /> },
        { label: 'Toplam Brüt Satış', value: report.totalGrossSales || 0, description: 'Nakit + POS + Yemek Çeki', icon: <TrendingUp size={14} />, isBold: true },
        { label: 'İptal Edilen Satışlar', value: -(report.voidedSales || 0), description: 'Hatalı veya iptal edilen işlemler', icon: <MinusCircle size={14} />, color: 'text-danger-main' },
    ]

    const methodRows = Object.entries(report.salesByMethod || {}).map(([method, amount]) => ({
        label: method === 'cash' ? 'Nakit Satış' : method === 'credit_card' ? 'POS Satış' : method.toUpperCase(),
        value: amount,
        description: method === 'cash' ? 'Kasaya giren nakit' : 'Banka terminali toplamı',
        icon: method === 'cash' ? <Banknote size={14} /> : <Scale size={14} />
    }))

    const tipRows = [
        { label: 'Toplam Bahşiş (Tip)', value: report.totalTip || 0, description: 'Personel havuzuna giren', icon: <Heart size={14} /> },
        { label: 'Tip Komisyonu', value: -(report.tipCommission || 0), description: 'POS çekim maliyeti kesintisi', icon: <MinusCircle size={14} />, color: 'text-danger-main' },
        { label: 'Net Dağıtılacak Tip', value: report.netTip || 0, description: 'Personel hak edişi', icon: <Heart size={14} />, isBold: true, color: 'text-primary-main' },
    ]

    const reconciliationRows = [
        { label: 'Beklenen Nakit', value: report.expectedCash || 0, description: '(Açılış + Nakit Satış + Nakit Tip - Çıkış)', icon: <Banknote size={14} /> },
        { label: 'Gerçekleşen Nakit', value: report.actualCash || 0, description: 'Sayılan fiziki para', icon: <Scale size={14} /> },
        {
            label: 'FARK (Over/Short)',
            value: report.difference || 0,
            description: (report.difference || 0) < 0 ? 'Kasa Açığı' : (report.difference || 0) > 0 ? 'Kasa Fazlası' : 'Kasa Tam',
            icon: <TrendingUp size={14} />,
            isBold: true,
            color: (report.difference || 0) < 0 ? 'text-danger-main' : (report.difference || 0) > 0 ? 'text-success-main' : 'text-text-muted'
        },
    ]

    const RenderTable = ({ title, rows, colorClass }: { title: string, rows: any[], colorClass: string }) => (
        <div className="bg-white border border-border-light rounded-sm overflow-hidden mb-6">
            <div className={cn("px-4 py-2 border-b border-border-light flex items-center gap-2", colorClass)}>
                <div className="w-1 h-3 bg-current rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">{title}</h3>
            </div>
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-bg-app border-b border-border-light">
                        <th className="px-4 py-2 font-bold text-text-muted w-1/3">Kalem</th>
                        <th className="px-4 py-2 font-bold text-text-muted w-1/4">Miktar</th>
                        <th className="px-4 py-2 font-bold text-text-muted">Açıklama</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr key={idx} className={cn("border-b border-border-light last:border-0", row.isBold && "bg-bg-app/50")}>
                            <td className="px-4 py-3 flex items-center gap-2">
                                <span className={cn("p-1 rounded-sm bg-bg-app", row.color)}>
                                    {row.icon}
                                </span>
                                <span className={cn(row.isBold && "font-bold")}>{row.label}</span>
                            </td>
                            <td className={cn("px-4 py-3 font-mono tabular-nums", row.isBold && "font-bold", row.color)}>
                                {formatCurrency(row.value)}
                            </td>
                            <td className="px-4 py-3 text-text-muted text-xs">
                                {row.description}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )

    return (
        <div className="flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
                <RenderTable title="SATIŞ VE CİRO ANALİZİ" rows={[...salesRows, ...methodRows]} colorClass="text-primary-main bg-primary-main/5" />
                <RenderTable title="BAHŞİŞ (TIP) ANALİZİ" rows={tipRows} colorClass="text-rose-500 bg-rose-500/5" />
            </div>
            <RenderTable title="KASA MUTABAKATI (RECONCILIATION)" rows={reconciliationRows} colorClass="text-warning-main bg-warning-main/5" />

            <div className="p-4 bg-bg-app rounded-sm border border-border-light flex justify-between items-center">
                <div>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">BANKAYA YATACAK NET MİKTAR</p>
                    <p className="text-xs text-text-muted">POS Satışları + Yemek Çekleri - Komisyonlar</p>
                </div>
                <div className="text-2xl font-mono font-black text-text-primary tabular-nums">
                    {formatCurrency(report.netBankAmount || 0)}
                </div>
            </div>
        </div>
    )
}
