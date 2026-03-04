import { adminApiFetch } from '../shared/service';
import { AuditLogsResponse } from './types';

interface AuditFilters {
  search?: string;
  action?: string;
  restaurant_id?: string;
  user_name?: string;
  resource?: string;
  page?: string;
  limit?: string;
  start_date?: string;
  end_date?: string;
}

export function getAuditLogs(filters: AuditFilters = {}) {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set('payload_text', filters.search);
  }

  if (filters.action) {
    params.set('action', filters.action);
  }

  if (filters.restaurant_id) {
    params.set('restaurant_id', filters.restaurant_id);
  }

  if (filters.user_name) {
    params.set('user_name', filters.user_name);
  }

  if (filters.resource) {
    params.set('resource', filters.resource);
  }

  if (filters.page) {
    params.set('page', filters.page);
  }

  if (filters.limit) {
    params.set('limit', filters.limit);
  }

  if (filters.start_date) {
    params.set('start_date', new Date(filters.start_date).toISOString());
  }

  if (filters.end_date) {
    const end = new Date(filters.end_date);
    end.setHours(23, 59, 59, 999);
    params.set('end_date', end.toISOString());
  }

  return adminApiFetch<AuditLogsResponse>(
    `/super-admin/audit/logs${params.toString() ? `?${params.toString()}` : ''}`,
  );
}
