/**
 * Formats a phone number string into the Turkish format: 05xx xxx xx xx
 * @param value Raw input string
 * @returns Formatted string
 */
export function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  
  // Limit to 11 digits (0 + 10 digits)
  const truncated = cleaned.slice(0, 11);
  
  if (truncated.length === 0) return '';
  
  let formatted = '';
  
  // Always ensure it starts with 0 if there's any input
  // and handle case where user might type without 0
  const startsWithZero = truncated.startsWith('0');
  const actualDigits = startsWithZero ? truncated : '0' + truncated;
  const limitedDigits = actualDigits.slice(0, 11);

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
 * Cleans a formatted phone number back to raw digits
 * @param value Formatted phone number
 * @returns Raw digits
 */
export function cleanPhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}
