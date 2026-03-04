import { getISOWeek, getISOWeekYear } from 'date-fns';

export const AUDIT_INDEX_PREFIX = 'audit-logs';
export const AUDIT_READ_ALIAS = 'audit-logs-read';
export const AUDIT_INDEX_PATTERN = `${AUDIT_INDEX_PREFIX}-*`;

export function getWeeklyAuditIndexName(date: Date = new Date()): string {
  const isoWeekYear = getISOWeekYear(date);
  const week = String(getISOWeek(date)).padStart(2, '0');

  return `${AUDIT_INDEX_PREFIX}-${isoWeekYear}-w${week}`;
}
