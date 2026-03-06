import { AUDIT_ACTION_LABELS } from './audit-action-labels'

export interface AuditActionOption {
  value: string
  label: string
}

export const AUDIT_ACTION_OPTIONS: AuditActionOption[] = Object.entries(
  AUDIT_ACTION_LABELS,
).map(([value, label]) => ({
  value,
  label,
}))

