'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { settingsService } from '../services/settings.service'
import {
  SettingGroup,
  SettingKey,
  SettingMeta,
  SettingValue,
  SETTING_DEFINITIONS,
  SettingsMetaMap,
} from '../types'

const TTL_MS = 5 * 60 * 1000

interface SettingsStore {
  restaurantId: string | null
  settings: Partial<Record<SettingKey, SettingValue>>
  meta: SettingsMetaMap
  lastFetched: number | null
  isLoading: boolean
  error: string | null
  loadSettings: (restaurantId: string, force?: boolean) => Promise<void>
  updateSetting: (restaurantId: string, key: SettingKey, value: SettingValue) => Promise<void>
  getSetting: <T extends SettingValue>(key: SettingKey, fallback: T) => T
  reset: () => void
}

function mergeMetaSettings(
  currentSettings: Partial<Record<SettingKey, SettingValue>>,
  currentMeta: SettingsMetaMap,
  incoming: Record<string, SettingMeta>,
) {
  const nextSettings = { ...currentSettings }
  const nextMeta = { ...currentMeta }

  for (const [rawKey, rawMeta] of Object.entries(incoming)) {
    const key = rawKey as SettingKey
    nextSettings[key] = rawMeta.value
    nextMeta[key] = rawMeta
  }

  return { nextSettings, nextMeta }
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      settings: {},
      meta: {},
      lastFetched: null,
      isLoading: false,
      error: null,

      loadSettings: async (restaurantId, force = false) => {
        const {
          restaurantId: currentRestaurantId,
          lastFetched,
          settings,
          meta,
        } = get()
        const restaurantChanged =
          currentRestaurantId !== null && currentRestaurantId !== restaurantId
        const isFresh = lastFetched !== null && Date.now() - lastFetched < TTL_MS

        if (restaurantChanged) {
          set({
            restaurantId,
            settings: {},
            meta: {},
            lastFetched: null,
          })
        }

        if (!force && isFresh && !restaurantChanged) {
          return
        }

        set({ isLoading: true, error: null })

        try {
          const groups: SettingGroup[] = ['general', 'payment', 'cash']
          const responses = await Promise.all(
            groups.map((group) =>
              settingsService.getSettingsByGroup(restaurantId, group, true),
            ),
          )

          const merged = responses.reduce(
            (acc, response) => mergeMetaSettings(acc.nextSettings, acc.nextMeta, response),
            { nextSettings: settings, nextMeta: meta },
          )

          set({
            restaurantId,
            settings: merged.nextSettings,
            meta: merged.nextMeta,
            lastFetched: Date.now(),
            isLoading: false,
          })
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Ayarlar yüklenemedi',
          })
        }
      },

      updateSetting: async (restaurantId, key, value) => {
        const previousValue = get().settings[key]
        const hadPreviousValue = Object.prototype.hasOwnProperty.call(get().settings, key)

        const definition = SETTING_DEFINITIONS[key]
        const fallbackMeta: SettingMeta = {
          value,
          type: definition.type,
          group: definition.group,
        }

        set((state) => ({
          restaurantId,
          settings: {
            ...state.settings,
            [key]: value,
          },
          meta: {
            ...state.meta,
            [key]: {
              ...(state.meta[key] || fallbackMeta),
              value,
            },
          },
          error: null,
        }))

        try {
          const activeMeta = get().meta[key] || fallbackMeta
          const updated = await settingsService.updateSetting(restaurantId, {
            key,
            value,
            type: activeMeta.type,
            group: activeMeta.group,
            lastKnownUpdatedAt: activeMeta.updatedAt,
          })
          set((state) => ({
            lastFetched: Date.now(),
            meta: {
              ...state.meta,
              [key]: {
                ...(state.meta[key] || fallbackMeta),
                value,
                updatedAt:
                  typeof updated?.updated_at === 'string'
                    ? updated.updated_at
                    : state.meta[key]?.updatedAt,
              },
            },
          }))
        } catch (error) {
          set((state) => {
            const nextSettings = { ...state.settings }
            const nextMeta = { ...state.meta }

            if (hadPreviousValue) {
              nextSettings[key] = previousValue as SettingValue
              if (nextMeta[key]) {
                nextMeta[key] = {
                  ...nextMeta[key]!,
                  value: previousValue as SettingValue,
                }
              }
            } else {
              delete nextSettings[key]
              delete nextMeta[key]
            }

            return {
              settings: nextSettings,
              meta: nextMeta,
              error: error instanceof Error ? error.message : 'Ayar güncellenemedi',
            }
          })

          throw error
        }
      },

      getSetting: (key, fallback) => {
        const value = get().settings[key]
        if (value === undefined || value === null) {
          return fallback
        }

        return value as typeof fallback
      },

      reset: () => {
        set({
          restaurantId: null,
          settings: {},
          meta: {},
          lastFetched: null,
          isLoading: false,
          error: null,
        })
      },
    }),
    {
      name: 'rms-settings-store',
      partialize: (state) => ({
        restaurantId: state.restaurantId,
        settings: state.settings,
        meta: state.meta,
        lastFetched: state.lastFetched,
      }),
    },
  ),
)
