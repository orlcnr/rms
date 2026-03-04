export interface DashboardStats {
  restaurants: {
    total: number;
    active: number;
    inactive: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  };
  audit: {
    last_24h_count: number;
  };
  recent_restaurants: Array<{
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
  }>;
}
