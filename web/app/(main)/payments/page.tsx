import { paymentService } from '@/modules/payments/services/payment.service'
import { PaymentListClient } from '@/modules/payments/components/PaymentListClient'

export default async function PaymentsPage() {
  const initialData = await paymentService.getAll({
    page: 1,
    limit: 20,
  })

  return <PaymentListClient initialData={initialData} />
}

