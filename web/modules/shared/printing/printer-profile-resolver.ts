'use client'

import { PrinterProfile, PrinterProfilesSettingV1, PrintPurpose } from './types'

const DEVICE_ID_KEY = 'rms_printer_device_id'
const CLEANUP_TOAST_PREFIX = 'rms_printer_cleanup_notified'

const ALLOWED_FORMATS = new Set(['receipt_80mm', 'receipt_58mm', 'a4', 'label_4x6'])

function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function ensurePrinterDeviceId(): string {
  if (typeof window === 'undefined') return 'server'
  const current = window.localStorage.getItem(DEVICE_ID_KEY)
  if (current) return current
  const next = generateDeviceId()
  window.localStorage.setItem(DEVICE_ID_KEY, next)
  return next
}

export function getPrinterAssignmentKey(
  restaurantId: string,
  deviceId: string,
  purpose: PrintPurpose,
): string {
  return `rms_printer_profile:${restaurantId}:${deviceId}:${purpose}`
}

export function getCleanupToastKey(
  restaurantId: string,
  deviceId: string,
  cleanupHash: string,
): string {
  return `${CLEANUP_TOAST_PREFIX}:${restaurantId}:${deviceId}:${cleanupHash}`
}

export function normalizePrinterProfilesSetting(
  value: unknown,
): PrinterProfilesSettingV1 {
  const parsed = (() => {
    if (!value) return null
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as unknown
      } catch {
        return null
      }
    }
    return value
  })()

  if (!parsed || typeof parsed !== 'object') {
    return { version: 1, profiles: [], defaultProfileId: undefined }
  }

  const raw = parsed as Record<string, unknown>
  const rawProfiles = Array.isArray(raw.profiles) ? raw.profiles : []
  const profiles = rawProfiles
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const id = String(row.id || '').trim()
      const name = String(row.name || '').trim()
      const format = String(row.format || '').trim()
      if (!id || !name || !ALLOWED_FORMATS.has(format)) return null
      const updatedAtRaw = String(row.updatedAt || '').trim()
      const updatedAt = Number.isNaN(new Date(updatedAtRaw).getTime())
        ? new Date().toISOString()
        : updatedAtRaw
      return {
        id,
        name,
        format: format as PrinterProfile['format'],
        ...(typeof row.guidance === 'string' && row.guidance.trim().length > 0
          ? { guidance: row.guidance.trim() }
          : {}),
        isActive: row.isActive === undefined ? true : Boolean(row.isActive),
        updatedAt,
      } satisfies PrinterProfile
    })
    .filter((profile): profile is PrinterProfile => profile !== null)

  const defaultProfileId =
    typeof raw.defaultProfileId === 'string' ? raw.defaultProfileId : undefined

  return {
    version: 1,
    profiles,
    defaultProfileId:
      defaultProfileId && profiles.some((profile) => profile.id === defaultProfileId)
        ? defaultProfileId
        : undefined,
  }
}

export function serializePrinterProfilesSetting(
  setting: PrinterProfilesSettingV1,
): string {
  return JSON.stringify(setting)
}

export function resolvePrinterProfile(params: {
  restaurantId: string
  purpose: PrintPurpose
  setting: PrinterProfilesSettingV1
}): {
  deviceId: string
  profile: PrinterProfile | null
  format: PrinterProfile['format']
  cleanedProfileIds: string[]
} {
  if (typeof window === 'undefined') {
    return {
      deviceId: 'server',
      profile: null,
      format: 'receipt_80mm',
      cleanedProfileIds: [],
    }
  }

  const deviceId = ensurePrinterDeviceId()
  const key = getPrinterAssignmentKey(params.restaurantId, deviceId, params.purpose)
  const assignedProfileId = window.localStorage.getItem(key)
  const cleanedProfileIds: string[] = []

  const activeProfiles = params.setting.profiles.filter((profile) => profile.isActive)
  const byId = new Map(params.setting.profiles.map((profile) => [profile.id, profile]))

  const assignedProfile = assignedProfileId ? byId.get(assignedProfileId) : undefined
  if (!assignedProfile || !assignedProfile.isActive) {
    if (assignedProfileId) {
      window.localStorage.removeItem(key)
      cleanedProfileIds.push(assignedProfileId)
    }
    const defaultProfile = params.setting.defaultProfileId
      ? byId.get(params.setting.defaultProfileId) || null
      : null
    const activeDefault =
      defaultProfile && defaultProfile.isActive ? defaultProfile : null
    return {
      deviceId,
      profile: activeDefault,
      format: activeDefault?.format || 'receipt_80mm',
      cleanedProfileIds,
    }
  }

  return {
    deviceId,
    profile: assignedProfile,
    format: assignedProfile.format,
    cleanedProfileIds,
  }
}

export function assignPrinterProfile(params: {
  restaurantId: string
  purpose: PrintPurpose
  profileId: string | null
}): void {
  if (typeof window === 'undefined') return
  const deviceId = ensurePrinterDeviceId()
  const key = getPrinterAssignmentKey(params.restaurantId, deviceId, params.purpose)
  if (!params.profileId) {
    window.localStorage.removeItem(key)
    return
  }
  window.localStorage.setItem(key, params.profileId)
}

export async function buildCleanupHash(cleanedProfileIds: string[]): Promise<string> {
  const source = [...cleanedProfileIds].sort().join(',')
  if (!source) return 'empty000'

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(source)
    const digest = await window.crypto.subtle.digest('SHA-256', bytes)
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    return hex.slice(0, 8)
  }

  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0
  }
  return hash.toString(16).padStart(8, '0').slice(0, 8)
}
