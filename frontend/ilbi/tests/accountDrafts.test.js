import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { captureLegacyDraftOwner, readAccountDraft, writeAccountDraft } from '../src/utils/accountDrafts.js';
import { clearTokens } from '../src/api/client.js';

class Storage {
  data = new Map();
  get length() { return this.data.size; }
  key(index) { return [...this.data.keys()][index] ?? null; }
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
beforeEach(() => {
  globalThis.localStorage = new Storage();
  globalThis.sessionStorage = new Storage();
});

test('drafts survive logout and only return for the same account and shop', () => {
  const draft = [{ product: 'PRIVATE_DRAFT', quantity: 2 }];
  assert.equal(writeAccountDraft('pos_cart', 1, 7, draft), true);
  clearTokens();
  assert.deepEqual(readAccountDraft('pos_cart', 1, 7, []), draft);
  assert.deepEqual(readAccountDraft('pos_cart', 2, 7, []), []);
  assert.deepEqual(readAccountDraft('pos_cart', 1, 8, []), []);
  assert.deepEqual(readAccountDraft('pos_cart', null, 7, []), []);
  assert.equal(writeAccountDraft('pos_cart', null, 7, draft), false);
});

test('identified legacy drafts migrate to the prior account without deleting the recovery copy', () => {
  const saved = JSON.stringify({ name: 'Old product draft' });
  localStorage.setItem('inventra_draft_product:7', saved);
  captureLegacyDraftOwner(1, { id: 1, tenants: [{ id: 7 }] });
  clearTokens();
  captureLegacyDraftOwner(2, { id: 2, tenants: [{ id: 7 }] });
  assert.equal(readAccountDraft('draft_product', 2, 7, null), null);
  assert.deepEqual(readAccountDraft('draft_product', 1, 7, null), JSON.parse(saved));
  assert.equal(localStorage.getItem('inventra_draft_product:7'), saved);
  writeAccountDraft('draft_product', 1, 7, {});
  assert.deepEqual(readAccountDraft('draft_product', 1, 7, null), {}, 'A completed draft must not resurrect the old recovery copy');
});

test('unattributed legacy drafts are retained but never claimed by the next login', () => {
  localStorage.setItem('ilbi_pos_cart:7', '[{"private":true}]');
  captureLegacyDraftOwner(null, null);
  captureLegacyDraftOwner(2, { id: 2, tenants: [{ id: 7 }] });
  assert.deepEqual(readAccountDraft('pos_cart', 2, 7, []), []);
  assert.equal(localStorage.getItem('ilbi_pos_cart:7'), '[{"private":true}]');
});

test('invalid/missing tenant context cannot restore a legacy draft', () => {
  localStorage.setItem('ilbi_pos_cart:7', '[1]');
  captureLegacyDraftOwner(1, { id: 99, tenants: [{ id: 7 }] });
  assert.deepEqual(readAccountDraft('pos_cart', 1, 7, []), []);
  assert.deepEqual(readAccountDraft('pos_cart', 1, null, []), []);
});

test('quota failure is observable and does not destroy the previous saved value', () => {
  writeAccountDraft('pos_cart', 1, 7, ['previous']);
  localStorage.setItem = () => { throw new Error('quota'); };
  assert.equal(writeAccountDraft('pos_cart', 1, 7, ['new']), false);
  assert.deepEqual(readAccountDraft('pos_cart', 1, 7, []), ['previous']);
});
