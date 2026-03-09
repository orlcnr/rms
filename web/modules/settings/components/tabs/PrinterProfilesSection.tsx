'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/modules/shared/components/Button'
import { FormInput } from '@/modules/shared/components/FormInput'
import { RmsSwitch } from '@/modules/shared/components/RmsSwitch'
import {
  assignPrinterProfile,
  buildCleanupHash,
  ensurePrinterDeviceId,
  getCleanupToastKey,
  getPrinterAssignmentKey,
  resolvePrinterProfile,
} from '@/modules/shared/printing/printer-profile-resolver'
import { PrintFormat, PrintPurpose, PrinterProfilesSettingV1 } from '@/modules/shared/printing/types'
import { PRINTER_PURPOSES } from '../../types'

const PRINT_FORMAT_OPTIONS: Array<{ value: PrintFormat; label: string }> = [
  { value: 'receipt_80mm', label: 'Termal 80mm' },
  { value: 'receipt_58mm', label: 'Termal 58mm' },
  { value: 'a4', label: 'A4' },
  { value: 'label_4x6', label: 'Etiket 4x6' },
]

interface PrinterProfilesSectionProps {
  restaurantId: string
  value: PrinterProfilesSettingV1
  onChange: (next: PrinterProfilesSettingV1) => void
}

export function PrinterProfilesSection({
  restaurantId,
  value,
  onChange,
}: PrinterProfilesSectionProps) {
  const [draftName, setDraftName] = useState('')
  const [draftFormat, setDraftFormat] = useState<PrintFormat>('receipt_80mm')
  const [draftGuidance, setDraftGuidance] = useState('')
  const [assignmentVersion, setAssignmentVersion] = useState(0)
  const deviceId = useMemo(() => ensurePrinterDeviceId(), [])
  const activeProfiles = value.profiles.filter((profile) => profile.isActive)

  const assignmentByPurpose = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        adisyon: '',
        mutfak: '',
        rapor: '',
      } as Record<PrintPurpose, string>
    }

    const read = (purpose: PrintPurpose) =>
      window.localStorage.getItem(
        getPrinterAssignmentKey(restaurantId, deviceId, purpose),
      ) || ''

    return {
      adisyon: read('adisyon'),
      mutfak: read('mutfak'),
      rapor: read('rapor'),
    } as Record<PrintPurpose, string>
  }, [restaurantId, deviceId, value.profiles, assignmentVersion])

  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true
    const runCleanup = async () => {
      const cleaned = new Set<string>()

      for (const purpose of PRINTER_PURPOSES) {
        const result = resolvePrinterProfile({
          restaurantId,
          purpose: purpose.value,
          setting: value,
        })
        result.cleanedProfileIds.forEach((id) => cleaned.add(id))
      }

      if (!cleaned.size || !mounted) return

      const cleanedIds = Array.from(cleaned)
      const cleanupHash = await buildCleanupHash(cleanedIds)
      if (!mounted) return

      const toastKey = getCleanupToastKey(restaurantId, deviceId, cleanupHash)
      if (!window.localStorage.getItem(toastKey)) {
        toast.info(
          'Bazı yazıcı atamaları geçersiz olduğu için sistem varsayılanına alındı.',
        )
        window.localStorage.setItem(toastKey, '1')
      }
      setAssignmentVersion((v) => v + 1)
    }

    void runCleanup()

    return () => {
      mounted = false
    }
  }, [restaurantId, value, deviceId])

  const hasDuplicateProfileName = (
    candidateName: string,
    excludeProfileId?: string,
  ): boolean => {
    const normalizedCandidate = candidateName.trim().toLocaleLowerCase('tr-TR')
    if (!normalizedCandidate) return false
    return value.profiles.some((profile) => {
      if (excludeProfileId && profile.id === excludeProfileId) return false
      return profile.name.trim().toLocaleLowerCase('tr-TR') === normalizedCandidate
    })
  }

  const addProfile = () => {
    const name = draftName.trim()
    if (!name) return

    if (hasDuplicateProfileName(name)) {
      toast.error('Yazıcı profil adı benzersiz olmalıdır.')
      return
    }

    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `printer-${Date.now()}`
    const next = {
      ...value,
      profiles: [
        ...value.profiles,
        {
          id,
          name,
          format: draftFormat,
          guidance: draftGuidance.trim() || undefined,
          isActive: true,
          updatedAt: new Date().toISOString(),
        },
      ],
    } satisfies PrinterProfilesSettingV1
    onChange(next)
    setDraftName('')
    setDraftGuidance('')
  }

  const updateProfile = (
    id: string,
    patch: Partial<PrinterProfilesSettingV1['profiles'][number]>,
  ) => {
    if (typeof patch.name === 'string' && hasDuplicateProfileName(patch.name, id)) {
      toast.error('Yazıcı profil adı benzersiz olmalıdır.')
      return
    }

    onChange({
      ...value,
      profiles: value.profiles.map((profile) =>
        profile.id === id
          ? { ...profile, ...patch, updatedAt: new Date().toISOString() }
          : profile,
      ),
    })
  }

  const removeProfile = (id: string) => {
    const nextProfiles = value.profiles.filter((profile) => profile.id !== id)
    const nextDefault =
      value.defaultProfileId && nextProfiles.some((profile) => profile.id === value.defaultProfileId)
        ? value.defaultProfileId
        : undefined
    onChange({
      ...value,
      profiles: nextProfiles,
      defaultProfileId: nextDefault,
    })
  }

  return (
    <div className="mt-4 rounded-sm border border-border-light bg-bg-surface p-4 space-y-4">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-text-primary">
          Yazıcı Profilleri
        </p>
        <p className="text-sm text-text-secondary mt-1">
          Cihaz bazlı yazdırma profilleri tanımlayın. Fiziksel yazıcı seçimi yazdırma penceresinde yapılır.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormInput
          id="printer_profile_name"
          name="printer_profile_name"
          label="Profil Adı"
          value={draftName}
          onChange={setDraftName}
        />
        <FormInput
          id="printer_profile_format"
          name="printer_profile_format"
          label="Format"
          isSelect
          value={draftFormat}
          onChange={(v) => setDraftFormat(v as PrintFormat)}
          options={PRINT_FORMAT_OPTIONS}
        />
        <FormInput
          id="printer_profile_guidance"
          name="printer_profile_guidance"
          label="Yönlendirme (Opsiyonel)"
          value={draftGuidance}
          onChange={setDraftGuidance}
        />
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={addProfile}>
          PROFİL EKLE
        </Button>
      </div>

      {value.profiles.length > 0 && (
        <div className="space-y-2">
          {value.profiles.map((profile) => (
            <div
              key={profile.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center rounded-sm border border-border-light bg-bg-app p-3"
            >
              <div className="md:col-span-3">
                <FormInput
                  id={`name_${profile.id}`}
                  name={`name_${profile.id}`}
                  label="Ad"
                  value={profile.name}
                  onChange={(v) => updateProfile(profile.id, { name: v })}
                />
              </div>
              <div className="md:col-span-2">
                <FormInput
                  id={`format_${profile.id}`}
                  name={`format_${profile.id}`}
                  label="Format"
                  isSelect
                  value={profile.format}
                  onChange={(v) => updateProfile(profile.id, { format: v as PrintFormat })}
                  options={PRINT_FORMAT_OPTIONS}
                />
              </div>
              <div className="md:col-span-4">
                <FormInput
                  id={`guidance_${profile.id}`}
                  name={`guidance_${profile.id}`}
                  label="Guidance"
                  value={profile.guidance || ''}
                  onChange={(v) =>
                    updateProfile(profile.id, {
                      guidance: v.trim() ? v : undefined,
                    })
                  }
                />
              </div>
              <div className="md:col-span-1">
                <RmsSwitch
                  checked={profile.isActive}
                  onChange={(checked) => updateProfile(profile.id, { isActive: checked })}
                  label="Aktif"
                  labelOn="AÇIK"
                  labelOff="PASİF"
                />
              </div>
              <div className="md:col-span-2 flex items-end justify-end gap-2">
                <Button
                  type="button"
                  variant={value.defaultProfileId === profile.id ? 'primary' : 'outline'}
                  onClick={() =>
                    onChange({
                      ...value,
                      defaultProfileId: profile.id,
                    })
                  }
                >
                  VARSAYILAN
                </Button>
                <Button type="button" variant="ghost" onClick={() => removeProfile(profile.id)}>
                  SİL
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-sm border border-border-light bg-bg-app p-3">
        <p className="text-xs font-black uppercase tracking-widest text-text-primary mb-2">
          Bu Cihaz Atamaları
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRINTER_PURPOSES.map((purpose) => (
            <FormInput
              key={purpose.value}
              id={`assignment_${purpose.value}`}
              name={`assignment_${purpose.value}`}
              label={purpose.label}
              isSelect
              value={assignmentByPurpose[purpose.value]}
              onChange={(profileId) =>
                {
                  assignPrinterProfile({
                    restaurantId,
                    purpose: purpose.value,
                    profileId: profileId || null,
                  })
                  setAssignmentVersion((v) => v + 1)
                }
              }
              options={[
                { value: '', label: 'Sistem Varsayılanı' },
                ...activeProfiles.map((profile) => ({
                  value: profile.id,
                  label: profile.name.toUpperCase(),
                })),
              ]}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
