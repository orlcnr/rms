import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { SalesReportsClient } from '@/modules/reports/components/SalesReportsClient'
import { getDefaultReportDateRange, reportsService } from '@/modules/reports/service'
import { SalesReportBundle } from '@/modules/reports/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SalesReportsPage() {
  const { restaurantId } = await getRestaurantContext()

  if (!restaurantId) {
    return null
  }

  const initialFilters = getDefaultReportDateRange(30)
  let initialData: SalesReportBundle = {
    dailySales: [],
    productSales: [],
    categorySales: [],
    hourlySales: [],
  }

  try {
    const [dailySales, productSales, categorySales, hourlySales] =
      await Promise.all([
        reportsService.getSalesDaily(initialFilters),
        reportsService.getSalesByProduct(initialFilters),
        reportsService.getSalesByCategory(initialFilters),
        reportsService.getSalesHourly(initialFilters.endDate),
      ])

    initialData = { dailySales, productSales, categorySales, hourlySales }
  } catch (error) {
    console.error('[SalesReportsPage] Failed to load initial reports:', error)
  }

  return (
    <SalesReportsClient
      initialData={initialData}
      initialFilters={initialFilters}
    />
  )
}
