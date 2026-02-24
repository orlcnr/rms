/**
 * Date utility functions for consistent date formatting
 */

export type DateFormat = 'short' | 'long' | 'time' | 'datetime' | 'relative';

/**
 * Format a date for display
 * @param date - Date string or Date object
 * @param format - Format type
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date | undefined | null,
  format: DateFormat = 'datetime'
): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';

  const options: Intl.DateTimeFormatOptions = {};

  switch (format) {
    case 'short':
      // 21.02.2026
      options.day = '2-digit';
      options.month = '2-digit';
      options.year = 'numeric';
      break;
    case 'long':
      // 21 Şubat 2026 Cuma
      options.day = 'numeric';
      options.month = 'long';
      options.year = 'numeric';
      options.weekday = 'long';
      break;
    case 'time':
      // 14:30
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
    case 'datetime':
      // 21.02.2026 14:30
      options.day = '2-digit';
      options.month = '2-digit';
      options.year = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
    case 'relative':
      return formatRelativeTime(d);
  }

  return d.toLocaleDateString('tr-TR', options);
}

/**
 * Format date with time
 * @param date - Date string or Date object
 */
export function formatDateTime(date: string | Date | undefined | null): string {
  return formatDate(date, 'datetime');
}

/**
 * Format date only (short)
 * @param date - Date string or Date object
 */
export function formatDateShort(date: string | Date | undefined | null): string {
  return formatDate(date, 'short');
}

/**
 * Format time only
 * @param date - Date string or Date object
 */
export function formatTime(date: string | Date | undefined | null): string {
  return formatDate(date, 'time');
}

/**
 * Format relative time (e.g., "5 dakika önce", "2 saat önce")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Az önce';
  } else if (diffMins < 60) {
    return `${diffMins} dakika önce`;
  } else if (diffHours < 24) {
    return `${diffHours} saat önce`;
  } else if (diffDays < 7) {
    return `${diffDays} gün önce`;
  } else {
    return formatDate(date, 'short');
  }
}

/**
 * Check if a date is today
 */
export function isToday(date: string | Date | undefined | null): boolean {
  if (!date) return false;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is yesterday
 */
export function isYesterday(date: string | Date | undefined | null): boolean {
  if (!date) return false;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Get date range for common periods
 */
export function getDateRange(period: 'today' | 'week' | 'month' | 'year'): {
  start: Date;
  end: Date;
} {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

/**
 * Format date for input[type="date"]
 */
export function toInputDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date from input[type="date"]
 */
export function fromInputDateString(dateString: string): Date | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}
