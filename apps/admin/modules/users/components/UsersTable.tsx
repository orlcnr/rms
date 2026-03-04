'use client';

import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useAdminToast } from '@/modules/core/components/AdminToastProvider';
import { ActionModal } from '@/modules/core/components/ActionModal';
import { IconActionButton } from '@/modules/core/components/IconActionButton';
import {
  activateUser,
  createUser,
  deactivateUser,
  resetUserPassword,
  updateUser,
} from '../client';
import { UserEditorForm } from './UserEditorForm';
import {
  AdminUserRole,
  UserFormValues,
  UsersResponse,
  AdminUserRow,
} from '../types';
import { PasswordResetForm } from './PasswordResetForm';

interface UsersTableProps {
  data: UsersResponse;
  search?: string;
  restaurantOptions?: Array<{
    id: string;
    name: string;
  }>;
}

const EMPTY_FORM: UserFormValues = {
  email: '',
  first_name: '',
  last_name: '',
  role: 'manager',
  restaurant_id: '',
  password: '',
};

export function UsersTable({
  data,
  search,
  restaurantOptions = [],
}: UsersTableProps) {
  const router = useRouter();
  const { showToast } = useAdminToast();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [passwordResetId, setPasswordResetId] = useState<string | null>(null);

  function runToggleAction(action: () => Promise<unknown>) {
    setActionError(null);
    startTransition(async () => {
      try {
        await action();
        showToast({
          tone: 'success',
          title: 'User status updated',
        });
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Request failed';
        setActionError(message);
        showToast({
          tone: 'error',
          title: 'User action failed',
          message,
        });
      }
    });
  }

  async function handleCreateSubmit(values: UserFormValues) {
    try {
      await createUser(values);
      setCreateError(null);
      setIsCreateOpen(false);
      showToast({
        tone: 'success',
        title: 'User created',
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setCreateError(message);
      showToast({
        tone: 'error',
        title: 'User create failed',
        message,
      });
      throw error;
    }
  }

  async function handleEditSubmit(id: string, values: UserFormValues) {
    try {
      await updateUser(id, values);
      setEditError(null);
      setEditingId(null);
      showToast({
        tone: 'success',
        title: 'User updated',
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setEditError(message);
      showToast({
        tone: 'error',
        title: 'User update failed',
        message,
      });
      throw error;
    }
  }

  async function handleResetPassword(id: string, password?: string) {
    try {
      await resetUserPassword(id, password);
      setPasswordError(null);
      setPasswordResetId(null);
      showToast({
        tone: 'success',
        title: 'Password reset sent',
        message: password
          ? 'The custom password has been saved.'
          : 'A temporary password will be delivered by email.',
      });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setPasswordError(message);
      showToast({
        tone: 'error',
        title: 'Password reset failed',
        message,
      });
      throw error;
    }
  }

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Users</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Tenant-scoped accounts and super-admin-managed roles.
          </p>
        </div>
        <button
          type="button"
          style={primaryButtonStyle}
          onClick={() => setIsCreateOpen(true)}
        >
          Yeni Kullanıcı
        </button>
      </div>
      <form style={{ display: 'flex', gap: 12 }}>
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search by email or name"
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
              <th style={cellHeadStyle}>User</th>
              <th style={cellHeadStyle}>Role</th>
              <th style={cellHeadStyle}>Tenant</th>
              <th style={cellHeadStyle}>Status</th>
              <th style={cellHeadStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((user) => (
              <tr key={user.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={cellStyle}>
                  <div style={{ fontWeight: 600 }}>
                    {user.first_name} {user.last_name}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {user.email}
                  </div>
                </td>
                <td style={cellStyle}>{user.role}</td>
                <td style={cellStyle}>{user.restaurant?.name || 'Platform'}</td>
                <td style={cellStyle}>{user.is_active ? 'Active' : 'Inactive'}</td>
                <td style={cellStyle}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <IconActionButton
                      label="Pw"
                      title="Reset password"
                      tone="primary"
                      iconName="reset-password"
                      onClick={() => {
                        setPasswordError(null);
                        setPasswordResetId(user.id);
                      }}
                    />
                    <IconActionButton
                      label="Ed"
                      title="Edit user"
                      tone="primary"
                      iconName="edit"
                      onClick={() => {
                        setEditError(null);
                        setEditingId(user.id);
                      }}
                    />
                    <IconActionButton
                      label={user.is_active ? 'Of' : 'On'}
                      title={user.is_active ? 'Deactivate user' : 'Activate user'}
                      tone="warn"
                      iconName={user.is_active ? 'toggle-off' : 'toggle-on'}
                      disabled={isPending}
                      onClick={() =>
                        runToggleAction(() =>
                          user.is_active ? deactivateUser(user.id) : activateUser(user.id),
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
        title="Yeni Kullanıcı"
        open={isCreateOpen}
        onClose={() => {
          setCreateError(null);
          setIsCreateOpen(false);
        }}
      >
        <UserEditorForm
          defaultValues={EMPTY_FORM}
          restaurantOptions={restaurantOptions}
          serverError={createError}
          submitLabel="Kullanıcı Oluştur"
          onSubmit={handleCreateSubmit}
          onCancel={() => {
            setCreateError(null);
            setIsCreateOpen(false);
          }}
        />
      </ActionModal>

      {data.data.map((user) => (
        <ActionModal
          key={user.id}
          title={`Kullanıcı Düzenle: ${user.first_name} ${user.last_name}`}
          open={editingId === user.id}
          onClose={() => {
            setEditError(null);
            setEditingId(null);
          }}
        >
          <UserEditorForm
            defaultValues={toUserFormValues(user)}
            restaurantOptions={restaurantOptions}
            serverError={editError}
            submitLabel="Değişiklikleri Kaydet"
            onSubmit={(values) => handleEditSubmit(user.id, values)}
            onCancel={() => {
              setEditError(null);
              setEditingId(null);
            }}
            isEdit
          />
        </ActionModal>
      ))}

      {data.data.map((user) => (
        <ActionModal
          key={`${user.id}-password`}
          title={`Şifre Güncelle: ${user.first_name} ${user.last_name}`}
          open={passwordResetId === user.id}
          onClose={() => {
            setPasswordError(null);
            setPasswordResetId(null);
          }}
        >
          <PasswordResetForm
            serverError={passwordError}
            onSubmit={(password) => handleResetPassword(user.id, password)}
            onCancel={() => {
              setPasswordError(null);
              setPasswordResetId(null);
            }}
          />
        </ActionModal>
      ))}
    </section>
  );
}

function toUserFormValues(user: AdminUserRow): UserFormValues {
  return {
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: normalizeRole(user.role),
    restaurant_id: user.restaurant?.id || '',
    password: '',
  };
}

function normalizeRole(role: string): AdminUserRole {
  switch (role) {
    case 'super_admin':
    case 'restaurant_owner':
    case 'manager':
    case 'waiter':
    case 'chef':
    case 'customer':
      return role;
    default:
      return 'manager';
  }
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
