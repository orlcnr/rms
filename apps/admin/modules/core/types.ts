export interface AdminNavItem {
  label: string;
  href: string;
  disabled?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Restaurants', href: '/restaurants' },
  { label: 'Users', href: '/users' },
  { label: 'Reports', href: '/reports' },
  { label: 'Audit', href: '/reports/audit' },
  { label: 'Subscriptions', href: '/subscriptions', disabled: true },
  { label: 'Feature Flags', href: '/settings', disabled: true },
  { label: 'System Settings', href: '/settings', disabled: true },
  { label: 'Ops', href: '/ops', disabled: true },
];

export interface FeatureShellStateProps {
  title: string;
  summary: string;
  status: 'coming_soon' | 'loading' | 'unavailable';
  etaLabel?: string;
  dependencies: string[];
  ctaLabel?: string;
  ctaHref?: string;
}
