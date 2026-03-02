import { BaseEntity, PaginatedResponse } from '@/modules/shared/types'
import { Restaurant, UpdateRestaurantInput } from '@/modules/restaurants/types'

export type SettingsTab = 'general' | 'users' | 'payment' | 'cash'

export type SettingType = 'number' | 'boolean' | 'string'
export type SettingGroup = 'payment' | 'cash' | 'general'
export type SettingValue = string | number | boolean | string[]

export enum SettingKey {
  ENABLED_PAYMENT_METHODS = 'enabled_payment_methods',
  TIP_COMMISSION_ENABLED = 'tip_commission_enabled',
  TIP_COMMISSION_RATE = 'tip_commission_rate',
  TIP_COMMISSION_EDITABLE = 'tip_commission_editable',
  DEFAULT_OPENING_BALANCE = 'default_opening_balance',
  SHIFT_DURATION_HOURS = 'shift_duration_hours',
  REQUIRE_CLOSING_COUNT = 'require_closing_count',
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  RESTAURANT_OWNER = 'restaurant_owner',
  MANAGER = 'manager',
  WAITER = 'waiter',
  CHEF = 'chef',
  CUSTOMER = 'customer',
}

export interface SettingMeta {
  value: SettingValue
  type: SettingType
  group: SettingGroup
}

export type SettingsMetaMap = Partial<Record<SettingKey, SettingMeta>>

export interface SettingDefinition {
  key: SettingKey
  label: string
  description: string
  type: SettingType
  group: SettingGroup
  min?: number
  step?: number
}

export const SETTING_DEFINITIONS: Record<SettingKey, SettingDefinition> = {
  [SettingKey.ENABLED_PAYMENT_METHODS]: {
    key: SettingKey.ENABLED_PAYMENT_METHODS,
    label: 'Aktif Ödeme Yöntemleri',
    description: 'POS ekranında görünecek ödeme yöntemleri.',
    type: 'string',
    group: 'payment',
  },
  [SettingKey.TIP_COMMISSION_ENABLED]: {
    key: SettingKey.TIP_COMMISSION_ENABLED,
    label: 'Bahşiş Komisyonu Aktif',
    description: 'Bahşiş komisyonu hesaplamasını aktif eder.',
    type: 'boolean',
    group: 'payment',
  },
  [SettingKey.TIP_COMMISSION_RATE]: {
    key: SettingKey.TIP_COMMISSION_RATE,
    label: 'Bahşiş Komisyon Oranı',
    description: 'Ödemelerde uygulanacak bahşiş komisyon oranı.',
    type: 'number',
    group: 'payment',
    min: 0,
    step: 0.01,
  },
  [SettingKey.TIP_COMMISSION_EDITABLE]: {
    key: SettingKey.TIP_COMMISSION_EDITABLE,
    label: 'Bahşiş Komisyonu Düzenlenebilir',
    description: 'Ödeme sırasında komisyon oranı değiştirilebilir.',
    type: 'boolean',
    group: 'payment',
  },
  [SettingKey.DEFAULT_OPENING_BALANCE]: {
    key: SettingKey.DEFAULT_OPENING_BALANCE,
    label: 'Varsayılan Açılış Bakiyesi',
    description: 'Kasa açılışlarında önerilecek başlangıç tutarı.',
    type: 'number',
    group: 'cash',
    min: 0,
    step: 1,
  },
  [SettingKey.SHIFT_DURATION_HOURS]: {
    key: SettingKey.SHIFT_DURATION_HOURS,
    label: 'Vardiya Süresi (Saat)',
    description: 'Standart vardiya süresi.',
    type: 'number',
    group: 'cash',
    min: 1,
    step: 1,
  },
  [SettingKey.REQUIRE_CLOSING_COUNT]: {
    key: SettingKey.REQUIRE_CLOSING_COUNT,
    label: 'Kapanış Sayımı Zorunlu',
    description: 'Kasa kapanışında fiziksel sayım zorunlu olsun.',
    type: 'boolean',
    group: 'cash',
  },
}

export interface SettingsByGroupResponse {
  [key: string]: SettingValue | SettingMeta
}

export interface SettingsUpdatePayload {
  key: SettingKey
  value: SettingValue
  type: SettingType
  group: SettingGroup
}

export interface User extends BaseEntity {
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: UserRole
  is_active: boolean
  restaurant_id?: string
}

export interface UsersResponse extends PaginatedResponse<User> {}

export interface CreateUserInput {
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: UserRole
  password: string
}

export interface UpdateUserInput {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  role?: UserRole
  password?: string
}

export interface ToggleUserStatusInput {
  is_active: boolean
}

export type RestaurantFormInput = UpdateRestaurantInput
export type RestaurantDetails = Restaurant

export const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'general', label: 'GENEL' },
  { id: 'users', label: 'KULLANICILAR' },
  { id: 'payment', label: 'ÖDEME' },
  { id: 'cash', label: 'KASA' },
]

export function isSettingsTab(value: string): value is SettingsTab {
  return SETTINGS_TABS.some((tab) => tab.id === value)
}
