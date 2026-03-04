import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { AuditReportsClient } from '@/modules/reports/components/AuditReportsClient'
import {
  createEmptyAuditLogsResponse,
  getDefaultAuditLogFilters,
  reportsService,
} from '@/modules/reports/service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AuditReportPage() {
  const { restaurantId } = await getRestaurantContext()

  if (!restaurantId) {
    return null
  }

  const initialFilters = getDefaultAuditLogFilters()
  let initialData = createEmptyAuditLogsResponse(initialFilters.limit)

  try {
    initialData = await reportsService.getAuditLogs(initialFilters)
  } catch (error) {
    console.error('[AuditReportPage] Failed to load initial audit logs:', error)
  }

  return (
    <AuditReportsClient
      initialData={initialData}
      initialFilters={initialFilters}
    />
  )
}
