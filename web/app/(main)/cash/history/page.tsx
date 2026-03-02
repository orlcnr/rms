import { Metadata } from 'next'
import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { cashApi } from '@/modules/cash/services'
import { CashHistoryClient } from '@/modules/cash/components/CashHistoryClient'

export const metadata: Metadata = {
  title: 'Kasa Geçmişi | RMS',
  description: 'Geçmiş kasa oturumları ve mutabakat raporları',
}

export default async function CashHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { restaurantId } = await getRestaurantContext()
  const params = await searchParams
  
  const page = Number(params.page) || 1
  const limit = Number(params.limit) || 10
  const startDate = params.startDate as string
  const endDate = params.endDate as string
  const registerId = params.registerId as string

  const initialData = await cashApi.getSessionHistory({
    page,
    limit,
    startDate,
    endDate,
    registerId,
  })

  const registers = await cashApi.getRegisters()

  return (
    <CashHistoryClient 
      initialData={initialData}
      registers={registers}
      filters={{ page, limit, startDate, endDate, registerId }}
    />
  )
}
