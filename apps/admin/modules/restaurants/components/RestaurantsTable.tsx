'use client';

import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useAdminToast } from '@/modules/core/components/AdminToastProvider';
import { ActionModal } from '@/modules/core/components/ActionModal';
import { IconActionButton } from '@/modules/core/components/IconActionButton';
import {
  activateRestaurant,
  createRestaurant,
  suspendRestaurant,
  updateRestaurant,
} from '../client';
import { RestaurantEditorForm } from './RestaurantEditorForm';
import {
  AdminRestaurantRow,
  RestaurantFormValues,
  RestaurantsResponse,
} from '../types';

interface RestaurantsTableProps {
  data: RestaurantsResponse;
  search?: string;
}

const EMPTY_FORM: RestaurantFormValues = {
  name: '',
  slug: '',
  description: '',
  address: '',
  contact_email: '',
  contact_phone: '',
  owner_email: '',
  owner_first_name: '',
  owner_last_name: '',
  google_comment_url: '',
};

export function RestaurantsTable({ data, search }: RestaurantsTableProps) {
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function runToggleAction(action: () => Promise<unknown>) {
    setActionError(null);
    startTransition(async () => {
      try {
        await action();
        showToast({
          tone: 'success',
          title: 'Restaurant status updated',
        });
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Request failed';
        setActionError(message);
        showToast({
          tone: 'error',
          title: 'Restaurant action failed',
          message,
        });
      }
    });
  }

  async function handleCreateSubmit(values: RestaurantFormValues) {
    try {
      await createRestaurant(values);
      setCreateError(null);
      setIsCreateOpen(false);
      showToast({
        tone: 'success',
        title: 'Restaurant created',
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setCreateError(message);
      showToast({
        tone: 'error',
        title: 'Restaurant create failed',
        message,
      });
      throw error;
    }
  }

  async function handleEditSubmit(id: string, values: RestaurantFormValues) {
    try {
      await updateRestaurant(id, values);
      setEditError(null);
      setEditingId(null);
      showToast({
        tone: 'success',
        title: 'Restaurant updated',
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setEditError(message);
      showToast({
        tone: 'error',
        title: 'Restaurant update failed',
        message,
      });
      throw error;
    }
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Restaurants</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Tenant lifecycle data from the live super-admin API.
          </p>
        </div>
        <button
          type="button"
          style={primaryButtonStyle}
          onClick={() => setIsCreateOpen(true)}
        >
          Yeni Restoran
        </button>
      </div>
      <form style={{ display: 'flex', gap: 12 }}>
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search by name or slug"
          style={inputStyle}
        />
        <button type="submit" style={secondaryButtonStyle}>
          Search
        </button>
      </form>
      {actionError ? <p style={inlineErrorStyle}>{actionError}</p> : null}
      <div style={{ ...panelStyle, overflow: 'hidden', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--panel-muted)', textAlign: 'left' }}>
              <th style={cellHeadStyle}>Name</th>
              <th style={cellHeadStyle}>Owner</th>
              <th style={cellHeadStyle}>Contact</th>
              <th style={cellHeadStyle}>Status</th>
              <th style={cellHeadStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((restaurant) => (
              <tr key={restaurant.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={cellStyle}>
                  <div style={{ fontWeight: 600 }}>{restaurant.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {restaurant.slug}
                  </div>
                </td>
                <td style={cellStyle}>{restaurant.owner?.email || '-'}</td>
                <td style={cellStyle}>{restaurant.contact_email || '-'}</td>
                <td style={cellStyle}>
                  {restaurant.is_active ? 'Active' : 'Suspended'}
                </td>
                <td style={cellStyle}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <IconActionButton
                      label="Go"
                      title="Open detail"
                      href={`/restaurants/${restaurant.id}`}
                      iconName="open"
                    />
                    <IconActionButton
                      label="Ed"
                      title="Edit restaurant"
                      tone="primary"
                      iconName="edit"
                      onClick={() => {
                        setEditError(null);
                        setEditingId(restaurant.id);
                      }}
                    />
                    <IconActionButton
                      label={restaurant.is_active ? 'Pa' : 'Ac'}
                      title={
                        restaurant.is_active
                          ? 'Suspend restaurant'
                          : 'Activate restaurant'
                      }
                      tone="warn"
                      iconName={restaurant.is_active ? 'toggle-off' : 'toggle-on'}
                      disabled={isPending}
                      onClick={() =>
                        runToggleAction(() =>
                          restaurant.is_active
                            ? suspendRestaurant(restaurant.id)
                            : activateRestaurant(restaurant.id),
                        )
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ActionModal
        title="Yeni Restoran"
        open={isCreateOpen}
        onClose={() => {
          setCreateError(null);
          setIsCreateOpen(false);
        }}
      >
        <RestaurantEditorForm
          defaultValues={EMPTY_FORM}
          serverError={createError}
          submitLabel="Restoran Oluştur"
          onSubmit={handleCreateSubmit}
          onCancel={() => {
            setCreateError(null);
            setIsCreateOpen(false);
          }}
        />
      </ActionModal>

      {data.data.map((restaurant) => (
        <ActionModal
          key={restaurant.id}
          title={`Restoran Düzenle: ${restaurant.name}`}
          open={editingId === restaurant.id}
          onClose={() => {
            setEditError(null);
            setEditingId(null);
          }}
        >
          <RestaurantEditorForm
            defaultValues={toRestaurantFormValues(restaurant)}
            serverError={editError}
            submitLabel="Değişiklikleri Kaydet"
            onSubmit={(values) => handleEditSubmit(restaurant.id, values)}
            onCancel={() => {
              setEditError(null);
              setEditingId(null);
            }}
          />
        </ActionModal>
      ))}
    </section>
  );
}

function toRestaurantFormValues(
  restaurant: AdminRestaurantRow,
): RestaurantFormValues {
  return {
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description || '',
    address: restaurant.address || '',
    contact_email: restaurant.contact_email || '',
    contact_phone: restaurant.contact_phone || '',
    owner_email: restaurant.owner?.email || '',
    owner_first_name: restaurant.owner?.first_name || '',
    owner_last_name: restaurant.owner?.last_name || '',
    google_comment_url: restaurant.google_comment_url || '',
  };
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
};

const panelStyle: CSSProperties = {
  padding: 20,
  borderRadius: 20,
  border: '1px solid var(--line)',
  background: 'var(--panel)',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid var(--line)',
  background: 'var(--panel)',
};

const primaryButtonStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: 'none',
  background: 'var(--primary)',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryButtonStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid var(--line)',
  background: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const cellHeadStyle: CSSProperties = {
  padding: '14px 18px',
  fontSize: 12,
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

const cellStyle: CSSProperties = {
  padding: '16px 18px',
  verticalAlign: 'top',
};

const inlineErrorStyle: CSSProperties = {
  margin: 0,
  color: '#b91c1c',
};
