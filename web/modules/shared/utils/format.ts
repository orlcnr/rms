/**
 * Formats a phone number string into the Turkish format: 05xx xxx xx xx
 * @param value Raw input string
 * @returns Formatted string
 */
export function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\\D/g, '');

  // Limit to 11 digits (0 + 10 digits)
  const truncated = cleaned.slice(0, 11);

  if (truncated.length === 0) return '';

  let formatted = '';

  // If the number has 10 digits and doesn't start with '0', prepend '0'.
  // Otherwise, use the cleaned number directly.
  let processedDigits = cleaned;
  if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    processedDigits = '0' + cleaned;
  }
  const limitedDigits = processedDigits.slice(0, 11);

  if (limitedDigits.length > 0) {
    formatted = limitedDigits.slice(0, 4); // 05xx
    if (limitedDigits.length > 4) {
      formatted += ' ' + limitedDigits.slice(4, 7); // 05xx xxx
    }
    if (limitedDigits.length > 7) {
      formatted += ' ' + limitedDigits.slice(7, 9); // 05xx xxx xx
    }
    if (limitedDigits.length > 9) {
      formatted += ' ' + limitedDigits.slice(9, 11); // 05xx xxx xx xx
    }
  }

  return formatted;
}

/**
 * Masks a phone number string: 0*** *** ** **
 * @param value Raw or formatted phone number
 * @returns Masked string
 */
export function maskPhoneNumber(value: string): string {
  const cleaned = value.replace(/\\D/g, '');
  if (cleaned.length === 0) return '';

  // Mask all but the last 4 digits
  const visibleDigits = cleaned.slice(-4);
  const maskedPart = '*'.repeat(Math.max(0, cleaned.length - 4));
  const masked = maskedPart + visibleDigits;

  // Apply the Turkish phone number format to the masked string
  let formatted = '';
  if (masked.length > 0) {
    formatted = masked.slice(0, 4); // First 4 digits (e.g., ****)
    if (masked.length > 4) {
      formatted += ' ' + masked.slice(4, 7); // Next 3 digits (e.g., *** ***)
    }
    if (masked.length > 7) {
      formatted += ' ' + masked.slice(7, 9); // Next 2 digits (e.g., *** *** **)
    }
    if (masked.length > 9) {
      formatted += ' ' + masked.slice(9, 11); // Last 2 digits (e.g., *** *** ** **)
    }
  }
  return formatted;
}
/**
 * Cleans a formatted phone number back to raw digits
 * @param value Formatted phone number
 * @returns Raw digits
 */
export function cleanPhoneNumber(value: string): string {
  return value.replace(/\\D/g, '');
}
