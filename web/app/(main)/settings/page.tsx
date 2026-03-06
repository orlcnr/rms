import { getRestaurantContext } from '@/modules/auth/server/getServerUser'
import { SettingsClient } from '@/modules/settings/components/SettingsClient'
import { SettingsTab, isSettingsTab } from '@/modules/settings/types'

interface SettingsPageProps {
  searchParams?: {
    tab?: string | string[]
  }
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { restaurantId, branchId, user } = await getRestaurantContext()

  if (!restaurantId) {
    throw new Error('Restaurant not found')
  }

  const rawTab = searchParams?.tab
  const requestedTab = Array.isArray(rawTab) ? rawTab[0] : rawTab || 'general'
  const activeTab: SettingsTab = isSettingsTab(requestedTab) ? requestedTab : 'general'

  return (
    <SettingsClient
      activeTab={activeTab}
      restaurantId={restaurantId}
      branchId={branchId}
      userRole={user.role}
    />
  )
}
