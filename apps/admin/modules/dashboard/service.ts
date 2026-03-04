import { adminApiFetch } from '../shared/service';
import { DashboardStats } from './types';

export function getDashboardStats() {
  return adminApiFetch<DashboardStats>('/super-admin/dashboard/stats');
}
