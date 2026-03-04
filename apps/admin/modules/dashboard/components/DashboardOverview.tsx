import Link from 'next/link';
import { DashboardStats } from '../types';

interface DashboardOverviewProps {
  data: DashboardStats;
}

export function DashboardOverview({ data }: DashboardOverviewProps) {
  const cards = [
    {
      label: 'Tenants',
      value: data.restaurants.total,
      detail: `${data.restaurants.active} active / ${data.restaurants.inactive} suspended`,
      href: '/reports',
    },
    {
      label: 'Users',
      value: data.users.total,
      detail: `${data.users.active} active / ${data.users.inactive} inactive`,
      href: '/users',
    },
    {
      label: 'Audit (24h)',
      value: data.audit.last_24h_count,
      detail: 'Cross-tenant audit volume',
      href: '/reports/audit?start_date=' + getRelativeDate(1) + '&end_date=' + getRelativeDate(0),
    },
  ];
  const secondaryCards = [
    {
      label: 'Active Tenants',
      value: data.restaurants.active,
      href: '/reports?is_active=active',
    },
    {
      label: 'Suspended Tenants',
      value: data.restaurants.inactive,
      href: '/reports?is_active=suspended',
    },
    {
      label: 'Active Users',
      value: data.users.active,
      href: '/users',
    },
  ];

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>Dashboard</h1>
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        }}
      >
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: 20,
              borderRadius: 20,
              border: '1px solid var(--line)',
              background: 'var(--panel)',
              display: 'block',
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{card.label}</div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>
              {card.value}
            </div>
            <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>{card.detail}</div>
          </Link>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        }}
      >
        {secondaryCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: 16,
              borderRadius: 18,
              border: '1px solid var(--line)',
              background: 'var(--panel-muted)',
              display: 'block',
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{card.label}</div>
            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 700 }}>
              {card.value}
            </div>
          </Link>
        ))}
      </div>
      <section
        style={{
          padding: 20,
          borderRadius: 20,
          border: '1px solid var(--line)',
          background: 'var(--panel)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Recent Restaurants</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {data.recent_restaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--line)',
                paddingTop: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{restaurant.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {restaurant.slug}
                </div>
                <div style={{ marginTop: 6 }}>
                  <Link href={`/restaurants/${restaurant.id}`} style={{ fontSize: 12 }}>
                    Open detail
                  </Link>
                </div>
              </div>
              <div style={{ color: restaurant.is_active ? '#15803d' : '#b45309' }}>
                {restaurant.is_active ? 'Active' : 'Suspended'}
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function getRelativeDate(daysAgo: number) {
  const value = new Date();
  value.setDate(value.getDate() - daysAgo);
  return value.toISOString().slice(0, 10);
}
