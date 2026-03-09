'use client'

import { Archive, Receipt, ShieldCheck, Wallet } from 'lucide-react'
import { BodySection, SubHeaderSection } from '@/modules/shared/components/layout'
import { ReportCategoryCard } from './ReportCategoryCard'

const reportCategories = [
  {
    id: 'audit',
    title: 'Audit & Denetim',
    description:
      'Kullanıcı hareketlerini filtreleyin, kayıt detaylarını inceleyin ve CSV olarak dışa aktarın.',
    href: '/reports/audit',
    icon: <ShieldCheck size={20} />,
    status: 'active' as const,
    previewItems: [
      { label: 'Durum', value: 'Hazır' },
      { label: 'Çıktı', value: 'CSV Export' },
      { label: 'Kapsam', value: 'Kullanıcı İşlemleri' },
    ],
  },
  {
    id: 'sales',
    title: 'Satış Raporları',
    description:
      'Günlük satış özetlerini, ürün performansını ve saatlik yoğunluğu inceleyin.',
    href: '/reports/sales',
    icon: <Wallet size={20} />,
    status: 'active' as const,
    previewItems: [
      { label: 'Görünüm', value: 'Günlük / Ürün' },
      { label: 'Odak', value: 'Ciro' },
      { label: 'Saatlik', value: 'Hazır' },
    ],
  },
  {
    id: 'finance',
    title: 'Kasa & Finans',
    description:
      'Ödeme yöntemi dağılımını, satış bazlı gelir eğilimini ve indirim etkisini takip edin.',
    href: '/reports/finance',
    icon: <Receipt size={20} />,
    status: 'active' as const,
    previewItems: [
      { label: 'Ödeme', value: 'Kırılım' },
      { label: 'Gelir', value: 'Satış Bazlı' },
      { label: 'İndirim', value: 'Hazır' },
    ],
  },
  {
    id: 'inventory',
    title: 'Stok Raporları',
    description:
      'Stok seviyelerini, düşük stok riskini ve hareket geçmişini canlı olarak izleyin.',
    href: '/reports/inventory',
    icon: <Archive size={20} />,
    status: 'active' as const,
    previewItems: [
      { label: 'Durum', value: 'Canlı' },
      { label: 'Uyarı', value: 'Kritik Stok' },
      { label: 'Hareket', value: 'Geçmiş' },
    ],
  },
]

export function ReportsHubClient() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-app">
      <SubHeaderSection
        title="RAPOR MERKEZİ"
        description="Aktif raporlara erişin ve planlanan modüller için hazır yapıyı takip edin."
        moduleColor="bg-slate-600"
        isConnected
      />

      <main className="flex flex-1 flex-col pb-6 min-h-0">
        <BodySection className="bg-transparent p-0 shadow-none">
          <div className="grid gap-4 xl:grid-cols-2">
            {reportCategories.map((category) => (
              <ReportCategoryCard
                key={category.id}
                title={category.title}
                description={category.description}
                href={category.href}
                icon={category.icon}
                status={category.status}
                previewItems={category.previewItems}
              />
            ))}
          </div>
        </BodySection>
      </main>
    </div>
  )
}
