import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { migrateBrandStorage, localStore, sessionStore } from '../src/utils/brandStorage.js';
import { getOrCreateRequestKey } from '../src/utils/requestKey.js';
import { clearTokens, setTokens, getAccessToken } from '../src/api/client.js';

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

test('legacy session authentication stays in session storage when remember-me is off', () => {
  localStorage.setItem('inventra_remember_me', 'false');
  sessionStorage.setItem('inventra_access_token', 'session-access');
  sessionStorage.setItem('inventra_refresh_token', 'session-refresh');
  sessionStorage.setItem('inventra_user', '{"id":7}');
  assert.equal(migrateBrandStorage(localStorage, sessionStorage), true);
  assert.equal(sessionStore.getItem('ilbi_access_token'), 'session-access');
  assert.equal(localStorage.getItem('ilbi_access_token'), null);
  assert.equal(localStore.getItem('ilbi_remember_me'), 'false');
});

test('existing current authentication is never completed with a different legacy user', () => {
  sessionStorage.setItem('ilbi_access_token', 'new-user-access');
  localStorage.setItem('inventra_access_token', 'old-user-access');
  localStorage.setItem('inventra_refresh_token', 'old-user-refresh');
  sessionStorage.setItem('inventra_user', '{"id":999}');
  migrateBrandStorage(localStorage, sessionStorage);
  assert.equal(sessionStorage.getItem('ilbi_access_token'), 'new-user-access');
  assert.equal(localStorage.getItem('ilbi_access_token'), null);
  assert.equal(localStorage.getItem('inventra_refresh_token'), null);
  assert.equal(sessionStorage.getItem('ilbi_user'), null);
});

test('tenant, user, sale and version suffixes and raw draft data are preserved', () => {
  const values = {
    'pos_cart:2': '[{"id":1,"qty":"2.500"}]',
    'pos_cart:3': '[{"id":9,"qty":"1"}]',
    'active_tenant:7': '3',
    'stock_intake_full_draft_v1:pending': '{"note":"qoralama"}',
    'invoice_signatures_3_42': '{"seller":"Ali"}',
    receipt_paper_width: '"58mm"',
    'receipt_paper_width:3': '"80mm"',
  };
  for (const [suffix, value] of Object.entries(values)) localStorage.setItem(`inventra_${suffix}`, value);
  migrateBrandStorage(localStorage, sessionStorage);
  for (const [suffix, value] of Object.entries(values)) assert.equal(localStore.getItem(`ilbi_${suffix}`), value);
});

test('pending checkout retries retain the exact request key and fingerprint', () => {
  const payload = { tenant: 3, total: '125000.00' };
  const saved = JSON.stringify({ key: 'same-financial-request', fingerprint: JSON.stringify(payload) });
  localStorage.setItem('inventra_checkout:7:3', saved);
  migrateBrandStorage(localStorage, sessionStorage);
  assert.equal(getOrCreateRequestKey('ilbi_checkout:7:3', payload), 'same-financial-request');
  assert.equal(localStorage.getItem('ilbi_checkout:7:3'), saved);
});

test('the existing guest conversation secret is preserved exactly', () => {
  const secret = 'ab'.repeat(32);
  localStorage.setItem('inventra_support_guest', secret);
  migrateBrandStorage(localStorage, sessionStorage);
  assert.equal(localStore.getItem('ilbi_support_guest'), secret);
});

test('current preferences win, repeated migration is harmless and unrelated apps stay untouched', () => {
  localStorage.setItem('inventra_theme', 'dark');
  localStorage.setItem('ilbi_theme', 'light');
  localStorage.setItem('inventra_unrelated_app', 'untouched');
  migrateBrandStorage(localStorage, sessionStorage);
  migrateBrandStorage(localStorage, sessionStorage);
  assert.equal(localStore.getItem('ilbi_theme'), 'light');
  assert.equal(localStorage.getItem('inventra_theme'), 'light');
  assert.equal(localStorage.getItem('ilbi_unrelated_app'), null);
  assert.equal(localStorage.getItem('inventra_unrelated_app'), 'untouched');
});

test('saved passwords are deleted from both storage locations and namespaces', () => {
  for (const storage of [localStorage, sessionStorage]) {
    storage.setItem('inventra_remember_password', 'obsolete');
    storage.setItem('ilbi_remember_password', 'obsolete');
  }
  migrateBrandStorage(localStorage, sessionStorage);
  for (const storage of [localStorage, sessionStorage]) {
    assert.equal(storage.getItem('inventra_remember_password'), null);
    assert.equal(storage.getItem('ilbi_remember_password'), null);
  }
});

test('new writes support old tabs and logout cannot resurrect legacy authentication', () => {
  setTokens('new-access', 'new-refresh', true);
  localStore.setItem('ilbi_user', '{"id":7}');
  assert.equal(localStorage.getItem('inventra_access_token'), 'new-access');
  clearTokens();
  assert.equal(getAccessToken(), null);
  for (const storage of [localStorage, sessionStorage]) {
    for (const name of ['access_token', 'refresh_token', 'user']) {
      assert.equal(storage.getItem(`inventra_${name}`), null);
      assert.equal(storage.getItem(`ilbi_${name}`), null);
    }
  }
  localStorage.setItem('inventra_access_token', 'stale-tab-write');
  assert.equal(getAccessToken(), null);
});

test('quota failures preserve old data, allow retry and do not throw on reads', () => {
  localStorage.setItem('inventra_pos_cart:3', '[broken-json');
  const write = localStorage.setItem.bind(localStorage);
  localStorage.setItem = () => { throw new Error('quota'); };
  assert.equal(migrateBrandStorage(localStorage, sessionStorage), false);
  assert.equal(localStore.getItem('ilbi_pos_cart:3'), '[broken-json');
  localStorage.setItem = write;
  assert.equal(migrateBrandStorage(localStorage, sessionStorage), true);
  assert.equal(localStorage.getItem('ilbi_pos_cart:3'), '[broken-json');
});

test('blocked storage access does not prevent application startup', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
  try {
    assert.equal(localStore.getItem('ilbi_theme'), null);
    assert.doesNotThrow(() => localStore.setItem('ilbi_theme', 'dark'));
    assert.doesNotThrow(() => localStore.removeItem('ilbi_access_token'));
  } finally {
    Object.defineProperty(globalThis, 'localStorage', descriptor);
  }
});
