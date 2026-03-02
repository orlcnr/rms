/**
 * Timezone-aware date utilities for the RMS system.
 * Always ensures operations are relative to 'Europe/Istanbul'.
 */

/**
 * Returns the current date and time (standard system date).
 */
export const getNow = (): Date => {
  return new Date();
};

/**
 * Returns the current date in 'YYYY-MM-DD' format based on Europe/Istanbul time.
 */
export const getIstanbulToday = (): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
  }).format(new Date());
};

/**
 * Formats a date to a string in Europe/Istanbul time.
 */
export const toIstanbulTime = (date: Date): string => {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};
