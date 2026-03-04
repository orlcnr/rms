export interface ApiEnvelope<T> {
  data: T;
  statusCode: number;
  timestamp: string;
  message?: string;
}

export interface PaginatedMeta {
  totalItems?: number;
  itemCount?: number;
  itemsPerPage?: number;
  totalPages?: number;
  currentPage?: number;
  total?: number;
  page?: number;
  limit?: number;
}

export interface ApiErrorState {
  message: string;
}
