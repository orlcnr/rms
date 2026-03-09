'use client'

import React from 'react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { ReconciliationReport } from '../types'
import { formatCurrency } from '@/modules/shared/utils/numeric'
import { cn } from '@/modules/shared/utils/cn'
import { getPaymentMethodLabel, PaymentMethod } from '@/modules/orders/types'
import {
  TrendingUp,
  Banknote,
  Heart,
  Scale,
  MinusCircle,
  PiggyBank,
  ArrowUpRight,
} from 'lucide-react'

interface ReconciliationReportViewProps {
  report: ReconciliationReport | null
  isLoading?: boolean
}

interface ReportRow {
  label: string
  value: number
  description: string
  icon: React.ReactNode
  isBold?: boolean
  color?: string
}

export function ReconciliationReportView({
  report,
  isLoading,
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

  const salesRows: ReportRow[] = [
    {
      label: 'Açılış Bakiyesi',
      value: report.openingBalance || 0,
      description: 'Gün başı kasadaki nakit',
      icon: <PiggyBank size={14} />,
    },
    {
      label: 'Toplam Brüt Satış',
      value: report.totalGrossSales || 0,
      description: 'Nakit + kart + diğer tahsilatlar',
      icon: <TrendingUp size={14} />,
      isBold: true,
    },
    {
      label: 'İptal Edilen Satışlar',
      value: -(report.voidedSales || 0),
      description: 'Hatalı veya iptal edilen işlemler',
      icon: <MinusCircle size={14} />,
      color: 'text-danger-main',
    },
  ]

  const salesByMethod = report.salesByMethod || {}
  const salesMethods = Array.from(
    new Set<string>([...Object.values(PaymentMethod), ...Object.keys(salesByMethod)])
  )

  const methodRows: ReportRow[] = salesMethods.map((method) => {
    const amount = salesByMethod[method] || 0
    let description = 'Bu yöntemle tahsil edilen satış'

    if (method === 'cash') {
      description = 'Kasaya giren nakit satış'
    } else if (method === 'open_account') {
      description = 'Açık hesap / cari tahsilat'
    } else if (method === 'meal_voucher' || method === 'mealbox') {
      description = 'Yemek kartı / yemek çeki tahsilatı'
    } else if (method === 'credit_card' || method === 'debit_card') {
      description = 'Kart terminali tahsilatı'
    }

    return {
      label: `${getPaymentMethodLabel(method)} Satış`,
      value: amount,
      description,
      icon: method === 'cash' ? <Banknote size={14} /> : <Scale size={14} />,
    }
  })

  const tipRows: ReportRow[] = [
    {
      label: 'Toplam Bahşiş (Tip)',
      value: report.totalTip || 0,
      description: 'Personel havuzuna giren',
      icon: <Heart size={14} />,
    },
    {
      label: 'Tip Komisyonu',
      value: -(report.tipCommission || 0),
      description: 'POS çekim maliyeti kesintisi',
      icon: <MinusCircle size={14} />,
      color: 'text-danger-main',
    },
    {
      label: 'Net Dağıtılacak Tip',
      value: report.netTip || 0,
      description: 'Personel hak edişi',
      icon: <Heart size={14} />,
      isBold: true,
      color: 'text-primary-main',
    },
  ]
  const cashTipDistributed = report.cashTipDistributed ?? 0
  if (cashTipDistributed > 0) {
    tipRows.push({
      label: 'Kasadan Dağıtılan Tip',
      value: -cashTipDistributed,
      description: 'Kart bahşişinin kasadan personele ödenen kısmı',
      icon: <MinusCircle size={14} />,
      color: 'text-warning-main',
    })
  }

  const manualCashInTotal = report.manualCashInTotal ?? 0
  const expenseTotal = report.expenseTotal ?? 0
  const adjustmentInTotal = report.adjustmentInTotal ?? 0
  const adjustmentOutTotal = report.adjustmentOutTotal ?? 0

  const reconciliationRows: ReportRow[] = [
    {
      label: 'Beklenen Nakit',
      value: report.expectedCash || 0,
      description: '(Açılış + nakit satış + nakit tip - çıkış)',
      icon: <Banknote size={14} />,
    },
    {
      label: 'Gerçekleşen Nakit',
      value: report.actualCash || 0,
      description: 'Sayılan fiziki para',
      icon: <Scale size={14} />,
    },
    {
      label: 'Fark (Over/Short)',
      value: report.difference || 0,
      description:
        (report.difference || 0) < 0
          ? 'Kasa açığı'
          : (report.difference || 0) > 0
            ? 'Kasa fazlası'
            : 'Kasa tam',
      icon: <TrendingUp size={14} />,
      isBold: true,
      color:
        (report.difference || 0) < 0
          ? 'text-danger-main'
          : (report.difference || 0) > 0
            ? 'text-success-main'
            : 'text-text-muted',
    },
  ]

  if (manualCashInTotal > 0) {
    reconciliationRows.splice(1, 0, {
      label: 'Manuel Kasa Girişi',
      value: manualCashInTotal,
      description: 'Kasaya manuel eklenen nakit',
      icon: <ArrowUpRight size={14} />,
      color: 'text-info-main',
    })
  }

  if (expenseTotal > 0) {
    reconciliationRows.splice(reconciliationRows.length - 2, 0, {
      label: 'Masraf / Gider',
      value: -expenseTotal,
      description: 'Kasadan masraf olarak çıkan nakit',
      icon: <MinusCircle size={14} />,
      color: 'text-danger-main',
    })
  }

  if (adjustmentInTotal > 0) {
    reconciliationRows.splice(reconciliationRows.length - 2, 0, {
      label: 'Düzeltme Giriş',
      value: adjustmentInTotal,
      description: 'Sayım veya operasyon düzeltme girişi',
      icon: <ArrowUpRight size={14} />,
      color: 'text-info-main',
    })
  }

  if (adjustmentOutTotal > 0) {
    reconciliationRows.splice(reconciliationRows.length - 2, 0, {
      label: 'Düzeltme Çıkış',
      value: -adjustmentOutTotal,
      description: 'Sayım veya operasyon düzeltme çıkışı',
      icon: <MinusCircle size={14} />,
      color: 'text-warning-main',
    })
  }

  const refundSummary = report.refundSummary
  const refundRows: ReportRow[] = [
    {
      label: 'Toplam İade',
      value: -(refundSummary?.totalRefunded || 0),
      description: `${refundSummary?.refundCount || 0} işlem`,
      icon: <MinusCircle size={14} />,
      isBold: true,
      color: 'text-danger-main',
    },
    {
      label: 'Nakit İade',
      value: -(refundSummary?.byMethod?.cash || 0),
      description: 'Kasadan çıkan iade tutarı',
      icon: <Banknote size={14} />,
      color: 'text-danger-main',
    },
    {
      label: 'Kart İade',
      value: -(refundSummary?.byMethod?.card || 0),
      description: 'Kart işlem iadesi',
      icon: <Scale size={14} />,
      color: 'text-warning-main',
    },
    {
      label: 'Açık Hesap İade',
      value: -(refundSummary?.byMethod?.openAccount || 0),
      description: 'Cari hesaba geri yazılan iade',
      icon: <ArrowUpRight size={14} />,
      color: 'text-info-main',
    },
    {
      label: 'Yemek Çeki İade',
      value: -(refundSummary?.byMethod?.mealVoucher || 0),
      description: 'Yemek çeki/kurum iadesi',
      icon: <Scale size={14} />,
    },
    {
      label: 'Net Nakit Akışı',
      value: refundSummary?.netCash || 0,
      description: 'Toplam nakit giriş - çıkış',
      icon: <TrendingUp size={14} />,
      isBold: true,
      color: 'text-primary-main',
    },
  ]

  const RenderTable = ({
    title,
    rows,
    colorClass,
  }: {
    title: string
    rows: ReportRow[]
    colorClass: string
  }) => (
    <div className="bg-white border border-border-light rounded-sm overflow-hidden mb-6">
      <div className={cn('px-4 py-2 border-b border-border-light flex items-center gap-2', colorClass)}>
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
          {rows.map((row) => (
            <tr
              key={`${title}-${row.label}`}
              className={cn('border-b border-border-light last:border-0', row.isBold && 'bg-bg-app/50')}
            >
              <td className="px-4 py-3 flex items-center gap-2">
                <span className={cn('p-1 rounded-sm bg-bg-app', row.color)}>
                  {row.icon}
                </span>
                <span className={cn(row.isBold && 'font-bold')}>{row.label}</span>
              </td>
              <td className={cn('px-4 py-3 font-mono tabular-nums', row.isBold && 'font-bold', row.color)}>
                {formatCurrency(row.value)}
              </td>
              <td className="px-4 py-3 text-text-muted text-xs">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderPrintTable = (title: string, rows: ReportRow[]) => (
    <div className="border border-black">
      <div className="border-b border-black px-3 py-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em]">{title}</h3>
      </div>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-black">
            <th className="px-3 py-2 text-left font-bold">Kalem</th>
            <th className="px-3 py-2 text-right font-bold">Tutar</th>
            <th className="px-3 py-2 text-left font-bold">Açıklama</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${title}-print-${row.label}`} className="border-b border-black last:border-b-0">
              <td className={cn('px-3 py-2', row.isBold && 'font-bold')}>{row.label}</td>
              <td className={cn('px-3 py-2 text-right font-mono', row.isBold && 'font-bold')}>
                {formatCurrency(row.value)}
              </td>
              <td className="px-3 py-2 text-[10px] text-neutral-700">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <div className="flex flex-col print:hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
          <RenderTable
            title="SATIŞ VE CİRO ANALİZİ"
            rows={[...salesRows, ...methodRows]}
            colorClass="text-primary-main bg-primary-main/5"
          />
          <RenderTable
            title="BAHŞİŞ (TIP) ANALİZİ"
            rows={tipRows}
            colorClass="text-rose-500 bg-rose-500/5"
          />
        </div>
        <RenderTable
          title="İADE ÖZETİ"
          rows={refundRows}
          colorClass="text-danger-main bg-danger-main/5"
        />
        <RenderTable
          title="KASA MUTABAKATI (RECONCILIATION)"
          rows={reconciliationRows}
          colorClass="text-warning-main bg-warning-main/5"
        />

        <div className="p-4 bg-bg-app rounded-sm border border-border-light flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
              BANKAYA YATACAK NET MİKTAR
            </p>
            <p className="text-xs text-text-muted">Nakit dışı, banka/kurum tahsilatları - komisyonlar</p>
          </div>
          <div className="text-2xl font-mono font-black text-text-primary tabular-nums">
            {formatCurrency(report.netBankAmount || 0)}
          </div>
        </div>
      </div>

      <div className="hidden print:block print:bg-white print:text-black">
        <div className="mx-auto w-[190mm] min-h-[277mm]">
          <div className="border-b-2 border-black pb-4">
            <h1 className="text-xl font-bold uppercase tracking-[0.16em]">Kasa Tam Mutabakat Raporu</h1>
            <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-[11px]">
              <p><span className="font-bold">Kasa:</span> {report.cashRegisterName}</p>
              <p><span className="font-bold">Açan:</span> {report.openedBy}</p>
              <p>
                <span className="font-bold">Açılış:</span>{' '}
                {format(new Date(report.sessionOpenedAt), 'dd.MM.yyyy HH:mm', { locale: tr })}
              </p>
              <p><span className="font-bold">Kapatan:</span> {report.closedBy || '-'}</p>
              <p>
                <span className="font-bold">Kapanış:</span>{' '}
                {report.sessionClosedAt
                  ? format(new Date(report.sessionClosedAt), 'dd.MM.yyyy HH:mm', { locale: tr })
                  : 'Açık'}
              </p>
              <p><span className="font-bold">Hareket:</span> {report.movementCount}</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {renderPrintTable('Satış ve Ciro Analizi', [...salesRows, ...methodRows])}
            {renderPrintTable('Bahşiş Analizi', tipRows)}
            {renderPrintTable('İade Özeti', refundRows)}
            {renderPrintTable('Kasa Mutabakatı', reconciliationRows)}
          </div>

          <div className="mt-4 border-2 border-black px-4 py-3">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em]">Bankaya Yatacak Net Miktar</p>
                <p className="mt-1 text-[10px] text-neutral-700">
                  Nakit dışı banka/kurum tahsilatları eksi komisyonlar
                </p>
              </div>
              <p className="text-xl font-bold font-mono">{formatCurrency(report.netBankAmount || 0)}</p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-10 text-[11px]">
            <div className="pt-6 border-t border-black">
              <p className="font-bold">Hazırlayan</p>
              <p className="mt-8 text-neutral-700">İmza</p>
            </div>
            <div className="pt-6 border-t border-black">
              <p className="font-bold">Kontrol Eden</p>
              <p className="mt-8 text-neutral-700">İmza</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
