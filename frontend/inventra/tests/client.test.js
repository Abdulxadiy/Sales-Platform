import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { refreshAccessToken, request, getAccessToken, getRefreshToken, setTokens, inventoryApi } from '../src/api/client.js';
import { getOrCreateRequestKey } from '../src/utils/requestKey.js';

class Storage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
const token = (user = 1, expires = Date.now() / 1000 + 3600) => `test.${Buffer.from(JSON.stringify({ user_id: user, exp: expires })).toString('base64url')}.test`;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  globalThis.localStorage = new Storage();
  globalThis.sessionStorage = new Storage();
  globalThis.window = new EventTarget();
  globalThis.CustomEvent = class extends Event { constructor(name, options) { super(name); this.detail = options?.detail; } };
  globalThis.crypto ??= webcrypto;
});

test('Excel requests return binary data and keep structured server errors', async () => {
  setTokens(token(), token());
  globalThis.fetch = async () => new Response(new Uint8Array([80, 75, 3, 4]), {
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  });
  const blob = await request('/inventory/stock/export/', { responseType: 'blob' });
  assert.ok(blob instanceof Blob);
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [80, 75, 3, 4]);
  globalThis.fetch = async () => json({ detail: 'Export denied' }, 403);
  await assert.rejects(request('/inventory/stock/export/', { responseType: 'blob' }), /Export denied/);
});

test('inventory filtering and export can load the entire stock list', async () => {
  setTokens(token(), token());
  const rows = Array.from({ length: 28 }, (_, index) => ({ id: index + 1 }));
  globalThis.fetch = async url => {
    assert.equal(url, '/api/v1/inventory/stock/');
    return json(rows);
  };
  assert.equal((await inventoryApi.getStock({})).length, 28);
});

test('expired access refreshes without losing the valid refresh token', async () => {
  const refresh = token();
  setTokens(token(1, 1), refresh);
  const access = token(1, Date.now() / 1000 + 7200);
  globalThis.fetch = async () => json({ access });
  assert.equal(await refreshAccessToken(), access);
  assert.equal(getAccessToken(), access);
  assert.equal(getRefreshToken(), refresh);
});

test('parallel callers share one refresh request', async () => {
  setTokens(token(1, 1), token());
  let count = 0;
  let complete;
  globalThis.fetch = () => { count += 1; return new Promise((resolve) => { complete = resolve; }); };
  const first = refreshAccessToken();
  const second = refreshAccessToken();
  assert.equal(count, 1);
  const access = token();
  complete(json({ access }));
  assert.deepEqual(await Promise.all([first, second]), [access, access]);
});

test('network failure preserves tokens for a later retry', async () => {
  const refresh = token();
  setTokens(token(1, 1), refresh);
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(refreshAccessToken(), /offline/);
  assert.equal(getRefreshToken(), refresh);
});

test('a rejected refresh logs out once', async () => {
  setTokens(token(1, 1), token());
  let count = 0;
  window.addEventListener('auth:logout', () => { count += 1; });
  globalThis.fetch = async () => json({ detail: 'revoked' }, 401);
  await assert.rejects(refreshAccessToken(), /revoked/);
  assert.equal(getRefreshToken(), null);
  assert.equal(count, 1);
});

test('an old refresh rejection cannot log out a newly logged in account', async () => {
  setTokens(token(1, 1), token(1));
  let complete;
  globalThis.fetch = () => new Promise((resolve) => { complete = resolve; });
  const pending = refreshAccessToken();
  const next = token(2);
  setTokens(next, next);
  complete(json({ detail: 'revoked' }, 401));
  await assert.rejects(pending);
  assert.equal(getRefreshToken(), next);
});

test('authenticated requests retry once, retaining the selected tenant', async () => {
  const expired = token(1, 1);
  const access = token();
  setTokens(expired, token());
  localStorage.setItem('inventra_active_tenant:1', '12');
  let count = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/token/refresh/')) return json({ access });
    count += 1;
    assert.equal(options.headers['X-Tenant-ID'], '12');
    if (count === 1) return json({ detail: 'expired' }, 401);
    assert.equal(options.headers.Authorization, `Bearer ${access}`);
    return json([{ id: 7 }]);
  };
  assert.deepEqual(await request('/sales/'), [{ id: 7 }]);
  assert.equal(count, 2);
});

test('public login requests omit expired authorization', async () => {
  setTokens(token(1, 1), token());
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, undefined);
    return json({ login_ticket: 'ticket' });
  };
  assert.deepEqual(await request('/auth/admin-login/', { method: 'POST', body: {} }), { login_ticket: 'ticket' });
});

test('financial request key survives retries and regenerates when the payload changes', () => {
  const data = { amount: '100', payment_type: 'cash' };
  const key = getOrCreateRequestKey('tenant:1:checkout', data);
  assert.equal(getOrCreateRequestKey('tenant:1:checkout', { ...data }), key);
  assert.notEqual(getOrCreateRequestKey('tenant:1:checkout', { ...data, amount: '200' }), key);
  assert.notEqual(getOrCreateRequestKey('tenant:2:checkout', data), key);
});


test('support can omit an obsolete tenant selection while retaining account authentication', async () => {
  const access = token();
  setTokens(access, token());
  localStorage.setItem('inventra_active_tenant:1', '999');
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers['X-Tenant-ID'], undefined);
    assert.equal(options.headers.Authorization, `Bearer ${access}`);
    return json({ results: [] });
  };
  assert.deepEqual(await request('/support/conversations/', { skipTenant: true }), { results: [] });
});
