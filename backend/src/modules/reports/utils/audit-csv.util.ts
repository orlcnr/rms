const CSV_COLUMNS = [
  'timestamp',
  'restaurant_id',
  'user_id',
  'user_name',
  'action',
  'resource',
  'ip_address',
  'user_agent',
  'payload_summary',
  'changes_before_summary',
  'changes_after_summary',
] as const;

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value.toString();
  }

  return '';
}

function escapeCsv(value: unknown): string {
  const normalized = stringifyValue(value);

  if (/[,"\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

export function serializeAuditLogsToCsv(
  logs: Array<Record<string, unknown>>,
): string {
  const header = CSV_COLUMNS.join(',');
  const rows = logs.map((log) =>
    [
      log.timestamp,
      log.restaurant_id,
      log.user_id,
      log.user_name,
      log.action,
      log.resource,
      log.ip_address,
      log.user_agent,
      log.payload,
      (log.changes as Record<string, unknown> | undefined)?.before,
      (log.changes as Record<string, unknown> | undefined)?.after,
    ]
      .map(escapeCsv)
      .join(','),
  );

  return [header, ...rows].join('\n');
}
