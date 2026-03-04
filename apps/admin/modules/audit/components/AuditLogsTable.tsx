'use client';

import type { CSSProperties } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminToast } from '@/modules/core/components/AdminToastProvider';
import {
  AdminFormField,
  getAdminInputStyle,
} from '@/modules/core/components/AdminFormField';
import { AdminFormSection } from '@/modules/core/components/AdminFormSection';
import { auditSearchSchema } from '../schemas';
import { AuditLogsResponse } from '../types';

interface AuditLogsTableProps {
  data: AuditLogsResponse;
  filters?: {
    search?: string;
    action?: string;
    restaurant_id?: string;
    user_name?: string;
    resource?: string;
    page?: string;
    limit?: string;
    start_date?: string;
    end_date?: string;
  };
}

export function AuditLogsTable({ data, filters }: AuditLogsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useAdminToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{
    search?: string;
    action?: string;
    restaurant_id?: string;
    user_name?: string;
    resource?: string;
    page?: string;
    limit?: string;
    start_date?: string;
    end_date?: string;
  }>({
    resolver: zodResolver(auditSearchSchema),
    defaultValues: {
      search: filters?.search || '',
      action: filters?.action || '',
      restaurant_id: filters?.restaurant_id || '',
      user_name: filters?.user_name || '',
      resource: filters?.resource || '',
      page: filters?.page || '',
      limit: filters?.limit || '10',
      start_date: filters?.start_date || '',
      end_date: filters?.end_date || '',
    },
  });
  const activePreset = getActivePreset(filters?.start_date, filters?.end_date);
  const filterChips = [
    filters?.search ? `Search: ${filters.search}` : null,
    filters?.action ? `Action: ${filters.action}` : null,
    filters?.resource ? `Resource: ${filters.resource}` : null,
    filters?.user_name ? `User: ${filters.user_name}` : null,
    filters?.restaurant_id ? `Tenant: ${filters.restaurant_id}` : null,
    filters?.start_date ? `From: ${filters.start_date}` : null,
    filters?.end_date ? `To: ${filters.end_date}` : null,
    filters?.page ? `Page: ${filters.page}` : null,
    filters?.limit ? `Limit: ${filters.limit}` : null,
  ].filter(Boolean) as string[];

  function onSubmit(values: {
    search?: string;
    action?: string;
    restaurant_id?: string;
    user_name?: string;
    resource?: string;
    page?: string;
    limit?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const params = new URLSearchParams();

    if (values.search) {
      params.set('search', values.search);
    }

    if (values.action) {
      params.set('action', values.action);
    }

    if (values.restaurant_id) {
      params.set('restaurant_id', values.restaurant_id);
    }

    if (values.user_name) {
      params.set('user_name', values.user_name);
    }

    if (values.resource) {
      params.set('resource', values.resource);
    }

    if (values.page) {
      params.set('page', values.page);
    }

    if (values.limit) {
      params.set('limit', values.limit);
    }

    if (values.start_date) {
      params.set('start_date', values.start_date);
    }

    if (values.end_date) {
      params.set('end_date', values.end_date);
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

    const params = buildQuery({
      ...filters,
      start_date: toDateInputValue(start),
      end_date: toDateInputValue(end),
      page: '1',
    });

    router.push(params ? `${pathname}?${params}` : pathname);
  }

  function goToPage(nextPage: number) {
    const params = buildQuery({
      ...filters,
      page: String(nextPage),
    });

    router.push(params ? `${pathname}?${params}` : pathname);
  }

  const currentPage = data.meta.currentPage || Number(filters?.page || 1) || 1;
  const totalPages = data.meta.totalPages || 1;
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  async function copyPayload(payload?: Record<string, unknown>) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload || {}, null, 2));
      showToast({
        tone: 'success',
        title: 'Payload copied',
      });
    } catch (error) {
      showToast({
        tone: 'error',
        title: 'Copy failed',
        message: error instanceof Error ? error.message : 'Clipboard unavailable',
      });
    }
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ margin: 0 }}>Audit Logs</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Backend logs this query access as `SUPER_ADMIN_AUDIT_LOGS_ACCESSED`.
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
          <AdminFormField label="Search" error={errors.search?.message}>
            <input
              {...register('search')}
              type="search"
              placeholder="Search payload text"
              style={getAdminInputStyle(Boolean(errors.search))}
            />
          </AdminFormField>
          <AdminFormField label="Action" error={errors.action?.message}>
            <input
              {...register('action')}
              type="search"
              placeholder="e.g. SUPER_ADMIN_LOGIN_THROTTLED"
              style={getAdminInputStyle(Boolean(errors.action))}
            />
          </AdminFormField>
          <AdminFormField label="Tenant ID" error={errors.restaurant_id?.message}>
            <input
              {...register('restaurant_id')}
              type="search"
              placeholder="Tenant UUID"
              style={getAdminInputStyle(Boolean(errors.restaurant_id))}
            />
          </AdminFormField>
          <AdminFormField label="User" error={errors.user_name?.message}>
            <input
              {...register('user_name')}
              type="search"
              placeholder="Actor name"
              style={getAdminInputStyle(Boolean(errors.user_name))}
            />
          </AdminFormField>
          <AdminFormField label="Resource" error={errors.resource?.message}>
            <input
              {...register('resource')}
              type="search"
              placeholder="e.g. super-admin-auth"
              style={getAdminInputStyle(Boolean(errors.resource))}
            />
          </AdminFormField>
          <AdminFormField label="Page" error={errors.page?.message}>
            <input
              {...register('page')}
              type="number"
              min={1}
              style={getAdminInputStyle(Boolean(errors.page))}
            />
          </AdminFormField>
          <AdminFormField label="Page size" error={errors.limit?.message}>
            <select
              {...register('limit')}
              style={getAdminInputStyle(Boolean(errors.limit))}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
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
            Search
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
          borderRadius: 20,
          border: '1px solid var(--line)',
          background: 'var(--panel)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--panel-muted)', textAlign: 'left' }}>
              <th style={{ padding: 16 }}>View</th>
              <th style={{ padding: 16 }}>Action</th>
              <th style={{ padding: 16 }}>Resource</th>
              <th style={{ padding: 16 }}>User</th>
              <th style={{ padding: 16 }}>Tenant</th>
              <th style={{ padding: 16 }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((log) => {
              const isExpanded = expandedId === log.id;

              return (
                <Fragment key={log.id}>
                  <tr style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: 16 }}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((current) => (current === log.id ? null : log.id))
                        }
                        style={toggleRowButtonStyle}
                      >
                        {isExpanded ? 'Hide' : 'View'}
                      </button>
                    </td>
                    <td style={{ padding: 16 }}>{log.action || '-'}</td>
                    <td style={{ padding: 16 }}>{log.resource || '-'}</td>
                    <td style={{ padding: 16 }}>{log.user_id || '-'}</td>
                    <td style={{ padding: 16 }}>{log.restaurant_id || '-'}</td>
                    <td style={{ padding: 16 }}>
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleString('tr-TR')
                        : '-'}
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr style={{ borderTop: '1px solid var(--line)' }}>
                      <td colSpan={6} style={{ padding: 16, background: 'var(--panel-muted)' }}>
                        <div style={payloadHeaderStyle}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Payload</div>
                          <button
                            type="button"
                            onClick={() => copyPayload(log.payload)}
                            style={copyButtonStyle}
                          >
                            Copy JSON
                          </button>
                        </div>
                        <pre style={payloadPreviewStyle}>
                          {JSON.stringify(log.payload || {}, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={paginationRowStyle}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Page {currentPage} / {totalPages} • {data.meta.totalItems || 0} records
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() => goToPage(currentPage - 1)}
            style={secondaryButtonStyle}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => goToPage(currentPage + 1)}
            style={secondaryButtonStyle}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function buildQuery(filters?: AuditLogsTableProps['filters']) {
  const params = new URLSearchParams();

  if (!filters) {
    return '';
  }

  const entries = Object.entries(filters).filter(([, value]) => Boolean(value));

  for (const [key, value] of entries) {
    params.set(key, value as string);
  }

  return params.toString();
}

function toDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

const secondaryButtonStyle = {
  padding: '12px 16px',
  borderRadius: 12,
  border: '1px solid var(--line)',
  background: '#fff',
  fontWeight: 600,
};

const presetButtonStyle = {
  padding: '8px 12px',
  borderRadius: 999,
  border: '1px solid var(--line)',
  background: '#fff',
  fontWeight: 600,
  fontSize: 12,
};

const paginationRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
};

const toggleRowButtonStyle = {
  padding: '6px 10px',
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: '#fff',
  fontWeight: 600,
  fontSize: 12,
};

const payloadPreviewStyle: CSSProperties = {
  margin: '8px 0 0',
  padding: 12,
  borderRadius: 12,
  background: '#fff',
  border: '1px solid var(--line)',
  overflowX: 'auto',
  fontSize: 12,
  lineHeight: 1.5,
};

const payloadHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
};

const copyButtonStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: '#fff',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer',
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
