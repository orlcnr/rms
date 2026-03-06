const MASKED_FIELDS = [
  'password',
  'password_hash',
  'token',
  'refresh_token',
  'secret',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sanitizeAuditObject<T = unknown>(value: T): T {
  if (!isPlainObject(value)) {
    return value;
  }

  const masked = Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [
      key,
      MASKED_FIELDS.includes(key as (typeof MASKED_FIELDS)[number])
        ? '***'
        : fieldValue,
    ]),
  );

  return masked as T;
}

export function sanitizeAuditChanges<
  TBefore = unknown,
  TAfter = unknown,
>(changes: {
  before?: TBefore;
  after?: TAfter;
}): {
  before?: TBefore;
  after?: TAfter;
} {
  return {
    ...(changes.before !== undefined
      ? { before: sanitizeAuditObject(changes.before) }
      : {}),
    ...(changes.after !== undefined
      ? { after: sanitizeAuditObject(changes.after) }
      : {}),
  };
}
