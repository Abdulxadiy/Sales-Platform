import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTaxLine } from '../src/utils/receiptTax.js';

test('inclusive and exclusive VAT match charged totals', () => {
  const vat = { is_vat_payer: true, vat_rate: '12.00', price_includes_vat: true };
  assert.deepEqual(calculateTaxLine(1, 112000, vat), { netAmount: 100000, taxAmount: 12000, totalAmount: 112000 });
  assert.deepEqual(calculateTaxLine(2, 100000, { ...vat, price_includes_vat: false }), { netAmount: 200000, taxAmount: 24000, totalAmount: 224000 });
});

test('line rounding uses integer cents for fractional quantities and tax', () => {
  const vat = { is_vat_payer: true, vat_rate: '12', price_includes_vat: false };
  assert.deepEqual(calculateTaxLine('1', '0.05', vat), { netAmount: 0.05, taxAmount: 0.01, totalAmount: 0.06 });
  assert.deepEqual(calculateTaxLine('0.333', '100.01', vat), { netAmount: 33.3, taxAmount: 4, totalAmount: 37.3 });
});

test('seller taxes never become customer surcharges; zero VAT remains distinct', () => {
  assert.deepEqual(calculateTaxLine(1, 100000, { is_vat_payer: false, turnover_tax_rate: 4, profit_tax_enabled: true, profit_tax_rate: 15 }), { netAmount: 100000, taxAmount: 0, totalAmount: 100000 });
  assert.deepEqual(calculateTaxLine(1, 100000, { is_vat_payer: true, vat_rate: 0 }), { netAmount: 100000, taxAmount: 0, totalAmount: 100000 });
});
