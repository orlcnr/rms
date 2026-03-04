import { adminApiFetch } from '../shared/service';
import { TenantActivityResponse, TenantsOverviewResponse } from './types';

interface ReportsFilters {
  search?: string;
  status?: 'all' | 'active' | 'suspended';
  start_date?: string;
  end_date?: string;
  topN?: number;
}

export async function getReportsData(filters: ReportsFilters = {}) {
  const overviewParams = new URLSearchParams();
  const activityParams = new URLSearchParams();

  if (filters.search) {
    overviewParams.set('search', filters.search);
  }

  if (filters.status === 'active') {
    overviewParams.set('is_active', 'true');
  } else if (filters.status === 'suspended') {
    overviewParams.set('is_active', 'false');
  }

  if (filters.start_date) {
    activityParams.set('start_date', new Date(filters.start_date).toISOString());
  }

  if (filters.end_date) {
    const end = new Date(filters.end_date);
    end.setHours(23, 59, 59, 999);
    activityParams.set('end_date', end.toISOString());
  }

  if (filters.topN) {
    activityParams.set('topN', String(filters.topN));
  }

  const [overview, activity] = await Promise.all([
    adminApiFetch<TenantsOverviewResponse>(
      `/super-admin/reports/tenants-overview${
        overviewParams.toString() ? `?${overviewParams.toString()}` : ''
      }`,
    ),
    adminApiFetch<TenantActivityResponse>(
      `/super-admin/reports/tenant-activity${
        activityParams.toString() ? `?${activityParams.toString()}` : ''
      }`,
    ),
  ]);

  return { overview, activity };
}
