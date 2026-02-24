// ============================================
// NUMERIC FORMATTING UTILITIES
// ============================================
// Centralized numeric formatting functions for consistent
// price and quantity display throughout the application

/**
 * Handles numeric input by removing thousand separators and
 * converting comma to dot for numeric calculation.
 * 
 * @param value - Input string from form field
 * @returns Sanitized numeric string
 * 
 * @example
 * handleNumericInput("1.234,56") // returns "1234.56"
 * handleNumericInput("100")       // returns "100"
 */
export const handleNumericInput = (value: string): string => {
  // Remove thousand separators (dots in Turkish locale) and convert comma to dot
  return value.replace(/\./g, '').replace(',', '.');
};

/**
 * Formats a numeric value for display without thousand separators.
 * Uses comma as decimal separator (Turkish locale).
 * 
 * @param value - String, number, or undefined value to format
 * @returns Formatted string or empty string
 * 
 * @example
 * formatNumericDisplay("1234.5")  // returns "1234,5"
 * formatNumericDisplay(100)        // returns "100"
 * formatNumericDisplay(99.99)     // returns "99,99"
 */
export const formatNumericDisplay = (value: string | number | undefined): string => {
  if (value === undefined || value === null || value === '') return '';

  let num: number;
  if (typeof value === 'string') {
    // Remove any non-numeric characters except comma and dot
    const cleaned = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    num = parseFloat(cleaned);
  } else {
    num = Number(value);
  }

  if (isNaN(num)) return '';

  // Format without thousand separators - just use comma as decimal separator
  if (num === Math.floor(num)) {
    return Math.floor(num).toString();
  }
  return num.toFixed(2).replace('.', ',');
};

/**
 * Formats a number as Turkish currency (TRY).
 * 
 * @param value - Number to format
 * @returns Currency formatted string
 * 
 * @example
 * formatCurrency(99.99)   // returns "99,99 ₺"
 * formatCurrency(1000)    // returns "1.000,00 ₺"
 * formatCurrency(undefined) // returns "0,00 ₺"
 */
export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '0,00 ₺';
  return value.toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  });
};

/**
 * Formats a number for display with thousand separators.
 * 
 * @param value - Number to format
 * @returns Formatted string with thousand separators
 * 
 * @example
 * formatWithThousands(1000)    // returns "1.000"
 * formatWithThousands(1000000) // returns "1.000.000"
 */
export const formatWithThousands = (value: number): string => {
  return value.toLocaleString('tr-TR');
};

/**
 * Parses a localized Turkish number string to a JavaScript number.
 * 
 * @param value - String with Turkish number format
 * @returns Parsed number or NaN
 * 
 * @example
 * parseTurkishNumber("1.234,56") // returns 1234.56
 * parseTurkishNumber("99")       // returns 99
 */
export const parseTurkishNumber = (value: string): number => {
  if (!value) return NaN;
  // Replace thousand separators and comma decimal to dot
  const normalized = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized);
};
