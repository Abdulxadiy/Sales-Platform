/**
 * Number & Price formatting utilities for Inventra UI.
 * Formats numbers with spaces between thousands (e.g. 120 000, 1 200 000).
 */

/**
 * Clean a string/number into a pure numeric string (without spaces, keeping at most one decimal dot).
 * Example: "120 000" -> "120000", "1 200 000.50" -> "1200000.50"
 */
export function cleanNumber(val) {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val).trim();
  const parts = str.split(/[.,]/);
  const intPart = parts[0].replace(/\D/g, '');

  if (parts.length > 1) {
    const decPart = parts[1].replace(/\D/g, '');
    return decPart !== '' ? `${intPart}.${decPart}` : `${intPart}.`;
  }
  return intPart;
}

/**
 * Format a number or numeric string with spaces every 3 digits (e.g. "120 000", "1 200 000.50").
 */
export function formatThousands(val) {
  if (val === null || val === undefined || val === '') return '';
  const clean = cleanNumber(val);
  if (!clean && clean !== '0') return '';

  const parts = clean.split('.');
  const intPart = parts[0];
  const formattedInt = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '0';

  if (parts.length > 1) {
    return `${formattedInt}.${parts[1]}`;
  }
  return formattedInt;
}

/**
 * Parse a formatted or unformatted number string safely into a float.
 * Example: "120 000" -> 120000, "1 200 000.50" -> 1200000.5
 */
export function parseCleanFloat(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  const cleaned = cleanNumber(val);
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? fallback : num;
}
