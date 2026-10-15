import test from 'node:test';
import assert from 'node:assert/strict';
import { barcodeSvg, labelDocument } from '../src/utils/productLabels.js';

const variant = { barcode: '001234', product_name: 'Sut <script>bad()</script>', name: 'Standart', price_recommended: '15000', currency: 'UZS' };
const options = { format: 'a4', width: 50, height: 30, copies: 1, showName: true, showPrice: true };

test('Code128 encodes leading zeros and rejects unsupported characters', () => {
  const svg = barcodeSvg('001234');
  assert.match(svg, /aria-label="001234"/);
  assert.ok((svg.match(/<rect x=/g) || []).length > 30);
  assert.throws(() => barcodeSvg(''), /Shtrix-kod/);
  assert.throws(() => barcodeSvg('☃'), /Shtrix-kod/);
});

test('labels independently omit names and prices and escape user content', () => {
  const full = labelDocument(variant, options);
  assert.ok(!full.includes('<script>'));
  assert.match(full, /&lt;script&gt;/);
  assert.match(full, /class="name"/);
  assert.match(full, /class="price"/);
  const noName = labelDocument(variant, { ...options, showName: false });
  assert.ok(!noName.includes('class="name"'));
  assert.match(noName, /class="price"/);
  const onlyBarcode = labelDocument(variant, { ...options, showName: false, showPrice: false });
  assert.ok(!onlyBarcode.includes('class="name"'));
  assert.ok(!onlyBarcode.includes('class="price"'));
  assert.match(onlyBarcode, /<svg /);
});

test('A4 sheets and sticker printer paginate by actual millimeter dimensions', () => {
  const a4 = labelDocument(variant, { ...options, copies: 28 });
  assert.equal((a4.match(/<section class="sheet">/g) || []).length, 2);
  assert.equal((a4.match(/<article class="label">/g) || []).length, 28);
  const stickers = labelDocument(variant, { ...options, copies: 3, format: 'label' });
  assert.match(stickers, /size: 50mm 30mm; margin: 0/);
  assert.equal((stickers.match(/<section class="sheet">/g) || []).length, 3);
  assert.throws(() => labelDocument(variant, { ...options, copies: 201 }), /Nusxa/);
  assert.throws(() => labelDocument(variant, { ...options, width: 0 }), /O‘lcham/);
  assert.throws(() => labelDocument(variant, { ...options, height: 20 }), /sig‘ishi/);
  assert.throws(() => labelDocument({ ...variant, barcode: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890' }, options), /siqilib/);
});
