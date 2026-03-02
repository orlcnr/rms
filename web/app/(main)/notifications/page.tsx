import { Metadata } from 'next'
import { NotificationsClient } from '@/modules/notifications/components'

export const metadata: Metadata = {
  title: 'Bildirimler | RMS',
  description: 'Sistem bildirimlerini görüntüleyin ve yönetin',
}

export default function NotificationsPage() {
  return <NotificationsClient />
}

