import { http } from '@/modules/shared/api/http'
import {
  SETTING_DEFINITIONS,
  SettingGroup,
  SettingMeta,
  SettingsByGroupResponse,
  SettingsUpdatePayload,
} from '../types'

interface UpdateSettingResponse {
  updated_at?: string
}

function normalizeSettingResponse(
  payload: SettingsByGroupResponse,
): Record<string, SettingMeta> {
  return Object.entries(payload).reduce<Record<string, SettingMeta>>((acc, [key, raw]) => {
    if (raw && typeof raw === 'object' && 'type' in raw && 'value' in raw && 'group' in raw) {
      const typedRaw = raw as SettingMeta & { updatedAt?: string }
      acc[key] = {
        value: typedRaw.value,
        type: typedRaw.type,
        group: typedRaw.group,
        updatedAt:
          typeof typedRaw.updatedAt === 'string' ? typedRaw.updatedAt : undefined,
      }
      return acc
    }

    const definition = SETTING_DEFINITIONS[key as keyof typeof SETTING_DEFINITIONS]
    acc[key] = {
      value: raw as string | number | boolean,
      type: definition?.type || 'string',
      group: definition?.group || 'general',
    }

    return acc
  }, {})
}

export const settingsService = {
  async getSettingsByGroup(
    restaurantId: string,
    group: SettingGroup,
    includeMeta = false,
  ): Promise<Record<string, SettingMeta>> {
    const response = await http.get<SettingsByGroupResponse>(`/settings/${restaurantId}`, {
      params: {
        group,
        ...(includeMeta ? { includeMeta: true } : {}),
      },
    })

    return normalizeSettingResponse(response)
  },

  async updateSetting(
    restaurantId: string,
    payload: SettingsUpdatePayload,
  ): Promise<UpdateSettingResponse> {
    return http.post<UpdateSettingResponse>(`/settings/${restaurantId}`, payload)
  },
}
