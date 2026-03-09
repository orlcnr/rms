'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Button } from '@/modules/shared/components/Button'
import { BodySection, FilterSection, SubHeaderSection } from '@/modules/shared/components/layout'
import { cn } from '@/modules/shared/utils/cn'
import { useSettingsStore } from '../stores/settings.store'
import { useRestaurantStore } from '../stores/restaurant.store'
import { useUsersStore } from '../stores/users.store'
import {
  RestaurantFormInput,
  PrinterProfilesSettingV1,
  SettingKey,
  SettingValue,
  SETTINGS_TABS,
  SettingsTab,
  UserRole,
} from '../types'
import { SettingsSkeleton } from './SettingsSkeleton'
import { GeneralTab } from './tabs/GeneralTab'
import { UsersTab } from './tabs/UsersTab'
import { PaymentTab } from './tabs/PaymentTab'
import { CashTab } from './tabs/CashTab'
import { BrandBranchTab } from './tabs/BrandBranchTab'
import { AuditTab } from './tabs/AuditTab'
import { PaymentMethod } from '@/modules/orders/types'
import {
  normalizePrinterProfilesSetting,
  serializePrinterProfilesSetting,
} from '@/modules/shared/printing/printer-profile-resolver'

interface SettingsClientProps {
  activeTab: SettingsTab
  restaurantId: string
  branchId?: string
  userRole: string
}

export function SettingsClient({
  activeTab,
  restaurantId,
  branchId,
  userRole,
}: SettingsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [mounted, setMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingSettings, setPendingSettings] = useState<Partial<Record<SettingKey, SettingValue>>>({})

  const settingsIsLoading = useSettingsStore((state) => state.isLoading)
  const settingsLastFetched = useSettingsStore((state) => state.lastFetched)
  const loadSettings = useSettingsStore((state) => state.loadSettings)
  const updateSetting = useSettingsStore((state) => state.updateSetting)
  const getSetting = useSettingsStore((state) => state.getSetting)

  const restaurant = useRestaurantStore((state) => state.restaurant)
  const restaurantIsLoading = useRestaurantStore((state) => state.isLoading)
  const loadRestaurant = useRestaurantStore((state) => state.loadRestaurant)
  const updateRestaurant = useRestaurantStore((state) => state.updateRestaurant)

  const usersIsLoading = useUsersStore((state) => state.isLoading)
  const loadUsers = useUsersStore((state) => state.loadUsers)

  const castedRole = (userRole || UserRole.MANAGER) as UserRole
  const canAccessBrandBranchTab = [
    UserRole.SUPER_ADMIN,
    UserRole.BRAND_OWNER,
    UserRole.BRANCH_MANAGER,
    UserRole.RESTAURANT_OWNER,
  ].includes(castedRole)
  const effectiveActiveTab: SettingsTab =
    activeTab === 'brand-branch' && !canAccessBrandBranchTab
      ? 'general'
      : activeTab
  const visibleTabs = canAccessBrandBranchTab
    ? SETTINGS_TABS
    : SETTINGS_TABS.filter((tab) => tab.id !== 'brand-branch')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !restaurantId) return

    loadSettings(restaurantId)
    loadRestaurant(restaurantId)
  }, [mounted, restaurantId, loadRestaurant, loadSettings])

  useEffect(() => {
    if (!mounted || effectiveActiveTab !== 'users') return
    loadUsers()
  }, [mounted, effectiveActiveTab, loadUsers])

  useEffect(() => {
    if (!mounted) return

    setPendingSettings({
      [SettingKey.ENABLED_PAYMENT_METHODS]: (() => {
        const loadedValue = getSetting(
          SettingKey.ENABLED_PAYMENT_METHODS,
          '',
        )
        if (Array.isArray(loadedValue)) {
          return JSON.stringify(loadedValue)
        }
        return typeof loadedValue === 'string'
          ? loadedValue
          : JSON.stringify(Object.values(PaymentMethod))
      })(),
      [SettingKey.TIP_COMMISSION_ENABLED]: getSetting(
        SettingKey.TIP_COMMISSION_ENABLED,
        true,
      ),
      [SettingKey.RESERVATION_SLOT_MINUTES]: getSetting(
        SettingKey.RESERVATION_SLOT_MINUTES,
        120,
      ),
      [SettingKey.TIP_COMMISSION_RATE]: getSetting(
        SettingKey.TIP_COMMISSION_RATE,
        0.02,
      ),
      [SettingKey.TIP_COMMISSION_EDITABLE]: getSetting(
        SettingKey.TIP_COMMISSION_EDITABLE,
        true,
      ),
      [SettingKey.DEFAULT_OPENING_BALANCE]: getSetting(
        SettingKey.DEFAULT_OPENING_BALANCE,
        0,
      ),
      [SettingKey.SHIFT_DURATION_HOURS]: getSetting(SettingKey.SHIFT_DURATION_HOURS, 8),
      [SettingKey.REQUIRE_CLOSING_COUNT]: getSetting(
        SettingKey.REQUIRE_CLOSING_COUNT,
        false,
      ),
      [SettingKey.FOOD_COST_ALERT_THRESHOLD_PERCENT]: getSetting(
        SettingKey.FOOD_COST_ALERT_THRESHOLD_PERCENT,
        35,
      ),
      [SettingKey.PRINTER_PROFILES]: normalizePrinterProfilesSetting(
        getSetting(SettingKey.PRINTER_PROFILES, ''),
      ),
    })
  }, [mounted, getSetting, settingsLastFetched])

  const isConnected = true
  const isSyncing = settingsIsLoading || restaurantIsLoading || usersIsLoading

  function parseEnabledPaymentMethods(value: SettingValue | undefined): PaymentMethod[] {
    const defaults = Object.values(PaymentMethod)
    if (Array.isArray(value)) {
      const validMethods = new Set(Object.values(PaymentMethod))
      const methods = value.filter(
        (item): item is PaymentMethod =>
          typeof item === 'string' && validMethods.has(item as PaymentMethod),
      )
      return methods.length > 0 ? methods : defaults
    }

    if (typeof value !== 'string') {
      return defaults
    }

    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) {
        return defaults
      }

      const validMethods = new Set(Object.values(PaymentMethod))
      const methods = parsed.filter(
        (item): item is PaymentMethod =>
          typeof item === 'string' && validMethods.has(item as PaymentMethod),
      )
      return methods.length > 0 ? methods : defaults
    } catch {
      return defaults
    }
  }

  const summaryText = `SON SENKRON: ${new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}`

  async function handleRefresh() {
    try {
      await Promise.all([
        loadSettings(restaurantId, true),
        loadRestaurant(restaurantId),
        effectiveActiveTab === 'users' ? loadUsers() : Promise.resolve(),
      ])
      toast.success('Ayarlar güncellendi')
    } catch {
      toast.error('Yenileme sırasında bir hata oluştu')
    }
  }

  function handleTabChange(nextTab: SettingsTab) {
    const params = new URLSearchParams(searchParams.toString())
    const safeTab =
      nextTab === 'brand-branch' && !canAccessBrandBranchTab
        ? 'general'
        : nextTab
    params.set('tab', safeTab)
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSettingChange(key: SettingKey, value: SettingValue) {
    setPendingSettings((state) => ({ ...state, [key]: value }))
  }

  async function saveSettingKeys(keys: SettingKey[]) {
    setIsSaving(true)

    try {
      await Promise.all(
        keys.map((key) => {
          const nextValue = pendingSettings[key]
          if (nextValue === undefined) return Promise.resolve()
          return updateSetting(restaurantId, key, nextValue as SettingValue)
        }),
      )
      await loadSettings(restaurantId, true)
      toast.success('Ayarlar kaydedildi')
    } catch {
      toast.error('Ayarlar kaydedilemedi')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveGeneral(values: RestaurantFormInput) {
    if (!restaurantId) return

    try {
      const printerProfilesValue = pendingSettings[SettingKey.PRINTER_PROFILES]
      const normalizedPrinterProfiles = normalizePrinterProfilesSetting(
        printerProfilesValue,
      )

      await Promise.all([
        updateRestaurant(restaurantId, values),
        updateSetting(
          restaurantId,
          SettingKey.RESERVATION_SLOT_MINUTES,
          Number(pendingSettings[SettingKey.RESERVATION_SLOT_MINUTES] ?? 120),
        ),
        updateSetting(
          restaurantId,
          SettingKey.PRINTER_PROFILES,
          serializePrinterProfilesSetting(normalizedPrinterProfiles),
        ),
      ])
      await loadSettings(restaurantId, true)
      toast.success('Firma bilgileri güncellendi')
    } catch (error) {
      const message = (() => {
        if (isAxiosError(error)) {
          const rawMessage = error.response?.data?.message
          if (Array.isArray(rawMessage)) return rawMessage.join(', ')
          if (typeof rawMessage === 'string') return rawMessage
        }
        if (error instanceof Error) return error.message
        if (typeof error === 'string') return error
        return ''
      })()

      if (message.includes('SETTINGS_CONFLICT')) {
        const confirmed = window.confirm(
          'Yazıcı ayarları başka bir oturumda değişti. Yenilerseniz yaptığınız lokal değişiklikler kaybolacak. Devam etmek istiyor musunuz?',
        )
        if (confirmed) {
          await loadSettings(restaurantId, true)
        }
        return
      }

      toast.error('Firma bilgileri güncellenemedi')
    }
  }

  if (!mounted) {
    return <SettingsSkeleton />
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-app">
      <SubHeaderSection
        title="AYARLAR"
        description="Sistem, firma, kullanıcı, ödeme ve kasa ayarları"
        isConnected={isConnected}
        isSyncing={isSyncing}
        onRefresh={handleRefresh}
        moduleColor="bg-primary-main"
        actions={
          <Button variant="outline" onClick={handleRefresh} isLoading={isSyncing}>
            YENİLE
          </Button>
        }
      />

      <main className="flex flex-col flex-1 pb-6 min-h-0">
        <FilterSection className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  'px-4 py-2 text-[10px] font-black uppercase tracking-wider border rounded-sm transition-all',
                  effectiveActiveTab === tab.id
                    ? 'bg-primary-main text-text-inverse border-primary-main'
                    : 'bg-bg-app text-text-secondary border-border-light hover:border-primary-main/40',
                )}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success-main animate-pulse" />
              BAĞLANTI AKTİF
            </span>
            <span>{summaryText}</span>
          </div>
        </FilterSection>

        <BodySection>
          {effectiveActiveTab === 'general' && (
            <GeneralTab
              restaurant={restaurant}
              isLoading={restaurantIsLoading}
              reservationSlotMinutes={Number(
                pendingSettings[SettingKey.RESERVATION_SLOT_MINUTES] ?? 120,
              )}
              printerProfiles={normalizePrinterProfilesSetting(
                pendingSettings[SettingKey.PRINTER_PROFILES] as
                  | PrinterProfilesSettingV1
                  | string
                  | undefined,
              )}
              onReservationSlotMinutesChange={(value) =>
                handleSettingChange(SettingKey.RESERVATION_SLOT_MINUTES, value)
              }
              onPrinterProfilesChange={(value: PrinterProfilesSettingV1) =>
                handleSettingChange(SettingKey.PRINTER_PROFILES, value)
              }
              onSave={handleSaveGeneral}
              restaurantId={restaurantId}
            />
          )}

          {effectiveActiveTab === 'users' && (
            <UsersTab currentUserRole={castedRole} currentBranchId={branchId} />
          )}

          {effectiveActiveTab === 'payment' && (
            <PaymentTab
              values={{
                enabledPaymentMethods: parseEnabledPaymentMethods(
                  pendingSettings[SettingKey.ENABLED_PAYMENT_METHODS],
                ),
                tipCommissionEnabled: Boolean(
                  pendingSettings[SettingKey.TIP_COMMISSION_ENABLED] ?? true,
                ),
                tipCommissionRate: Number(
                  pendingSettings[SettingKey.TIP_COMMISSION_RATE] ?? 0.02,
                ),
                tipCommissionEditable: Boolean(
                  pendingSettings[SettingKey.TIP_COMMISSION_EDITABLE] ?? true,
                ),
              }}
              isSaving={isSaving}
              onChange={handleSettingChange}
              onPaymentMethodsChange={(methods) =>
                handleSettingChange(
                  SettingKey.ENABLED_PAYMENT_METHODS,
                  JSON.stringify(methods),
                )
              }
              onSave={() =>
                saveSettingKeys([
                  SettingKey.ENABLED_PAYMENT_METHODS,
                  SettingKey.TIP_COMMISSION_ENABLED,
                  SettingKey.TIP_COMMISSION_RATE,
                  SettingKey.TIP_COMMISSION_EDITABLE,
                ])
              }
            />
          )}

          {effectiveActiveTab === 'cash' && (
            <CashTab
              values={{
                defaultOpeningBalance: Number(
                  pendingSettings[SettingKey.DEFAULT_OPENING_BALANCE] ?? 0,
                ),
                shiftDurationHours: Number(pendingSettings[SettingKey.SHIFT_DURATION_HOURS] ?? 8),
                requireClosingCount: Boolean(
                  pendingSettings[SettingKey.REQUIRE_CLOSING_COUNT] ?? false,
                ),
                foodCostAlertThresholdPercent: Number(
                  pendingSettings[SettingKey.FOOD_COST_ALERT_THRESHOLD_PERCENT] ?? 35,
                ),
              }}
              isSaving={isSaving}
              onChange={handleSettingChange}
              onSave={() =>
                saveSettingKeys([
                  SettingKey.DEFAULT_OPENING_BALANCE,
                  SettingKey.SHIFT_DURATION_HOURS,
                  SettingKey.REQUIRE_CLOSING_COUNT,
                  SettingKey.FOOD_COST_ALERT_THRESHOLD_PERCENT,
                ])
              }
            />
          )}

          {effectiveActiveTab === 'audit' && <AuditTab />}

          {effectiveActiveTab === 'brand-branch' && (
            <BrandBranchTab
              currentRestaurantId={branchId || restaurantId}
              userRole={castedRole}
            />
          )}
        </BodySection>
      </main>
    </div>
  )
}
