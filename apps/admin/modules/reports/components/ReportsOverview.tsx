'use client';

import type { CSSProperties } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AdminFormField,
  getAdminInputStyle,
} from '@/modules/core/components/AdminFormField';
import { AdminFormSection } from '@/modules/core/components/AdminFormSection';
import { reportsFilterFormSchema } from '../schemas';
import { TenantActivityResponse, TenantsOverviewResponse } from '../types';

interface ReportsOverviewProps {
  overview: TenantsOverviewResponse;
  activity: TenantActivityResponse;
  topN?: number;
  filters?: {
    search?: string;
    is_active?: 'all' | 'active' | 'suspended';
    start_date?: string;
    end_date?: string;
  };
}

export function ReportsOverview({
  overview,
  activity,
  topN,
  filters,
}: ReportsOverviewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{
    search?: string;
    is_active?: 'all' | 'active' | 'suspended';
    start_date?: string;
    end_date?: string;
    topN?: string;
  }>({
    resolver: zodResolver(reportsFilterFormSchema),
    defaultValues: {
      search: filters?.search || '',
      is_active: filters?.is_active || 'all',
      start_date: filters?.start_date || '',
      end_date: filters?.end_date || '',
      topN: String(topN || activity.meta.topN),
    },
  });
  const activePreset = getActivePreset(filters?.start_date, filters?.end_date);
  const filterChips = [
    filters?.search ? `Tenant: ${filters.search}` : null,
    filters?.is_active && filters.is_active !== 'all'
      ? `Status: ${filters.is_active}`
      : null,
    filters?.start_date ? `From: ${filters.start_date}` : null,
    filters?.end_date ? `To: ${filters.end_date}` : null,
    topN ? `Top N: ${topN}` : null,
  ].filter(Boolean) as string[];

  function onSubmit(values: {
    search?: string;
    is_active?: 'all' | 'active' | 'suspended';
    start_date?: string;
    end_date?: string;
    topN?: string;
  }) {
    const params = new URLSearchParams();

    if (values.search) {
      params.set('search', values.search);
    }

    if (values.is_active && values.is_active !== 'all') {
      params.set('is_active', values.is_active);
    }

    if (values.start_date) {
      params.set('start_date', values.start_date);
    }

    if (values.end_date) {
      params.set('end_date', values.end_date);
    }

    if (values.topN) {
      params.set('topN', values.topN);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function onReset() {
    router.push(pathname);
  }

  function applyDatePreset(days: 1 | 7 | 30) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));

    const params = new URLSearchParams();

    if (filters?.search) {
      params.set('search', filters.search);
    }

    if (filters?.is_active && filters.is_active !== 'all') {
      params.set('is_active', filters.is_active);
    }

    params.set('start_date', toDateInputValue(start));
    params.set('end_date', toDateInputValue(end));

    if (topN) {
      params.set('topN', String(topN));
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ margin: 0 }}>Reports</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Live cross-tenant summary and bounded top-tenant aggregation.
        </p>
        {filterChips.length > 0 ? (
          <div style={chipRowStyle}>
            {filterChips.map((chip) => (
              <span key={chip} style={filterChipStyle}>
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => applyDatePreset(1)}
            style={getPresetButtonStyle(activePreset === 1)}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => applyDatePreset(7)}
            style={getPresetButtonStyle(activePreset === 7)}
          >
            Last 7 days
          </button>
          <button
            type="button"
            onClick={() => applyDatePreset(30)}
            style={getPresetButtonStyle(activePreset === 30)}
          >
            Last 30 days
          </button>
        </div>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: 'grid', gap: 12 }}
      >
        <AdminFormSection columns={2}>
          <AdminFormField label="Tenant" error={errors.search?.message}>
            <input
              {...register('search')}
              type="search"
              placeholder="Search tenant"
              style={getAdminInputStyle(Boolean(errors.search))}
            />
          </AdminFormField>
          <AdminFormField label="Status" error={errors.is_active?.message}>
            <select
              {...register('is_active')}
              style={getAdminInputStyle(Boolean(errors.is_active))}
            >
              <option value="all">All tenants</option>
              <option value="active">Active only</option>
              <option value="suspended">Suspended only</option>
            </select>
          </AdminFormField>
          <AdminFormField label="Start date" error={errors.start_date?.message}>
            <input
              {...register('start_date')}
              type="date"
              style={getAdminInputStyle(Boolean(errors.start_date))}
            />
          </AdminFormField>
          <AdminFormField label="End date" error={errors.end_date?.message}>
            <input
              {...register('end_date')}
              type="date"
              style={getAdminInputStyle(Boolean(errors.end_date))}
            />
          </AdminFormField>
          <AdminFormField label="Top N" error={errors.topN?.message}>
            <input
              {...register('topN')}
              type="number"
              min={1}
              max={25}
              style={getAdminInputStyle(Boolean(errors.topN))}
            />
          </AdminFormField>
        </AdminFormSection>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="submit"
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            Update
          </button>
          <button
            type="button"
            onClick={onReset}
            style={secondaryButtonStyle}
          >
            Reset filters
          </button>
        </div>
      </form>
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        }}
      >
        <Metric label="Total Tenants" value={activity.summary.total_tenants} />
        <Metric label="Active" value={activity.summary.active_tenants} />
        <Metric label="Suspended" value={activity.summary.suspended_tenants} />
        <Metric
          label="Audit (24h)"
          value={activity.summary.last_24h_audit_events}
        />
      </div>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1.4fr 1fr' }}>
        <section style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>Tenant Overview</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {overview.items.slice(0, 8).map((tenant) => (
              <div
                key={tenant.restaurant_id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  gap: 12,
                  paddingTop: 10,
                  borderTop: '1px solid var(--line)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{tenant.restaurant_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {tenant.owner_email || '-'}
                  </div>
                </div>
                <div>{tenant.user_count} users</div>
                <div>{tenant.is_active ? 'Active' : 'Suspended'}</div>
              </div>
            ))}
          </div>
        </section>
        <section style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>
            Top Tenants by Active Users (Top {activity.meta.topN})
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {activity.top_tenants_by_active_users.map((tenant) => (
              <div
                key={tenant.restaurant_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 10,
                  borderTop: '1px solid var(--line)',
                }}
              >
                <span>{tenant.restaurant_name}</span>
                <strong>{tenant.active_user_count}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={panelStyle}>
      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const panelStyle: CSSProperties = {
  padding: 20,
  borderRadius: 20,
  border: '1px solid var(--line)',
  background: 'var(--panel)',
};

const secondaryButtonStyle: CSSProperties = {
  padding: '12px 16px',
  borderRadius: 12,
  border: '1px solid var(--line)',
  background: '#fff',
  fontWeight: 600,
};

const presetButtonStyle: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 999,
  border: '1px solid var(--line)',
  background: '#fff',
  fontWeight: 600,
  fontSize: 12,
};

const chipRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 12,
  flexWrap: 'wrap',
};

const filterChipStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 999,
  border: '1px solid var(--line)',
  background: '#fff',
  fontSize: 12,
  color: 'var(--text-muted)',
};

function toDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getActivePreset(startDate?: string, endDate?: string): 1 | 7 | 30 | null {
  if (!startDate || !endDate) {
    return null;
  }

  const today = toDateInputValue(new Date());

  if (endDate !== today) {
    return null;
  }

  const diffDays = Math.round(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) /
      (1000 * 60 * 60 * 24),
  ) + 1;

  if (diffDays === 1 || diffDays === 7 || diffDays === 30) {
    return diffDays as 1 | 7 | 30;
  }

  return null;
}

function getPresetButtonStyle(isActive: boolean): CSSProperties {
  return {
    ...presetButtonStyle,
    ...(isActive
      ? {
          background: 'var(--primary)',
          color: '#fff',
          border: '1px solid var(--primary)',
        }
      : null),
  };
}
