import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { FinanceReportsClient } from '@/modules/reports/components/FinanceReportsClient'
import { getDefaultReportDateRange, reportsService } from '@/modules/reports/service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function FinanceReportsPage() {
  const { restaurantId } = await getRestaurantContext()

  if (!restaurantId) {
    return null
  }

  const initialFilters = getDefaultReportDateRange(30)
  let initialData = {
    dailySales: [],
    paymentStats: [],
    discountStats: {
      total_discount: 0,
      discounted_orders_count: 0,
    },
  }

  try {
    const [dailySales, paymentStats, discountStats] = await Promise.all([
      reportsService.getSalesDaily(initialFilters),
      reportsService.getFinancePayments(initialFilters),
      reportsService.getFinanceDiscounts(initialFilters),
    ])

    initialData = { dailySales, paymentStats, discountStats }
  } catch (error) {
    console.error('[FinanceReportsPage] Failed to load initial reports:', error)
  }

  return (
    <FinanceReportsClient
      initialData={initialData}
      initialFilters={initialFilters}
    />
  )
}
