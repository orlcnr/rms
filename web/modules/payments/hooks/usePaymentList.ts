'use client'

import { useCallback, useRef, useState } from 'react'
import { paymentService } from '../services/payment.service'
import type { Payment, PaymentListFilters, PaymentsPaginatedResponse } from '../types'

interface UsePaymentListOptions {
  initialData: PaymentsPaginatedResponse
}

export function usePaymentList({ initialData }: UsePaymentListOptions) {
  const [data, setData] = useState<PaymentsPaginatedResponse>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<PaymentListFilters>({
    page: initialData.meta.currentPage,
    limit: initialData.meta.itemsPerPage,
  })
  const requestIdRef = useRef(0)

  const fetchPayments = useCallback(async (nextFilters: PaymentListFilters) => {
    const requestId = ++requestIdRef.current
    setIsLoading(true)
    try {
      const result = await paymentService.getAll(nextFilters)
      if (requestId === requestIdRef.current) {
        setData(result)
        setFilters(nextFilters)
      }
      return result
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const refresh = useCallback(async () => {
    await fetchPayments(filters)
  }, [fetchPayments, filters])

  const markRefundedInList = useCallback((paymentId: string) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((payment) =>
        payment.id === paymentId ? { ...payment, status: 'refunded' as Payment['status'] } : payment,
      ),
    }))
  }, [])

  return {
    data,
    filters,
    isLoading,
    fetchPayments,
    refresh,
    markRefundedInList,
  }
}

