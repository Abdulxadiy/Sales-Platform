/**
 * Converts numeric financial amounts into written words in Uzbek (Lotin alifbosida).
 * Standard accounting and invoicing format for Uzbekistan.
 *
 * Examples:
 *   numberToWordsUzbek(1250000, 'UZS') -> "Bir million ikki yuz ellik ming so‘m"
 *   numberToWordsUzbek(450.5, 'USD')   -> "To‘rt yuz ellik AQSH dollari va 50 sent"
 */
export function numberToWordsUzbek(amount, currency = 'UZS') {
  const numeric = Number(amount || 0);
  if (isNaN(numeric) || numeric === 0) {
    return currency === 'USD' ? 'Nol AQSH dollari' : 'Nol so‘m';
  }

  const isNegative = numeric < 0;
  const absAmount = Math.abs(numeric);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  const units = ['', 'bir', 'ikki', 'uch', 'to‘rt', 'besh', 'olti', 'yetti', 'sakkiz', 'to‘qqiz'];
  const tens = ['', 'o‘n', 'yigirma', 'o‘ttiz', 'qirq', 'ellik', 'oltmish', 'yetmish', 'sakson', 'to‘qson'];

  function tripletToWords(n) {
    let str = '';
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    const ten = Math.floor(remainder / 10);
    const unit = remainder % 10;

    if (hundreds > 0) {
      str += (hundreds === 1 ? 'bir yuz' : `${units[hundreds]} yuz`) + ' ';
    }
    if (ten > 0) {
      str += tens[ten] + ' ';
    }
    if (unit > 0) {
      str += units[unit] + ' ';
    }
    return str.trim();
  }

  const scales = [
    { value: 1000000000000, name: 'trillion' },
    { value: 1000000000, name: 'milliard' },
    { value: 1000000, name: 'million' },
    { value: 1000, name: 'ming' },
    { value: 1, name: '' },
  ];

  let remaining = integerPart;
  const words = [];

  for (const scale of scales) {
    if (remaining >= scale.value) {
      const count = Math.floor(remaining / scale.value);
      remaining = remaining % scale.value;
      const countStr = tripletToWords(count);
      if (countStr) {
        words.push(countStr + (scale.name ? ' ' + scale.name : ''));
      }
    }
  }

  let result = words.join(' ').trim();
  if (!result) {
    result = 'nol';
  }

  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1);

  if (isNegative) {
    result = 'Minus ' + result.toLowerCase();
  }

  const curUpper = String(currency || 'UZS').toUpperCase();
  if (curUpper === 'USD') {
    result += ' AQSH dollari';
    if (decimalPart > 0) {
      result += ` va ${decimalPart} sent`;
    }
  } else {
    result += ' so‘m';
    if (decimalPart > 0) {
      result += ` va ${decimalPart} tiyin`;
    }
  }

  return result;
}

export default numberToWordsUzbek;
