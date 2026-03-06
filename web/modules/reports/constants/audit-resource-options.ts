export interface AuditResourceOption {
  value: string
  label: string
}

export const AUDIT_RESOURCE_OPTIONS: AuditResourceOption[] = [
  { value: 'ORDERS', label: 'Siparişler' },
  { value: 'PAYMENTS', label: 'Ödemeler' },
  { value: 'MENUS', label: 'Menü' },
  { value: 'INVENTORY', label: 'Envanter' },
  { value: 'CASH', label: 'Kasa' },
  { value: 'USERS', label: 'Kullanıcılar' },
  { value: 'SETTINGS', label: 'Ayarlar' },
  { value: 'CUSTOMERS', label: 'Müşteriler' },
  { value: 'RESERVATIONS', label: 'Rezervasyonlar' },
  { value: 'RESTAURANTS', label: 'Restoranlar' },
]

export const AUDIT_RESOURCE_LABELS = AUDIT_RESOURCE_OPTIONS.reduce<
  Record<string, string>
>((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

