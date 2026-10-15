/**
 * Uzbekistan Phone Number (+998 XX XXX XX XX) formatting and validation utilities.
 */

/**
 * Extracts 9 national digits (operator + 7 phone digits) from any input.
 * Example: "+998 90 123 45 67" -> "901234567"
 *          "8901234567" -> "901234567"
 *          "+998901234567" -> "901234567"
 */
export function extractNationalDigits(val) {
  if (!val) return '';
  let digits = String(val).replace(/\D/g, '');
  if (digits.startsWith('998')) {
    digits = digits.slice(3);
  } else if (digits.length === 10 && digits.startsWith('8')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 9);
}

/**
 * Returns canonical E.164 phone string without spaces for backend APIs (e.g. "+998901234567").
 */
export function cleanPhoneUz(val) {
  if (!val) return '';
  const national = extractNationalDigits(val);
  return national ? `+998${national}` : '';
}

/**
 * Formats phone number into spaced Uzbekistan format: "+998 XX XXX XX XX".
 * Example: "901234567" -> "+998 90 123 45 67"
 */
export function formatPhoneUz(val) {
  if (!val) return '';
  const national = extractNationalDigits(val);
  if (!national) return '';

  let res = '+998';
  if (national.length > 0) res += ' ' + national.slice(0, 2);
  if (national.length > 2) res += ' ' + national.slice(2, 5);
  if (national.length > 5) res += ' ' + national.slice(5, 7);
  if (national.length > 7) res += ' ' + national.slice(7, 9);
  return res;
}

/**
 * Validates whether a phone number has a full 9-digit national number.
 */
export function isValidPhoneUz(val) {
  return extractNationalDigits(val).length === 9;
}
