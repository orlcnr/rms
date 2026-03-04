import { PaginatedMeta } from '../shared/types';

export interface AuditLogsResponse {
  items: Array<{
    id: string;
    action?: string;
    resource?: string;
    user_id?: string;
    restaurant_id?: string;
    timestamp?: string;
    payload?: Record<string, unknown>;
  }>;
  meta: PaginatedMeta;
}
