import { CreateRestaurantInput, Restaurant } from '@/modules/restaurants/types'
import { BranchBulkOperation } from '../../services/brand-branch.service'

export type BrandBranchStep = 'branches' | 'overrides'
export type BranchManagementTab = 'categories' | 'products'

export interface BranchQueryState {
  step: BrandBranchStep
  selectedBranchId: string
  page: number
  limit: number
  search: string
  categoryId: string
  visibility: 'all' | 'visible' | 'hidden'
  overrideOnly: boolean
  managementTab: BranchManagementTab
}

export interface BulkJobState {
  operation: BranchBulkOperation
  value?: number
  failedIds: string[]
  errorsById: Record<string, string>
}

export const DEFAULT_LIMIT = 25

export const DEFAULT_BRANCH_FORM: CreateRestaurantInput = {
  name: '',
  slug: '',
  address: '',
  description: '',
  contact_email: '',
  contact_phone: '',
}

export interface BranchSelectionCard extends Restaurant {}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
