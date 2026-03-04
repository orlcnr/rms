import type { GuestOrder } from '../types'

export type GuestStatusBannerVariant = 'info' | 'warning' | 'danger'

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(Number(value || 0))
}

export function formatGuestOrderTimestamp(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function getGuestOrderStatusMeta(status: GuestOrder['status']) {
  const normalized = status.toUpperCase()

  switch (normalized) {
    case 'PENDING':
      return {
        label: 'Onaylandı',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      }
    case 'PREPARING':
      return {
        label: 'Hazırlanıyor',
        className: 'border-sky-200 bg-sky-50 text-sky-700',
      }
    case 'READY':
      return {
        label: 'Hazır',
        className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
      }
    case 'SERVED':
      return {
        label: 'Servis Edildi',
        className: 'border-violet-200 bg-violet-50 text-violet-700',
      }
    case 'PAID':
      return {
        label: 'Tamamlandı',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      }
    case 'ON_WAY':
      return {
        label: 'Yolda',
        className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
      }
    case 'DELIVERED':
      return {
        label: 'Teslim Edildi',
        className: 'border-teal-200 bg-teal-50 text-teal-700',
      }
    case 'CANCELLED':
      return {
        label: 'İptal Edildi',
        className: 'border-red-200 bg-red-50 text-red-700',
      }
    default:
      break
  }

  switch (normalized) {
    case 'DRAFT':
      return {
        label: 'Taslak',
        className: 'border-slate-200 bg-slate-100 text-slate-600',
      }
    case 'SUBMITTED':
      return {
        label: 'Onay Bekliyor',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      }
    case 'APPROVED':
      return {
        label: 'Onaylandı',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      }
    case 'REJECTED':
      return {
        label: 'Reddedildi',
        className: 'border-red-200 bg-red-50 text-red-700',
      }
    case 'CONVERTED':
      return {
        label: 'İşleme Alındı',
        className: 'border-primary-main/20 bg-primary-subtle text-primary-main',
      }
    default:
      return {
        label: status,
        className: 'border-slate-200 bg-slate-100 text-slate-600',
      }
  }
}
