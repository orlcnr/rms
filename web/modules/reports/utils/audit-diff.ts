function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toComparable(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export interface AuditDiffRow {
  key: string
  before: unknown
  after: unknown
}

export function getChangedFields(before: unknown, after: unknown): AuditDiffRow[] {
  if (!isPlainObject(before) || !isPlainObject(after)) {
    return []
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const rows: AuditDiffRow[] = []

  keys.forEach((key) => {
    const beforeValue = before[key]
    const afterValue = after[key]

    if (toComparable(beforeValue) !== toComparable(afterValue)) {
      rows.push({
        key,
        before: beforeValue,
        after: afterValue,
      })
    }
  })

  return rows
}

