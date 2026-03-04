import type { BackendEnvelope } from './http'
import type { PaginatedResponse } from '../types'

export function normalizePaginatedEnvelope<T>(
  envelope: BackendEnvelope<T[]>,
): PaginatedResponse<T> {
  if (!envelope.meta) {
    console.error('normalizePaginatedEnvelope: meta missing', envelope)

    return {
      items: envelope.data,
      meta: {
        totalItems: envelope.data.length,
        itemCount: envelope.data.length,
        itemsPerPage: envelope.data.length,
        totalPages: envelope.data.length > 0 ? 1 : 0,
        currentPage: 1,
      },
    }
  }

  return {
    items: envelope.data,
    meta: {
      totalItems: envelope.meta.totalItems,
      itemCount: envelope.meta.itemCount,
      itemsPerPage: envelope.meta.limit,
      totalPages: envelope.meta.totalPages,
      currentPage: envelope.meta.page,
    },
  }
}
