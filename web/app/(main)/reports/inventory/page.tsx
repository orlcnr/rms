import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { InventoryReportsClient } from '@/modules/reports/components/InventoryReportsClient'
import { getDefaultReportDateRange, reportsService } from '@/modules/reports/service'
import { InventoryReportBundle } from '@/modules/reports/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function InventoryReportsPage() {
  const { restaurantId } = await getRestaurantContext()

  if (!restaurantId) {
    return null
  }

  const initialFilters = getDefaultReportDateRange(7)
  let initialData: InventoryReportBundle = {
    stockStatus: [],
    stockMovements: [],
    wastage: [],
  }

  try {
    const [stockStatus, stockMovements, wastage] = await Promise.all([
      reportsService.getInventoryStatus(),
      reportsService.getInventoryMovements(initialFilters),
      reportsService.getInventoryWastage(initialFilters),
    ])

    initialData = { stockStatus, stockMovements, wastage }
  } catch (error) {
    console.error('[InventoryReportsPage] Failed to load initial reports:', error)
  }

  return (
    <InventoryReportsClient
      initialData={initialData}
      initialFilters={initialFilters}
    />
  )
}
