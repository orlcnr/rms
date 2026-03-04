import { PaginatedMeta } from '../shared/types';

export interface TenantsOverviewResponse {
  items: Array<{
    restaurant_id: string;
    restaurant_name: string;
    is_active: boolean;
    owner_email: string | null;
    user_count: number;
    created_at: string;
    last_activity_at: string;
  }>;
  meta: PaginatedMeta;
}

export interface TenantActivityResponse {
  summary: {
    total_tenants: number;
    active_tenants: number;
    suspended_tenants: number;
    last_24h_audit_events: number;
  };
  trends: Array<{
    date: string;
    count: number;
  }>;
  top_tenants_by_active_users: Array<{
    restaurant_id: string;
    restaurant_name: string;
    active_user_count: number;
  }>;
  meta: {
    topN: number;
  };
}
