// Match the server's per-line Decimal ROUND_HALF_UP arithmetic using integer cents.
const roundDivide = (value, divisor) => (value + divisor / 2n) / divisor;
const scaled = (value, places) => {
  const text = String(value ?? '0');
  if (!/^\d*(\.\d*)?$/.test(text)) return 0n;
  const [whole = '0', fraction = ''] = text.split('.');
  const digits = fraction.padEnd(places + 1, '0');
  return BigInt((whole || '0') + digits.slice(0, places)) + (Number(digits[places]) >= 5 ? 1n : 0n);
};

export function calculateTaxLine(quantity, unitPrice, settings = {}) {
  const amount = roundDivide(scaled(quantity, 3) * scaled(unitPrice, 2), 1000n);
  const rate = settings.is_vat_payer ? scaled(settings.vat_rate, 2) : 0n;
  const included = settings.price_includes_vat !== false;
  const net = included ? roundDivide(amount * 10000n, 10000n + rate) : amount;
  const tax = included ? amount - net : roundDivide(amount * rate, 10000n);
  return { netAmount: Number(net) / 100, taxAmount: Number(tax) / 100, totalAmount: Number(net + tax) / 100 };
}

export const receiptDefaults = {
  tax_regime: 'unspecified', tax_regime_name: '', is_vat_payer: false, vat_rate: '12.00',
  price_includes_vat: true, turnover_tax_rate: '0.00', profit_tax_enabled: false, profit_tax_rate: '0.00',
  receipt_show_item_tax: true, receipt_show_cashier: true, receipt_show_customer: true, receipt_paper_width: '58mm',
};

export function taxExpectation(settings) {
  return { is_vat_payer: settings.is_vat_payer, vat_rate: settings.vat_rate, price_includes_vat: settings.price_includes_vat };
}
