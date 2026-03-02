import { CustomerClient } from '@/modules/customers/components/CustomerClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Müşteri Veritabanı | RMS',
    description: 'Restoran müşteri kayıt ve takip sistemi',
}

export default function CustomersPage() {
    return <CustomerClient />
}
