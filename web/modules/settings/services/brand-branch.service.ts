import { productsApi } from '@/modules/products/services/products.service'
import { GetProductsParams } from '@/modules/products/services/products.service'
import { MenuItem, PaginatedResponse } from '@/modules/products/types'
import { restaurantService } from '@/modules/restaurants/services/restaurant.service'
import { CreateRestaurantInput, Restaurant } from '@/modules/restaurants/types'
import { http } from '@/modules/shared/api/http'
import { normalizePaginatedEnvelope } from '@/modules/shared/api/normalize-paginated-envelope'

interface UpsertBranchOverridePayload {
  custom_price?: number
}

export type BranchItemVisibility = 'all' | 'visible' | 'hidden'

export type BranchBulkOperation =
  | 'set_price'
  | 'increase_amount'
  | 'decrease_amount'
  | 'increase_percent'
  | 'decrease_percent'
  | 'hide'
  | 'unhide'
  | 'clear_override'

export interface BranchOverrideInfo {
  is_hidden: boolean
  custom_price: number | null
}

export interface BranchManagedMenuItem extends MenuItem {
  base_price?: number
  effective_price?: number
  override?: BranchOverrideInfo
}

export interface GetBranchItemsParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  visibility?: BranchItemVisibility
  overrideOnly?: boolean
}

export interface BulkOverridePayload {
  itemIds: string[]
  operation: BranchBulkOperation
  value?: number
}

export interface BulkOverrideResult {
  affectedCount: number
  failedIds: string[]
  errorsById?: Record<string, string>
}

export interface BranchCategoryVisibilityItem {
  categoryId: string
  name: string
  isHiddenInBranch: boolean
  productCount?: number
  hiddenProductCount?: number
}

export const brandBranchService = {
  getBranches: async (): Promise<Restaurant[]> => {
    return restaurantService.getBranches()
  },

  createBranch: async (payload: CreateRestaurantInput): Promise<Restaurant> => {
    return restaurantService.create(payload)
  },

  getBranchMenuItems: async (
    branchId: string,
    params: GetProductsParams,
  ): Promise<PaginatedResponse<MenuItem>> => {
    return productsApi.getProducts(branchId, params)
  },

  getBranchItemsForManagement: async (
    branchId: string,
    params: GetBranchItemsParams,
  ): Promise<PaginatedResponse<BranchManagedMenuItem>> => {
    const response = await http.getEnvelope<BranchManagedMenuItem[]>(
      `/menus/branches/${branchId}/items`,
      { params },
    )
    return normalizePaginatedEnvelope(response)
  },

  getBranchCategories: async (
    branchId: string,
    includeStats = false,
  ): Promise<BranchCategoryVisibilityItem[]> => {
    return http.get<BranchCategoryVisibilityItem[]>(
      `/menus/branches/${branchId}/categories`,
      {
        params: { includeStats },
      },
    )
  },

  excludeCategory: async (branchId: string, categoryId: string) => {
    return http.patch<{ affectedProducts: number }>(
      `/menus/branches/${branchId}/categories/${categoryId}/exclude`,
    )
  },

  includeCategory: async (branchId: string, categoryId: string) => {
    return http.patch<{ affectedProducts: number }>(
      `/menus/branches/${branchId}/categories/${categoryId}/include`,
    )
  },

  excludeAllCategories: async (branchId: string, categoryIds?: string[]) => {
    return http.patch<{ affectedCategories: number; affectedProducts: number }>(
      `/menus/branches/${branchId}/categories/exclude-all`,
      { categoryIds },
    )
  },

  includeAllCategories: async (branchId: string, categoryIds?: string[]) => {
    return http.patch<{ affectedCategories: number; affectedProducts: number }>(
      `/menus/branches/${branchId}/categories/include-all`,
      { categoryIds },
    )
  },

  upsertMenuOverride: async (
    branchId: string,
    menuItemId: string,
    payload: UpsertBranchOverridePayload,
  ) => {
    return http.patch(
      `/menus/branches/${branchId}/items/${menuItemId}/override`,
      payload,
    )
  },

  deleteMenuOverride: async (branchId: string, menuItemId: string) => {
    return http.delete(`/menus/branches/${branchId}/items/${menuItemId}/override`)
  },

  bulkMenuOverrides: async (
    branchId: string,
    payload: BulkOverridePayload,
  ): Promise<BulkOverrideResult> => {
    return http.patch<BulkOverrideResult>(
      `/menus/branches/${branchId}/items/overrides/bulk`,
      payload,
    )
  },
}
