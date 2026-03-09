import { Metadata } from 'next'
import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { cashApi } from '@/modules/cash/services'
import { CashSessionDetailClient } from '@/modules/cash/components/CashSessionDetailClient'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Kasa Oturum Detayı | RMS',
  description: 'Kasa oturum hareketleri ve finansal özet',
}

export default async function CashSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await getRestaurantContext()
  const { id } = await params

  const session = await cashApi.getSessionById(id)

  if (!session) {
    notFound()
  }

  const movements = await cashApi.getMovements(id)
  const summary = await cashApi.getSessionSummary(id)

  return (
    <CashSessionDetailClient 
      session={session}
      movements={movements}
      summary={summary}
    />
  )
}
