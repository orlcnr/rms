'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useAdminToast } from '@/modules/core/components/AdminToastProvider';
import { ActionModal } from '@/modules/core/components/ActionModal';
import { IconActionButton } from '@/modules/core/components/IconActionButton';
import {
  activateRestaurant,
  suspendRestaurant,
  updateRestaurant,
} from '../client';
import { RestaurantEditorForm } from './RestaurantEditorForm';
import { AdminRestaurantRow, RestaurantFormValues } from '../types';

interface RestaurantDetailProps {
  data: AdminRestaurantRow;
}

export function RestaurantDetail({ data }: RestaurantDetailProps) {
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  function runToggleAction() {
    setActionError(null);
    startTransition(async () => {
      try {
        await (data.is_active ? suspendRestaurant(data.id) : activateRestaurant(data.id));
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

  async function handleEditSubmit(values: RestaurantFormValues) {
    try {
      await updateRestaurant(data.id, values);
      setEditError(null);
      setIsEditOpen(false);
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
      <div style={headerStyle}>
        <div>
          <Link href="/restaurants" style={{ color: 'var(--text-muted)' }}>
            Back to restaurants
          </Link>
          <h1 style={{ margin: '8px 0 0' }}>{data.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <IconActionButton
            label="Ed"
            title="Edit restaurant"
            tone="primary"
            iconName="edit"
            onClick={() => {
              setEditError(null);
              setIsEditOpen(true);
            }}
          />
          <IconActionButton
            label={data.is_active ? 'Pa' : 'Ac'}
            title={data.is_active ? 'Suspend restaurant' : 'Activate restaurant'}
            tone="warn"
            iconName={data.is_active ? 'toggle-off' : 'toggle-on'}
            disabled={isPending}
            onClick={runToggleAction}
          />
        </div>
      </div>
      {actionError ? <p style={inlineErrorStyle}>{actionError}</p> : null}
      <div
        style={{
          padding: 20,
          borderRadius: 20,
          border: '1px solid var(--line)',
          background: 'var(--panel)',
          display: 'grid',
          gap: 12,
        }}
      >
        <Row label="Slug" value={data.slug} />
        <Row label="Status" value={data.is_active ? 'Active' : 'Suspended'} />
        <Row
          label="Owner"
          value={
            data.owner?.email
              ? `${data.owner.first_name || ''} ${data.owner.last_name || ''} (${data.owner.email})`.trim()
              : '-'
          }
        />
        <Row label="Address" value={data.address || '-'} />
        <Row label="Description" value={data.description || '-'} />
      </div>
      <ActionModal
        title={`Restoran Düzenle: ${data.name}`}
        open={isEditOpen}
        onClose={() => {
          setEditError(null);
          setIsEditOpen(false);
        }}
      >
        <RestaurantEditorForm
          defaultValues={toRestaurantFormValues(data)}
          serverError={editError}
          submitLabel="Değişiklikleri Kaydet"
          onSubmit={handleEditSubmit}
          onCancel={() => {
            setEditError(null);
            setIsEditOpen(false);
          }}
        />
      </ActionModal>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 600 }}>{value}</div>
    </div>
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

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
};

const inlineErrorStyle: CSSProperties = {
  margin: 0,
  color: '#b91c1c',
};
