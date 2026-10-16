import test from 'node:test';
import assert from 'node:assert/strict';
import { barcodeSvg, labelDocument } from '../src/utils/productLabels.js';

const variant = { barcode: '001234', product_name: 'Sut <script>bad()</script>', name: 'Standart', price_recommended: '15000', currency: 'UZS' };
const options = { format: 'a4', width: 50, height: 30, copies: 1, showName: true };

test('Code128 encodes leading zeros and rejects unsupported characters', () => {
  const svg = barcodeSvg('001234');
  assert.match(svg, /aria-label="001234"/);
  assert.ok((svg.match(/<rect x=/g) || []).length > 30);
  assert.throws(() => barcodeSvg(''), /Shtrix-kod/);
  assert.throws(() => barcodeSvg('☃'), /Shtrix-kod/);
});

test('name and price can be toggled, barcode text is mandatory, and typography is bold', () => {
  const full = labelDocument(variant, { ...options, showPrice: true });
  assert.ok(!full.includes('<script>'));
  assert.match(full, /&lt;script&gt;/);
  assert.match(full, /class="name"/);
  assert.match(full, /class="price"/);
  assert.match(full, /15\s?000/);
  assert.match(full, /font-weight:\s*700/);
  assert.match(full, /font-weight:\s*800/);

  const noPrice = labelDocument(variant, { ...options, showPrice: false });
  assert.ok(!noPrice.includes('class="price"'));
  assert.ok(!noPrice.includes('15000'));

  const noName = labelDocument(variant, { ...options, showName: false, showPrice: false });
  assert.ok(!noName.includes('class="name"'));
  assert.match(noName, /<div class="code">001234<\/div>/);
  assert.match(full, /shape-rendering="crispEdges"/);

  const legacy = labelDocument({ ...variant, barcode: 'INV-5-20002' }, options);
  assert.match(legacy, /<div class="code">INV-5-20002<\/div>/);

  const ean = labelDocument({ ...variant, barcode: '4780065642112' }, options);
  assert.match(ean, /viewBox="0 0 \d+ 54"/);
  assert.match(ean, /780065/);
  assert.match(ean, /642112/);
});

test('preview scales a single label and print keeps actual millimeter dimensions', () => {
  const preview = labelDocument(variant, options, { preview: true });
  assert.match(preview, /<body class="preview">/);
  assert.match(preview, /--unit: min\(calc\(100vw \/ 50\), calc\(100vh \/ 30\)\)/);
  const print = labelDocument(variant, options);
  assert.match(print, /<body>/);
  assert.match(print, /--unit: 1mm/);
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
