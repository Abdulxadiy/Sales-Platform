import test from 'node:test';
import assert from 'node:assert/strict';
import { documentFilename, receiptShareURL, PUBLIC_RECEIPT_ORIGIN } from '../src/utils/documentShare.js';

const token = 'A'.repeat(43);
test('desktop receipts always share the public cloud URL instead of the register address', () => {
  for (const origin of ['http://127.0.0.1:49244', 'http://192.168.1.10:49244', 'https://example.org']) {
    assert.equal(receiptShareURL(token, { desktop: true, origin }), `${PUBLIC_RECEIPT_ORIGIN}/r/${token}`);
  }
});
test('web receipts keep the production HTTPS origin and reject malformed tokens', () => {
  assert.equal(receiptShareURL(token, { desktop: false, origin: 'https://ilbi.uz' }), `https://ilbi.uz/r/${token}`);
  for (const token of [null, '', 'sale-1043', '../secret', 'A'.repeat(100)]) assert.equal(receiptShareURL(token), null);
  for (const origin of ['http://localhost:5173', 'https://127.0.0.1', 'https://user:pass@example.org']) {
    assert.equal(receiptShareURL(token, { desktop: false, origin }), `${PUBLIC_RECEIPT_ORIGIN}/r/${token}`);
  }
});
test('export filenames preserve readable document names without path separators', () => {
  assert.equal(documentFilename('Hisob-faktura INV-1043'), 'Hisob-faktura INV-1043');
  assert.equal(documentFilename('Chek / 1043: mijoz?'), 'Chek - 1043- mijoz-');
  assert.equal(documentFilename(''), 'ILBI-hujjat');
});
