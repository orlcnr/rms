import type { BackendEnvelope } from './http'
import type { PaginatedResponse } from '../types'
import type { EnvelopePaginationMeta } from '../types'

export function normalizePaginatedEnvelope<T>(
  envelope: BackendEnvelope<T[] | { items: T[]; meta: EnvelopePaginationMeta }>,
): PaginatedResponse<T> {
  const nestedData =
    envelope.data &&
    !Array.isArray(envelope.data) &&
    'items' in envelope.data &&
    'meta' in envelope.data
      ? envelope.data
      : null

  const items = nestedData ? nestedData.items : Array.isArray(envelope.data) ? envelope.data : []
  const meta = nestedData ? nestedData.meta : envelope.meta

  if (!meta) {
    console.error('normalizePaginatedEnvelope: meta missing', envelope)

    return {
      items,
      meta: {
        totalItems: items.length,
        itemCount: items.length,
        itemsPerPage: items.length,
        totalPages: items.length > 0 ? 1 : 0,
        currentPage: 1,
      },
    }
  }

  return {
    items,
    meta: {
      totalItems: meta.totalItems,
      itemCount: meta.itemCount,
      itemsPerPage: meta.limit,
      totalPages: meta.totalPages,
      currentPage: meta.page,
    },
  }
}
